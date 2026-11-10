/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - UYARI VE DİSİPLİN ROL SERVİSİ
 * Uyarı sistemi, 1x/2x/3x rol senkronizasyonu ve değiştirilemez #⚠️・uyarı-log kaydı.
 */
import { store } from './store.ts';
import { IWarningRecord } from '../types/index.ts';

export const WARNING_ROLE_NAMES = {
  1: '⚠️ ┊ 1x Uyarı',
  2: '⚠️ ┊ 2x Uyarı',
  3: '🚫 ┊ 3x Uyarı'
} as const;

export const WARNING_ROLE_COLORS = {
  1: 0xF1C40F, // Sarı / Gold
  2: 0xE67E22, // Turuncu
  3: 0xED4245  // Kırmızı
} as const;

export class WarningService {
  /**
   * Sunucuda 1x Uyarı, 2x Uyarı ve 3x Uyarı rollerinin varlığını garanti eder
   */
  public static async ensureWarningRoles(guild: any): Promise<{
    role1?: any;
    role2?: any;
    role3?: any;
  }> {
    if (!guild || !guild.roles) return {};

    const result: any = {};
    for (const count of [1, 2, 3] as const) {
      const roleName = WARNING_ROLE_NAMES[count];
      let role = guild.roles.cache.find((r: any) =>
        r.name.toLowerCase() === roleName.toLowerCase() ||
        r.name.includes(`${count}x Uyarı`) ||
        r.name.includes(`${count}x uyarı`)
      );

      if (!role && guild.roles.create) {
        try {
          role = await guild.roles.create({
            name: roleName,
            color: WARNING_ROLE_COLORS[count],
            hoist: true,
            reason: `MTA Birlik ${count}x Uyarı Disiplin Rolü`
          });
          console.log(`[UYARI] Yeni rol oluşturuldu: ${roleName}`);
        } catch (e: any) {
          console.warn(`[UYARI] Rol oluşturma hatası (${roleName}):`, e?.message);
        }
      } else if (role && !role.hoist && role.edit) {
        try {
          await role.edit({ hoist: true });
        } catch {}
      }

      result[`role${count}`] = role;
    }
    return result;
  }

  /**
   * Bir kullanıcının aktif uyarı sayısına göre Discord rollerini eşitler
   */
  public static async syncMemberWarningRoles(guild: any, userId: string, activeCount: number): Promise<{
    synced: boolean;
    appliedRole?: string;
    removedRoles: string[];
  }> {
    const removedRoles: string[] = [];
    if (!guild || !guild.members) {
      return { synced: false, removedRoles };
    }

    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return { synced: false, removedRoles };
      }

      const roles = await this.ensureWarningRoles(guild);
      const role1 = roles.role1;
      const role2 = roles.role2;
      const role3 = roles.role3;

      let targetRole: any = null;
      if (activeCount === 1) targetRole = role1;
      else if (activeCount === 2) targetRole = role2;
      else if (activeCount >= 3) targetRole = role3;

      // Eski veya uyuşmayan uyarı rollerini kaldır
      const allWarningRoles = [role1, role2, role3].filter(Boolean);
      for (const r of allWarningRoles) {
        if ((!targetRole || r.id !== targetRole.id) && member.roles.cache.has(r.id)) {
          await member.roles.remove(r, 'Uyarı sayısı değişti - eski uyarı rolü kaldırıldı').catch(() => {});
          removedRoles.push(r.name);
        }
      }

      // Yeni uyarı rolünü ver
      let appliedRole: string | undefined;
      if (targetRole && !member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole, `${activeCount}x Uyarı uygulandı`).catch(() => {});
        appliedRole = targetRole.name;
      }

      return {
        synced: true,
        appliedRole,
        removedRoles
      };
    } catch (err: any) {
      console.error('[UYARI ROL SENKRONİZASYON HATASI]', err?.message);
      return { synced: false, removedRoles };
    }
  }

  /**
   * Kullanıcıya yeni bir uyarı ekler, rolünü günceller ve log kanalına yazar
   */
  public static async addWarning(params: {
    discordUserId: string;
    discordUsername: string;
    reason: string;
    proof?: string;
    executorId: string;
    executorName: string;
    guild?: any;
  }): Promise<{
    success: boolean;
    warning: IWarningRecord;
    activeCount: number;
    roleApplied?: string;
    message: string;
  }> {
    // 1. Mevcut aktif uyarıları say
    const existingActive = store.warnings.filter(w => w.discordUserId === params.discordUserId && w.active);
    const newCount = existingActive.length + 1;

    // 2. Yeni uyarı kaydı oluştur
    const warning: IWarningRecord = {
      id: `wrn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warningNumber: newCount,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      reason: params.reason,
      proof: params.proof,
      executorId: params.executorId,
      executorName: params.executorName,
      createdAt: new Date(),
      active: true
    };

    store.warnings.unshift(warning);

    // Üye kaydı varsa uyarı sayısını eşitle
    const member = store.members.find(m => m.discordUserId === params.discordUserId);
    if (member) {
      member.warningsCount = newCount;
      member.updatedAt = new Date();
    }

    // 3. Denetim loguna ekle
    store.addAuditLog({
      category: 'Disiplin',
      actionType: 'UYARI_VERİLDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: `<@${params.discordUserId}> (${params.discordUsername})`,
      newValue: `${newCount}x Uyarı`,
      description: `Sebep: ${params.reason} ${params.proof ? `| Kanıt: ${params.proof}` : ''}`
    });

    store.notifyChange();

    // 4. Discord Rollerini Senkronize Et
    let roleApplied: string | undefined;
    if (params.guild) {
      const syncRes = await this.syncMemberWarningRoles(params.guild, params.discordUserId, newCount);
      roleApplied = syncRes.appliedRole;

      // 5. #⚠️・uyarı-log kanalına değiştirilemez kayıt gönder
      await this.sendWarningLogToChannel(params.guild, warning, newCount);
    }

    return {
      success: true,
      warning,
      activeCount: newCount,
      roleApplied,
      message: `${params.discordUsername} kullanıcısına ${newCount}. uyarı başarıyla uygulandı.`
    };
  }

  /**
   * Bir uyarıyı kaldırır/affeder ve rolü otomatik tenzil eder
   */
  public static async removeWarning(params: {
    discordUserId: string;
    warningId?: string;
    revokedBy: string;
    revokedReason: string;
    guild?: any;
  }): Promise<{
    success: boolean;
    remainingActiveCount: number;
    removedWarning?: IWarningRecord;
    message: string;
  }> {
    // En son aktif uyarıyı veya ID ile belirtilen uyarıyı bul
    let warning: IWarningRecord | undefined;
    if (params.warningId) {
      warning = store.warnings.find(w => w.id === params.warningId && w.active);
    } else {
      warning = store.warnings.find(w => w.discordUserId === params.discordUserId && w.active);
    }

    if (!warning) {
      return {
        success: false,
        remainingActiveCount: store.warnings.filter(w => w.discordUserId === params.discordUserId && w.active).length,
        message: 'Kaldırılacak aktif uyarı bulunamadı.'
      };
    }

    warning.active = false;
    warning.revokedAt = new Date();
    warning.revokedBy = params.revokedBy;
    warning.revokedReason = params.revokedReason;

    const remainingActive = store.warnings.filter(w => w.discordUserId === params.discordUserId && w.active).length;

    const member = store.members.find(m => m.discordUserId === params.discordUserId);
    if (member) {
      member.warningsCount = remainingActive;
      member.updatedAt = new Date();
    }

    store.addAuditLog({
      category: 'Disiplin',
      actionType: 'UYARI_KALDIRILDI',
      executorId: params.revokedBy,
      executorName: params.revokedBy,
      target: `<@${params.discordUserId}> (${warning.discordUsername})`,
      oldValue: `${remainingActive + 1}x Uyarı`,
      newValue: `${remainingActive}x Uyarı`,
      description: `Kaldırma Sebebi: ${params.revokedReason}`
    });

    store.notifyChange();

    // Rol senkronizasyonu
    if (params.guild) {
      await this.syncMemberWarningRoles(params.guild, params.discordUserId, remainingActive);
      await this.sendWarningRevocationLog(params.guild, warning, remainingActive, params.revokedBy, params.revokedReason);
    }

    return {
      success: true,
      remainingActiveCount: remainingActive,
      removedWarning: warning,
      message: `${warning.discordUsername} kullanıcısının uyarısı kaldırıldı. Kalan aktif uyarı: ${remainingActive}`
    };
  }

  /**
   * Bir kullanıcının tüm uyarı geçmişini getirir
   */
  public static getUserWarnings(discordUserId: string): IWarningRecord[] {
    return store.warnings.filter(w => w.discordUserId === discordUserId);
  }

  /**
   * #⚠️・uyarı-log kanalına bildirim gönderir
   */
  private static async sendWarningLogToChannel(guild: any, warning: IWarningRecord, count: number): Promise<void> {
    try {
      const channel = guild.channels.cache.find((c: any) =>
        c.name.includes('uyarı-log') || c.name.includes('uyari-log') || c.name.includes('ceza-log')
      );
      if (!channel || !channel.send) return;

      const badge = count === 1 ? '⚠️ 1x Uyarı' : count === 2 ? '⚠️⚠️ 2x Uyarı' : '🚫 3x Uyarı (Kritik)';
      const color = count === 1 ? 0xF1C40F : count === 2 ? 0xE67E22 : 0xED4245;

      const embed = {
        title: `⚖️ DİSİPLİN CEZA KAYDI: ${badge}`,
        description: `Sunucu disiplin kuralları gereğince birliğe kayıtlı kullanıcıya resmi uyarı cezası verilmiştir. Bu kayıt kalıcı olarak saklanır.`,
        color,
        fields: [
          { name: '👤 Uyarı Verilen Üye', value: `<@${warning.discordUserId}>\nAd: **${warning.discordUsername}**\nID: \`${warning.discordUserId}\``, inline: true },
          { name: '👮 İşlemi Yapan Yetkili', value: `<@${warning.executorId}>\nAd: **${warning.executorName}**`, inline: true },
          { name: '🔢 Uyarı Seviyesi', value: `**${count}x Uyarı** (${count}/3)`, inline: true },
          { name: '📋 Ceza Gerekçesi / Sebep', value: `>>> ${warning.reason}`, inline: false },
          ...(warning.proof ? [{ name: '🔗 Kanıt & Delil', value: warning.proof, inline: false }] : []),
          { name: '🕒 Tarih ve Saat', value: `<t:${Math.floor(new Date(warning.createdAt).getTime() / 1000)}:F> (<t:${Math.floor(new Date(warning.createdAt).getTime() / 1000)}:R>)`, inline: true },
          { name: '🏷️ Kayıt No', value: `\`${warning.id}\``, inline: true }
        ],
        footer: { text: "BLOOD'S Gang Disiplin & Yargı Karargahı • Otomatik Kayıt" },
        timestamp: new Date().toISOString()
      };

      await channel.send({ embeds: [embed] });
    } catch (e: any) {
      console.warn('[UYARI LOG GÖNDERME HATASI]', e?.message);
    }
  }

  /**
   * #⚠️・uyarı-log kanalına af / kaldırma bildirimi gönderir
   */
  private static async sendWarningRevocationLog(guild: any, warning: IWarningRecord, remaining: number, revokedBy: string, reason: string): Promise<void> {
    try {
      const channel = guild.channels.cache.find((c: any) =>
        c.name.includes('uyarı-log') || c.name.includes('uyari-log') || c.name.includes('ceza-log')
      );
      if (!channel || !channel.send) return;

      const embed = {
        title: `♻️ UYARI KALDIRILDI / AFFEDİLDİ`,
        description: `<@${warning.discordUserId}> (${warning.discordUsername}) kullanıcısının uyarısı yetkili tarafından kaldırılmıştır. Rol seviyesi güncellendi.`,
        color: 0x2ECC71,
        fields: [
          { name: '👤 Üye', value: `<@${warning.discordUserId}>`, inline: true },
          { name: '👮 Kaldıran Yetkili', value: revokedBy, inline: true },
          { name: '🔢 Kalan Aktif Uyarı', value: `**${remaining}x**`, inline: true },
          { name: '📝 Kaldırma Gerekçesi', value: reason, inline: false },
          { name: '🕒 İşlem Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        ],
        footer: { text: "BLOOD'S Gang Disiplin & Yargı Karargahı" },
        timestamp: new Date().toISOString()
      };

      await channel.send({ embeds: [embed] });
    } catch (e: any) {
      console.warn('[UYARI AF LOG HATASI]', e?.message);
    }
  }
}
