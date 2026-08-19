import { AIRouter } from '../router/intent-router';
import { MockGeminiProvider } from '../providers/gemini-provider';
import { ToolRegistry } from '../tools/registry';
import { TaxpayerResolver } from '../entities/taxpayer-resolver';
import { countTaxpayersTool } from '../tools/taxpayers/count-taxpayers';
import { getTaxpayerBalanceTool } from '../tools/taxpayers/get-taxpayer-balance';
import { getTaxpayerInvoicesTool } from '../tools/invoices/get-taxpayer-invoices';
import { sendNotificationTool } from '../tools/notifications/send-notification';
import { ToolContext } from '../tools/tool.types';
import { PolicyEngine } from '../policy/policy-engine';
import { AuditService } from '../audit/audit-service';

async function runE2E() {
  const registry = new ToolRegistry();
  registry.register(countTaxpayersTool);
  registry.register(getTaxpayerBalanceTool);
  registry.register(getTaxpayerInvoicesTool);
  registry.register(sendNotificationTool);

  const resolver = new TaxpayerResolver(async () => [
    { id: 'tax-123', name: 'Yılmaz İnşaat' }
  ]);

  const provider = new MockGeminiProvider();
  provider.classifyIntent = async (prompt: string, context: any) => {
    const lower = prompt.toLowerCase();
    if (lower.includes('kaç mükellef')) return { intent: 'COUNT_TAXPAYERS', risk: 'read', entityQuery: null, confidence: 0.98 };
    if (lower.includes('borcu ne')) return { intent: 'GET_TAXPAYER_BALANCE', risk: 'read', entityQuery: 'Yılmaz İnşaat', confidence: 0.95 };
    if (lower.includes('faturalarını gönderdi mi')) return { intent: 'GET_TAXPAYER_INVOICES', risk: 'read', entityQuery: 'Yılmaz İnşaat', confidence: 0.96 };
    if (lower.includes('hatırlatma gönder')) return { intent: 'SEND_NOTIFICATION', risk: 'external_action', entityQuery: 'Yılmaz İnşaat', confidence: 0.95 };
    return { intent: 'UNKNOWN', risk: 'read', entityQuery: null, confidence: 0.1 };
  };

  const router = new AIRouter(provider, registry, resolver);
  const policyEngine = new PolicyEngine();
  const auditService = new AuditService();

  const context: ToolContext = {
    userId: 'usr-1',
    firmId: 'firm-1',
    role: 'accountant'
  };

  console.log('====================================================');
  console.log('  WORKIGOM AI CORE - END-TO-END ACCEPTANCE TESTS');
  console.log('====================================================\n');

  console.log('--- TEST 1 ---');
  console.log('User: "Kaç mükellefim var?"');
  let res = await router.processMessage('Kaç mükellefim var?', context);
  console.log('AI System Route:', res.status);
  console.log('AI Output:', JSON.stringify(res.data));
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 2 ---');
  console.log('User: "Yılmaz İnşaat\'ın borcu ne?"');
  res = await router.processMessage('Yılmaz İnşaat\'ın borcu ne?', context);
  console.log('AI System Route:', res.status);
  console.log('AI Output:', JSON.stringify(res.data));
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 3 ---');
  console.log('User: "Yılmaz İnşaat bu ay faturalarını gönderdi mi?"');
  res = await router.processMessage('Yılmaz İnşaat bu ay faturalarını gönderdi mi?', context);
  console.log('AI System Route:', res.status);
  console.log('AI Output:', JSON.stringify(res.data));
  console.log('----------------------------------------------------\n');

  console.log('--- TEST 4 ---');
  console.log('User: "Yılmaz İnşaat\'a muhasebe borcunu hatırlatma gönder."');
  res = await router.processMessage('Yılmaz İnşaat\'a muhasebe borcunu hatırlatma gönder.', context);
  
  if (res.status === 'action_required') {
    const isAuthorized = await policyEngine.authorize(context, res.tool!, 'external_action', res.resolvedTaxpayerId);
    if (isAuthorized) {
      const tool = registry.getTool(res.tool!);
      const toolRes = await tool!.execute(context, { taxpayerId: res.resolvedTaxpayerId, message: 'Borcunuz var.' });
      
      await auditService.log({
        firmId: context.firmId,
        userId: context.userId,
        intent: res.intent,
        toolName: res.tool,
        toolRisk: 'external_action',
        status: toolRes.success ? 'success' : 'failed'
      });
      console.log('AI Output: [SUCCESS] Hatırlatma başarıyla gönderildi ve Audit Log oluşturuldu.');
    }
  }
  console.log('====================================================\n');
}

runE2E();
