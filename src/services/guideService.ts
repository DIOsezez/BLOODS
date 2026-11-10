/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - DİNAMİK KANAL VE REHBER SERVİSİ
 * Sunucudaki tüm kategori ve kanalları tarar, amaçlarını açıklar ve #🗺️・kanal-rehberi'nde yayınlar.
 */

export interface IChannelDescription {
  purpose: string;
  badge?: string;
}

export class GuideService {
  /**
   * Kanal isimlerinden veya id'lerinden otomatik kullanım amacı tespit eder
   */
  public static getChannelDescription(name: string, isVoice: boolean): string {
    const n = name.toLowerCase();

    // Özel Tanımlar
    if (n.includes('kanal-rehberi') || n.includes('rehber')) return 'Sunucudaki tüm kanalların kullanım amaçlarını ve rehberini gösteren harita.';
    if (n.includes('rütbe-bilgilendirme') || n.includes('rutbe-bilgi')) return 'Birlik hiyerarşisi (OG, Under OG, Recruiter, Kıdemli Üye, Üye) görev ve yetki sınırları.';
    if (n.includes('uyarı-log') || n.includes('uyari-log')) return 'Üyelere verilen 1x, 2x, 3x uyarı ve disiplin cezalarının değiştirilemez resmi kayıt kanalı.';
    if (n.includes('inaktiflik-bildir')) return 'Üyelerin mazeret ve inaktiflik izni bildirim paneli (Butona basarak form açılır).';
    if (n.includes('inaktiflik-yonetim')) return 'Liderlik heyetinin inaktiflik taleplerini inceleyip onayladığı yönetim kanalı.';
    if (n.includes('birlik-manifesto') || n.includes('manifesto')) return 'Birliğin kuruluş felsefesi, yeraltı geçmişi ve temel ilkeleri.';
    if (n.includes('resmi-tebliğler') || n.includes('duyuru')) return 'Yönetim tarafından birlik geneline duyurulan resmi emirler ve gelişmeler.';
    if (n.includes('yeraltı-yasaları') || n.includes('kurallar')) return 'Sunucu ve çete içerisinde çiğnenmesi yasak olan kırmızı çizgiler ve yaptırımlar.';
    if (n.includes('genel-sohbet')) return 'Birlik üyelerinin günlük yazışma alanı (Medya engeli mevcuttur).';
    if (n.includes('muhabbet-odası') || n.includes('muhabbet')) return 'Serbest sohbet ve günlük diyalog alanı.';
    if (n.includes('medya-galerisi') || n.includes('fotoğraf')) return 'Ekran görüntüleri, RP anları ve fotoğraf paylaşımları.';
    if (n.includes('çete-klipleri') || n.includes('aksiyon-klipleri')) return 'MTA çatışma anları ve operasyon video kayıtları.';
    if (n.includes('mizah-makara')) return 'Eğlence, mizah ve caps paylaşımları.';
    if (n.includes('oyun-lobisi')) return 'Farklı oyunlar ve lobi sohbetleri.';
    if (n.includes('üye-künyesi') || n.includes('üye-listesi')) return 'Birliğe kayıtlı üyelerin rütbeleri, IC isimleri ve sicil künyeleri.';
    if (n.includes('birlik-sohbet') || n.includes('birlik-muhabbet')) return 'Yalnızca asil çete üyelerine açık operasyonel gizli sohbet.';
    if (n.includes('birlik-medya')) return 'Birliğin iç operasyonlarına ait fotoğraf ve video arşivleri.';
    if (n.includes('etkinlik-buluşma')) return 'Birlik içi ödüllü etkinlikler ve buluşma planlamaları.';
    if (n.includes('toplantı-çağrısı') || n.includes('toplanti-cagrisi')) return 'Toplantı gün ve saat bildirimlerinin yayınlandığı resmi kanal.';
    if (n.includes('toplantı-gündemi')) return 'Toplantıda masaya yatırılacak maddelerin listesi.';
    if (n.includes('toplantı-notları')) return 'Toplantı esnasında tutulan zabıt ve karalama notları.';
    if (n.includes('alınan-kararlar')) return 'Toplantı neticesinde yürürlüğe giren resmi kararlar.';
    if (n.includes('toplantı-arşivi')) return 'Eski toplantı tutanakları ve arşiv belgeleri.';
    if (n.includes('yönetim-odası') || n.includes('yonetim-odasi')) return 'OG ve Under OG liderlik kadrosunun çalışma alanı.';
    if (n.includes('strateji-masası')) return 'Yeraltı pazar payı, sevkiyat ve saldırı stratejileri.';
    if (n.includes('yönetim-emirleri')) return 'Yüksek liderlik tarafından personele tebliğ edilen direktifler.';
    if (n.includes('kriptolu-arşiv') || n.includes('arşiv')) return 'Gizli anlaşmalar, köstebek dosyaları ve kilitli evraklar.';
    if (n.includes('tim-sohbeti') || n.includes('ekip-sohbet')) return 'Saha timlerinin koordinasyon ve hazırlık alanı.';
    if (n.includes('hücum-ekibi') || n.includes('hucum')) return 'Sıcak temas ve taarruz birimlerinin taktik kanalı.';
    if (n.includes('recruiter-kulübü')) return 'Recruiter kadrosunun aday takibi ve transfer planları.';
    if (n.includes('kurmay-sohbet')) return 'Kıdemli üyelerin yönetimle ortak istişare alanı.';
    if (n.includes('katılım-başvuru')) return 'Çeteye katılmak isteyen adayların başvuru formunu doldurduğu panel.';
    if (n.includes('operasyon-paneli')) return 'RP görevleri, devriye ve çatışma operasyonlarına katılım paneli.';
    if (n.includes('recruiter-paneli')) return 'Yeni adayları çeteye davet etme ve işe alım kontrol paneli.';
    if (n.includes('kara-kasa')) return 'Birlik ortak sanal kasası bakiye, para yatırma ve çekme paneli.';
    if (n.includes('kaçak-depo')) return 'Silah, mühimmat, zırh ve teçhizat ortak envanter deposu.';
    if (n.includes('birlik-garajı')) return 'Birlik araç filosu ve üyelere araç zimmetleme paneli.';
    if (n.includes('çete-istatistik')) return 'Birliğin üye, kasa ve operasyon grafiklerini gösteren panel.';
    if (n.includes('merkez-yönetim')) return 'Disiplin, izin ve sistem genel yönetim paneli.';
    if (n.includes('başvuru-inceleme')) return 'Gelen aday başvurularının puanlanıp karara bağlandığı yönetim odası.';
    if (n.includes('iç-soruşturma')) return 'Birlik içi ihlal, köstebeklik ve şüpheli durum tahkikatları.';
    if (n.includes('kara-liste-sicil')) return 'CK infazları, ihraç edilenler ve resmi ceza sicil kütüğü.';
    if (n.includes('gizli-ihbar-kutusu')) return 'Üyelerin anonim olarak şikayet ve ihbar ilettiği güvenli kutu.';
    if (n.includes('delil-kasası')) return 'Çatışma, baskın ve diplomasi olaylarına dair delil arşivi.';
    if (n.includes('diplomatik-durum')) return 'Diğer illegal birlik ve ailelerle dost/düşman ilişkileri.';
    if (n.includes('savaş-kayıtları')) return 'Çete savaşları, skorlar ve tarafsız hakem tutanakları.';
    if (n.includes('hood-hakimiyeti')) return 'Los Santos sokakları ve hood kontrol haritası.';
    if (n.includes('operasyon-raporu')) return 'Saha timlerinin çatışma sonrası sunduğu resmi raporlar.';
    if (n.includes('kasa-log')) return 'Kasaya giren-çıkan tüm finansal hareketlerin otomatik log kaydı.';
    if (n.includes('üye-log')) return 'Üye alımları, terfiler, tenziller ve ayrılış logları.';
    if (n.includes('ceza-log')) return 'Verilen uyarı ve yaptırımların sistem denetim logu.';
    if (n.includes('görev-log')) return 'Görev başlama, tamamlama ve XP kazanım logları.';
    if (n.includes('sistem-log')) return 'Bot komutları, güvenlik audit ve yetki değişim kayıtları.';

    // Ses Kanalları
    if (isVoice) {
      if (n.includes('brifing salonu') || n.includes('brifing')) return 'Genel birlik sesli toplanma ve brifing odası.';
      if (n.includes('yönetim brifingi') || n.includes('yonetim brifingi')) return 'Liderlik ve idari kadro sesli değerlendirme odası.';
      if (n.includes('özel toplantı') || n.includes('ozel toplanti')) return 'Birebir görüşmeler ve gizli istişare odası.';
      if (n.includes('yönetim karargahı') || n.includes('karargah')) return 'Yönetim heyeti sesli toplantı odası.';
      if (n.includes('vip') || n.includes('high command')) return 'OG ve Under OG yüksek komuta VIP sesli odası.';
      if (n.includes('tim telsizi') || n.includes('telsiz #1')) return 'Tim 1 taktiksel operasyon ve çatışma telsizi.';
      if (n.includes('operasyon telsizi') || n.includes('telsiz #2')) return 'Tim 2 saha koordinasyon telsizi.';
      if (n.includes('recruiter')) return 'Aday mülakat ve işe alım sesli görüşme odası.';
      return 'Sesli iletişim ve koordinasyon odası.';
    }

    return 'Birlik faaliyetleri için tahsis edilmiş özel kanal.';
  }

  /**
   * Discord guild'indeki tüm kategorileri ve alt kanallarını tarayarak rehber embed dizisi oluşturur
   */
  public static async buildGuildGuideEmbeds(guild: any): Promise<any[]> {
    if (!guild || !guild.channels) return [];

    await guild.channels.fetch().catch(() => {});

    // Kanalları kategorilerine göre grupla
    const categories: any[] = [];
    const orphanChannels: any[] = [];

    // Önce kategorileri topla
    for (const [, ch] of guild.channels.cache) {
      if (ch.type === 4 || ch.type === 'GuildCategory') {
        categories.push(ch);
      }
    }

    // Kategorileri pozisyona göre sırala
    categories.sort((a, b) => a.position - b.position);

    const guideEmbeds: any[] = [];

    // Başlık Embed'i
    guideEmbeds.push({
      title: "🗺️ BLOOD'S GANG • KANAL REHBERİ VE YÖNLENDİRME HARİTASI",
      description:
        `Sayın Birlik Üyeleri ve Adaylar,\n\n` +
        `Sunucumuzda çok sayıda departman, operasyon birimi ve yönetim kanalı bulunmaktadır. ` +
        `Aradığınız kanalı hızlıca bulabilmeniz ve doğru kanalı doğru amaçla kullanabilmeniz için ` +
        `aşağıdaki interaktif rehber hazırlanmıştır.\n\n` +
        `Kanallara tıklayarak doğrudan ilgili alana geçiş yapabilirsiniz.`,
      color: 0xED4245,
      fields: [
        { name: '📌 Nasıl Kullanılır?', value: 'Aşağıda listelenen kanal bağlantılarına tıklayarak doğrudan o kanala ışınlanabilirsiniz.', inline: true },
        { name: '🔄 Dinamik Güncelleme', value: 'Yeni kanal eklendiğinde rehber otomatik olarak güncellenir.', inline: true }
      ],
      footer: { text: "BLOOD'S Gang Sunucu Yönlendirme Sistemi • Sayfa 1" },
      timestamp: new Date().toISOString()
    });

    // Her kategori için alt kanalları listele
    let currentFields: any[] = [];
    let currentDesc = '';

    for (const cat of categories) {
      // Bu kategorinin altındaki kanalları bul
      const childChannels = guild.channels.cache
        .filter((c: any) => c.parentId === cat.id)
        .sort((a: any, b: any) => a.position - b.position);

      if (childChannels.size === 0) continue;

      let catText = '';
      for (const [, ch] of childChannels) {
        const isVoice = ch.type === 2 || ch.type === 'GuildVoice';
        const icon = isVoice ? '🔊' : '💬';
        const desc = this.getChannelDescription(ch.name, isVoice);
        catText += `• <#${ch.id}> ${icon} — ${desc}\n`;
      }

      // Embed field uzunluğu 1024 karakteri geçmemeli
      if (catText.length > 1024) {
        catText = catText.substring(0, 1020) + '...';
      }

      currentFields.push({
        name: `📂 ${cat.name.toUpperCase()}`,
        value: catText || 'Kanal bulunmuyor.',
        inline: false
      });

      // 4 kategoriye ulaşıldığında yeni bir embed'e böl
      if (currentFields.length >= 4) {
        guideEmbeds.push({
          title: '🗺️ KANAL LİSTESİ VE KULLANIM AMAÇLARI',
          color: 0x3498DB,
          fields: currentFields,
          footer: { text: `BLOOD'S Gang Kanal Rehberi • Sayfa ${guideEmbeds.length + 1}` },
          timestamp: new Date().toISOString()
        });
        currentFields = [];
      }
    }

    if (currentFields.length > 0) {
      guideEmbeds.push({
        title: '🗺️ KANAL LİSTESİ VE KULLANIM AMAÇLARI (DEVAMI)',
        color: 0x3498DB,
        fields: currentFields,
        footer: { text: `BLOOD'S Gang Kanal Rehberi • Sayfa ${guideEmbeds.length + 1}` },
        timestamp: new Date().toISOString()
      });
    }

    return guideEmbeds;
  }

  /**
   * Rehberi #🗺️・kanal-rehberi kanalına yayınlar veya günceller
   */
  public static async publishOrUpdateGuide(guild: any): Promise<{
    success: boolean;
    channelId?: string;
    message: string;
  }> {
    if (!guild) return { success: false, message: 'Sunucu bulunamadı.' };

    const guideChannel = guild.channels.cache.find((c: any) =>
      c.name.includes('kanal-rehberi') || c.name.includes('rehber')
    );

    if (!guideChannel || !guideChannel.send) {
      return { success: false, message: '#🗺️・kanal-rehberi kanalı bulunamadı.' };
    }

    const embeds = await this.buildGuildGuideEmbeds(guild);
    if (embeds.length === 0) {
      return { success: false, message: 'Rehber embedleri oluşturulamadı.' };
    }

    const refreshButtonRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 1, // PRIMARY
          custom_id: 'btn_guide_refresh',
          label: 'Rehberi Yenile / Güncelle',
          emoji: { name: '🔄' }
        }
      ]
    };

    try {
      // Eski bot mesajlarını temizle ve güncelini gönder
      const fetched = await guideChannel.messages.fetch({ limit: 15 }).catch(() => null);
      if (fetched) {
        for (const [, msg] of fetched) {
          if (msg.author.id === guild.client?.user?.id) {
            await msg.delete().catch(() => {});
          }
        }
      }

      // Son embed'e butonu ekle
      for (let i = 0; i < embeds.length; i++) {
        const isLast = i === embeds.length - 1;
        await guideChannel.send({
          embeds: [embeds[i]],
          components: isLast ? [refreshButtonRow] : []
        });
      }

      return {
        success: true,
        channelId: guideChannel.id,
        message: 'Kanal rehberi başarıyla güncellendi ve yayınlandı.'
      };
    } catch (err: any) {
      console.error('[REHBER YAYINLAMA HATASI]', err);
      return { success: false, message: err?.message || String(err) };
    }
  }
}
