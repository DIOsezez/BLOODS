/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - YEDEKLEME VE GERİ YÜKLEME SERVİSİ
 */
import { store } from './store.ts';

export class BackupService {
  public static createBackup(executorName: string): {
    success: boolean;
    backupJson: string;
    stats: { members: number; treasury: number; tickets: number; logs: number };
  } {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
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
      investigations: store.investigations,
      secretRecords: store.secretRecords,
      auditLogs: store.auditLogs,
      guildConfig: store.guildConfig
    };

    store.addAuditLog({
      category: 'Sistem',
      actionType: 'YEDEK_OLUŞTURULDU',
      executorId: 'YÖNETİCİ',
      executorName,
      target: 'Tüm Veritabanı',
      description: `Sistem tam yedeği başarıyla dışa aktarıldı.`
    });

    return {
      success: true,
      backupJson: JSON.stringify(backupData, null, 2),
      stats: {
        members: store.members.length,
        treasury: store.treasury.balance,
        tickets: store.tickets.length,
        logs: store.auditLogs.length
      }
    };
  }

  public static restoreBackup(
    backupJson: string,
    executorName: string
  ): { success: boolean; message: string } {
    try {
      const data = JSON.parse(backupJson);

      if (!data.version || !data.members || !Array.isArray(data.members)) {
        return { success: false, message: 'Geçersiz yedek dosyası formatı! Gerekli alanlar eksik.' };
      }

      if (data.gangInfo) store.gangInfo = data.gangInfo;
      if (data.ranks) store.ranks = data.ranks;
      if (data.members) store.members = data.members;
      if (data.recruiterInvites) store.recruiterInvites = data.recruiterInvites;
      if (data.applications) store.applications = data.applications;
      if (data.tickets) store.tickets = data.tickets;
      if (data.treasury) store.treasury = data.treasury;
      if (data.transactions) store.transactions = data.transactions;
      if (data.inventory) store.inventory = data.inventory;
      if (data.vehicles) store.vehicles = data.vehicles;
      if (data.territories) store.territories = data.territories;
      if (data.missions) store.missions = data.missions;
      if (data.warRecords) store.warRecords = data.warRecords;
      if (data.diplomacy) store.diplomacy = data.diplomacy;
      if (data.punishments) store.punishments = data.punishments;
      if (data.reports) store.reports = data.reports;
      if (data.evidenceList) store.evidenceList = data.evidenceList;
      if (data.announcements) store.announcements = data.announcements;
      if (data.investigations) store.investigations = data.investigations;

      store.addAuditLog({
        category: 'Sistem',
        actionType: 'YEDEK_GERİ_YÜKLENDİ',
        executorId: 'YÖNETİCİ',
        executorName,
        target: 'Tüm Veritabanı',
        description: `${data.timestamp} tarihli yedek başarıyla geri yüklendi.`
      });

      return {
        success: true,
        message: 'Veritabanı yedeği başarıyla geri yüklendi ve tüm sistemler eşitlendi.'
      };
    } catch (e: any) {
      return { success: false, message: `Yedek geri yüklenirken hata oluştu: ${e.message}` };
    }
  }
}
