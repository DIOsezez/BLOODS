/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - DISCORD SLASH KOMUT TANIMLARI
 * Discord.js v14 Uyumlu Komut Listesi
 */
import { SlashCommandBuilder } from 'discord.js';

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('kurulum')
    .setDescription('Otomatik Discord sunucu kategorilerini, kanallarını, rollerini ve panellerini kurar.')
    .setDefaultMemberPermissions(0x0000000000000008), // Administrator only

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Bulunulan kanalın panelini açar veya tüm panelleri ilgili kanallara dağıtır/temizler.')
    .addStringOption(opt =>
      opt
        .setName('islem')
        .setDescription('İsteğe bağlı işlem')
        .setRequired(false)
        .addChoices(
          { name: 'Tüm Panelleri İlgili Kanallara Dağıt', value: 'dagit' },
          { name: 'Bu Kanalın Panelini Göster', value: 'kanal' },
          { name: 'Tüm Panelleri Kanallardan Kaldır (Temizle)', value: 'temizle' }
        )
    ),

  new SlashCommandBuilder()
    .setName('profil')
    .setDescription('MTA karakter kartınızı, rütbenizi, zimmetlerinizi ve sicilinizi görüntüler.')
    .addUserOption(opt => opt.setName('kullanici').setDescription('Görüntülenecek üye (boş bırakılırsa kendiniz)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('uye')
    .setDescription('Üye ve MTA karakter işlemlerini yürütür.')
    .addSubcommand(sub =>
      sub
        .setName('profil')
        .setDescription('Bir üyenin MTA karakterlerini, rütbesini ve sicilini görüntüler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Görüntülenecek Discord kullanıcısı').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Birliğe kayıtlı tüm aktif ve pasif üyeleri listeler.')
    ),

  new SlashCommandBuilder()
    .setName('rutbe')
    .setDescription('Rütbe hiyerarşisini görüntüler, terfi veya tenzil işlemi yapar.')
    .addSubcommand(sub =>
      sub
        .setName('terfi')
        .setDescription('Bir üyeyi kesin hiyerarşi kurallarına göre bir üst rütbeye terfi ettirir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Terfi ettirilecek üye').setRequired(true))
        .addStringOption(opt => opt.setName('neden').setDescription('Terfi gerekçesi').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('tenzil')
        .setDescription('Bir üyenin rütbesini düşürür.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Rütbesi düşürülecek üye').setRequired(true))
        .addStringOption(opt => opt.setName('neden').setDescription('Rütbe düşürme gerekçesi').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('hiyerarsi')
        .setDescription('OG -> Under OG -> Recruiter -> Kıdemli Üye -> Üye sıralamasını gösterir.')
    ),

  new SlashCommandBuilder()
    .setName('kasa')
    .setDescription('Birlik sanal kasasını yönetir.')
    .addSubcommand(sub => sub.setName('bakiye').setDescription('Mevcut kasa bakiyesini ve son hareketleri gösterir.'))
    .addSubcommand(sub =>
      sub
        .setName('yatir')
        .setDescription('Kasaya para yatırır.')
        .addIntegerOption(opt => opt.setName('tutar').setDescription('Yatırılacak miktar ($)').setRequired(true))
        .addStringOption(opt => opt.setName('kategori').setDescription('İşlem kategorisi').setRequired(true))
        .addStringOption(opt => opt.setName('aciklama').setDescription('İşlem açıklaması').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('cek')
        .setDescription('Kasadan para çeker (Yetki gerektirir).')
        .addIntegerOption(opt => opt.setName('tutar').setDescription('Çekilecek miktar ($)').setRequired(true))
        .addStringOption(opt => opt.setName('kategori').setDescription('İşlem kategorisi').setRequired(true))
        .addStringOption(opt => opt.setName('aciklama').setDescription('İşlem açıklaması').setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName('envanter')
    .setDescription('Birlik ortak envanter ve mühimmat deposunu görüntüler.'),

  new SlashCommandBuilder()
    .setName('istatistik')
    .setDescription('Birliğin üye, kasa, başvuru ve operasyon istatistiklerini raporlar.'),

  new SlashCommandBuilder()
    .setName('yedek')
    .setDescription('Kalıcı sistem veritabanı yedeğini oluşturur.'),

  new SlashCommandBuilder()
    .setName('toplanti')
    .setDescription('Birlik ve yönetim toplantılarını yönetir, gündem ve kararları listeler.')
    .addSubcommand(sub => sub.setName('liste').setDescription('Planlanan ve geçmiş toplantıları listeler.'))
    .addSubcommand(sub =>
      sub
        .setName('planla')
        .setDescription('Yeni bir toplantı planlar ve duyurusunu oluşturur.')
        .addStringOption(opt => opt.setName('baslik').setDescription('Toplantı başlığı').setRequired(true))
        .addStringOption(opt => opt.setName('konu').setDescription('Toplantı konusu ve amacı').setRequired(true))
        .addStringOption(opt => opt.setName('saat').setDescription('Saat (Örn: 21:00)').setRequired(true))
    ),

  // Madde 13: Pratik Slash Komutları
  new SlashCommandBuilder()
    .setName('zimmet')
    .setDescription('Silah ve mühimmat zimmetleme işlemlerini yönetir.')
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Birliğe kayıtlı üyeye depodan silah veya teçhizat zimmetler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Silah verilecek üye').setRequired(true))
        .addStringOption(opt => opt.setName('silah').setDescription('Silah veya eşya adı (Örn: AK-47, Deagle, MP5)').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Adet sayısı (Varsayılan 1)').setRequired(false))
        .addIntegerOption(opt => opt.setName('mermi').setDescription('Mermi adedi (Varsayılan 150)').setRequired(false))
        .addStringOption(opt => opt.setName('not').setDescription('Görev veya operasyon açıklaması').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('iade')
        .setDescription('Zimmetli silahı depoya geri alır veya zayiat kaydeder.')
        .addStringOption(opt => opt.setName('zimmet_no').setDescription('Zimmet numarası (Örn: ZMT-001)').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('İade edilen adet (Varsayılan 1)').setRequired(false))
        .addBooleanOption(opt => opt.setName('kayip_mi').setDescription('Çatışmada kayıp/düştü mü?').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Aktif zimmetli silahları listeler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Filtrelenecek üye (isteğe bağlı)').setRequired(false))
    ),

  new SlashCommandBuilder()
    .setName('ceza')
    .setDescription('Birlik içi disiplin ve ceza işlemlerini yürütür.')
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Bir üyeye disiplin cezası veya uyarı uygular.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Cezalandırılacak üye').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('tur')
            .setDescription('Ceza türü')
            .setRequired(true)
            .addChoices(
              { name: 'Uyarı (1/3)', value: 'Uyarı' },
              { name: 'Para Cezası', value: 'Para Cezası' },
              { name: 'Kıdem Tenzili (Rütbe Düşürme)', value: 'Kıdem Tenzili' },
              { name: 'Geçici Uzaklaştırma (Askıya Alma)', value: 'Geçici Uzaklaştırma' },
              { name: 'Birlikten Çıkarma (İhraç)', value: 'Birlikten Çıkarma' }
            )
        )
        .addStringOption(opt => opt.setName('sebep').setDescription('Ceza gerekçesi').setRequired(true))
        .addIntegerOption(opt => opt.setName('sure_gun').setDescription('Süre (Gün)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Bir üyenin veya tüm birliğin ceza sicilini görüntüler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Sicile bakılacak üye (boş ise tümü)').setRequired(false))
    ),

  new SlashCommandBuilder()
    .setName('ihrac')
    .setDescription('Bir üyeyi birlikten kalıcı ihraç eder ve tüm Discord yetkilerini alır.')
    .addUserOption(opt => opt.setName('kullanici').setDescription('İhraç edilecek Discord kullanıcısı').setRequired(true))
    .addStringOption(opt => opt.setName('sebep').setDescription('İhraç gerekçesi').setRequired(true))
    .addBooleanOption(opt => opt.setName('ck_mi').setDescription('Roleplay Character Kill (CK) infazı mı?').setRequired(false)),

  new SlashCommandBuilder()
    .setName('duyuru')
    .setDescription('📢・duyurular kanalına resmi birlik duyurusu yayınlar.')
    .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
    .addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru içeriği').setRequired(true))
    .addStringOption(opt =>
      opt
        .setName('onem')
        .setDescription('Önem derecesi')
        .setRequired(false)
        .addChoices(
          { name: 'Normal Duyuru', value: 'normal' },
          { name: '⚠️ Önemli Bilgilendirme', value: 'onemli' },
          { name: '🔴 Acil Toplanma Çağrısı', value: 'acil' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('etiket')
        .setDescription('Duyuruda ping atılacak kitle')
        .setRequired(false)
        .addChoices(
          { name: 'Etiket Yok', value: 'none' },
          { name: '@everyone', value: 'everyone' },
          { name: 'Birlik Üyeleri', value: 'members' }
        )
    ),

  new SlashCommandBuilder()
    .setName('denetim')
    .setDescription('Son gerçekleşen sistem ve güvenlik denetim (audit) loglarını görüntüler.')
    .addIntegerOption(opt => opt.setName('adet').setDescription('Görüntülenecek log adedi (Varsayılan 8, Maks 20)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('izin-denetimi')
    .setDescription('Sunucu kategori ve kanal izinlerini tarar; yetkisiz erişimleri tespit eder ve düzeltir.')
    .setDefaultMemberPermissions(0x0000000000000008)
    .addBooleanOption(opt =>
      opt
        .setName('duzelt')
        .setDescription('Tespit edilen erişim ve yetki açıklarını otomatik olarak düzelt (Varsayılan: true)')
        .setRequired(false)
    ),

  // Yeni Sistemler: 1 & 2. Uyarı Sistemi ve Uyarı Rolleri (1x, 2x, 3x)
  new SlashCommandBuilder()
    .setName('uyari')
    .setDescription('Birlik üyelerine 1x, 2x, 3x uyarı cezası verir, kaldırır veya geçmişini sorgular.')
    .addSubcommand(sub =>
      sub
        .setName('ver')
        .setDescription('Bir üyeye resmi disiplin uyarısı verir ve rolünü otomatik senkronize eder.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarı verilecek üye').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı gerekçesi').setRequired(true))
        .addStringOption(opt => opt.setName('kanit').setDescription('İlgili kanıt URL veya delil açıklaması').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('sil')
        .setDescription('Bir üyenin uyarısını kaldırır ve rol seviyesini düşürür.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarısı kaldırılacak üye').setRequired(true))
        .addStringOption(opt => opt.setName('gerekce').setDescription('Kaldırma veya af gerekçesi').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Bir üyenin geçmiş ve aktif tüm uyarı kayıtlarını görüntüler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Sorgulanacak üye').setRequired(true))
    ),

  // Yeni Sistemler: 6. İn-aktiflik Bildirim Sistemi
  new SlashCommandBuilder()
    .setName('inaktiflik')
    .setDescription('İnaktiflik bildirimi oluşturur veya aktif izinleri listeler.')
    .addSubcommand(sub =>
      sub
        .setName('bildir')
        .setDescription('İnaktiflik ve mazeret izni başvuru formunu açar.')
    )
    .addSubcommand(sub =>
      sub
        .setName('liste')
        .setDescription('Onay bekleyen ve aktif inaktiflik izinlerini listeler.')
    ),

  // Yeni Sistemler: 3. Kanal Rehberi Yenileme
  new SlashCommandBuilder()
    .setName('rehber-guncelle')
    .setDescription('Sunucudaki tüm kategori ve kanalları dinamik tarayarak #🗺️・kanal-rehberi kanalını günceller.')
    .setDefaultMemberPermissions(0x0000000000000008),

  // Yeni Sistemler: 5. Rütbe Bilgilendirme Yenileme
  new SlashCommandBuilder()
    .setName('rutbe-bilgi')
    .setDescription('Birlik rütbe hiyerarşisi (OG, Under OG, Recruiter, Kıdemli, Üye) rehberini görüntüler veya yayınlar.'),

  // Başvuru Sistemi: /basvuru (yap / durum)
  new SlashCommandBuilder()
    .setName('basvuru')
    .setDescription("BLOOD'S birliğine katılım başvurusu işlemlerini yönetir.")
    .addSubcommand(sub =>
      sub
        .setName('yap')
        .setDescription('Yeni birlik katılım başvuru formunu açar.')
    )
    .addSubcommand(sub =>
      sub
        .setName('durum')
        .setDescription('Katılım başvurunuzun güncel durumunu ve inceleme sonucunu sorgular.')
    )
    .addSubcommand(sub =>
      sub
        .setName('onayla')
        .setDescription('Adayın başvurusunu onaylar, sunucu rumuzunu IC ismi (Dio Draven gibi) yapar ve üye rolü verir.')
        .addUserOption(opt =>
          opt
            .setName('kullanici')
            .setDescription('Başvurusu onaylanacak aday')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('aciklama')
            .setDescription('Onay açıklaması / tebrik notu (İsteğe bağlı)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reddet')
        .setDescription('Adayın katılım başvurusunu reddeder.')
        .addUserOption(opt =>
          opt
            .setName('kullanici')
            .setDescription('Başvurusu reddedilecek aday')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('sebep')
            .setDescription('Ret gerekçesi')
            .setRequired(true)
        )
    )
];
