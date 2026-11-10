/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - BAŞVURU SERVİSİ
 * Kabul edildiğinde otomatik Üye kaydı ve Recruiter ilişkilendirmesi yapar.
 */
import { store } from './store.ts';
import { MemberService } from './memberService.ts';
import { IApplication, ApplicationStatus, IApplicationReview } from '../types/index.ts';

export class ApplicationService {
  public static getAll(): IApplication[] {
    return [...store.applications].sort((a, b) => b.applicationNumber - a.applicationNumber);
  }

  public static getById(id: string): IApplication | undefined {
    return store.applications.find(a => a.id === id);
  }

  public static getByApplicationNumber(num: number): IApplication | undefined {
    return store.applications.find(a => a.applicationNumber === num);
  }

  public static createApplication(params: {
    discordUserId: string;
    discordUsername: string;
    oocName: string;
    age: number;
    mtaCharacterName: string;
    characterBackstory: string;
    roleplayExperience: string;
    joinReason: string;
    extraNotes?: string;
  }): { success: boolean; application?: IApplication; message: string } {
    // 0. Kullanıcı zaten birliğin aktif üyesi mi?
    const isAlreadyMember = store.members.some(
      m => m.discordUserId === params.discordUserId && m.status !== 'Atılmış' && m.status !== 'Ayrılmış'
    );
    if (isAlreadyMember) {
      return {
        success: false,
        message: 'Zaten birliğimizin kayıtlı bir üyesisiniz. Yeniden başvuru yapmanıza gerek yoktur!'
      };
    }

    // Aynı Discord ID için bekleyen veya incelenen başvuru var mı?
    const existing = store.applications.find(
      a => a.discordUserId === params.discordUserId && (a.status === 'Beklemede' || a.status === 'İnceleniyor')
    );
    if (existing) {
      return {
        success: false,
        message: `Zaten #${existing.applicationNumber} numaralı aktif bir başvurunuz bulunmaktadır! Başvuru sonucunuz yetkililer tarafından değerlendirilmektedir.`
      };
    }

    const nextNumber =
      store.applications.length > 0
        ? Math.max(...store.applications.map(a => a.applicationNumber)) + 1
        : 101;

    // Recruiter eşleştirmesi kontrolü
    const matchedInvite = store.recruiterInvites.find(
      i => i.candidateDiscordId === params.discordUserId && i.status === 'Davet Edildi'
    );

    const app: IApplication = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationNumber: nextNumber,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      oocName: params.oocName,
      age: params.age,
      mtaCharacterName: params.mtaCharacterName,
      characterBackstory: params.characterBackstory,
      roleplayExperience: params.roleplayExperience,
      joinReason: params.joinReason,
      extraNotes: params.extraNotes,
      status: 'Beklemede',
      recruiterId: matchedInvite ? matchedInvite.recruiterId : undefined,
      reviews: [],
      averageScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (matchedInvite) {
      matchedInvite.status = 'Başvurdu';
      matchedInvite.applicationId = app.id;
    }

    store.applications.unshift(app);

    store.addAuditLog({
      category: 'Başvuru',
      actionType: 'BAŞVURU_OLUŞTURULDU',
      executorId: params.discordUserId,
      executorName: params.discordUsername,
      target: `#${app.applicationNumber}`,
      description: `Yeni katılım başvurusu alındı. Karakter: ${params.mtaCharacterName}`
    });

    return {
      success: true,
      application: app,
      message: `Başvurunuz #${app.applicationNumber} numarasıyla başarıyla oluşturuldu ve yetkili onayına gönderildi.`
    };
  }

  public static addReview(params: {
    applicationId: string;
    reviewerId: string;
    reviewerName: string;
    score: number; // 1-10
    notes: string;
  }): { success: boolean; message: string } {
    const app = this.getById(params.applicationId);
    if (!app) return { success: false, message: 'Başvuru bulunamadı!' };

    if (params.score < 1 || params.score > 10) {
      return { success: false, message: 'Başvuru puanı 1 ile 10 arasında olmalıdır!' };
    }

    app.reviews = app.reviews.filter(r => r.reviewerId !== params.reviewerId);
    const newReview: IApplicationReview = {
      reviewerId: params.reviewerId,
      reviewerName: params.reviewerName,
      score: params.score,
      notes: params.notes,
      reviewedAt: new Date()
    };
    app.reviews.push(newReview);

    const total = app.reviews.reduce((acc, curr) => acc + curr.score, 0);
    app.averageScore = Math.round((total / app.reviews.length) * 10) / 10;
    app.status = 'İnceleniyor';
    app.updatedAt = new Date();

    return {
      success: true,
      message: `Başvuru #${app.applicationNumber} için ${params.score}/10 puan ve inceleme notu kaydedildi.`
    };
  }

  public static acceptApplication(params: {
    applicationId: string;
    executorId: string;
    executorName: string;
    reason?: string;
  }): { success: boolean; message: string } {
    const app = this.getById(params.applicationId);
    if (!app) return { success: false, message: 'Başvuru bulunamadı!' };

    if (app.status === 'Kabul Edildi') {
      return { success: false, message: 'Bu başvuru zaten daha önce kabul edilmiş!' };
    }

    app.status = 'Kabul Edildi';
    app.statusReason = params.reason || 'Yetkili değerlendirmesi sonucu onaylandı.';
    app.assignedStaffId = params.executorId;
    app.assignedStaffName = params.executorName;
    app.updatedAt = new Date();

    // 1. Otomatik Üye Kaydı Oluşturma (Varsayılan Üye rütbesiyle)
    let recruiterName = 'Yok';
    if (app.recruiterId) {
      const rec = store.members.find(m => m.id === app.recruiterId);
      if (rec) recruiterName = rec.currentMtaName;
    }

    MemberService.addMember({
      discordUserId: app.discordUserId,
      discordUsername: app.discordUsername,
      mtaName: app.mtaCharacterName,
      recruiterId: app.recruiterId,
      recruiterName,
      executorId: params.executorId,
      executorName: params.executorName
    });

    // 2. Recruiter Kaydı İlişkilendirme
    const matchedInvite = store.recruiterInvites.find(
      i => i.candidateDiscordId === app.discordUserId || i.applicationId === app.id
    );
    if (matchedInvite) {
      matchedInvite.status = 'Katıldı';
      matchedInvite.notes = `Başvuru #${app.applicationNumber} onaylandı ve birliğe alındı.`;
    }

    store.addAuditLog({
      category: 'Başvuru',
      actionType: 'BAŞVURU_KABUL_EDİLDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: `#${app.applicationNumber} (${app.discordUsername})`,
      newValue: 'Kabul Edildi',
      description: `Başvuru kabul edildi. Otomatik üye kaydı açıldı ve 'Üye' rütbesi atandı.`
    });

    return {
      success: true,
      message: `Başvuru #${app.applicationNumber} (${app.mtaCharacterName}) kabul edildi. Üye kaydı oluşturuldu ve Discord rolleri tanımlandı.`
    };
  }

  public static rejectApplication(params: {
    applicationId: string;
    executorId: string;
    executorName: string;
    reason: string;
  }): { success: boolean; message: string } {
    const app = this.getById(params.applicationId);
    if (!app) return { success: false, message: 'Başvuru bulunamadı!' };

    app.status = 'Reddedildi';
    app.statusReason = params.reason;
    app.assignedStaffId = params.executorId;
    app.assignedStaffName = params.executorName;
    app.updatedAt = new Date();

    const matchedInvite = store.recruiterInvites.find(
      i => i.candidateDiscordId === app.discordUserId || i.applicationId === app.id
    );
    if (matchedInvite) {
      matchedInvite.status = 'Reddedildi';
      matchedInvite.notes = `Başvuru reddedildi: ${params.reason}`;
    }

    store.addAuditLog({
      category: 'Başvuru',
      actionType: 'BAŞVURU_REDDEDİLDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: `#${app.applicationNumber} (${app.discordUsername})`,
      newValue: 'Reddedildi',
      description: `Reddetme Sebebi: ${params.reason}`
    });

    return {
      success: true,
      message: `Başvuru #${app.applicationNumber} reddedildi. Adaya bildirim logu kaydedildi.`
    };
  }

  /**
   * Yeni gelen üyelerin ve adayların göreceği resmi başvuru portalı embed'i
   */
  public static getApplicationPanelEmbed(): any {
    return {
      title: "📝 BLOOD'S GANG | BİRLİK KATILIM BAŞVURUSU",
      description:
        "**Los Santos Syndicate • BLOOD'S Ailesine Katılmak İçin Başvurun**\n\n" +
        'Birliğimize dahil olarak organize sokak operasyonlarında, illegal ticaret ve bölge hakimiyeti mücadelelerinde yer almak istiyorsanız aşağıdaki butona tıklayarak başvuru formunu doldurunuz.\n\n' +
        '📋 **Başvuru Aşamaları:**\n' +
        '1️⃣ **Formu Doldurun:** Aşağıdaki **"📝 Başvuru Formunu Doldur"** butonuna basınız.\n' +
        '2️⃣ **Karakter Bilgileri:** Karakter adı, OOC yaş ve IC hikayenizi eksiksiz yazınız.\n' +
        '3️⃣ **Otomatik Adaylık:** Formu ilettiğiniz an otomatik olarak **⏳ ┊ Aday** rolü tanımlanır.\n' +
        '4️⃣ **Yönetim İncelemesi:** Başvurunuz Recruiter ve OG kadromuz tarafından değerlendirilir.\n\n' +
        '⚠️ *Not: Başvuru durumunuzu dilediğiniz an "❓ Başvuru Durumumu Sorgula" butonundan takip edebilirsiniz.*',
      color: 0x5865F2,
      fields: [
        { name: '🌐 Sunucu / Birlik', value: store.gangInfo.name || "BLOOD'S GANG", inline: true },
        { name: '👥 Aktif Başvuru', value: `${store.applications.filter(a => a.status === 'Beklemede' || a.status === 'İnceleniyor').length} Aday`, inline: true },
        { name: '🎯 Alım Durumu', value: '🟢 **AÇIK**', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Recruitment System • Güvenli Başvuru Portalı" }
    };
  }

  /**
   * Başvuru butonları
   */
  public static getApplicationPanelButtons(): any[] {
    return [
      {
        type: 1, // ActionRow
        components: [
          {
            type: 2, // Button
            custom_id: 'btn_app_new_form',
            label: 'Başvuru Formunu Doldur',
            style: 3, // Success (Yeşil)
            emoji: { name: '📝' }
          },
          {
            type: 2,
            custom_id: 'btn_app_check_status',
            label: 'Başvuru Durumumu Sorgula',
            style: 1, // Primary (Mavi)
            emoji: { name: '❓' }
          },
          {
            type: 2,
            custom_id: 'btn_app_rules_view',
            label: 'Katılım Şartları',
            style: 2, // Secondary (Gri)
            emoji: { name: '📜' }
          }
        ]
      }
    ];
  }

  /**
   * Canlı Discord sunucusunda #📝・katılım-başvuru kanalını bulur, izinlerini ve konumunu
   * yeni gelen adayların rahatça görebileceği şekilde optimize eder ve başvuru panelini yayınlar.
   */
  public static async publishOrUpdateApplicationPanel(
    discordGuild: any
  ): Promise<{ success: boolean; message: string }> {
    if (!discordGuild) return { success: false, message: 'Sunucu nesnesi sağlanamadı.' };

    try {
      await discordGuild.channels.fetch().catch(() => {});
      const appChan: any = discordGuild.channels.cache.find(
        (c: any) => c.isTextBased && c.isTextBased() && (c.name.includes('katılım-başvuru') || c.name.includes('basvuru'))
      );

      if (!appChan) {
        return { success: false, message: 'katılım-başvuru kanalı sunucuda bulunamadı.' };
      }

      // Eğer gizli yönetim kategorisindeyse, bilgilendirme kategorisine taşı
      const infoCat = discordGuild.channels.cache.find(
        (c: any) => (c.type === 4 || c.type === 'GuildCategory') && c.name.includes('BİLGİLENDİRME')
      );
      if (infoCat && appChan.parentId !== infoCat.id && appChan.setParent) {
        try {
          await appChan.setParent(infoCat.id, { lockPermissions: false, reason: 'Başvuru kanalını görünür bilgilendirme kategorisine taşı' });
        } catch (catErr: any) {
          console.warn('[BAŞVURU KANAL TAŞIMA]', catErr?.message);
        }
      }

      // Eski bot mesajlarını temizle
      try {
        const msgs = await appChan.messages.fetch({ limit: 15 }).catch(() => null);
        if (msgs) {
          const botId = discordGuild.client?.user?.id;
          for (const [, m] of msgs) {
            if (m.author.id === botId) {
              await m.delete().catch(() => {});
            }
          }
        }
      } catch (delErr: any) {
        console.warn('[BAŞVURU ESKİ MESAJ SİLME]', delErr?.message);
      }

      // Yeni interaktif başvuru panelini gönder
      await appChan.send({
        embeds: [this.getApplicationPanelEmbed()],
        components: this.getApplicationPanelButtons()
      });

      return {
        success: true,
        message: 'Başvuru paneli #📝・katılım-başvuru kanalına başarıyla yerleştirildi ve butonlar aktif edildi.'
      };
    } catch (err: any) {
      return { success: false, message: err?.message || String(err) };
    }
  }
}
