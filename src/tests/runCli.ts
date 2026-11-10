/**
 * MTA ILLEGAL BİRLİK BOTU - CLI TEST ÇALIŞTIRICISI
 */
import { MasterTestRunner } from './runner.ts';

async function main() {
  console.log('====================================================');
  console.log('MTA ILLEGAL BİRLİK YÖNETİM BOTU - TEST MOTORU');
  console.log('Bölüm 40 Kapsamındaki 40 Senaryo Test Ediliyor...');
  console.log('====================================================\n');

  const { total, passed, failed, results } = await MasterTestRunner.runAll();

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.category}] ${r.name} (${r.durationMs}ms) -> ${r.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST RAPORU: Toplam: ${total} | Başarılı: ${passed} | Başarısız: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test çalıştırma hatası:', err);
  process.exit(1);
});
