/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - BİRLEŞİK VERİ DEPOSU VE OLAY MOTORU
 * Hem doğrudan Mongoose ile çalışır hem de anlık senkronizasyon ve test desteği sunar.
 */
import {
  RankLevel,
  IMember,
  IRank,
  IApplication,
  ITicket,
  ITreasury,
  ITreasuryTransaction,
  IInventoryItem,
  IInventoryTransaction,
  IVehicle,
  ITerritory,
  IMission,
  IWarRecord,
  IDiplomacyRelation,
  IPunishment,
  IReport,
  IEvidence,
  IAnnouncement,
  IAchievement,
  IInvestigation,
  ISecretRecord,
  IRecruiterInvite,
  IGangInfo,
  IGuildSetupConfig,
  IMeeting,
  IAuditLog,
  IWarningRecord,
  IInactivityRequest
} from '../types/index.ts';
import { DEFAULT_RANKS, SYSTEM_PERMISSIONS } from '../config/index.ts';

class UnifiedStore {
  public ranks: IRank[] = [];
  public members: IMember[] = [];
  public recruiterInvites: IRecruiterInvite[] = [];
  public applications: IApplication[] = [];
  public tickets: ITicket[] = [];
  public meetings: IMeeting[] = [];
  public warnings: IWarningRecord[] = [];
  public inactivityRequests: IInactivityRequest[] = [];
  public treasury: ITreasury = {
    id: 'treasury-main',
    guildId: 'default',
    balance: 0,
    maxWithdrawLimit: 5000000,
    updatedAt: new Date()
  };
  public transactions: ITreasuryTransaction[] = [];
  public inventory: IInventoryItem[] = [];
  public inventoryTransactions: IInventoryTransaction[] = [];
  public vehicles: IVehicle[] = [];
  public territories: ITerritory[] = [];
  public missions: IMission[] = [];
  public warRecords: IWarRecord[] = [];
  public diplomacy: IDiplomacyRelation[] = [];
  public punishments: IPunishment[] = [];
  public reports: IReport[] = [];
  public evidenceList: IEvidence[] = [];
  public announcements: IAnnouncement[] = [];
  public achievements: IAchievement[] = [];
  public memberAchievements: { achievementId: string; memberId: string; awardedAt: Date; awardedBy: string }[] = [];
  public investigations: IInvestigation[] = [];
  public secretRecords: ISecretRecord[] = [];
  public loadouts: any[] = [];
  public rivals: any[] = [];
  public auditLogs: IAuditLog[] = [];
  public gangInfo: IGangInfo = {
    name: "BLOOD'S",
    tag: 'BLOOD',
    description: 'MTA:SA Roleplay Sunucusu İllegal Sokak Hükümdarlığı',
    foundedDate: new Date('2024-01-01'),
    leaderName: 'OG',
    status: 'Aktif',
    historyNotes: 'Ganton, Idlewood ve Willowfield bölgelerinde köklü illegal hakimiyet.'
  };
  public guildConfig: IGuildSetupConfig = {
    guildId: '123456789012345678',
    isConfigured: false,
    roleMappings: {},
    channelMappings: {},
    panelMessageIds: {}
  };

  public onStateChange?: () => void;
  private isInitialized = false;

  public notifyChange(): void {
    if (this.onStateChange) {
      try {
        this.onStateChange();
      } catch {}
    }
  }

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;

    // 1. Varsayılan 5 Rütbe
    this.ranks = DEFAULT_RANKS.map((r, i) => ({
      id: `rank-${r.level}`,
      name: r.name,
      level: r.level,
      description: r.description,
      permissions: [...r.defaultPermissions],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // 2. Başarı Tanımları
    this.achievements = [
      { id: 'ach-1', title: 'İlk Adım', description: 'Birliğe başarıyla katıldı.', badgeIcon: '🟢', rewardXp: 100 },
      { id: 'ach-2', title: 'Sokakların Efendisi', description: '5 operasyona katıldı.', badgeIcon: '🔫', rewardXp: 250 },
      { id: 'ach-3', title: 'Sadakat Nişanı', description: 'Birliğe 1 ay kesintisiz hizmet etti.', badgeIcon: '⭐', rewardXp: 500 },
      { id: 'ach-4', title: 'Usta Recruiter', description: 'Birliğe en az 5 aktif üye kazandırdı.', badgeIcon: '🤝', rewardXp: 400 },
      { id: 'ach-5', title: 'Birlik Hazinesi', description: 'Kasaya 1.000.000$ ve üzeri katkı sağladı.', badgeIcon: '💰', rewardXp: 350 }
    ];

    // Tüm test verilerini temizle (0 test verisi ile temiz başlangıç)
    this.clearAllTestData();

    this.isInitialized = true;
  }

  /**
   * Tüm test/örnek verilerini temizler ve veritabanını sıfırlar
   */
  public clearAllTestData(): void {
    this.members = [];
    this.recruiterInvites = [];
    this.applications = [];
    this.tickets = [];
    this.treasury.balance = 0;
    this.transactions = [];
    this.inventory = [];
    this.inventoryTransactions = [];
    this.vehicles = [];
    this.territories = [];
    this.missions = [];
    this.warRecords = [];
    this.diplomacy = [];
    this.punishments = [];
    this.reports = [];
    this.evidenceList = [];
    this.announcements = [];
    this.investigations = [];
    this.secretRecords = [];
    this.loadouts = [];
    this.rivals = [];
    this.memberAchievements = [];
    this.auditLogs = [];
    this.meetings = [];
    this.warnings = [];
    this.inactivityRequests = [];
  }

  /**
   * Sadece birim testlerinin çalışması için geçici test verilerini yükler
   */
  public seedTestDataForTesting(): void {
    this.members = [
      {
        id: 'mem-1',
        discordUserId: '100000000000000001',
        discordUsername: 'Vincenzo_OG',
        currentMtaName: 'Vincenzo_Santoro',
        currentMtaId: 'MTA-101',
        characters: [
          { id: 'c-1', characterName: 'Vincenzo_Santoro', characterId: 'MTA-101', isMain: true, createdAt: new Date() },
          { id: 'c-2', characterName: 'Enzo_Moretti', characterId: 'MTA-102', isMain: false, createdAt: new Date() }
        ],
        rankId: 'rank-5',
        rankLevel: RankLevel.OG,
        rankName: 'OG',
        joinedAt: new Date('2024-01-01'),
        status: 'Aktif',
        warningsCount: 0,
        xp: 3200,
        activityPoints: 95,
        completedMissionsCount: 18,
        updatedAt: new Date()
      },
      {
        id: 'mem-2',
        discordUserId: '100000000000000002',
        discordUsername: 'Marco_UnderOG',
        currentMtaName: 'Marco_DeLuca',
        currentMtaId: 'MTA-204',
        characters: [
          { id: 'c-3', characterName: 'Marco_DeLuca', characterId: 'MTA-204', isMain: true, createdAt: new Date() }
        ],
        rankId: 'rank-4',
        rankLevel: RankLevel.UNDER_OG,
        rankName: 'Under OG (BG)',
        joinedAt: new Date('2024-02-15'),
        status: 'Aktif',
        warningsCount: 0,
        xp: 2150,
        activityPoints: 88,
        completedMissionsCount: 14,
        updatedAt: new Date()
      },
      {
        id: 'mem-3',
        discordUserId: '100000000000000003',
        discordUsername: 'Tony_Recruiter',
        currentMtaName: 'Tony_Scaletta',
        currentMtaId: 'MTA-305',
        characters: [
          { id: 'c-4', characterName: 'Tony_Scaletta', characterId: 'MTA-305', isMain: true, createdAt: new Date() }
        ],
        rankId: 'rank-3',
        rankLevel: RankLevel.RECRUITER,
        rankName: 'Recruiter',
        joinedAt: new Date('2024-04-10'),
        status: 'Aktif',
        warningsCount: 0,
        xp: 1450,
        activityPoints: 92,
        completedMissionsCount: 9,
        notes: 'Çeteye adam çeker sorumlusu.',
        updatedAt: new Date()
      },
      {
        id: 'mem-4',
        discordUserId: '100000000000000004',
        discordUsername: 'Dante_Kidemli',
        currentMtaName: 'Dante_Russo',
        currentMtaId: 'MTA-412',
        characters: [
          { id: 'c-5', characterName: 'Dante_Russo', characterId: 'MTA-412', isMain: true, createdAt: new Date() }
        ],
        rankId: 'rank-2',
        rankLevel: RankLevel.KIDEMLI_UYE,
        rankName: 'Kıdemli Üye',
        joinedAt: new Date('2024-06-01'),
        status: 'Aktif',
        warningsCount: 1,
        xp: 980,
        activityPoints: 75,
        completedMissionsCount: 7,
        updatedAt: new Date()
      },
      {
        id: 'mem-5',
        discordUserId: '100000000000000005',
        discordUsername: 'Leo_Uye',
        currentMtaName: 'Leo_Valenti',
        currentMtaId: 'MTA-520',
        characters: [
          { id: 'c-6', characterName: 'Leo_Valenti', characterId: 'MTA-520', isMain: true, createdAt: new Date() }
        ],
        rankId: 'rank-1',
        rankLevel: RankLevel.UYE,
        rankName: 'Üye',
        joinedAt: new Date('2024-08-20'),
        recruiterId: 'mem-3',
        recruiterName: 'Tony_Scaletta',
        status: 'Aktif',
        warningsCount: 0,
        xp: 420,
        activityPoints: 60,
        completedMissionsCount: 3,
        updatedAt: new Date()
      }
    ];

    this.recruiterInvites = [
      {
        id: 'rec-1',
        recruiterId: 'mem-3',
        recruiterName: 'Tony_Scaletta',
        candidateDiscordId: '100000000000000005',
        candidateDiscordTag: 'Leo_Uye#1234',
        candidateMtaName: 'Leo_Valenti',
        inviteDate: new Date('2024-08-18'),
        status: 'Katıldı',
        applicationId: 'app-1',
        notes: 'Test adayı'
      }
    ];

    this.applications = [
      {
        id: 'app-1',
        applicationNumber: 101,
        discordUserId: '100000000000000005',
        discordUsername: 'Leo_Uye',
        oocName: 'Levent',
        age: 21,
        mtaCharacterName: 'Leo_Valenti',
        characterBackstory: 'İtalyan asıllı göçmen.',
        roleplayExperience: '4 yıl rol.',
        joinReason: 'Aile için.',
        status: 'Kabul Edildi',
        statusReason: 'Deneyimli.',
        recruiterId: 'mem-3',
        assignedStaffId: 'mem-2',
        assignedStaffName: 'Marco_DeLuca',
        reviews: [],
        averageScore: 9,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.treasury.balance = 3250000;
    this.transactions = [
      {
        id: 'tx-1',
        transactionNumber: 'TXN-001',
        type: 'Para Yatırma',
        amount: 3250000,
        category: 'Test Sermaye',
        description: 'Test fonu',
        balanceBefore: 0,
        balanceAfter: 3250000,
        executorId: 'mem-1',
        executorName: 'Vincenzo_Santoro',
        createdAt: new Date()
      }
    ];

    this.inventory = [
      {
        id: 'inv-1',
        name: 'Desert Eagle .50',
        category: 'Silah',
        quantity: 24,
        minWarningLimit: 5,
        description: 'Test tabanca',
        source: 'Sevkiyat',
        lastUpdatedBy: 'Marco_DeLuca',
        updatedAt: new Date()
      }
    ];

    this.vehicles = [
      {
        id: 'veh-1',
        name: 'Albany Primo',
        modelId: 547,
        plate: '34 LSS 01',
        ownerName: 'Vincenzo_Santoro',
        garage: 'Ganton',
        status: 'Aktif',
        description: 'Lider makam aracı',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.territories = [
      {
        id: 'ter-1',
        name: 'Ganton',
        description: 'Merkez',
        status: 'Kontrol Altında',
        associatedFaction: "BLOOD'S",
        controlledSince: new Date(),
        updatedAt: new Date()
      }
    ];

    this.missions = [
      {
        id: 'mis-1',
        title: 'Gece Devriyesi',
        description: 'Devriye görevi',
        category: 'Hood Savunması',
        assignedLeaderId: 'mem-2',
        assignedLeaderName: 'Marco_DeLuca',
        participantIds: ['mem-3'],
        participantNames: ['Tony_Scaletta'],
        status: 'Tamamlandı',
        rewardXp: 150,
        startDate: new Date(),
        createdAt: new Date()
      }
    ];

    this.warRecords = [
      {
        id: 'war-1',
        recordNumber: 'WAR-01',
        rivalFaction: 'Ballas',
        startDate: new Date(),
        status: 'Sonuçlandı',
        participants: ['Vincenzo_Santoro'],
        evidenceUrls: ['https://imgur.com/test-war'],
        createdAt: new Date()
      }
    ];

    this.diplomacy = [
      {
        id: 'dip-1',
        factionName: 'East Side Ballas',
        status: 'Gergin',
        lastChangedBy: 'Vincenzo_Santoro',
        lastChangedDate: new Date()
      }
    ];

    this.punishments = [
      {
        id: 'pun-1',
        punishmentNumber: 'CEZA-101',
        memberId: 'mem-4',
        memberName: 'Dante_Russo',
        type: 'İhtar',
        reason: 'Test ceza',
        durationDays: 7,
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca',
        date: new Date()
      }
    ];

    this.reports = [
      {
        id: 'rep-1',
        reportNumber: 'IHBAR-001',
        category: 'Kural İhlali',
        reportedSubject: 'Test şikayet',
        description: 'Test ihbar detay',
        privacyLevel: 'Yüksek Gizlilik',
        status: 'İnceleniyor',
        submitterId: 'anonim',
        submitterName: 'Muhbir',
        evidenceUrls: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.evidenceList = [
      {
        id: 'evi-1',
        evidenceNumber: 'KNT-501',
        title: 'Test Kanıt',
        type: 'Video Bağlantısı',
        contentUrl: 'https://streamable.com/test',
        relatedCaseOrMember: 'Test Olay',
        description: 'Test kanıt kaydı',
        privacyLevel: 'Yetkili',
        uploaderId: 'mem-2',
        uploaderName: 'Marco_DeLuca',
        createdAt: new Date()
      }
    ];

    this.investigations = [
      {
        id: 'invs-1',
        investigationNumber: 'SOR-01',
        targetMemberId: 'mem-4',
        targetMemberName: 'Dante_Russo',
        leadInvestigatorId: 'mem-2',
        leadInvestigatorName: 'Marco_DeLuca',
        reason: 'Test soruşturma',
        evidenceNotes: 'Notlar',
        status: 'Delil Toplanıyor',
        confidentiality: 'Gizli',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.secretRecords = [
      {
        id: 'sec-1',
        codeName: 'TEST_KOD',
        category: 'İç Güvenlik',
        clearanceLevel: 'Sadece OG',
        content: 'Test gizli içerik',
        relatedMembers: ['mem-1'],
        attachments: [],
        authorId: 'mem-1',
        authorName: 'Vincenzo_Santoro',
        createdAt: new Date()
      }
    ];

    this.meetings = [
      {
        id: 'meet-1',
        meetingNumber: 'TOP-101',
        title: 'Haftalık Toplantı',
        subject: 'Genel Değerlendirme',
        agenda: '1. Gündem',
        scope: 'Genel Birlik',
        date: new Date(),
        timeString: '21:00',
        organizerId: 'mem-1',
        organizerName: 'Vincenzo_Santoro',
        status: 'Planlandı',
        voiceChannelName: '🔊 Birlik Toplantı Odası',
        participants: ['Vincenzo_Santoro', 'Marco_DeLuca'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.auditLogs = [
      {
        id: 'log-1',
        actionId: 'ACT-001',
        category: 'Sistem',
        actionType: 'SİSTEM_KURULUMU',
        executorId: 'SİSTEM',
        executorName: 'MTA Bot Çekirdeği',
        target: 'Birlik Veritabanı',
        description: 'MTA Illegal Birlik Sistemi başlatıldı.',
        timestamp: new Date()
      }
    ];
  }

  // Atomik Audit Log Oluşturma
  public addAuditLog(params: {
    category: string;
    actionType: string;
    executorId: string;
    executorName: string;
    target: string;
    oldValue?: string;
    newValue?: string;
    description: string;
  }): IAuditLog {
    const log: IAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionId: `ACT-${Date.now().toString().slice(-6)}`,
      category: params.category,
      actionType: params.actionType,
      executorId: params.executorId,
      executorName: params.executorName,
      target: params.target,
      oldValue: params.oldValue,
      newValue: params.newValue,
      description: params.description,
      timestamp: new Date()
    };
    this.auditLogs.unshift(log);
    this.notifyChange();
    return log;
  }
}

export const store = new UnifiedStore();
