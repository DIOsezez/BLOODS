/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - DISCORD EMBED ÜRETECİ
 * 100% Türkçe ve Discord.js v14 Standardında
 */
import { EMBED_COLORS } from '../config/index.ts';

export interface IDiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  thumbnail?: { url: string };
  author?: { name: string; icon_url?: string };
}

export class EmbedBuilderUtil {
  public static createDefault(title: string, description: string, color: number = EMBED_COLORS.PRIMARY): IDiscordEmbed {
    return {
      title,
      description,
      color,
      fields: [],
      footer: { text: 'MTA:SA Illegal Birlik Yönetim Sistemi • 2026' },
      timestamp: new Date().toISOString()
    };
  }

  public static success(title: string, description: string): IDiscordEmbed {
    return this.createDefault(`✅ ${title}`, description, EMBED_COLORS.SUCCESS);
  }

  public static error(title: string, description: string): IDiscordEmbed {
    return this.createDefault(`❌ ${title}`, description, EMBED_COLORS.DANGER);
  }

  public static warning(title: string, description: string): IDiscordEmbed {
    return this.createDefault(`⚠️ ${title}`, description, EMBED_COLORS.WARNING);
  }

  public static unauthorized(actionName: string): IDiscordEmbed {
    return this.error(
      'Yetkisiz İşlem Denemesi',
      `Bu işlemi (**${actionName}**) gerçekleştirmek için gerekli rütbeye veya izne sahip değilsiniz.\n\nYetki eksikliği güvenlik denetim kayıtlarına (Audit Log) rapor edilmiştir.`
    );
  }

  /**
   * Ana Yönetim Paneli Embedi (/panel)
   */
  public static mainPanel(): IDiscordEmbed {
    return {
      title: '👑 MTA ILLEGAL BİRLİK — ANA KONTROL MERKEZİ',
      description:
        'Aşağıdaki menü ve butonları kullanarak birliğin bütün operasyonel, idari ve mali süreçlerini doğrudan Discord üzerinden yönetebilirsiniz.\n\n' +
        '⚡ **Hızlı İpucu:** Kategori seçmek için aşağıdaki seçim menüsünü (Select Menu) kullanın. İşlemler anında güncellenir ve veritabanına işlenir.',
      color: EMBED_COLORS.DARK,
      fields: [
        { name: '👥 İdari Yönetim', value: '• Birlik Bilgileri\n• Üye & Karakterler\n• Rütbe Hiyerarşisi\n• Yetkilendirme', inline: true },
        { name: '💰 Maliye & Depo', value: '• Kasa Bakiyesi\n• Gelir / Gider\n• Envanter & Stok\n• Araç Filosu', inline: true },
        { name: '⚔️ Operasyon & RP', value: '• Hood Bölgeleri\n• Görev & Devriye\n• Savaş Kayıtları\n• Diplomasi', inline: true },
        { name: '🛡️ Güvenlik & Sicil', value: '• Ceza & Sicil\n• İhbar & Şikayet\n• Kanıt Arşivi\n• İç Soruşturma', inline: true },
        { name: '📈 Gelişim & Destek', value: '• Başvurular\n• Recruiter Sistemi\n• Ticket Talepleri\n• Başarılar & XP', inline: true },
        { name: '⚙️ Sistem Durumu', value: '• İstatistikler\n• Güvenlik & Ayarlar\n• Yedekleme\n• Denetim Logları', inline: true }
      ],
      footer: { text: "BLOOD'S • MTA İllegal Birlik Yönetim Sistemi" },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * MTA karakter adını temiz Discord sunucu rumuzuna (Nickname) dönüştürür.
 * Örnekler:
 * "Dio_Draven" -> "Dio Draven"
 * "dio draven" -> "Dio Draven"
 * "DIO_DRAVEN" -> "Dio Draven"
 * "tony_montana" -> "Tony Montana"
 * Karakter sayısını Discord sınırı olan 32 karaktere sınırlar.
 */
export function formatIcNickname(rawName?: string | null): string {
  if (!rawName) return '';
  let clean = rawName.trim().replace(/_/g, ' ');
  clean = clean.replace(/\s+/g, ' ');
  if (clean === clean.toLowerCase() || clean === clean.toUpperCase()) {
    clean = clean
      .split(' ')
      .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
      .join(' ');
  }
  return clean.slice(0, 32).trim();
}
