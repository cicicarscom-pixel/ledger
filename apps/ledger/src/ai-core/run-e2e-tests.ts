// WebSocket polyfill for Supabase in Node 20
const WebSocket = require('ws');
(global as any).WebSocket = WebSocket;

import { routerService } from './router/intent-router';
import { ToolContext } from './shared/types';
import { taxpayerRepository } from './repositories/taxpayer.repository';
import { aiAuditRepository } from './repositories/ai-audit.repository';

// ==========================================
// MOCK INFRASTRUCTURE FOR E2E TEST
// ==========================================

taxpayerRepository.getTaxpayersByFirmId = async (firmId: string) => {
  return [
    { id: 'org-1', name: 'Yılmaz İnşaat Ltd. Şti.', slug: 'yilmaz-insaat' },
    { id: 'org-2', name: 'Ahmet Bakkal', slug: 'ahmet-bakkal' }
  ];
};

aiAuditRepository.logToolExecution = async (context, toolName, riskLevel, payload, success, errorMessage) => {
  console.log('\n[MOCK AUDIT DB] Log inserted for tool: ' + toolName + ' (Risk: ' + riskLevel + ')');
  console.log('[MOCK AUDIT DB] Payload: ' + JSON.stringify(payload) + ' | Success: ' + success);
};

// ==========================================
// TEST SCENARIOS
// ==========================================

async function runTests() {
  console.log("==========================================");
  console.log(" WORKIGOM AI CORE - E2E PIPELINE TEST");
  console.log("==========================================\n");

  const mockContext: ToolContext = {
    userId: 'user-1',
    firmId: 'firm-1',
    role: 'admin',
    conversationId: 'conv-1'
  };

  const scenarios = [
    "Kaç mükellefim var?",
    "Yılmazların borcu ne?",
    "Yılmaz inşaat'a muhasebe borcunu hatırlat."
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const query = scenarios[i];
    console.log('\n------------------------------------------');
    console.log(' TEST ' + (i + 1) + ': "' + query + '"');
    console.log('------------------------------------------');
    
    const result = await routerService.routeMessage(query, mockContext);
    
    console.log('\n FINAL TOOL RESULT:');
    console.dir(result, { depth: null, colors: true });
  }
}

runTests().catch(console.error);
