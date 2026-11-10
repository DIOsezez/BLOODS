/**
 * MTA ILLEGAL BİRLİK YÖNETİM SİSTEMİ - TİP VE VERİ MODELLERİ
 * 100% Türkçe ve Discord.js v14 Uyumlu
 */

export enum RankLevel {
  UYE = 1,           // Seviye 1: Üye (Başlangıç rütbesi)
  KIDEMLI_UYE = 2,   // Seviye 2: Kıdemli Üye (Deneyimli üye)
  RECRUITER = 3,     // Seviye 3: Recruiter ("Çeteye Adam Çeker")
  UNDER_OG = 4,      // Seviye 4: Under OG (BG) (OG'nin altındaki yönetim rütbesi)
  OG = 5             // Seviye 5: OG (En yüksek rütbe)
}

export interface IRank {
  id: string;
  name: string;
  level: RankLevel;
  description: string;
  discordRoleId?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type MemberStatus = 'Aktif' | 'Pasif' | 'İzinli' | 'Askıda' | 'Ayrılmış' | 'Atılmış';

export interface IMtaCharacter {
  id: string;
  characterName: string;
  characterId: string;
  isMain: boolean;
  notes?: string;
  createdAt: Date;
}

export interface IMember {
  id: string;
  discordUserId: string;
  discordUsername: string;
  currentMtaName: string;
  currentMtaId: string;
  characters: IMtaCharacter[];
  rankId: string;
  rankLevel: RankLevel;
  rankName: string;
  joinedAt: Date;
  recruiterId?: string;
  recruiterName?: string;
  status: MemberStatus;
  statusReason?: string;
  warningsCount: number;
  xp: number;
  activityPoints: number;
  completedMissionsCount: number;
  notes?: string;
  leftAt?: Date;
  updatedAt: Date;
}

export interface IPromotionLog {
  id: string;
  memberId: string;
  memberName: string;
  oldRank: string;
  oldRankLevel: number;
  newRank: string;
  newRankLevel: number;
  reason: string;
  executorId: string;
  executorName: string;
  date: Date;
}

export interface IRecruiterInvite {
  id: string;
  recruiterId: string;
  recruiterName: string;
  candidateDiscordId: string;
  candidateDiscordTag: string;
  candidateMtaName: string;
  inviteDate: Date;
  status: 'Davet Edildi' | 'Başvurdu' | 'Kabul Edildi' | 'Reddedildi' | 'Katıldı';
  applicationId?: string;
  notes?: string;
}

export type ApplicationStatus = 'Beklemede' | 'İnceleniyor' | 'Kabul Edildi' | 'Reddedildi';

export interface IApplicationQuestion {
  id: string;
  question: string;
  required: boolean;
}

export interface IApplicationReview {
  reviewerId: string;
  reviewerName: string;
  score: number; // 1-10
  notes: string;
  reviewedAt: Date;
}

export interface IApplication {
  id: string;
  applicationNumber: number;
  discordUserId: string;
  discordUsername: string;
  oocName: string;
  age: number;
  mtaCharacterName: string;
  characterBackstory: string;
  roleplayExperience: string;
  joinReason: string;
  extraNotes?: string;
  status: ApplicationStatus;
  statusReason?: string;
  recruiterId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  reviews: IApplicationReview[];
  averageScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketCategory =
  | 'Genel Destek'
  | 'Birlik Başvurusu Desteği'
  | 'Yönetim Görüşmesi'
  | 'Şikayet'
  | 'İtiraz'
  | 'İzin Talebi'
  | 'Üye İşlemi'
  | 'Diğer';

export type TicketPriority = 'Düşük' | 'Normal' | 'Yüksek' | 'Kritik';
export type TicketStatus = 'Açık' | 'Beklemede' | 'Çözüldü' | 'Kapatıldı';

export interface ITicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
  isStaff: boolean;
}

export interface ITicket {
  id: string;
  ticketNumber: number;
  creatorId: string;
  creatorName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  channelId?: string;
  messages: ITicketMessage[];
  transcript?: string;
  createdAt: Date;
  closedAt?: Date;
  closedReason?: string;
  closedById?: string;
}

export type TransactionType = 'Para Yatırma' | 'Para Çekme' | 'Gelir' | 'Gider';

export interface ITreasuryTransaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  executorId: string;
  executorName: string;
  createdAt: Date;
}

export interface ITreasury {
  id: string;
  guildId: string;
  balance: number;
  maxWithdrawLimit: number;
  updatedAt: Date;
}

export interface IInventoryItem {
  id: string;
  name: string;
  category: string; // Silah, Mühimmat, Uyuşturucu, Zırh, Malzeme, Tıbbi, Diğer
  quantity: number;
  minWarningLimit: number;
  description: string;
  source: string;
  lastUpdatedBy: string;
  updatedAt: Date;
}

export interface IInventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Ekleme' | 'Çıkarma' | 'Düzeltme';
  changeAmount: number;
  newQuantity: number;
  reason: string;
  executorId: string;
  executorName: string;
  date: Date;
}

export type VehicleStatus = 'Aktif' | 'Kullanımda' | 'Garajda' | 'Bakımda' | 'Pasif' | 'Arşivlenmiş';

export interface IVehicle {
  id: string;
  name: string;
  modelId: number;
  plate: string;
  ownerName: string;
  assignedMemberId?: string;
  assignedMemberName?: string;
  garage: string;
  status: VehicleStatus;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TerritoryStatus = 'Kontrol Altında' | 'Tartışmalı' | 'Nötr' | 'Kaybedilmiş' | 'Arşivlenmiş';

export interface ITerritory {
  id: string;
  name: string;
  description: string;
  status: TerritoryStatus;
  associatedFaction: string;
  controlledSince: Date;
  responsibleMemberId?: string;
  responsibleMemberName?: string;
  notes?: string;
  updatedAt: Date;
}

export type MissionStatus = 'Hazırlanıyor' | 'Aktif' | 'Tamamlandı' | 'İptal Edildi' | 'Arşivlendi';

export interface IMission {
  id: string;
  title: string;
  description: string;
  category: 'Hood Savunması' | 'Tedarik Operasyonu' | 'Baskın' | 'İstihbarat' | 'Devriye' | 'Özel';
  assignedLeaderId: string;
  assignedLeaderName: string;
  participantIds: string[];
  participantNames: string[];
  status: MissionStatus;
  rewardXp?: number;
  outcome?: string;
  staffNotes?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export type WarStatus = 'Beklemede' | 'Devam Ediyor' | 'Sonuçlandı' | 'İptal Edildi';

export interface IWarRecord {
  id: string;
  recordNumber: string;
  rivalFaction: string;
  startDate: Date;
  endDate?: Date;
  status: WarStatus;
  participants: string[];
  rpOutcome?: string;
  evidenceUrls: string[];
  staffNotes?: string;
  createdAt: Date;
}

export type DiplomacyStatus = 'Dost' | 'Tarafsız' | 'Gergin' | 'Düşman' | 'Ateşkes' | 'İttifak';

export interface IDiplomacyRelation {
  id: string;
  factionName: string;
  status: DiplomacyStatus;
  contactPerson?: string;
  agreementDetails?: string;
  notes?: string;
  lastChangedDate: Date;
  lastChangedBy: string;
}

export type PunishmentType = 'Uyarı' | 'İhtar' | 'Yetki Kısıtlaması' | 'Geçici Uzaklaştırma' | 'Birlikten Çıkarma';

export interface IPunishment {
  id: string;
  punishmentNumber: string;
  memberId: string;
  memberName: string;
  type: PunishmentType;
  reason: string;
  durationDays?: number;
  evidenceUrl?: string;
  executorId: string;
  executorName: string;
  date: Date;
  appealStatus?: 'Yok' | 'İtiraz Edildi' | 'Kabul Edildi' | 'Reddedildi';
  appealReason?: string;
  appealResolvedBy?: string;
}

export type ReportCategory = 'Üye Şikayeti' | 'Kural İhlali' | 'Yetkili Şikayeti' | 'OOC Şikayet' | 'IC Olay Bildirimi' | 'Diğer';
export type ReportStatus = 'Yeni' | 'İnceleniyor' | 'Kanıt Bekleniyor' | 'Sonuçlandı' | 'Reddedildi';

export interface IReport {
  id: string;
  reportNumber: string;
  category: ReportCategory;
  reportedSubject: string;
  description: string;
  privacyLevel: 'Normal' | 'Yüksek Gizlilik' | 'Sadece OG';
  status: ReportStatus;
  submitterId: string; // anonim olabilir
  submitterName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  evidenceUrls: string[];
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEvidence {
  id: string;
  evidenceNumber: string;
  title: string;
  type: 'Görsel' | 'Video Bağlantısı' | 'Metin' | 'Discord Mesaj Bağlantısı' | 'Diğer';
  contentUrl: string;
  relatedCaseOrMember: string;
  description: string;
  privacyLevel: 'Herkese Açık' | 'Yetkili' | 'Gizli';
  uploaderId: string;
  uploaderName: string;
  createdAt: Date;
}

export interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  targetRole?: string;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  scheduledDate?: Date;
  publishedAt: Date;
}

export interface IAchievement {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  rewardXp: number;
}

export interface IMemberAchievement {
  achievementId: string;
  memberId: string;
  awardedAt: Date;
  awardedBy: string;
}

export interface IInvestigation {
  id: string;
  investigationNumber: string;
  targetMemberId: string;
  targetMemberName: string;
  leadInvestigatorId: string;
  leadInvestigatorName: string;
  reason: string;
  evidenceNotes: string;
  status: 'Devam Ediyor' | 'Delil Toplanıyor' | 'Duruşma' | 'Aklandı' | 'Cezalandırıldı' | 'Kapatıldı';
  verdict?: string;
  confidentiality: 'Gizli' | 'Çok Gizli';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISecretRecord {
  id: string;
  codeName: string;
  category: 'Köstebek İhbarı' | 'Büyük Sevkiyat' | 'İç Güvenlik' | 'Gizli Anlaşma' | 'Diğer';
  clearanceLevel: 'Under OG+' | 'Sadece OG';
  content: string;
  relatedMembers: string[];
  attachments: string[];
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface IAuditLog {
  id: string;
  actionId: string;
  category: string;
  actionType: string;
  executorId: string;
  executorName: string;
  target: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  timestamp: Date;
}

export interface IGangInfo {
  name: string;
  tag: string;
  description: string;
  foundedDate: Date;
  leaderName: string;
  status: 'Aktif' | 'Pasif' | 'Arşivlenmiş';
  historyNotes: string;
}

export interface IGuildSetupConfig {
  guildId: string;
  isConfigured: boolean;
  configuredAt?: Date;
  roleMappings: { [key: number]: string }; // level to discord role id (includes 0 for Aday)
  channelMappings: { [key: string]: string }; // channel identifier to discord channel id
  categoryMappings?: { [key: string]: string }; // category identifier to discord category id
  panelMessageIds: { [panelName: string]: { channelId: string; messageId: string; channelName?: string; sentAt?: string } };
}

export type MeetingStatus = 'Planlandı' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal Edildi';
export type MeetingScope = 'Genel Birlik' | 'Yönetim Toplantısı' | 'Ekip / Operasyon' | 'Özel';

export interface IMeeting {
  id: string;
  meetingNumber: string;
  title: string;
  subject: string;
  agenda: string;
  scope: MeetingScope;
  date: Date;
  timeString: string;
  voiceChannelName: string;
  organizerId: string;
  organizerName: string;
  participants: string[];
  notes?: string;
  decisions?: string;
  outcome?: string;
  status: MeetingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWarningRecord {
  id: string;
  warningNumber: number; // 1, 2, 3...
  discordUserId: string;
  discordUsername: string;
  memberId?: string;
  reason: string;
  proof?: string;
  executorId: string;
  executorName: string;
  createdAt: Date;
  active: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export type InactivityStatus = 'Beklemede' | 'Onaylandı' | 'Reddedildi' | 'Tamamlandı';

export interface IInactivityRequest {
  id: string;
  requestNumber: string; // Örn: INAK-101
  discordUserId: string;
  discordUsername: string;
  memberId?: string;
  mtaName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  status: InactivityStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

