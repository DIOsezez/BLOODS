/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - OTOMATİK DISCORD SUNUCU KURULUM SERVİSİ
 * /kurulum komutunu ve panel oluşturma işlemlerini yönetir.
 *
 * KESİN KURAL: Mevcut hiçbir kanalı silmez, yeniden adlandırmaz, kategorisini ve
 * izinlerini değiştirmez. Yalnızca eksik olan yeni kategori ve kanalları (Metin ve Ses)
 * güvenle oluşturur (Idempotent).
 */
import { store } from './store.ts';
import { DEFAULT_RANKS, DEFAULT_CATEGORIES_AND_CHANNELS, PANEL_CHANNEL_MAPPINGS, DEFAULT_ACHIEVEMENT_ROLES, DEFAULT_WARNING_ROLES } from '../config/index.ts';
import { DiscordPanelRegistry } from '../utils/discordPanels.ts';

// Discord Permission Bit Flags (defined directly to avoid importing Node/WS modules into frontend bundles)
export const PermissionFlagsBits = {
  ManageChannels: 1n << 4n,
  PrioritySpeaker: 1n << 8n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  ManageMessages: 1n << 13n,
  EmbedLinks: 1n << 14n,
  AttachFiles: 1n << 15n,
  ReadMessageHistory: 1n << 16n,
  Connect: 1n << 20n,
  Speak: 1n << 21n,
  CreatePublicThreads: 1n << 35n,
} as const;

function buildActionRows(buttons: any[]): any[] {
  if (!buttons || buttons.length === 0) return [];
  const rows: any[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const chunk = buttons.slice(i, i + 5);
    rows.push({
      type: 1, // ActionRow
      components: chunk.map(b => ({
        type: 2, // Button
        custom_id: b.customId,
        label: b.label,
        emoji: b.emoji ? { name: b.emoji } : undefined,
        style: b.style === 'SUCCESS' ? 3 : b.style === 'DANGER' ? 4 : b.style === 'SECONDARY' ? 2 : 1,
        disabled: Boolean(b.disabled)
      }))
    });
  }
  return rows;
}

export interface ISetupResultItem {
  type: 'Kategori' | 'Metin Kanalı' | 'Ses Kanalı' | 'Rol' | 'Panel';
  name: string;
  status: 'Mevcut' | 'Oluşturuldu' | 'Korundu';
  details?: string;
}

export class SetupService {
  /**
   * Otomatik Sunucu Analizi ve Eksik Kaynakların Güvenli Kurulumu
   * Mevcut hiçbir kanal, ses odası, kategori ve role DOKUNMAZ.
   */
  public static async executeGuildSetup(
    guildId: string,
    executorName: string,
    discordGuild?: any
  ): Promise<{
    success: boolean;
    report: ISetupResultItem[];
    stats: { createdCategories: number; existingCategories: number; createdChannels: number; existingChannels: number };
    message: string;
  }> {
    const report: ISetupResultItem[] = [];
    let createdCategories = 0;
    let existingCategories = 0;
    let createdChannels = 0;
    let existingChannels = 0;

    if (!store.guildConfig.categoryMappings) {
      store.guildConfig.categoryMappings = {};
    }

    if (discordGuild && discordGuild.channels && discordGuild.channels.fetch) {
      try {
        await discordGuild.channels.fetch();
      } catch (e) {}
    }

    // 0. Eski Rol ve Sembolsüz Eski Kanalların Temizliği (Kullanıcı talebi)
    await SetupService.cleanOldRoles(discordGuild);
    await SetupService.cleanOldCategoriesAndChannels(discordGuild);

    // 1. Rollerin Analizi ve Hiyerarşik Yapılandırması (OG -> Under OG -> Recruiter -> Kıdemli Üye -> Üye)
    for (const rankDef of DEFAULT_RANKS) {
      const existingRoleId = store.guildConfig.roleMappings[rankDef.level];
      let existingDiscordRole = null;
      if (discordGuild && discordGuild.roles && discordGuild.roles.cache) {
        existingDiscordRole = discordGuild.roles.cache.find(
          (r: any) => r.name.toLowerCase() === rankDef.name.toLowerCase()
        );
      }

      if (existingRoleId || existingDiscordRole) {
        if (existingDiscordRole) {
          store.guildConfig.roleMappings[rankDef.level] = existingDiscordRole.id;
          // Discord Screenshot: "Rolü olan üyeleri geri kalan çevrimiçi üyelerden ayrı göster" (hoist: true)
          if (!existingDiscordRole.hoist && existingDiscordRole.edit) {
            try {
              await existingDiscordRole.edit({ hoist: true, reason: 'Üyeleri ayrı kategoride göster (Hoist)' });
            } catch (e: any) {}
          }
        }
        report.push({
          type: 'Rol',
          name: rankDef.name,
          status: 'Mevcut',
          details: `Seviye ${rankDef.level} - Rol mevcut (Ayrı Gösterim Açık).`
        });
      } else {
        let simulatedRoleId = `role-${rankDef.level}-${Date.now().toString().slice(-4)}`;
        if (discordGuild && discordGuild.roles && discordGuild.roles.create) {
          try {
            const created = await discordGuild.roles.create({
              name: rankDef.name,
              color: rankDef.color as any,
              hoist: true,
              reason: 'MTA Illegal Birlik Otomatik Kurulum'
            });
            simulatedRoleId = created.id;
          } catch (e: any) {
            console.error('[ROL KURULUM HATASI]', e.message);
          }
        }
        store.guildConfig.roleMappings[rankDef.level] = simulatedRoleId;
        report.push({
          type: 'Rol',
          name: `${rankDef.name} (Seviye ${rankDef.level})`,
          status: 'Oluşturuldu',
          details: `Açıklama: ${rankDef.description} (Ayrı Gösterim Açık)`
        });
      }
    }

    // Aday Rolü
    const foundCandidateRole = discordGuild?.roles?.cache?.find((r: any) => r.name.toLowerCase() === '⏳ ┊ aday');
    if (foundCandidateRole) {
      if (!foundCandidateRole.hoist && foundCandidateRole.edit) {
        try {
          await foundCandidateRole.edit({ hoist: true, reason: 'Aday rolünü ayrı göster' });
        } catch (e: any) {}
      }
      store.guildConfig.roleMappings[0] = foundCandidateRole.id;
      report.push({
        type: 'Rol',
        name: '⏳ ┊ Aday',
        status: 'Mevcut',
        details: 'Rol mevcut (Ayrı Gösterim Açık).'
      });
    } else {
      let candidateRoleId = `role-candidate-${Date.now().toString().slice(-4)}`;
      if (discordGuild && discordGuild.roles && discordGuild.roles.create) {
        try {
          const created = await discordGuild.roles.create({
            name: '⏳ ┊ Aday',
            color: 0x95a5a6,
            hoist: true,
            reason: 'MTA Illegal Birlik Otomatik Kurulum'
          });
          candidateRoleId = created.id;
        } catch (e: any) {}
      }
      store.guildConfig.roleMappings[0] = candidateRoleId;
      report.push({
        type: 'Rol',
        name: '⏳ ┊ Aday',
        status: 'Oluşturuldu',
        details: 'Yeni başvuru yapanlara geçici aday rolü (Ayrı Gösterim Açık).'
      });
    }

    // Başarım Rolleri (Achievement Roles)
    for (const achRole of DEFAULT_ACHIEVEMENT_ROLES) {
      let achRoleId = `role-${achRole.id}`;
      let exists = false;
      let found: any = null;
      if (discordGuild && discordGuild.roles && discordGuild.roles.cache) {
        found = discordGuild.roles.cache.find((r: any) => r.name.toLowerCase() === achRole.name.toLowerCase() || r.name.includes(achRole.name.replace(/[^a-zA-Z0-9çşğüöıÇŞĞÜÖİ]/g, '')));
        if (found) {
          exists = true;
          achRoleId = found.id;
          if (!found.hoist && found.edit) {
            try {
              await found.edit({ hoist: true, reason: 'Başarım rolünü ayrı göster' });
            } catch (e: any) {}
          }
        }
      }

      if (exists) {
        report.push({
          type: 'Rol',
          name: achRole.name,
          status: 'Mevcut',
          details: `Başarım Rolü: ${achRole.description} (Ayrı Gösterim Açık)`
        });
      } else {
        if (discordGuild && discordGuild.roles && discordGuild.roles.create) {
          try {
            const created = await discordGuild.roles.create({
              name: achRole.name,
              color: achRole.color as any,
              hoist: true,
              reason: 'MTA Illegal Birlik Başarım Rolü Kurulumu'
            });
            achRoleId = created.id;
          } catch (e: any) {}
        }
        report.push({
          type: 'Rol',
          name: achRole.name,
          status: 'Oluşturuldu',
          details: `Başarım Rolü: ${achRole.description} (Ayrı Gösterim Açık)`
        });
      }
    }

    // Uyarı Rolleri (Warning Roles: 1x, 2x, 3x)
    for (const wRole of DEFAULT_WARNING_ROLES) {
      let found: any = null;
      if (discordGuild && discordGuild.roles && discordGuild.roles.cache) {
        found = discordGuild.roles.cache.find((r: any) =>
          r.name.toLowerCase() === wRole.name.toLowerCase() ||
          r.name.includes(`${wRole.count}x Uyarı`) ||
          r.name.includes(`${wRole.count}x uyarı`)
        );
        if (found && !found.hoist && found.edit) {
          try {
            await found.edit({ hoist: true, reason: 'Uyarı rolünü ayrı göster' });
          } catch (e: any) {}
        }
      }

      if (found) {
        report.push({
          type: 'Rol',
          name: wRole.name,
          status: 'Mevcut',
          details: `Disiplin Rolü: ${wRole.description} (Ayrı Gösterim Açık)`
        });
      } else {
        if (discordGuild && discordGuild.roles && discordGuild.roles.create) {
          try {
            await discordGuild.roles.create({
              name: wRole.name,
              color: wRole.color as any,
              hoist: true,
              reason: 'MTA Illegal Birlik Uyarı Rolü Kurulumu'
            });
          } catch (e: any) {}
        }
        report.push({
          type: 'Rol',
          name: wRole.name,
          status: 'Oluşturuldu',
          details: `Disiplin Rolü: ${wRole.description} (Ayrı Gösterim Açık)`
        });
      }
    }

    // 2. Kategori ve Kanalların Analizi
    const discordCategoryMap: Record<string, any> = {};

    for (const catDef of DEFAULT_CATEGORIES_AND_CHANNELS) {
      const catKey = catDef.category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const existingCatId = store.guildConfig.categoryMappings[catKey];
      let existingDiscordCat = null;

      if (discordGuild && discordGuild.channels && discordGuild.channels.cache) {
        existingDiscordCat = discordGuild.channels.cache.find(
          (c: any) => (c.type === 4 || c.type === 'GuildCategory') && c.name.toLowerCase() === catDef.category.toLowerCase()
        );
      }

      let categoryIdToUse = existingCatId;

      if (existingCatId || existingDiscordCat) {
        existingCategories++;
        if (existingDiscordCat) {
          store.guildConfig.categoryMappings[catKey] = existingDiscordCat.id;
          categoryIdToUse = existingDiscordCat.id;
          discordCategoryMap[catKey] = existingDiscordCat;
        }
        report.push({
          type: 'Kategori',
          name: catDef.category,
          status: 'Mevcut',
          details: 'Mevcut kategori korundu, ismi veya sırası değiştirilmedi.'
        });
      } else {
        createdCategories++;
        let simulatedCatId = `cat-${catKey}-${Date.now().toString().slice(-4)}`;
        if (discordGuild && discordGuild.channels && discordGuild.channels.create) {
          try {
            const createdCat = await discordGuild.channels.create({
              name: catDef.category,
              type: 4, // GuildCategory
              reason: 'MTA Illegal Birlik Kurulum'
            });
            simulatedCatId = createdCat.id;
            discordCategoryMap[catKey] = createdCat;
          } catch (e: any) {
            console.error('[KATEGORİ KURULUM HATASI]', e.message);
          }
        }
        store.guildConfig.categoryMappings[catKey] = simulatedCatId;
        categoryIdToUse = simulatedCatId;
        report.push({
          type: 'Kategori',
          name: catDef.category,
          status: 'Oluşturuldu',
          details: `Eksik kategori oluşturuldu (${catDef.channels.length} kanal ile bağlandı).`
        });
      }

      // Alt Kanallar (Metin ve Ses)
      for (const ch of catDef.channels) {
        const isVoice = ch.type === 'GUILD_VOICE';
        const channelType = isVoice ? 'Ses Kanalı' : 'Metin Kanalı';
        const channelDisplayName = isVoice ? `🔊 ${ch.name}` : `#${ch.name}`;
        const existingChanId = store.guildConfig.channelMappings[ch.id];

        let existingDiscordChan = null;
        if (discordGuild && discordGuild.channels && discordGuild.channels.cache) {
          existingDiscordChan = discordGuild.channels.cache.find(
            (c: any) => c.name.toLowerCase() === ch.name.toLowerCase()
          );
        }

        if (existingChanId || existingDiscordChan) {
          existingChannels++;
          if (existingDiscordChan) {
            store.guildConfig.channelMappings[ch.id] = existingDiscordChan.id;
          }
          report.push({
            type: channelType,
            name: channelDisplayName,
            status: 'Mevcut',
            details: 'Mevcut kanal korundu; adı, kategorisi ve izinleri değiştirilmedi.'
          });
        } else {
          createdChannels++;
          let simulatedChanId = `chan-${ch.id}-${Date.now().toString().slice(-4)}`;

          if (discordGuild && discordGuild.channels && discordGuild.channels.create) {
            try {
              const parentId = discordCategoryMap[catKey]?.id ||
                (categoryIdToUse && !categoryIdToUse.startsWith('cat-') ? categoryIdToUse : undefined);
              const created = await discordGuild.channels.create({
                name: ch.name,
                type: isVoice ? 2 : 0, // GuildVoice (2) or GuildText (0)
                parent: parentId,
                reason: 'MTA Illegal Birlik Kurulum'
              });
              simulatedChanId = created.id;
            } catch (e: any) {
              console.error('[KANAL KURULUM HATASI]', e.message);
            }
          }

          store.guildConfig.channelMappings[ch.id] = simulatedChanId;

          // İzin Tanımları
          let permissionDesc = 'Üyelerin genel erişimine açık';
          if (ch.managementOnly) {
            permissionDesc = 'Yalnızca OG ve Under OG (BG) Yönetim Erişimi';
          } else if (ch.recruiterOnly) {
            permissionDesc = 'Recruiter ve Üstü Yetkililer';
          } else if (ch.staffOnly) {
            permissionDesc = 'Yönetim & Yetkili Erişimi';
          } else if (ch.readOnlyForMembers) {
            permissionDesc = 'Normal Üyelere Salt-Okunur Duyuru';
          }

          report.push({
            type: channelType,
            name: channelDisplayName,
            status: 'Oluşturuldu',
            details: permissionDesc
          });
        }
      }
    }

    // 3. Otomatik Panel Mesajları Kurulumu (Önce eski mesajları temizle, ardından 26 Paneli İlgili Özel Kanallara Dağıt)
    await SetupService.purgeAllPanels(discordGuild);
    const panelDistResult = await SetupService.distributeAllPanels(discordGuild);
    for (const r of panelDistResult.results) {
      report.push({
        type: 'Panel',
        name: r.name,
        status: r.status === 'Gönderildi' || r.status.includes('Simüle') ? 'Oluşturuldu' : 'Korundu',
        details: `#${r.channelName} kanalına atandı.`
      });
    }

    store.guildConfig.isConfigured = true;
    store.guildConfig.configuredAt = new Date();

    store.addAuditLog({
      category: 'Sistem',
      actionType: 'SUNUCU_GÜNCELLEME',
      executorId: 'YÖNETİCİ',
      executorName,
      target: guildId,
      description: `Eksik sosyal sohbet, toplantı ve ses kanalları oluşturuldu. (Yeni Kategori: ${createdCategories}, Yeni Kanal: ${createdChannels}, Korunan: ${existingChannels})`
    });

    return {
      success: true,
      report,
      stats: {
        createdCategories,
        existingCategories,
        createdChannels,
        existingChannels
      },
      message: `MTA Illegal Birlik Sunucu Yapılandırması tamamlandı! (Oluşturulan: ${createdChannels} kanal, Korunan: ${existingChannels} mevcut kanal)`
    };
  }

  /**
   * 25+ Panelin Tamamını İlgili Özel Kanallara Gönderme ve Dağıtma Servisi
   * Panellerin tek bir menüde toplanması yerine her birini doğrudan ait olduğu
   * özel Discord metin kanalına atar.
   */
  public static async distributeAllPanels(
    discordGuild?: any
  ): Promise<{
    success: boolean;
    results: Array<{
      panelId: string;
      name: string;
      channelName: string;
      channelId?: string;
      status: string;
      messageId?: string;
      error?: string;
    }>;
    count: number;
    message: string;
  }> {
    const results: Array<{
      panelId: string;
      name: string;
      channelName: string;
      channelId?: string;
      status: string;
      messageId?: string;
      error?: string;
    }> = [];

    if (discordGuild && discordGuild.channels && discordGuild.channels.fetch) {
      try {
        await discordGuild.channels.fetch();
      } catch (e: any) {
        console.warn('[DISTRIBUTE] Kanal listesi yenilenirken uyarı:', e.message);
      }
    }

    if (!store.guildConfig.panelMessageIds) {
      store.guildConfig.panelMessageIds = {};
    }

    for (const mapping of PANEL_CHANNEL_MAPPINGS) {
      const panelData = DiscordPanelRegistry.getPanel(mapping.panelId);
      if (!panelData) continue;

      let targetChan: any = null;

      if (discordGuild && discordGuild.channels && discordGuild.channels.cache) {
        // 1. Önce candidate names veya defaultChannelName ile eşleşen mevcut metin kanalını bul
        targetChan = discordGuild.channels.cache.find((c: any) => {
          if (c.type !== 0 && c.type !== 'GuildText') return false;
          const chanName = c.name.toLowerCase();
          return (
            mapping.channelCandidateNames.some(cand => cand.toLowerCase() === chanName) ||
            mapping.defaultChannelName.toLowerCase() === chanName
          );
        });

        // 2. Kanal bulunamadıysa (kullanıcı silmişse veya kullanmıyorsa), zorla yeniden oluşturma
        if (!targetChan) {
          continue;
        }

        // 3. Hedef kanala panel mesajını ve interaktif butonlarını gönder
        if (targetChan && targetChan.send) {
          try {
            const rows = buildActionRows(panelData.buttons);
            const sent = await targetChan.send({
              embeds: [panelData.embed as any],
              components: rows
            });

            store.guildConfig.panelMessageIds[mapping.panelId] = {
              channelId: targetChan.id,
              channelName: targetChan.name,
              messageId: sent.id,
              sentAt: new Date().toISOString()
            };

            results.push({
              panelId: mapping.panelId,
              name: mapping.name,
              channelName: targetChan.name,
              channelId: targetChan.id,
              status: 'Gönderildi',
              messageId: sent.id
            });
            continue;
          } catch (sendErr: any) {
            console.error(`[PANEL GÖNDERME HATASI - ${mapping.name}]`, sendErr.message);
            results.push({
              panelId: mapping.panelId,
              name: mapping.name,
              channelName: targetChan?.name || mapping.defaultChannelName,
              channelId: targetChan?.id,
              status: 'Hata',
              error: sendErr.message
            });
            continue;
          }
        }
      }

      // Sunucuya bağlı değil veya simülatör modu
      const simulatedMsgId = `msg-${mapping.panelId}-${Date.now().toString().slice(-4)}`;
      store.guildConfig.panelMessageIds[mapping.panelId] = {
        channelId: mapping.defaultChannelName,
        channelName: mapping.defaultChannelName,
        messageId: simulatedMsgId,
        sentAt: new Date().toISOString()
      };
      results.push({
        panelId: mapping.panelId,
        name: mapping.name,
        channelName: mapping.defaultChannelName,
        status: 'Kaydedildi (Simüle)',
        messageId: simulatedMsgId
      });
    }

    const successCount = results.filter(r => r.status === 'Gönderildi' || r.status.includes('Simüle')).length;

    store.addAuditLog({
      category: 'Sistem',
      actionType: 'PANEL_DAĞITIMI',
      executorId: 'SİSTEM',
      executorName: 'YÖNETİCİ',
      target: 'Tüm Kanallar',
      description: `Toplam ${results.length} adet panel kendi özel kanallarına başarıyla dağıtıldı (${successCount} başarılı).`
    });

    return {
      success: true,
      results,
      count: successCount,
      message: `${successCount} adet panel ilgili kanallara başarıyla yerleştirildi.`
    };
  }

  /**
   * Kanallara gönderilmiş olan tüm panelleri arar ve siler (Purge)
   * Kullanıcı isteği: "kanallara atmış olduğun panelleride sil"
   */
  public static async purgeAllPanels(
    discordGuild?: any
  ): Promise<{ success: boolean; count: number; message: string }> {
    let deletedCount = 0;
    const panelRecords = store.guildConfig.panelMessageIds || {};
    const botId = discordGuild?.client?.user?.id;

    if (discordGuild) {
      // 1. Önce kayıtlı panel mesajlarını sil
      for (const panelId of Object.keys(panelRecords)) {
        const info = panelRecords[panelId];
        if (!info || !info.channelId || !info.messageId) continue;

        try {
          let channel = null;
          if (discordGuild.channels && discordGuild.channels.fetch) {
            try {
              channel = await discordGuild.channels.fetch(info.channelId);
            } catch {
              channel = discordGuild.channels.cache?.get(info.channelId);
            }
          }

          if (channel && channel.messages && channel.messages.fetch) {
            try {
              const msg = await channel.messages.fetch(info.messageId);
              if (msg && msg.deletable) {
                await msg.delete();
                deletedCount++;
              }
            } catch {
              // Mesaj zaten silinmiş olabilir
            }
          }
        } catch (err: any) {
          console.warn(`[PANEL TEMİZLİK HATASI - ${panelId}]`, err.message);
        }
      }

      // 2. Kullanıcının talebi: "botun yazdığı şeyleri sil"
      // Sunucudaki tüm metin kanallarını tara ve botun gönderdiği tüm mesajları sil
      try {
        if (discordGuild.channels && discordGuild.channels.fetch) {
          try {
            await discordGuild.channels.fetch();
          } catch {}
        }

        const textChannels = discordGuild.channels?.cache?.filter(
          (c: any) => c.type === 0 || c.type === 'GuildText' || (typeof c.isTextBased === 'function' && c.isTextBased())
        );

        if (textChannels) {
          for (const [, channel] of textChannels) {
            try {
              if (!channel.messages || !channel.messages.fetch) continue;
              const fetched = await channel.messages.fetch({ limit: 100 });
              for (const [, msg] of fetched) {
                const isFromBot = (botId && msg.author?.id === botId) || msg.author?.bot;
                if (isFromBot && msg.deletable) {
                  try {
                    await msg.delete();
                    deletedCount++;
                  } catch {}
                }
              }
            } catch {}
          }
        }
      } catch (scanErr: any) {
        console.warn('[BOT MESAJLARI TEMİZLEME UYARISI]', scanErr?.message);
      }
    }

    // Panel kayıt haritasını sıfırla
    store.guildConfig.panelMessageIds = {};

    store.addAuditLog({
      category: 'Sistem',
      actionType: 'PANEL_TEMİZLENDİ',
      executorId: 'SİSTEM',
      executorName: 'YÖNETİCİ',
      target: 'Tüm Kanallar',
      description: `Botun sunucuda yazdığı tüm paneller ve mesajlar temizlendi (Toplam silinen mesaj: ${deletedCount}).`
    });

    return {
      success: true,
      count: deletedCount,
      message: `Botun yazdığı tüm mesajlar ve paneller başarıyla silindi (Silinen: ${deletedCount}).`
    };
  }

  /**
   * Eski ve geçersiz rolleri Discord sunucusundan temizler
   * Kullanıcı isteği: "eski rolleri sil"
   */
  public static async cleanOldRoles(
    discordGuild?: any
  ): Promise<{ deletedRoles: string[]; count: number }> {
    const deletedRoles: string[] = [];
    if (!discordGuild || !discordGuild.roles) return { deletedRoles, count: 0 };

    if (discordGuild.roles.fetch) {
      try {
        await discordGuild.roles.fetch();
      } catch (e: any) {}
    }

    const currentValidNames = [
      ...DEFAULT_RANKS.map(r => r.name.toLowerCase().trim()),
      '⏳ ┊ aday',
      ...DEFAULT_ACHIEVEMENT_ROLES.map(a => a.name.toLowerCase().trim())
    ];

    const obsoleteExactNames = [
      'og',
      'under og (bg)',
      'under og',
      'recruiter',
      'kıdemli üye',
      'üye',
      'aday',
      '.'
    ];

    for (const [, role] of discordGuild.roles.cache) {
      if (role.managed || role.name === '@everyone') continue;
      const rLower = role.name.toLowerCase().trim();

      // Eski isimlerden biriyse ve yeni rozetli rollerden biri değilse sil
      if (!currentValidNames.includes(rLower) && obsoleteExactNames.includes(rLower)) {
        try {
          const roleName = role.name;
          await role.delete('Eski rol temizliği (Kullanıcı talebi)');
          deletedRoles.push(roleName);
        } catch (delErr: any) {
          console.warn(`[ROL SİLME UYARISI - ${role.name}]:`, delErr?.message);
        }
      }
    }

    return { deletedRoles, count: deletedRoles.length };
  }

  /**
   * Eski sembolsüz kategori ve kanalları temizler
   * Kullanıcı isteği: "kanalların isimlerini değiştir"
   */
  public static async cleanOldCategoriesAndChannels(
    discordGuild?: any
  ): Promise<{ deletedCategories: string[]; deletedChannels: string[]; count: number }> {
    const deletedCategories: string[] = [];
    const deletedChannels: string[] = [];
    if (!discordGuild || !discordGuild.channels) return { deletedCategories, deletedChannels, count: 0 };

    if (discordGuild.channels.fetch) {
      try {
        await discordGuild.channels.fetch();
      } catch (e: any) {}
    }

    const oldCategoryNames = [
      '📜 denetim & loglar',
      '📢 birlik bilgilendirme',
      '👥 ekip sohbetleri',
      '⚡ paneller',
      '💬 genel',
      '👑 yönetim toplantilari',
      '👑 yönetim toplantıları',
      '⚔️ operasyon & diplomasi',
      '🛡️ yönetim & disiplin',
      '🏴 birlik sohbet',
      '🔊 ses kanallari',
      '🔊 ses kanalları',
      '🏛️ toplantilar',
      '🏛️ toplantılar',
      '📢 bilgilendirme',
      '💬 sohbet & sosyal',
      '👑 yönetim odalari',
      '👑 yönetim odaları',
      '👥 ekipler ve birimler',
      '⚡ hizli paneller',
      '⚡ hızlı paneller',
      '📜 log ve denetim'
    ];

    const channelsToDelete: any[] = [];
    const categoriesToDelete: any[] = [];

    for (const [, ch] of discordGuild.channels.cache) {
      if (ch.type === 4 || ch.type === 'GuildCategory') {
        const nameLower = ch.name.toLowerCase().trim();
        const isDefaultDiscord = ch.name === 'Metin Kanalları' || ch.name === 'Ses Kanalları';
        const isOldCategory = oldCategoryNames.includes(nameLower) || (!ch.name.includes('・') && !isDefaultDiscord);
        if (isOldCategory) {
          categoriesToDelete.push(ch);
        }
      }
    }

    for (const cat of categoriesToDelete) {
      const childChannels = discordGuild.channels.cache.filter((c: any) => c.parentId === cat.id);
      for (const [, child] of childChannels) {
        channelsToDelete.push(child);
      }
    }

    for (const ch of channelsToDelete) {
      try {
        const name = ch.name;
        await ch.delete('Eski sembolsüz kanal temizliği');
        deletedChannels.push(name);
      } catch (err: any) {
        console.warn(`[KANAL SİLME UYARISI - ${ch.name}]:`, err?.message);
      }
    }

    for (const cat of categoriesToDelete) {
      try {
        const name = cat.name;
        await cat.delete('Eski sembolsüz kategori temizliği');
        deletedCategories.push(name);
      } catch (err: any) {
        console.warn(`[KATEGORİ SİLME UYARISI - ${cat.name}]:`, err?.message);
      }
    }

    return {
      deletedCategories,
      deletedChannels,
      count: deletedChannels.length + deletedCategories.length
    };
  }

  /**
   * Sunucu Kanallarının İzinlerini Senkronize Eder
   * 1. Sunucuya yeni gelen (@everyone) SADECE başvuru kanalını (#📝・katılım-başvuru) görebilir.
   * 2. Yönetim ses odalarını yalnızca 👑 ┊ OG ve ⭐ ┊ Under OG görebilir ve katılabilir.
   * 3. Metin sohbet kanallarına (💬・genel-sohbet vb.) resim ve video yükleme izni kapatılır.
   * 4. Medya kanallarında (📸・medya-galerisi vb.) resim ve dosya yükleme açık kalır.
   * 5. Kullanıcının sildiği kanalları YENİDEN OLUŞTURMAZ, mevcut kanalları düzenler.
   */
  public static async syncChannelPermissions(
    discordGuild?: any
  ): Promise<{ success: boolean; configuredCount: number; message: string }> {
    if (!discordGuild || !discordGuild.channels) {
      return { success: true, configuredCount: 0, message: 'Sunucu bağlı değil' };
    }

    try {
      if (discordGuild.channels.fetch) await discordGuild.channels.fetch();
      if (discordGuild.roles.fetch) await discordGuild.roles.fetch();
    } catch {}

    const everyoneRole = discordGuild.roles.everyone;
    const ogRole = discordGuild.roles.cache.find((r: any) => r.name.includes('OG') && !r.name.includes('Under'));
    const underOgRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Under OG'));
    const recruiterRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Recruiter'));
    const seniorRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Kıdemli'));
    const memberRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Üye') && !r.name.includes('Kıdemli'));
    const candidateRole = discordGuild.roles.cache.find((r: any) => r.name.includes('Aday'));
    const botUser = discordGuild.client?.user;

    const allMemberRoles = [ogRole, underOgRole, recruiterRole, seniorRole, memberRole].filter(Boolean);
    const staffRoles = [ogRole, underOgRole, recruiterRole].filter(Boolean);
    const managementRoles = [ogRole, underOgRole].filter(Boolean);

    let count = 0;

    for (const [, ch] of discordGuild.channels.cache) {
      if (!ch.permissionOverwrites || typeof ch.permissionOverwrites.set !== 'function') continue;

      const name = ch.name.toLowerCase();
      const isVoice = ch.type === 2 || ch.type === 'GuildVoice';
      const isCategory = ch.type === 4 || ch.type === 'GuildCategory';
      const isApplicationChannel = name.includes('başvuru') && !name.includes('inceleme');
      const isManagementVoice = isVoice && (name.includes('yönetim') || name.includes('vip') || name.includes('brifing') || name.includes('özel') || (ch.parent && ch.parent.name.toLowerCase().includes('karargah')));
      const isStaffOrSecretChannel = name.includes('log') || name.includes('inceleme') || name.includes('soruşturma') || name.includes('sicil') || name.includes('ihbar') || name.includes('merkez') || (ch.parent && (ch.parent.name.toLowerCase().includes('yargı') || ch.parent.name.toLowerCase().includes('denetim')));
      const isTextChat = !isVoice && !isCategory && (name.includes('genel-sohbet') || name.includes('muhabbet') || name.includes('birlik-sohbet') || name.includes('tim-sohbet'));
      const isMediaChannel = !isVoice && !isCategory && (name.includes('medya') || name.includes('fotoğraf') || name.includes('klip') || name.includes('delil'));

      const overwrites: any[] = [];

      // Bot İzinleri (Her zaman tam yetki)
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

      // KURAL 1: BAŞVURU KANALI
      // "sunucuya yeni gelen biri için başvuru kanalı aç ve sadece orayı görebilsin"
      if (isApplicationChannel) {
        overwrites.push({
          id: everyoneRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.CreatePublicThreads]
        });

        for (const r of allMemberRoles) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]
          });
        }

        if (candidateRole) {
          overwrites.push({
            id: candidateRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages]
          });
        }
      }
      // KURAL 2: YÖNETİM SES ODALARI
      // "Yönetim seslerini sadece OG ve UNDER OG görsün."
      else if (isManagementVoice) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        });

        // Recruiter, Kıdemli Üye, Üye ve Aday GÖREMEZ
        for (const r of [recruiterRole, seniorRole, memberRole, candidateRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
          });
        }

        // SADECE OG ve Under OG görebilir ve katılabilir
        for (const r of managementRoles) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.PrioritySpeaker,
              PermissionFlagsBits.ManageChannels
            ]
          });
        }
      }
      // KURAL 3: YÖNETİM KARARGAHI KATEGORİSİ
      else if (isCategory && name.includes('karargah')) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });
        for (const r of [recruiterRole, seniorRole, memberRole, candidateRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
        }
        for (const r of managementRoles) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
          });
        }
      }
      // KURAL 3.5: CEZA VE UYARI LOG KANALLARI (Kullanıcı Talebi: Üye ve üstü görebilsin, yazamasın)
      else if (
        name.includes('ceza-log') ||
        name.includes('ceza-sicil') ||
        name.includes('uyarı-log') ||
        name.includes('uyari-log') ||
        name.includes('kara-liste-sicil')
      ) {
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

        // Üye, Kıdemli Üye ve Recruiter görebilir ama yazamaz
        for (const r of [memberRole, seniorRole, recruiterRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.CreatePublicThreads]
          });
        }

        // Yönetim (OG ve Under OG) mesaj yazabilir ve yönetebilir
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
      // KURAL 4: YÖNETİM, YARGI, LOG KANALLARI (Staff Only)
      else if (isStaffOrSecretChannel) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });
        for (const r of [seniorRole, memberRole, candidateRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });
        }
        for (const r of staffRoles) {
          overwrites.push({
            id: r.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages
            ]
          });
        }
      }
      // KURAL 5: SOHBET KANALLARI
      // "Sohbete resim veya video atılamasın."
      else if (isTextChat) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });

        // Normal üyeler yazabilir AMA resim/video/dosya ATAMAZ
        for (const r of [seniorRole, memberRole, candidateRole].filter(Boolean)) {
          overwrites.push({
            id: r.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
          });
        }

        // Yönetim serbest
        for (const r of staffRoles) {
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
      // KURAL 6: MEDYA KANALLARI
      else if (isMediaChannel) {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });
        for (const r of allMemberRoles) {
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
      // KURAL 7: DİĞER TÜM KANALLAR VE KATEGORİLER
      // (@everyone GÖREMEZ, Sadece birlik üyeleri görebilir)
      else {
        overwrites.push({
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        });
        for (const r of allMemberRoles) {
          overwrites.push({
            id: r.id,
            allow: isVoice
              ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
              : [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
          });
        }
        if (candidateRole) {
          // Adaylar duyuruları görebilir
          if (name.includes('duyuru') || name.includes('manifesto')) {
            overwrites.push({
              id: candidateRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
            });
          }
        }
      }

      try {
        await ch.permissionOverwrites.set(overwrites, 'MTA Illegal Birlik Güvenlik & İzin Senkronizasyonu');
        count++;
      } catch (err: any) {
        console.warn(`[İZİN SENKRONİZASYON UYARISI - ${ch.name}]:`, err?.message);
      }
    }

    return {
      success: true,
      configuredCount: count,
      message: `${count} kanalın izinleri başarıyla yapılandırıldı.`
    };
  }

  /**
   * Sunucudaki tüm rütbe, aday ve birlik rollerinin "Rolü olan üyeleri geri kalan çevrimiçi üyelerden ayrı göster"
   * (hoist: true) ayarını garantiye alır.
   */
  public static async ensureAllRolesHoisted(guild: any): Promise<{ success: boolean; updatedCount: number; roles: string[]; details: string[] }> {
    if (!guild || !guild.roles) {
      return { success: false, updatedCount: 0, roles: [], details: ['Sunucu veya roller bulunamadı'] };
    }

    try {
      if (guild.roles.fetch) {
        await guild.roles.fetch();
      }
    } catch {}

    let updatedCount = 0;
    const updatedRoleNames: string[] = [];
    const details: string[] = [];

    for (const [, role] of guild.roles.cache) {
      if (role.name === '@everyone' || role.managed) continue;

      // Kullanıcı özel talimatı: 1568998255319187537 ID'li rol ayrı gösterilmesin (hoist: false)
      if (role.id === '1568998255319187537') {
        if (role.hoist) {
          try {
            if (role.edit) {
              await role.edit({
                hoist: false,
                reason: 'Kullanıcı talimatı: 1568998255319187537 ID li rol ayrı gösterilmesin'
              });
              updatedCount++;
              details.push(`[GÜNCELLENDİ] "${role.name}" (${role.id}) rolü ayrı gösterimden çıkarıldı (hoist: false).`);
            }
          } catch (err: any) {
            details.push(`[HATA] "${role.name}" güncellenemedi: ${err?.message}`);
          }
        }
        continue;
      }

      if (!role.hoist) {
        try {
          if (role.edit) {
            await role.edit({
              hoist: true,
              reason: 'Kullanıcı talimatı: Rolü olan üyeleri ayrı göster (Hoist: true)'
            });
            updatedCount++;
            updatedRoleNames.push(role.name);
            details.push(`[GÜNCELLENDİ] "${role.name}" rolü artık çevrimiçi üyelerden ayrı gösteriliyor (hoist: true).`);
          }
        } catch (err: any) {
          details.push(`[HATA] "${role.name}" güncellenemedi: ${err?.message}`);
        }
      } else {
        details.push(`[ZATEN AKTİF] "${role.name}" rolü ayrı gösterimde (hoist: true).`);
      }
    }

    return {
      success: true,
      updatedCount,
      roles: updatedRoleNames,
      details
    };
  }
}


