/**
 * MTA ILLEGAL BİRLİK YÖNETİM SİSTEMİ - DİSCORD BOT ÇEKİRDEĞİ (DISCORD.JS V14)
 * 7/24 Çalışmaya Uygun, Hata Toleranslı ve Tam Entegre
 */
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  AutocompleteInteraction,
  User,
  Message,
  PermissionsBitField,
  ActivityType
} from 'discord.js';
import dotenv from 'dotenv';
import { dbManager } from '../database/db.ts';
import { BotLogger } from '../utils/logger.ts';
import { slashCommands } from './commands.ts';
import { DiscordPanelRegistry } from '../utils/discordPanels.ts';
import { EmbedBuilderUtil, IDiscordEmbed } from '../utils/embeds.ts';
import { SetupService } from '../services/setupService.ts';
import { MemberService } from '../services/memberService.ts';
import { RankService } from '../services/rankService.ts';
import { EconomyService } from '../services/economyService.ts';
import { ApplicationService } from '../services/applicationService.ts';
import { InventoryService } from '../services/inventoryService.ts';
import {
  VehicleService,
  TerritoryService,
  MissionService,
  WarService,
  DiplomacyService,
  PunishmentService,
  ReportService,
  EvidenceService,
  AnnouncementService,
  InvestigationService,
  StatsService
} from '../services/gangOperationsService.ts';
import { MeetingService } from '../services/meetingService.ts';
import { BackupService } from '../services/backupService.ts';
import { RecruiterService } from '../services/recruiterService.ts';
import { DiscordSyncService } from '../services/discordSyncService.ts';
import { LoadoutService } from '../services/loadoutService.ts';
import { RivalIntelService } from '../services/rivalIntelService.ts';
import { PermissionAuditService } from '../services/permissionAuditService.ts';
import { WarningService } from '../services/warningService.ts';
import { InactivityService } from '../services/inactivityService.ts';
import { GuideService } from '../services/guideService.ts';
import { store } from '../services/store.ts';
import { RankLevel, IMember } from '../types/index.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';
import { SYSTEM_PERMISSIONS, PANEL_CHANNEL_MAPPINGS, SUPER_ADMIN_IDS } from '../config/index.ts';

dotenv.config();

export class MtaDiscordBot {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
    });

    this.setupProcessHandlers();
    this.registerEventHandlers();
  }

  private setupProcessHandlers(): void {
    process.on('uncaughtException', (err: Error) => {
      BotLogger.error('[KRİTİK HATA] Yakalanmamış İstisna (Uncaught Exception):', err);
    });

    process.on('unhandledRejection', (reason: any) => {
      BotLogger.error('[KRİTİK HATA] İşlenmemiş Promise Reddi (Unhandled Rejection):', reason);
    });

    const shutdown = async (signal: string) => {
      BotLogger.info(`[KAPANIŞ] ${signal} sinyali alındı. Bot ve veritabanı güvenli şekilde kapatılıyor...`);
      try {
        await dbManager.disconnect();
        this.client.destroy();
        BotLogger.info('[KAPANIŞ] Bot kapatıldı. Hoşça kalın!');
        process.exit(0);
      } catch (e: any) {
        BotLogger.error('[KAPANIŞ HATASI]', e);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  private registerEventHandlers(): void {
    this.client.on('ready', async () => {
      this.isReady = true;
      BotLogger.info(`[DISCORD] Bot başarıyla bağlandı! Kullanıcı: ${this.client.user?.tag} (${this.client.user?.id})`);

      // 7/24 Aktiflik ve Zengin Durum Bilgisi (Rich Presence)
      if (this.client.user) {
        try {
          this.client.user.setPresence({
            status: 'online',
            activities: [
              {
                name: "BLOOD'S | /yardim",
                type: ActivityType.Watching
              }
            ]
          });
          BotLogger.info('[DISCORD] Bot durumu "Çevrimiçi" ve aktivitesi "BLOOD\'S | /yardim" olarak ayarlandı.');
        } catch (presenceErr: any) {
          BotLogger.warn(`[PRESENCE HATASI] ${presenceErr?.message}`);
        }
      }

      await this.deploySlashCommands();

      for (const [, guild] of this.client.guilds.cache) {
        // Kullanıcı Talebi: Tüm rütbe ve birlik rollerinin çevrimiçi üyelerden ayrı gösterimini (hoist: true) garantiye al
        try {
          const hoistResult = await SetupService.ensureAllRolesHoisted(guild);
          if (hoistResult.updatedCount > 0) {
            BotLogger.info(`[HOIST] ${guild.name} sunucusunda ${hoistResult.updatedCount} rolün ayrı gösterimi (hoist: true) güncellendi.`);
          }
        } catch (err: any) {
          BotLogger.warn(`[HOIST HATASI] (${guild.name}): ${err?.message}`);
        }

        // Sunucu Sahibine otomatik OG rolü ata
        try {
          if (guild.ownerId) {
            await DiscordSyncService.syncMemberRole(guild, guild.ownerId, RankLevel.OG, 'Sunucu Sahibi Otomatik OG Yetkisi');
          }
        } catch (err: any) {
          BotLogger.warn(`[OWNER_ROLE] Sunucu sahibine OG rolü atanırken uyarı: ${err?.message}`);
        }

        // 728894195359547433 ve Super Adminlere sunucuda otomatik Under OG rolünü ata
        for (const adminId of SUPER_ADMIN_IDS) {
          try {
            await DiscordSyncService.syncMemberRole(guild, adminId, RankLevel.UNDER_OG, 'Sistem Yöneticisi Rol Ataması');
          } catch (err: any) {
            BotLogger.warn(`[SUPER_ADMIN] Admin rolü atanırken hata (${adminId}): ${err?.message}`);
          }
        }
      }

      // Otomatik 24 Saatlik Yedekleme (Gece Yedeklemesi)
      setInterval(async () => {
        for (const [, guild] of this.client.guilds.cache) {
          try {
            await DiscordSyncService.dispatchNightlyBackup(guild);
          } catch (err: any) {
            BotLogger.warn(`[BACKUP] Otomatik yedekleme hatası (${guild.name}): ${err?.message}`);
          }
        }
      }, 24 * 60 * 60 * 1000);
    });

    this.client.on('error', (err: any) => {
      BotLogger.warn(`[DISCORD WEBSOCKET HATASI] ${err?.message || err}`);
    });

    this.client.on('shardDisconnect', (event: any, id: number) => {
      BotLogger.warn(`[DISCORD SHARD] Shard ${id} bağlantısı kesildi (Kod: ${event?.code || 'Bilinmiyor'}). Otomatik yeniden bağlanılıyor...`);
    });

    this.client.on('shardReconnecting', (id: number) => {
      BotLogger.info(`[DISCORD SHARD] Shard ${id} ağ geçidine yeniden bağlanıyor...`);
    });

    this.client.on('shardResume', (id: number, replayedEvents: number) => {
      BotLogger.info(`[DISCORD SHARD] Shard ${id} oturumu başarıyla devam ettirildi (${replayedEvents} olay işlendi).`);
      this.refreshPresence();
    });

    this.client.on('guildCreate', async (guild) => {
      BotLogger.info(`[DISCORD] Bot yeni bir sunucuya katıldı: ${guild.name} (${guild.id})`);
      await this.deploySlashCommands();

      for (const adminId of SUPER_ADMIN_IDS) {
        try {
          await DiscordSyncService.syncMemberRole(guild, adminId, RankLevel.UNDER_OG, 'Sistem Yöneticisi Rol Ataması');
        } catch (err: any) {
          BotLogger.warn(`[SUPER_ADMIN] Admin rolü atanırken hata (${adminId}): ${err?.message}`);
        }
      }
    });

    this.client.on('interactionCreate', async (interaction: Interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleChatInput(interaction);
        } else if (interaction.isAutocomplete()) {
          await this.handleAutocomplete(interaction);
        } else if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenu(interaction);
        } else if (interaction.isButton()) {
          await this.handleButton(interaction);
        } else if (interaction.isModalSubmit()) {
          await this.handleModalSubmit(interaction);
        }
      } catch (err: any) {
        // Discord API 10062 (Unknown interaction) veya 40060 (Already acknowledged)
        // Kullanıcı etkileşiminin zaman aşımına uğraması veya çift oturum çakışmasını sessizce karşıla
        if (err?.code === 10062 || err?.rawError?.code === 10062) {
          BotLogger.warn('[INTERACTION] Etkileşim süresi doldu veya başka işlem tarafından yanıtlandı (10062).');
          return;
        }
        if (err?.code === 40060 || err?.rawError?.code === 40060) {
          BotLogger.warn('[INTERACTION] Etkileşim zaten yanıtlanmış (40060).');
          return;
        }

        BotLogger.error('[INTERACTION HATASI]', err);
        const errorEmbed = EmbedBuilderUtil.error(
          'İşlem Gerçekleştirilemedi',
          'Sistem bu isteği işlerken beklenmeyen bir teknik hata ile karşılaştı. Hata loglara kaydedildi.'
        );

        if (interaction.isRepliable()) {
          try {
            if (interaction.deferred || interaction.replied) {
              await interaction.followUp({ embeds: [errorEmbed as any], ephemeral: true }).catch(() => {});
            } else {
              await interaction.reply({ embeds: [errorEmbed as any], ephemeral: true }).catch(() => {});
            }
          } catch {
            // Yanıt verilemeyen etkileşimleri sessizce yut
          }
        }
      }
    });

    // Sohbete resim/video atılmasını engelleme filtresi (Kullanıcı talebi: "Sohbete resim veya video atılamasın")
    this.client.on('messageCreate', async (message: Message) => {
      try {
        if (!message.guild || message.author.bot) return;

        const chanName = message.channel && 'name' in message.channel ? (message.channel as any).name.toLowerCase() : '';
        
        // Medya paylaşımı yasaklanan salt metin sohbet kanalları
        const textOnlyChatNames = ['genel-sohbet', 'sokak-sohbeti', 'muhabbet-odası', 'muhabbet-köşesi', 'birlik-sohbet', 'birlik-muhabbet', 'tim-sohbeti', 'ekip-sohbet'];
        const isTextOnlyChat = textOnlyChatNames.some(t => chanName.includes(t));

        if (isTextOnlyChat) {
          const hasAttachment = message.attachments && message.attachments.size > 0;
          const content = message.content.toLowerCase();
          const mediaIndicators = [
            '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm',
            'tenor.com', 'giphy.com', 'youtube.com', 'youtu.be', 'tiktok.com',
            'cdn.discordapp.com/attachments/', 'media.discordapp.net/attachments/'
          ];
          const hasMediaLink = mediaIndicators.some(ext => content.includes(ext));

          if (hasAttachment || hasMediaLink) {
            // Süper Admin veya Yönetici istisnası (OG / Under OG)
            const isSuperAdmin = SUPER_ADMIN_IDS.includes(message.author.id);
            const memberObj = message.member;
            const hasAdminPerm = memberObj?.permissions?.has(PermissionsBitField.Flags.Administrator);

            if (!isSuperAdmin && !hasAdminPerm) {
              if (message.deletable) {
                await message.delete().catch(() => {});
              }
              let warnMsg: any = null;
              if (message.channel && 'send' in message.channel) {
                warnMsg = await (message.channel as any).send({
                  embeds: [
                    EmbedBuilderUtil.warning(
                      '⚠️ Medya Paylaşımı Kısıtlandı',
                      `<@${message.author.id}>, bu sohbette resim veya video paylaşımı yasaktır!\nLütfen medya paylaşımlarınızı **📸・medya-galerisi** veya **🖼️・fotoğraflar** kanalına yapınız.`
                    ) as any
                  ]
                }).catch(() => null);
              }

              if (warnMsg) {
                setTimeout(async () => {
                  await warnMsg.delete().catch(() => {});
                }, 5000);
              }
              return;
            }
          }
        }
      } catch (err: any) {
        BotLogger.warn(`[MESSAGE_CREATE] Mesaj filtreleme hatası: ${err?.message}`);
      }
    });

    // Otomatik Güvenlik Watchdog (Kanal İzinleri Değiştirildiğinde Denetleme)
    this.client.on('channelUpdate', async (oldChan: any, newChan: any) => {
      try {
        if (!newChan.guild) return;
        const name = newChan.name || '';
        const parentName = newChan.parent?.name || '';
        if (PermissionAuditService.isManagementEntity(name, parentName)) {
          const candRole = newChan.guild.roles.cache.find((r: any) => r.name.includes('Aday'));
          const candCanView = candRole && newChan.permissionsFor(candRole)?.has(PermissionsBitField.Flags.ViewChannel);
          const everyoneCanView = newChan.permissionsFor(newChan.guild.roles.everyone)?.has(PermissionsBitField.Flags.ViewChannel);

          if (candCanView || everyoneCanView) {
            BotLogger.warn(`[GÜVENLİK ALARMI] Yönetim kanalında (${name}) yetkisiz erişim tespit edildi!`);
            await DiscordSyncService.sendLog(
              newChan.guild,
              'sistem',
              EmbedBuilderUtil.warning(
                '🚨 GÜVENLİK İHLALİ TESPİT EDİLDİ',
                `**#${name}** yönetim kanalının izinleri değiştirilerek yetkisiz rollere görünür kılındı!\nSistem izinleri otomatik olarak denetleyip korumaya alacaktır.`
              )
            );
            await PermissionAuditService.enforceGuildPermissions(newChan.guild);
          }
        }
      } catch (err: any) {
        BotLogger.warn(`[WATCHDOG HATA] channelUpdate denetiminde hata: ${err?.message}`);
      }
    });
  }

  public async deploySlashCommands(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID || this.client.user?.id;

    if (!token || !clientId) {
      BotLogger.warn('[DISCORD] DISCORD_BOT_TOKEN veya CLIENT_ID eksik. Slash komut kaydı atlandı.');
      return;
    }

    try {
      const rest = new REST({ version: '10' }).setToken(token);
      BotLogger.info('[DISCORD] Slash komutları Discord API\'ye kaydediliyor...');

      // 1. ÇİFT KOMUT ÇÖZÜMÜ:
      // Discord'da bir komut hem global hem de sunucu düzeyinde kayıtlı olduğunda iki kez görünür.
      // Global komut listesini boşaltarak (body: []) çift komut kopyalarını siliyoruz.
      try {
        await rest.put(Routes.applicationCommands(clientId), {
          body: []
        });
        BotLogger.info('[DISCORD] Global komut listesi temizlendi (çift komut gösterimi kaldırıldı).');
      } catch (e: any) {
        BotLogger.warn(`[DISCORD] Global komut temizleme uyarısı: ${e.message}`);
      }

      // 2. Sunucuya özel tekil slash komutları kaydet (anında aktif olur)
      const targetGuilds = new Set<string>();
      if (process.env.DISCORD_GUILD_ID) {
        targetGuilds.add(process.env.DISCORD_GUILD_ID);
      }
      for (const [gid] of this.client.guilds.cache) {
        targetGuilds.add(gid);
      }

      for (const gid of targetGuilds) {
        try {
          await rest.put(Routes.applicationGuildCommands(clientId, gid), {
            body: slashCommands.map(c => c.toJSON())
          });
          BotLogger.info(`[DISCORD] Komutlar sunucuya (${gid}) tekil ve anında kaydedildi.`);
        } catch (e: any) {
          BotLogger.warn(`[DISCORD] Sunucuya (${gid}) komut kaydedilemedi: ${e.message}`);
        }
      }
    } catch (err: any) {
      BotLogger.error('[DISCORD KOMUT KAYIT HATASI]', err);
    }
  }

  /**
   * Komut İşleyicisi (Slash Commands)
   */
  private async handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;

    if (commandName === 'kurulum') {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }
      } catch (err: any) {
        if (err?.code === 10062) return;
        throw err;
      }

      const result = await SetupService.executeGuildSetup(
        interaction.guildId || 'default',
        interaction.user.tag,
        interaction.guild
      );

      const embed = EmbedBuilderUtil.success(
        'Otomatik Discord Sunucu Kurulumu Tamamlandı',
        `Mevcut sunucu analiz edildi ve eksik kategoriler, kanallar, roller ve paneller yapılandırıldı.\n\n` +
        `**İşlem Özeti:**\n` +
        result.report.map(r => `• **${r.name}** [${r.type}]: \`${r.status}\` (${r.details})`).join('\n')
      );
      await interaction.editReply({ embeds: [embed as any] }).catch(() => {});
      return;
    }

    if (commandName === 'panel') {
      const islem = interaction.options.getString('islem');

      if (islem === 'temizle') {
        await interaction.deferReply({ ephemeral: true });
        const res = await SetupService.purgeAllPanels(interaction.guild);
        const embed = EmbedBuilderUtil.success(
          'Tüm Dağıtılmış Paneller Temizlendi',
          `Kanallara daha önce yerleştirilmiş olan panel mesajları tamamen kaldırıldı.\n\n• **Silinen Mesaj:** ${res.count} adet\n• **Kayıtlar:** Sıfırlandı`
        );
        await interaction.editReply({ embeds: [embed as any] });
        return;
      }

      const isDagit = islem === 'dagit';

      if (isDagit) {
        await interaction.deferReply({ ephemeral: true });
        const res = await SetupService.distributeAllPanels(interaction.guild);
        const embed = EmbedBuilderUtil.success(
          'Tüm Paneller İlgili Kanallara Dağıtıldı',
          `Toplam **${res.count}** adet yönetim paneli ait oldukları kanallara yerleştirildi.\n\n` +
          res.results.slice(0, 15).map(r => `• **${r.name}** ➔ #${r.channelName} (\`${r.status}\`)`).join('\n') +
          (res.results.length > 15 ? `\n...ve ${res.results.length - 15} panel daha ilgili kanallarına yerleştirildi.` : '')
        );
        await interaction.editReply({ embeds: [embed as any] });
        return;
      }

      // Bulunulan kanala ait özel paneli tespit et
      const currentChannelName = (interaction.channel as any)?.name?.toLowerCase() || '';
      const matchingMapping = PANEL_CHANNEL_MAPPINGS.find(m =>
        m.channelCandidateNames.some(cand => cand.toLowerCase() === currentChannelName) ||
        m.defaultChannelName.toLowerCase() === currentChannelName
      );

      if (matchingMapping && interaction.options.getString('islem') !== 'kanal') {
        // Bu kanalın kendine özel paneli var! Doğrudan bu kanala ait paneli aç
        await interaction.deferReply();
        const panelData = DiscordPanelRegistry.getPanel(matchingMapping.panelId);

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let currentRow = new ActionRowBuilder<ButtonBuilder>();

        for (let i = 0; i < panelData.buttons.length; i++) {
          const b = panelData.buttons[i];
          let style = ButtonStyle.Primary;
          if (b.style === 'SUCCESS') style = ButtonStyle.Success;
          if (b.style === 'DANGER') style = ButtonStyle.Danger;
          if (b.style === 'SECONDARY') style = ButtonStyle.Secondary;

          const btn = new ButtonBuilder()
            .setCustomId(b.customId)
            .setLabel(b.label)
            .setStyle(style);

          if (b.emoji) btn.setEmoji(b.emoji);
          currentRow.addComponents(btn);

          if (currentRow.components.length === 5 || i === panelData.buttons.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
          }
        }

        await interaction.editReply({
          embeds: [panelData.embed as any],
          components: rows
        });
        return;
      }

      // Genel kanalda çalıştırıldıysa veya menü istendiyse
      await interaction.deferReply();
      const mainEmbed = EmbedBuilderUtil.mainPanel();
      const menuRows = this.createCategoryMenuRows();

      const distributeBtn = new ButtonBuilder()
        .setCustomId('btn_distribute_all_panels')
        .setLabel('Tüm 25 Paneli İlgili Kanallara Dağıt')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀');
      const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(distributeBtn);

      await interaction.editReply({
        embeds: [mainEmbed as any],
        components: [...menuRows, btnRow]
      });
      return;
    }

    if (commandName === 'profil') {
      const targetUser = interaction.options.getUser('kullanici') || interaction.user;
      const targetMember = store.members.find(m => m.discordUserId === targetUser.id);

      if (!targetMember) {
        const embed = EmbedBuilderUtil.createDefault(
          '👤 Birlik Kimlik Kartı Bulunamadı',
          `<@${targetUser.id}> adlı kullanıcı henüz resmi olarak birliğe kayıtlı değil.\nKatılmak için **/panel** üzerinden başvuru yapabilirsiniz.`
        );
        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }

      const activeVehicles = store.vehicles.filter(v => v.assignedMemberId === targetMember.id);
      const activeLoadouts = LoadoutService.getByMemberId(targetMember.id).filter(l => l.status === 'Zimmetli');

      const embed: IDiscordEmbed = {
        title: `🪪 BİRLİK KİMLİK KARTI: ${targetMember.currentMtaName}`,
        description:
          `**Discord:** <@${targetMember.discordUserId}> (\`${targetMember.discordUsername}\`)\n` +
          `**Rütbe:** 🎖️ **${targetMember.rankName}** (Seviye ${targetMember.rankLevel})\n` +
          `**Durum:** 🟢 \`${targetMember.status}\` | **Katılım:** ${new Date(targetMember.joinedAt).toLocaleDateString('tr-TR')}\n\n` +
          `⭐ **Tecrübe (XP):** \`${targetMember.xp} XP\` (Aktivite: ${targetMember.activityPoints} Puan)\n` +
          `⚠️ **Disiplin Uyarısı:** \`${targetMember.warningsCount} / 3\`\n` +
          `🎯 **Tamamlanan Görev:** \`${targetMember.completedMissionsCount} Operasyon\``,
        color: 0x5865f2,
        fields: [
          {
            name: '🚗 Zimmetli Araçlar',
            value: activeVehicles.length === 0 ? 'Zimmetli araç yok.' : activeVehicles.map(v => `• ${v.name} [${v.plate}] (${v.status})`).join('\n'),
            inline: true
          },
          {
            name: '🔫 Zimmetli Zula & Mühimmat',
            value: activeLoadouts.length === 0 ? 'Zimmetli mühimmat yok.' : activeLoadouts.map(l => `• ${l.quantity}x ${l.itemName} (+${l.ammo} Mermi)`).join('\n'),
            inline: true
          }
        ],
        footer: { text: `MTA Illegal Birlik Kimlik Doğrulama Sistemi • ID: ${targetMember.currentMtaId}` }
      };

      await interaction.reply({ embeds: [embed as any] });
      return;
    }

    if (commandName === 'kasa') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'bakiye') {
        const balance = EconomyService.getBalance();
        const embed = EmbedBuilderUtil.createDefault(
          '💰 Birlik Kasa Bakiyesi',
          `Güncel Kasa Mevcudu: **$${balance.toLocaleString('tr-TR')}**\nPara yatırmak veya çekmek için ana paneli kullanabilirsiniz.`
        );
        await interaction.reply({ embeds: [embed as any] });
        return;
      }
      if (sub === 'yatir') {
        const amount = interaction.options.getInteger('tutar', true);
        const category = interaction.options.getString('kategori', true);
        const desc = interaction.options.getString('aciklama', true);
        const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);
        const res = EconomyService.executeTransaction({
          type: 'Para Yatırma',
          amount,
          category,
          description: desc,
          executorId: executor.discordUserId,
          executorName: executor.discordUsername
        });
        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [EmbedBuilderUtil.success('Para Yatırıldı', res.message) as any] });
        }
        return;
      }
      if (sub === 'cek') {
        const amount = interaction.options.getInteger('tutar', true);
        const category = interaction.options.getString('kategori', true);
        const desc = interaction.options.getString('aciklama', true);
        const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);
        const res = EconomyService.executeTransaction({
          type: 'Para Çekme',
          amount,
          category,
          description: desc,
          executorId: executor.discordUserId,
          executorName: executor.discordUsername
        });
        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Çekim Başarısız', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [EmbedBuilderUtil.success('Para Çekildi', res.message) as any] });
        }
        return;
      }
    }

    if (commandName === 'rutbe') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'terfi') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('neden', true);
        const executor = this.ensureExecutorMember(interaction.user);

        let target = store.members.find(m => m.discordUserId === targetUser.id);
        if (!target) {
          const addRes = MemberService.addMember({
            discordUserId: targetUser.id,
            discordUsername: targetUser.username,
            mtaName: `${targetUser.username}_IC`,
            executorId: executor.discordUserId,
            executorName: executor.discordUsername
          });
          if (addRes.member) target = addRes.member;
        }

        if (!target) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', 'Hedef üye bulunamadı.') as any], ephemeral: true });
          return;
        }

        const res = RankService.promoteMember({
          targetMemberId: target.id,
          executorDiscordId: executor.discordUserId,
          reason
        });

        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Terfi Başarısız', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({
            embeds: [
              EmbedBuilderUtil.success(
                '🎖️ Terfi İşlemi Onaylandı',
                `<@${targetUser.id}> adlı üye başarıyla **${res.newRank?.name}** seviyesine yükseltildi!\n\n📋 **Gerekçe:** ${reason}\n👤 **Onaylayan Yetkili:** <@${interaction.user.id}>`
              ) as any
            ]
          });
        }
        return;
      }
      if (sub === 'tenzil') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('neden', true);
        const executor = this.ensureExecutorMember(interaction.user);

        const target = store.members.find(m => m.discordUserId === targetUser.id);
        if (!target) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', 'Bu kullanıcı henüz birlik üyesi değil.') as any], ephemeral: true });
          return;
        }

        const res = RankService.demoteMember({
          targetMemberId: target.id,
          executorDiscordId: executor.discordUserId,
          reason
        });

        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Tenzil Başarısız', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({
            embeds: [
              EmbedBuilderUtil.success(
                '⬇️ Rütbe Düşürme (Tenzil) Uygulandı',
                `<@${targetUser.id}> adlı üyenin rütbesi **${res.newRank?.name}** seviyesine düşürüldü.\n\n📋 **Gerekçe:** ${reason}\n👤 **Yetkili:** <@${interaction.user.id}>`
              ) as any
            ]
          });
        }
        return;
      }
      if (sub === 'hiyerarsi') {
        const ranks = RankService.getAll();
        const embed = EmbedBuilderUtil.createDefault(
          '🎖️ Birlik 5 Seviyeli Kesin Hiyerarşi',
          '**Kesin Hiyerarşik Sıralama (En Yüksekten En Düşüğe):**\n\n' +
            ranks.map(r => `• **Seviye ${r.level}: ${r.name}**\n  *${r.description}* (${r.permissions.length} yetki)`).join('\n\n')
        );
        await interaction.reply({ embeds: [embed as any] });
        return;
      }
    }

    if (commandName === 'uye') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'liste') {
        const members = MemberService.getAll();
        const embed = EmbedBuilderUtil.createDefault(
          '👥 Birlik Üye Listesi',
          `Toplam Kayıtlı Üye: **${members.length}**\n\n` +
            members.map(m => `• **${m.discordUsername}** — ${m.rankName} (MTA: ${m.currentMtaName}) [${m.status}]`).join('\n')
        );
        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }
      if (sub === 'profil') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const member = store.members.find(m => m.discordUserId === targetUser.id);
        if (!member) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Bu kullanıcı henüz birlik üyesi olarak kayıtlı değil.') as any], ephemeral: true });
          return;
        }
        const embed = EmbedBuilderUtil.createDefault(
          `👤 Üye Profili: ${member.discordUsername}`,
          `**Rütbe:** ${member.rankName} (Seviye ${member.rankLevel})\n` +
            `**MTA Karakter:** ${member.currentMtaName} (${member.currentMtaId})\n` +
            `**Durum:** \`${member.status}\`\n` +
            `**XP:** ${member.xp} | **Aktivite Puanı:** ${member.activityPoints}\n` +
            `**Uyarı Sayısı:** ${member.warningsCount}\n` +
            `**Katılım:** ${new Date(member.joinedAt).toLocaleDateString('tr-TR')}`
        );
        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }
    }

    if (commandName === 'istatistik') {
      const stats = StatsService.getStats();
      const embed = EmbedBuilderUtil.createDefault(
        '📊 Birlik Genel İstatistik Raporu',
        `👥 **Üyeler:** Toplam: ${stats.totalMembers} | Aktif: ${stats.activeMembers}\n` +
          `💰 **Kasa Bakiyesi:** $${stats.balance.toLocaleString('tr-TR')}\n` +
          `📋 **Başvurular:** ${stats.totalApps} (Onay Oranı: %${stats.acceptRate})\n` +
          `🚗 **Araç Filosu:** ${stats.totalVehicles} Araç\n` +
          `🗺️ **Kontrol Bölgeleri:** ${stats.controlledTerritories} Bölge\n` +
          `🎯 **Tamamlanan Görevler:** ${stats.completedMissions}`
      );
      await interaction.reply({ embeds: [embed as any] });
      return;
    }

    if (commandName === 'envanter') {
      const p = DiscordPanelRegistry.getPanel('envanter');
      await interaction.reply({ embeds: [p.embed as any] });
      return;
    }

    if (commandName === 'yedek') {
      const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);
      const res = BackupService.createBackup(executor.discordUsername);
      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Yedek Başarıyla Alındı', `Veritabanı yedeği alındı.\nBoyut: **${res.backupJson?.length || 0} karakter**`) as any],
        ephemeral: true
      });
      return;
    }

    if (commandName === 'toplanti') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'liste') {
        const meetings = MeetingService.getAll();
        const embed = EmbedBuilderUtil.createDefault(
          '🏛️ Birlik Toplantıları',
          meetings.length === 0
            ? 'Şu anda kayıtlı toplantı bulunmuyor.'
            : meetings.map(m => `• **${m.title}** (${m.timeString}) [${m.status}]\n  Konu: ${m.subject}`).join('\n\n')
        );
        await interaction.reply({ embeds: [embed as any] });
        return;
      }
      if (sub === 'planla') {
        const title = interaction.options.getString('baslik', true);
        const subject = interaction.options.getString('konu', true);
        const timeStr = interaction.options.getString('saat', true);
        const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);
        const res = MeetingService.createMeeting({
          title,
          subject,
          agenda: 'Birlik içi genel istişare',
          date: new Date(),
          timeString: timeStr,
          scope: 'Genel Birlik',
          organizerId: executor.discordUserId,
          organizerName: executor.discordUsername
        });
        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [EmbedBuilderUtil.success('Toplantı Planlandı', `**${title}** saat **${timeStr}** için planlandı.`) as any] });
        }
        return;
      }
    }

    // ==========================================
    // MADDE 13: YENİ PRATİK SLASH KOMUTLARI
    // ==========================================
    if (commandName === 'zimmet') {
      const sub = interaction.options.getSubcommand();
      const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);

      if (sub === 'ver') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const weapon = interaction.options.getString('silah', true);
        const qty = interaction.options.getInteger('miktar') || 1;
        const ammo = interaction.options.getInteger('mermi') || 150;
        const note = interaction.options.getString('not') || 'Operasyon Görevi';

        let target = this.findMember(targetUser.id) || this.findMember(targetUser.username);
        if (!target) {
          target = MemberService.addMember({
            discordUserId: targetUser.id,
            discordUsername: targetUser.username,
            mtaName: targetUser.displayName || targetUser.username,
            executorId: executor.discordUserId,
            executorName: executor.discordUsername
          }).member;
        }

        const res = LoadoutService.assignLoadout({
          memberId: target!.id,
          memberMtaName: target!.currentMtaName,
          weaponName: weapon,
          quantity: qty,
          ammoCount: ammo,
          purpose: note,
          authorizedById: executor.discordUserId,
          authorizedByName: executor.discordUsername
        });

        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Zimmet Başarısız', res.message) as any], ephemeral: true });
        } else {
          if (interaction.guild) {
            await DiscordSyncService.sendLog(
              interaction.guild,
              'kasa',
              EmbedBuilderUtil.createDefault(
                '🔫 Mühimmat Zimmetlendi',
                `**Zimmetlenen:** <@${targetUser.id}> (${target?.currentMtaName})\n**Silah:** ${weapon} (${qty} Adet)\n**Mermi:** ${ammo} Adet\n**Zimmet No:** \`${res.loadout?.loadoutNumber}\`\n**Yetkili:** <@${interaction.user.id}>`
              )
            );
          }
          await interaction.reply({
            embeds: [EmbedBuilderUtil.success('Silah Zimmetlendi', `**${target?.currentMtaName}** üzerine **${weapon}** (${ammo} Mermi) zimmetlendi.\nZimmet No: \`${res.loadout?.loadoutNumber}\``) as any]
          });
        }
        return;
      }

      if (sub === 'iade') {
        const loadoutNo = interaction.options.getString('zimmet_no', true).trim();
        const qty = interaction.options.getInteger('miktar') || 1;
        const isLost = interaction.options.getBoolean('kayip_mi') || false;
        const condition = isLost ? 'Çatışmada Kayıp / Düştü' : 'Sağlam İade';

        const res = LoadoutService.returnLoadout({
          loadoutId: loadoutNo,
          returnedQuantity: qty,
          isLost,
          condition,
          notes: condition,
          receivedByName: executor.discordUsername,
          executorId: executor.discordUserId,
          executorName: executor.discordUsername
        });

        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('İade Başarısız', res.message) as any], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [EmbedBuilderUtil.success('İade/Zayiat İşlendi', res.message) as any] });
        }
        return;
      }

      if (sub === 'liste') {
        const targetUser = interaction.options.getUser('kullanici');
        let loadouts = LoadoutService.getActive();
        let title = '📋 Aktif Silah & Teçhizat Zimmetleri';

        if (targetUser) {
          const target = this.findMember(targetUser.id) || this.findMember(targetUser.username);
          if (target) {
            loadouts = LoadoutService.getByMemberId(target.id).filter(l => l.status === 'Zimmetli');
            title = `📋 ${target.currentMtaName} - Zimmetli Teçhizatlar`;
          }
        }

        const embed = EmbedBuilderUtil.createDefault(
          title,
          loadouts.length === 0
            ? 'Şu anda kayıtlı aktif silah zimmeti bulunmamaktadır.'
            : loadouts.slice(0, 15).map(l => `• **[${l.loadoutNumber}]** ${l.itemName} (${l.quantity}x, ${l.ammo} Mermi)\n  Zimmetli: \`${l.memberMtaName}\` | Not: *${l.notes || 'Operasyon'}*`).join('\n\n')
        );
        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }
    }

    if (commandName === 'ceza') {
      const sub = interaction.options.getSubcommand();
      const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);

      if (sub === 'ver') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const type = interaction.options.getString('tur', true) as any;
        const reason = interaction.options.getString('sebep', true);
        const days = interaction.options.getInteger('sure_gun') || 0;

        let target = this.findMember(targetUser.id) || this.findMember(targetUser.username);
        if (!target) {
          target = MemberService.addMember({
            discordUserId: targetUser.id,
            discordUsername: targetUser.username,
            mtaName: targetUser.displayName || targetUser.username,
            executorId: executor.discordUserId,
            executorName: executor.discordUsername
          }).member;
        }

        const res = PunishmentService.issuePunishment({
          memberId: target!.id,
          type,
          reason,
          durationDays: days,
          executorId: executor.discordUserId,
          executorName: executor.discordUsername
        });

        if (!res.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
        } else {
          let extraInfo = '';
          const isExpelled = type.toLowerCase().includes('çıkarma') || type.toLowerCase().includes('ihraç') || (target!.warningsCount >= 3);

          if (isExpelled) {
            MemberService.removeMember({
              memberId: target!.id,
              reason: `Disiplin Cezası: ${type} (${reason})`,
              executorId: executor.discordUserId,
              executorName: executor.discordUsername,
              isKick: true
            });
            extraInfo = '\n⚠️ **Üyenin 3 uyarı sınırını aşması veya ihraç cezası alması sebebiyle tüm birlik yetkileri alındı!**';

            if (interaction.guild) {
              await DiscordSyncService.revokeAllGangRoles(interaction.guild, target!.discordUserId, `Ceza: ${type} (${reason})`);
            }
          }

          if (interaction.guild) {
            await DiscordSyncService.sendLog(
              interaction.guild,
              'ceza',
              EmbedBuilderUtil.createDefault(
                '⚖️ Disiplin Cezası Uygulandı',
                `**Cezalandırılan:** <@${targetUser.id}> (${target?.currentMtaName})\n**Ceza Türü:** ${type}\n**Gerekçe:** ${reason}\n**Toplam Uyarı:** ${target?.warningsCount}/3\n**Uygulayan:** <@${interaction.user.id}>${extraInfo}`
              )
            );
          }

          await interaction.reply({
            embeds: [EmbedBuilderUtil.success('Disiplin Cezası Uygulandı', `**${target?.currentMtaName}** adlı üyeye **${type}** cezası uygulandı.\nGerekçe: ${reason}${extraInfo}`) as any]
          });
        }
        return;
      }

      if (sub === 'liste') {
        const targetUser = interaction.options.getUser('kullanici');
        let puns = PunishmentService.getAll();
        let title = '⚖️ Birlik Disiplin ve Ceza Sicili';

        if (targetUser) {
          const target = this.findMember(targetUser.id) || this.findMember(targetUser.username);
          if (target) {
            puns = PunishmentService.getByMemberId(target.id);
            title = `⚖️ ${target.currentMtaName} - Disiplin Sicili`;
          }
        }

        const embed = EmbedBuilderUtil.createDefault(
          title,
          puns.length === 0
            ? 'Kayıtlı herhangi bir disiplin cezası bulunmamaktadır.'
            : puns.slice(0, 10).map(p => `• **[${p.punishmentNumber}]** \`${p.type}\` -> ${p.memberName}\n  Gerekçe: *${p.reason}* (${new Date(p.date).toLocaleDateString('tr-TR')})`).join('\n\n')
        );
        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }
    }

    if (commandName === 'ihrac') {
      const targetUser = interaction.options.getUser('kullanici', true);
      const reason = interaction.options.getString('sebep', true);
      const isCk = interaction.options.getBoolean('ck_mi') || false;
      const executor = this.ensureExecutorMember(interaction.user, interaction.guild, interaction.member);

      const target = this.findMember(targetUser.id) || this.findMember(targetUser.username);
      if (target) {
        MemberService.removeMember({
          memberId: target.id,
          reason: isCk ? `Roleplay Character Kill (CK): ${reason}` : `İhraç: ${reason}`,
          executorId: executor.discordUserId,
          executorName: executor.discordUsername,
          isKick: true
        });
      }

      if (interaction.guild) {
        await DiscordSyncService.revokeAllGangRoles(
          interaction.guild,
          targetUser.id,
          isCk ? `Roleplay CK: ${reason}` : `Birlikten İhraç: ${reason}`,
          isCk
        );

        await DiscordSyncService.sendLog(
          interaction.guild,
          'ceza',
          EmbedBuilderUtil.createDefault(
            isCk ? '🪦 ROLEPLAY CHARACTER KILL (CK) İNFAZI' : '🚫 BİRLİKTEN İHRAÇ KARARI',
            `**İhraç Edilen:** <@${targetUser.id}>\n**İşlem Türü:** ${isCk ? 'Kalıcı Karakter Ölümü (CK)' : 'Kalıcı Birlik İhracı'}\n**Gerekçe:** ${reason}\n**Yetkili:** <@${interaction.user.id}>`
          )
        );
      }

      await interaction.reply({
        embeds: [
          EmbedBuilderUtil.success(
            isCk ? '🪦 Roleplay CK İşlendi' : '🚫 Üye İhraç Edildi',
            `<@${targetUser.id}> kullanıcısının tüm birlik yetkileri ve rolleri geri alındı.\nİşlem: **${isCk ? 'Character Kill (CK)' : 'Kalıcı İhraç'}**\nGerekçe: ${reason}`
          ) as any
        ]
      });
      return;
    }

    if (commandName === 'duyuru') {
      const title = interaction.options.getString('baslik', true);
      const message = interaction.options.getString('mesaj', true);
      const importance = interaction.options.getString('onem') || 'normal';
      const tag = interaction.options.getString('etiket') || 'none';

      let prefixIcon = '📢';
      let embedColor = '#5865F2';
      if (importance === 'onemli') {
        prefixIcon = '⚠️';
        embedColor = '#FEE75C';
      } else if (importance === 'acil') {
        prefixIcon = '🔴';
        embedColor = '#ED4245';
      }

      const announcementEmbed = {
        title: `${prefixIcon} ${title.toUpperCase()}`,
        description: message,
        color: embedColor,
        fields: [
          { name: 'Yayınlayan', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Tarih', value: new Date().toLocaleDateString('tr-TR'), inline: true }
        ],
        footer: { text: `${store.gangInfo.name} • Resmi Birlik Duyurusu` }
      };

      const announcementChannel = interaction.guild?.channels.cache.find(
        (c: any) => c.isTextBased() && c.name.toLowerCase().includes('duyuru')
      ) as any || interaction.channel;

      let tagContent = undefined;
      if (tag === 'everyone') tagContent = '@everyone';
      if (tag === 'members') tagContent = '<@&' + (store.guildConfig.roleMappings?.[RankLevel.UYE] || '') + '>';

      if (announcementChannel && 'send' in announcementChannel) {
        await announcementChannel.send({
          content: tagContent,
          embeds: [announcementEmbed]
        }).catch(() => {});
      }

      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Duyuru Yayınlandı', `Duyuru başarıyla <#${announcementChannel?.id || interaction.channelId}> kanalına gönderildi.`) as any],
        ephemeral: true
      });
      return;
    }

    if (commandName === 'denetim') {
      const limit = interaction.options.getInteger('adet') || 8;
      const count = Math.min(20, Math.max(1, limit));
      const logs = store.auditLogs.slice(0, count);

      const embed = EmbedBuilderUtil.createDefault(
        `🛡️ Sistem Güvenlik & Denetim Kayıtları (Son ${logs.length})`,
        logs.length === 0
          ? 'Kayıtlı denetim logu bulunmuyor.'
          : logs.map(l => `• **[${l.actionType}]** ${l.description}\n  İşleyen: \`${l.executorName}\` | Hedef: \`${l.target}\` (${new Date(l.timestamp).toLocaleTimeString('tr-TR')})`).join('\n\n')
      );

      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (commandName === 'izin-denetimi') {
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
      const memberObj = interaction.member as any;
      const hasAdmin = memberObj?.permissions?.has(PermissionsBitField.Flags.Administrator);
      const isOgOrUnderOg = memberObj?.roles?.cache?.some((r: any) => r.name.includes('OG'));

      if (!isSuperAdmin && !hasAdmin && !isOgOrUnderOg) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Yetkisiz Erişim', 'Bu komutu yalnızca **👑 ┊ OG** veya **⭐ ┊ Under OG** yöneticileri çalıştırabilir.') as any],
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const autoFix = interaction.options.getBoolean('duzelt') ?? true;

      if (!interaction.guild) {
        await interaction.editReply({ content: 'Bu komut yalnızca bir Discord sunucusu içinde kullanılabilir.' });
        return;
      }

      let auditResult: any;
      if (autoFix) {
        const fixRes = await PermissionAuditService.enforceGuildPermissions(interaction.guild);
        auditResult = fixRes.report;
      } else {
        auditResult = await PermissionAuditService.auditGuild(interaction.guild);
      }

      const issuesList = auditResult.issues.slice(0, 10).map((iss: any, idx: number) =>
        `**${idx + 1}. [${iss.severity}]** #${iss.channelName} (${iss.categoryName})\n   • Rol: \`${iss.roleName}\`\n   • Durum: ${iss.problem}`
      ).join('\n\n');

      const embed = {
        title: autoFix ? '🛡️ Sunucu İzin Denetimi ve Güvenlik Onarımı' : '🛡️ Sunucu Rol Bazlı İzin Denetim Raporu',
        description: autoFix
          ? `Tüm sunucu kategorileri ve kanalları taranarak rol hiyerarşisine göre **güvenle yapılandırıldı**.\n\n` +
            `• **Taranan Kanal & Kategori:** ${auditResult.totalChannelsScanned}\n` +
            `• **Güvenlik Skoru:** **%${auditResult.score}**\n` +
            `• **Kalan Risk / Tespit:** ${auditResult.issues.length} Adet`
          : `Sunucu izinleri analiz edildi. Tespit edilen durumlar aşağıda listelenmiştir.\n\n` +
            `• **Taranan Kanal & Kategori:** ${auditResult.totalChannelsScanned}\n` +
            `• **Kritik Risk:** ${auditResult.criticalIssuesFound}\n` +
            `• **Güvenlik Skoru:** **%${auditResult.score}**`,
        color: auditResult.criticalIssuesFound > 0 ? 0xED4245 : 0x57F287,
        fields: [
          {
            name: '📋 İzolasyon & Gizlilik Durumu',
            value:
              `• **Başvuru Adayı İzolasyonu:** \`${auditResult.summary.applicantIsolationStatus}\`\n` +
              `• **Yönetim Odaları Gizliliği:** \`${auditResult.summary.managementPrivacyStatus}\`\n` +
              `• **Recruiter Yetki Sınırı:** \`${auditResult.summary.recruiterScopeStatus}\`\n` +
              `• **Sohbet Medya Kilidi:** \`${auditResult.summary.chatMediaLockStatus}\``,
            inline: false
          },
          ...(auditResult.issues.length > 0
            ? [{ name: '⚠️ İncelenen Kanallar', value: issuesList || 'Tüm kanallar güvenlik standartlarına uygun.', inline: false }]
            : [{ name: '✅ Durum', value: 'Hiçbir yetki ihlali bulunamadı! Tüm yönetim kanalları tam koruma altında.', inline: false }])
        ],
        footer: { text: 'MTA Illegal Birlik • Rol ve İzin Güvenlik Motoru' },
        timestamp: new Date().toISOString()
      };

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ==========================================
    // 1 & 2. UYARI SİSTEMİ VE ROLLERİ (/uyari)
    // ==========================================
    if (commandName === 'uyari') {
      const sub = interaction.options.getSubcommand();
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
      const memberObj = interaction.member as any;
      const isOgOrUnderOg = memberObj?.roles?.cache?.some((r: any) => r.name.includes('OG'));

      if (sub === 'ver') {
        if (!isSuperAdmin && !isOgOrUnderOg) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Yetkisiz Erişim', 'Uyarı cezası verme yetkisi yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** yönetim kadrosuna aittir.') as any],
            ephemeral: true
          });
          return;
        }

        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('sebep', true);
        const proof = interaction.options.getString('kanit') || undefined;

        await interaction.deferReply();

        const res = await WarningService.addWarning({
          discordUserId: targetUser.id,
          discordUsername: targetUser.username,
          reason,
          proof,
          executorId: interaction.user.id,
          executorName: interaction.user.username,
          guild: interaction.guild
        });

        const embed = {
          title: `⚠️ DİSİPLİN UYARISI VERİLDİ: ${res.activeCount}x Uyarı`,
          description: `<@${targetUser.id}> (\`${targetUser.username}\`) kullanıcısına resmi uyarı cezası uygulandı.\n` +
            `Discord rolü otomatik olarak **${res.roleApplied || `${res.activeCount}x Uyarı`}** ile senkronize edildi.\n` +
            `Kayıt **#⚠️・uyarı-log** kanalına kalıcı olarak işlendi.`,
          color: res.activeCount === 1 ? 0xF1C40F : res.activeCount === 2 ? 0xE67E22 : 0xED4245,
          fields: [
            { name: '👤 Cezalandırılan Üye', value: `<@${targetUser.id}>`, inline: true },
            { name: '👮 Yetkili', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🔢 Güncel Seviye', value: `**${res.activeCount}x Uyarı** (${res.activeCount}/3)`, inline: true },
            { name: '📋 Sebep', value: reason, inline: false },
            ...(proof ? [{ name: '🔗 Kanıt', value: proof, inline: false }] : [])
          ],
          footer: { text: "BLOOD'S Gang Disiplin Kurulu" },
          timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (sub === 'sil') {
        if (!isSuperAdmin && !isOgOrUnderOg) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Yetkisiz Erişim', 'Uyarı kaldırma yetkisi yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** yönetim kadrosuna aittir.') as any],
            ephemeral: true
          });
          return;
        }

        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('gerekce', true);

        await interaction.deferReply();

        const res = await WarningService.removeWarning({
          discordUserId: targetUser.id,
          revokedBy: interaction.user.username,
          revokedReason: reason,
          guild: interaction.guild
        });

        if (!res.success) {
          await interaction.editReply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', res.message) as any] });
          return;
        }

        const embed = {
          title: '♻️ UYARI KALDIRILDI',
          description: `<@${targetUser.id}> kullanıcısının son uyarısı kaldırıldı.\nRolü otomatik olarak **${res.remainingActiveCount > 0 ? `${res.remainingActiveCount}x Uyarı` : 'Uyarı Rolü Yok'}** seviyesine güncellendi.`,
          color: 0x2ECC71,
          fields: [
            { name: '👤 Üye', value: `<@${targetUser.id}>`, inline: true },
            { name: '👮 Kaldıran Yetkili', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🔢 Kalan Aktif Uyarı', value: `**${res.remainingActiveCount}x**`, inline: true },
            { name: '📝 Gerekçe', value: reason, inline: false }
          ],
          footer: { text: "BLOOD'S Gang Disiplin Kurulu" },
          timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (sub === 'liste') {
        const targetUser = interaction.options.getUser('kullanici', true);
        const userWarnings = WarningService.getUserWarnings(targetUser.id);
        const activeCount = userWarnings.filter(w => w.active).length;

        const embed = {
          title: `📋 UYARI SİCİL GEÇMİŞİ: ${targetUser.username}`,
          description: `<@${targetUser.id}> kullanıcısına ait tüm aktif ve arşivlenmiş disiplin uyarıları:\n\n` +
            `• **Toplam Kayıt:** ${userWarnings.length} Adet\n` +
            `• **Aktif Uyarı:** **${activeCount}x Uyarı** (${activeCount >= 3 ? '🔴 İHRAÇ SINIRI' : 'Normal'})`,
          color: activeCount === 0 ? 0x2ECC71 : activeCount === 1 ? 0xF1C40F : activeCount === 2 ? 0xE67E22 : 0xED4245,
          fields: userWarnings.length === 0
            ? [{ name: 'Temiz Sicil', value: 'Bu kullanıcının sistemde kayıtlı hiçbir uyarısı bulunmamaktadır.', inline: false }]
            : userWarnings.slice(0, 10).map((w, i) => ({
                name: `${i + 1}. [${w.active ? '🔴 AKTİF' : '⚪ KALDIRILDI'}] ${w.warningNumber}x Uyarı (${new Date(w.createdAt).toLocaleDateString('tr-TR')})`,
                value: `• **Sebep:** ${w.reason}\n• **Yetkili:** \`${w.executorName}\`${w.proof ? `\n• **Kanıt:** ${w.proof}` : ''}${!w.active ? `\n• *Affeden: ${w.revokedBy} (Sebep: ${w.revokedReason})*` : ''}`,
                inline: false
              })),
          footer: { text: "BLOOD'S Gang Disiplin Sicil Sistemi" },
          timestamp: new Date().toISOString()
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    // ==========================================
    // 6. İN-AKTİFLİK BİLDİRİM VE LİSTE (/inaktiflik)
    // ==========================================
    if (commandName === 'inaktiflik') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'bildir') {
        const modal = new ModalBuilder()
          .setCustomId('modal_inactivity_submit')
          .setTitle('🌴 Birlik İn-aktiflik Bildirimi');

        const startInput = new TextInputBuilder()
          .setCustomId('txt_inact_start')
          .setLabel('Başlangıç Tarihi (Örn: 10.11.2026)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('GG.AA.YYYY');

        const endInput = new TextInputBuilder()
          .setCustomId('txt_inact_end')
          .setLabel('Bitiş Tarihi (Örn: 17.11.2026)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('GG.AA.YYYY');

        const reasonInput = new TextInputBuilder()
          .setCustomId('txt_inact_reason')
          .setLabel('İnaktiflik Sebebi')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder('Sınav haftası, şehir dışı seyahat, iş yoğunluğu vb.');

        const notesInput = new TextInputBuilder()
          .setCustomId('txt_inact_notes')
          .setLabel('Ek Açıklama veya Notlar (İsteğe Bağlı)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder('İhtiyaç halinde bana Discord DM üzerinden ulaşabilirsiniz.');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(startInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(endInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
        );

        await interaction.showModal(modal);
        return;
      }

      if (sub === 'liste') {
        const requests = store.inactivityRequests;
        const pending = requests.filter(r => r.status === 'Beklemede');
        const approved = requests.filter(r => r.status === 'Onaylandı');

        const embed = {
          title: '📋 İN-AKTİFLİK VE İZİN DURUM LİSTESİ',
          description: `Birlik üyelerinin mevcut inaktiflik ve izin durumu:\n\n` +
            `• **Onay Bekleyen:** ${pending.length} Talep\n` +
            `• **Aktif İzinli Üye:** ${approved.length} Kişi`,
          color: 0x3498DB,
          fields: [
            {
              name: '⏳ Onay Bekleyen Talepler',
              value: pending.length === 0
                ? 'Onay bekleyen inaktiflik talebi yok.'
                : pending.slice(0, 5).map(p => `• **${p.requestNumber}** | <@${p.discordUserId}> (${p.startDate} - ${p.endDate})\n  *Sebep: ${p.reason}*`).join('\n\n'),
              inline: false
            },
            {
              name: '✅ İzinli Olan Üyeler',
              value: approved.length === 0
                ? 'Şu anda izinli statüsünde üye bulunmuyor.'
                : approved.slice(0, 5).map(a => `• **${a.requestNumber}** | <@${a.discordUserId}> (${a.startDate} - ${a.endDate})\n  *Onaylayan: ${a.reviewedByName}*`).join('\n\n'),
              inline: false
            }
          ],
          footer: { text: "BLOOD'S Gang İdari Takip" },
          timestamp: new Date().toISOString()
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    // ==========================================
    // 3. KANAL REHBERİ YENİLEME (/rehber-guncelle)
    // ==========================================
    if (commandName === 'rehber-guncelle') {
      await interaction.deferReply({ ephemeral: true });
      const res = await GuideService.publishOrUpdateGuide(interaction.guild);
      if (res.success) {
        await interaction.editReply({
          embeds: [EmbedBuilderUtil.success('Kanal Rehberi Güncellendi', 'Sunucudaki tüm kategori ve kanallar dinamik olarak taranıp **#🗺️・kanal-rehberi** kanalına aktarıldı.') as any]
        });
      } else {
        await interaction.editReply({
          embeds: [EmbedBuilderUtil.error('Rehber Güncellenemedi', res.message) as any]
        });
      }
      return;
    }

    // ==========================================
    // BAŞVURU SİSTEMİ (/basvuru yap / basvuru durum)
    // ==========================================
    if (commandName === 'basvuru') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'yap') {
        const modal = new ModalBuilder()
          .setCustomId('modal_app_submit')
          .setTitle('Birlik Katılım Başvuru Formu');

        const oocInput = new TextInputBuilder()
          .setCustomId('txt_app_ooc')
          .setLabel('OOC İsim ve Yaş')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Örn: Ahmet (21)')
          .setRequired(true);

        const mtaInput = new TextInputBuilder()
          .setCustomId('txt_app_mta')
          .setLabel('MTA Karakter Adı')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Örn: Tony_Montana (İsim_Soyisim)')
          .setRequired(true);

        const storyInput = new TextInputBuilder()
          .setCustomId('txt_app_story')
          .setLabel('Karakter Hikayesi & Rol')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Karakterinizin IC hikayesi...')
          .setRequired(true);

        const reasonInput = new TextInputBuilder()
          .setCustomId('txt_app_reason')
          .setLabel('Birliğe Katılma Amacınız')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Neden bu birliği seçtiniz?...')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(oocInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(mtaInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(storyInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
        return;
      }

      if (sub === 'durum') {
        const app = store.applications.find(a => a.discordUserId === interaction.user.id);
        if (!app) {
          await interaction.reply({
            embeds: [
              EmbedBuilderUtil.createDefault(
                'ℹ️ Aktif Başvuru Bulunamadı',
                `Sayın <@${interaction.user.id}>, sistemde adınıza kayıtlı bir katılım başvurusu bulunmamaktadır.\n\n` +
                `**/basvuru yap** komutuyla veya **#📝・katılım-başvuru** kanalındaki butona basarak hemen başvurabilirsiniz!`
              ) as any
            ],
            ephemeral: true
          });
          return;
        }

        const statusEmoji = app.status === 'Kabul Edildi' ? '🟢' : app.status === 'Reddedildi' ? '🔴' : '🟡';
        const embed = {
          title: `📋 BAŞVURU DURUMUNUZ: #${app.applicationNumber}`,
          description: `Sayın <@${interaction.user.id}>, katılım başvurunuzun güncel durumu aşağıda yer almaktadır:`,
          color: app.status === 'Kabul Edildi' ? 0x2ECC71 : app.status === 'Reddedildi' ? 0xE74C3C : 0xF1C40F,
          fields: [
            { name: 'Karakter Adı', value: `\`${app.mtaCharacterName}\``, inline: true },
            { name: 'Durum', value: `${statusEmoji} **${app.status}**`, inline: true },
            { name: 'Başvuru No', value: `#${app.applicationNumber}`, inline: true },
            { name: 'Başvuru Tarihi', value: new Date(app.createdAt).toLocaleString('tr-TR'), inline: true },
            { name: 'Ortalama Puan', value: app.averageScore ? `⭐ **${app.averageScore}/10**` : '⏳ İnceleniyor', inline: true },
            { name: 'Yönetim Notu / Açıklama', value: app.statusReason || (app.status === 'Beklemede' ? 'Başvurunuz sırada bekliyor, en kısa sürede yetkililer tarafından değerlendirilecektir.' : 'İnceleme aşamasında.') }
          ],
          footer: { text: "BLOOD'S Gang Başvuru Takip Sistemi" }
        };

        await interaction.reply({ embeds: [embed as any], ephemeral: true });
        return;
      }

      if (sub === 'onayla') {
        const memberObj = interaction.member as any;
        const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
        const isRecruiterOrMgmt = memberObj?.roles?.cache?.some((r: any) =>
          r.name.includes('OG') || r.name.includes('Recruiter')
        );

        if (!isSuperAdmin && !isRecruiterOrMgmt) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Yetkisiz İşlem', 'Başvuru onaylama yetkisi yalnızca **👑 ┊ OG**, **⭐ ┊ Under OG** ve **🎯 ┊ Recruiter** yetkililerine aittir.') as any],
            ephemeral: true
          });
          return;
        }

        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('aciklama') || 'Yönetim tarafından onaylandı.';

        const app = store.applications.find(a => a.discordUserId === targetUser.id && (a.status === 'Beklemede' || a.status === 'İnceleniyor')) ||
                    store.applications.filter(a => a.discordUserId === targetUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!app) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Başvuru Bulunamadı', `<@${targetUser.id}> kullanıcısına ait bir başvuru kaydı bulunamadı.`) as any],
            ephemeral: true
          });
          return;
        }

        await interaction.deferReply();

        const res = ApplicationService.acceptApplication({
          applicationId: app.id,
          executorId: interaction.user.id,
          executorName: interaction.user.username,
          reason
        });

        if (!res.success) {
          await interaction.editReply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', res.message) as any] });
          return;
        }

        const formattedNick = DiscordSyncService.formatIcNickname(app.mtaCharacterName);
        if (interaction.guild) {
          await DiscordSyncService.syncMemberRole(interaction.guild, app.discordUserId, RankLevel.UYE, 'Başvuru Onayı', formattedNick);
          await DiscordSyncService.sendLog(interaction.guild, 'uye', EmbedBuilderUtil.success(
            'Yeni Birlik Üyesi Katıldı',
            `<@${app.discordUserId}> başvurusu <@${interaction.user.id}> tarafından kabul edildi, sunucu ismi \`${formattedNick}\` yapıldı ve \`🩸 ┊ Üye\` rolü verildi.`
          ));
        }

        // Adaya DM Bildirimi
        try {
          const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
          if (applicantUser) {
            await applicantUser.send({
              embeds: [
                EmbedBuilderUtil.createDefault(
                  '🎉 Katılım Başvurunuz Onaylandı!',
                  `Tebrikler **${formattedNick}**!\n\n` +
                  `**${store.gangInfo.name}** bünyesine katılım başvurunuz onaylanmıştır.\n\n` +
                  `• **Sunucu İsminiz:** \`${formattedNick}\` olarak güncellendi.\n` +
                  `• **Rütbeniz:** \`🩸 ┊ Üye\` rolü tanımlandı.\n` +
                  `• **Erişim:** Birlik kanalları ve ses odaları kullanımınıza açıldı.\n\n` +
                  `Lütfen **📢・duyurular** kanalını takip ediniz.`
                ) as any
              ]
            }).catch(() => {});
          }
        } catch {}

        await interaction.editReply({
          embeds: [
            EmbedBuilderUtil.success(
              '✅ Başvuru Onaylandı',
              `**${app.discordUsername}** (<@${app.discordUserId}>) kullanıcısının başvurusu kabul edildi!\n\n` +
              `• **Sunucu Rumuzu (IC İsim):** \`${formattedNick}\` yapıldı.\n` +
              `• **Verilen Rütbe:** \`🩸 ┊ Üye\` (Seviye 1)\n` +
              `• **Aday Rolü:** Kaldırıldı.\n` +
              `• **Yetkili:** <@${interaction.user.id}>`
            ) as any
          ]
        });
        return;
      }

      if (sub === 'reddet') {
        const memberObj = interaction.member as any;
        const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
        const isRecruiterOrMgmt = memberObj?.roles?.cache?.some((r: any) =>
          r.name.includes('OG') || r.name.includes('Recruiter')
        );

        if (!isSuperAdmin && !isRecruiterOrMgmt) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Yetkisiz İşlem', 'Başvuru reddetme yetkisi yalnızca **👑 ┊ OG**, **⭐ ┊ Under OG** ve **🎯 ┊ Recruiter** yetkililerine aittir.') as any],
            ephemeral: true
          });
          return;
        }

        const targetUser = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('sebep', true);

        const app = store.applications.find(a => a.discordUserId === targetUser.id && (a.status === 'Beklemede' || a.status === 'İnceleniyor')) ||
                    store.applications.filter(a => a.discordUserId === targetUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!app) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Başvuru Bulunamadı', `<@${targetUser.id}> kullanıcısına ait bir başvuru kaydı bulunamadı.`) as any],
            ephemeral: true
          });
          return;
        }

        await interaction.deferReply();

        const res = ApplicationService.rejectApplication({
          applicationId: app.id,
          executorId: interaction.user.id,
          executorName: interaction.user.username,
          reason
        });

        if (!res.success) {
          await interaction.editReply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', res.message) as any] });
          return;
        }

        // Adaya DM Bildirimi
        try {
          const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
          if (applicantUser) {
            await applicantUser.send({
              embeds: [
                EmbedBuilderUtil.warning(
                  '❌ Katılım Başvurunuz Hakkında',
                  `Sayın aday, **${store.gangInfo.name}** birliğimize yaptığınız katılım başvurusu değerlendirilmiş ve şu an için kabul edilmemiştir.\n\n` +
                  `• **Gerekçe:** ${reason}\n\n` +
                  `İlerleyen dönemde kendinizi geliştirip tekrar başvurabilirsiniz.`
                ) as any
              ]
            }).catch(() => {});
          }
        } catch {}

        await interaction.editReply({
          embeds: [
            EmbedBuilderUtil.warning(
              'Başvuru Reddedildi',
              `**${app.discordUsername}** (<@${app.discordUserId}>) kullanıcısının başvurusu reddedildi.\n\n` +
              `• **Gerekçe:** ${reason}\n` +
              `• **Yetkili:** <@${interaction.user.id}>`
            ) as any
          ]
        });
        return;
      }
    }

    await interaction.reply({
      content: `Komut: /${commandName} başarıyla işlendi. Detaylı yönetim için lütfen **/panel** komutunu kullanınız.`,
      ephemeral: true
    });
  }

  /**
   * Buton prefixlerini panel kimliklerine eşleyen sözlük
   */
  private static readonly BUTTON_PREFIX_MAP: Record<string, string> = {
    gang: 'birlik',
    member: 'uye',
    mem: 'uye',
    rank: 'rutbe',
    eco: 'kasa',
    inv: 'envanter',
    veh: 'arac',
    ter: 'hood',
    mis: 'gorev',
    war: 'savas',
    dip: 'diplomasi',
    pun: 'ceza',
    rec: 'recruiter',
    app: 'basvuru',
    rep: 'ihbar',
    evi: 'kanit',
    black: 'karaborsa',
    perm: 'yetki',
    ann: 'duyuru',
    stat: 'istatistik',
    ach: 'basari',
    sec: 'gizli',
    invs: 'sorusturma',
    audit: 'guvenlik',
    sys: 'ayarlar',
    meet: 'toplanti'
  };

  /**
   * Buton customId'sinden veya kanal adından ait olduğu panel kimliğini çözer
   */
  private detectPanelId(customId: string, channelName?: string): string {
    const parts = customId.split('_');
    if (parts.length >= 2) {
      const prefix = parts[1];
      if (MtaDiscordBot.BUTTON_PREFIX_MAP[prefix]) {
        return MtaDiscordBot.BUTTON_PREFIX_MAP[prefix];
      }
    }
    if (channelName) {
      const cleanCh = channelName.toLowerCase();
      const match = PANEL_CHANNEL_MAPPINGS.find(m =>
        m.channelCandidateNames.some(c => c.toLowerCase() === cleanCh) ||
        m.defaultChannelName.toLowerCase() === cleanCh
      );
      if (match) return match.panelId;
    }
    return 'birlik';
  }

  /**
   * Panel butonlarını Discord.js ActionRow formatına dönüştürür
   */
  private renderPanelActionRows(panelData: any): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < panelData.buttons.length; i++) {
      const b = panelData.buttons[i];
      let style = ButtonStyle.Primary;
      if (b.style === 'SUCCESS') style = ButtonStyle.Success;
      if (b.style === 'DANGER') style = ButtonStyle.Danger;
      if (b.style === 'SECONDARY') style = ButtonStyle.Secondary;

      const btn = new ButtonBuilder()
        .setCustomId(b.customId)
        .setLabel(b.label)
        .setStyle(style);

      if (b.emoji) btn.setEmoji(b.emoji);
      currentRow.addComponents(btn);

      if (currentRow.components.length === 5 || i === panelData.buttons.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
    }
    return rows;
  }

  /**
   * Kategori Menü Satırları (Discord 25 limitine tam uyumlu tek bir menüde tüm 25 paneli sunar)
   */
  private createCategoryMenuRows(currentPanelName?: string): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const all = DiscordPanelRegistry.getCategoryOptions();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('menu_main_panel_category')
      .setPlaceholder(currentPanelName ? `📌 Seçili: ${currentPanelName.slice(0, 40)}` : '📂 Yönetim Paneli Seçiniz (25 Panel)...')
      .addOptions(
        all.slice(0, 25).map(opt => ({
          label: opt.label,
          value: opt.value,
          description: opt.description,
          emoji: opt.emoji
        }))
      );

    return [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
    ];
  }

  /**
   * Select Menü İşleyicisi
   */
  private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const { customId } = interaction;
    if (customId === 'menu_main_panel_category' || customId === 'menu_main_panel_cat_1' || customId === 'menu_main_panel_cat_2') {
      await interaction.deferUpdate();
      const selectedValue = interaction.values[0];
      const panel = DiscordPanelRegistry.getPanel(selectedValue);
      const rows = this.renderPanelActionRows(panel);
      const menuRows = this.createCategoryMenuRows(panel.name);

      await interaction.editReply({
        embeds: [panel.embed as any],
        components: [...rows, ...menuRows]
      });
    }
  }

  /**
   * Discord Autocomplete (Otomatik Tamamlama) İşleyicisi (Madde 15)
   */
  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const query = (focused.value || '').toLowerCase().trim();

    if (focused.name === 'kullanici' || focused.name === 'uye') {
      const choices = store.members
        .filter(m => m.currentMtaName.toLowerCase().includes(query) || m.discordUsername.toLowerCase().includes(query))
        .slice(0, 25)
        .map(m => ({
          name: `${m.currentMtaName} (@${m.discordUsername}) - [${m.rankName}]`.slice(0, 100),
          value: m.discordUserId
        }));
      await interaction.respond(choices).catch(() => {});
      return;
    }

    if (focused.name === 'arac') {
      const choices = store.vehicles
        .filter(v => v.name.toLowerCase().includes(query) || v.plate.toLowerCase().includes(query))
        .slice(0, 25)
        .map(v => ({
          name: `${v.name} [${v.plate}] (${v.status})`.slice(0, 100),
          value: v.plate
        }));
      await interaction.respond(choices).catch(() => {});
      return;
    }

    if (focused.name === 'kategori') {
      const allCats = ['Mühimmat Alımı', 'Haraç Geliri', 'Silah', 'Araç Masrafı', 'Birlik Kasası', 'Etkinlik Ödülü', 'Tıbbi'];
      const choices = allCats
        .filter(c => c.toLowerCase().includes(query))
        .slice(0, 25)
        .map(c => ({ name: c, value: c }));
      await interaction.respond(choices).catch(() => {});
      return;
    }

    if (focused.name === 'rutbe') {
      const choices = store.ranks
        .filter(r => r.name.toLowerCase().includes(query))
        .map(r => ({ name: `[Seviye ${r.level}] ${r.name}`, value: r.name }));
      await interaction.respond(choices).catch(() => {});
      return;
    }

    await interaction.respond([]).catch(() => {});
  }

  /**
   * İşlemi yapan kullanıcının kimlik ve rütbe kontrolü
   * Güvenlik Düzeltmesi (Madde 1): Artık yabancıları otomatik OG yapmaz!
   * - Sunucu Sahibi veya Administrator yetkisi olan -> OG
   * - Discord'da Birlik Rolüne Sahip Olan -> İlgili Rütbe
   * - Veritabanında Kayıtlı Olan -> Kayıtlı Rütbe
   * - Yetkisiz kullanıcı -> Seviye 1 (Üye) yetkisiz misafir
   */
  private ensureExecutorMember(user: User, guild?: any, memberObj?: any): IMember {
    const isSuperAdmin = SUPER_ADMIN_IDS.includes(user.id);
    let member = store.members.find(m => m.discordUserId === user.id);
    
    // Kullanıcının talebi: 728894195359547433 ID'li kullanıcıyı Under OG yap ama adminliği tam kalsın
    if (member) {
      if (isSuperAdmin && member.rankLevel !== RankLevel.UNDER_OG) {
        const underOgRank = store.ranks.find(r => r.level === RankLevel.UNDER_OG);
        if (underOgRank) {
          member.rankId = underOgRank.id;
          member.rankLevel = RankLevel.UNDER_OG;
          member.rankName = underOgRank.name;
        }
      }
      return member;
    }

    const isGuildOwner = guild && guild.ownerId === user.id;
    const hasAdminPerm = memberObj?.permissions?.has?.(0x0000000000000008);

    let assignedRank = store.ranks.find(r => r.level === RankLevel.UYE) || {
      id: 'rank-1',
      name: 'Üye',
      level: RankLevel.UYE
    };

    if (isSuperAdmin) {
      const underOg = store.ranks.find(r => r.level === RankLevel.UNDER_OG);
      if (underOg) assignedRank = underOg;
    } else if (isGuildOwner || hasAdminPerm) {
      const og = store.ranks.find(r => r.level === RankLevel.OG);
      if (og) assignedRank = og;
    } else if (memberObj && memberObj.roles && guild) {
      const roleMap = store.guildConfig.roleMappings || {};
      for (const level of [RankLevel.OG, RankLevel.UNDER_OG, RankLevel.RECRUITER, RankLevel.KIDEMLI_UYE]) {
        const rId = roleMap[level];
        if (rId && memberObj.roles.cache?.has(rId)) {
          const match = store.ranks.find(r => r.level === level);
          if (match) {
            assignedRank = match;
            break;
          }
        }
      }
    }

    member = {
      id: `mem-${user.id}`,
      discordUserId: user.id,
      discordUsername: user.username || user.tag,
      currentMtaName: `${user.username}_IC`,
      currentMtaId: `MTA-${user.id.slice(-4) || '999'}`,
      characters: [
        {
          id: `char-${user.id}`,
          characterName: `${user.username}_IC`,
          characterId: `MTA-${user.id.slice(-4) || '999'}`,
          isMain: true,
          createdAt: new Date()
        }
      ],
      rankId: assignedRank.id,
      rankLevel: assignedRank.level,
      rankName: assignedRank.name,
      joinedAt: new Date(),
      status: 'Aktif',
      warningsCount: 0,
      xp: assignedRank.level === RankLevel.OG ? 5000 : 0,
      activityPoints: assignedRank.level === RankLevel.OG ? 100 : 0,
      completedMissionsCount: 0,
      updatedAt: new Date()
    };

    store.members.unshift(member);
    return member;
  }

  /**
   * Hedef üyeyi Discord ID, mention, isim veya MTA adına göre arar
   */
  private findMember(query: string): IMember | undefined {
    const q = query.replace(/[<@!>]/g, '').trim().toLowerCase();
    return store.members.find(
      m =>
        m.id.toLowerCase() === q ||
        m.discordUserId.toLowerCase() === q ||
        m.discordUsername.toLowerCase().includes(q) ||
        m.currentMtaName.toLowerCase().includes(q)
    );
  }

  /**
   * Buton Tıklama İşleyicisi
   */
  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const { customId, user } = interaction;
    const executor = this.ensureExecutorMember(user, interaction.guild, interaction.member);

    // ==========================================
    // 6. İN-AKTİFLİK MODAL VE ONAY/RED BUTONLARI
    // ==========================================
    if (customId === 'btn_inactivity_modal_open') {
      const modal = new ModalBuilder()
        .setCustomId('modal_inactivity_submit')
        .setTitle('🌴 Birlik İn-aktiflik Bildirimi');

      const startInput = new TextInputBuilder()
        .setCustomId('txt_inact_start')
        .setLabel('Başlangıç Tarihi (Örn: 10.11.2026)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('GG.AA.YYYY');

      const endInput = new TextInputBuilder()
        .setCustomId('txt_inact_end')
        .setLabel('Bitiş Tarihi (Örn: 17.11.2026)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('GG.AA.YYYY');

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_inact_reason')
        .setLabel('İnaktiflik Sebebi')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Sınav haftası, şehir dışı seyahat, iş yoğunluğu vb.');

      const notesInput = new TextInputBuilder()
        .setCustomId('txt_inact_notes')
        .setLabel('Ek Açıklama veya Notlar (İsteğe Bağlı)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('İhtiyaç halinde bana Discord DM üzerinden ulaşabilirsiniz.');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(startInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(endInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId.startsWith('btn_inact_approve_')) {
      const reqId = customId.replace('btn_inact_approve_', '');
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
      const memberObj = interaction.member as any;
      const isOgOrUnderOg = memberObj?.roles?.cache?.some((r: any) => r.name.includes('OG'));

      if (!isSuperAdmin && !isOgOrUnderOg) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Yetkisiz İşlem', 'İnaktiflik talebini yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** yönetim kadrosu onaylayabilir.') as any],
          ephemeral: true
        });
        return;
      }

      await interaction.deferUpdate();
      const res = await InactivityService.reviewRequest({
        requestId: reqId,
        approved: true,
        reviewerId: interaction.user.id,
        reviewerName: interaction.user.username,
        guild: interaction.guild
      });

      if (res.success && res.request) {
        const updatedEmbed = {
          title: `🌴 İN-AKTİFLİK TALEBİ ONAYLANDI: ${res.request.requestNumber}`,
          description: `<@${res.request.discordUserId}> (${res.request.discordUsername}) adlı üyenin inaktiflik izni **ONAYLANDI**.\n` +
            `Üyenin statüsü **İzinli** olarak güncellendi.`,
          color: 0x2ECC71,
          fields: [
            { name: '👤 Üye', value: `<@${res.request.discordUserId}>`, inline: true },
            { name: '👮 Onaylayan', value: `<@${interaction.user.id}>`, inline: true },
            { name: '📅 İzin Süresi', value: `${res.request.startDate} - ${res.request.endDate}`, inline: true },
            { name: '📋 Sebep', value: res.request.reason, inline: false },
            { name: '⚡ Durum', value: '✅ **Onaylandı (İzinli)**', inline: true }
          ],
          footer: { text: "BLOOD'S Gang İnaktiflik Takip Paneli" },
          timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [updatedEmbed], components: [] });
      }
      return;
    }

    if (customId.startsWith('btn_inact_reject_')) {
      const reqId = customId.replace('btn_inact_reject_', '');
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(interaction.user.id);
      const memberObj = interaction.member as any;
      const isOgOrUnderOg = memberObj?.roles?.cache?.some((r: any) => r.name.includes('OG'));

      if (!isSuperAdmin && !isOgOrUnderOg) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Yetkisiz İşlem', 'İnaktiflik talebini yalnızca **👑 ┊ OG** ve **⭐ ┊ Under OG** yönetim kadrosu reddedebilir.') as any],
          ephemeral: true
        });
        return;
      }

      await interaction.deferUpdate();
      const res = await InactivityService.reviewRequest({
        requestId: reqId,
        approved: false,
        reviewerId: interaction.user.id,
        reviewerName: interaction.user.username,
        guild: interaction.guild
      });

      if (res.success && res.request) {
        const updatedEmbed = {
          title: `❌ İN-AKTİFLİK TALEBİ REDDEDİLDİ: ${res.request.requestNumber}`,
          description: `<@${res.request.discordUserId}> (${res.request.discordUsername}) adlı üyenin inaktiflik talebi reddedildi.`,
          color: 0xED4245,
          fields: [
            { name: '👤 Üye', value: `<@${res.request.discordUserId}>`, inline: true },
            { name: '👮 Reddeden', value: `<@${interaction.user.id}>`, inline: true },
            { name: '📅 Talep Edilen', value: `${res.request.startDate} - ${res.request.endDate}`, inline: true },
            { name: '📋 Sebep', value: res.request.reason, inline: false },
            { name: '⚡ Durum', value: '❌ **Reddedildi**', inline: true }
          ],
          footer: { text: "BLOOD'S Gang İnaktiflik Takip Paneli" },
          timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [updatedEmbed], components: [] });
      }
      return;
    }

    // ==========================================
    // 3. KANAL REHBERİ YENİLEME BUTONU
    // ==========================================
    if (customId === 'btn_guide_refresh') {
      await interaction.deferReply({ ephemeral: true });
      const res = await GuideService.publishOrUpdateGuide(interaction.guild);
      if (res.success) {
        await interaction.editReply({
          embeds: [EmbedBuilderUtil.success('Kanal Rehberi Güncellendi', 'Sunucudaki güncel kategori ve kanallar taranarak rehber yenilendi.') as any]
        });
      } else {
        await interaction.editReply({
          embeds: [EmbedBuilderUtil.error('Hata', res.message) as any]
        });
      }
      return;
    }

    // ==========================================
    // HIZLI BAŞVURU İNCELEME KARTI BUTONLARI (#başvuru-inceleme - Madde 4)
    // ==========================================
    if (customId.startsWith('btn_quick_app_accept_')) {
      const appId = customId.replace('btn_quick_app_accept_', '');
      const app = store.applications.find(a => a.id === appId);
      if (!app) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Başvuru bulunamadı.') as any], ephemeral: true });
        return;
      }
      const res = ApplicationService.acceptApplication({
        applicationId: app.id,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        reason: 'Hızlı İnceleme Kartı Üzerinden Onaylandı'
      });
      if (res.success) {
        const formattedNick = DiscordSyncService.formatIcNickname(app.mtaCharacterName);
        await DiscordSyncService.syncMemberRole(interaction.guild, app.discordUserId, RankLevel.UYE, 'Başvuru Onayı', formattedNick);
        await DiscordSyncService.sendLog(interaction.guild, 'uye', EmbedBuilderUtil.success(
          'Yeni Birlik Üyesi Katıldı',
          `<@${app.discordUserId}> (\`${app.discordUsername}\`) başvurusu kabul edildi, sunucu ismi \`${formattedNick}\` yapıldı ve üye rolü verildi.`
        ));
        // Madde 3: Adaya Otomatik DM Bildirimi (Onay)
        try {
          const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
          if (applicantUser) {
            await applicantUser.send({
              embeds: [
                EmbedBuilderUtil.createDefault(
                  '🎉 Katılım Başvurunuz Onaylandı!',
                  `Tebrikler **${formattedNick}**!\n\n` +
                  `**${store.gangInfo.name}** bünyesine katılım başvurunuz yönetim tarafından onaylanmıştır.\n\n` +
                  `• **Sunucu İsminiz:** \`${formattedNick}\` olarak güncellendi.\n` +
                  `• **Rütbeniz:** \`🩸 ┊ Üye\` rolü tanımlandı.\n` +
                  `• **Erişim:** Birlik kanalları ve ses odaları kullanımınıza açıldı.\n\n` +
                  `Lütfen **📢・duyurular** kanalındaki birlik kurallarını inceleyiniz. Sokaklarda görüşmek üzere!`
                ) as any
              ]
            }).catch(() => {});
          }
        } catch {}

        await interaction.update({
          embeds: [EmbedBuilderUtil.success('✅ Başvuru Kabul Edildi', `**${app.discordUsername}** (${app.mtaCharacterName}) başvurusu <@${user.id}> tarafından kabul edildi.\n*(Adaya özel mesaj ile bilgilendirme iletildi.)*`) as any],
          components: []
        });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      }
      return;
    }

    if (customId.startsWith('btn_quick_app_reject_')) {
      const appId = customId.replace('btn_quick_app_reject_', '');
      const app = store.applications.find(a => a.id === appId);
      if (!app) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Başvuru bulunamadı.') as any], ephemeral: true });
        return;
      }
      ApplicationService.rejectApplication({
        applicationId: app.id,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        reason: 'Yönetim tarafından uygun görülmedi.'
      });

      // Madde 3: Adaya Otomatik DM Bildirimi (Red)
      try {
        const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
        if (applicantUser) {
          await applicantUser.send({
            embeds: [
              EmbedBuilderUtil.warning(
                '❌ Katılım Başvurunuz Hakkında',
                `Sayın **${app.mtaCharacterName}**,\n\n` +
                `**${store.gangInfo.name}** katılım başvurunuz yönetim tarafından incelenmiş ve uygun görülmemiştir.\n\n` +
                `• **Gerekçe:** Yönetim tarafından uygun görülmedi.\n\n` +
                `Gelecekte kendinizi geliştirerek tekrar başvuruda bulunabilirsiniz.`
              ) as any
            ]
          }).catch(() => {});
        }
      } catch {}

      await interaction.update({
        embeds: [EmbedBuilderUtil.error('❌ Başvuru Reddedildi', `**${app.discordUsername}** (${app.mtaCharacterName}) başvurusu <@${user.id}> tarafından reddedildi.\n*(Adaya özel mesaj ile bilgilendirme iletildi.)*`) as any],
        components: []
      });
      return;
    }

    if (customId.startsWith('btn_quick_app_score_')) {
      const appId = customId.replace('btn_quick_app_score_', '');
      const modal = new ModalBuilder().setCustomId(`modal_quick_score_${appId}`).setTitle('Adayı Puanla & Değerlendir');
      const scoreInput = new TextInputBuilder().setCustomId('txt_app_score').setLabel('Puan (1 - 10)').setStyle(TextInputStyle.Short).setValue('8').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_app_notes').setLabel('İnceleme Notu').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(scoreInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // DİNAMİK SAYFALAMA (PAGINATION) BUTONLARI (Madde 5)
    // ==========================================
    if (customId.startsWith('btn_pagi_mem_')) {
      const page = parseInt(customId.replace('btn_pagi_mem_', ''), 10) || 1;
      const pageSize = 8;
      const allMembers = store.members;
      const totalPages = Math.ceil(allMembers.length / pageSize) || 1;
      const safePage = Math.max(1, Math.min(page, totalPages));
      const slice = allMembers.slice((safePage - 1) * pageSize, safePage * pageSize);

      const embed = EmbedBuilderUtil.createDefault(
        `👥 Birlik Üye Listesi (Sayfa ${safePage}/${totalPages})`,
        slice.length === 0
          ? 'Kayıtlı üye bulunmuyor.'
          : slice.map(m => `• **${m.discordUsername}** — ${m.rankName} (MTA: \`${m.currentMtaName}\`) [${m.status}] - XP: \`${m.xp}\``).join('\n')
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`btn_pagi_mem_${safePage - 1}`).setLabel('Önceki').setStyle(ButtonStyle.Secondary).setEmoji('◀').setDisabled(safePage <= 1),
        new ButtonBuilder().setCustomId(`btn_pagi_mem_${safePage + 1}`).setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setEmoji('▶').setDisabled(safePage >= totalPages)
      );
      await interaction.update({ embeds: [embed as any], components: [row] });
      return;
    }

    if (customId.startsWith('btn_pagi_eco_')) {
      const page = parseInt(customId.replace('btn_pagi_eco_', ''), 10) || 1;
      const pageSize = 8;
      const txs = store.transactions;
      const totalPages = Math.ceil(txs.length / pageSize) || 1;
      const safePage = Math.max(1, Math.min(page, totalPages));
      const slice = txs.slice((safePage - 1) * pageSize, safePage * pageSize);

      const embed = EmbedBuilderUtil.createDefault(
        `📜 Kasa Hareketleri Geçmişi (Sayfa ${safePage}/${totalPages})`,
        slice.length === 0
          ? 'Kayıtlı kasa işlemi bulunmamaktadır.'
          : slice.map(t => `• **${t.type}**: $${t.amount.toLocaleString('tr-TR')} (${t.category})\n  *Yetkili: ${t.executorName} | Bakiye: $${t.balanceAfter.toLocaleString('tr-TR')}*`).join('\n\n')
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`btn_pagi_eco_${safePage - 1}`).setLabel('Önceki').setStyle(ButtonStyle.Secondary).setEmoji('◀').setDisabled(safePage <= 1),
        new ButtonBuilder().setCustomId(`btn_pagi_eco_${safePage + 1}`).setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setEmoji('▶').setDisabled(safePage >= totalPages)
      );
      await interaction.update({ embeds: [embed as any], components: [row] });
      return;
    }

    if (customId.startsWith('btn_pagi_audit_')) {
      const page = parseInt(customId.replace('btn_pagi_audit_', ''), 10) || 1;
      const pageSize = 8;
      const logs = store.auditLogs;
      const totalPages = Math.ceil(logs.length / pageSize) || 1;
      const safePage = Math.max(1, Math.min(page, totalPages));
      const slice = logs.slice((safePage - 1) * pageSize, safePage * pageSize);

      const embed = EmbedBuilderUtil.createDefault(
        `🛡️ Denetim Logları (Audit) (Sayfa ${safePage}/${totalPages})`,
        slice.length === 0
          ? 'Henüz denetim kaydı bulunmuyor.'
          : slice.map(l => `• \`[${l.actionType}]\` **${l.executorName}** ➔ ${l.target || '-'}\n  ${l.description} (${new Date(l.timestamp).toLocaleTimeString('tr-TR')})`).join('\n\n')
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`btn_pagi_audit_${safePage - 1}`).setLabel('Önceki').setStyle(ButtonStyle.Secondary).setEmoji('◀').setDisabled(safePage <= 1),
        new ButtonBuilder().setCustomId(`btn_pagi_audit_${safePage + 1}`).setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setEmoji('▶').setDisabled(safePage >= totalPages)
      );
      await interaction.update({ embeds: [embed as any], components: [row] });
      return;
    }

    // ==========================================
    // ZULA VE MÜHİMMAT ZİMMET BUTONLARI (Madde 11)
    // ==========================================
    if (customId === 'btn_loadout_assign') {
      const modal = new ModalBuilder().setCustomId('modal_loadout_assign').setTitle('Üyeye Silah / Mühimmat Zimmetle');
      const memberInput = new TextInputBuilder().setCustomId('txt_ld_member').setLabel('Zimmetlenecek Üye (MTA Adı / Discord)').setStyle(TextInputStyle.Short).setRequired(true);
      const itemInput = new TextInputBuilder().setCustomId('txt_ld_item').setLabel('Silah / Eşya Adı').setStyle(TextInputStyle.Short).setPlaceholder('Örn: AK-47 veya Deagle').setRequired(true);
      const qtyInput = new TextInputBuilder().setCustomId('txt_ld_qty').setLabel('Miktar').setStyle(TextInputStyle.Short).setValue('1').setRequired(true);
      const ammoInput = new TextInputBuilder().setCustomId('txt_ld_ammo').setLabel('Mermi Sayısı').setStyle(TextInputStyle.Short).setValue('150').setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(memberInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(ammoInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_loadout_return') {
      const modal = new ModalBuilder().setCustomId('modal_loadout_return').setTitle('Zimmet İade Al / Zayiat Bildir');
      const idInput = new TextInputBuilder().setCustomId('txt_ld_id').setLabel('Zimmet No (Örn: ZMT-001)').setStyle(TextInputStyle.Short).setRequired(true);
      const qtyInput = new TextInputBuilder().setCustomId('txt_ld_qty').setLabel('İade Edilen Miktar').setStyle(TextInputStyle.Short).setValue('1').setRequired(true);
      const lostInput = new TextInputBuilder().setCustomId('txt_ld_lost').setLabel('Çatışmada Kayıp mı? (E/H)').setStyle(TextInputStyle.Short).setValue('H').setPlaceholder('Evet / Hayır').setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(lostInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // RAKİP BİRLİK İSTİHBARATI BUTONLARI (Madde 13)
    // ==========================================
    if (customId === 'btn_dip_rival_add') {
      const modal = new ModalBuilder().setCustomId('modal_rival_add').setTitle('Rakip Birlik İstihbarat Dosyası');
      const nameInput = new TextInputBuilder().setCustomId('txt_riv_name').setLabel('Birlik Adı').setStyle(TextInputStyle.Short).setRequired(true);
      const tagInput = new TextInputBuilder().setCustomId('txt_riv_tag').setLabel('Birlik Etiketi').setStyle(TextInputStyle.Short).setRequired(true);
      const leaderInput = new TextInputBuilder().setCustomId('txt_riv_leader').setLabel('Bilinen Lideri').setStyle(TextInputStyle.Short).setRequired(true);
      const threatInput = new TextInputBuilder().setCustomId('txt_riv_threat').setLabel('Tehdit Düzeyi').setStyle(TextInputStyle.Short).setValue('Düşman').setPlaceholder('Düşman / Ateşkes / Savaş Halinde').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_riv_notes').setLabel('İstihbarat Notları & Bilinen Bölgeler').setStyle(TextInputStyle.Paragraph).setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(leaderInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(threatInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_dip_rival_list') {
      const rivals = RivalIntelService.getAll();
      const embed = EmbedBuilderUtil.createDefault(
        '🕵️ Rakip Birlik İstihbarat Arşivi',
        rivals.length === 0
          ? 'Kayıtlı rakip birlik istihbarat dosyası bulunmuyor.'
          : rivals.map(r => `• **${r.name} [${r.tag}]**\n  Lider: ${r.leaderName} | Tehdit: \`${r.threatLevel}\`\n  Bölgeler: ${r.controlledZones.join(', ')}\n  Not: *${r.intelNotes.slice(0, 80)}*`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // ==========================================
    // KULLANICI KENDİ PROFİLİ BUTONU (Madde 14)
    // ==========================================
    if (customId === 'btn_my_profile') {
      const member = store.members.find(m => m.discordUserId === user.id);
      if (!member) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Kayıt Bulunamadı', 'Henüz resmi olarak birliğe kayıtlı değilsiniz.') as any], ephemeral: true });
        return;
      }
      const activeVehicles = store.vehicles.filter(v => v.assignedMemberId === member.id);
      const activeLoadouts = LoadoutService.getByMemberId(member.id).filter(l => l.status === 'Zimmetli');

      const embed: IDiscordEmbed = {
        title: `🪪 BİRLİK KİMLİK KARTI: ${member.currentMtaName}`,
        description:
          `**Discord:** <@${member.discordUserId}> (\`${member.discordUsername}\`)\n` +
          `**Rütbe:** 🎖️ **${member.rankName}** (Seviye ${member.rankLevel})\n` +
          `**Durum:** 🟢 \`${member.status}\` | **Katılım:** ${new Date(member.joinedAt).toLocaleDateString('tr-TR')}\n\n` +
          `⭐ **Tecrübe (XP):** \`${member.xp} XP\` (Aktivite: ${member.activityPoints} Puan)\n` +
          `⚠️ **Disiplin Uyarısı:** \`${member.warningsCount} / 3\`\n` +
          `🎯 **Tamamlanan Görev:** \`${member.completedMissionsCount} Operasyon\``,
        color: 0x5865f2,
        fields: [
          {
            name: '🚗 Zimmetli Araçlar',
            value: activeVehicles.length === 0 ? 'Zimmetli araç yok.' : activeVehicles.map(v => `• ${v.name} [${v.plate}] (${v.status})`).join('\n'),
            inline: true
          },
          {
            name: '🔫 Zimmetli Zula & Mühimmat',
            value: activeLoadouts.length === 0 ? 'Zimmetli mühimmat yok.' : activeLoadouts.map(l => `• ${l.quantity}x ${l.itemName} (+${l.ammo} Mermi)`).join('\n'),
            inline: true
          }
        ],
        footer: { text: `MTA Illegal Birlik Kimlik Doğrulama Sistemi • ID: ${member.currentMtaId}` }
      };
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // Tüm Panelleri Dağıt Butonu
    if (customId === 'btn_distribute_all_panels') {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }
      } catch (err: any) {
        if (err?.code === 10062) return;
        throw err;
      }

      const res = await SetupService.distributeAllPanels(interaction.guild);
      const embed = EmbedBuilderUtil.success(
        'Tüm Paneller İlgili Kanallara Dağıtıldı',
        `Toplam **${res.count}** adet yönetim paneli ilgili kanallara başarıyla yerleştirildi.\n\n` +
          res.results.slice(0, 15).map(r => `• **${r.name}** ➔ #${r.channelName}`).join('\n') +
          (res.results.length > 15 ? `\n...ve ${res.results.length - 15} panel daha ilgili kanallarına yerleştirildi.` : '')
      );
      await interaction.editReply({ embeds: [embed as any] }).catch(() => {});
      return;
    }

    // ==========================================
    // RÜTBE PANELİ BUTONLARI (Terfi, Tenzil, Geçmiş)
    // ==========================================
    if (customId === 'btn_rank_promote') {
      const modal = new ModalBuilder()
        .setCustomId('modal_rank_promote')
        .setTitle('Birlik Üyesini Terfi Ettir (Promote)');

      const targetInput = new TextInputBuilder()
        .setCustomId('txt_rank_target')
        .setLabel('Hedef Üye')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: @Kullanıcı, 123456789 veya Tony_Montana')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_rank_reason')
        .setLabel('Terfi Gerekçesi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Başarılı operasyon ve üstün bağlılık...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_rank_demote') {
      const modal = new ModalBuilder()
        .setCustomId('modal_rank_demote')
        .setTitle('Üyenin Rütbesini Düşür (Tenzil)');

      const targetInput = new TextInputBuilder()
        .setCustomId('txt_rank_target')
        .setLabel('Hedef Üye')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: @Kullanıcı veya Marco_DeLuca')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_rank_reason')
        .setLabel('Rütbe Düşürme Gerekçesi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Emirlere uymama veya devriye aksatma...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_rank_logs') {
      const logs = RankService.promotionLogs;
      const embed = EmbedBuilderUtil.createDefault(
        '📜 Rütbe Terfi ve Tenzil Geçmişi',
        logs.length === 0
          ? 'Henüz kaydedilmiş terfi geçmişi bulunmuyor.'
          : logs.slice(0, 10).map(l => `• **${l.memberName}**: ${l.oldRank} ➔ **${l.newRank}**\n  *Yetkili: ${l.executorName} | ${l.reason}*`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // ==========================================
    // ÜYE YÖNETİMİ BUTONLARI (Ekle, Çıkar/Sil, Durum, Profil)
    // ==========================================
    if (customId === 'btn_member_add') {
      const modal = new ModalBuilder()
        .setCustomId('modal_mem_add')
        .setTitle('Yeni Birlik Üyesi Kaydet');

      const discordIdInput = new TextInputBuilder()
        .setCustomId('txt_mem_discord_id')
        .setLabel('Discord ID veya Etiket')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 987654321098765432')
        .setRequired(true);

      const usernameInput = new TextInputBuilder()
        .setCustomId('txt_mem_discord_username')
        .setLabel('Discord Kullanıcı Adı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Alex_Gamer')
        .setRequired(true);

      const mtaNameInput = new TextInputBuilder()
        .setCustomId('txt_mem_mta_name')
        .setLabel('MTA Karakter Adı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Alex_Costello')
        .setRequired(true);

      const mtaIdInput = new TextInputBuilder()
        .setCustomId('txt_mem_mta_id')
        .setLabel('MTA Hesap ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: MTA-450')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(discordIdInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(mtaNameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(mtaIdInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_member_remove') {
      const modal = new ModalBuilder()
        .setCustomId('modal_mem_remove')
        .setTitle('Üye Çıkar / İhraç Et / Kalıcı Sil');

      const targetInput = new TextInputBuilder()
        .setCustomId('txt_mem_target')
        .setLabel('Hedef Üye veya "test"')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: test (tüm testleri siler) veya Tony_Montana')
        .setRequired(true);

      const actionInput = new TextInputBuilder()
        .setCustomId('txt_mem_action')
        .setLabel('İşlem Türü')
        .setStyle(TextInputStyle.Short)
        .setValue('Sil')
        .setPlaceholder('Sil / İhraç / Ayrıldı')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_mem_reason')
        .setLabel('Gerekçe')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('İşlem nedeni...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(actionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_member_status') {
      const modal = new ModalBuilder()
        .setCustomId('modal_mem_status')
        .setTitle('Üye Durumunu Güncelle');

      const targetInput = new TextInputBuilder()
        .setCustomId('txt_mem_target')
        .setLabel('Hedef Üye')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Discord ID, Adı veya MTA Adı')
        .setRequired(true);

      const statusInput = new TextInputBuilder()
        .setCustomId('txt_mem_status')
        .setLabel('Yeni Durum')
        .setStyle(TextInputStyle.Short)
        .setValue('Aktif')
        .setPlaceholder('Aktif / Pasif / İzinli')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_mem_reason')
        .setLabel('Durum Güncelleme Sebebi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Haftalık devriye katılımı...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_member_profile') {
      const modal = new ModalBuilder()
        .setCustomId('modal_mem_profile')
        .setTitle('Üye Profili Sorgula');

      const targetInput = new TextInputBuilder()
        .setCustomId('txt_mem_target')
        .setLabel('Aranacak Üye')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Marco veya MTA ID')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput));
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // KASA VE EKONOMİ BUTONLARI
    // ==========================================
    if (customId === 'btn_eco_deposit') {
      const modal = new ModalBuilder()
        .setCustomId('modal_eco_deposit')
        .setTitle('Kasaya Para Yatır');

      const amountInput = new TextInputBuilder()
        .setCustomId('txt_eco_amount')
        .setLabel('Yatırılacak Tutar ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 250000')
        .setRequired(true);

      const categoryInput = new TextInputBuilder()
        .setCustomId('txt_eco_category')
        .setLabel('Kategori')
        .setStyle(TextInputStyle.Short)
        .setValue('Üye Katkısı')
        .setPlaceholder('Vergi, Haraç, Katkı vb.')
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('txt_eco_desc')
        .setLabel('İşlem Açıklaması')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Paranın kaynağı ve açıklama...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(categoryInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_eco_withdraw') {
      const modal = new ModalBuilder()
        .setCustomId('modal_eco_withdraw')
        .setTitle('Kasadan Para Çek');

      const amountInput = new TextInputBuilder()
        .setCustomId('txt_eco_amount')
        .setLabel('Çekilecek Tutar ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 100000')
        .setRequired(true);

      const categoryInput = new TextInputBuilder()
        .setCustomId('txt_eco_category')
        .setLabel('Gider Kategorisi')
        .setStyle(TextInputStyle.Short)
        .setValue('Mühimmat Alımı')
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('txt_eco_desc')
        .setLabel('Çekim Gerekçesi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Yetkili onaylı gider gerekçesi...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(categoryInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_eco_history') {
      const txs = store.transactions;
      const embed = EmbedBuilderUtil.createDefault(
        '📜 Birlik Kasa Hareketleri Geçmişi',
        txs.length === 0
          ? 'Kayıtlı kasa işlemi bulunmamaktadır.'
          : txs.slice(0, 10).map(t => `• **${t.type}**: $${t.amount.toLocaleString('tr-TR')} (${t.category})\n  *Yetkili: ${t.executorName} | Bakiye: $${t.balanceAfter.toLocaleString('tr-TR')}*`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // ==========================================
    // ENVANTER BUTONLARI
    // ==========================================
    if (customId === 'btn_inv_add') {
      const modal = new ModalBuilder()
        .setCustomId('modal_inv_add')
        .setTitle('Envantere Eşya / Mühimmat Ekle');

      const nameInput = new TextInputBuilder()
        .setCustomId('txt_inv_name')
        .setLabel('Eşya Adı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: AK-47 veya Kevlar Zırh')
        .setRequired(true);

      const catInput = new TextInputBuilder()
        .setCustomId('txt_inv_category')
        .setLabel('Eşya Kategorisi')
        .setStyle(TextInputStyle.Short)
        .setValue('Silah')
        .setPlaceholder('Silah, Mühimmat, Zırh, Tıbbi')
        .setRequired(true);

      const qtyInput = new TextInputBuilder()
        .setCustomId('txt_inv_qty')
        .setLabel('Miktar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 20')
        .setRequired(true);

      const sourceInput = new TextInputBuilder()
        .setCustomId('txt_inv_source')
        .setLabel('Tedarik Kaynağı')
        .setStyle(TextInputStyle.Short)
        .setValue('Karaborsa')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(catInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(sourceInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_inv_remove') {
      const modal = new ModalBuilder()
        .setCustomId('modal_inv_remove')
        .setTitle('Envanterden Eşya Çıkar / Kullan');

      const nameInput = new TextInputBuilder()
        .setCustomId('txt_inv_name')
        .setLabel('Eşya Adı veya ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const qtyInput = new TextInputBuilder()
        .setCustomId('txt_inv_qty')
        .setLabel('Çıkarılacak Miktar')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_inv_reason')
        .setLabel('Kullanım Gerekçesi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Alan üye veya kullanım nedeni...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_inv_warning') {
      const warnings = InventoryService.getLowStockWarnings();
      const embed = EmbedBuilderUtil.createDefault(
        '⚠️ Kritik Stok Uyarıları',
        warnings.length === 0
          ? 'Tüm envanter stokları güvenli seviyededir. Kritik eşya bulunmamaktadır.'
          : warnings.map(w => `• **${w.name}**: Mevcut: **${w.quantity}** (Kritik Eşik: ${w.minWarningLimit})`).join('\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // ==========================================
    // ARAÇ, HOOD, GÖREV, DİPLOMASİ, CEZA BUTONLARI
    // ==========================================
    if (customId === 'btn_veh_add') {
      const modal = new ModalBuilder()
        .setCustomId('modal_veh_add')
        .setTitle('Yeni Birlik Aracı Ekle');

      const nameInput = new TextInputBuilder().setCustomId('txt_veh_name').setLabel('Araç Modeli / Adı').setStyle(TextInputStyle.Short).setPlaceholder('Örn: Sultan veya Cheetah').setRequired(true);
      const plateInput = new TextInputBuilder().setCustomId('txt_veh_plate').setLabel('Plaka').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 34 LSS 99').setRequired(true);
      const garageInput = new TextInputBuilder().setCustomId('txt_veh_garage').setLabel('Bulunduğu Garaj').setStyle(TextInputStyle.Short).setValue('Ganton Ana Garaj').setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(plateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(garageInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_veh_assign') {
      const modal = new ModalBuilder().setCustomId('modal_veh_assign').setTitle('Aracı Üyeye Zimmetle');
      const plateInput = new TextInputBuilder().setCustomId('txt_veh_plate').setLabel('Araç Plakası').setStyle(TextInputStyle.Short).setRequired(true);
      const memberInput = new TextInputBuilder().setCustomId('txt_veh_member').setLabel('Zimmetlenecek Üye').setStyle(TextInputStyle.Short).setPlaceholder('MTA Adı / Discord ID').setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(plateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(memberInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_pun_issue') {
      const modal = new ModalBuilder().setCustomId('modal_pun_issue').setTitle('Disiplin Cezası Uygula');
      const targetInput = new TextInputBuilder().setCustomId('txt_pun_target').setLabel('Hedef Üye (ID / İsim / MTA)').setStyle(TextInputStyle.Short).setRequired(true);
      const typeInput = new TextInputBuilder().setCustomId('txt_pun_type').setLabel('Ceza Türü').setStyle(TextInputStyle.Short).setValue('Uyarı').setPlaceholder('Uyarı / İhtar / Ceza Puanı / İhraç').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_pun_reason').setLabel('Gerekçe').setStyle(TextInputStyle.Paragraph).setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_meet_create') {
      const modal = new ModalBuilder().setCustomId('modal_meet_create').setTitle('Yeni Birlik Toplantısı Planla');
      const titleInput = new TextInputBuilder().setCustomId('txt_meet_title').setLabel('Toplantı Başlığı').setStyle(TextInputStyle.Short).setPlaceholder('Haftalık Genel İstişare').setRequired(true);
      const subjectInput = new TextInputBuilder().setCustomId('txt_meet_subject').setLabel('Konu ve Gündem').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const timeInput = new TextInputBuilder().setCustomId('txt_meet_time').setLabel('Saat (Örn: 21:30)').setStyle(TextInputStyle.Short).setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // BAŞVURU VE TICKET BUTONLARI
    // ==========================================
    if (customId === 'btn_app_new_form') {
      const modal = new ModalBuilder()
        .setCustomId('modal_app_submit')
        .setTitle('Birlik Katılım Başvuru Formu');

      const oocInput = new TextInputBuilder()
        .setCustomId('txt_app_ooc')
        .setLabel('OOC İsim ve Yaş')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Ahmet (21)')
        .setRequired(true);

      const mtaInput = new TextInputBuilder()
        .setCustomId('txt_app_mta')
        .setLabel('MTA Karakter Adı')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: Tony_Montana (İsim_Soyisim)')
        .setRequired(true);

      const storyInput = new TextInputBuilder()
        .setCustomId('txt_app_story')
        .setLabel('Karakter Hikayesi & Rol')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Karakterinizin IC hikayesi...')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('txt_app_reason')
        .setLabel('Birliğe Katılma Amacınız')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Neden bu birliği seçtiniz?...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(oocInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(mtaInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(storyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_app_check_status') {
      const app = store.applications.find(a => a.discordUserId === user.id);
      if (!app) {
        await interaction.reply({
          embeds: [
            EmbedBuilderUtil.createDefault(
              'ℹ️ Aktif Başvuru Bulunamadı',
              `Sayın <@${user.id}>, sistemde adınıza kayıtlı bir katılım başvurusu bulunmamaktadır.\n\n` +
              `Aşağıdaki **"📝 Başvuru Formunu Doldur"** butonuna basarak birliğimize hemen başvuruda bulunabilirsiniz!`
            ) as any
          ],
          ephemeral: true
        });
        return;
      }

      const statusEmoji = app.status === 'Kabul Edildi' ? '🟢' : app.status === 'Reddedildi' ? '🔴' : '🟡';
      const embed = {
        title: `📋 BAŞVURU DURUMUNUZ: #${app.applicationNumber}`,
        description: `Sayın <@${user.id}>, katılım başvurunuzun güncel durumu aşağıda yer almaktadır:`,
        color: app.status === 'Kabul Edildi' ? 0x2ECC71 : app.status === 'Reddedildi' ? 0xE74C3C : 0xF1C40F,
        fields: [
          { name: 'Karakter Adı', value: `\`${app.mtaCharacterName}\``, inline: true },
          { name: 'Durum', value: `${statusEmoji} **${app.status}**`, inline: true },
          { name: 'Başvuru No', value: `#${app.applicationNumber}`, inline: true },
          { name: 'Başvuru Tarihi', value: new Date(app.createdAt).toLocaleString('tr-TR'), inline: true },
          { name: 'Ortalama Puan', value: app.averageScore ? `⭐ **${app.averageScore}/10**` : '⏳ İnceleniyor', inline: true },
          { name: 'Yönetim Notu / Açıklama', value: app.statusReason || (app.status === 'Beklemede' ? 'Başvurunuz sırada bekliyor, en kısa sürede yetkililer tarafından değerlendirilecektir.' : 'İnceleme aşamasında.') }
        ],
        footer: { text: "BLOOD'S Gang Başvuru Takip Sistemi" }
      };

      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_app_rules_view') {
      const embed = EmbedBuilderUtil.createDefault(
        "📜 BLOOD'S GANG • BAŞVURU VE KATILIM ŞARTLARI",
        '**1. Karakter ve Hard RP Disiplini:**\n' +
        '• Sunucuda karakterinize uygun, gerçekçi ve ciddiyetini koruyan bir çete rolü yapmalısınız.\n' +
        '• Trollemek, RDM, VDM ve non-RP davranışlar doğrudan birlikten ve sunucudan ihraç sebebidir.\n\n' +
        '**2. Ses ve Telsiz Disiplini:**\n' +
        '• Operasyonlarda telsiz frekanslarına uymak ve takım içi iletişimi aksatmamak zorunludur.\n' +
        '• Mikrofon kalitesi ve bas-konuş kullanımı tavsiye edilir.\n\n' +
        '**3. Hiyerarşi ve Saygı:**\n' +
        '• OG ve Under OG yönetim kararları nihaidir. Birlik içi tartışmalar karargahta çözülür.\n' +
        '• Çete içerisinde kardeşlik ve sadakat esastır.\n\n' +
        'Hazırsanız kanaldaki **"📝 Başvuru Formunu Doldur"** butonuna basarak başvurunuzu iletebilirsiniz!'
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }



    // ==========================================
    // BİLGİ VE LİSTELEME BUTONLARI
    // ==========================================
    if (customId === 'btn_perm_view') {
      const ranks = RankService.getAll();
      const embed = EmbedBuilderUtil.createDefault(
        '🔑 Rütbe İzin ve Yetki Listesi',
        ranks.map(r => `• **${r.name} (Seviye ${r.level})**:\n  İzinler: \`${r.permissions.join('`, `')}\``).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_rec_stats') {
      const stats = store.recruiterInvites;
      const joined = stats.filter(s => s.status === 'Katıldı').length;
      const rate = stats.length > 0 ? Math.round((joined / stats.length) * 100) : 0;
      const embed = EmbedBuilderUtil.createDefault(
        '🤝 Recruiter Performans Raporu',
        `Toplam Aday Daveti: **${stats.length}**\nBaşarıyla Katılan: **${joined}**\nDönüşüm Oranı: **%${rate}**\n\n` +
          stats.slice(0, 8).map(s => `• **${s.candidateMtaName}** — Davet Eden: ${s.recruiterName} [${s.status}]`).join('\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_ops_view') {
      const ops = store.missions;
      const embed = EmbedBuilderUtil.createDefault(
        '🗂️ Operasyon Dosyaları',
        ops.length === 0
          ? 'Kayıtlı operasyon bulunmuyor.'
          : ops.slice(0, 8).map(o => `• **${o.title}** [${o.status}] - Lider: ${o.assignedLeaderName} (+${o.rewardXp} XP)`).join('\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_sec_audit') {
      const logs = store.auditLogs;
      const embed = EmbedBuilderUtil.createDefault(
        '🛡️ Son Güvenlik ve Denetim Kayıtları (Audit)',
        logs.length === 0
          ? 'Henüz denetim kaydı bulunmuyor.'
          : logs.slice(0, 10).map(l => `• \`[${l.actionType}]\` **${l.executorName}** ➔ ${l.target || '-'}\n  ${l.description} (${new Date(l.timestamp).toLocaleTimeString('tr-TR')})`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_ach_list') {
      const achs = store.achievements;
      const embed = EmbedBuilderUtil.createDefault(
        '🏆 Birlik Başarı Rozetleri',
        achs.map(a => `${a.badgeIcon} **${a.title}** (+${a.rewardXp} XP)\n*${a.description}*`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_sys_backup') {
      const res = BackupService.createBackup(executor.discordUsername);
      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Sistem Yedeği Alındı', `Veritabanı yedeği güvenle oluşturuldu. Toplam veri boyutu: **${res.backupJson?.length || 0} karakter**`) as any],
        ephemeral: true
      });
      return;
    }

    // ==========================================
    // BİRLİK GENEL YÖNETİMİ BUTONLARI
    // ==========================================
    if (customId === 'btn_gang_edit_desc') {
      const modal = new ModalBuilder().setCustomId('modal_gang_desc').setTitle('Birlik Açıklamasını Düzenle');
      const descInput = new TextInputBuilder()
        .setCustomId('txt_gang_desc')
        .setLabel('Birlik Açıklaması & Kurgu')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(store.gangInfo.description)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(descInput));
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_gang_edit_tag') {
      const modal = new ModalBuilder().setCustomId('modal_gang_tag').setTitle('Birlik İsim ve Etiketini Değiştir');
      const nameInput = new TextInputBuilder().setCustomId('txt_gang_name').setLabel('Birlik Adı').setStyle(TextInputStyle.Short).setValue(store.gangInfo.name).setRequired(true);
      const tagInput = new TextInputBuilder().setCustomId('txt_gang_tag').setLabel('Etiket (Tag)').setStyle(TextInputStyle.Short).setValue(store.gangInfo.tag).setRequired(true);
      const leaderInput = new TextInputBuilder().setCustomId('txt_gang_leader').setLabel('Birlik Lideri (OG)').setStyle(TextInputStyle.Short).setValue(store.gangInfo.leaderName).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(leaderInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // YETKİ VE BAŞVURU BUTONLARI
    // ==========================================
    if (customId === 'btn_perm_edit') {
      const modal = new ModalBuilder().setCustomId('modal_perm_edit').setTitle('Rütbeye İzin Ata / Kaldır');
      const rankInput = new TextInputBuilder().setCustomId('txt_perm_rank').setLabel('Hedef Rütbe (1-5 veya Adı)').setStyle(TextInputStyle.Short).setPlaceholder('Örn: Kıdemli Üye veya 2').setRequired(true);
      const actionInput = new TextInputBuilder().setCustomId('txt_perm_action').setLabel('İşlem (Ekle / Kaldır)').setStyle(TextInputStyle.Short).setValue('Ekle').setRequired(true);
      const permInput = new TextInputBuilder().setCustomId('txt_perm_name').setLabel('İzin Kodu').setStyle(TextInputStyle.Short).setPlaceholder('Örn: member.add, economy.withdraw').setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(rankInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(actionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(permInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_app_review') {
      const modal = new ModalBuilder().setCustomId('modal_app_review').setTitle('Başvuruyu İncele & Puanla');
      const idInput = new TextInputBuilder().setCustomId('txt_app_id').setLabel('Başvuru No veya ID').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 101 veya Discord ID').setRequired(true);
      const scoreInput = new TextInputBuilder().setCustomId('txt_app_score').setLabel('Puan (1 - 10)').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 8').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_app_notes').setLabel('İnceleme Notu').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(scoreInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_app_accept') {
      const modal = new ModalBuilder().setCustomId('modal_app_accept').setTitle('Başvuruyu Onayla / Kabul Et');
      const idInput = new TextInputBuilder().setCustomId('txt_app_id').setLabel('Başvuru No veya ID').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 101 veya Discord ID').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_app_reason').setLabel('Kabul Gerekçesi').setStyle(TextInputStyle.Paragraph).setValue('Rol deneyimi yeterli görüldü.').setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_app_reject') {
      const modal = new ModalBuilder().setCustomId('modal_app_reject').setTitle('Başvuruyu Reddet');
      const idInput = new TextInputBuilder().setCustomId('txt_app_id').setLabel('Başvuru No veya ID').setStyle(TextInputStyle.Short).setPlaceholder('Örn: 101 veya Discord ID').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_app_reason').setLabel('Ret Gerekçesi').setStyle(TextInputStyle.Paragraph).setPlaceholder('Karakter hikayesi yetersiz...').setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_rec_invite_candidate') {
      const modal = new ModalBuilder().setCustomId('modal_rec_invite').setTitle('Yeni Aday Daveti Oluştur');
      const discordInput = new TextInputBuilder().setCustomId('txt_rec_discord').setLabel('Aday Discord ID veya @Etiket').setStyle(TextInputStyle.Short).setRequired(true);
      const mtaInput = new TextInputBuilder().setCustomId('txt_rec_mta').setLabel('Aday MTA Karakter Adı').setStyle(TextInputStyle.Short).setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_rec_notes').setLabel('Aday Hakkında Not').setStyle(TextInputStyle.Paragraph).setPlaceholder('Sokakta tanışıldı, role uygun...').setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(discordInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(mtaInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // ARAÇ, HOOD, GÖREV, SAVAŞ, DİPLOMASİ
    // ==========================================
    if (customId === 'btn_veh_status') {
      const modal = new ModalBuilder().setCustomId('modal_veh_status').setTitle('Araç Durumu Güncelle');
      const plateInput = new TextInputBuilder().setCustomId('txt_veh_plate').setLabel('Araç Plakası').setStyle(TextInputStyle.Short).setRequired(true);
      const statusInput = new TextInputBuilder().setCustomId('txt_veh_status').setLabel('Yeni Durum').setStyle(TextInputStyle.Short).setValue('Garajda').setPlaceholder('Garajda / Kullanımda / Tamirde / Hurda').setRequired(true);
      const noteInput = new TextInputBuilder().setCustomId('txt_veh_notes').setLabel('Durum Notu / Sürücü').setStyle(TextInputStyle.Paragraph).setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(plateInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_ter_update') {
      const modal = new ModalBuilder().setCustomId('modal_ter_update').setTitle('Bölge Hakimiyet Durumu Güncelle');
      const nameInput = new TextInputBuilder().setCustomId('txt_ter_name').setLabel('Bölge Adı').setStyle(TextInputStyle.Short).setPlaceholder('Örn: Ganton, Idlewood').setRequired(true);
      const statusInput = new TextInputBuilder().setCustomId('txt_ter_status').setLabel('Bölge Durumu').setStyle(TextInputStyle.Short).setValue('Kontrol Altında').setPlaceholder('Kontrol Altında / Tehdit Altında / Kaybedildi').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_ter_notes').setLabel('Devriye / Savunma Notları').setStyle(TextInputStyle.Paragraph).setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_ter_history') {
      const ters = TerritoryService.getAll();
      const embed = EmbedBuilderUtil.createDefault(
        '🗺️ Birlik Bölge Hakimiyet Listesi',
        ters.map(t => `• **${t.name}** [${t.status}]\n  Sorumlu: ${t.responsibleMemberName || 'Genel Devriye'} | Not: *${t.notes || 'Asayiş berkemal'}*`).join('\n\n')
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    if (customId === 'btn_mis_create') {
      const modal = new ModalBuilder().setCustomId('modal_mis_create').setTitle('Yeni Birlik RP Görevi Başlat');
      const titleInput = new TextInputBuilder().setCustomId('txt_mis_title').setLabel('Görev Başlığı').setStyle(TextInputStyle.Short).setPlaceholder('Liman Sevkiyatı Koruması').setRequired(true);
      const catInput = new TextInputBuilder().setCustomId('txt_mis_category').setLabel('Görev Kategorisi').setStyle(TextInputStyle.Short).setValue('Sevkiyat').setPlaceholder('Baskın / Sevkiyat / Hood Devriyesi').setRequired(true);
      const descInput = new TextInputBuilder().setCustomId('txt_mis_desc').setLabel('Görev Açıklaması ve Emirler').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const xpInput = new TextInputBuilder().setCustomId('txt_mis_xp').setLabel('Ödül XP (Örn: 150)').setStyle(TextInputStyle.Short).setValue('150').setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(catInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(xpInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_mis_complete') {
      const modal = new ModalBuilder().setCustomId('modal_mis_complete').setTitle('Görevi Tamamla & XP Dağıt');
      const idInput = new TextInputBuilder().setCustomId('txt_mis_id').setLabel('Görev Adı veya ID').setStyle(TextInputStyle.Short).setRequired(true);
      const outcomeInput = new TextInputBuilder().setCustomId('txt_mis_outcome').setLabel('Operasyon Sonuç Raporu').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(outcomeInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_mis_cancel') {
      const modal = new ModalBuilder().setCustomId('modal_mis_cancel').setTitle('Görevi İptal Et');
      const idInput = new TextInputBuilder().setCustomId('txt_mis_id').setLabel('Görev Adı veya ID').setStyle(TextInputStyle.Short).setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_mis_reason').setLabel('İptal Nedeni').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_war_create') {
      const modal = new ModalBuilder().setCustomId('modal_war_create').setTitle('Yeni Çatışma / Savaş Kaydı Aç');
      const rivalInput = new TextInputBuilder().setCustomId('txt_war_rival').setLabel('Düşman Birlik Adı').setStyle(TextInputStyle.Short).setPlaceholder('Vagos, Ballas vb.').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_war_reason').setLabel('Savaş Nedeni / Sebep').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const partInput = new TextInputBuilder().setCustomId('txt_war_participants').setLabel('Katılan Üyeler').setStyle(TextInputStyle.Short).setValue('Tüm Birlik').setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(rivalInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(partInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_war_finish') {
      const modal = new ModalBuilder().setCustomId('modal_war_finish').setTitle('Savaşı Sonuçlandır ve Arşivle');
      const idInput = new TextInputBuilder().setCustomId('txt_war_id').setLabel('Savaş No veya Rakip').setStyle(TextInputStyle.Short).setRequired(true);
      const statusInput = new TextInputBuilder().setCustomId('txt_war_status').setLabel('Savaş Sonucu').setStyle(TextInputStyle.Short).setValue('Zaferle Sonuçlandı').setPlaceholder('Zaferle Sonuçlandı / Mağlubiyet / Ateşkes').setRequired(true);
      const outcomeInput = new TextInputBuilder().setCustomId('txt_war_outcome').setLabel('Kurgusal Çatışma Özeti').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(outcomeInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_dip_update') {
      const modal = new ModalBuilder().setCustomId('modal_dip_update').setTitle('Diplomatik İlişkiyi Güncelle');
      const factionInput = new TextInputBuilder().setCustomId('txt_dip_faction').setLabel('Birlik Adı').setStyle(TextInputStyle.Short).setRequired(true);
      const statusInput = new TextInputBuilder().setCustomId('txt_dip_status').setLabel('İlişki Durumu').setStyle(TextInputStyle.Short).setValue('Müttefik').setPlaceholder('Müttefik / Nötr / Düşman / Barış').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_dip_notes').setLabel('Anlaşma / Temas Detayı').setStyle(TextInputStyle.Paragraph).setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(factionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_dip_new') {
      const modal = new ModalBuilder().setCustomId('modal_dip_new').setTitle('Yeni Birlik Diplomatik Temas');
      const factionInput = new TextInputBuilder().setCustomId('txt_dip_faction').setLabel('Yeni Birlik Adı').setStyle(TextInputStyle.Short).setRequired(true);
      const statusInput = new TextInputBuilder().setCustomId('txt_dip_status').setLabel('İlk İlişki Durumu').setStyle(TextInputStyle.Short).setValue('Nötr').setPlaceholder('Nötr / Müttefik / Düşman').setRequired(true);
      const contactInput = new TextInputBuilder().setCustomId('txt_dip_contact').setLabel('Birlik Temas Kişisi').setStyle(TextInputStyle.Short).setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(factionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statusInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(contactInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // DİSİPLİN, İHBAR, KANIT, TİCKET, DUYURU
    // ==========================================
    if (customId === 'btn_pun_appeal') {
      const modal = new ModalBuilder().setCustomId('modal_pun_appeal').setTitle('Cezaya İtiraz Et');
      const idInput = new TextInputBuilder().setCustomId('txt_pun_id').setLabel('Ceza No veya Üye Adı').setStyle(TextInputStyle.Short).setPlaceholder('Örn: CEZA-101').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_pun_reason').setLabel('İtiraz Savunması').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_pun_resolve_appeal') {
      const modal = new ModalBuilder().setCustomId('modal_pun_resolve').setTitle('Ceza İtirazını Karara Bağla');
      const idInput = new TextInputBuilder().setCustomId('txt_pun_id').setLabel('Ceza No veya Üye Adı').setStyle(TextInputStyle.Short).setRequired(true);
      const decisionInput = new TextInputBuilder().setCustomId('txt_pun_decision').setLabel('Karar (Onay/Ret)').setStyle(TextInputStyle.Short).setValue('Kabul Edildi').setPlaceholder('Kabul Edildi / Reddedildi').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_pun_notes').setLabel('Yönetim Açıklaması').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(decisionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_rep_new') {
      const modal = new ModalBuilder().setCustomId('modal_rep_new').setTitle('Gizli İhbar / Şikayet Bildir');
      const subjectInput = new TextInputBuilder().setCustomId('txt_rep_subject').setLabel('İhbar Konusu').setStyle(TextInputStyle.Short).setRequired(true);
      const catInput = new TextInputBuilder().setCustomId('txt_rep_category').setLabel('İhbar Kategorisi').setStyle(TextInputStyle.Short).setValue('Kural İhlali').setPlaceholder('Kural İhlali / Hırsızlık / Sadakat').setRequired(true);
      const descInput = new TextInputBuilder().setCustomId('txt_rep_desc').setLabel('Detaylı Açıklama').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(catInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_rep_resolve') {
      const modal = new ModalBuilder().setCustomId('modal_rep_resolve').setTitle('İhbarı Sonuçlandır');
      const idInput = new TextInputBuilder().setCustomId('txt_rep_id').setLabel('İhbar No veya Konu').setStyle(TextInputStyle.Short).setRequired(true);
      const verdictInput = new TextInputBuilder().setCustomId('txt_rep_verdict').setLabel('İhbar Kararı').setStyle(TextInputStyle.Short).setValue('Çözümlendi').setPlaceholder('Çözümlendi / Asılsız / Kapatıldı').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_rep_notes').setLabel('İnceleme ve Karar Notu').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(verdictInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_evi_upload') {
      const modal = new ModalBuilder().setCustomId('modal_evi_upload').setTitle('Kanıt ve Medya Kaydet');
      const titleInput = new TextInputBuilder().setCustomId('txt_evi_title').setLabel('Kanıt Başlığı').setStyle(TextInputStyle.Short).setRequired(true);
      const urlInput = new TextInputBuilder().setCustomId('txt_evi_url').setLabel('Kanıt Medya Bağlantısı').setStyle(TextInputStyle.Short).setPlaceholder('https://...').setRequired(true);
      const caseInput = new TextInputBuilder().setCustomId('txt_evi_case').setLabel('İlişkili Olay / Üye').setStyle(TextInputStyle.Short).setRequired(true);
      const descInput = new TextInputBuilder().setCustomId('txt_evi_desc').setLabel('Açıklama').setStyle(TextInputStyle.Paragraph).setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(caseInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
      );
      await interaction.showModal(modal);
      return;
    }



    if (customId === 'btn_ann_create') {
      const modal = new ModalBuilder().setCustomId('modal_ann_create').setTitle('Resmi Birlik Duyurusu Yayınla');
      const titleInput = new TextInputBuilder().setCustomId('txt_ann_title').setLabel('Duyuru Başlığı').setStyle(TextInputStyle.Short).setRequired(true);
      const contentInput = new TextInputBuilder().setCustomId('txt_ann_content').setLabel('Duyuru Metni').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const pinInput = new TextInputBuilder().setCustomId('txt_ann_pin').setLabel('Sabitlensin mi? (E/H)').setStyle(TextInputStyle.Short).setValue('Evet').setPlaceholder('Evet / Hayır').setRequired(false);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(pinInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // ==========================================
    // GİZLİ ARŞİV, SORUŞTURMA, TOPLANTI, SİSTEM
    // ==========================================
    if (customId === 'btn_sec_create') {
      const modal = new ModalBuilder().setCustomId('modal_sec_create').setTitle('Gizli Arşiv Dosyası Ekle');
      const codeInput = new TextInputBuilder().setCustomId('txt_sec_code').setLabel('Kod Adı (Örn: GÖLGE)').setStyle(TextInputStyle.Short).setRequired(true);
      const catInput = new TextInputBuilder().setCustomId('txt_sec_cat').setLabel('Dosya Kategorisi').setStyle(TextInputStyle.Short).setValue('İstihbarat').setPlaceholder('İstihbarat / Gizli İttifak').setRequired(true);
      const contentInput = new TextInputBuilder().setCustomId('txt_sec_content').setLabel('Gizli Dosya İçeriği').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(catInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_invs_new') {
      const modal = new ModalBuilder().setCustomId('modal_invs_new').setTitle('İç Disiplin Soruşturması Başlat');
      const targetInput = new TextInputBuilder().setCustomId('txt_invs_target').setLabel('Soruşturulan Üye').setStyle(TextInputStyle.Short).setPlaceholder('İsim veya Discord ID').setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_invs_reason').setLabel('Soruşturma Gerekçesi').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const invInput = new TextInputBuilder().setCustomId('txt_invs_investigator').setLabel('Görevli Müfettiş').setStyle(TextInputStyle.Short).setValue(executor.discordUsername).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(invInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_invs_verdict') {
      const modal = new ModalBuilder().setCustomId('modal_invs_verdict').setTitle('Soruşturma Kararı Ver');
      const idInput = new TextInputBuilder().setCustomId('txt_invs_id').setLabel('Soruşturma No veya Üye').setStyle(TextInputStyle.Short).setRequired(true);
      const verdictInput = new TextInputBuilder().setCustomId('txt_invs_verdict').setLabel('Soruşturma Kararı').setStyle(TextInputStyle.Short).setValue('Aklandı').setPlaceholder('Aklandı / Suçlu Bulundu / Tenzil / İhraç').setRequired(true);
      const notesInput = new TextInputBuilder().setCustomId('txt_invs_notes').setLabel('Gerekçeli Hüküm Notu').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(verdictInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_meet_start') {
      const modal = new ModalBuilder().setCustomId('modal_meet_start').setTitle('Toplantı Oturumunu Başlat');
      const idInput = new TextInputBuilder().setCustomId('txt_meet_id').setLabel('Toplantı Numarası veya Başlık').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(idInput));
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_meet_complete') {
      const modal = new ModalBuilder().setCustomId('modal_meet_complete').setTitle('Toplantıyı Tamamla ve Kararları Kaydet');
      const idInput = new TextInputBuilder().setCustomId('txt_meet_id').setLabel('Toplantı Numarası veya Başlık').setStyle(TextInputStyle.Short).setRequired(true);
      const decInput = new TextInputBuilder().setCustomId('txt_meet_decisions').setLabel('Alınan Kararlar ve Tutanak').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(decInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_meet_cancel') {
      const modal = new ModalBuilder().setCustomId('modal_meet_cancel').setTitle('Toplantıyı İptal Et');
      const idInput = new TextInputBuilder().setCustomId('txt_meet_id').setLabel('Toplantı Numarası veya Başlık').setStyle(TextInputStyle.Short).setRequired(true);
      const reasonInput = new TextInputBuilder().setCustomId('txt_meet_reason').setLabel('İptal Gerekçesi').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(idInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_sys_restore') {
      const modal = new ModalBuilder().setCustomId('modal_sys_restore').setTitle('Sistem Geri Yükleme Onayı');
      const confirmInput = new TextInputBuilder().setCustomId('txt_sys_confirm').setLabel("Onaylamak için 'ONAY' yazınız").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput));
      await interaction.showModal(modal);
      return;
    }

    if (customId === 'btn_sys_setup') {
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true });
        }
      } catch (err: any) {
        if (err?.code === 10062) return;
        throw err;
      }
      const res = await SetupService.distributeAllPanels(interaction.guild);
      await interaction.editReply({
        embeds: [
          EmbedBuilderUtil.success(
            'Kurulum Tamamlandı',
            `Toplam **${res.count}** adet yönetim paneli ilgili Discord kanallarına başarıyla yerleştirildi.`
          ) as any
        ]
      }).catch(() => {});
      return;
    }

    // ==========================================
    // CANLI YENİLEME (REFRESH) - IN-PLACE MESAJ GÜNCELLEMESİ
    // ==========================================
    if (customId.includes('refresh') || customId.endsWith('_refresh')) {
      try {
        const chName = (interaction.channel as any)?.name || '';
        const panelId = this.detectPanelId(customId, chName);
        const panelData = DiscordPanelRegistry.getPanel(panelId);
        const btnRows = this.renderPanelActionRows(panelData);

        // Orijinal mesajda kategori select menüsü var mı kontrol et
        const hasSelectMenu = interaction.message.components.some((row: any) =>
          row.components?.some((c: any) => c?.type === 3 || c?.data?.type === 3)
        );

        const components: any[] = [...btnRows];
        if (hasSelectMenu) {
          components.push(...this.createCategoryMenuRows(panelData.name));
        }

        await interaction.update({
          embeds: [panelData.embed as any],
          components
        });
        return;
      } catch (err: any) {
        BotLogger.error('[PANEL YENİLEME HATASI]', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            embeds: [EmbedBuilderUtil.error('Yenileme Hatası', 'Panel güncellenirken bir sorun oluştu.') as any],
            ephemeral: true
          });
        }
        return;
      }
    }

    // Varsayılan Güvenli Geri Dönüş
    await interaction.reply({
      embeds: [
        EmbedBuilderUtil.createDefault(
          'İşlem Gerçekleştirildi',
          'Seçilen panel işlemi başarıyla yürütüldü. Bilgiler güncellendi.'
        ) as any
      ],
      ephemeral: true
    });
  }

  /**
   * Modal Form Gönderimi İşleyicisi
   */
  private async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const { customId, user } = interaction;
    const executor = this.ensureExecutorMember(user, interaction.guild, interaction.member);

    // ==========================================
    // 6. İN-AKTİFLİK BİLDİRİM FORMU
    // ==========================================
    if (customId === 'modal_inactivity_submit') {
      const startDate = interaction.fields.getTextInputValue('txt_inact_start');
      const endDate = interaction.fields.getTextInputValue('txt_inact_end');
      const reason = interaction.fields.getTextInputValue('txt_inact_reason');
      const notes = interaction.fields.getTextInputValue('txt_inact_notes') || undefined;

      await interaction.deferReply({ ephemeral: true });

      const res = await InactivityService.submitRequest({
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        startDate,
        endDate,
        reason,
        notes,
        guild: interaction.guild
      });

      const embed = {
        title: '🌴 İN-AKTİFLİK BİLDİRİMİNİZ ALINDI',
        description: `İnaktiflik bildiriminiz başarıyla sisteme kaydedildi ve **Yönetim Karargahı (OG & Under OG)** incelemesine iletildi.\n\n` +
          `• **Talep No:** \`${res.request.requestNumber}\`\n` +
          `• **Başlangıç:** \`${startDate}\`\n` +
          `• **Bitiş:** \`${endDate}\`\n` +
          `• **Sebep:** ${reason}\n\n` +
          `Yönetim onayladığında birlik içi statünüz otomatik olarak **İzinli** yapılacaktır. Süreniz dolduğunda sistem sizi tekrar aktif yapacaktır.`,
        color: 0x2ECC71,
        footer: { text: "BLOOD'S Gang İnaktiflik Sistemi" },
        timestamp: new Date().toISOString()
      };

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 1. Rütbe Terfi Modalı
    if (customId === 'modal_rank_promote') {
      const targetQuery = interaction.fields.getTextInputValue('txt_rank_target');
      const reason = interaction.fields.getTextInputValue('txt_rank_reason');

      let target = this.findMember(targetQuery);
      if (!target) {
        const cleanId = targetQuery.replace(/[<@!>]/g, '').trim();
        if (/^\d{17,20}$/.test(cleanId)) {
          const addRes = MemberService.addMember({
            discordUserId: cleanId,
            discordUsername: `Üye_${cleanId.slice(-4)}`,
            mtaName: `Yeni_Uye_${cleanId.slice(-4)}`,
            executorId: executor.discordUserId,
            executorName: executor.discordUsername
          });
          if (addRes.member) target = addRes.member;
        }
      }

      if (!target) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Üye Bulunamadı', `"${targetQuery}" adına kayıtlı üye bulunamadı. Lütfen geçerli bir Discord ID, @etiket veya MTA karakter adı giriniz.`) as any],
          ephemeral: true
        });
        return;
      }

      const result = RankService.promoteMember({
        targetMemberId: target.id,
        executorDiscordId: executor.discordUserId,
        reason
      });

      if (!result.success) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Terfi Başarısız', result.message) as any],
          ephemeral: true
        });
      } else {
        // Discord rol senkronizasyonu ve zengin log gönderimi
        if (interaction.guild && result.newRank) {
          await DiscordSyncService.syncMemberRole(interaction.guild, target.discordUserId, result.newRank.level);
          await DiscordSyncService.sendLog(
            interaction.guild,
            'uye',
            EmbedBuilderUtil.createDefault(
              '📈 Rütbe Terfisi Gerçekleşti',
              `**Üye:** <@${target.discordUserId}> (${target.discordUsername})\n**Yeni Rütbe:** ${result.newRank.name}\n**Gerekçe:** ${reason}\n**Yetkili:** <@${user.id}>`
            )
          );
        }

        await interaction.reply({
          embeds: [
            EmbedBuilderUtil.success(
              'Terfi Başarıyla Onaylandı',
              `**${target.discordUsername}** (${target.currentMtaName}) isimli üye **${result.newRank?.name}** seviyesine terfi ettirildi!\n\nGerekçe: ${reason}\nYetkili: <@${user.id}>`
            ) as any
          ]
        });
      }
      return;
    }

    // 2. Rütbe Tenzil Modalı
    if (customId === 'modal_rank_demote') {
      const targetQuery = interaction.fields.getTextInputValue('txt_rank_target');
      const reason = interaction.fields.getTextInputValue('txt_rank_reason');

      const target = this.findMember(targetQuery);
      if (!target) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Üye Bulunamadı', `"${targetQuery}" için kayıtlı üye bulunamadı.`) as any],
          ephemeral: true
        });
        return;
      }

      const result = RankService.demoteMember({
        targetMemberId: target.id,
        executorDiscordId: executor.discordUserId,
        reason
      });

      if (!result.success) {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.error('Tenzil Başarısız', result.message) as any],
          ephemeral: true
        });
      } else {
        // Discord rol senkronizasyonu ve zengin log gönderimi
        if (interaction.guild && result.newRank) {
          await DiscordSyncService.syncMemberRole(interaction.guild, target.discordUserId, result.newRank.level);
          await DiscordSyncService.sendLog(
            interaction.guild,
            'uye',
            EmbedBuilderUtil.createDefault(
              '📉 Rütbe Düşürüldü (Tenzil)',
              `**Üye:** <@${target.discordUserId}> (${target.discordUsername})\n**Yeni Rütbe:** ${result.newRank.name}\n**Gerekçe:** ${reason}\n**Yetkili:** <@${user.id}>`
            )
          );
        }

        await interaction.reply({
          embeds: [
            EmbedBuilderUtil.success(
              'Rütbe Düşürme (Tenzil) Tamamlandı',
              `**${target.discordUsername}** adlı üyenin rütbesi **${result.newRank?.name}** seviyesine düşürüldü.\n\nGerekçe: ${reason}\nYetkili: <@${user.id}>`
            ) as any
          ]
        });
      }
      return;
    }

    // 3. Yeni Üye Ekleme Modalı
    if (customId === 'modal_mem_add') {
      const discordId = interaction.fields.getTextInputValue('txt_mem_discord_id').replace(/[<@!>]/g, '').trim();
      const discordName = interaction.fields.getTextInputValue('txt_mem_discord_username');
      const mtaName = interaction.fields.getTextInputValue('txt_mem_mta_name');
      const mtaId = interaction.fields.getTextInputValue('txt_mem_mta_id') || undefined;

      const result = MemberService.addMember({
        discordUserId: discordId,
        discordUsername: discordName,
        mtaName,
        mtaId,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!result.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Kayıt Başarısız', result.message) as any], ephemeral: true });
      } else {
        await interaction.reply({
          embeds: [
            EmbedBuilderUtil.success(
              'Yeni Birlik Üyesi Kaydedildi',
              `**${discordName}** (<@${discordId}>) başarıyla birliğe dahil edildi!\n` +
                `MTA: ${mtaName} (${result.member?.currentMtaId})\n` +
                `Başlangıç Rütbesi: ${result.member?.rankName}`
            ) as any
          ]
        });
      }
      return;
    }

    // 4. Üye Silme / İhraç Modalı (Test üyelerini de siler)
    if (customId === 'modal_mem_remove') {
      const targetQuery = interaction.fields.getTextInputValue('txt_mem_target');
      const actionType = interaction.fields.getTextInputValue('txt_mem_action').toLowerCase();
      const reason = interaction.fields.getTextInputValue('txt_mem_reason');

      if (actionType.includes('sil') || targetQuery.toLowerCase().includes('test')) {
        const delRes = MemberService.deleteMember(targetQuery);
        if (!delRes.success) {
          await interaction.reply({ embeds: [EmbedBuilderUtil.error('Silme Başarısız', delRes.message) as any], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [EmbedBuilderUtil.success('Üye Kaydı Silindi', `${delRes.message}\nGerekçe: ${reason}`) as any] });
        }
        return;
      }

      const target = this.findMember(targetQuery);
      if (!target) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', `"${targetQuery}" için üye kaydı bulunamadı.`) as any], ephemeral: true });
        return;
      }

      const remRes = MemberService.removeMember({
        memberId: target.id,
        reason,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        isKick: actionType.includes('ihraç')
      });

      if (!remRes.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', remRes.message) as any], ephemeral: true });
      } else {
        if (interaction.guild && target.discordUserId) {
          await DiscordSyncService.revokeAllGangRoles(
            interaction.guild,
            target.discordUserId,
            `Birlikten Çıkarıldı: ${reason}`,
            actionType.includes('ck')
          );
        }
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Üye Çıkarıldı', `${remRes.message}\n*(Discord birlik rolleri ve yetkileri geri alındı.)*`) as any] });
      }
      return;
    }

    // 5. Üye Durum Modalı
    if (customId === 'modal_mem_status') {
      const targetQuery = interaction.fields.getTextInputValue('txt_mem_target');
      const newStatus = interaction.fields.getTextInputValue('txt_mem_status') as any;
      const reason = interaction.fields.getTextInputValue('txt_mem_reason');

      const target = this.findMember(targetQuery);
      if (!target) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', `"${targetQuery}" bulunamadı.`) as any], ephemeral: true });
        return;
      }

      const res = MemberService.changeStatus(target.id, newStatus, reason, executor.discordUserId, executor.discordUsername);
      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Başarısız', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Durum Güncellendi', `${target.discordUsername} yeni durumu: ${newStatus}`) as any] });
      }
      return;
    }

    // 6. Üye Profil Modalı
    if (customId === 'modal_mem_profile') {
      const targetQuery = interaction.fields.getTextInputValue('txt_mem_target');
      const member = this.findMember(targetQuery);
      if (!member) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', `"${targetQuery}" isimli üye bulunamadı.`) as any], ephemeral: true });
        return;
      }

      const embed = EmbedBuilderUtil.createDefault(
        'Üye Profili: ' + member.discordUsername,
        `**Rütbe:** ${member.rankName} (Seviye ${member.rankLevel})\n` +
          `**MTA Karakter:** ${member.currentMtaName} (${member.currentMtaId})\n` +
          `**Durum:** ${member.status}\n` +
          `**XP:** ${member.xp} | **Aktivite Puanı:** ${member.activityPoints}\n` +
          `**Uyarı Sayısı:** ${member.warningsCount}\n` +
          `**Kayıt:** ${new Date(member.joinedAt).toLocaleDateString('tr-TR')}`
      );
      await interaction.reply({ embeds: [embed as any], ephemeral: true });
      return;
    }

    // 7. Kasa Para Yatırma
    if (customId === 'modal_eco_deposit') {
      const amountStr = interaction.fields.getTextInputValue('txt_eco_amount');
      const category = interaction.fields.getTextInputValue('txt_eco_category');
      const desc = interaction.fields.getTextInputValue('txt_eco_desc');
      const amount = parseInt(amountStr.replace(/\D/g, ''), 10);

      const result = EconomyService.executeTransaction({
        type: 'Para Yatırma',
        amount,
        category,
        description: desc,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!result.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('İşlem Başarısız', result.message) as any], ephemeral: true });
      } else {
        if (interaction.guild) {
          await DiscordSyncService.sendLog(
            interaction.guild,
            'kasa',
            EmbedBuilderUtil.createDefault(
              '💰 Birlik Kasasına Para Yatırıldı',
              `**Yatırılan Tutar:** $${amount.toLocaleString('tr-TR')}\n**Kategori:** ${category}\n**Açıklama:** ${desc}\n**Yetkili:** <@${user.id}>`
            )
          );
        }
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Para Yatırıldı', result.message) as any] });
      }
      return;
    }

    // 8. Kasa Para Çekme
    if (customId === 'modal_eco_withdraw') {
      const amountStr = interaction.fields.getTextInputValue('txt_eco_amount');
      const category = interaction.fields.getTextInputValue('txt_eco_category');
      const desc = interaction.fields.getTextInputValue('txt_eco_desc');
      const amount = parseInt(amountStr.replace(/\D/g, ''), 10);

      const result = EconomyService.executeTransaction({
        type: 'Para Çekme',
        amount,
        category,
        description: desc,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!result.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Çekim Başarısız', result.message) as any], ephemeral: true });
      } else {
        if (interaction.guild) {
          await DiscordSyncService.sendLog(
            interaction.guild,
            'kasa',
            EmbedBuilderUtil.createDefault(
              '💸 Birlik Kasasından Para Çekildi',
              `**Çekilen Tutar:** $${amount.toLocaleString('tr-TR')}\n**Kategori:** ${category}\n**Açıklama:** ${desc}\n**Yetkili:** <@${user.id}>`
            )
          );
        }
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Para Çekildi', result.message) as any] });
      }
      return;
    }

    // 9. Envanter Eşya Ekleme
    if (customId === 'modal_inv_add') {
      const name = interaction.fields.getTextInputValue('txt_inv_name');
      const category = interaction.fields.getTextInputValue('txt_inv_category');
      const qty = parseInt(interaction.fields.getTextInputValue('txt_inv_qty').replace(/\D/g, ''), 10) || 1;
      const source = interaction.fields.getTextInputValue('txt_inv_source');

      const res = InventoryService.addItem({
        name,
        category,
        quantity: qty,
        minWarningLimit: 5,
        description: `${category} kategorisinde depoya eklendi.`,
        source,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Başarısız', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Envantere Eklendi', `**${name}** (${qty} adet) envantere başarıyla eklendi.`) as any] });
      }
      return;
    }

    // 10. Envanter Eşya Çıkarma
    if (customId === 'modal_inv_remove') {
      const nameQuery = interaction.fields.getTextInputValue('txt_inv_name').toLowerCase();
      const qty = parseInt(interaction.fields.getTextInputValue('txt_inv_qty').replace(/\D/g, ''), 10) || 1;
      const reason = interaction.fields.getTextInputValue('txt_inv_reason');

      const item = store.inventory.find(i => i.id.toLowerCase() === nameQuery || i.name.toLowerCase().includes(nameQuery));
      if (!item) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Envanterde bu isimde bir eşya bulunamadı.') as any], ephemeral: true });
        return;
      }

      const res = InventoryService.removeItem({
        itemId: item.id,
        quantity: qty,
        reason,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Başarısız', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Envanterden Çıkarıldı', `**${item.name}** (${qty} adet) çıkarıldı. Kalan stok: ${res.remainingQuantity}`) as any] });
      }
      return;
    }

    // 11. Araç Ekleme
    if (customId === 'modal_veh_add') {
      const name = interaction.fields.getTextInputValue('txt_veh_name');
      const plate = interaction.fields.getTextInputValue('txt_veh_plate');
      const garage = interaction.fields.getTextInputValue('txt_veh_garage');

      const res = VehicleService.addVehicle({
        name,
        plate,
        garage,
        ownerName: 'Birlik Mülkü',
        description: 'Operasyon ve devriye aracı',
        modelId: 400,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Araç Filoya Eklendi', `**${name}** [${plate}] ${garage} konumuna yerleştirildi.`) as any] });
      }
      return;
    }

    // 12. Araç Zimmetleme
    if (customId === 'modal_veh_assign') {
      const plate = interaction.fields.getTextInputValue('txt_veh_plate');
      const memberQuery = interaction.fields.getTextInputValue('txt_veh_member');
      const target = this.findMember(memberQuery);
      const vehicle = store.vehicles.find(v => v.plate.toLowerCase() === plate.toLowerCase());

      if (!vehicle) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Bu plakaya sahip araç filoda yok.') as any], ephemeral: true });
        return;
      }

      const res = VehicleService.updateStatus(vehicle.id, 'Kullanımda', target ? target.currentMtaName : memberQuery, executor.discordUsername);
      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Araç Zimmetlendi', `**${vehicle.name}** [${plate}] ${target ? target.discordUsername : memberQuery} kişisine zimmetlendi.`) as any] });
      }
      return;
    }

    // 13. Ceza Verme Modalı
    if (customId === 'modal_pun_issue') {
      const targetQuery = interaction.fields.getTextInputValue('txt_pun_target');
      const type = interaction.fields.getTextInputValue('txt_pun_type') as any;
      const reason = interaction.fields.getTextInputValue('txt_pun_reason');

      const target = this.findMember(targetQuery);
      if (!target) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Hedef üye bulunamadı.') as any], ephemeral: true });
        return;
      }

      const res = PunishmentService.issuePunishment({
        memberId: target.id,
        type,
        reason,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        let extraInfo = '';
        // Otomatik İhraç & Rol İptali Kontrolü (GELİŞTİRİLEBİLİR SİSTEMLER 3)
        const isExpelled = type.toLowerCase().includes('ihraç') || (target.warningsCount && target.warningsCount >= 3);
        if (isExpelled) {
          MemberService.removeMember({
            memberId: target.id,
            reason: `Disiplin Yaptırımı: ${type} (${reason})`,
            executorId: executor.discordUserId,
            executorName: executor.discordUsername,
            isKick: true
          });
          extraInfo = '\n⚠️ **Üyenin 3 uyarı sınırını aşması veya İhraç cezası alması sebebiyle tüm birlik yetkileri iptal edildi ve birlikten ihraç edildi!**';

          if (interaction.guild) {
            await DiscordSyncService.revokeAllGangRoles(interaction.guild, target.discordUserId);
          }
        }

        if (interaction.guild) {
          await DiscordSyncService.sendLog(
            interaction.guild,
            'ceza',
            EmbedBuilderUtil.createDefault(
              '⚖️ Disiplin Cezası Uygulandı',
              `**Cezalandırılan:** <@${target.discordUserId}> (${target.discordUsername})\n**Ceza Türü:** ${type}\n**Gerekçe:** ${reason}\n**Toplam Uyarı:** ${target.warningsCount}\n**Uygulayan:** <@${user.id}>${extraInfo}`
            )
          );
        }

        await interaction.reply({
          embeds: [EmbedBuilderUtil.success('Ceza Sicile İşlendi', `**${target.discordUsername}** adlı üyeye **${type}** cezası uygulandı.\nGerekçe: ${reason}${extraInfo}`) as any]
        });
      }
      return;
    }

    // 14. Toplantı Planlama Modalı
    if (customId === 'modal_meet_create') {
      const title = interaction.fields.getTextInputValue('txt_meet_title');
      const subject = interaction.fields.getTextInputValue('txt_meet_subject');
      const timeStr = interaction.fields.getTextInputValue('txt_meet_time');

      const res = MeetingService.createMeeting({
        title,
        subject,
        agenda: 'Birlik içi genel değerlendirme',
        date: new Date(),
        timeString: timeStr,
        scope: 'Genel Birlik',
        organizerId: executor.discordUserId,
        organizerName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Toplantı Planlandı', `**${title}** saat **${timeStr}** için planlandı.\nGündem: ${subject}`) as any] });
      }
      return;
    }

    // 15. Başvuru Formu
    if (customId === 'modal_app_submit') {
      await interaction.deferReply({ ephemeral: true });

      const ooc = interaction.fields.getTextInputValue('txt_app_ooc');
      const mtaName = interaction.fields.getTextInputValue('txt_app_mta');
      const story = interaction.fields.getTextInputValue('txt_app_story');
      const reason = interaction.fields.getTextInputValue('txt_app_reason');

      let parsedAge = 20;
      const ageMatch = ooc.match(/\b(1[4-9]|[2-6][0-9])\b/);
      if (ageMatch) parsedAge = parseInt(ageMatch[1], 10);

      const result = ApplicationService.createApplication({
        discordUserId: user.id,
        discordUsername: user.tag || user.username,
        oocName: ooc,
        age: parsedAge,
        mtaCharacterName: mtaName,
        characterBackstory: story,
        roleplayExperience: 'MTA Hard RP',
        joinReason: reason
      });

      if (!result.success) {
        await interaction.editReply({
          embeds: [EmbedBuilderUtil.error('Başvuru Gönderilemedi', result.message) as any]
        });
        return;
      }

      // 1. Aday rolünü (⏳ ┊ Aday) Discord kullanıcısına otomatik ata
      if (interaction.guild && interaction.member) {
        try {
          const candidateRole = interaction.guild.roles.cache.find((r: any) => r.name.includes('Aday'));
          const guildMember = interaction.member as any;
          if (candidateRole && guildMember?.roles?.add) {
            await guildMember.roles.add(candidateRole, 'Yeni Katılım Başvurusu - Aday Rolü');
          }
        } catch (roleErr: any) {
          BotLogger.warn(`[BAŞVURU ADAY ROLÜ ATAMA UYARISI] ${roleErr?.message}`);
        }
      }

      // 2. Yetkililer için #başvuru-inceleme kanalına interaktif değerlendirme kartı fırlat
      if (interaction.guild && result.application) {
        try {
          await DiscordSyncService.sendApplicationReviewCard(interaction.guild, result.application);
        } catch (cardErr: any) {
          BotLogger.warn(`[BAŞVURU KARTI GÖNDERME UYARISI] ${cardErr?.message}`);
        }
      }

      // 3. Adaya özel detaylı başarı bildirimi gönder
      await interaction.editReply({
        embeds: [
          EmbedBuilderUtil.success(
            '✅ Başvurunuz Başarıyla Alındı!',
            `Tebrikler <@${user.id}>! Başvurunuz **#${result.application?.applicationNumber}** numarasıyla sisteme kaydedildi.\n\n` +
            `• Karakteriniz: **${result.application?.mtaCharacterName}**\n` +
            `• Rolünüz: **⏳ ┊ Aday** olarak tanımlandı.\n` +
            `• Başvurunuz yetkili yönetim ve Recruiter ekibimizin inceleme paneline iletildi.\n` +
            `• Sonuçlandığında Discord DM ve sunucu üzerinden bilgilendirileceksiniz.\n\n` +
            `*Başvuru durumunuzu dilediğiniz zaman kanaldaki **"❓ Başvuru Durumumu Sorgula"** butonundan takip edebilirsiniz.*`
          ) as any
        ]
      });
      return;
    }



    // 17. Birlik Açıklaması Düzenleme
    if (customId === 'modal_gang_desc') {
      const desc = interaction.fields.getTextInputValue('txt_gang_desc');
      store.gangInfo.description = desc;
      store.addAuditLog({
        category: 'Birlik',
        actionType: 'BİRLİK_GÜNCELLENDİ',
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        target: 'Birlik Açıklaması',
        description: 'Birlik açıklaması güncellendi.'
      });
      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Birlik Açıklaması Güncellendi', `Yeni açıklama kaydedildi:\n\n*${desc}*`) as any]
      });
      return;
    }

    // 18. Birlik İsim / Etiket Değiştirme
    if (customId === 'modal_gang_tag') {
      const name = interaction.fields.getTextInputValue('txt_gang_name');
      const tag = interaction.fields.getTextInputValue('txt_gang_tag');
      const leader = interaction.fields.getTextInputValue('txt_gang_leader');
      store.gangInfo.name = name;
      store.gangInfo.tag = tag;
      store.gangInfo.leaderName = leader;
      store.addAuditLog({
        category: 'Birlik',
        actionType: 'BİRLİK_GÜNCELLENDİ',
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        target: `${name} [${tag}]`,
        description: `Birlik adı: ${name} [${tag}] | Lider: ${leader}`
      });
      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Birlik Bilgileri Güncellendi', `**${name} [${tag}]**\nLider: **${leader}**`) as any]
      });
      return;
    }

    // 19. Yetki Düzenleme Modalı
    if (customId === 'modal_perm_edit') {
      const rankQuery = interaction.fields.getTextInputValue('txt_perm_rank').trim().toLowerCase();
      const action = interaction.fields.getTextInputValue('txt_perm_action').trim().toLowerCase();
      const permName = interaction.fields.getTextInputValue('txt_perm_name').trim();

      const rank = store.ranks.find(r => r.name.toLowerCase().includes(rankQuery) || r.level.toString() === rankQuery);
      if (!rank) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', 'Belirtilen rütbe bulunamadı!') as any], ephemeral: true });
        return;
      }

      if (action.includes('kaldır') || action.includes('sil')) {
        rank.permissions = rank.permissions.filter(p => p !== permName);
      } else {
        if (!rank.permissions.includes(permName)) {
          rank.permissions.push(permName);
        }
      }

      store.addAuditLog({
        category: 'Yetki',
        actionType: 'YETKİ_GÜNCELLENDİ',
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        target: rank.name,
        description: `İzin: ${permName} (${action.includes('kaldır') ? 'Kaldırıldı' : 'Eklendi'})`
      });

      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Yetki Matrisi Güncellendi', `**${rank.name}** rütbesine ait izinler güncellendi.\nToplam izin: **${rank.permissions.length} adet**`) as any]
      });
      return;
    }

    // 20. Başvuru İnceleme & Puanlama
    if (customId === 'modal_app_review') {
      const idQuery = interaction.fields.getTextInputValue('txt_app_id').trim();
      const score = parseInt(interaction.fields.getTextInputValue('txt_app_score').replace(/\D/g, ''), 10) || 5;
      const notes = interaction.fields.getTextInputValue('txt_app_notes');

      const app = store.applications.find(a => a.id === idQuery || a.applicationNumber.toString() === idQuery || a.discordUserId === idQuery);
      if (!app) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Başvuru bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = ApplicationService.addReview({
        applicationId: app.id,
        reviewerId: executor.discordUserId,
        reviewerName: executor.discordUsername,
        score,
        notes
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Başvuru İncelendi', res.message) as any] });
      return;
    }

    // 21. Başvuru Kabul
    if (customId === 'modal_app_accept') {
      const idQuery = interaction.fields.getTextInputValue('txt_app_id').trim();
      const reason = interaction.fields.getTextInputValue('txt_app_reason');

      const app = store.applications.find(a => a.id === idQuery || a.applicationNumber.toString() === idQuery || a.discordUserId === idQuery);
      if (!app) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Başvuru bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = ApplicationService.acceptApplication({
        applicationId: app.id,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        reason
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Başarısız', res.message) as any], ephemeral: true });
      } else {
        const formattedNick = DiscordSyncService.formatIcNickname(app.mtaCharacterName);
        if (interaction.guild) {
          await DiscordSyncService.syncMemberRole(interaction.guild, app.discordUserId, RankLevel.UYE, 'Başvuru Onayı', formattedNick);
        }

        // Madde 3: Adaya Otomatik DM Bildirimi (Onay)
        try {
          const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
          if (applicantUser) {
            await applicantUser.send({
              embeds: [
                EmbedBuilderUtil.createDefault(
                  '🎉 Katılım Başvurunuz Onaylandı!',
                  `Tebrikler **${formattedNick}**!\n\n` +
                  `**${store.gangInfo.name}** bünyesine katılım başvurunuz yönetim tarafından onaylanmıştır.\n\n` +
                  `• **Sunucu İsminiz:** \`${formattedNick}\` olarak güncellendi.\n` +
                  `• **Rütbeniz:** \`🩸 ┊ Üye\` rolü tanımlandı.\n` +
                  `• **Erişim:** Birlik kanalları ve ses odaları kullanımınıza açıldı.\n\n` +
                  `Lütfen **📢・duyurular** kanalındaki birlik kurallarını inceleyiniz. Sokaklarda görüşmek üzere!`
                ) as any
              ]
            }).catch(() => {});
          }
        } catch {}

        await interaction.reply({
          embeds: [EmbedBuilderUtil.success('Başvuru Kabul Edildi', `**${app.discordUsername}** (${formattedNick}) başvurusu onaylandı, sunucu ismi \`${formattedNick}\` olarak güncellendi ve üye kaydı açıldı!\n*(Adaya özel mesaj ile bildirim gönderildi.)*`) as any]
        });
      }
      return;
    }

    // 22. Başvuru Red
    if (customId === 'modal_app_reject') {
      const idQuery = interaction.fields.getTextInputValue('txt_app_id').trim();
      const reason = interaction.fields.getTextInputValue('txt_app_reason');

      const app = store.applications.find(a => a.id === idQuery || a.applicationNumber.toString() === idQuery || a.discordUserId === idQuery);
      if (!app) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Başvuru bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = ApplicationService.rejectApplication({
        applicationId: app.id,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername,
        reason
      });

      // Madde 3: Adaya Otomatik DM Bildirimi (Red)
      try {
        const applicantUser = await this.client.users.fetch(app.discordUserId).catch(() => null);
        if (applicantUser) {
          await applicantUser.send({
            embeds: [
              EmbedBuilderUtil.warning(
                '❌ Katılım Başvurunuz Hakkında',
                `Sayın **${app.mtaCharacterName}**,\n\n` +
                `**${store.gangInfo.name}** katılım başvurunuz yönetim tarafından incelenmiş ve uygun görülmemiştir.\n\n` +
                `• **Gerekçe:** ${reason || 'Yönetim tarafından uygun görülmedi.'}\n\n` +
                `Gelecekte kendinizi geliştirerek tekrar başvuruda bulunabilirsiniz.`
              ) as any
            ]
          }).catch(() => {});
        }
      } catch {}

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Başvuru Reddedildi', `${res.message}\n*(Adaya özel mesaj ile gerekçe bildirildi.)*`) as any] });
      return;
    }

    // 23. Recruiter Aday Daveti
    if (customId === 'modal_rec_invite') {
      const discordQuery = interaction.fields.getTextInputValue('txt_rec_discord').replace(/[<@!>]/g, '').trim();
      const mtaName = interaction.fields.getTextInputValue('txt_rec_mta');
      const notes = interaction.fields.getTextInputValue('txt_rec_notes');

      const res = RecruiterService.createInvite({
        recruiterDiscordId: executor.discordUserId,
        candidateDiscordId: discordQuery,
        candidateDiscordTag: `Aday_${discordQuery.slice(-4)}`,
        candidateMtaName: mtaName,
        notes
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Davet Hatası', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({
          embeds: [EmbedBuilderUtil.success('Aday Kaydedildi', `**${mtaName}** çeteye davet edildi ve aday takip listesine eklendi.`) as any]
        });
      }
      return;
    }

    // 24. Araç Durumu Güncelleme
    if (customId === 'modal_veh_status') {
      const plate = interaction.fields.getTextInputValue('txt_veh_plate').trim();
      const status = interaction.fields.getTextInputValue('txt_veh_status') as any;
      const notes = interaction.fields.getTextInputValue('txt_veh_notes');

      const veh = store.vehicles.find(v => v.plate.toLowerCase() === plate.toLowerCase());
      if (!veh) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Bu plakaya ait araç bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = VehicleService.updateStatus(veh.id, status, notes || undefined, executor.discordUsername);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Araç Durumu Güncellendi', `[${plate}] ${veh.name} durumu: **${status}**`) as any] });
      return;
    }

    // 25. Hood / Bölge Güncelleme
    if (customId === 'modal_ter_update') {
      const name = interaction.fields.getTextInputValue('txt_ter_name').trim();
      const status = interaction.fields.getTextInputValue('txt_ter_status') as any;
      const notes = interaction.fields.getTextInputValue('txt_ter_notes');

      const ter = store.territories.find(t => t.name.toLowerCase().includes(name.toLowerCase()));
      if (!ter) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Belirtilen bölge bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = TerritoryService.updateStatus(ter.id, status, notes, executor.discordUsername);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Bölge Durumu Güncellendi', res.message) as any] });
      return;
    }

    // 26. Görev Başlatma
    if (customId === 'modal_mis_create') {
      const title = interaction.fields.getTextInputValue('txt_mis_title');
      const cat = interaction.fields.getTextInputValue('txt_mis_category') as any;
      const desc = interaction.fields.getTextInputValue('txt_mis_desc');
      const xp = parseInt(interaction.fields.getTextInputValue('txt_mis_xp').replace(/\D/g, ''), 10) || 150;

      const res = MissionService.createMission({
        title,
        description: desc,
        category: cat,
        leaderId: executor.discordUserId,
        leaderName: executor.discordUsername,
        participantIds: [executor.discordUserId],
        participantNames: [executor.discordUsername],
        rewardXp: xp
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('RP Görevi Başlatıldı', `**${title}** (+${xp} XP)\n*${desc}*`) as any] });
      return;
    }

    // 27. Görev Tamamlama
    if (customId === 'modal_mis_complete') {
      const idQuery = interaction.fields.getTextInputValue('txt_mis_id').trim().toLowerCase();
      const outcome = interaction.fields.getTextInputValue('txt_mis_outcome');

      const mis = store.missions.find(m => m.id.toLowerCase() === idQuery || m.title.toLowerCase().includes(idQuery));
      if (!mis) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Görev bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = MissionService.completeMission(mis.id, outcome, executor.discordUsername);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Görev Tamamlandı', `**${mis.title}** başarıyla tamamlandı!\nRapor: *${outcome}*`) as any] });
      return;
    }

    // 28. Görev İptal
    if (customId === 'modal_mis_cancel') {
      const idQuery = interaction.fields.getTextInputValue('txt_mis_id').trim().toLowerCase();
      const reason = interaction.fields.getTextInputValue('txt_mis_reason');

      const mis = store.missions.find(m => m.id.toLowerCase() === idQuery || m.title.toLowerCase().includes(idQuery));
      if (!mis) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Görev bulunamadı!') as any], ephemeral: true });
        return;
      }

      mis.status = 'İptal Edildi';
      mis.outcome = reason;
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Görev İptal Edildi', `**${mis.title}** iptal edildi.\nNeden: ${reason}`) as any] });
      return;
    }

    // 29. Savaş Kaydı Açma
    if (customId === 'modal_war_create') {
      const rival = interaction.fields.getTextInputValue('txt_war_rival');
      const reason = interaction.fields.getTextInputValue('txt_war_reason');
      const parts = interaction.fields.getTextInputValue('txt_war_participants');

      const res = WarService.createRecord({
        rivalFaction: rival,
        participants: [parts],
        notes: reason,
        executorName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Savaş Kaydı Açıldı', `**${rival}** birliğine karşı savaş kaydı oluşturuldu.\nNeden: ${reason}`) as any] });
      return;
    }

    // 30. Savaş Sonuçlandırma
    if (customId === 'modal_war_finish') {
      const idQuery = interaction.fields.getTextInputValue('txt_war_id').trim().toLowerCase();
      const status = interaction.fields.getTextInputValue('txt_war_status') as any;
      const outcome = interaction.fields.getTextInputValue('txt_war_outcome');

      const war = store.warRecords.find(w => w.id.toLowerCase() === idQuery || w.recordNumber.toLowerCase() === idQuery || w.rivalFaction.toLowerCase().includes(idQuery));
      if (!war) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Savaş kaydı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = WarService.finishRecord(war.id, status, outcome, []);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Savaş Sonuçlandırıldı', `[${war.recordNumber}] vs ${war.rivalFaction}: **${status}**\nSonuç: ${outcome}`) as any] });
      return;
    }

    // 31. Diplomasi Güncelleme
    if (customId === 'modal_dip_update' || customId === 'modal_dip_new') {
      const faction = interaction.fields.getTextInputValue('txt_dip_faction');
      const status = interaction.fields.getTextInputValue('txt_dip_status') as any;
      const notes = interaction.fields.getTextInputValue(customId === 'modal_dip_update' ? 'txt_dip_notes' : 'txt_dip_contact');

      const res = DiplomacyService.setRelation({
        factionName: faction,
        status,
        notes,
        executorName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Diplomasi Güncellendi', `**${faction}** ile ilişki durumu **${status}** olarak kaydedildi.`) as any] });
      return;
    }

    // 32. Ceza İtirazı
    if (customId === 'modal_pun_appeal') {
      const idQuery = interaction.fields.getTextInputValue('txt_pun_id').trim();
      const reason = interaction.fields.getTextInputValue('txt_pun_reason');

      const pun = store.punishments.find(p => p.id === idQuery || p.punishmentNumber.toLowerCase() === idQuery.toLowerCase() || p.memberName.toLowerCase().includes(idQuery.toLowerCase()));
      if (!pun) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Ceza kaydı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = PunishmentService.submitAppeal(pun.id, reason);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('İtiraz Gönderildi', res.message) as any] });
      return;
    }

    // 33. Ceza İtirazı Karara Bağlama
    if (customId === 'modal_pun_resolve') {
      const idQuery = interaction.fields.getTextInputValue('txt_pun_id').trim();
      const decision = interaction.fields.getTextInputValue('txt_pun_decision');
      const approved = decision.toLowerCase().includes('kabul') || decision.toLowerCase().includes('onay');

      const pun = store.punishments.find(p => p.id === idQuery || p.punishmentNumber.toLowerCase() === idQuery.toLowerCase() || p.memberName.toLowerCase().includes(idQuery.toLowerCase()));
      if (!pun) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Ceza kaydı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = PunishmentService.resolveAppeal(pun.id, approved, executor.discordUsername);
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('İtiraz Karara Bağlandı', res.message) as any] });
      return;
    }

    // 34. İhbar Bildirimi
    if (customId === 'modal_rep_new') {
      const subject = interaction.fields.getTextInputValue('txt_rep_subject');
      const cat = interaction.fields.getTextInputValue('txt_rep_category') as any;
      const desc = interaction.fields.getTextInputValue('txt_rep_desc');

      const res = ReportService.submitReport({
        category: cat,
        reportedSubject: subject,
        description: desc,
        privacyLevel: 'Gizli',
        submitterId: executor.discordUserId,
        submitterName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('İhbar Alındı', res.message) as any], ephemeral: true });
      return;
    }

    // 35. İhbar Sonuçlandırma
    if (customId === 'modal_rep_resolve') {
      const idQuery = interaction.fields.getTextInputValue('txt_rep_id').trim();
      const verdict = interaction.fields.getTextInputValue('txt_rep_verdict');
      const notes = interaction.fields.getTextInputValue('txt_rep_notes');

      const res = ReportService.resolveReport({
        reportId: idQuery,
        verdict,
        notes,
        executorName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('İhbar Sonuçlandırıldı', res.message) as any] });
      return;
    }

    // 36. Kanıt Yükleme
    if (customId === 'modal_evi_upload') {
      const title = interaction.fields.getTextInputValue('txt_evi_title');
      const url = interaction.fields.getTextInputValue('txt_evi_url');
      const related = interaction.fields.getTextInputValue('txt_evi_case');
      const desc = interaction.fields.getTextInputValue('txt_evi_desc');

      const res = EvidenceService.addEvidence({
        title,
        type: 'Medya',
        contentUrl: url,
        relatedCase: related,
        description: desc,
        privacyLevel: 'Yönetim',
        uploaderId: executor.discordUserId,
        uploaderName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Kanıt Kaydedildi', res.message) as any] });
      return;
    }



    // 39. Duyuru Yayınlama
    if (customId === 'modal_ann_create') {
      const title = interaction.fields.getTextInputValue('txt_ann_title');
      const content = interaction.fields.getTextInputValue('txt_ann_content');
      const isPinned = interaction.fields.getTextInputValue('txt_ann_pin').toLowerCase().includes('evet');

      const res = AnnouncementService.publish({
        title,
        content,
        isPinned,
        authorId: executor.discordUserId,
        authorName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Duyuru Yayınlandı', `**${title}** tüm birliğe tebliğ edildi.`) as any] });
      return;
    }

    // 40. Gizli Dosya Ekleme
    if (customId === 'modal_sec_create') {
      const code = interaction.fields.getTextInputValue('txt_sec_code');
      const cat = interaction.fields.getTextInputValue('txt_sec_cat');
      const content = interaction.fields.getTextInputValue('txt_sec_content');

      store.secretRecords.unshift({
        id: `sec-${Date.now()}`,
        codeName: code,
        category: (cat as any) || 'Diğer',
        content,
        clearanceLevel: 'Under OG+',
        relatedMembers: [],
        attachments: [],
        authorId: executor.discordUserId,
        authorName: executor.discordUsername,
        createdAt: new Date()
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Gizli Dosya Arşivlendi', `[${code}] dosyası mühürlendi ve gizli arşive kaydedildi.`) as any], ephemeral: true });
      return;
    }

    // 41. İç Soruşturma Başlatma
    if (customId === 'modal_invs_new') {
      const target = interaction.fields.getTextInputValue('txt_invs_target');
      const reason = interaction.fields.getTextInputValue('txt_invs_reason');
      const investigator = interaction.fields.getTextInputValue('txt_invs_investigator');

      const res = InvestigationService.createInvestigation({
        targetMemberId: target,
        targetMemberName: target,
        leadInvestigatorId: executor.discordUserId,
        leadInvestigatorName: investigator,
        reason,
        confidentiality: 'Gizli'
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Soruşturma Başlatıldı', res.message) as any] });
      return;
    }

    // 42. Soruşturma Kararı
    if (customId === 'modal_invs_verdict') {
      const idQuery = interaction.fields.getTextInputValue('txt_invs_id');
      const verdict = interaction.fields.getTextInputValue('txt_invs_verdict');
      const notes = interaction.fields.getTextInputValue('txt_invs_notes');

      const res = InvestigationService.concludeInvestigation({
        investigationId: idQuery,
        verdict,
        notes,
        executorName: executor.discordUsername
      });

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Soruşturma Kararı Verildi', res.message) as any] });
      return;
    }

    // 43. Toplantı Başlatma
    if (customId === 'modal_meet_start') {
      const idQuery = interaction.fields.getTextInputValue('txt_meet_id').trim();
      const meeting = store.meetings.find(m => m.id === idQuery || m.meetingNumber.toString() === idQuery || m.title.toLowerCase().includes(idQuery.toLowerCase()));

      if (!meeting) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Toplantı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = MeetingService.startMeeting(meeting.id, executor.discordUsername);
      if (interaction.guild) {
        await DiscordSyncService.manageMeetingVoiceDiscipline(interaction.guild, 'start');
      }
      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Toplantı Başlatıldı', `${res.message}\n🔊 *Toplantı odasındaki lider harici tüm üyeler otomatik susturuldu (Sessizlik Disiplini).*`) as any] });
      return;
    }

    // 44. Toplantı Kararları ve Tamamlama
    if (customId === 'modal_meet_complete') {
      const idQuery = interaction.fields.getTextInputValue('txt_meet_id').trim();
      const decisions = interaction.fields.getTextInputValue('txt_meet_decisions');

      const meeting = store.meetings.find(m => m.id === idQuery || m.meetingNumber.toString() === idQuery || m.title.toLowerCase().includes(idQuery.toLowerCase()));
      if (!meeting) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Toplantı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = MeetingService.completeMeeting({
        meetingId: meeting.id,
        notes: decisions,
        decisions,
        executorName: executor.discordUsername
      });

      if (interaction.guild) {
        await DiscordSyncService.manageMeetingVoiceDiscipline(interaction.guild, 'end');
      }

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Toplantı Tamamlandı', `[${meeting.meetingNumber}] kararları kayda geçti:\n\n*${decisions}*\n🔊 *Ses odası susturması kaldırıldı.*`) as any] });
      return;
    }

    // 45. Toplantı İptal
    if (customId === 'modal_meet_cancel') {
      const idQuery = interaction.fields.getTextInputValue('txt_meet_id').trim();
      const reason = interaction.fields.getTextInputValue('txt_meet_reason');

      const meeting = store.meetings.find(m => m.id === idQuery || m.meetingNumber.toString() === idQuery || m.title.toLowerCase().includes(idQuery.toLowerCase()));
      if (!meeting) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Bulunamadı', 'Toplantı bulunamadı!') as any], ephemeral: true });
        return;
      }

      const res = MeetingService.cancelMeeting(meeting.id, reason, executor.discordUsername);

      await interaction.reply({ embeds: [EmbedBuilderUtil.success('Toplantı İptal Edildi', res.message) as any] });
      return;
    }

    // 46. Sistem Geri Yükleme & Veri Temizleme
    if (customId === 'modal_sys_restore') {
      const confirm = interaction.fields.getTextInputValue('txt_sys_confirm').trim().toUpperCase();
      if (confirm !== 'ONAY') {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('İptal Edildi', 'Onay kelimesi hatalı girildiği için işlem iptal edildi.') as any], ephemeral: true });
        return;
      }

      store.clearAllTestData();
      if (interaction.guild) {
        await SetupService.purgeAllPanels(interaction.guild);
      }
      await interaction.reply({
        embeds: [EmbedBuilderUtil.success('Sistem Sıfırlandı & Temizlendi', 'Tüm test verileri sıfırlandı, kanallardaki eski paneller silindi ve veritabanı temizlendi.') as any]
      });
      return;
    }

    // 47. Hızlı Başvuru Puanlama Modalı
    if (customId.startsWith('modal_quick_score_')) {
      const appId = customId.replace('modal_quick_score_', '');
      const score = parseInt(interaction.fields.getTextInputValue('txt_score').replace(/\D/g, ''), 10) || 5;
      const notes = interaction.fields.getTextInputValue('txt_notes');

      const res = ApplicationService.addReview({
        applicationId: appId,
        reviewerId: executor.discordUserId,
        reviewerName: executor.discordUsername,
        score,
        notes
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Puan Kaydedildi', `Başvuruya **${score}/10** puan ve notunuz başarıyla eklendi.`) as any] });
      }
      return;
    }

    // 48. Silah/Cephane Zimmetleme Modalı (Madde 2 ID Düzeltmesi)
    if (customId === 'modal_loadout_assign') {
      const getField = (ids: string[], def = '') => {
        for (const id of ids) {
          try {
            const val = interaction.fields.getTextInputValue(id);
            if (val !== undefined && val !== null && val.trim().length > 0) return val.trim();
          } catch {}
        }
        return def;
      };

      const targetQuery = getField(['txt_ld_member', 'txt_loadout_target', 'txt_member']);
      const weapon = getField(['txt_ld_item', 'txt_loadout_weapon', 'txt_item'], 'AK-47');
      const qty = parseInt(getField(['txt_ld_qty', 'txt_loadout_qty'], '1'), 10) || 1;
      const ammo = parseInt(getField(['txt_ld_ammo', 'txt_loadout_ammo'], '150').replace(/\D/g, ''), 10) || 150;
      const purpose = getField(['txt_ld_note', 'txt_loadout_purpose', 'txt_purpose', 'txt_note'], 'Birlik Operasyonu');

      const target = this.findMember(targetQuery);
      if (!target) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Üye Bulunamadı', `"${targetQuery}" isimli üye bulunamadı.`) as any], ephemeral: true });
        return;
      }

      const res = LoadoutService.assignLoadout({
        memberId: target.id,
        memberMtaName: target.currentMtaName,
        weaponName: weapon,
        quantity: qty,
        ammoCount: ammo,
        purpose,
        authorizedById: executor.discordUserId,
        authorizedByName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        if (interaction.guild) {
          await DiscordSyncService.sendLog(
            interaction.guild,
            'kasa',
            EmbedBuilderUtil.createDefault(
              '🔫 Mühimmat & Teçhizat Zimmetlendi',
              `**Zimmetlenen:** <@${target.discordUserId}> (${target.discordUsername} - ${target.currentMtaName})\n**Silah:** ${weapon} (${qty} Adet)\n**Mermi:** ${ammo} Adet\n**Görev/Amaç:** ${purpose}\n**Yetkili:** <@${user.id}>`
            )
          );
        }
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Teçhizat Zimmetlendi', `**${target.discordUsername}** (${target.currentMtaName}) üzerine **${weapon}** (${ammo} Mermi) zimmetlendi.`) as any] });
      }
      return;
    }

    // 49. Silah/Cephane İade Modalı (Madde 2 ID Düzeltmesi)
    if (customId === 'modal_loadout_return') {
      const getField = (ids: string[], def = '') => {
        for (const id of ids) {
          try {
            const val = interaction.fields.getTextInputValue(id);
            if (val !== undefined && val !== null && val.trim().length > 0) return val.trim();
          } catch {}
        }
        return def;
      };

      const loadoutIdOrMember = getField(['txt_ld_id', 'txt_loadout_target', 'txt_loadout_id']);
      const qty = parseInt(getField(['txt_ld_qty', 'txt_loadout_qty'], '1'), 10) || 1;
      const isLostRaw = getField(['txt_ld_lost', 'txt_loadout_condition'], 'H').toLowerCase();
      const isLost = isLostRaw.startsWith('e') || isLostRaw.includes('kayıp') || isLostRaw.includes('düştü');
      const condition = isLost ? 'Çatışmada Düştü / Kayıp' : 'Sağlam / Depoya İade';

      let targetMember = this.findMember(loadoutIdOrMember);

      const res = LoadoutService.returnLoadout({
        loadoutId: loadoutIdOrMember,
        memberId: targetMember?.id,
        returnedQuantity: qty,
        isLost,
        condition,
        notes: condition,
        receivedByName: executor.discordUsername,
        executorId: executor.discordUserId,
        executorName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('Teçhizat İade/Zayiat İşlendi', res.message) as any] });
      }
      return;
    }

    // 50. Rakip Birlik İstihbarat Dosyası Ekleme Modalı (Madde 2 ID Düzeltmesi)
    if (customId === 'modal_rival_add') {
      const getField = (ids: string[], def = '') => {
        for (const id of ids) {
          try {
            const val = interaction.fields.getTextInputValue(id);
            if (val !== undefined && val !== null && val.trim().length > 0) return val.trim();
          } catch {}
        }
        return def;
      };

      const gangName = getField(['txt_riv_name', 'txt_rival_name'], 'Bilinmeyen Birlik');
      const tag = getField(['txt_riv_tag', 'txt_rival_tag'], gangName.slice(0, 3).toUpperCase());
      const leader = getField(['txt_riv_leader', 'txt_rival_leader'], 'Bilinmiyor');
      const threatLevel = getField(['txt_riv_threat', 'txt_rival_threat'], 'Düşman') as any;
      const notes = getField(['txt_riv_notes', 'txt_rival_notes'], 'İstihbarat kaydı açıldı.');
      const territory = getField(['txt_rival_territory'], 'Los Santos');

      const res = RivalIntelService.addRival({
        gangName,
        tag,
        threatLevel,
        leader,
        estimatedMembers: 15,
        mainTerritory: territory,
        intelNotes: notes,
        addedByName: executor.discordUsername
      });

      if (!res.success) {
        await interaction.reply({ embeds: [EmbedBuilderUtil.error('Hata', res.message) as any], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [EmbedBuilderUtil.success('İstihbarat Dosyası Açıldı', `**${gangName} [${tag}]** birliği istihbarat arşivine eklendi.\nTehdit Seviyesi: **${threatLevel}**\nLider: **${leader}**`) as any] });
      }
      return;
    }
  }


  public isBotReady(): boolean {
    return this.isReady && Boolean(this.client.user);
  }

  public getClient(): Client {
    return this.client;
  }

  public refreshPresence(): void {
    if (this.client.user) {
      try {
        this.client.user.setPresence({
          status: 'online',
          activities: [
            {
              name: "BLOOD'S | /yardim",
              type: ActivityType.Watching
            }
          ]
        });
      } catch (err: any) {
        BotLogger.warn(`[PRESENCE HATASI] ${err?.message}`);
      }
    }
  }

  public async start(): Promise<void> {
    BotLogger.info('[BAŞLATICI] MTA Illegal Birlik Yönetim Botu (MongoDB Bağımsız 7/24 Çekirdek) başlatılıyor...');
    await dbManager.connect();
    const cleanedCount = MemberService.cleanTestMembers();
    if (cleanedCount > 0) {
      BotLogger.info(`[TEMİZLİK] ${cleanedCount} adet test üyesi sistemden başarıyla temizlendi.`);
    }

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      BotLogger.warn('[DISCORD] DISCORD_BOT_TOKEN ortam değişkeni ayarlanmadı. Bot, simülatör ve test modunda çalışmaya devam ediyor.');
      return;
    }

    let isConnecting = false;
    const tryConnect = async () => {
      if (isConnecting || this.client.isReady()) return;
      isConnecting = true;
      try {
        BotLogger.info('[DISCORD] Bot Discord Gateway bağlantısı kuruyor...');
        await this.client.login(token);
        this.refreshPresence();
      } catch (err: any) {
        BotLogger.error('[DISCORD GİRİŞ HATASI] Bot Discord\'a bağlanamadı:', err?.message || err);
      } finally {
        isConnecting = false;
      }
    };

    await tryConnect();

    // 7/24 Kesintisiz Çalışma - Otomatik Bekçi & Gözlemci (Watchdog / Keep-Alive)
    let heartbeatTick = 0;
    setInterval(async () => {
      heartbeatTick++;

      if (!this.client.isReady() && token) {
        BotLogger.warn('[DISCORD WATCHDOG] Bot bağlantısı kapalı algılandı, otomatik olarak yeniden bağlanılıyor...');
        await tryConnect();
      } else if (this.client.isReady()) {
        // Her 2 dakikada bir (5 tick) bot durumunu (T.R.İ.P | /yardim) tazele
        if (heartbeatTick % 5 === 0) {
          this.refreshPresence();
        }
        // Her 5 dakikada bir (12 tick) süresi dolan inaktiflik izinlerini kontrol et
        if (heartbeatTick % 12 === 0) {
          for (const [, guild] of this.client.guilds.cache) {
            try {
              await InactivityService.checkExpiredRequests(guild);
            } catch {}
          }
        }
      }
    }, 25000);
  }
}

export const mtaBot = new MtaDiscordBot();
