/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - DİSCORD ENTEGRASYON VE SENKRONİZASYON SERVİSİ
 * 1. Gerçek Discord Rol Senkronizasyonu
 * 2. Canlı Log Kanallarına Zengin Embed Gönderimi
 * 3. İnteraktif Başvuru İnceleme Kartları
 * 4. Sesli Oda / Telsiz Disiplini Yönetimi
 * 5. Otomatik Günlük JSON Yedeği Arşivleme
 * 6. Dağıtılmış Panelleri Kanallardan Temizleme (Purge)
 */
import {
  Guild,
  GuildMember,
  TextChannel,
  VoiceChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionsBitField
} from 'discord.js';
import { store } from './store.ts';
import { BotLogger } from '../utils/logger.ts';
import { EmbedBuilderUtil, IDiscordEmbed, formatIcNickname } from '../utils/embeds.ts';
import { RankLevel, IApplication } from '../types/index.ts';
import { BackupService } from './backupService.ts';

export class DiscordSyncService {
  /**
   * MTA karakter adını temiz Discord sunucu rumuzuna (Nickname) dönüştürür.
   * Örnek: "Dio_Draven" -> "Dio Draven"
   */
  public static formatIcNickname = formatIcNickname;

  /**
   * 1. GERÇEK DİSCORD ROL SENKRONİZASYONU
   * Üyenin rütbesi değiştiğinde sunucudaki rollerini ve IC ismini gerçek zamanlı günceller.
   */
  public static async syncMemberRole(
    guild: Guild | null | undefined,
    discordUserId: string,
    targetRankLevel: RankLevel,
    reason: string = 'Birlik Rütbe Senkronizasyonu',
    icName?: string
  ): Promise<boolean> {
    if (!guild || !discordUserId) return false;

    try {
      let member: GuildMember | null = null;
      try {
        member = await guild.members.fetch(discordUserId);
      } catch (err) {
        BotLogger.warn(`[ROL SENKRONİZASYON] Üye (${discordUserId}) sunucuda bulunamadı.`);
        return false;
      }

      if (!member) return false;

      // IC İsim Güncellemesi: Başvurusu kabul olanları sunucuya IC ismi ile kaydet (örn: Dio Draven)
      const targetIcName = icName ||
        store.members.find(m => m.discordUserId === discordUserId)?.currentMtaName ||
        store.applications.find(a => a.discordUserId === discordUserId)?.mtaCharacterName;

      if (targetIcName) {
        const formattedNick = this.formatIcNickname(targetIcName);
        if (formattedNick) {
          try {
            // Sunucu sahibi değilse ve botun hiyerarşik yetkisi yetiyorsa takma adı güncelle
            if (member.id !== guild.ownerId && member.manageable) {
              if (member.nickname !== formattedNick) {
                await member.setNickname(formattedNick, `${reason} - IC İsim Güncellemesi`);
                BotLogger.info(`[IC NICKNAME] <@${discordUserId}> sunucu ismi "${formattedNick}" olarak güncellendi.`);
              }
            } else if (member.id === guild.ownerId) {
              BotLogger.info(`[IC NICKNAME] <@${discordUserId}> sunucu sahibi olduğu için Discord API takma ad değişikliğini koruyor.`);
            } else {
              // Deneyelim: yetki varsa setNickname çalışır
              await member.setNickname(formattedNick, `${reason} - IC İsim Güncellemesi`).catch(() => {});
            }
          } catch (nickErr: any) {
            BotLogger.warn(`[IC NICKNAME HATASI] (${discordUserId}): ${nickErr?.message}`);
          }
        }
      }

      // 5 Temel Rütbe Rolünün ID'lerini belirle
      const roleMappings = store.guildConfig.roleMappings || {};
      const allRankRoleIds: string[] = [];

      for (const level of [RankLevel.OG, RankLevel.UNDER_OG, RankLevel.RECRUITER, RankLevel.KIDEMLI_UYE, RankLevel.UYE]) {
        let rId = roleMappings[level];
        if (!rId) {
          const found = guild.roles.cache.find(r => {
            const rankObj = store.ranks.find(rk => rk.level === level);
            return rankObj && r.name.toLowerCase() === rankObj.name.toLowerCase();
          });
          if (found) {
            rId = found.id;
            roleMappings[level] = found.id;
          }
        }
        if (rId) allRankRoleIds.push(rId);
      }

      // Eski birlik rütbe rollerini kaldır
      const targetRoleId = roleMappings[targetRankLevel];
      const rolesToRemove = allRankRoleIds.filter(rid => rid !== targetRoleId && member!.roles.cache.has(rid));

      for (const rid of rolesToRemove) {
        await member.roles.remove(rid, `${reason} - Eski rütbe temizliği`).catch(() => {});
      }

      // Aday rolünü de kaldır (eğer onaylandıysa ve rütbe verildiyse)
      const candidateRoleId = roleMappings[0] || guild.roles.cache.find(r => r.name.includes('Aday'))?.id;
      if (candidateRoleId && member.roles.cache.has(candidateRoleId)) {
        await member.roles.remove(candidateRoleId, `${reason} - Aday rolü temizliği`).catch(() => {});
      }

      // Yeni rütbe rolünü ver
      if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
        await member.roles.add(targetRoleId, `${reason} - Seviye ${targetRankLevel}`).catch(() => {});
      }

      BotLogger.info(`[ROL SENKRONİZASYON] <@${discordUserId}> için rütbe rolü (Seviye ${targetRankLevel}) başarıyla senkronize edildi.`);
      return true;
    } catch (err: any) {
      BotLogger.error('[ROL SENKRONİZASYON HATASI]', err.message);
      return false;
    }
  }

  /**
   * Üyenin tüm birlik rollerini geri alır (İhraç / Ceza durumlarında)
   */
  public static async revokeAllGangRoles(
    guild: Guild | null | undefined,
    discordUserId: string,
    reason: string = 'Birlikten İhraç Edildi',
    isCk: boolean = false
  ): Promise<boolean> {
    if (!guild || !discordUserId) return false;

    try {
      const member = await guild.members.fetch(discordUserId).catch(() => null);
      if (!member) return false;

      // 1. RoleMappings üzerinden rolleri kaldır
      const roleMappings = store.guildConfig.roleMappings || {};
      for (const level in roleMappings) {
        const rid = roleMappings[level];
        if (rid && member.roles.cache.has(rid)) {
          await member.roles.remove(rid, reason).catch(() => {});
        }
      }

      // 2. Üyenin üzerindeki tüm rütbe, aday ve başarım rollerini kaldır
      const gangRoleKeywords = ['og', 'under og', 'recruiter', 'kıdemli', 'üye', 'aday', 'tetikçi', 'zengin', 'sadık', 'keskin nişancı', 'efsane'];
      for (const [, r] of member.roles.cache) {
        const rName = r.name.toLowerCase();
        const matchesGang = rName.includes('┊') || gangRoleKeywords.some(k => rName.includes(k));
        if (matchesGang && r.id !== guild.id) {
          await member.roles.remove(r.id, reason).catch(() => {});
        }
      }

      // 3. İhraç / CK rolü bul veya oluştur ve ata
      const expelledRoleName = isCk ? '🪦 ┊ Roleplay CK' : '🪦 ┊ İhraç Edildi';
      let expelledRole = guild.roles.cache.find(r => r.name === expelledRoleName || r.name.includes('İhraç') || r.name.includes('CK'));
      if (!expelledRole) {
        expelledRole = await guild.roles.create({
          name: expelledRoleName,
          color: 0x727d8a,
          hoist: true,
          reason: 'Otomatik İhraç / CK Rolü Oluşturma'
        }).catch(() => undefined);
      }
      if (expelledRole && !member.roles.cache.has(expelledRole.id)) {
        await member.roles.add(expelledRole.id, reason).catch(() => {});
      }

      // 4. Ses kanalındaysa bağlantısını kes
      if (member.voice?.channel) {
        await member.voice.disconnect(reason).catch(() => {});
      }

      BotLogger.info(`[İHRAÇ] <@${discordUserId}> kullanıcısının tüm birlik yetkileri alındı ve ${expelledRoleName} rolü verildi.`);
      return true;
    } catch (err: any) {
      BotLogger.error('[ROL İPTAL HATASI]', err.message);
      return false;
    }
  }

  /**
   * 2. CANLI LOG KANALLARINA ZENGİN EMBED GÖNDERİMİ
   */
  public static async sendLog(
    guild: Guild | null | undefined,
    logType: 'kasa' | 'uye' | 'ceza' | 'gorev' | 'sistem',
    embed: IDiscordEmbed
  ): Promise<boolean> {
    if (!guild) return false;

    try {
      const channelNames: Record<string, string[]> = {
        kasa: ['kasa-log', 'kasa-durumu'],
        uye: ['üye-log', 'uye-log', 'üye-listesi'],
        ceza: ['ceza-log', 'ceza-sicil'],
        gorev: ['görev-log', 'gorev-log', 'operasyon-raporları'],
        sistem: ['sistem-log', 'yönetim-paneli', 'yonetim-paneli']
      };

      const candidates = channelNames[logType] || ['sistem-log'];
      let targetChannel: TextChannel | null = null;

      for (const name of candidates) {
        const found = guild.channels.cache.find(
          c => c.isTextBased() && (c.name.toLowerCase() === name || c.name.toLowerCase().includes(name))
        ) as TextChannel | undefined;
        if (found) {
          targetChannel = found;
          break;
        }
      }

      if (!targetChannel) return false;

      await targetChannel.send({ embeds: [embed as any] }).catch(() => {});
      return true;
    } catch (err: any) {
      BotLogger.error(`[LOG GÖNDERME HATASI - ${logType}]`, err.message);
      return false;
    }
  }

  /**
   * 3. İNTERAKTİF BAŞVURU İNCELEME KARTI (#başvuru-inceleme KANALINA GÖNDERİM)
   */
  public static async sendApplicationReviewCard(
    guild: Guild | null | undefined,
    application: IApplication
  ): Promise<boolean> {
    if (!guild) return false;

    try {
      const candidates = ['başvuru-inceleme', 'basvuru-inceleme', 'başvuru-yonetim', 'yonetim-paneli'];
      let targetChannel: TextChannel | null = null;

      for (const name of candidates) {
        const found = guild.channels.cache.find(
          c => c.isTextBased() && (c.name.toLowerCase() === name || c.name.toLowerCase().includes(name))
        ) as TextChannel | undefined;
        if (found) {
          targetChannel = found;
          break;
        }
      }

      if (!targetChannel) return false;

      const embed: IDiscordEmbed = {
        title: `📋 YENİ ADAY BAŞVURUSU: #${application.applicationNumber}`,
        description:
          `**Aday Discord:** <@${application.discordUserId}> (\`${application.discordUsername}\`)\n` +
          `**OOC İsim & Yaş:** ${application.oocName} (${application.age} Yaşında)\n` +
          `**MTA Karakteri:** \`${application.mtaCharacterName}\`\n` +
          `**Rol Deneyimi:** ${application.roleplayExperience}\n\n` +
          `📖 **Karakter Hikayesi:**\n*${application.characterBackstory.slice(0, 300)}...*\n\n` +
          `🎯 **Birliğe Katılma Amacı:**\n*${application.joinReason}*`,
        color: 0x5865f2,
        fields: [
          { name: 'Başvuru Durumu', value: `🟡 **${application.status}**`, inline: true },
          { name: 'Başvuru Tarihi', value: new Date(application.createdAt).toLocaleString('tr-TR'), inline: true }
        ],
        footer: { text: 'Yönetim Hızlı Karar Paneli • Tek tıkla kabul/ret işlemi yapabilirsiniz.' }
      };

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_quick_app_accept_${application.id}`)
          .setLabel('Kabul Et & Üye Yap')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`btn_quick_app_reject_${application.id}`)
          .setLabel('Reddet')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`btn_quick_app_score_${application.id}`)
          .setLabel('Puanla')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⭐')
      );

      await targetChannel.send({
        embeds: [embed as any],
        components: [row]
      });

      return true;
    } catch (err: any) {
      BotLogger.error('[BAŞVURU BİLDİRİM KARTI HATASI]', err.message);
      return false;
    }
  }

  /**
   * 4. SESLİ ODA VE TELSİZ DİSİPLİNİ YÖNETİMİ
   */
  public static async manageMeetingVoiceDiscipline(
    guild: Guild | null | undefined,
    action: 'start' | 'end'
  ): Promise<{ success: boolean; message: string }> {
    if (!guild) return { success: false, message: 'Discord sunucusuna erişilemedi.' };

    try {
      const voiceChannel = guild.channels.cache.find(
        c => c.isVoiceBased() && c.name.toLowerCase().includes('toplantı')
      ) as VoiceChannel | undefined;

      if (!voiceChannel) {
        return { success: false, message: 'Toplantı ses odası bulunamadı.' };
      }

      if (action === 'start') {
        // Toplantı başladığında @everyone için konuşma iznini kısıtla, liderlere öncelik ver
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          Speak: false
        }).catch(() => {});

        const ogRoleId = store.guildConfig.roleMappings[RankLevel.OG];
        const underOgRoleId = store.guildConfig.roleMappings[RankLevel.UNDER_OG];

        if (ogRoleId) {
          await voiceChannel.permissionOverwrites.edit(ogRoleId, {
            Speak: true,
            PrioritySpeaker: true
          }).catch(() => {});
        }
        if (underOgRoleId) {
          await voiceChannel.permissionOverwrites.edit(underOgRoleId, {
            Speak: true,
            PrioritySpeaker: true
          }).catch(() => {});
        }

        return { success: true, message: 'Toplantı başladı: Telsiz disiplini sağlandı, sadece liderler konuşabilir.' };
      } else {
        // Toplantı bittiğinde konuşma izinlerini serbest bırak
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
          Speak: true
        }).catch(() => {});

        return { success: true, message: 'Toplantı tamamlandı: Ses kanalı izinleri normale döndürüldü.' };
      }
    } catch (err: any) {
      BotLogger.error('[TELSİZ DİSİPLİN HATASI]', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * 5. OTOMATİK GÜNLÜK JSON VERİTABANI YEDEĞİ GÖNDERİMİ
   */
  public static async dispatchNightlyBackup(guild: Guild | null | undefined): Promise<boolean> {
    if (!guild) return false;

    try {
      const backupRes = BackupService.createBackup('Otomatik Gece Görevi (Watchdog)');
      if (!backupRes.success || !backupRes.backupJson) return false;

      const targetChannel = guild.channels.cache.find(
        c => c.isTextBased() && (c.name.toLowerCase() === 'sistem-log' || c.name.toLowerCase().includes('sistem'))
      ) as TextChannel | undefined;

      if (!targetChannel) return false;

      const buffer = Buffer.from(backupRes.backupJson, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, {
        name: `birlik_otomatik_yedek_${new Date().toISOString().slice(0, 10)}.json`
      });

      const embed: IDiscordEmbed = {
        title: '💾 OTOMATİK GÜNLÜK SİSTEM YEDEĞİ',
        description:
          `Veritabanı otomatik olarak dışa aktarıldı ve güvenli arşive yüklendi.\n` +
          `• **Boyut:** ${(buffer.length / 1024).toFixed(2)} KB\n` +
          `• **Tarih:** ${new Date().toLocaleString('tr-TR')}\n` +
          `• **Kayıt:** ${backupRes.stats.members || 0} Üye, $${(backupRes.stats.treasury || 0).toLocaleString('tr-TR')} Kasa`,
        color: 0x23a55a
      };

      await targetChannel.send({
        embeds: [embed as any],
        files: [attachment]
      });

      BotLogger.info('[OTOMATİK YEDEK] Günlük veritabanı yedeği #sistem-log kanalına başarıyla gönderildi.');
      return true;
    } catch (err: any) {
      BotLogger.error('[OTOMATİK YEDEKLEME HATASI]', err.message);
      return false;
    }
  }

  /**
   * 6. KANALLARA ATILMIŞ OLAN PANELLERİ TAMAMEN SİLME (PURGE)
   * Kullanıcının özel talimatı: "kanallara atmış olduğun panelleride sil."
   */
  public static async purgeAllDistributedPanels(
    guild: Guild | null | undefined
  ): Promise<{ success: boolean; deletedCount: number; message: string }> {
    let deletedCount = 0;
    const panelRecords = store.guildConfig.panelMessageIds || {};

    if (guild) {
      for (const panelId of Object.keys(panelRecords)) {
        const info = panelRecords[panelId];
        if (!info || !info.channelId || !info.messageId) continue;

        try {
          let channel: TextChannel | null = null;
          try {
            channel = (await guild.channels.fetch(info.channelId)) as TextChannel | null;
          } catch {
            channel = guild.channels.cache.get(info.channelId) as TextChannel | null;
          }

          if (channel && channel.isTextBased()) {
            try {
              const msg = await channel.messages.fetch(info.messageId);
              if (msg && msg.deletable) {
                await msg.delete();
                deletedCount++;
              }
            } catch {
              // Mesaj zaten silinmiş veya bulunamadı
            }
          }
        } catch (err: any) {
          BotLogger.warn(`[PANEL SİLME] ${panelId} paneli silinirken hata: ${err.message}`);
        }
      }
    }

    // Panel kayıt haritasını sıfırla
    store.guildConfig.panelMessageIds = {};

    BotLogger.info(`[PANEL TEMİZLİK] Kanallardan toplam ${deletedCount} adet eski panel mesajı başarıyla temizlendi.`);
    return {
      success: true,
      deletedCount,
      message: `${deletedCount} adet panel mesajı kanallardan başarıyla kaldırıldı ve kayıtlar temizlendi.`
    };
  }
}
