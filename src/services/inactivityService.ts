/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - İNAKTİFLİK BİLDİRİM VE TAKİP SERVİSİ
 * Üyelerin izin talepleri, yönetim onayı/reddi, otomatik statü değişimi ve süre dolumu takibi.
 */
import { store } from './store.ts';
import { IInactivityRequest } from '../types/index.ts';

export class InactivityService {
  /**
   * Üye inaktiflik bildirim formunu gönderir
   */
  public static async submitRequest(params: {
    discordUserId: string;
    discordUsername: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
    guild?: any;
  }): Promise<{
    success: boolean;
    request: IInactivityRequest;
    message: string;
  }> {
    const member = store.members.find(m => m.discordUserId === params.discordUserId);
    const count = store.inactivityRequests.length + 1;
    const requestNumber = `INAK-${String(count).padStart(3, '0')}`;

    const request: IInactivityRequest = {
      id: `inact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestNumber,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      memberId: member?.id,
      mtaName: member?.currentMtaName,
      startDate: params.startDate,
      endDate: params.endDate,
      reason: params.reason,
      notes: params.notes,
      status: 'Beklemede',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    store.inactivityRequests.unshift(request);

    store.addAuditLog({
      category: 'İnaktiflik',
      actionType: 'İN-AKTİFLİK_BİLDİRİMİ',
      executorId: params.discordUserId,
      executorName: params.discordUsername,
      target: requestNumber,
      description: `${params.startDate} - ${params.endDate} arası inaktiflik talebi oluşturuldu. Sebep: ${params.reason}`
    });

    store.notifyChange();

    // Yönetim kanalına inceleme kartını gönder
    if (params.guild) {
      await this.sendRequestToManagementChannel(params.guild, request);
    }

    return {
      success: true,
      request,
      message: `İnaktiflik bildiriminiz başarıyla iletildi (${requestNumber}). Yönetim onayından sonra bilgilendirileceksiniz.`
    };
  }

  /**
   * Yönetici tarafından onaylama veya reddetme
   */
  public static async reviewRequest(params: {
    requestId: string;
    approved: boolean;
    reviewerId: string;
    reviewerName: string;
    reviewNotes?: string;
    guild?: any;
  }): Promise<{
    success: boolean;
    request?: IInactivityRequest;
    message: string;
  }> {
    const request = store.inactivityRequests.find(r => r.id === params.requestId);
    if (!request) {
      return { success: false, message: 'İnaktiflik bildirimi bulunamadı.' };
    }

    request.status = params.approved ? 'Onaylandı' : 'Reddedildi';
    request.reviewedById = params.reviewerId;
    request.reviewedByName = params.reviewerName;
    request.reviewedAt = new Date();
    request.reviewNotes = params.reviewNotes;
    request.updatedAt = new Date();

    // Üyenin birlik statüsünü güncelle
    const member = store.members.find(m => m.discordUserId === request.discordUserId);
    if (member) {
      if (params.approved) {
        member.status = 'İzinli';
        member.statusReason = `İnaktiflik İzni (${request.startDate} - ${request.endDate}): ${request.reason}`;
      } else {
        // Reddedildiyse ve önceden izinliyse aktif yap
        if (member.status === 'İzinli') {
          member.status = 'Aktif';
        }
      }
      member.updatedAt = new Date();
    }

    store.addAuditLog({
      category: 'İnaktiflik',
      actionType: params.approved ? 'İN-AKTİFLİK_ONAYLANDI' : 'İN-AKTİFLİK_REDDEDİLDİ',
      executorId: params.reviewerId,
      executorName: params.reviewerName,
      target: `<@${request.discordUserId}> (${request.discordUsername}) - ${request.requestNumber}`,
      description: `Durum: ${request.status} ${params.reviewNotes ? `| Not: ${params.reviewNotes}` : ''}`
    });

    store.notifyChange();

    return {
      success: true,
      request,
      message: `Talep (${request.requestNumber}) ${params.approved ? 'ONAYLANDI (Üye İzinli yapıldı)' : 'REDDEDİLDİ'}.`
    };
  }

  /**
   * Süresi dolan inaktiflik izinlerini otomatik tarar ve tamamlar
   */
  public static async checkExpiredRequests(guild?: any): Promise<{
    checkedCount: number;
    expiredCount: number;
    expiredRequests: IInactivityRequest[];
  }> {
    const now = new Date();
    const approvedRequests = store.inactivityRequests.filter(r => r.status === 'Onaylandı');
    const expiredList: IInactivityRequest[] = [];

    for (const req of approvedRequests) {
      let isExpired = false;

      // Tarih formatını analiz et (Örn: DD.MM.YYYY veya YYYY-MM-DD)
      try {
        const parts = req.endDate.split(/[\.\/\-]/);
        if (parts.length === 3) {
          let endD: Date;
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            endD = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
          } else {
            // DD.MM.YYYY
            endD = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59);
          }
          if (now > endD) {
            isExpired = true;
          }
        }
      } catch {}

      if (isExpired) {
        req.status = 'Tamamlandı';
        req.updatedAt = new Date();
        expiredList.push(req);

        // Üyeyi tekrar 'Aktif' statüsüne döndür
        const member = store.members.find(m => m.discordUserId === req.discordUserId);
        if (member && member.status === 'İzinli') {
          member.status = 'Aktif';
          member.statusReason = undefined;
          member.updatedAt = new Date();
        }

        store.addAuditLog({
          category: 'İnaktiflik',
          actionType: 'İN-AKTİFLİK_SÜRESİ_DOLDU',
          executorId: 'SİSTEM',
          executorName: 'Otomatik İnaktiflik Takipçisi',
          target: `<@${req.discordUserId}> (${req.discordUsername}) - ${req.requestNumber}`,
          description: `İnaktiflik süresi sona erdi, üye tekrar Aktif statüsüne alındı.`
        });
      }
    }

    if (expiredList.length > 0) {
      store.notifyChange();

      // Yönetim kanalına bilgi ver
      if (guild) {
        try {
          const mgmtChannel = guild.channels.cache.find((c: any) =>
            c.name.includes('inaktiflik-yonetim') || c.name.includes('yonetim-odasi')
          );
          if (mgmtChannel && mgmtChannel.send) {
            for (const exp of expiredList) {
              await mgmtChannel.send({
                embeds: [{
                  title: '⏰ İNAKTİFLİK SÜRESİ TAMAMLANDI',
                  description: `<@${exp.discordUserId}> (${exp.discordUsername}) adlı üyenin inaktiflik izni süresi dolmuştur. Otomatik olarak **Aktif** statüsüne getirilmiştir.`,
                  color: 0x3498DB,
                  fields: [
                    { name: '📋 Talep No', value: exp.requestNumber, inline: true },
                    { name: '📅 İzin Dönemi', value: `${exp.startDate} - ${exp.endDate}`, inline: true },
                    { name: '📝 Sebep', value: exp.reason, inline: true }
                  ],
                  footer: { text: "BLOOD'S Gang Otomatik İnaktiflik Sistemi" },
                  timestamp: new Date().toISOString()
                }]
              });
            }
          }
        } catch {}
      }
    }

    return {
      checkedCount: approvedRequests.length,
      expiredCount: expiredList.length,
      expiredRequests: expiredList
    };
  }

  /**
   * Yönetim kanalına inceleme embed'i ve Onayla/Reddet butonları gönderir
   */
  public static async sendRequestToManagementChannel(guild: any, request: IInactivityRequest): Promise<void> {
    try {
      const channel = guild.channels.cache.find((c: any) =>
        c.name.includes('inaktiflik-yonetim') || c.name.includes('yonetim-emirleri') || c.name.includes('yonetim-odasi')
      );
      if (!channel || !channel.send) return;

      const embed = {
        title: `🌴 YENİ İN-AKTİFLİK BİLDİRİMİ: ${request.requestNumber}`,
        description: `Bir birlik üyesi belirli bir süre aktif olamayacağını bildirdi. Yönetim incelemesi bekleniyor.`,
        color: 0xF39C12, // Amber/Orange
        fields: [
          { name: '👤 Bildiren Üye', value: `<@${request.discordUserId}>\nAd: **${request.discordUsername}**\n${request.mtaName ? `IC İsim: **${request.mtaName}**` : ''}`, inline: true },
          { name: '📅 Başlangıç Tarihi', value: `\`${request.startDate}\``, inline: true },
          { name: '📅 Bitiş Tarihi', value: `\`${request.endDate}\``, inline: true },
          { name: '📋 İnaktiflik Sebebi', value: `>>> ${request.reason}`, inline: false },
          ...(request.notes ? [{ name: '📝 Ek Açıklama / Notlar', value: request.notes, inline: false }] : []),
          { name: '🕒 Bildirim Zamanı', value: `<t:${Math.floor(new Date(request.createdAt).getTime() / 1000)}:R>`, inline: true },
          { name: '⚡ Durum', value: '⏳ **Onay Bekliyor**', inline: true }
        ],
        footer: { text: "BLOOD'S Gang İnaktiflik Takip Paneli" },
        timestamp: new Date().toISOString()
      };

      const row = {
        type: 1,
        components: [
          {
            type: 2,
            style: 3, // SUCCESS (Green)
            custom_id: `btn_inact_approve_${request.id}`,
            label: 'Onayla (İzin Ver)',
            emoji: { name: '✅' }
          },
          {
            type: 2,
            style: 4, // DANGER (Red)
            custom_id: `btn_inact_reject_${request.id}`,
            label: 'Reddet',
            emoji: { name: '❌' }
          }
        ]
      };

      await channel.send({ embeds: [embed], components: [row] });
    } catch (e: any) {
      console.warn('[INAKTIFLIK LOG HATASI]', e?.message);
    }
  }

  /**
   * Üye inaktiflik bildirme paneli embed'i
   */
  public static getInactivityPanelEmbed(): any {
    return {
      title: "🌴 BLOOD'S GANG • İN-AKTİFLİK BİLDİRİM PANELİ",
      description:
        `Birlik içerisinde aktiflik takibi ve hood düzeni için devamsızlık durumlarınızı önceden bildirmeniz zorunludur.\n\n` +
        `**Kurallar & Bilgilendirme:**\n` +
        `• Sınav haftası, tatil, iş yoğunluğu veya kişisel sebeplerle aktif olamayacağınızda aşağıdaki butona basınız.\n` +
        `• Açılan formu eksiksiz doldurarak başlangıç ve bitiş tarihlerini belirtiniz.\n` +
        `• Bildiriminiz **Yönetim Karargahı (OG & Under OG)** tarafından incelenecek ve onaylandığında statünüz otomatik olarak \`İzinli\` yapılacaktır.\n` +
        `• Bildirimde bulunulmadan 7 günden fazla inaktif kalan üyeler disiplin kuruluna sevk edilir.`,
      color: 0x2ECC71,
      fields: [
        { name: '⏳ Onay Süreci', value: 'Form doldurulduktan sonra otomatik yönetim kuruluna iletilir.', inline: true },
        { name: '🛡️ Güvence', value: 'İzin süresince rütbe tenzili veya ihraç işlemi uygulanmaz.', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Disiplin ve İdari Heyet" },
      timestamp: new Date().toISOString()
    };
  }

  public static getInactivityPanelButton(): any {
    return {
      type: 1,
      components: [
        {
          type: 2,
          style: 1, // PRIMARY
          custom_id: 'btn_inactivity_modal_open',
          label: 'İnaktiflik Bildir',
          emoji: { name: '🌴' }
        }
      ]
    };
  }
}
