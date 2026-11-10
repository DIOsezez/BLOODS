/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - YAPILANDIRMA VE SABİTLER
 */
import { RankLevel } from '../types/index.ts';

// Sistem Üst Düzey Yöneticileri (Super Admins / Kurucular)
// Bu listedeki kullanıcılar sınırsız tam yetkiye (OG ve Admin) sahiptir
export const SUPER_ADMIN_IDS: string[] = [
  '728894195359547433'
];

export const SYSTEM_PERMISSIONS = {
  // Üye & Karakter İzinleri
  MEMBER_VIEW: 'member.view',
  MEMBER_CREATE: 'member.create',
  MEMBER_EDIT: 'member.edit',
  MEMBER_REMOVE: 'member.remove',

  // Rütbe & Terfi İzinleri
  RANK_PROMOTE: 'rank.promote',
  RANK_DEMOTE: 'rank.demote',
  RANK_MANAGE: 'rank.manage',

  // Ekonomi & Kasa İzinleri
  ECONOMY_VIEW: 'economy.view',
  ECONOMY_DEPOSIT: 'economy.deposit',
  ECONOMY_WITHDRAW: 'economy.withdraw',

  // Envanter, Araç, Bölge
  INVENTORY_MANAGE: 'inventory.manage',
  VEHICLE_MANAGE: 'vehicle.manage',
  TERRITORY_MANAGE: 'territory.manage',

  // Başvuru, Recruiter, Ticket
  APPLICATION_REVIEW: 'application.review',
  RECRUITER_MANAGE: 'recruiter.manage',
  TICKET_MANAGE: 'ticket.manage',

  // Savaş, Diplomasi, Görev
  MISSION_MANAGE: 'mission.manage',
  WAR_MANAGE: 'war.manage',
  DIPLOMACY_MANAGE: 'diplomacy.manage',

  // Disiplin, İhbar, Kanıt
  PUNISHMENT_CREATE: 'punishment.create',
  REPORT_VIEW: 'report.view',
  EVIDENCE_VIEW: 'evidence.view',

  // Arşiv & Güvenlik
  CONFIDENTIAL_VIEW: 'confidential.view',
  INVESTIGATION_MANAGE: 'investigation.manage',
  LOGS_VIEW: 'logs.view',
  SETTINGS_MANAGE: 'settings.manage',
  BACKUP_MANAGE: 'backup.manage'
} as const;

export interface IDefaultRankDefinition {
  level: RankLevel;
  name: string;
  description: string;
  color: string;
  defaultPermissions: string[];
}

/**
 * 7. BÖLÜMDE BELİRTİLEN KESİN HİYERARŞİ:
 * OG (5) <- Under OG (BG) (4) <- Recruiter (3) <- Kıdemli Üye (2) <- Üye (1)
 */
export const DEFAULT_RANKS: IDefaultRankDefinition[] = [
  {
    level: RankLevel.OG,
    name: '👑 ┊ OG',
    description: 'En yüksek rütbe. Birliğin lideri ve mutlak yetkilisi.',
    color: '#ED4245',
    defaultPermissions: Object.values(SYSTEM_PERMISSIONS)
  },
  {
    level: RankLevel.UNDER_OG,
    name: '⭐ ┊ Under OG',
    description: "OG'nin altındaki yönetim rütbesi. Birlik idaresi ve operasyon liderliği.",
    color: '#E67E22',
    defaultPermissions: [
      SYSTEM_PERMISSIONS.MEMBER_VIEW,
      SYSTEM_PERMISSIONS.MEMBER_CREATE,
      SYSTEM_PERMISSIONS.MEMBER_EDIT,
      SYSTEM_PERMISSIONS.RANK_PROMOTE,
      SYSTEM_PERMISSIONS.RANK_DEMOTE,
      SYSTEM_PERMISSIONS.ECONOMY_VIEW,
      SYSTEM_PERMISSIONS.ECONOMY_DEPOSIT,
      SYSTEM_PERMISSIONS.ECONOMY_WITHDRAW,
      SYSTEM_PERMISSIONS.INVENTORY_MANAGE,
      SYSTEM_PERMISSIONS.VEHICLE_MANAGE,
      SYSTEM_PERMISSIONS.TERRITORY_MANAGE,
      SYSTEM_PERMISSIONS.APPLICATION_REVIEW,
      SYSTEM_PERMISSIONS.RECRUITER_MANAGE,
      SYSTEM_PERMISSIONS.TICKET_MANAGE,
      SYSTEM_PERMISSIONS.MISSION_MANAGE,
      SYSTEM_PERMISSIONS.WAR_MANAGE,
      SYSTEM_PERMISSIONS.DIPLOMACY_MANAGE,
      SYSTEM_PERMISSIONS.PUNISHMENT_CREATE,
      SYSTEM_PERMISSIONS.REPORT_VIEW,
      SYSTEM_PERMISSIONS.EVIDENCE_VIEW,
      SYSTEM_PERMISSIONS.CONFIDENTIAL_VIEW,
      SYSTEM_PERMISSIONS.INVESTIGATION_MANAGE,
      SYSTEM_PERMISSIONS.LOGS_VIEW
    ]
  },
  {
    level: RankLevel.RECRUITER,
    name: '🎯 ┊ Recruiter',
    description: 'Çeteye Adam Çeker. Yeni adayları bulma, davet etme ve ön eleme sorumlusu.',
    color: '#9B59B6',
    defaultPermissions: [
      SYSTEM_PERMISSIONS.MEMBER_VIEW,
      SYSTEM_PERMISSIONS.RECRUITER_MANAGE,
      SYSTEM_PERMISSIONS.APPLICATION_REVIEW,
      SYSTEM_PERMISSIONS.TICKET_MANAGE,
      SYSTEM_PERMISSIONS.ECONOMY_VIEW,
      SYSTEM_PERMISSIONS.ECONOMY_DEPOSIT
    ]
  },
  {
    level: RankLevel.KIDEMLI_UYE,
    name: '🔥 ┊ Kıdemli Üye',
    description: 'Deneyimli üye. Operasyonlarda ve hood güvenliğinde kıdemli katılım.',
    color: '#3498DB',
    defaultPermissions: [
      SYSTEM_PERMISSIONS.MEMBER_VIEW,
      SYSTEM_PERMISSIONS.ECONOMY_VIEW,
      SYSTEM_PERMISSIONS.ECONOMY_DEPOSIT,
      SYSTEM_PERMISSIONS.EVIDENCE_VIEW
    ]
  },
  {
    level: RankLevel.UYE,
    name: '🩸 ┊ Üye',
    description: 'Başlangıç rütbesi. Birliğin temel üyesi.',
    color: '#2ECC71',
    defaultPermissions: [
      SYSTEM_PERMISSIONS.MEMBER_VIEW,
      SYSTEM_PERMISSIONS.ECONOMY_DEPOSIT
    ]
  }
];

export interface IAchievementRoleDefinition {
  id: string;
  name: string;
  color: string;
  description: string;
  requiredXp?: number;
  requiredMissions?: number;
}

export const DEFAULT_ACHIEVEMENT_ROLES: IAchievementRoleDefinition[] = [
  {
    id: 'ach-first-blood',
    name: '🩸 ┊ İlk Kan',
    color: '#E74C3C',
    description: 'İlk başarılı operasyonunu tamamlayan üyeler.',
    requiredMissions: 1
  },
  {
    id: 'ach-shooter',
    name: '🎯 ┊ Keskin Nişancı',
    color: '#E67E22',
    description: '5 ve üzeri çete çatışmasında üstün başarı gösterenler.',
    requiredMissions: 5
  },
  {
    id: 'ach-veteran',
    name: '🎖️ ┊ Çete Gazisi',
    color: '#F1C40F',
    description: '10 operasyonu başarıyla tamamlayan kıdemli savaşçılar.',
    requiredMissions: 10
  },
  {
    id: 'ach-big-earner',
    name: '💰 ┊ Para Babası',
    color: '#2ECC71',
    description: 'Birlik kasasına yüksek oranda finansal katkı sağlayanlar.'
  },
  {
    id: 'ach-elite-driver',
    name: '🚗 ┊ Usta Sürücü',
    color: '#3498DB',
    description: 'Kaçış ve devriye görevlerini hasarsız tamamlayan uzmanlar.'
  },
  {
    id: 'ach-ghost',
    name: '👻 ┊ Gölge Ajan',
    color: '#9B59B6',
    description: 'İstihbarat ve gizli soruşturmalarda kritik delil toplayanlar.'
  }
];

export interface IWarningRoleDefinition {
  count: number;
  name: string;
  color: string;
  description: string;
}

export const DEFAULT_WARNING_ROLES: IWarningRoleDefinition[] = [
  {
    count: 1,
    name: '⚠️ ┊ 1x Uyarı',
    color: '#F1C40F',
    description: '1. Seviye Disiplin Uyarısı'
  },
  {
    count: 2,
    name: '⚠️ ┊ 2x Uyarı',
    color: '#E67E22',
    description: '2. Seviye Disiplin Uyarısı'
  },
  {
    count: 3,
    name: '🚫 ┊ 3x Uyarı',
    color: '#ED4245',
    description: '3. Seviye Disiplin Uyarısı (İhraç ve İnfaz Eşiği)'
  }
];

export interface IChannelDefinition {
  id: string;
  name: string;
  type: 'GUILD_TEXT' | 'GUILD_VOICE';
  readOnlyForMembers?: boolean;
  staffOnly?: boolean;
  managementOnly?: boolean;
  recruiterOnly?: boolean;
}

export interface ICategoryDefinition {
  category: string;
  id?: string;
  channels: IChannelDefinition[];
}

export const DEFAULT_CATEGORIES_AND_CHANNELS: ICategoryDefinition[] = [
  {
    category: '📢・BİLGİLENDİRME',
    channels: [
      { id: 'kanal-rehberi', name: '🗺️・kanal-rehberi', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'rutbe-bilgilendirme', name: '👑・rütbe-bilgilendirme', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'birlik-bilgi', name: '📜・birlik-manifesto', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'duyurular', name: '📢・resmi-tebliğler', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'birlik-kurallari', name: '⚖️・yeraltı-yasaları', type: 'GUILD_TEXT', readOnlyForMembers: true }
    ]
  },
  {
    category: '💬・SOKAK VE SOHBET',
    channels: [
      { id: 'genel-sohbet', name: '💬・genel-sohbet', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'muhabbet', name: '☕・muhabbet-odası', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'medya', name: '📸・medya-galerisi', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'klipler', name: '🎬・çete-klipleri', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'fotograflar', name: '🖼️・fotoğraflar', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'mizah', name: '🎲・mizah-makara', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'oyun-sohbeti', name: '🎮・oyun-lobisi', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'uye-listesi', name: '👥・üye-künyesi', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'inaktiflik-bildir', name: '🌴・inaktiflik-bildir', type: 'GUILD_TEXT', readOnlyForMembers: true }
    ]
  },
  {
    category: '🏴・BİRLİK ÖZEL SOHBET',
    channels: [
      { id: 'birlik-sohbet', name: '🏴・birlik-sohbet', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'birlik-muhabbet', name: '🥃・birlik-muhabbet', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'birlik-medya', name: '🎞️・birlik-medya', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'birlik-klipleri', name: '💥・aksiyon-klipleri', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'birlik-etkinlikleri', name: '🏆・etkinlik-buluşma', type: 'GUILD_TEXT', readOnlyForMembers: false }
    ]
  },
  {
    category: '🏛️・TOPLANTILAR',
    channels: [
      { id: 'toplanti-duyurulari', name: '📅・toplantı-çağrısı', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'toplanti-gundemi', name: '📋・toplantı-gündemi', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'toplanti-notlari', name: '✍️・toplantı-notları', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'toplanti-kararlari', name: '📜・alınan-kararlar', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'toplanti-arsivi', name: '🏛️・toplantı-arşivi', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'ses-toplanti-odasi', name: '🎙️・Brifing Salonu', type: 'GUILD_VOICE' },
      { id: 'ses-yonetim-toplantisi', name: '🔒・Yönetim Brifingi', type: 'GUILD_VOICE', staffOnly: true },
      { id: 'ses-ozel-toplanti-odasi', name: '🗝️・Özel Toplantı Odası', type: 'GUILD_VOICE' }
    ]
  },
  {
    category: '👑・YÖNETİM KARARGAHI',
    channels: [
      { id: 'inaktiflik-yonetim', name: '📋・inaktiflik-yonetim', type: 'GUILD_TEXT', managementOnly: true },
      { id: 'yonetim-toplanti', name: '👑・yönetim-odası', type: 'GUILD_TEXT', managementOnly: true },
      { id: 'yonetim-gundem', name: '📌・strateji-masası', type: 'GUILD_TEXT', managementOnly: true },
      { id: 'yonetim-kararlari', name: '⚡・yönetim-emirleri', type: 'GUILD_TEXT', managementOnly: true },
      { id: 'yonetim-toplanti-arsivi', name: '🗄️・kriptolu-arşiv', type: 'GUILD_TEXT', managementOnly: true },
      { id: 'ses-yonetim-toplanti-odasi-vip', name: '👑・Yönetim Karargahı', type: 'GUILD_VOICE', managementOnly: true },
      { id: 'ses-ozel-yonetim-odasi-vip', name: '💎・High Command VIP', type: 'GUILD_VOICE', managementOnly: true }
    ]
  },
  {
    category: '👥・OPERASYON BİRİMLERİ',
    channels: [
      { id: 'ekip-sohbet', name: '👥・tim-sohbeti', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'gorev-ekibi', name: '⚔️・hücum-ekibi', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'recruiter-sohbet', name: '🎯・recruiter-kulübü', type: 'GUILD_TEXT', recruiterOnly: true },
      { id: 'yonetim-sohbet-birim', name: '🛡️・kurmay-sohbet', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'ses-ekip-odasi-unit', name: '📻・Tim Telsizi #1', type: 'GUILD_VOICE' },
      { id: 'ses-gorev-odasi-unit', name: '📻・Operasyon Telsizi #2', type: 'GUILD_VOICE' },
      { id: 'ses-recruiter-odasi-unit', name: '🎯・Recruiter İletişim', type: 'GUILD_VOICE', recruiterOnly: true }
    ]
  },
  {
    category: '🔊・TELSİZ FREKANSLARI',
    channels: [
      { id: 'ses-genel-ses', name: '📻・Devriye Telsizi #1', type: 'GUILD_VOICE' },
      { id: 'ses-birlik-odasi', name: '📻・Birlik Telsizi #2', type: 'GUILD_VOICE' },
      { id: 'ses-muhabbet-odasi', name: '☕・Sokak Muhabbeti', type: 'GUILD_VOICE' },
      { id: 'ses-ekip-odasi', name: '🛡️・Güvenlik Devriyesi', type: 'GUILD_VOICE' },
      { id: 'ses-gorev-odasi', name: '🔥・Sıcak Çatışma Telsizi', type: 'GUILD_VOICE' },
      { id: 'ses-toplanti-odasi-genel', name: '🎙️・Genel İstişare', type: 'GUILD_VOICE' },
      { id: 'ses-yonetim-odasi', name: '🔒・Yönetim Odası', type: 'GUILD_VOICE', managementOnly: true },
      { id: 'ses-ozel-gorusme', name: '🗝️・Birebir Görüşme', type: 'GUILD_VOICE', managementOnly: true }
    ]
  },
  {
    category: '⚡・YÖNETİM PANELLERİ',
    channels: [
      { id: 'basvuru-paneli', name: '📝・katılım-başvuru', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'gorev-paneli', name: '🎯・operasyon-paneli', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'recruiter-paneli', name: '🏹・recruiter-paneli', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'kasa-durumu', name: '💵・kara-kasa', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'envanter-depo', name: '📦・kaçak-depo', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'arac-filosu', name: '🚗・birlik-garajı', type: 'GUILD_TEXT', readOnlyForMembers: false },
      { id: 'birlik-istatistik', name: '📊・çete-istatistik', type: 'GUILD_TEXT', readOnlyForMembers: true }
    ]
  },
  {
    category: '🛡️・YARGI VE DİSİPLİN',
    channels: [
      { id: 'uyari-log', name: '⚠️・uyarı-log', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'yonetim-paneli', name: '⚡・merkez-yönetim', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'basvuru-yonetim', name: '📑・başvuru-inceleme', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'sorusturma-kayit', name: '🔍・iç-soruşturma', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'ceza-sicil', name: '💀・kara-liste-sicil', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'ihbar-bildirim', name: '🚨・gizli-ihbar-kutusu', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'kanit-arsivi', name: '📁・delil-kasası', type: 'GUILD_TEXT', staffOnly: true }
    ]
  },
  {
    category: '⚔️・SAHA VE DİPLOMASİ',
    channels: [
      { id: 'diplomasi-kanali', name: '🤝・diplomatik-durum', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'savas-kayitlari', name: '🔥・savaş-kayıtları', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'bolge-hood', name: '📍・hood-hakimiyeti', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'operasyon-raporlari', name: '⚔️・operasyon-raporu', type: 'GUILD_TEXT', readOnlyForMembers: true }
    ]
  },
  {
    category: '📜・GİZLİ LOG VE DENETİM',
    channels: [
      { id: 'kasa-log', name: '💵・kasa-log', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'uye-log', name: '👥・üye-log', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'ceza-log', name: '⚖️・ceza-log', type: 'GUILD_TEXT', readOnlyForMembers: true },
      { id: 'gorev-log', name: '🎯・görev-log', type: 'GUILD_TEXT', staffOnly: true },
      { id: 'sistem-log', name: '🛡️・sistem-log', type: 'GUILD_TEXT', staffOnly: true }
    ]
  }
];

export const DEFAULT_APPLICATION_QUESTIONS = [
  { id: 'ooc_name', question: 'OOC İsim', required: true },
  { id: 'age', question: 'Yaş', required: true },
  { id: 'discord_tag', question: 'Discord Kullanıcı Adı', required: true },
  { id: 'mta_name', question: 'MTA Karakter Adı', required: true },
  { id: 'character_backstory', question: 'Karakter Geçmişi', required: true },
  { id: 'rp_experience', question: 'Roleplay Deneyimi (Saat/Yıl/Sunucular)', required: true },
  { id: 'join_reason', question: 'Birliğe Katılma Amacı', required: true },
  { id: 'extra_notes', question: 'Ek Açıklama veya İletmek İstedikleriniz', required: false }
];

export const EMBED_COLORS = {
  PRIMARY: 0x5865F2,   // Discord Blurple
  SUCCESS: 0x57F287,   // Yeşil
  WARNING: 0xFEE75C,   // Sarı
  DANGER: 0xED4245,    // Kırmızı
  DARK: 0x2B2D31,      // Discord Koyu Gri
  GOLD: 0xF1C40F,      // Altın
  PURPLE: 0x9B59B6     // Mor
};

export const BOT_SLASH_COMMANDS = [
  { name: 'kurulum', description: 'Otomatik Discord sunucu kategorilerini, kanallarını, rollerini ve panellerini kurar.' },
  { name: 'panel', description: 'Bulunulan kanala ait özel paneli açar veya tüm panelleri ilgili kanallara dağıtır/temizler.' },
  { name: 'profil', description: 'MTA karakter kartını, rütbe rozetini, zimmetlerini ve sicilini görüntüler.' },
  { name: 'uye', description: 'Üye ve MTA karakter işlemlerini yürütür.' },
  { name: 'rutbe', description: 'Rütbe hiyerarşisini görüntüler, terfi veya tenzil işlemi yapar.' },
  { name: 'kasa', description: 'Birlik sanal kasasını yönetir.' },
  { name: 'envanter', description: 'Birlik ortak envanter ve mühimmat deposunu görüntüler.' },
  { name: 'istatistik', description: 'Birliğin üye, kasa, başvuru ve operasyon istatistiklerini raporlar.' },
  { name: 'yedek', description: 'Kalıcı sistem veritabanı yedeğini oluşturur.' },
  { name: 'toplanti', description: 'Birlik ve yönetim toplantılarını yönetir, gündem ve kararları listeler.' }
];

export interface IPanelChannelMapping {
  panelId: string;
  name: string;
  channelCandidateNames: string[];
  defaultChannelName: string;
  parentCategoryName: string;
  staffOnly?: boolean;
  managementOnly?: boolean;
}

/**
 * 25+ Panelin İlgili Özel Kanallara Dağıtım Haritası
 * Her panel tek bir yerde toplanmak yerine doğrudan ilgili kanala atanır.
 */
export const PANEL_CHANNEL_MAPPINGS: IPanelChannelMapping[] = [
  {
    panelId: 'birlik',
    name: '1. Birlik Genel Yönetimi',
    channelCandidateNames: ['📜・birlik-manifesto', 'birlik-manifesto', 'birlik-bilgi', 'birlik-yonetimi'],
    defaultChannelName: '📜・birlik-manifesto',
    parentCategoryName: '📢・BİLGİLENDİRME'
  },
  {
    panelId: 'uye',
    name: '2. Üye Yönetimi',
    channelCandidateNames: ['👥・üye-künyesi', 'üye-künyesi', 'üye-listesi', 'uye-listesi', 'uye-yonetimi'],
    defaultChannelName: '👥・üye-künyesi',
    parentCategoryName: '💬・SOKAK VE SOHBET'
  },
  {
    panelId: 'rutbe',
    name: '3. Rütbe ve Hiyerarşi',
    channelCandidateNames: ['⚖️・yeraltı-yasaları', 'yeraltı-yasaları', 'birlik-kuralları', 'birlik-kurallari', 'rutbe-bilgi'],
    defaultChannelName: '⚖️・yeraltı-yasaları',
    parentCategoryName: '📢・BİLGİLENDİRME'
  },
  {
    panelId: 'yetki',
    name: '4. Yetki ve İzin Yönetimi',
    channelCandidateNames: ['📌・strateji-masası', 'strateji-masası', 'yönetim-gündem', 'yonetim-gundem', 'yetki-yonetimi'],
    defaultChannelName: '📌・strateji-masası',
    parentCategoryName: '👑・YÖNETİM KARARGAHI',
    managementOnly: true
  },
  {
    panelId: 'basvuru',
    name: '5. Katılım Başvuru Paneli',
    channelCandidateNames: ['📝・katılım-başvuru', 'katılım-başvuru', 'başvuru-paneli', 'basvuru-paneli'],
    defaultChannelName: '📝・katılım-başvuru',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'recruiter',
    name: '6. Recruiter & Aday Davet Paneli',
    channelCandidateNames: ['🏹・recruiter-paneli', 'recruiter-paneli', 'recruiter-sohbet'],
    defaultChannelName: '🏹・recruiter-paneli',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'kasa',
    name: '7. Kasa ve Ekonomi Paneli',
    channelCandidateNames: ['💵・kara-kasa', 'kara-kasa', 'kasa-durumu', 'kasa-paneli', 'kasa-log'],
    defaultChannelName: '💵・kara-kasa',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'envanter',
    name: '8. Envanter ve Depo Paneli',
    channelCandidateNames: ['📦・kaçak-depo', 'kaçak-depo', 'envanter-depo', 'envanter-paneli', 'envanter'],
    defaultChannelName: '📦・kaçak-depo',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'arac',
    name: '9. Araç Filosu Paneli',
    channelCandidateNames: ['🚗・birlik-garajı', 'birlik-garajı', 'araç-filosu', 'arac-filosu', 'arac-paneli'],
    defaultChannelName: '🚗・birlik-garajı',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'hood',
    name: '10. Hood ve Bölgeler Paneli',
    channelCandidateNames: ['📍・hood-hakimiyeti', 'hood-hakimiyeti', 'hood-ve-bölgeler', 'hood-ve-bolgeler', 'hood-paneli'],
    defaultChannelName: '📍・hood-hakimiyeti',
    parentCategoryName: '⚔️・SAHA VE DİPLOMASİ'
  },
  {
    panelId: 'gorev',
    name: '11. RP Görevleri Paneli',
    channelCandidateNames: ['🎯・operasyon-paneli', 'operasyon-paneli', 'görev-paneli', 'gorev-paneli'],
    defaultChannelName: '🎯・operasyon-paneli',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'operasyon',
    name: '12. Operasyon Kayıtları Paneli',
    channelCandidateNames: ['⚔️・operasyon-raporu', 'operasyon-raporu', 'operasyon-raporları', 'operasyon-raporlari', 'görev-ekibi'],
    defaultChannelName: '⚔️・operasyon-raporu',
    parentCategoryName: '⚔️・SAHA VE DİPLOMASİ'
  },
  {
    panelId: 'savas',
    name: '13. Çete Savaşları Paneli',
    channelCandidateNames: ['🔥・savaş-kayıtları', 'savaş-kayıtları', 'savas-kayitlari'],
    defaultChannelName: '🔥・savaş-kayıtları',
    parentCategoryName: '⚔️・SAHA VE DİPLOMASİ'
  },
  {
    panelId: 'diplomasi',
    name: '14. Diplomasi ve İttifak Paneli',
    channelCandidateNames: ['🤝・diplomatik-durum', 'diplomatik-durum', 'diplomasi-durumu', 'diplomasi-kanali'],
    defaultChannelName: '🤝・diplomatik-durum',
    parentCategoryName: '⚔️・SAHA VE DİPLOMASİ'
  },
  {
    panelId: 'ceza',
    name: '15. Sicil ve Cezalar Paneli',
    channelCandidateNames: ['💀・kara-liste-sicil', 'kara-liste-sicil', 'ceza-sicil', 'ceza-log'],
    defaultChannelName: '💀・kara-liste-sicil',
    parentCategoryName: '🛡️・YARGI VE DİSİPLİN',
    staffOnly: true
  },
  {
    panelId: 'ihbar',
    name: '16. İhbar ve Şikayet Paneli',
    channelCandidateNames: ['🚨・gizli-ihbar-kutusu', 'gizli-ihbar-kutusu', 'ihbar-bildirim', 'ihbar-paneli'],
    defaultChannelName: '🚨・gizli-ihbar-kutusu',
    parentCategoryName: '🛡️・YARGI VE DİSİPLİN',
    staffOnly: true
  },
  {
    panelId: 'kanit',
    name: '17. Kanıt Arşivi Paneli',
    channelCandidateNames: ['📁・delil-kasası', 'delil-kasası', 'kanıt-arşivi', 'kanit-arsivi', 'medya'],
    defaultChannelName: '📁・delil-kasası',
    parentCategoryName: '🛡️・YARGI VE DİSİPLİN',
    staffOnly: true
  },
  {
    panelId: 'duyuru',
    name: '18. Resmi Duyurular Paneli',
    channelCandidateNames: ['📢・resmi-tebliğler', 'resmi-tebliğler', 'duyurular'],
    defaultChannelName: '📢・resmi-tebliğler',
    parentCategoryName: '📢・BİLGİLENDİRME'
  },
  {
    panelId: 'istatistik',
    name: '19. Birlik İstatistik Paneli',
    channelCandidateNames: ['📊・çete-istatistik', 'çete-istatistik', 'birlik-istatistik', 'istatistik-paneli'],
    defaultChannelName: '📊・çete-istatistik',
    parentCategoryName: '⚡・YÖNETİM PANELLERİ'
  },
  {
    panelId: 'basari',
    name: '20. Başarı ve RP Etkinlikleri Paneli',
    channelCandidateNames: ['🏆・etkinlik-buluşma', 'etkinlik-buluşma', 'birlik-etkinlikleri'],
    defaultChannelName: '🏆・etkinlik-buluşma',
    parentCategoryName: '🏴・BİRLİK ÖZEL SOHBET'
  },
  {
    panelId: 'gizli',
    name: '21. Gizli Yönetim Kayıtları Paneli',
    channelCandidateNames: ['🗄️・kriptolu-arşiv', 'kriptolu-arşiv', 'yönetim-toplantı-arşivi', 'yonetim-toplanti-arsivi'],
    defaultChannelName: '🗄️・kriptolu-arşiv',
    parentCategoryName: '👑・YÖNETİM KARARGAHI',
    managementOnly: true
  },
  {
    panelId: 'sorusturma',
    name: '22. İç Soruşturma Paneli',
    channelCandidateNames: ['🔍・iç-soruşturma', 'iç-soruşturma', 'soruşturma-kayıt', 'sorusturma-kayit'],
    defaultChannelName: '🔍・iç-soruşturma',
    parentCategoryName: '🛡️・YARGI VE DİSİPLİN',
    staffOnly: true
  },
  {
    panelId: 'guvenlik',
    name: '23. Sistem Güvenlik ve Audit Paneli',
    channelCandidateNames: ['🛡️・sistem-log', 'sistem-log'],
    defaultChannelName: '🛡️・sistem-log',
    parentCategoryName: '📜・GİZLİ LOG VE DENETİM',
    staffOnly: true
  },
  {
    panelId: 'ayarlar',
    name: '24. Sistem Ayarları ve Yedekleme Paneli',
    channelCandidateNames: ['⚡・merkez-yönetim', 'merkez-yönetim', 'yönetim-paneli', 'yonetim-paneli'],
    defaultChannelName: '⚡・merkez-yönetim',
    parentCategoryName: '🛡️・YARGI VE DİSİPLİN',
    managementOnly: true
  },
  {
    panelId: 'toplanti',
    name: '25. Toplantı ve Karar Paneli',
    channelCandidateNames: ['📋・toplantı-gündemi', 'toplantı-gündemi', 'toplanti-gundemi'],
    defaultChannelName: '📋・toplantı-gündemi',
    parentCategoryName: '🏛️・TOPLANTILAR'
  }
];


