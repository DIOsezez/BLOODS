@echo off
chcp 65001 > nul
title MTA İllegal Birlik Botu (T.R.İ.P) - 7/24 Kesintisiz Konsol
color 0A

echo ========================================================================
echo  MTA ILLEGAL BIRLIK DISCORD BOTU (T.R.I.P) - 7/24 BASLATICI
echo  MongoDB Gerektirmez - Kalici Yerel JSON Motoru
echo ========================================================================
echo.

if not exist .env (
    echo [UYARI] .env dosyasi bulunamadi! .env.example dosyasindan olusturuluyor...
    copy .env.example .env
    echo [BILGI] Lutfen .env dosyasini acip DISCORD_BOT_TOKEN ve diger bilgileri girin!
    notepad .env
    pause
)

if not exist node_modules (
    echo [BILGI] Ilk kurulum: Bagimliliklar yukleniyor (npm install)...
    call npm install
)

:LOOP
echo [%date% %time%] Bot 7/24 baslatiliyor...
call npm run dev
echo [%date% %time%] [DIKKAT] Bot kapandi! 5 saniye icinde otomatik olarak yeniden baslatiliyor...
timeout /t 5 /nobreak > nul
goto LOOP
