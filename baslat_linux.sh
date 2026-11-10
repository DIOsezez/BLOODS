#!/bin/bash
# ========================================================================
# MTA ILLEGAL BİRLİK BOTU (T.R.İ.P) - LİNUX / VPS 7/24 BAŞLATICI
# ========================================================================

echo "=== MTA İllegal Birlik Botu 7/24 Başlatılıyor ==="

if [ ! -f .env ]; then
    echo "[!] .env bulunamadı, .env.example kopyalanıyor..."
    cp .env.example .env
fi

if [ ! -d node_modules ]; then
    echo "[!] Bağımlılıklar kuruluyor..."
    npm install
fi

# PM2 kuruluysa PM2 ile arka planda 7/24 çalıştır
if command -v pm2 &> /dev/null; then
    echo "[+] PM2 tespit edildi! Arka plan servisi başlatılıyor..."
    pm2 start "npm run dev" --name "mta-trip-bot"
    pm2 save
    echo "[+] Bot PM2 ile 7/24 arka planda çalışıyor. Loglar için: pm2 logs mta-trip-bot"
else
    echo "[!] PM2 bulunamadı, döngülü konsol modunda başlatılıyor..."
    while true; do
        npm run dev
        echo "[!] Bot kapandı. 5 saniye içinde yeniden başlatılıyor..."
        sleep 5
    done
fi
