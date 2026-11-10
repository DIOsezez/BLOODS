/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - GÜVENLİK VE YETKİ KONTROL ARA KATMANI
 */
import { store } from '../services/store.ts';
import { RankLevel } from '../types/index.ts';
import { SUPER_ADMIN_IDS } from '../config/index.ts';

export class AuthMiddleware {
  /**
   * Kullanıcının belirtilen yetkiye sahip olup olmadığını denetler.
   * OG (Seviye 5) ve Super Adminler her zaman tüm yetkilere sahiptir.
   */
  public static hasPermission(discordUserId: string, requiredPermission: string): {
    allowed: boolean;
    reason?: string;
    memberRankName?: string;
  } {
    // 728894195359547433 ve belirlenen Süper Adminler mutlak yetkilidir
    if (SUPER_ADMIN_IDS.includes(discordUserId)) {
      return { allowed: true, memberRankName: 'OG (Kurucu/Admin)' };
    }

    const member = store.members.find(m => m.discordUserId === discordUserId);
    if (!member) {
      return {
        allowed: false,
        reason: 'Bu komutu kullanabilmek için birlik üyesi olarak kayıtlı olmanız gerekmektedir.'
      };
    }

    // OG rütbesi mutlak yetkilidir
    if (member.rankLevel === RankLevel.OG) {
      return { allowed: true, memberRankName: member.rankName };
    }

    const rank = store.ranks.find(r => r.id === member.rankId || r.level === member.rankLevel);
    if (!rank) {
      return { allowed: false, reason: 'Üyenin rütbe tanımı sistemde bulunamadı.' };
    }

    if (rank.permissions.includes(requiredPermission)) {
      return { allowed: true, memberRankName: rank.name };
    }

    return {
      allowed: false,
      reason: `Bu eylemi gerçekleştirmek için '${requiredPermission}' yetkisine sahip olmalısınız. (Mevcut Rütbeniz: ${rank.name})`,
      memberRankName: rank.name
    };
  }

  /**
   * Hiyerarşik Seviye Kontrolü
   */
  public static isHigherRank(executorDiscordId: string, targetDiscordId: string): boolean {
    if (SUPER_ADMIN_IDS.includes(executorDiscordId)) return true;

    const executor = store.members.find(m => m.discordUserId === executorDiscordId);
    const target = store.members.find(m => m.discordUserId === targetDiscordId);

    if (!executor || !target) return false;
    if (executor.rankLevel === RankLevel.OG) return true;

    return executor.rankLevel > target.rankLevel;
  }
}

// Basit Hız Sınırlayıcı (Rate Limiter)
export class RateLimiter {
  private static userLastAction = new Map<string, number>();

  public static isRateLimited(userId: string, cooldownMs = 1500): boolean {
    const now = Date.now();
    const last = this.userLastAction.get(userId) || 0;
    if (now - last < cooldownMs) {
      return true;
    }
    this.userLastAction.set(userId, now);
    return false;
  }
}
