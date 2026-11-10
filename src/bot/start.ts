/**
 * MTA ILLEGAL BİRLİK BOTU - ÇALIŞTIRMA GİRİŞ NOKTASI
 */
import { mtaBot } from './index.ts';
import http from 'http';

// Port 3000 üzerinde server.ts zaten botu 7/24 çalıştırıyorsa ikinci bir kopya başlatma
const req = http.get('http://127.0.0.1:3000/api/bot-status', (res) => {
  if (res.statusCode === 200) {
    console.log('[BOT MOTORU] Bot server.ts üzerinde zaten 7/24 aktif olarak çalışıyor. İkinci kopya başlatılmadı.');
    process.exit(0);
  } else {
    runBot();
  }
});

req.on('error', () => {
  runBot();
});

function runBot() {
  mtaBot.start().catch((err) => {
    console.error('[KRİTİK BAŞLATMA HATASI]', err);
    process.exit(1);
  });
}

