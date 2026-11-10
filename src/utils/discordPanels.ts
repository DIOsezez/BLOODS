/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - 25 KATEGORİLİ DISCORD PANEL TANIMLARI
 */
import { store } from '../services/store.ts';
import { StatsService } from '../services/gangOperationsService.ts';
import { IDiscordEmbed } from './embeds.ts';
import { EMBED_COLORS } from '../config/index.ts';

export interface IPanelButton {
  customId: string;
  label: string;
  style: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
  emoji?: string;
  disabled?: boolean;
}

export interface IPanelDefinition {
  id: string;
  name: string;
  categoryNumber: number;
  embed: IDiscordEmbed;
  buttons: IPanelButton[];
}

export class DiscordPanelRegistry {
  public static getPanel(categoryId: string): IPanelDefinition {
    switch (categoryId) {
      case 'birlik':
      case '1':
        return {
          id: 'birlik',
          name: '1. Birlik Yönetimi',
          categoryNumber: 1,
          embed: {
            title: '🏢 BİRLİK GENEL YÖNETİMİ',
            description:
              `**Birlik Adı:** ${store.gangInfo.name} [${store.gangInfo.tag}]\n` +
              `**Birlik Lideri (OG):** ${store.gangInfo.leaderName}\n` +
              `**Durum:** 🟢 ${store.gangInfo.status}\n` +
              `**Kuruluş:** ${new Date(store.gangInfo.foundedDate).toLocaleDateString('tr-TR')}\n` +
              `**Açıklama:** ${store.gangInfo.description}\n\n` +
              `📜 **Geçmiş & Tarihçe:**\n${store.gangInfo.historyNotes}`,
            color: EMBED_COLORS.PRIMARY,
            fields: [
              { name: 'Aktif Üye', value: `${store.members.filter(m => m.status === 'Aktif').length} Kişi`, inline: true },
              { name: 'Toplam Kayıtlı', value: `${store.members.length} Kişi`, inline: true },
              { name: 'Yönetim Kadrosu', value: 'OG, Under OG', inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_gang_edit_desc', label: 'Açıklamayı Düzenle', style: 'PRIMARY', emoji: '📝' },
            { customId: 'btn_gang_edit_tag', label: 'Etiket / İsim Değiştir', style: 'SECONDARY', emoji: '🏷️' },
            { customId: 'btn_gang_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'uye':
      case '2':
        return {
          id: 'uye',
          name: '2. Üye Yönetimi',
          categoryNumber: 2,
          embed: {
            title: '👥 ÜYE VE KARAKTER LİSTESİ',
            description: 'Birliğe kayıtlı tüm üyelerin MTA karakterleri, rütbeleri ve aktif durumları:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.members.slice(0, 8).map(m => ({
              name: `${m.rankName} • ${m.discordUsername}`,
              value: `🆔 MTA: **${m.currentMtaName}** (${m.currentMtaId})\nDurum: \`${m.status}\` | XP: \`${m.xp}\` | Uyarı: \`${m.warningsCount}\``,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_member_add', label: 'Üye Ekle', style: 'SUCCESS', emoji: '➕' },
            { customId: 'btn_member_remove', label: 'Üye Çıkar / İhraç', style: 'DANGER', emoji: '➖' },
            { customId: 'btn_member_status', label: 'Durum Değiştir', style: 'SECONDARY', emoji: '🔄' },
            { customId: 'btn_member_profile', label: 'Üye Profili Gör', style: 'PRIMARY', emoji: '🔍' },
            { customId: 'btn_mem_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'rutbe':
      case '3':
        return {
          id: 'rutbe',
          name: '3. Rütbe Yönetimi',
          categoryNumber: 3,
          embed: {
            title: '🎖️ RÜTBE VE HİYERARŞİ YÖNETİMİ',
            description:
              '**Kesin Hiyerarşik Sıralama:**\n' +
              'Seviye 5: **OG** (En yüksek rütbe)\n' +
              'Seviye 4: **Under OG (BG)** (Yönetim rütbesi)\n' +
              'Seviye 3: **Recruiter** (Çeteye Adam Çeker)\n' +
              'Seviye 2: **Kıdemli Üye** (Deneyimli üye)\n' +
              'Seviye 1: **Üye** (Başlangıç rütbesi)\n\n' +
              '➡️ **Terfi Yönü:** Üye ➔ Kıdemli Üye ➔ Recruiter ➔ Under OG (BG) ➔ OG',
            color: EMBED_COLORS.GOLD,
            fields: store.ranks.map(r => ({
              name: `[Seviye ${r.level}] ${r.name}`,
              value: `Açıklama: *${r.description}*\nİzin Sayısı: ${r.permissions.length} adet`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_rank_promote', label: 'Terfi Ettir', style: 'SUCCESS', emoji: '⬆️' },
            { customId: 'btn_rank_demote', label: 'Rütbe Düşür (Tenzil)', style: 'DANGER', emoji: '⬇️' },
            { customId: 'btn_rank_logs', label: 'Terfi Geçmişi', style: 'SECONDARY', emoji: '📜' },
            { customId: 'btn_rank_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'yetki':
      case '4':
        return {
          id: 'yetki',
          name: '4. Yetki Yönetimi',
          categoryNumber: 4,
          embed: {
            title: '🔑 SİSTEM YETKİLENDİRME',
            description:
              'Bot içerisindeki tüm eylemler izin bazlı koruma altındadır (RBAC).\n\n' +
              '• `member.*`: Üye görüntüleme, ekleme, düzenleme, çıkarma\n' +
              '• `rank.*`: Terfi, tenzil, rütbe yetki düzenleme\n' +
              '• `economy.*`: Kasa görüntüleme, para yatırma, para çekme\n' +
              '• `inventory.*`: Envanter eşya ekleme ve stok düzenleme\n' +
              '• `vehicle.*` & `territory.*`: Araç ve bölge kontrolü\n' +
              '• `punishment.*`: Ceza ve ihraç yetkisi\n' +
              '• `confidential.*`: Gizli kayıt ve soruşturma erişimi',
            color: EMBED_COLORS.DARK,
            fields: [
              { name: 'En Yüksek Yetki', value: 'OG (Tüm 25 izne sahip)', inline: true },
              { name: 'Yönetim Kadrosu', value: 'Under OG (22 izin)', inline: true },
              { name: 'Aday Yetkilisi', value: 'Recruiter (Aday Yönetimi)', inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_perm_view', label: 'Rütbe İzinlerini Gör', style: 'PRIMARY', emoji: '📋' },
            { customId: 'btn_perm_edit', label: 'İzin Ata / Kaldır', style: 'SECONDARY', emoji: '⚙️' },
            { customId: 'btn_perm_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'basvuru':
      case '5':
        return {
          id: 'basvuru',
          name: '5. Başvuru Yönetimi',
          categoryNumber: 5,
          embed: {
            title: '📋 BİRLİK KATILIM BAŞVURULARI',
            description:
              `Toplam Başvuru: **${store.applications.length}** | Bekleyen: **${store.applications.filter(a => a.status === 'Beklemede').length}**\n` +
              'Başvuru kabul edildiğinde: Kullanıcıya DM gider, Üye rolü verilir, üye kaydı oluşturulur ve Recruiter eşleştirilir.',
            color: EMBED_COLORS.PRIMARY,
            fields: store.applications.slice(0, 5).map(a => ({
              name: `#${a.applicationNumber} • ${a.mtaCharacterName} (${a.discordUsername})`,
              value: `Durum: \`${a.status}\` | Puan: \`${a.averageScore || '-'}/10\` | Yaş: ${a.age}\nIC Hikaye: *${a.characterBackstory.slice(0, 60)}...*`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_app_review', label: 'Başvuruyu İncele & Puanla', style: 'PRIMARY', emoji: '🔍' },
            { customId: 'btn_app_accept', label: 'Kabul Et', style: 'SUCCESS', emoji: '✅' },
            { customId: 'btn_app_reject', label: 'Reddet', style: 'DANGER', emoji: '❌' },
            { customId: 'btn_app_new_form', label: 'Yeni Başvuru Yap', style: 'SECONDARY', emoji: '📝' },
            { customId: 'btn_app_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'recruiter':
      case '6':
        return {
          id: 'recruiter',
          name: '6. Recruiter Yönetimi',
          categoryNumber: 6,
          embed: {
            title: '🤝 RECRUITER YÖNETİMİ & ADAY TAKİBİ',
            description:
              '**Görevi: Çeteye Adam Çeker.**\n' +
              'Recruiter rütbesindeki üyeler çeteye yeni kan kazandırır ve adayların başvuru süreçlerini takip eder.',
            color: EMBED_COLORS.PURPLE,
            fields: [
              { name: 'Toplam Davet', value: `${store.recruiterInvites.length} Aday`, inline: true },
              { name: 'Katılan Üye', value: `${store.recruiterInvites.filter(i => i.status === 'Katıldı').length} Kişi`, inline: true },
              { name: 'Dönüşüm Oranı', value: `%${store.recruiterInvites.length ? Math.round((store.recruiterInvites.filter(i => i.status === 'Katıldı').length / store.recruiterInvites.length) * 100) : 0}`, inline: true },
              ...store.recruiterInvites.slice(0, 4).map(i => ({
                name: `Aday: ${i.candidateMtaName} (${i.candidateDiscordTag})`,
                value: `Davet Eden: **${i.recruiterName}** | Durum: \`${i.status}\``,
                inline: false
              }))
            ]
          },
          buttons: [
            { customId: 'btn_rec_invite_candidate', label: 'Aday Davet Et', style: 'SUCCESS', emoji: '📨' },
            { customId: 'btn_rec_stats', label: 'Recruiter Performansı', style: 'PRIMARY', emoji: '📊' },
            { customId: 'btn_rec_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'kasa':
      case '7':
        return {
          id: 'kasa',
          name: '7. Kasa ve Ekonomi',
          categoryNumber: 7,
          embed: {
            title: '💰 BİRLİK SIKIYÖNETİM KASASI',
            description:
              `💵 **Mevcut Kasa Bakiyesi:** $${store.treasury.balance.toLocaleString('tr-TR')}\n` +
              `💳 **Maksimum Çekim Limiti:** $${store.treasury.maxWithdrawLimit.toLocaleString('tr-TR')}\n\n` +
              'Son Kasa Hareketleri:',
            color: EMBED_COLORS.GOLD,
            fields: store.transactions.slice(0, 4).map(t => ({
              name: `[${t.transactionNumber}] ${t.type}: $${t.amount.toLocaleString('tr-TR')}`,
              value: `Kategori: **${t.category}** | Yetkili: ${t.executorName}\n*${t.description}* | Son Bakiye: $${t.balanceAfter.toLocaleString('tr-TR')}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_eco_deposit', label: 'Para Yatır', style: 'SUCCESS', emoji: '📥' },
            { customId: 'btn_eco_withdraw', label: 'Para Çek', style: 'DANGER', emoji: '📤' },
            { customId: 'btn_eco_history', label: 'İşlem Geçmişi', style: 'SECONDARY', emoji: '📜' },
            { customId: 'btn_eco_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'envanter':
      case '8':
        return {
          id: 'envanter',
          name: '8. Envanter',
          categoryNumber: 8,
          embed: {
            title: '📦 BİRLİK ORTAK ENVANTERİ',
            description: 'MTA sunucusundaki kurgusal depo ve mühimmat stoku:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.inventory.map(i => ({
              name: `${i.name} [${i.category}]`,
              value: `Stok: **${i.quantity} Adet** (Uyarı Limiti: ${i.minWarningLimit})\nKaynak: ${i.source} | Son Güncelleyen: ${i.lastUpdatedBy}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_inv_add', label: 'Eşya / Mühimmat Ekle', style: 'SUCCESS', emoji: '➕' },
            { customId: 'btn_inv_remove', label: 'Eşya Çıkar', style: 'DANGER', emoji: '➖' },
            { customId: 'btn_inv_warning', label: 'Kritik Stok Uyarısı', style: 'SECONDARY', emoji: '⚠️' },
            { customId: 'btn_inv_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'arac':
      case '9':
        return {
          id: 'arac',
          name: '9. Araç Yönetimi',
          categoryNumber: 9,
          embed: {
            title: '🚗 BİRLİK ARAÇ FİLOSU',
            description: 'MTA kurgusal garajlarındaki operasyon ve hood araçları:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.vehicles.map(v => ({
              name: `${v.name} • [${v.plate}]`,
              value: `Durum: \`${v.status}\` | Garaj: **${v.garage}**\nZimmetli: ${v.assignedMemberName || 'Yok'} | Mülk: ${v.ownerName}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_veh_add', label: 'Yeni Araç Ekle', style: 'SUCCESS', emoji: '➕' },
            { customId: 'btn_veh_assign', label: 'Aracı Zimmetle', style: 'PRIMARY', emoji: '🔑' },
            { customId: 'btn_veh_status', label: 'Durum Güncelle', style: 'SECONDARY', emoji: '⚙️' },
            { customId: 'btn_veh_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'hood':
      case '10':
        return {
          id: 'hood',
          name: '10. Hood ve Bölgeler',
          categoryNumber: 10,
          embed: {
            title: '🗺️ HOOD VE KONTROL BÖLGELERİ',
            description: 'San Andreas genelinde birliğin egemenlik sahaları:',
            color: EMBED_COLORS.DARK,
            fields: store.territories.map(t => ({
              name: `${t.name} • [${t.status}]`,
              value: `Açıklama: *${t.description}*\nSorumlu: **${t.responsibleMemberName || 'Atanmadı'}**\nNot: ${t.notes || 'Normal devriye devam ediyor.'}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_ter_update', label: 'Bölge Durumu Güncelle', style: 'PRIMARY', emoji: '📍' },
            { customId: 'btn_ter_history', label: 'Bölge Geçmişi', style: 'SECONDARY', emoji: '📜' },
            { customId: 'btn_ter_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'gorev':
      case '11':
        return {
          id: 'gorev',
          name: '11. Görev Yönetimi',
          categoryNumber: 11,
          embed: {
            title: '🎯 BİRLİK RP GÖREVLERİ',
            description: 'Rol içi aktivite ve operasyon emirleri:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.missions.slice(0, 4).map(m => ({
              name: `[${m.status}] ${m.title} (+${m.rewardXp} XP)`,
              value: `Kategori: **${m.category}** | Lider: ${m.assignedLeaderName}\nKatılımcılar: ${m.participantNames.join(', ') || 'Yok'}\n*${m.description}*`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_mis_create', label: 'Yeni Görev Başlat', style: 'SUCCESS', emoji: '➕' },
            { customId: 'btn_mis_complete', label: 'Görevi Tamamla', style: 'PRIMARY', emoji: '✅' },
            { customId: 'btn_mis_cancel', label: 'İptal Et', style: 'DANGER', emoji: '❌' },
            { customId: 'btn_mis_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'operasyon':
      case '12':
        return {
          id: 'operasyon',
          name: '12. Operasyon Kayıtları',
          categoryNumber: 12,
          embed: {
            title: '🗂️ RESMİ OPERASYON KAYITLARI',
            description: 'Tamamlanan büyük çaplı RP baskın, lojistik ve savunma operasyonları arşivi.',
            color: EMBED_COLORS.DARK,
            fields: [
              { name: 'Kayıtlı Operasyon', value: `${store.missions.filter(m => m.status === 'Tamamlandı').length} Adet`, inline: true },
              { name: 'Aktif Hazırlık', value: `${store.missions.filter(m => m.status === 'Aktif').length} Adet`, inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_ops_view', label: 'Operasyon Dosyalarını Aç', style: 'PRIMARY', emoji: '📁' },
            { customId: 'btn_ops_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'savas':
      case '13':
        return {
          id: 'savas',
          name: '13. Savaş Yönetimi',
          categoryNumber: 13,
          embed: {
            title: '⚔️ KURGUSAL SAVAŞ & ÇATIŞMA KAYITLARI',
            description: 'MTA RP sunucusu içindeki resmi birlik savaşları ve çatışma zabıtları:',
            color: EMBED_COLORS.DANGER,
            fields: store.warRecords.map(w => ({
              name: `[${w.recordNumber}] vs ${w.rivalFaction} • [${w.status}]`,
              value: `Başlangıç: ${new Date(w.startDate).toLocaleDateString('tr-TR')}\nKatılımcılar: ${w.participants.join(', ')}\nSonuç: *${w.rpOutcome || 'Çatışmalar devam ediyor.'}*`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_war_create', label: 'Savaş Kaydı Aç', style: 'DANGER', emoji: '⚔️' },
            { customId: 'btn_war_finish', label: 'Savaşı Sonuçlandır', style: 'PRIMARY', emoji: '🏁' },
            { customId: 'btn_war_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'diplomasi':
      case '14':
        return {
          id: 'diplomasi',
          name: '14. Diplomasi',
          categoryNumber: 14,
          embed: {
            title: '🤝 DİPLOMASİ VE İTTİFAK İLİŞKİLERİ',
            description: 'Şehirdeki diğer çeteler ve mafya aileleriyle diplomatik temas durumu:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.diplomacy.map(d => ({
              name: `${d.factionName} • [${d.status}]`,
              value: `Temas Kişisi: **${d.contactPerson || 'Bilinmiyor'}**\nAnlaşma: *${d.agreementDetails || 'Yok'}*\nNotlar: ${d.notes || '-'}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_dip_update', label: 'İlişkiyi Güncelle', style: 'PRIMARY', emoji: '📝' },
            { customId: 'btn_dip_new', label: 'Yeni Birlik Kaydı', style: 'SECONDARY', emoji: '➕' },
            { customId: 'btn_dip_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'ceza':
      case '15':
        return {
          id: 'ceza',
          name: '15. Sicil ve Cezalar',
          categoryNumber: 15,
          embed: {
            title: '⚖️ DİSİPLİN CEZALARI VE SİCİL',
            description: 'Üyelerin birlik içi kurallara riayeti ve disiplin yaptırımları:',
            color: EMBED_COLORS.DANGER,
            fields: store.punishments.map(p => ({
              name: `[${p.punishmentNumber}] ${p.type} • ${p.memberName}`,
              value: `Neden: *${p.reason}*\nYetkili: ${p.executorName} | Tarih: ${new Date(p.date).toLocaleDateString('tr-TR')}\nİtiraz Durumu: \`${p.appealStatus}\``,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_pun_issue', label: 'Ceza Uygula', style: 'DANGER', emoji: '🔨' },
            { customId: 'btn_pun_appeal', label: 'Cezaya İtiraz Et', style: 'SECONDARY', emoji: '📩' },
            { customId: 'btn_pun_resolve_appeal', label: 'İtirazı Karara Bağla', style: 'PRIMARY', emoji: '⚖️' },
            { customId: 'btn_pun_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'ihbar':
      case '16':
        return {
          id: 'ihbar',
          name: '16. İhbar ve Şikayetler',
          categoryNumber: 16,
          embed: {
            title: '🕵️ İHBAR VE GİZLİ BİLDİRİMLER',
            description: 'Üyeler tarafından yapılan iç şikayetler ve kural ihlali bildirimleri:',
            color: EMBED_COLORS.DARK,
            fields: store.reports.map(r => ({
              name: `[${r.reportNumber}] ${r.category} • [${r.status}]`,
              value: `Konu: **${r.reportedSubject}**\nGizlilik: \`${r.privacyLevel}\` | Gönderen: ${r.submitterName}\n*${r.description}*`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_rep_new', label: 'İhbar / Şikayet Bildir', style: 'PRIMARY', emoji: '📢' },
            { customId: 'btn_rep_resolve', label: 'İhbarı Sonuçlandır', style: 'SUCCESS', emoji: '✅' },
            { customId: 'btn_rep_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'kanit':
      case '17':
        return {
          id: 'kanit',
          name: '17. Kanıt Arşivi',
          categoryNumber: 17,
          embed: {
            title: '🗄️ KANIT VE MEDYA ARŞİVİ',
            description: 'Olaylar, çatışmalar ve anlaşmalarla ilgili video, görsel ve log kayıtları:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.evidenceList.map(e => ({
              name: `[${e.evidenceNumber}] ${e.title} (${e.type})`,
              value: `İlişkili: **${e.relatedCaseOrMember}**\nBağlantı: ${e.contentUrl}\nYükleyen: ${e.uploaderName} | Gizlilik: \`${e.privacyLevel}\``,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_evi_upload', label: 'Kanıt Kaydet', style: 'SUCCESS', emoji: '📤' },
            { customId: 'btn_evi_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'duyuru':
      case '18':
        return {
          id: 'duyuru',
          name: '18. Resmi Duyurular',
          categoryNumber: 18,
          embed: {
            title: '📢 RESMİ BİRLİK DUYURULARI',
            description: 'Üyelere tebliğ edilen toplantı, operasyon ve disiplin kararları:',
            color: EMBED_COLORS.PRIMARY,
            fields: store.announcements.map(a => ({
              name: `${a.isPinned ? '📌 ' : ''}${a.title}`,
              value: `${a.content}\n\nYazar: **${a.authorName}** | Tarih: ${new Date(a.publishedAt).toLocaleDateString('tr-TR')}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_ann_create', label: 'Yeni Duyuru Yayınla', style: 'SUCCESS', emoji: '📢' },
            { customId: 'btn_ann_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'istatistik':
      case '19': {
        const stats = StatsService.getStats();
        return {
          id: 'istatistik',
          name: '19. İstatistikler',
          categoryNumber: 19,
          embed: {
            title: '📊 BİRLİK GENEL İSTATİSTİKLERİ',
            description: 'Veritabanı kayıtlarından anlık hesaplanan gerçek metrikler:',
            color: EMBED_COLORS.GOLD,
            fields: [
              { name: '👥 Üye Sayısı', value: `Toplam: **${stats.totalMembers}**\nAktif: **${stats.activeMembers}**\nPasif: **${stats.passiveMembers}**`, inline: true },
              { name: '📋 Başvurular', value: `Toplam: **${stats.totalApps}**\nKabul Oranı: **%${stats.acceptRate}**\nOnaylanan: **${stats.acceptedApps}**`, inline: true },
              { name: '💰 Kasa & Mülk', value: `Bakiye: **$${stats.balance.toLocaleString('tr-TR')}**\nFilo: **${stats.totalVehicles} Araç**\nHood: **${stats.controlledTerritories} Bölge**`, inline: true },
              { name: '🎯 RP Operasyon', value: `Tamamlanan: **${stats.completedMissions}**\nAudit Kaydı: **${stats.auditLogsCount}**`, inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_stat_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };
      }

      case 'basari':
      case '20':
        return {
          id: 'basari',
          name: '20. Başarı Sistemi',
          categoryNumber: 20,
          embed: {
            title: '🏆 XP VE BAŞARI SİSTEMİ',
            description:
              '**Önemli:** XP ve başarı sistemi rütbe terfisinden bağımsızdır. Terfi kararları yetkililer tarafından verilir.\n\n' +
              '**Birlik İçi En Yüksek XP Sıralaması (Leaderboard):**',
            color: EMBED_COLORS.GOLD,
            fields: store.members
              .slice()
              .sort((a, b) => b.xp - a.xp)
              .map((m, idx) => ({
                name: `#${idx + 1} • ${m.discordUsername} (${m.currentMtaName})`,
                value: `🏆 XP: **${m.xp}** | Başarı Puanı: \`${m.activityPoints}\` | Görevler: \`${m.completedMissionsCount}\``,
                inline: false
              }))
          },
          buttons: [
            { customId: 'btn_ach_list', label: 'Tüm Başarı Rozetleri', style: 'PRIMARY', emoji: '🎖️' },
            { customId: 'btn_ach_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'gizli':
      case '21':
        return {
          id: 'gizli',
          name: '21. Gizli Kayıtlar',
          categoryNumber: 21,
          embed: {
            title: '🔒 GİZLİ ARŞİV VE KAYITLAR',
            description:
              '⚠️ **YÜKSEK GÜVENLİK DÜZEYİ:** Sadece OG ve Under OG yetkisine açık özel istihbarat dosyaları:\n\n' +
              store.secretRecords.map(s => `• **${s.codeName}** [${s.category}] - Yetki: \`${s.clearanceLevel}\`\n  ${s.content}`).join('\n\n'),
            color: EMBED_COLORS.DARK,
            fields: []
          },
          buttons: [
            { customId: 'btn_sec_create', label: 'Gizli Dosya Ekle', style: 'DANGER', emoji: '🔐' },
            { customId: 'btn_sec_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'sorusturma':
      case '22':
        return {
          id: 'sorusturma',
          name: '22. İç Soruşturma',
          categoryNumber: 22,
          embed: {
            title: '🔍 İÇ SORUŞTURMA VE TEFTİŞ',
            description: 'Üyeler hakkındaki sadakat, mühimmat açığı ve kural incelemeleri:',
            color: EMBED_COLORS.DARK,
            fields: store.investigations.map(i => ({
              name: `[${i.investigationNumber}] ${i.targetMemberName} • [${i.status}]`,
              value: `Müfettiş: **${i.leadInvestigatorName}** | Gizlilik: \`${i.confidentiality}\`\nGerekçe: *${i.reason}*\nDelil Notları: ${i.evidenceNotes || 'Toplanıyor...'}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_invs_new', label: 'Soruşturma Başlat', style: 'DANGER', emoji: '🔎' },
            { customId: 'btn_invs_verdict', label: 'Karar Ver (Akla / Cezalandır)', style: 'PRIMARY', emoji: '⚖️' },
            { customId: 'btn_invs_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'guvenlik':
      case '23':
        return {
          id: 'guvenlik',
          name: '23. Güvenlik',
          categoryNumber: 23,
          embed: {
            title: '🛡️ SİSTEM GÜVENLİK PROTOKOLLERİ',
            description:
              'Bot sunucu tarafında aktif güvenlik filtreleri yürütmektedir:\n\n' +
              '✅ **Rol & İzin Yetkilendirmesi (RBAC):** Her komut ve etkileşim yetki filtresinden geçer.\n' +
              '✅ **Hız Sınırlaması (Rate Limiting):** Spam interaction saldırılarına karşı koruma.\n' +
              '✅ **Etkileşim Sahiplik Kontrolü:** Başkasının açtığı butona yetkisiz tıklanamaz.\n' +
              '✅ **Kasa Mutex Kilidi:** Çift çekim ve race condition engellenir.\n' +
              '✅ **NoSQL Injection Koruması:** Girdi modelleri Zod ile sanitize edilir.\n' +
              '✅ **Gizli Token Koruması:** Discord tokenı asla istemci tarafına sızdırılmaz.',
            color: EMBED_COLORS.SUCCESS,
            fields: [
              { name: 'Aktif Oturum', value: '7/24 Koruma Aktif', inline: true },
              { name: 'Son Güvenlik Olayı', value: 'Yok (Temiz)', inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_sec_audit', label: 'Güvenlik Loglarını İncele', style: 'PRIMARY', emoji: '📜' },
            { customId: 'btn_audit_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'ayarlar':
      case '24':
        return {
          id: 'ayarlar',
          name: '24. Sistem Ayarları',
          categoryNumber: 24,
          embed: {
            title: '⚙️ SİSTEM AYARLARI VE YEDEKLEME',
            description:
              `**Bot Versiyonu:** v1.1.0 (Sosyal Sohbet & Toplantı Kanalları Entegre)\n` +
              `**Veritabanı Durumu:** MongoDB Kalıcı Depolama Hazır\n` +
              `**Sunucu Kurulum Durumu:** ${store.guildConfig.isConfigured ? '🟢 Yapılandırıldı' : '🟡 /kurulum bekleniyor'}\n\n` +
              'Buradan sistem yedeklerini alabilir, geri yükleyebilir veya sunucu kanallarını sıfırlayabilirsiniz.',
            color: EMBED_COLORS.DARK,
            fields: [
              { name: 'Yedeklenecek Veriler', value: 'Tüm 25 modül, üyeler, kasa, toplantılar, sicil', inline: true },
              { name: 'Otomatik Kurulum', value: '/kurulum komutuyla tek tıkla eksik kanalları kur', inline: true }
            ]
          },
          buttons: [
            { customId: 'btn_sys_backup', label: 'Tam Sistem Yedeği Al (JSON)', style: 'SUCCESS', emoji: '💾' },
            { customId: 'btn_sys_restore', label: 'Yedekten Geri Yükle', style: 'PRIMARY', emoji: '📥' },
            { customId: 'btn_sys_setup', label: '/kurulum Çalıştır', style: 'DANGER', emoji: '🚀' },
            { customId: 'btn_sys_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };

      case 'toplanti':
      case '25':
      default:
        return {
          id: 'toplanti',
          name: '25. Toplantı & Görüşme Yönetimi',
          categoryNumber: 25,
          embed: {
            title: '🏛️ BİRLİK VE YÖNETİM TOPLANTILARI',
            description:
              'Birlik içi haftalık genel toplantılar ve gizli yönetim istişareleri:\n\n' +
              '🔊 **İlişkili Ses Odaları:** `Toplantı Odası`, `Yönetim Odası`, `Özel Görüşme`\n' +
              '📜 **Metin Arşivi:** `#toplantı-gündemi`',
            color: EMBED_COLORS.PRIMARY,
            fields: store.meetings.map(m => ({
              name: `[${m.meetingNumber}] ${m.title} (${m.scope}) • [${m.status}]`,
              value: `Tarih: **${m.timeString}** | Ses Odası: **${m.voiceChannelName}**\nKonu: *${m.subject}*\nGündem: ${m.agenda.replace(/\n/g, ' ')}\n${m.decisions ? `Karar: **${m.decisions}**` : ''}`,
              inline: false
            }))
          },
          buttons: [
            { customId: 'btn_meet_create', label: 'Toplantı Planla', style: 'SUCCESS', emoji: '📅' },
            { customId: 'btn_meet_start', label: 'Oturumu Başlat', style: 'PRIMARY', emoji: '🎙️' },
            { customId: 'btn_meet_complete', label: 'Kararları Kaydet', style: 'SECONDARY', emoji: '📝' },
            { customId: 'btn_meet_cancel', label: 'İptal Et', style: 'DANGER', emoji: '❌' },
            { customId: 'btn_meet_refresh', label: 'Yenile', style: 'SECONDARY', emoji: '🔄' }
          ]
        };
    }
  }

  public static getCategoryOptions(): { label: string; value: string; description: string; emoji?: string }[] {
    return [
      { label: '1. Birlik Yönetimi', value: 'birlik', description: 'Birlik adı, etiketi, lideri ve tarihçesi', emoji: '🏢' },
      { label: '2. Üye Yönetimi', value: 'uye', description: 'Üyeler, MTA karakterleri ve profiller', emoji: '👥' },
      { label: '3. Rütbe Yönetimi', value: 'rutbe', description: '5 seviyeli kesin hiyerarşi ve terfi/tenzil', emoji: '🎖️' },
      { label: '4. Yetki Yönetimi', value: 'yetki', description: 'Rütbelere özel izin ve yetki matrisi', emoji: '🔑' },
      { label: '5. Başvuru Yönetimi', value: 'basvuru', description: 'Katılım başvuruları, puanlama ve onay', emoji: '📋' },
      { label: '6. Recruiter Yönetimi', value: 'recruiter', description: 'Çeteye adam çeker aday takibi ve oranlar', emoji: '🤝' },
      { label: '7. Kasa ve Ekonomi', value: 'kasa', description: 'Birlik kasası, para yatırma ve çekme', emoji: '💰' },
      { label: '8. Envanter', value: 'envanter', description: 'Silah, zırh, mühimmat ve eşya depoları', emoji: '📦' },
      { label: '9. Araç Yönetimi', value: 'arac', description: 'Filo araçları, plakalar ve zimmetleme', emoji: '🚗' },
      { label: '10. Hood ve Bölgeler', value: 'hood', description: 'Sanal egemenlik bölgeleri ve devriye', emoji: '🗺️' },
      { label: '11. Görev Yönetimi', value: 'gorev', description: 'RP operasyon emirleri ve XP ödülleri', emoji: '🎯' },
      { label: '12. Operasyon Kayıtları', value: 'operasyon', description: 'Büyük operasyon ve sevkiyat zabıtları', emoji: '🗂️' },
      { label: '13. Savaş Yönetimi', value: 'savas', description: 'Kurgusal çete savaşları ve RP sonuçları', emoji: '⚔️' },
      { label: '14. Diplomasi', value: 'diplomasi', description: 'Diğer birliklerle ittifak veya düşmanlık', emoji: '🤝' },
      { label: '15. Sicil ve Cezalar', value: 'ceza', description: 'İhtar, uzaklaştırma, ihraç ve itiraz', emoji: '⚖️' },
      { label: '16. İhbar ve Şikayetler', value: 'ihbar', description: 'İç ihbarlar, kural ihlali bildirimleri', emoji: '🕵️' },
      { label: '17. Kanıt Arşivi', value: 'kanit', description: 'Video, fotoğraf ve log kanıtları', emoji: '🗄️' },
      { label: '18. Duyurular', value: 'duyuru', description: 'Resmi birlik bildirileri ve toplantılar', emoji: '📢' },
      { label: '19. İstatistikler', value: 'istatistik', description: 'Canlı üye, kasa ve katılım grafikleri', emoji: '📊' },
      { label: '20. Başarı Sistemi', value: 'basari', description: 'XP, katılım puanı ve liderlik tablosu', emoji: '🏆' },
      { label: '21. Gizli Kayıtlar', value: 'gizli', description: 'Sadece OG ve Under OG özel arşivi', emoji: '🔒' },
      { label: '22. İç Soruşturma', value: 'sorusturma', description: 'Disiplin teftişi ve sadakat dosyaları', emoji: '🔍' },
      { label: '23. Güvenlik', value: 'guvenlik', description: 'Sistem yetkilendirme ve audit logları', emoji: '🛡️' },
      { label: '24. Sistem Ayarları', value: 'ayarlar', description: 'Yedekleme, geri yükleme ve /kurulum', emoji: '⚙️' },
      { label: '25. Toplantı & Görüşme', value: 'toplanti', description: 'Toplantı planlama, gündem, sesli oda ve kararlar', emoji: '🏛️' }
    ];
  }
}
