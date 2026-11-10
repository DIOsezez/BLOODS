/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - RÜTBE VE HİYERARŞİ SERVİSİ
 * 7. Bölümdeki Kesin Hiyerarşi Kurallarını Uygular.
 */
import { store } from './store.ts';
import { IRank, RankLevel, IPromotionLog } from '../types/index.ts';

export class RankService {
  public static promotionLogs: IPromotionLog[] = [];

  public static getAll(): IRank[] {
    return [...store.ranks].sort((a, b) => b.level - a.level);
  }

  public static getByLevel(level: RankLevel): IRank | undefined {
    return store.ranks.find(r => r.level === level);
  }

  public static getById(id: string): IRank | undefined {
    return store.ranks.find(r => r.id === id);
  }

  /**
   * Terfi İşlemi (Promote)
   * Kurallar:
   * 1. Kendi kendine terfi yapılamaz.
   * 2. Yetkili, hedef üyenin rütbesinden yüksek olmalıdır.
   * 3. Hedef, yetkilinin kendi rütbe seviyesine veya üstüne çıkarılamaz (Sadece OG, Under OG yapabilir).
   * 4. En yüksek seviye 5 (OG)'dir.
   */
  public static promoteMember(params: {
    targetMemberId: string;
    executorDiscordId: string;
    reason: string;
  }): { success: boolean; message: string; newRank?: IRank } {
    const target = store.members.find(m => m.id === params.targetMemberId);
    if (!target) return { success: false, message: 'Hedef üye bulunamadı!' };

    const executor = store.members.find(m => m.discordUserId === params.executorDiscordId);
    if (!executor) return { success: false, message: 'İşlemi yapan yetkili üye kaydı bulunamadı!' };

    // 1. Kendi kendine terfi engeli
    if (target.discordUserId === executor.discordUserId) {
      return { success: false, message: 'Güvenlik Kuralı: Kendi kendinizi terfi ettiremezsiniz!' };
    }

    // 2. Yetki seviyesi kontrolü
    if (executor.rankLevel <= target.rankLevel && executor.rankLevel !== RankLevel.OG) {
      return {
        success: false,
        message: `Yetkisiz İşlem: Sizinle aynı veya daha üst rütbedeki bir üyeyi terfi ettiremezsiniz! (Sizin: Seviye ${executor.rankLevel}, Hedef: Seviye ${target.rankLevel})`
      };
    }

    if (target.rankLevel >= RankLevel.OG) {
      return { success: false, message: 'Hedef üye zaten en yüksek rütbede (OG) bulunmaktadır!' };
    }

    const nextLevel = (target.rankLevel + 1) as RankLevel;

    // Hedef, işlem yapanın seviyesine eşitlenemez (OG hariç)
    if (executor.rankLevel !== RankLevel.OG && nextLevel >= executor.rankLevel) {
      return {
        success: false,
        message: `Yetki Sınırı: Bir üyeyi kendi rütbe seviyenize (${executor.rankName}) veya üstüne terfi ettiremezsiniz!`
      };
    }

    const newRank = this.getByLevel(nextLevel);
    if (!newRank) return { success: false, message: 'Bir üst rütbe tanımı sistemde bulunamadı!' };

    const oldRankName = target.rankName;
    const oldRankLevel = target.rankLevel;

    target.rankId = newRank.id;
    target.rankLevel = newRank.level;
    target.rankName = newRank.name;
    target.updatedAt = new Date();

    const promoLog: IPromotionLog = {
      id: `prm-${Date.now()}`,
      memberId: target.id,
      memberName: `${target.discordUsername} (${target.currentMtaName})`,
      oldRank: oldRankName,
      oldRankLevel,
      newRank: newRank.name,
      newRankLevel: newRank.level,
      reason: params.reason,
      executorId: executor.id,
      executorName: `${executor.discordUsername} (${executor.rankName})`,
      date: new Date()
    };
    this.promotionLogs.unshift(promoLog);

    store.addAuditLog({
      category: 'Rütbe',
      actionType: 'TERFİ_EDİLDİ',
      executorId: executor.discordUserId,
      executorName: executor.discordUsername,
      target: target.discordUsername,
      oldValue: `${oldRankName} (Sv.${oldRankLevel})`,
      newValue: `${newRank.name} (Sv.${newRank.level})`,
      description: `Terfi Sebebi: ${params.reason}`
    });

    return {
      success: true,
      message: `${target.discordUsername} başarıyla '${newRank.name}' rütbesine terfi ettirildi!`,
      newRank
    };
  }

  /**
   * Tenzil İşlemi (Demote)
   * Kurallar:
   * 1. Kendi kendine tenzil yapılamaz.
   * 2. Yetkili, hedef üyeden kesinlikle üst rütbede olmalıdır.
   * 3. Seviye 1 (Üye)'den aşağı indirilemez.
   */
  public static demoteMember(params: {
    targetMemberId: string;
    executorDiscordId: string;
    reason: string;
  }): { success: boolean; message: string; newRank?: IRank } {
    const target = store.members.find(m => m.id === params.targetMemberId);
    if (!target) return { success: false, message: 'Hedef üye bulunamadı!' };

    const executor = store.members.find(m => m.discordUserId === params.executorDiscordId);
    if (!executor) return { success: false, message: 'İşlemi yapan yetkili üye kaydı bulunamadı!' };

    if (target.discordUserId === executor.discordUserId) {
      return { success: false, message: 'Güvenlik Kuralı: Kendi rütbenizi düşüremezsiniz!' };
    }

    if (executor.rankLevel <= target.rankLevel && executor.rankLevel !== RankLevel.OG) {
      return {
        success: false,
        message: 'Yetkisiz İşlem: Sizinle aynı veya daha üst rütbedeki bir üyeyi tenzil edemezsiniz!'
      };
    }

    if (target.rankLevel <= RankLevel.UYE) {
      return { success: false, message: 'Hedef üye zaten başlangıç rütbesinde (Üye) bulunmaktadır!' };
    }

    const prevLevel = (target.rankLevel - 1) as RankLevel;
    const newRank = this.getByLevel(prevLevel);
    if (!newRank) return { success: false, message: 'Bir alt rütbe tanımı sistemde bulunamadı!' };

    const oldRankName = target.rankName;
    const oldRankLevel = target.rankLevel;

    target.rankId = newRank.id;
    target.rankLevel = newRank.level;
    target.rankName = newRank.name;
    target.updatedAt = new Date();

    const promoLog: IPromotionLog = {
      id: `prm-${Date.now()}`,
      memberId: target.id,
      memberName: `${target.discordUsername} (${target.currentMtaName})`,
      oldRank: oldRankName,
      oldRankLevel,
      newRank: newRank.name,
      newRankLevel: newRank.level,
      reason: params.reason,
      executorId: executor.id,
      executorName: `${executor.discordUsername} (${executor.rankName})`,
      date: new Date()
    };
    this.promotionLogs.unshift(promoLog);

    store.addAuditLog({
      category: 'Rütbe',
      actionType: 'TENZİL_EDİLDİ',
      executorId: executor.discordUserId,
      executorName: executor.discordUsername,
      target: target.discordUsername,
      oldValue: `${oldRankName} (Sv.${oldRankLevel})`,
      newValue: `${newRank.name} (Sv.${newRank.level})`,
      description: `Rütbe Düşürme Sebebi: ${params.reason}`
    });

    return {
      success: true,
      message: `${target.discordUsername} rütbesi '${newRank.name}' seviyesine düşürüldü.`,
      newRank
    };
  }

  /**
   * 5. Madde: Rütbe Bilgilendirme Embed Dizisini Oluşturur
   * Sıralama: OG (5) -> Under OG (4) -> Recruiter (3) -> Kıdemli Üye (2) -> Üye (1)
   */
  public static buildRankGuideEmbeds(): any[] {
    const embeds: any[] = [];

    // Başlık Embed'i
    embeds.push({
      title: "👑 BLOOD'S GANG • RÜTBE VE HİYERARŞİ BİLGİLENDİRMESİ",
      description:
        `Bu kanal tüm birlik üyelerine açık olup bilgilendirme amaçlıdır. ` +
        `Birliğimiz katı bir hiyerarşi ve saygı zinciriyle yönetilmektedir. ` +
        `Aşağıda çetemizin 5 ana rütbesinin anlamı, görevleri, sorumlulukları, yetki sınırları ve konumu açıklanmıştır.\n\n` +
        `**Kesin Rütbe Sıralaması:**\n` +
        `1. 👑 **OG** (Seviye 5)\n` +
        `2. ⭐ **Under OG (BG)** (Seviye 4)\n` +
        `3. 🎯 **Recruiter — Çeteye Adam Çeker** (Seviye 3)\n` +
        `4. 🔥 **Kıdemli Üye** (Seviye 2)\n` +
        `5. 🩸 **Üye** (Seviye 1)`,
      color: 0xED4245,
      fields: [
        { name: '⚖️ Hiyerarşi Kuralı', value: 'Hiçbir üye üst rütbesinin emrini sorgulayamaz; şikayetler gizli ihbar kutusu veya OG üzerinden yürütülür.', inline: false },
        { name: '📈 Terfi Kriterleri', value: 'Sokak aktifliği, operasyon başarısı, hood sadakati ve kasaya katkı göz önünde bulundurularak OG kararıyla terfi verilir.', inline: false }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi • Sayfa 1" },
      timestamp: new Date().toISOString()
    });

    // 1. OG (Seviye 5)
    embeds.push({
      title: '1. 👑 OG (ORIGINAL GANGSTER) — SEVİYE 5',
      color: 0xED4245,
      fields: [
        { name: '📖 Rütbenin Anlamı', value: 'Çetenin kurucusu, mutlak lideri ve nihai karar mercidir. Yeraltındaki en yüksek otoriteyi temsil eder.', inline: false },
        { name: '🎯 Temel Görevleri', value: '• Birliğin stratejik vizyonunu ve rotasını belirlemek.\n• Çete savaşları ve barış antlaşmalarına son noktayı koymak.\n• Birlik kasasını ve büyük mühimmat sevkiyatlarını yönetmek.\n• Birlikten ihraç ve CK (Character Kill) infaz kararlarını onaylamak.', inline: false },
        { name: '🛡️ Sorumlulukları', value: 'Birliğin sokaktaki saygınlığını korumak, üyelerinin can ve mal güvenliğini sağlamak, hiyerarşiyi tavizsiz işletmek.', inline: false },
        { name: '⚡ Yetki Sınırları', value: 'Sınırsız / Mutlak Yetki. Bütün kanallara, rollere, kasaya ve üyelere tek başına müdahale hakkı vardır.', inline: false },
        { name: '📍 Birlik İçerisindeki Konumu', value: 'ZİRVE (Lider / High Command)', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi" }
    });

    // 2. Under OG (BG) (Seviye 4)
    embeds.push({
      title: '2. ⭐ UNDER OG (BABY GANGSTER) — SEVİYE 4',
      color: 0xE67E22,
      fields: [
        { name: '📖 Rütbenin Anlamı', value: "OG'nin sağ kolu, genel koordinatör ve saha yöneticisidir. OG olmadığı anlarda birliğin tüm idaresini üstlenir.", inline: false },
        { name: '🎯 Temel Görevleri', value: '• Saha operasyonlarını ve baskın planlarını hazırlamak.\n• Recruiter, Kıdemli Üye ve Üyelerin disiplinini denetlemek.\n• Kasa para giriş-çıkışlarını denetlemek ve depoyu kontrol altında tutmak.\n• Disiplin soruşturmalarını yürütmek ve OG\'ye rapor sunmak.', inline: false },
        { name: '🛡️ Sorumlulukları', value: 'Günlük operasyonların aksamamasını sağlamak, üyeler arasındaki anlaşmazlıkları çözmek ve savunma hattını diri tutmak.', inline: false },
        { name: '⚡ Yetki Sınırları', value: 'Liderlik Yetkisi. OG haricindeki tüm rütbelere doğrudan emir verebilir, ceza ve tenzil tavsiyesinde bulunabilir.', inline: false },
        { name: '📍 Birlik İçerisindeki Konumu', value: '2. KADEME (Genel Yönetim / İkinci Lider)', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi" }
    });

    // 3. Recruiter (Seviye 3)
    embeds.push({
      title: '3. 🎯 RECRUITER (ÇETEYE ADAM ÇEKER) — SEVİYE 3',
      color: 0x9B59B6,
      fields: [
        { name: '📖 Rütbenin Anlamı', value: 'İşe alım sorumlusu, yetenek avcısı ve yeni nesil çete üyelerinin yetiştiricisidir.', inline: false },
        { name: '🎯 Temel Görevleri', value: '• MTA sunucusunda kaliteli roleplay yapan oyuncuları tespit etmek ve çeteye davet etmek.\n• Başvuru yapan adayların formlarını incelemek ve puanlamak.\n• Adaylara mülakat yaparak birlik kurallarını ve rollerini aktarmak.\n• Yeni gelenlere geçici Aday rolünü tanımlamak.', inline: false },
        { name: '🛡️ Sorumlulukları', value: 'Birliğe köstebek, güvenilmez veya roleplay kurallarını ihlal eden kişileri sokmamak; aday kalitesini daima yüksek tutmak.', inline: false },
        { name: '⚡ Yetki Sınırları', value: 'Aday davet etme, başvuru paneli yönetimi, recruiter kulübü ve aday iletişim odalarına tam erişim.', inline: false },
        { name: '📍 Birlik İçerisindeki Konumu', value: '3. KADEME (İdari İşe Alım Birimi)', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi" }
    });

    // 4. Kıdemli Üye (Seviye 2)
    embeds.push({
      title: '4. 🔥 KIDEMLİ ÜYE (VETERAN GANGSTER) — SEVİYE 2',
      color: 0x3498DB,
      fields: [
        { name: '📖 Rütbenin Anlamı', value: 'Sokaklarda rüştünü ispatlamış, çatışmalarda sadakatini ve cesaretini göstermiş deneyimli çete savaşçısıdır.', inline: false },
        { name: '🎯 Temel Görevleri', value: '• Çatışmalarda ve operasyonlarda hücum timlerine öncülük etmek.\n• Yeni üyelere sokak raconunu ve silah kullanımını öğretmek.\n• Hood güvenliğini sağlamak ve devriyelere komuta etmek.\n• İstihbarat toplayarak yönetime raporlamak.', inline: false },
        { name: '🛡️ Sorumlulukları', value: 'Operasyonlarda panik yapmamak, genç üyeleri korumak ve birliğin saha disiplinini ayakta tutmak.', inline: false },
        { name: '⚡ Yetki Sınırları', value: 'Saha inisiyatifi, kurmay sohbet odasına erişim, tim telsizlerini yönlendirme.', inline: false },
        { name: '📍 Birlik İçerisindeki Konumu', value: '4. KADEME (Saha Omurgası / Veteran)', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi" }
    });

    // 5. Üye (Seviye 1)
    embeds.push({
      title: '5. 🩸 ÜYE (SOLDADO / ASİL ÜYE) — SEVİYE 1',
      color: 0x2ECC71,
      fields: [
        { name: '📖 Rütbenin Anlamı', value: 'Adaylık ve deneme sürecini başarıyla geçerek kan yemini etmiş birliğin resmi ve asil üyesidir.', inline: false },
        { name: '🎯 Temel Görevleri', value: '• Hood bölgesini korumak ve nöbet tutmak.\n• Üst rütbelerin verdiği emir ve görevleri eksiksiz yerine getirmek.\n• Operasyonlara tam teçhizatla katılmak.\n• Kasaya düzenli gelir sağlamak.', inline: false },
        { name: '🛡️ Sorumlulukları', value: 'Yeraltı yasalarına uymak, birliğin sırlarını kimseyle paylaşmamak ve çete renklerini gururla taşımak.', inline: false },
        { name: '⚡ Yetki Sınırları', value: 'Birlik içi özel kanallara erişim, depodan silah ve teçhizat talep edebilme hakkı.', inline: false },
        { name: '📍 Birlik İçerisindeki Konumu', value: '5. KADEME (Çekirdek Güç / Temel Rütbe)', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Hiyerarşi Rehberi" }
    });

    return embeds;
  }

  /**
   * Rütbe bilgilendirme mesajlarını #👑・rütbe-bilgilendirme kanalına yayınlar
   */
  public static async publishRankGuide(guild: any): Promise<{
    success: boolean;
    channelId?: string;
    message: string;
  }> {
    if (!guild) return { success: false, message: 'Sunucu bulunamadı.' };

    const rankChannel = guild.channels.cache.find((c: any) =>
      c.name.includes('rütbe-bilgilendirme') || c.name.includes('rutbe-bilgi')
    );

    if (!rankChannel || !rankChannel.send) {
      return { success: false, message: '#👑・rütbe-bilgilendirme kanalı bulunamadı.' };
    }

    const embeds = this.buildRankGuideEmbeds();

    try {
      // Eski mesajları temizle
      const fetched = await rankChannel.messages.fetch({ limit: 15 }).catch(() => null);
      if (fetched) {
        for (const [, msg] of fetched) {
          if (msg.author.id === guild.client?.user?.id) {
            await msg.delete().catch(() => {});
          }
        }
      }

      for (const emb of embeds) {
        await rankChannel.send({ embeds: [emb] });
      }

      return {
        success: true,
        channelId: rankChannel.id,
        message: 'Rütbe bilgilendirme mesajı başarıyla yayınlandı.'
      };
    } catch (e: any) {
      console.error('[RÜTBE REHBERİ YAYINLAMA HATASI]', e);
      return { success: false, message: e?.message || String(e) };
    }
  }
}
