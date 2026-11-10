/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - KALICI VERİTABANI VE DİSK EŞİTLEME SERVİSİ
 * Tüm store verilerini 'data/birlik_database.json' dosyasında güvenle saklar.
 * Sunucu açılışında otomatik yükler ve değişikliklerde otomatik kaydeder.
 */
import fs from 'fs';
import path from 'path';
import { store } from './store.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'birlik_database.json');

export class PersistenceService {
  private static saveTimeout: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * Servisi başlatır ve diskteki mevcut verileri belleğe yükler
   */
  public static init(): boolean {
    if (this.isInitialized) return true;

    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          if (raw.trim().length > 0) {
            const data = JSON.parse(raw);
            this.hydrateStore(data);
            console.log(`[PERSISTENCE] Disk veritabanı başarıyla yüklendi: ${DB_FILE} (${(raw.length / 1024).toFixed(2)} KB)`);
          }
        } catch (parseErr: any) {
          console.error('[PERSISTENCE] Veritabanı dosyası okuma hatası, yedek oluşturuluyor:', parseErr?.message);
          const backupFile = `${DB_FILE}.${Date.now()}.corrupt.bak`;
          try {
            fs.copyFileSync(DB_FILE, backupFile);
          } catch {}
          this.saveNow();
        }
      } else {
        // İlk kez oluşturuluyorsa mevcut store durumunu kaydet
        this.saveNow();
        console.log(`[PERSISTENCE] Yeni disk veritabanı oluşturuldu: ${DB_FILE}`);
      }

      // Store değişikliklerini dinle ve otomatik diske kaydet
      store.onStateChange = () => {
        PersistenceService.scheduleSave(1500);
      };

      // Her 5 dakikada bir periyodik koruma ve yedek kaydı
      setInterval(() => {
        PersistenceService.saveNow();
        try {
          const backupFile = path.join(DB_DIR, 'birlik_database.backup.json');
          if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, backupFile);
          }
        } catch {}
      }, 5 * 60 * 1000);

      // Çıkış öncesi garanti kayıt
      process.on('beforeExit', () => {
        PersistenceService.saveNow();
      });

      this.isInitialized = true;
      return true;
    } catch (err: any) {
      console.error(`[PERSISTENCE HATA] Veritabanı başlatılamadı:`, err?.message);
      return false;
    }
  }

  /**
   * Store'daki verileri disk formatına derler ve senkron yazar
   */
  public static saveNow(): boolean {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      const snapshot = {
        version: '1.2.0',
        lastSaved: new Date().toISOString(),
        gangInfo: store.gangInfo,
        ranks: store.ranks,
        members: store.members,
        recruiterInvites: store.recruiterInvites,
        applications: store.applications,
        tickets: store.tickets,
        treasury: store.treasury,
        transactions: store.transactions,
        inventory: store.inventory,
        inventoryTransactions: store.inventoryTransactions,
        vehicles: store.vehicles,
        territories: store.territories,
        missions: store.missions,
        warRecords: store.warRecords,
        diplomacy: store.diplomacy,
        punishments: store.punishments,
        reports: store.reports,
        evidenceList: store.evidenceList,
        announcements: store.announcements,
        achievements: store.achievements,
        memberAchievements: store.memberAchievements,
        investigations: store.investigations,
        secretRecords: store.secretRecords,
        loadouts: store.loadouts || [],
        rivals: store.rivals || [],
        meetings: store.meetings,
        warnings: store.warnings || [],
        inactivityRequests: store.inactivityRequests || [],
        auditLogs: store.auditLogs.slice(0, 1000), // Son 1000 denetim kaydını koru
        guildConfig: store.guildConfig
      };

      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      return true;
    } catch (err: any) {
      console.error(`[PERSISTENCE HATA] Diske kaydetme başarısız:`, err?.message);
      return false;
    }
  }

  /**
   * Değişiklik olduğunda gereksiz I/O'yu önlemek için debounced (gecikmeli) kayıt planlar
   */
  public static scheduleSave(delayMs = 1500): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow();
      this.saveTimeout = null;
    }, delayMs);
  }

  /**
   * Diskteki JSON nesnesiyle bellekteki store'u eşitler
   */
  private static hydrateStore(data: any): void {
    if (!data) return;

    if (data.gangInfo) store.gangInfo = data.gangInfo;
    if (Array.isArray(data.ranks) && data.ranks.length > 0) store.ranks = data.ranks;
    if (Array.isArray(data.members)) store.members = data.members;
    if (Array.isArray(data.recruiterInvites)) store.recruiterInvites = data.recruiterInvites;
    if (Array.isArray(data.applications)) store.applications = data.applications;
    if (Array.isArray(data.tickets)) store.tickets = data.tickets;
    if (data.treasury) store.treasury = data.treasury;
    if (Array.isArray(data.transactions)) store.transactions = data.transactions;
    if (Array.isArray(data.inventory)) store.inventory = data.inventory;
    if (Array.isArray(data.inventoryTransactions)) store.inventoryTransactions = data.inventoryTransactions;
    if (Array.isArray(data.vehicles)) store.vehicles = data.vehicles;
    if (Array.isArray(data.territories)) store.territories = data.territories;
    if (Array.isArray(data.missions)) store.missions = data.missions;
    if (Array.isArray(data.warRecords)) store.warRecords = data.warRecords;
    if (Array.isArray(data.diplomacy)) store.diplomacy = data.diplomacy;
    if (Array.isArray(data.punishments)) store.punishments = data.punishments;
    if (Array.isArray(data.reports)) store.reports = data.reports;
    if (Array.isArray(data.evidenceList)) store.evidenceList = data.evidenceList;
    if (Array.isArray(data.announcements)) store.announcements = data.announcements;
    if (Array.isArray(data.achievements)) store.achievements = data.achievements;
    if (Array.isArray(data.memberAchievements)) store.memberAchievements = data.memberAchievements;
    if (Array.isArray(data.investigations)) store.investigations = data.investigations;
    if (Array.isArray(data.secretRecords)) store.secretRecords = data.secretRecords;
    if (Array.isArray(data.loadouts)) store.loadouts = data.loadouts;
    if (Array.isArray(data.rivals)) store.rivals = data.rivals;
    if (Array.isArray(data.meetings)) store.meetings = data.meetings;
    if (Array.isArray(data.warnings)) store.warnings = data.warnings;
    if (Array.isArray(data.inactivityRequests)) store.inactivityRequests = data.inactivityRequests;
    if (Array.isArray(data.auditLogs)) store.auditLogs = data.auditLogs;
    if (data.guildConfig) store.guildConfig = data.guildConfig;
  }
}
