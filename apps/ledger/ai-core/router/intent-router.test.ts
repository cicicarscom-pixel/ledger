import { AIRouter } from './intent-router';
import { MockGeminiProvider } from '../providers/gemini-provider';
import { ToolRegistry } from '../tools/registry';
import { TaxpayerResolver } from '../entities/taxpayer-resolver';
import { countTaxpayersTool } from '../tools/taxpayers/count-taxpayers';
import { getTaxpayerBalanceTool } from '../tools/taxpayers/get-taxpayer-balance';
import { ToolContext } from '../tools/tool.types';

async function testFastPath() {
  // 1. Setup Registry
  const registry = new ToolRegistry();
  registry.register(countTaxpayersTool);
  registry.register(getTaxpayerBalanceTool);

  // 2. Setup Resolver Mock
  const resolver = new TaxpayerResolver(async () => [
    { id: 'tax-123', name: 'Yılmaz İnşaat' }
  ]);

  // 3. Setup Router
  const provider = new MockGeminiProvider();
  const router = new AIRouter(provider, registry, resolver);

  const context: ToolContext = {
    userId: 'usr-1',
    firmId: 'firm-1',
    role: 'accountant'
  };

  console.log('--- FAST PATH TESTS ---');
  
  // Test 1: Simple READ without Entity
  console.log('\nUser: "Kaç mükellefim var?"');
  const res1 = await router.processMessage('Kaç mükellefim var?', context);
  console.log('Router Result:', JSON.stringify(res1, null, 2));

  // Test 2: READ with Entity extraction
  console.log('\nUser: "Yılmaz İnşaat\'ın borcu ne kadar?"');
  const res2 = await router.processMessage('Yılmaz İnşaat\'ın borcu ne kadar?', context);
  console.log('Router Result:', JSON.stringify(res2, null, 2));
  
  // Test 3: Ambiguity (Confidence < 0.70)
  console.log('\nUser: "belirsiz bir cümle"');
  const res3 = await router.processMessage('belirsiz bir cümle kanka', context);
  console.log('Router Result:', JSON.stringify(res3, null, 2));
  
  // Test 4: External Action (Should NOT Fast Path)
  console.log('\nUser: "Ona hatırlatma gönder"');
  const res4 = await router.processMessage('Ona hatırlatma gönder', context);
  console.log('Router Result:', JSON.stringify(res4, null, 2));
}

testFastPath();
