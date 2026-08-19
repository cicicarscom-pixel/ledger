import { AIRouter } from '../router/intent-router';
import { MockGeminiProvider } from '../providers/gemini-provider';
import { ToolRegistry } from '../tools/registry';
import { TaxpayerResolver } from '../entities/taxpayer-resolver';
import { countTaxpayersTool } from '../tools/taxpayers/count-taxpayers';
import { getTaxpayerBalanceTool } from '../tools/taxpayers/get-taxpayer-balance';
import { sendNotificationTool } from '../tools/notifications/send-notification';
import { ToolContext } from '../tools/tool.types';
import { PolicyEngine } from '../policy/policy-engine';
import { AuditService } from '../audit/audit-service';

async function testActionPath() {
  const registry = new ToolRegistry();
  registry.register(countTaxpayersTool);
  registry.register(getTaxpayerBalanceTool);
  registry.register(sendNotificationTool);

  const resolver = new TaxpayerResolver(async () => [
    { id: 'tax-123', name: 'Yılmaz İnşaat' }
  ]);

  const provider = new MockGeminiProvider();
  const router = new AIRouter(provider, registry, resolver);
  
  const policyEngine = new PolicyEngine();
  const auditService = new AuditService();

  const context: ToolContext = {
    userId: 'usr-1',
    firmId: 'firm-1',
    role: 'accountant'
  };

  console.log('--- ACTION PATH E2E (NOTIFICATION AKISI) ---');
  console.log('User: "Yılmaz İnsaat\'a muhasebe borcunu hatırlatma gönder"');

  const routerResponse = await router.processMessage('Yılmaz İnsaat\'a muhasebe borcunu hatırlatma gönder', context);
  
  if (routerResponse.status === 'action_required') {
    const { tool, resolvedTaxpayerId, intent } = routerResponse;
    const selectedTool = registry.getTool(tool!);
    
    const isAuthorized = await policyEngine.authorize(context, tool!, selectedTool!.risk, resolvedTaxpayerId);
    
    if (!isAuthorized) {
       console.error('ACCESS_DENIED');
       return;
    }

    const balanceTool = registry.getTool('get_taxpayer_balance');
    const balanceRes = await balanceTool!.execute(context, { taxpayerId: resolvedTaxpayerId });
    const balance = balanceRes.data.balance;

    const message = "Sayin mukellefimiz, cari donem itibariyla " + balance + " TL muhasebe borcunuz bulunmaktadir.";

    const startTime = Date.now();
    const result = await selectedTool!.execute(context, { taxpayerId: resolvedTaxpayerId, message });
    const latency = Date.now() - startTime;

    await auditService.log({
      firmId: context.firmId,
      userId: context.userId,
      intent: intent,
      toolName: tool,
      toolRisk: selectedTool!.risk,
      entityId: resolvedTaxpayerId,
      status: result.success ? 'success' : 'failed',
      latencyMs: latency
    });

    if (result.success) {
      console.log('[AI RESPONSE]: "Yilmaz Insaat a ' + balance + ' TL muhasebe borcu icin hatirlatma gonderdim."');
    } else {
      console.log('[AI RESPONSE]: "Bildirim gonderilirken bir hata olustu."');
    }
  }
}

testActionPath();

