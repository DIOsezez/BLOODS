/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - TOPLANTI VE GÖRÜŞME YÖNETİM SERVİSİ
 * Toplantı planlama, gündem, duyuru, sesli oda, tutanak ve karar arşivi.
 */
import { store } from './store.ts';
import { IMeeting, MeetingScope, MeetingStatus } from '../types/index.ts';

export class MeetingService {
  public static getAll(): IMeeting[] {
    return [...store.meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static getById(id: string): IMeeting | undefined {
    return store.meetings.find(m => m.id === id);
  }

  public static getUpcoming(): IMeeting[] {
    return store.meetings.filter(m => m.status === 'Planlandı' || m.status === 'Devam Ediyor');
  }

  public static getHistory(): IMeeting[] {
    return store.meetings.filter(m => m.status === 'Tamamlandı' || m.status === 'İptal Edildi');
  }

  /**
   * Yeni Toplantı Oluşturma
   */
  public static createMeeting(params: {
    title: string;
    subject: string;
    agenda: string;
    scope: MeetingScope;
    date: Date;
    timeString: string;
    voiceChannelName?: string;
    organizerId: string;
    organizerName: string;
    participants?: string[];
  }): { success: boolean; meeting?: IMeeting; message: string } {
    const meetingNum = `TOP-${Math.floor(100 + Math.random() * 900)}`;
    const voiceChannel = params.voiceChannelName || (params.scope === 'Yönetim Toplantısı' ? 'Yönetim Toplantı Odası' : 'Toplantı Odası');

    const meeting: IMeeting = {
      id: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      meetingNumber: meetingNum,
      title: params.title,
      subject: params.subject,
      agenda: params.agenda,
      scope: params.scope,
      date: params.date,
      timeString: params.timeString,
      voiceChannelName: voiceChannel,
      organizerId: params.organizerId,
      organizerName: params.organizerName,
      participants: params.participants || ['Tüm İlgili Üyeler'],
      status: 'Planlandı',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    store.meetings.unshift(meeting);

    store.addAuditLog({
      category: 'Toplantı',
      actionType: 'TOPLANTI_PLANLANDI',
      executorId: params.organizerId,
      executorName: params.organizerName,
      target: `[${meetingNum}] ${params.title}`,
      description: `Kapsam: ${params.scope} | Tarih: ${params.timeString} | Ses: ${voiceChannel}`
    });

    return {
      success: true,
      meeting,
      message: `Toplantı [${meetingNum}] "${params.title}" planlandı ve #toplantı-duyuruları kanalına kaydedildi.`
    };
  }

  /**
   * Toplantıyı Başlatma
   */
  public static startMeeting(meetingId: string, executorName: string): { success: boolean; message: string } {
    const meeting = this.getById(meetingId);
    if (!meeting) return { success: false, message: 'Toplantı bulunamadı!' };

    meeting.status = 'Devam Ediyor';
    meeting.updatedAt = new Date();

    store.addAuditLog({
      category: 'Toplantı',
      actionType: 'TOPLANTI_BAŞLATILDI',
      executorId: 'YETKILI',
      executorName,
      target: `[${meeting.meetingNumber}] ${meeting.title}`,
      description: `Toplantı ${meeting.voiceChannelName} kanalında aktif oturuma geçti.`
    });

    return {
      success: true,
      message: `Toplantı [${meeting.meetingNumber}] başlatıldı. Üyeler "${meeting.voiceChannelName}" sesli odasına bekleniyor.`
    };
  }

  /**
   * Toplantıyı Karara Bağlama ve Tamamlama (Notlar ve Sonuç)
   */
  public static completeMeeting(params: {
    meetingId: string;
    notes: string;
    decisions: string;
    outcome?: string;
    executorName: string;
  }): { success: boolean; message: string } {
    const meeting = this.getById(params.meetingId);
    if (!meeting) return { success: false, message: 'Toplantı bulunamadı!' };

    meeting.status = 'Tamamlandı';
    meeting.notes = params.notes;
    meeting.decisions = params.decisions;
    meeting.outcome = params.outcome || 'Gündem maddeleri karara bağlandı.';
    meeting.updatedAt = new Date();

    store.addAuditLog({
      category: 'Toplantı',
      actionType: 'TOPLANTI_TAMAMLANDI',
      executorId: 'YETKILI',
      executorName: params.executorName,
      target: `[${meeting.meetingNumber}] ${meeting.title}`,
      description: `Kararlar #toplantı-kararları ve arşivine kaydedildi.`
    });

    return {
      success: true,
      message: `Toplantı [${meeting.meetingNumber}] tamamlandı. Alınan kararlar arşivlendi.`
    };
  }

  /**
   * Toplantıyı İptal Etme
   */
  public static cancelMeeting(meetingId: string, reason: string, executorName: string): { success: boolean; message: string } {
    const meeting = this.getById(meetingId);
    if (!meeting) return { success: false, message: 'Toplantı bulunamadı!' };

    meeting.status = 'İptal Edildi';
    meeting.outcome = `İptal Gerekçesi: ${reason}`;
    meeting.updatedAt = new Date();

    store.addAuditLog({
      category: 'Toplantı',
      actionType: 'TOPLANTI_İPTAL_EDİLDİ',
      executorId: 'YETKILI',
      executorName,
      target: `[${meeting.meetingNumber}] ${meeting.title}`,
      description: `Gerekçe: ${reason}`
    });

    return {
      success: true,
      message: `Toplantı [${meeting.meetingNumber}] iptal edildi.`
    };
  }
}
