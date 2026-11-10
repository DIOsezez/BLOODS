/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - VERİTABANI BAĞLANTISI VE YÖNETİCİSİ
 * Kalıcı disk depolama (data/birlik_database.json) ve PersistenceService ile tam entegre çalışır.
 */
import { PersistenceService } from '../services/persistenceService.ts';

class DatabaseManager {
  private isConnected = false;

  public async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    try {
      PersistenceService.init();
      this.isConnected = true;
      console.log('[VERİTABANI] Kalıcı JSON disk veritabanı başarıyla bağlandı.');
      return true;
    } catch (err: any) {
      console.error('[VERİTABANI] Başlatma hatası:', err?.message);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      PersistenceService.saveNow();
      this.isConnected = false;
      console.log('[VERİTABANI] Veritabanı başarıyla diske kaydedildi ve kapatıldı.');
    } catch {}
  }

  public getStatus(): { connected: boolean; readyState: number; mode: string } {
    return {
      connected: this.isConnected,
      readyState: this.isConnected ? 1 : 0,
      mode: 'Kalıcı Disk Veritabanı (JSON Persistence)'
    };
  }

  public async seedDefaults(): Promise<void> {
    // Defaults are seeded via UnifiedStore and PersistenceService
  }
}

export const dbManager = new DatabaseManager();
