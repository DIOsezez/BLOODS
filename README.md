# MTA ILLEGAL BİRLİK YÖNETİM SİSTEMİ — DISCORD EDITION

MTA:SA (Multi Theft Auto: San Andreas) Roleplay sunucuları için geliştirilmiş; **Node.js, TypeScript, Discord.js v14 ve MongoDB** tabanlı tam kapsamlı, modüler, güvenli ve 7/24 çalışmaya uygun profesyonel illegal birlik yönetim Discord botu.

Bu bot, bir illegal birliğin tüm idari, operasyonel, mali ve disiplin süreçlerini **tamamen Discord üzerinden** (Slash komutları, Discord butonları, select menüler, modal formlar ve zengin embedler ile) yönetir.

---

## 📌 Özellikler ve 25 Entegre Alt Sistem

1. **Birlik Yönetimi:** Birlik adı, kısaltması, kuruluş tarihi, lider bilgisi, açıklama ve tarihçe düzenleme.
2. **Üye ve Karakter Yönetimi:** Çoklu MTA karakter kaydı (IC isimler, ID'ler), rütbe, sicil, başarılar, durum (Aktif, Pasif, İzinli, Askıda, Ayrılmış, Atılmış).
3. **Kesin Rütbe ve Hiyerarşi (Bölüm 7):**
   * **Seviye 5 — OG:** En yüksek rütbe (Mutlak yetkili).
   * **Seviye 4 — Under OG (BG):** OG'nin altındaki yönetim rütbesi.
   * **Seviye 3 — Recruiter:** Görevi: *"Çeteye Adam Çeker"*.
   * **Seviye 2 — Kıdemli Üye:** Deneyimli üye.
   * **Seviye 1 — Üye:** Başlangıç rütbesi.
   * *Terfi Yönü:* Üye ➔ Kıdemli Üye ➔ Recruiter ➔ Under OG (BG) ➔ OG
   * *Kural:* Kendi kendine terfi kesinlikle engellidir. Sadece üst rütbeler alt rütbeleri terfi/tenzil edebilir.
4. **Yetkilendirme (RBAC):** Rütbelere özel 25+ bağımsız yetki (`member.*`, `rank.*`, `economy.*`, `inventory.*`, `vehicle.*`, `territory.*`, `confidential.*` vb.).
5. **Başvuru Sistemi:** Adayların Discord modal formuyla başvuru yapması, yetkililerin 1-10 puanlaması, kabul edildiğinde otomatik Üye kaydı oluşturma, 'Üye' rütbesi atama ve Recruiter davetiyle ilişkilendirme.
6. **Recruiter Sistemi:** Aday davet kayıtları, başvuru ve kabul dönüşüm oranları, recruiter performans raporları.
7. **Kasa ve Sanal Ekonomi:** Mutex kilitli atomik para yatırma ve çekme işlemleri, çift harcama (double-spend) engeli, limit denetimleri, işlem geçmişi (`TXN-XXXXXX`).
8. **Envanter ve Depo:** Silah, mühimmat, zırh, uyuşturucu ve malzeme depoları, kritik stok uyarı limitleri, envanter geçmişi.
9. **Araç Filosu:** Model ID, plaka, araç sahibi, garaj bilgisi, zimmetli üye ve durum takibi.
10. **Hood ve Bölge Yönetimi:** Sanal egemenlik bölgeleri (Kontrol Altında, Tartışmalı, Nötr, Kaybedilmiş), devriye notları ve bölge sorumlusu.
11. **Görev Yönetimi:** Rol içi operasyon emirleri (Hood Savunması, Sevkiyat, Baskın, Devriye), katılımcılara otomatik XP ve aktivite puanı ödülü.
12. **Operasyon Kayıtları:** Resmi kurgusal RP operasyon zabıtları ve katılım arşivleri.
13. **Kurgusal Savaş Kayıtları:** Rakip çetelerle çatışma kayıtları, kanıt linkleri ve RP sonuçları.
14. **Diplomasi:** Diğer çetelerle ilişkiler (Dost, Tarafsız, Gergin, Düşman, Ateşkes, İttifak), anlaşma maddeleri.
15. **Disiplin Cezaları ve Sicil:** Uyarı, İhtar, Yetki Kısıtlaması, Uzaklaştırma, İhraç; itiraz mekanizması ve sicil temizleme.
16. **İhbar ve Şikayetler:** Gizlilik seviyeli iç ihbarlar (Normal, Yüksek Gizlilik, Sadece OG).
17. **Kanıt Arşivi:** Video, ekran görüntüsü ve Discord mesaj linki arşivi.
18. **Ticket Sistemi:** Otomatik numaralandırma (`#201`), yetkili atama, öncelik ve kapatıldığında kalıcı transcript oluşturma.
19. **Duyurular:** Rol etiketli, zamanlanmış veya sabitlenmiş resmi duyurular.
20. **İstatistikler:** Anlık veri tabanı hesaplamalı grafikler (üye, kasa, başvuru oranı, filo).
21. **XP ve Başarı Sistemi:** Rütbeden bağımsız aktivite puanları ve liderlik tablosu (Leaderboard).
22. **Gizli Kayıtlar:** Yalnızca OG ve Under OG yetkisine açık istihbarat arşivi.
23. **İç Soruşturma:** Sadakat ve teftiş dosyaları, delil toplama ve duruşma kararları.
24. **Otomatik Discord Sunucu Kurulumu (`/kurulum`):** Sunucu kategorilerini, kanallarını, hiyerarşik rollerini ve panellerini eksiksiz, mükerrer oluşturmadan (idempotent) kurar.
25. **Otomatik Panel Kurulumu:** 7 temel panel mesajı veritabanında mesaj ID'si ile korunur, yeniden başlatmalarda kaybolmaz.
26. **Değiştirilemez Audit Log:** Her kritik eylem sunucu tarafında kayıt altına alınır.
27. **Yedekleme ve Geri Yükleme:** Tam sistem JSON yedeği alma ve yetkili onayıyla geri yükleme.
28. **7/24 Kesintisiz Üretim Hazırlığı:** Dockerfile, docker-compose.yml, Pino loglayıcı ve bağlantı kurtarma.
29. **Sosyal Sohbet & Medya Kanalları:** `#genel-sohbet`, `#muhabbet`, `#medya`, `#klipler`, `#fotograflar`, `#mizah`, `#oyun-sohbeti`, `#birlik-sohbet`, `#birlik-muhabbet`, `#birlik-medya`, `#birlik-klipleri`, `#birlik-etkinlikleri`.
30. **Toplantı & Karar Sistemi:** `#toplantı-duyuruları`, `#toplantı-gündemi`, `#toplantı-notları`, `#toplantı-kararları`, `#toplantı-arşivi`; toplantı planlama, saat, gündem belirleme, karar ve tutanak kaydı.
31. **Kapsamlı Ses Odaları (Voice Channels):** `Genel Ses`, `Birlik Odası`, `Muhabbet Odası`, `Ekip Odası`, `Görev Odası`, `Toplantı Odası`, `Yönetim Odası` (Yönetim izni), `Özel Görüşme`.
32. **Mevcut Kanallara Kesinlikle Dokunmayan Sıfır Riskli Kurulum:** Mevcut kanalları silmez, taşımaz, adını veya izinlerini değiştirmez; yalnızca eksik olanları güvenle oluşturur.

---

## 🚀 Kurulum ve Çalıştırma Adımları

### 1. Adım: Discord Botu Oluşturma
1. [Discord Developer Portal](https://discord.com/developers/applications) sayfasına gidin.
2. **New Application** butonuna basarak bir uygulama oluşturun (Örn: `MTA Illegal Birlik Botu`).
3. Soldaki menüden **Bot** sekmesine gelin:
   - **Reset Token** butonuna basarak Bot Tokenınızı kopyalayın.
   - **Privileged Gateway Intents** bölümündeki 3 seçeneği de aktifleştirin:
     - [x] **Presence Intent**
     - [x] **Server Members Intent** (Zorunlu - Üye rol ve bilgileri için)
     - [x] **Message Content Intent** (Zorunlu - Mesaj logları ve transcript için)
4. **OAuth2 -> URL Generator** sekmesine gidin:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (veya Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files)
   - Oluşturulan link ile botu Discord sunucunuza ekleyin.

---

### 2. Adım: Ortam Değişkenleri (.env)
Kök dizindeki `.env.example` dosyasını kopyalayarak `.env` oluşturun ve bilgilerinizi girin:

```bash
cp .env.example .env
```

`.env` içeriği:
```ini
DISCORD_BOT_TOKEN=buraya_discord_bot_tokeninizi_yazin
DISCORD_CLIENT_ID=buraya_uygulama_client_id_yazin
DISCORD_GUILD_ID=buraya_discord_sunucu_id_yazin
LOG_LEVEL=info
NODE_ENV=production
```

---

### 3. Adım: 7/24 Kesintisiz Çalıştırma (Kendi Başına Bağımsız)
Harici hiçbir veritabanı (MongoDB, PostgreSQL vb.) kurmanıza gerek yoktur. Bot tüm verileri otomatik olarak `data/birlik_database.json` dosyasında kalıcı ve güvenli olarak saklar.

```bash
# Projeyi başlatın:
npm run dev
# Veya Docker ile:
docker compose up -d --build
```

### Alternatif: Node.js ile Doğrudan Çalıştırma
```bash
# Bağımlılıkları yükleyin
npm install

# 40 senaryolu test motorunu çalıştırın
npm run test:bot

# Botu başlatın
npm run start:bot
```

---

## 🎮 Discord Üzerinde İlk Kurulum ve Kullanım

1. Bot sunucunuza katıldıktan sonra yetkili bir kanalda:
   ```
   /kurulum
   ```
   komutunu çalıştırın. Bot sunucuyu analiz edecek; eksik olan kategorileri (`BİRLİK BİLGİLENDİRME`, `GENEL`, `PANELLER`, `YÖNETİM`, `LOG`), kanalları (`#yönetim-paneli`, `#başvuru-paneli`, `#kasa-log` vb.) ve kesin hiyerarşideki 5 rütbe rolünü otomatik olarak oluşturacaktır.

2. Ana yönetim arayüzünü açmak için:
   ```
   /panel
   ```
   komutunu girin. Açılan zengin menüden 25 kategoriden dilediğinizi seçerek butonlar ve modallarla tüm birlik süreçlerini yönetebilirsiniz.

---

## 🛡️ Hiyerarşi ve Rütbe Kuralları

| Seviye | Rütbe Adı | Açıklama |
|---|---|---|
| **5** | **OG** | En yüksek rütbe. Birliğin mutlak lideri. |
| **4** | **Under OG (BG)** | OG'nin altındaki yönetim rütbesi. |
| **3** | **Recruiter** | **Çeteye Adam Çeker.** Aday davet ve alım sorumlusu. |
| **2** | **Kıdemli Üye** | Deneyimli üye. Operasyon ve devriye kıdemlisi. |
| **1** | **Üye** | Başlangıç rütbesi. |

---

## 🧪 Test Raporu
Botun tüm sistemleri 40 ayrı senaryo altında otomatik test edilmiş ve %100 başarıyla doğrulanmıştır. Testleri tekrar çalıştırmak için:
```bash
npm run test:bot
```
