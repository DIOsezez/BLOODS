/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - 7/24 BİRLEŞİK SUNUCU VE BOT YÖNETİCİSİ
 * Port 3000 üzerinde hem Web UI arayüzünü hem de Discord Botunu 7/24 kesintisiz çalıştırır.
 */
import express from 'express';
import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { createServer as createViteServer } from 'vite';
import { mtaBot } from './src/bot/index.ts';
import { SetupService } from './src/services/setupService.ts';
import { PersistenceService } from './src/services/persistenceService.ts';
import { PermissionAuditService } from './src/services/permissionAuditService.ts';
import { WarningService } from './src/services/warningService.ts';
import { InactivityService } from './src/services/inactivityService.ts';
import { GuideService } from './src/services/guideService.ts';
import { RankService } from './src/services/rankService.ts';
import { ApplicationService } from './src/services/applicationService.ts';
import { store } from './src/services/store.ts';
import { dbManager } from './src/database/db.ts';
import path from 'path';

async function startServer() {
  // Disk veritabanını başlat ve verileri yükle (Madde 1)
  PersistenceService.init();

  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // 7/24 Çalışma ve Sağlık Kontrolü (Keep-Alive & Monitoring: UptimeRobot / Cron-Job vb.)
  const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
      status: 'online',
      system: 'MTA Illegal Birlik Bot 7/24 Engine',
      botReady: mtaBot.isBotReady(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // Bot Durumu ve İstatistik API'si
  app.get('/api/bot-status', (req, res) => {
    const client = mtaBot.getClient();
    res.json({
      online: mtaBot.isBotReady(),
      wsStatus: client?.ws?.status,
      ping: client?.ws?.ping,
      botTag: client?.user?.tag || 'Bağlanıyor...',
      botId: client?.user?.id || null,
      guildCount: client?.guilds?.cache?.size || 0,
      guilds: client?.guilds?.cache?.map((g: any) => ({ id: g.id, name: g.name })) || [],
      uptimeSeconds: Math.floor(process.uptime()),
      presence: client?.user?.presence?.status || 'online'
    });
  });

  // Kalıcı JSON Disk Veritabanı Durumu (MongoDB Bağımsız)
  app.get('/api/database-status', (req, res) => {
    const status = dbManager.getStatus();
    res.json({
      ...status,
      type: 'Kalıcı JSON Disk Motoru (Zero-Config Standalone)',
      filePath: 'data/birlik_database.json',
      externalDbRequired: false,
      safety: 'Atomik Yazma (ACID temp-file rename) & 5 Dakikalık Otomatik Yedekler',
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  // Sunucu Kanallarını İnceleme API'si
  app.get('/api/guild-channels', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ error: 'Sunucu bulunamadı veya bot henüz hazır değil' });
      }
      await guild.channels.fetch();
      const channels = guild.channels.cache.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId
      }));
      res.json({ guildId: guild.id, guildName: guild.name, count: channels.length, channels });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sunucu Rollerini İnceleme API'si
  app.get('/api/guild-roles', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ error: 'Sunucu bulunamadı veya bot henüz hazır değil' });
      }
      await guild.roles.fetch();
      const roles = guild.roles.cache.map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        hoist: r.hoist,
        managed: r.managed,
        position: r.position
      }));
      res.json({ guildId: guild.id, guildName: guild.name, count: roles.length, roles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sunucu Üyelerini ve Rollerini İnceleme API'si
  app.get('/api/guild-members', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ error: 'Sunucu bulunamadı veya bot henüz hazır değil' });
      }
      await guild.members.fetch();
      const members = guild.members.cache.map((m: any) => ({
        id: m.id,
        userTag: m.user?.tag,
        nickname: m.nickname || m.user?.username,
        isOwner: guild.ownerId === m.id,
        roles: m.roles.cache
          .filter((r: any) => r.name !== '@everyone')
          .map((r: any) => ({ id: r.id, name: r.name, hoist: r.hoist }))
      }));
      res.json({ guildId: guild.id, guildName: guild.name, count: members.length, members });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rolleri Ayrı Gösterme (Hoist) Düzeltme API'si
  app.post('/api/fix-all-roles-hoist', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Sunucu bulunamadı veya bot henüz hazır değil' });
      }
      const result = await SetupService.ensureAllRolesHoisted(guild);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Belirli Bir Rolün Ayrı Gösterimini (Hoist) Değiştirme API'si
  app.post('/api/set-role-hoist', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Sunucu bulunamadı veya bot henüz hazır değil' });
      }
      const roleId = req.body?.roleId || '1568998255319187537';
      const hoist = req.body?.hoist === true; // Varsayılan: false (ayrı gösterilmesin)
      const role = await guild.roles.fetch(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: `Rol bulunamadı (${roleId})` });
      }

      await role.edit({
        hoist,
        reason: req.body?.reason || `Kullanıcı talimatı: Rol ayrı gösterilmesin (hoist: ${hoist})`
      });

      console.log(`[ROL HOIST] "${role.name}" (${role.id}) için hoist durumu ${hoist} yapıldı.`);
      res.json({
        success: true,
        roleId: role.id,
        roleName: role.name,
        hoist: role.hoist,
        message: `"${role.name}" rolü başarıyla ${hoist ? 'ayrı gösterilecek' : 'ayrı gösterilmeyecek'} şekilde güncellendi.`
      });
    } catch (err: any) {
      console.error('[ROL HOIST HATA]', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Kullanıcıya Rütbe Rolü Atama API'si
  app.post('/api/assign-user-role', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Sunucu bulunamadı' });
      }
      const { DiscordSyncService } = await import('./src/services/discordSyncService.ts');
      const { userId, rankLevel } = req.body;
      const targetUserId = userId || guild.ownerId || '728894195359547433';
      const targetRank = Number(rankLevel) || 5; // Default OG (5)
      const success = await DiscordSyncService.syncMemberRole(guild, targetUserId, targetRank, 'Yetkili Rol Ataması');
      res.json({ success, userId: targetUserId, rankLevel: targetRank });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Bot Durum / Aktivite Güncelleme API'si
  app.post('/api/update-presence', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      if (!client || !client.user) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil' });
      }
      const activityName = req.body?.name || "BLOOD'S | /yardim";
      client.user.setPresence({
        status: 'online',
        activities: [{ name: activityName, type: 3 }] // 3 = ActivityType.Watching
      });
      res.json({ success: true, activity: activityName, status: 'online' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  // Slash Komut Senkronizasyonu (Çift komutları temizleyip tekil kaydeder)
  app.post('/api/sync-commands', async (req, res) => {
    try {
      await mtaBot.deploySlashCommands();
      res.json({ success: true, message: 'Slash komutları senkronize edildi ve kopyalar temizlendi.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // 26 Paneli İlgili Özel Kanallara Dağıtma API'si
  app.post('/api/deploy-all-panels', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }
      const result = await SetupService.distributeAllPanels(guild);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Botun Yazdığı Mesajları ve Panelleri Temizleme API'si
  app.post('/api/purge-all-panels', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }
      const result = await SetupService.purgeAllPanels(guild);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Tam Sunucu Aktarımı: Rolleri, Kategorileri, Kanalları Kurar, Eski Bot Mesajlarını Siler ve Panelleri Tekrar Atar
  app.post('/api/setup-guild', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }

      // 1. Sunucu kurulumu (Roller, Başarımlar, Kategoriler, Kanallar)
      const setupResult = await SetupService.executeGuildSetup(guild.id, 'Sistem Yöneticisi', guild);

      // 2. 728894195359547433 ve Super Adminlere sunucuda otomatik Under OG rolünü ata
      const { DiscordSyncService } = await import('./src/services/discordSyncService.ts');
      const { SUPER_ADMIN_IDS } = await import('./src/config/index.ts');
      const { RankLevel } = await import('./src/types/index.ts');

      for (const adminId of SUPER_ADMIN_IDS) {
        try {
          await DiscordSyncService.syncMemberRole(guild, adminId, RankLevel.UNDER_OG, 'Sistem Yöneticisi Rol Ataması');
        } catch (syncErr: any) {
          console.warn(`[SYNC] Admin rol atama uyarısı:`, syncErr?.message);
        }
      }

      res.json({
        success: true,
        guildId: guild.id,
        guildName: guild.name,
        stats: setupResult.stats,
        report: setupResult.report,
        message: 'Sunucu yapısı başarıyla aktarıldı, eski bot mesajları silindi ve 26 panel ilgili kanallara yerleştirildi!'
      });
    } catch (err: any) {
      console.error('[SETUP HATASI]', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Kanal İzinlerini Senkronize Etme API'si:
  // 1. Yeni gelenler (@everyone) SADECE başvuru kanalını (#📝・katılım-başvuru) görebilir
  // 2. Yönetim ses odalarını yalnızca OG ve Under OG görebilir
  // 3. Metin sohbet kanallarında resim/video/dosya yükleme kapatılır
  // 4. Medya kanallarında resim/video açık bırakılır
  // Kanal İzinlerini Senkronize Etme ve Güvenlik Onarımı API'si
  app.post('/api/sync-permissions', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }
      const result = await PermissionAuditService.enforceGuildPermissions(guild);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Sunucu İzinlerini Denetleme API'si
  app.get('/api/audit-permissions', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }
      const report = await PermissionAuditService.auditGuild(guild);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Kullanıcı İsteği: 6 Yeni Sistemi Tek Seferde Canlı Sunucuya Dağıtma ve Yayınlama API'si
  app.post('/api/deploy-all-new-systems', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot henüz hazır değil veya bir Discord sunucusunda bulunamadı.' });
      }

      await guild.channels.fetch().catch(() => {});
      await guild.roles.fetch().catch(() => {});

      const deploymentLog: string[] = [];

      // 1. Sunucu kurulumu (Roller ve Kanalları kurar, eksik kanalları oluşturur)
      const setupRes = await SetupService.executeGuildSetup(guild.id, 'Sistem Yöneticisi', guild);
      deploymentLog.push(`Sunucu altyapısı kontrol edildi: ${setupRes.stats.createdChannels} yeni kanal, ${setupRes.stats.createdCategories} yeni kategori oluşturuldu.`);

      // 2. Rollerin Ayrı Gösterimini (Hoist) sağla (1x, 2x, 3x Uyarı dahil)
      const hoistRes = await SetupService.ensureAllRolesHoisted(guild);
      deploymentLog.push(`Rol ayrı gösterimleri (hoist) tamamlandı: ${hoistRes.updatedCount} rol güncellendi.`);

      // 3. Yönlendirme Kanalı (#🗺️・kanal-rehberi) Yayınla
      const guideRes = await GuideService.publishOrUpdateGuide(guild);
      deploymentLog.push(`Kanal rehberi yayınlandı: ${guideRes.success ? 'Başarılı' : guideRes.message}`);

      // 4. Rütbe Bilgilendirme (#👑・rütbe-bilgilendirme) Yayınla
      const rankRes = await RankService.publishRankGuide(guild);
      deploymentLog.push(`Rütbe bilgilendirme yayınlandı: ${rankRes.success ? 'Başarılı' : rankRes.message}`);

      // 5. İnaktiflik Bildirim Paneli (#🌴・inaktiflik-bildir) Yayınla
      let inactPanelStatus = 'Kanal bulunamadı';
      const inactChannel: any = guild.channels.cache.find((c: any) =>
        c.name.includes('inaktiflik-bildir') || c.name.includes('inaktiflik')
      );
      if (inactChannel && 'send' in inactChannel) {
        try {
          const msgs = await inactChannel.messages.fetch({ limit: 15 }).catch(() => null);
          if (msgs) {
            for (const [, m] of msgs) {
              if (m.author.id === client?.user?.id) {
                await m.delete().catch(() => {});
              }
            }
          }
          await inactChannel.send({
            embeds: [InactivityService.getInactivityPanelEmbed()],
            components: [InactivityService.getInactivityPanelButton()]
          });
          inactPanelStatus = 'Başarıyla yayınlandı';
        } catch (e: any) {
          inactPanelStatus = `Hata: ${e?.message}`;
        }
      }
      deploymentLog.push(`İnaktiflik bildirim paneli: ${inactPanelStatus}`);

      // 5.5. Katılım Başvuru Portalı (#📝・katılım-başvuru) Yayınla
      const appPanelRes = await ApplicationService.publishOrUpdateApplicationPanel(guild);
      deploymentLog.push(`Katılım başvuru portalı: ${appPanelRes.success ? 'Başarıyla yayınlandı' : appPanelRes.message}`);

      // 6. Slash Komutlarını Discord'a Senkronize Et
      try {
        await mtaBot.deploySlashCommands();
        deploymentLog.push('Slash komutları (/uyari, /inaktiflik, /rehber-guncelle, /rutbe-bilgi) Discord API ile senkronize edildi.');
      } catch (cmdErr: any) {
        deploymentLog.push(`Slash komut senkronizasyon uyarısı: ${cmdErr?.message}`);
      }

      // 7. İzin Güvenliğini Çalıştır (@everyone kısıtlamaları, public/private izolasyon)
      const auditRes = await PermissionAuditService.enforceGuildPermissions(guild);
      deploymentLog.push(`Kanal ve rol izinleri uygulandı: Skor %${auditRes.report.score}, ${auditRes.report.fixedChannelsCount} kanal güvene alındı.`);

      res.json({
        success: true,
        guildId: guild.id,
        guildName: guild.name,
        deploymentLog,
        guideStatus: guideRes.success,
        rankGuideStatus: rankRes.success,
        inactPanelStatus,
        permissionScore: auditRes.report.score,
        message: 'Kullanıcının talep ettiği tüm 6 sistem başarıyla Discord sunucusuna dağıtıldı ve yayınlandı!'
      });
    } catch (err: any) {
      console.error('[DEPLOY SYSTEMS HATASI]', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Canlı Uyarı Sistemi ve Rol Senkronizasyonu Test Endpoint'i
  app.post('/api/test-live-warning', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Sunucu bulunamadı' });
      }

      const testUserId = req.body?.userId || guild.ownerId || '728894195359547433';

      // 1. Uyarı Ver
      const addRes = await WarningService.addWarning({
        discordUserId: testUserId,
        discordUsername: 'Sunucu Yöneticisi',
        reason: 'Sistem Entegrasyon ve Doğrulama Testi (Otomatik)',
        proof: 'https://cdn.discordapp.com/attachments/test-proof',
        executorId: client.user?.id || '1566439978895155380',
        executorName: client.user?.username || 'F3 Bot',
        guild
      });

      // 2. Uyarıyı Kaldır
      const removeRes = await WarningService.removeWarning({
        discordUserId: testUserId,
        revokedBy: 'F3 Bot (Test Denetimi)',
        revokedReason: 'Başarılı entegrasyon testi tamamlandı, test uyarısı kaldırıldı.',
        guild
      });

      res.json({
        success: true,
        addResult: addRes,
        removeResult: removeRes,
        message: 'Canlı uyarı ekleme, rol senkronizasyonu, loglama ve kaldırma testi başarıyla tamamlandı!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Başvuru Portalını Güncelleme ve Yayınlama API'si
  app.post('/api/publish-application-portal', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) return res.status(404).json({ success: false, error: 'Sunucu bulunamadı' });

      const result = await ApplicationService.publishOrUpdateApplicationPanel(guild);
      await mtaBot.deploySlashCommands().catch(() => {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Başvuru Kanalı ve Mesaj Durumu API'si
  app.get('/api/check-application-status', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) return res.status(404).json({ error: 'Guild not ready' });

      await guild.channels.fetch();
      const appChan: any = guild.channels.cache.find((c: any) => c.name.includes('katılım-başvuru') || c.name.includes('basvuru'));
      if (!appChan) return res.status(404).json({ error: 'katılım-başvuru kanalı bulunamadı' });

      const msgs = await appChan.messages.fetch({ limit: 10 }).catch(() => null);
      const messagesData = msgs ? msgs.map((m: any) => ({
        id: m.id,
        author: m.author.tag,
        content: m.content,
        embeds: m.embeds.map((e: any) => ({ title: e.title, description: e.description })),
        components: m.components.map((c: any) => c.components.map((b: any) => ({ customId: b.customId, label: b.label })))
      })) : [];

      const overwritesData = appChan.permissionOverwrites.cache.map((ow: any) => {
        const role = guild.roles.cache.get(ow.id);
        return {
          id: ow.id,
          name: role ? role.name : ow.id,
          allow: ow.allow.toArray(),
          deny: ow.deny.toArray()
        };
      });

      res.json({
        channelId: appChan.id,
        channelName: appChan.name,
        parentId: appChan.parentId,
        parentName: appChan.parent?.name,
        messagesCount: messagesData.length,
        messages: messagesData,
        overwrites: overwritesData
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // Kullanıcı Talebi: Yalnızca silinen duyurular kanalını geri yükle (başka hiçbir silinen kanalı ekleme!)
  app.post('/api/restore-announcement-channel', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Bot hazır değil veya sunucu bulunamadı' });
      }

      await guild.channels.fetch();
      await guild.roles.fetch();

      // Mevcut duyuru kanalı var mı kontrol et
      let announceChan: any = guild.channels.cache.find((c: any) =>
        c.type === ChannelType.GuildText && (c.name.includes('duyuru') || c.name.includes('duyurular'))
      );

      // Kategori: 📢・BİLGİLENDİRME (1567945247114264687) veya ismi 'bilgilendirme' olan kategori
      const infoCategory: any = guild.channels.cache.get('1567945247114264687') ||
        guild.channels.cache.find((c: any) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('bilgilendirme'));

      const everyoneRole = guild.roles.everyone;
      const ogRole = guild.roles.cache.find((r: any) => r.name.includes('OG') && !r.name.includes('Under'));
      const underOgRole = guild.roles.cache.find((r: any) => r.name.includes('Under OG'));
      const recruiterRole = guild.roles.cache.find((r: any) => r.name.includes('Recruiter'));
      const seniorRole = guild.roles.cache.find((r: any) => r.name.includes('Kıdemli'));
      const memberRole = guild.roles.cache.find((r: any) => r.name.includes('Üye') && !r.name.includes('Kıdemli'));
      const candidateRole = guild.roles.cache.find((r: any) => r.name.includes('Aday'));
      const botUser = client.user;

      const overwrites: any[] = [];

      // Bot: Tam yetkili
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
            PermissionFlagsBits.MentionEveryone,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      // @everyone: Görsün, okusun, reaksiyon versin; KESİNLİKLE mesaj yazamasın, thread açamasın, dosya atamasın
      overwrites.push({
        id: everyoneRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions
        ],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.AttachFiles
        ]
      });

      // Aday: Görsün, okusun, reaksiyon versin; yazamasın
      if (candidateRole) {
        overwrites.push({
          id: candidateRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AddReactions
          ],
          deny: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.SendMessagesInThreads,
            PermissionFlagsBits.AttachFiles
          ]
        });
      }

      // Normal üyeler (Üye, Kıdemli Üye, Recruiter): Görsün, okusun, reaksiyon versin; mesaj yazamasın
      const normalRoles = [memberRole, seniorRole, recruiterRole].filter((r): r is NonNullable<typeof r> => Boolean(r));
      for (const r of normalRoles) {
        overwrites.push({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AddReactions
          ],
          deny: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.SendMessagesInThreads,
            PermissionFlagsBits.AttachFiles
          ]
        });
      }

      // Yönetim (OG ve Under OG): Duyuru atabilir, mesajları silebilir, @everyone etiketleyebilir
      const mgmtRoles = [ogRole, underOgRole].filter((r): r is NonNullable<typeof r> => Boolean(r));
      for (const r of mgmtRoles) {
        overwrites.push({
          id: r.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.MentionEveryone,
            PermissionFlagsBits.AddReactions
          ]
        });
      }

      let isCreated = false;
      if (!announceChan) {
        announceChan = await guild.channels.create({
          name: '📢・duyurular',
          type: ChannelType.GuildText,
          parent: infoCategory?.id,
          topic: "Los Santos Syndicate / BLOOD'S Birlik Resmi Duyuru ve Tebliğ Kanalı. Tüm üyeler buradaki duyuruları takip etmekle yükümlüdür.",
          permissionOverwrites: overwrites
        });
        isCreated = true;
      } else {
        await announceChan.permissionOverwrites.set(overwrites);
        if (infoCategory && announceChan.parentId !== infoCategory.id) {
          await announceChan.setParent(infoCategory.id).catch(() => {});
        }
      }

      // Hoş geldiniz ve resmi duyuru bilgilendirme embed'ini paylaş
      const existingMsgs = await announceChan.messages.fetch({ limit: 5 }).catch(() => null);
      if (!existingMsgs || existingMsgs.size === 0) {
        const announceEmbed = new EmbedBuilder()
          .setTitle("📢 BLOOD'S GANG | RESMİ BİRLİK VE DİSİPLİN DUYURULARI")
          .setDescription(
            "**Los Santos Syndicate / BLOOD'S** birliğinin resmi tebliğleri, operasyon emirleri, diplomasi kararları ve yönetim bildirimleri bu kanaldan ilan edilir.\n\n" +
            '📌 **KANAL KURALLARI VE DİSİPLİN TALİMATI:**\n' +
            '• Tüm çete üyelerinin buradaki duyuruları düzenli takip etmesi ve tebliğlere uyması zorunludur.\n' +
            '• Duyurulara teyit amacıyla reaksiyon (emoji) bırakılması zorunludur.\n' +
            '• Bu kanala yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** lider kadrosu resmi duyuru gönderebilir.\n' +
            '• Normal üyeler ve adaylar duyuruları görebilir ancak kanala mesaj yazamaz.\n' +
            '• Sohbet ve operasyon içi konuşmalar için <#1567945253468635156> kanalını kullanınız.'
          )
          .setColor(0xE67E22) // Turuncu / Gold
          .setFooter({ text: "BLOOD'S Gang © 2026 | Resmi İletişim Karargahı", iconURL: guild.iconURL() || undefined })
          .setTimestamp();

        await announceChan.send({ embeds: [announceEmbed] });
      }

      // Kanal rehberini de otomatik güncelle (Yeni duyuru kanalı rehbere eklensin)
      await GuideService.publishOrUpdateGuide(guild);

      res.json({
        success: true,
        action: isCreated ? 'created' : 'updated_permissions',
        channelId: announceChan.id,
        channelName: announceChan.name,
        parentId: announceChan.parentId,
        parentName: infoCategory?.name || 'BİLGİLENDİRME',
        overwritesCount: overwrites.length,
        message: '📢・duyurular kanalı başarıyla geri getirildi ve izinleri yapılandırıldı. Diğer silinen hiçbir kanala dokunulmadı.'
      });
    } catch (err: any) {
      console.error('[RESTORE ANNOUNCEMENT ERROR]', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Çete İsmi Değişikliği ve Markalama Senkronizasyonu (TRİP -> BLOOD'S)
  app.post('/api/update-gang-branding', async (req, res) => {
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      const newName = req.body?.name || "BLOOD'S";
      const newTag = req.body?.tag || 'BLOOD';

      // 1. Store ve Veritabanı Güncelle
      store.gangInfo.name = newName;
      store.gangInfo.tag = newTag;
      PersistenceService.saveNow();

      const logs: string[] = [];
      logs.push(`Çete adı veritabanında '${newName}' (Etiket: '${newTag}') olarak güncellendi.`);

      // 2. Bot Aktivitesi ve Presence
      if (client?.user) {
        client.user.setPresence({
          status: 'online',
          activities: [{ name: `${newName} | /yardim`, type: 3 }]
        });
        logs.push(`Bot durumu '${newName} | /yardim' olarak güncellendi.`);
      }

      // 3. Sunucu Panellerini Canlı Güncelle
      if (guild) {
        await guild.channels.fetch().catch(() => {});

        // Rütbe Rehberi Güncelle
        const rankRes = await RankService.publishRankGuide(guild);
        logs.push(`Rütbe bilgilendirme paneli güncellendi: ${rankRes.success ? 'Başarılı' : rankRes.message}`);

        // Kanal Rehberi Güncelle
        const guideRes = await GuideService.publishOrUpdateGuide(guild);
        logs.push(`Kanal rehberi haritası güncellendi: ${guideRes.success ? 'Başarılı' : guideRes.message}`);

        // Başvuru Portalı Güncelle
        const appRes = await ApplicationService.publishOrUpdateApplicationPanel(guild);
        logs.push(`Başvuru portalı güncellendi: ${appRes.success ? 'Başarılı' : appRes.message}`);

        // İnaktiflik Paneli Güncelle
        const inactChan: any = guild.channels.cache.find((c: any) => c.name.includes('inaktiflik-bildir'));
        if (inactChan && 'send' in inactChan) {
          const msgs = await inactChan.messages.fetch({ limit: 10 }).catch(() => null);
          if (msgs) {
            for (const [, m] of msgs) {
              if (m.author.id === client?.user?.id) {
                await m.delete().catch(() => {});
              }
            }
          }
          await inactChan.send({
            embeds: [InactivityService.getInactivityPanelEmbed()],
            components: [InactivityService.getInactivityPanelButton()]
          });
          logs.push('İnaktiflik bildirim paneli yeni isimle güncellendi.');
        }

        // Duyuru Kanalındaki Başlangıç Tebliğini Güncelle
        const duyuruChan: any = guild.channels.cache.find((c: any) => c.name.includes('duyurular'));
        if (duyuruChan && 'send' in duyuruChan) {
          const msgs = await duyuruChan.messages.fetch({ limit: 10 }).catch(() => null);
          if (msgs) {
            for (const [, m] of msgs) {
              if (m.author.id === client?.user?.id) {
                await m.delete().catch(() => {});
              }
            }
          }
          const announceEmbed = new EmbedBuilder()
            .setTitle(`📢 ${newName.toUpperCase()} GANG | RESMİ BİRLİK VE DİSİPLİN DUYURULARI`)
            .setDescription(
              `**Los Santos Syndicate / ${newName}** birliğinin resmi tebliğleri, operasyon emirleri, diplomasi kararları ve yönetim bildirimleri bu kanaldan ilan edilir.\n\n` +
              '📌 **KANAL KURALLARI VE DİSİPLİN TALİMATI:**\n' +
              '• Tüm çete üyelerinin buradaki duyuruları düzenli takip etmesi ve tebliğlere uyması zorunludur.\n' +
              '• Duyurulara teyit amacıyla reaksiyon (emoji) bırakılması zorunludur.\n' +
              '• Bu kanala yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** lider kadrosu resmi duyuru gönderebilir.\n' +
              '• Normal üyeler ve adaylar duyuruları görebilir ancak kanala mesaj yazamaz.\n' +
              '• Sohbet ve operasyon içi konuşmalar için <#1567945253468635156> kanalını kullanınız.'
            )
            .setColor(0xE67E22)
            .setFooter({ text: `${newName} Gang © 2026 | Resmi İletişim Karargahı`, iconURL: guild.iconURL() || undefined })
            .setTimestamp();

          await duyuruChan.send({ embeds: [announceEmbed] });
          logs.push('Resmi duyuru başlangıç paneli yeni isimle güncellendi.');
        }

        // Sunucu İsmi Güncelleme Denemesi (Yetki Varsa)
        try {
          if (guild.name.includes('T.R.İ.P') || guild.name.includes('TRIP')) {
            await guild.setName(`${newName} GANG`, 'Kullanıcı talebiyle çete ismi değişikliği');
            logs.push(`Discord sunucu adı '${newName} GANG' olarak güncellendi.`);
          }
        } catch (nameErr: any) {
          logs.push(`Sunucu adı güncelleme notu (yetki/sınır): ${nameErr?.message || nameErr}`);
        }
      }

      res.json({
        success: true,
        gangName: newName,
        gangTag: newTag,
        logs,
        message: `Çete ismi başarıyla '${newName}' olarak güncellendi ve tüm Discord panellerine yansıtıldı!`
      });
    } catch (err: any) {
      console.error('[BRANDING UPDATE ERROR]', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  if (isProduction) {
    // Üretim ortamında dist/ klasöründen servis et
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Geliştirme ortamında Vite middleware'i bağla
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SUNUCU] MTA İllegal Birlik Web & Bot Motoru port ${port} üzerinde 7/24 aktif!`);
  });

  // 7/24 Dahili Canlılık ve Otomatik Bekçi Sinyali (Internal Self-Ping Keep-Alive)
  setInterval(() => {
    try {
      fetch(`http://127.0.0.1:${port}/api/health`).catch(() => {});
      if (mtaBot.isBotReady()) {
        mtaBot.refreshPresence();
      }
    } catch {}
  }, 30000);

  // Discord Botunu 7/24 Otomatik Başlat
  try {
    console.log('[BOT MOTORU] Discord botu 7/24 arka plan servisi başlatılıyor...');
    await mtaBot.start();

    // 1568998255319187537 ID'li rolün ayrı gösterilmemesini (hoist: false) sağla
    try {
      const client = mtaBot.getClient();
      const guild = client?.guilds?.cache?.first();
      if (guild) {
        const targetRole = await guild.roles.fetch('1568998255319187537').catch(() => null);
        if (targetRole && targetRole.hoist) {
          await targetRole.edit({
            hoist: false,
            reason: 'Kullanıcı talimatı: 1568998255319187537 ID li rol ayrı gösterilmesin'
          });
          console.log(`[ROL HOIST] "${targetRole.name}" (${targetRole.id}) başarıyla ayrı gösterilmeyecek şekilde (hoist: false) ayarlandı.`);
        }
      }
    } catch (e: any) {
      console.warn('[ROL HOIST KONTROL]', e.message);
    }
  } catch (err: any) {
    console.error('[BOT MOTORU HATA] Bot başlatılırken hata oluştu:', err?.message || err);
  }
}

startServer().catch((err) => {
  console.error('[KRİTİK SUNUCU HATASI]', err);
  process.exit(1);
});
