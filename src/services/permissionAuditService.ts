/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - İZİN DENETİM VE GÜVENLİK SERVİSİ
 * Tüm Discord kategorilerini ve kanallarını rol bazlı hiyerarşik güvenlik kurallarına göre
 * denetler, güvenlik açıklarını tespit eder ve Discord API üzerinden tek tek düzeltir.
 */
import { store } from './store.ts';
import { PermissionFlagsBits } from './setupService.ts';

export interface IAuditIssue {
  channelId: string;
  channelName: string;
  categoryName: string;
  roleName: string;
  severity: 'KRİTİK' | 'YÜKSEK' | 'ORTA' | 'DÜŞÜK';
  problem: string;
  actionTaken?: string;
}

export interface IAuditReport {
  timestamp: string;
  totalChannelsScanned: number;
  criticalIssuesFound: number;
  fixedChannelsCount: number;
  score: number; // 0 - 100
  issues: IAuditIssue[];
  summary: {
    applicantIsolationStatus: string;
    managementPrivacyStatus: string;
    recruiterScopeStatus: string;
    chatMediaLockStatus: string;
  };
}

export class PermissionAuditService {
  /**
   * Ceza ve uyarı log kanalı mı? (Kullanıcı kuralı: Üye rolü ve üstündekiler görebilsin ama yazamasınlar)
   */
  public static isPunishmentLogChannel(name: string): boolean {
    const n = name.toLowerCase();
    return (
      n.includes('ceza-log') ||
      n.includes('ceza-sicil') ||
      n.includes('uyarı-log') ||
      n.includes('uyari-log') ||
      n.includes('kara-liste-sicil')
    );
  }

  /**
   * Kanal veya kategorinin yönetim amaçlı özel bir kanal olup olmadığını tespit eder.
   */
  public static isManagementEntity(name: string, parentName: string = ''): boolean {
    const n = name.toLowerCase();
    // Ceza ve uyarı log kanalları yönetim kanalı değildir; Üye ve üstü görebilir (yazamaz)
    if (this.isPunishmentLogChannel(name)) {
      return false;
    }

    // Başvuru kanalları (katılım-başvuru) yönetim kanalı DEĞİLDİR; yeni gelenler (@everyone ve Aday) görebilmelidir!
    if (this.isApplicationChannel(name) || n.includes('katılım-başvuru') || n.includes('basvuru')) {
      return false;
    }

    // Herkese açık veya tüm üyelere açık özel kanallar (İnaktiflik Bildir, Rehber, Rütbe Bilgi)
    if (
      n.includes('inaktiflik-bildir') ||
      n.includes('kanal-rehberi') ||
      n.includes('rütbe-bilgilendirme') ||
      n.includes('rutbe-bilgi')
    ) {
      return false;
    }

    const combined = `${n} ${parentName.toLowerCase()}`;
    const mgmtKeywords = [
      'karargah',
      'yönetim',
      'yonetim',
      'high command',
      'vip',
      'özel toplantı',
      'ozel toplanti',
      'birebir',
      'brifing',
      'merkez-yönetim',
      'merkez yönetim',
      'yargı',
      'yargi',
      'iç soruşturma',
      'ic sorusturma',
      'gizli kayıt',
      'gizli kayit',
      'kararlar',
      'yönetim kararları',
      'personel değerlendirme',
      'yönetim log',
      'özel operasyon',
      'diplomasi yönetimi',
      'gizli log',
      'sicil-arşivi',
      'sistem-log',
      'kasa-log',
      'üye-log',
      'görev-log',
      'alınan-kararlar',
      'toplantı-notları',
      'toplanti notlari',
      'toplantı-gündemi',
      'toplantı-arşivi'
    ];
    return mgmtKeywords.some(k => combined.includes(k));
  }

  /**
   * Herkese açık bilgilendirme kanalı mı? (duyuru, kurallar, bilgilendirme)
   */
  public static isPublicInfoChannel(name: string, parentName: string = ''): boolean {
    const n = name.toLowerCase();
    const p = parentName.toLowerCase();
    // Ceza log kanalları herkese açık değildir (@everyone ve Aday göremez, yalnızca Üye ve üstü)
    if (this.isPunishmentLogChannel(name)) {
      return false;
    }
    return (
      n.includes('duyuru') ||
      n.includes('kurallar') ||
      n.includes('bilgilendirme') ||
      n.includes('kanal-rehberi') ||
      n.includes('rehber') ||
      n.includes('rütbe-bilgilendirme') ||
      n.includes('rutbe-bilgi') ||
      n.includes('inaktiflik-bildir') ||
      (p.includes('bilgilendirme') && !n.includes('yönetim') && !n.includes('özel') && !n.includes('kriptolu'))
    );
  }

  /**
   * Başvuru kanalı mı? (katılım-başvuru)
   */
  public static isApplicationChannel(name: string): boolean {
    const n = name.toLowerCase();
    return (n.includes('başvuru') || n.includes('basvuru')) && !n.includes('inceleme');
  }

  /**
   * Yalnızca Recruiter ve Yönetimin görmesi gereken kanal mı?
   */
  public static isRecruiterOnlyChannel(name: string): boolean {
    const n = name.toLowerCase();
    return (
      n.includes('recruiter-paneli') ||
      n.includes('başvuru-inceleme') ||
      n.includes('basvuru-inceleme') ||
      n.includes('recruiter-kulübü') ||
      n.includes('recruiter iletişim')
    );
  }

  /**
   * Yalnızca Kıdemli Üye ve Yönetimin görmesi gereken kanal mı?
   */
  public static isSeniorOnlyChannel(name: string): boolean {
    const n = name.toLowerCase();
    return n.includes('kurmay-sohbet') || n.includes('kurmay');
  }

  /**
   * Salt metin sohbet kanalı mı? (Medya engeli uygulanacak alan)
   */
  public static isTextChatChannel(name: string, isVoice: boolean, isCategory: boolean): boolean {
    if (isVoice || isCategory) return false;
    const n = name.toLowerCase();
    return (
      n.includes('genel-sohbet') ||
      n.includes('muhabbet-odası') ||
      n.includes('birlik-sohbet') ||
      n.includes('birlik-muhabbet') ||
      n.includes('tim-sohbet') ||
      n.includes('mizah-makara') ||
      n.includes('oyun-lobisi')
    );
  }

  /**
   * Medya paylaşım kanalı mı?
   */
  public static isMediaChannel(name: string, isVoice: boolean, isCategory: boolean): boolean {
    if (isVoice || isCategory) return false;
    const n = name.toLowerCase();
    return n.includes('medya') || n.includes('fotoğraf') || n.includes('klip') || n.includes('delil');
  }

  /**
   * Sunucunun tüm izinlerini denetler ve tespit edilen açıkları raporlar
   */
  public static async auditGuild(discordGuild: any): Promise<IAuditReport> {
    const issues: IAuditIssue[] = [];

    const everyoneRole = discordGuild.roles.everyone;
    const ogRole = discordGuild.roles.cache.find((r: any) => r.name.includes('OG') && !r.name.includes('Under'));
    const underOgRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Under OG'));
    const recruiterRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Recruiter'));
    const seniorRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Kıdemli'));
    const memberRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Üye') && !r.name.includes('Kıdemli'));
    const candidateRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Aday'));

    let totalChannels = 0;

    for (const [, ch] of discordGuild.channels.cache) {
      totalChannels++;
      const name = ch.name;
      const parentName = ch.parent ? ch.parent.name : '';
      const isVoice = ch.type === 2 || ch.type === 'GuildVoice';
      const isCategory = ch.type === 4 || ch.type === 'GuildCategory';

      const isMgmt = this.isManagementEntity(name, parentName);
      const isApp = this.isApplicationChannel(name);
      const isPubInfo = this.isPublicInfoChannel(name, parentName);
      const isPunish = this.isPunishmentLogChannel(name);
      const isRecruiter = this.isRecruiterOnlyChannel(name);
      const isSenior = this.isSeniorOnlyChannel(name);

      const overwrites = ch.permissionOverwrites?.cache;
      if (!overwrites) continue;

      // 0. Ceza ve Uyarı Logu Denetimi (Kullanıcı Kuralı: Üye ve üstü görebilsin ama yazamasın)
      if (isPunish) {
        const everyoneOw = overwrites.get(everyoneRole?.id);
        const everyoneAllow = everyoneOw?.allow ? BigInt(everyoneOw.allow) : 0n;
        const everyoneDeny = everyoneOw?.deny ? BigInt(everyoneOw.deny) : 0n;
        const everyoneCanView = (everyoneAllow & PermissionFlagsBits.ViewChannel) !== 0n || ((everyoneDeny & PermissionFlagsBits.ViewChannel) === 0n && !ch.parent);

        if (everyoneCanView) {
          issues.push({
            channelId: ch.id,
            channelName: name,
            categoryName: parentName || 'Kategorisiz',
            roleName: '@everyone',
            severity: 'YÜKSEK',
            problem: `@everyone rolünün ceza logunu (${name}) görme yetkisi açık!`
          });
        }

        if (candidateRole) {
          const candOw = overwrites.get(candidateRole.id);
          const candAllow = candOw?.allow ? BigInt(candOw.allow) : 0n;
          if ((candAllow & PermissionFlagsBits.ViewChannel) !== 0n) {
            issues.push({
              channelId: ch.id,
              channelName: name,
              categoryName: parentName || 'Kategorisiz',
              roleName: candidateRole.name,
              severity: 'YÜKSEK',
              problem: `Başvuru adayının ceza logunu (${name}) görme yetkisi açık!`
            });
          }
        }

        for (const r of [memberRole, seniorRole, recruiterRole].filter(Boolean)) {
          const ow = overwrites.get(r.id);
          const allow = ow?.allow ? BigInt(ow.allow) : 0n;
          const deny = ow?.deny ? BigInt(ow.deny) : 0n;
          const canView = (allow & PermissionFlagsBits.ViewChannel) !== 0n;
          const canSend = (allow & PermissionFlagsBits.SendMessages) !== 0n || (deny & PermissionFlagsBits.SendMessages) === 0n;

          if (!canView) {
            issues.push({
              channelId: ch.id,
              channelName: name,
              categoryName: parentName || 'Kategorisiz',
              roleName: r.name,
              severity: 'YÜKSEK',
              problem: `${r.name} rolünün ceza logunu (${name}) görme yetkisi kapalı (üye ve üstü görebilmeli)!`
            });
          }
          if (canSend) {
            issues.push({
              channelId: ch.id,
              channelName: name,
              categoryName: parentName || 'Kategorisiz',
              roleName: r.name,
              severity: 'YÜKSEK',
              problem: `${r.name} rolünün ceza loguna (${name}) mesaj yazma yetkisi açık (yalnızca okuyabilmeli)!`
            });
          }
        }
      }

      // 1. @everyone Denetimi
      const everyoneOw = overwrites.get(everyoneRole?.id);
      const everyoneDeny = everyoneOw?.deny ? BigInt(everyoneOw.deny) : 0n;
      const everyoneAllow = everyoneOw?.allow ? BigInt(everyoneOw.allow) : 0n;
      const everyoneCanView = (everyoneAllow & PermissionFlagsBits.ViewChannel) !== 0n || ((everyoneDeny & PermissionFlagsBits.ViewChannel) === 0n && !ch.parent);

      if (!isApp && !isPubInfo && everyoneCanView) {
        issues.push({
          channelId: ch.id,
          channelName: name,
          categoryName: parentName || 'Kategorisiz',
          roleName: '@everyone',
          severity: isMgmt ? 'KRİTİK' : 'YÜKSEK',
          problem: `@everyone rolünün ${isMgmt ? 'YÖNETİM KANALINI' : 'özel birlik kanalını'} görme yetkisi açık.`
        });
      }

      // 2. Başvuru Adayı (Aday) Denetimi
      if (candidateRole) {
        const candOw = overwrites.get(candidateRole.id);
        const candAllow = candOw?.allow ? BigInt(candOw.allow) : 0n;
        const candDeny = candOw?.deny ? BigInt(candOw.deny) : 0n;
        const candCanView = (candAllow & PermissionFlagsBits.ViewChannel) !== 0n;

        if (!isApp && !isPubInfo && candCanView) {
          issues.push({
            channelId: ch.id,
            channelName: name,
            categoryName: parentName || 'Kategorisiz',
            roleName: candidateRole.name,
            severity: isMgmt ? 'KRİTİK' : 'YÜKSEK',
            problem: `Başvuru adayı rolünün ${name} kanalına doğrudan erişim izni bulunuyor!`
          });
        }
      }

      // 3. Normal Üye ve Kıdemli Üye Denetimi (Yönetim Kanallarına Erişim Kontrolü)
      if (isMgmt) {
        for (const r of [memberRole, seniorRole, candidateRole].filter(Boolean)) {
          const ow = overwrites.get(r.id);
          const allow = ow?.allow ? BigInt(ow.allow) : 0n;
          const deny = ow?.deny ? BigInt(ow.deny) : 0n;
          const canView = (allow & PermissionFlagsBits.ViewChannel) !== 0n;
          const isExplicitlyDenied = (deny & PermissionFlagsBits.ViewChannel) !== 0n;

          if (canView || !isExplicitlyDenied) {
            issues.push({
              channelId: ch.id,
              channelName: name,
              categoryName: parentName || 'Kategorisiz',
              roleName: r.name,
              severity: 'KRİTİK',
              problem: `${r.name} rolü yönetim kanalında (${name}) açıkça engellenmemiş veya izin verilmiş!`
            });
          }
        }

        // Recruiter da yönetim kanallarını göremez (yalnızca recruiter-paneli ve başvuru-inceleme görebilir)
        if (recruiterRole && !isRecruiter) {
          const recOw = overwrites.get(recruiterRole.id);
          const recAllow = recOw?.allow ? BigInt(recOw.allow) : 0n;
          const recDeny = recOw?.deny ? BigInt(recOw.deny) : 0n;
          const canView = (recAllow & PermissionFlagsBits.ViewChannel) !== 0n;
          const isExplicitlyDenied = (recDeny & PermissionFlagsBits.ViewChannel) !== 0n;

          if (canView || !isExplicitlyDenied) {
            issues.push({
              channelId: ch.id,
              channelName: name,
              categoryName: parentName || 'Kategorisiz',
              roleName: recruiterRole.name,
              severity: 'YÜKSEK',
              problem: `Recruiter rolü yönetim kanalında (${name}) açıkça engellenmemiş!`
            });
          }
        }
      }
    }

    const criticalCount = issues.filter(i => i.severity === 'KRİTİK').length;
    const score = Math.max(0, 100 - (criticalCount * 15 + (issues.length - criticalCount) * 5));

    return {
      timestamp: new Date().toISOString(),
      totalChannelsScanned: totalChannels,
      criticalIssuesFound: criticalCount,
      fixedChannelsCount: 0,
      score,
      issues,
      summary: {
        applicantIsolationStatus: issues.some(i => i.roleName.includes('Aday') || (i.roleName === '@everyone' && i.severity === 'KRİTİK')) ? 'AÇIK TESPİT EDİLDİ' : 'GÜVENLİ',
        managementPrivacyStatus: issues.some(i => i.severity === 'KRİTİK') ? 'AÇIK TESPİT EDİLDİ' : 'TAM KORUMA ALTINDA',
        recruiterScopeStatus: issues.some(i => i.roleName.includes('Recruiter')) ? 'AÇIK TESPİT EDİLDİ' : 'YETKİ SINIRLARINDA',
        chatMediaLockStatus: 'AKTİF (Bot Filtresi & İzin Koruması)'
      }
    };
  }

  /**
   * Tüm sunucudaki kategori ve kanal izinlerini kusursuz hiyerarşiye göre Discord API üzerinden günceller.
   */
  public static async enforceGuildPermissions(discordGuild: any): Promise<{
    success: boolean;
    totalConfigured: number;
    fixedIssues: number;
    report: IAuditReport;
    message: string;
  }> {
    const everyoneRole = discordGuild.roles.everyone;
    const ogRole = discordGuild.roles.cache.find((r: any) => r.name.includes('OG') && !r.name.includes('Under'));
    const underOgRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Under OG'));
    const recruiterRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Recruiter'));
    const seniorRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Kıdemli'));
    const memberRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Üye') && !r.name.includes('Kıdemli'));
    const candidateRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Aday'));
    const botUser = discordGuild.client?.user;

    const managementRoles = [ogRole, underOgRole].filter(Boolean);
    const nonManagementRoles = [recruiterRole, seniorRole, memberRole, candidateRole].filter(Boolean);
    const regularMemberRoles = [seniorRole, memberRole].filter(Boolean);

    let configuredCount = 0;

    // Önce ilk durumu tara
    const preAudit = await this.auditGuild(discordGuild);

    for (const [, ch] of discordGuild.channels.cache) {
      if (!ch.permissionOverwrites || typeof ch.permissionOverwrites.set !== 'function') continue;

      const name = ch.name;
      const parentName = ch.parent ? ch.parent.name : '';
      const isVoice = ch.type === 2 || ch.type === 'GuildVoice';
      const isCategory = ch.type === 4 || ch.type === 'GuildCategory';

      const isMgmt = this.isManagementEntity(name, parentName);
      const isApp = this.isApplicationChannel(name);
      const isPubInfo = this.isPublicInfoChannel(name, parentName);
      const isPunish = this.isPunishmentLogChannel(name);
      const isRecruiter = this.isRecruiterOnlyChannel(name);
      const isSenior = this.isSeniorOnlyChannel(name);
      const isTextChat = this.isTextChatChannel(name, isVoice, isCategory);
      const isMedia = this.isMediaChannel(name, isVoice, isCategory);

      const overwrites: any[] = [];

      // 1. BOT İZİNLERİ (Her zaman mutlak yetki)
      if (botUser) {
        overwrites.push({
          id: botUser.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ]
        });
      }

      // -------------------------------------------------------------
      // KURAL A: BAŞVURU KANALI (📝・katılım-başvuru)
      // -------------------------------------------------------------
      if (isApp) {
        overwrites.push({
          id: everyoneRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.CreatePublicThreads]
        });

        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
          });
        }

        for (const r of [memberRole, seniorRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages]
          });
        }

        // Recruiter ve Yönetim görebilir ve mesaj yazabilir
        for (const r of [recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL CEZA VE UYARI LOGU: (⚖️・ceza-log, ⚠️・uyarı-log vb.)
      // Kullanıcı talebi: Ceza logunu üye rolü ve üstündekiler görebilsin ama yazamasınlar!
      // -------------------------------------------------------------
      else if (isPunish) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads]
        });

        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          });
        }

        // Üye, Kıdemli Üye ve Recruiter GÖREBİLİR ama MESAJ YAZAMAZ
        for (const r of [memberRole, seniorRole, recruiterRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.CreatePublicThreads]
          });
        }

        // SADECE Yönetim (OG ve Under OG) mesaj gönderebilir ve yönetebilir
        for (const r of managementRoles) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages
            ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL B: HERKESE AÇIK BİLGİLENDİRME (Duyuru, Kurallar vb.)
      // -------------------------------------------------------------
      else if (isPubInfo) {
        overwrites.push({
          id: everyoneRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.CreatePublicThreads]
        });

        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
          });
        }

        for (const r of regularMemberRoles) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages]
          });
        }

        // Yalnızca Yönetim ve Yetkililer duyuru atabilir
        for (const r of managementRoles) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages
            ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL C: YÖNETİM KARARGAHI, ÖZEL TOPLANTILAR, İÇ SORUŞTURMA & LOG KANALLARI
      // Kullanıcı talebi: Yönetim kanallarını sadece OG ve UNDER OG görsün!
      // -------------------------------------------------------------
      else if (isMgmt) {
        overwrites.push({
          id: everyoneRole.id,
          deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
        });

        // Aday, Normal Üye, Kıdemli Üye ve Recruiter KESİNLİKLE GÖREMEZ
        for (const r of nonManagementRoles) {
          overwrites.push({
            id: r.id,
            deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
          });
        }

        // SADECE OG VE UNDER OG TAM YETKİLİ
        for (const r of managementRoles) {
          overwrites.push({
            id: r.id,
            allow: isVoice
              ? [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.Connect,
                  PermissionFlagsBits.Speak,
                  PermissionFlagsBits.PrioritySpeaker,
                  PermissionFlagsBits.ManageChannels
                ]
              : [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks,
                  PermissionFlagsBits.ManageMessages,
                  PermissionFlagsBits.ManageChannels
                ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL D: RECRUITER ÖZEL KANALLARI (başvuru-inceleme, recruiter-paneli vb.)
      // -------------------------------------------------------------
      else if (isRecruiter) {
        overwrites.push({
          id: everyoneRole.id,
          deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
        });

        // Aday, Normal Üye ve Kıdemli Üye göremez
        for (const r of [candidateRole, memberRole, seniorRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
          });
        }

        // Recruiter ve Yönetim görebilir
        for (const r of [recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: isVoice
              ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
              : [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.EmbedLinks
                ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL E: KIDEMLİ ÜYE ÖZEL KANALLARI (kurmay-sohbet)
      // -------------------------------------------------------------
      else if (isSenior) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });

        // Aday ve Normal Üye göremez
        for (const r of [candidateRole, memberRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
        }

        // Kıdemli, Recruiter ve Yönetim görebilir
        for (const r of [seniorRole, recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL F: NORMAL BİRLİK SOHBET KANALLARI (Metin)
      // Kullanıcı talebi: Resim ve video paylaşılamasın!
      // Adaylar ve @everyone KESİNLİKLE GÖREMEZ!
      // -------------------------------------------------------------
      else if (isTextChat) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });

        // Başvuru adayları birlik sohbetlerini GÖREMEZ!
        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
        }

        // Normal ve Kıdemli Üyeler yazabilir AMA resim ve video/dosya ATAMAZ
        for (const r of regularMemberRoles) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
          });
        }

        // Recruiter ve Yönetim tam yetkili
        for (const r of [recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL G: MEDYA VE FOTOĞRAF KANALLARI
      // -------------------------------------------------------------
      else if (isMedia) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });

        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
        }

        // Tüm asil üyeler resim atabilir
        for (const r of [memberRole, seniorRole, recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          });
        }
      }

      // -------------------------------------------------------------
      // KURAL H: GENEL BİRLİK KANALLARI VE KATEGORİLERİ (Varsayılan Üye Kanalları)
      // -------------------------------------------------------------
      else {
        overwrites.push({
          id: everyoneRole.id,
          deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
        });

        // Başvuru Adayları genel birlik kanallarını GÖREMEZ!
        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            deny: isVoice ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] : [PermissionFlagsBits.ViewChannel]
          });
        }

        // Tüm asil birlik üyeleri görebilir ve katılabilir
        for (const r of [memberRole, seniorRole, recruiterRole, ...managementRoles].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: isVoice
              ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
              : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          });
        }
      }

      // Discord API üzerinden izinleri uygula
      try {
        await ch.permissionOverwrites.set(overwrites, 'Güvenlik ve Rol Bazlı Erişim Denetimi');
        configuredCount++;
      } catch (err: any) {
        console.warn(`[İZİN GÜNCELLEME UYARISI] Kanal (${name}): ${err?.message}`);
      }
    }

    // Uygulama sonrası durumu tekrar tara
    const postAudit = await this.auditGuild(discordGuild);

    store.addAuditLog({
      category: 'Güvenlik',
      actionType: 'SUNUCU_İZİN_DENETİMİ',
      executorId: 'SİSTEM_GÜVENLİK',
      executorName: 'PermissionAuditService',
      target: discordGuild.name,
      description: `${configuredCount} kanalın rol bazlı izinleri güncellendi. Başlangıç açıkları: ${preAudit.issues.length}, Kalan açık: ${postAudit.issues.length}.`
    });

    return {
      success: true,
      totalConfigured: configuredCount,
      fixedIssues: Math.max(0, preAudit.issues.length - postAudit.issues.length),
      report: postAudit,
      message: `${configuredCount} kanalın ve kategorinin rol bazlı erişim izinleri başarıyla yapılandırıldı.`
    };
  }
}
