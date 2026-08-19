import { TaxpayerResolver } from './taxpayer-resolver';
import { TaxpayerEntity } from './entity.types';

const mockDb: TaxpayerEntity[] = [
  { id: '1', name: 'Yılmaz İnşaat' },
  { id: '2', name: 'Yılmaz İnşaat Malzemeleri A.Ş.' },
  { id: '3', name: 'Ahmet Yılmaz' }
];

const fetchCandidatesMock = async (query: string) => mockDb;

async function runTests() {
  const resolver = new TaxpayerResolver(fetchCandidatesMock);
  let passed = 0;
  let total = 0;

  async function expectMatch(query: string, expectedId: string, minConfidence: number) {
    total++;
    const result = await resolver.resolve(query);
    const ok = result.taxpayer?.id === expectedId && result.confidence >= minConfidence;
    console.log('[' + (ok ? 'PASS' : 'FAIL') + '] Query: "' + query + '" -> Matched: ' + result.taxpayer?.name + ' (' + result.matchType + ', conf: ' + result.confidence.toFixed(2) + ')');
    if (ok) passed++;
  }

  console.log('--- RUNNING ENTITY TESTS ---');
  await expectMatch('Yılmaz İnşaat', '1', 1.0);
  await expectMatch('Yılmaz İnşaat\'a', '1', 0.95);
  await expectMatch('Yılmaz İnşaat\'ın', '1', 0.95);
  await expectMatch('Yılmaz İnşaat\'tan', '1', 0.95);
  await expectMatch('Yilmaz Insaat', '1', 0.95);
  await expectMatch('yılmaz inşaat', '1', 0.95);

  console.log('\n--- RUNNING CONTEXT TESTS ---');
  const res1 = await resolver.resolve('Yılmaz');
  console.log('Query "Yılmaz" (No Context) -> Best Match: ' + res1.taxpayer?.name + ' (conf: ' + res1.confidence.toFixed(2) + ')');
  
  const res2 = await resolver.resolve('Yılmaz', { activeTaxpayerId: '2' });
  console.log('Query "Yılmaz" (With Context id=2) -> Best Match: ' + res2.taxpayer?.name + ' (conf: ' + res2.confidence.toFixed(2) + ')');

  console.log('\nTests: ' + passed + '/' + total + ' passed.');
}

runTests();
