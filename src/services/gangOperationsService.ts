/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - İLERİ SEVİYE BİRLİK VE DİSİPLİN SERVİSLERİ
 * Araçlar, Hood, Görevler, Savaş, Diplomasi, Cezalar, İhbar, Kanıt, Gizli Arşiv ve İstatistikler
 */
import { store } from './store.ts';
import {
  IVehicle,
  VehicleStatus,
  ITerritory,
  TerritoryStatus,
  IMission,
  MissionStatus,
  IWarRecord,
  WarStatus,
  IDiplomacyRelation,
  DiplomacyStatus,
  IPunishment,
  PunishmentType,
  IReport,
  ReportCategory,
  IEvidence,
  IAnnouncement,
  IAchievement,
  IInvestigation,
  ISecretRecord
} from '../types/index.ts';

export class VehicleService {
  public static getAll(): IVehicle[] {
    return store.vehicles;
  }

  public static addVehicle(params: {
    name: string;
    modelId: number;
    plate: string;
    ownerName: string;
    garage: string;
    description: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; vehicle?: IVehicle; message: string } {
    const exists = store.vehicles.some(v => v.plate.toUpperCase() === params.plate.toUpperCase());
    if (exists) return { success: false, message: 'Bu plakaya sahip araç zaten filoda kayıtlı!' };

    const veh: IVehicle = {
      id: `veh-${Date.now()}`,
      name: params.name,
      modelId: params.modelId,
      plate: params.plate.toUpperCase(),
      ownerName: params.ownerName,
      garage: params.garage,
      status: 'Garajda',
      description: params.description,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    store.vehicles.push(veh);

    store.addAuditLog({
      category: 'Araç',
      actionType: 'ARAÇ_EKLENDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: `${veh.name} [${veh.plate}]`,
      description: `Model: ${params.modelId} | Garaj: ${params.garage}`
    });

    return { success: true, vehicle: veh, message: `Araç '${veh.name}' [${veh.plate}] filoya eklendi.` };
  }

  public static updateStatus(
    vehicleId: string,
    status: VehicleStatus,
    assignedMemberName: string | undefined,
    executorName: string
  ): { success: boolean; message: string } {
    const veh = store.vehicles.find(v => v.id === vehicleId);
    if (!veh) return { success: false, message: 'Araç bulunamadı!' };

    veh.status = status;
    if (assignedMemberName !== undefined) veh.assignedMemberName = assignedMemberName;
    veh.updatedAt = new Date();

    return { success: true, message: `Araç durumu '${status}' olarak güncellendi.` };
  }
}

export class TerritoryService {
  public static getAll(): ITerritory[] {
    return store.territories;
  }

  public static updateStatus(
    territoryId: string,
    status: TerritoryStatus,
    notes: string,
    executorName: string
  ): { success: boolean; message: string } {
    const ter = store.territories.find(t => t.id === territoryId);
    if (!ter) return { success: false, message: 'Bölge bulunamadı!' };

    const oldStatus = ter.status;
    ter.status = status;
    if (notes) ter.notes = notes;
    ter.updatedAt = new Date();

    store.addAuditLog({
      category: 'Bölge',
      actionType: 'BÖLGE_DURUMU_GÜNCELLENDİ',
      executorId: 'YETKILI',
      executorName,
      target: ter.name,
      oldValue: oldStatus,
      newValue: status,
      description: `Not: ${notes || '-'}`
    });

    return { success: true, message: `'${ter.name}' bölge durumu '${status}' yapıldı.` };
  }
}

export class MissionService {
  public static getAll(): IMission[] {
    return [...store.missions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public static createMission(params: {
    title: string;
    description: string;
    category: any;
    leaderId: string;
    leaderName: string;
    participantIds: string[];
    participantNames: string[];
    rewardXp: number;
  }): { success: boolean; mission?: IMission; message: string } {
    const mis: IMission = {
      id: `mis-${Date.now()}`,
      title: params.title,
      description: params.description,
      category: params.category,
      assignedLeaderId: params.leaderId,
      assignedLeaderName: params.leaderName,
      participantIds: params.participantIds,
      participantNames: params.participantNames,
      status: 'Aktif',
      rewardXp: params.rewardXp || 100,
      startDate: new Date(),
      createdAt: new Date()
    };
    store.missions.unshift(mis);

    return { success: true, mission: mis, message: `Görev '${mis.title}' başarıyla oluşturuldu.` };
  }

  public static completeMission(
    missionId: string,
    outcome: string,
    executorName: string
  ): { success: boolean; message: string } {
    const mis = store.missions.find(m => m.id === missionId);
    if (!mis) return { success: false, message: 'Görev bulunamadı!' };

    mis.status = 'Tamamlandı';
    mis.outcome = outcome;
    mis.endDate = new Date();

    // Katılımcılara XP ve tamamlanan görev sayısı ekle
    const reward = mis.rewardXp || 100;
    for (const memId of mis.participantIds) {
      const m = store.members.find(x => x.id === memId || x.discordUserId === memId);
      if (m) {
        m.xp += reward;
        m.completedMissionsCount += 1;
        m.activityPoints = Math.min(100, m.activityPoints + 10);
      }
    }

    return { success: true, message: `Görev tamamlandı! Katılımcılara +${reward} XP tanımlandı.` };
  }
}

export class WarService {
  public static getAll(): IWarRecord[] {
    return store.warRecords;
  }

  public static createRecord(params: {
    rivalFaction: string;
    participants: string[];
    notes: string;
    executorName: string;
  }): { success: boolean; war?: IWarRecord; message: string } {
    const warNum = `WAR-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`;
    const war: IWarRecord = {
      id: `war-${Date.now()}`,
      recordNumber: warNum,
      rivalFaction: params.rivalFaction,
      startDate: new Date(),
      status: 'Devam Ediyor',
      participants: params.participants,
      evidenceUrls: [],
      staffNotes: params.notes,
      createdAt: new Date()
    };
    store.warRecords.unshift(war);

    return { success: true, war, message: `Kurgusal savaş kaydı [${warNum}] oluşturuldu.` };
  }

  public static finishRecord(
    warId: string,
    status: WarStatus,
    rpOutcome: string,
    evidenceUrls: string[]
  ): { success: boolean; message: string } {
    const war = store.warRecords.find(w => w.id === warId);
    if (!war) return { success: false, message: 'Savaş kaydı bulunamadı!' };

    war.status = status;
    war.rpOutcome = rpOutcome;
    war.evidenceUrls = evidenceUrls;
    war.endDate = new Date();

    return { success: true, message: `Savaş kaydı '${status}' olarak arşivlendi.` };
  }
}

export class DiplomacyService {
  public static getAll(): IDiplomacyRelation[] {
    return store.diplomacy;
  }

  public static setRelation(params: {
    factionName: string;
    status: DiplomacyStatus;
    contactPerson?: string;
    agreementDetails?: string;
    notes?: string;
    executorName: string;
  }): { success: boolean; message: string } {
    let rel = store.diplomacy.find(d => d.factionName.toLowerCase() === params.factionName.toLowerCase());

    if (rel) {
      const old = rel.status;
      rel.status = params.status;
      if (params.contactPerson) rel.contactPerson = params.contactPerson;
      if (params.agreementDetails) rel.agreementDetails = params.agreementDetails;
      if (params.notes) rel.notes = params.notes;
      rel.lastChangedDate = new Date();
      rel.lastChangedBy = params.executorName;
    } else {
      rel = {
        id: `dip-${Date.now()}`,
        factionName: params.factionName,
        status: params.status,
        contactPerson: params.contactPerson,
        agreementDetails: params.agreementDetails,
        notes: params.notes,
        lastChangedDate: new Date(),
        lastChangedBy: params.executorName
      };
      store.diplomacy.push(rel);
    }

    return { success: true, message: `${params.factionName} ile diplomatik ilişki '${params.status}' yapıldı.` };
  }
}

export class PunishmentService {
  public static getAll(): IPunishment[] {
    return [...store.punishments].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public static getByMemberId(memberId: string): IPunishment[] {
    return store.punishments.filter(p => p.memberId === memberId);
  }

  public static issuePunishment(params: {
    memberId: string;
    type: PunishmentType;
    reason: string;
    durationDays?: number;
    evidenceUrl?: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; punishment?: IPunishment; message: string } {
    const member = store.members.find(m => m.id === params.memberId || m.discordUserId === params.memberId);
    if (!member) return { success: false, message: 'Üye bulunamadı!' };

    const punNum = `CEZA-${Math.floor(100 + Math.random() * 900)}`;
    const pun: IPunishment = {
      id: `pun-${Date.now()}`,
      punishmentNumber: punNum,
      memberId: member.id,
      memberName: `${member.discordUsername} (${member.currentMtaName})`,
      type: params.type,
      reason: params.reason,
      durationDays: params.durationDays || 0,
      evidenceUrl: params.evidenceUrl,
      executorId: params.executorId,
      executorName: params.executorName,
      date: new Date(),
      appealStatus: 'Yok'
    };

    store.punishments.unshift(pun);
    member.warningsCount += 1;
    member.activityPoints = Math.max(0, member.activityPoints - 15);

    if (params.type === 'Birlikten Çıkarma') {
      member.status = 'Atılmış';
      member.statusReason = params.reason;
      member.leftAt = new Date();
    }

    store.addAuditLog({
      category: 'Ceza',
      actionType: 'CEZA_VERİLDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: member.discordUsername,
      newValue: `${params.type} [${punNum}]`,
      description: `Gerekçe: ${params.reason}`
    });

    return { success: true, punishment: pun, message: `Ceza [${punNum}] başarıyla üye siciline işlendi.` };
  }

  public static submitAppeal(punishmentId: string, reason: string): { success: boolean; message: string } {
    const pun = store.punishments.find(p => p.id === punishmentId || p.punishmentNumber === punishmentId);
    if (!pun) return { success: false, message: 'Ceza kaydı bulunamadı!' };

    pun.appealStatus = 'İtiraz Edildi';
    pun.appealReason = reason;

    return { success: true, message: 'İtirazınız yönetim kuruluna iletildi.' };
  }

  public static resolveAppeal(
    punishmentId: string,
    approved: boolean,
    resolvedBy: string
  ): { success: boolean; message: string } {
    const pun = store.punishments.find(p => p.id === punishmentId || p.punishmentNumber === punishmentId);
    if (!pun) return { success: false, message: 'Ceza kaydı bulunamadı!' };

    pun.appealStatus = approved ? 'Kabul Edildi' : 'Reddedildi';
    pun.appealResolvedBy = resolvedBy;

    return { success: true, message: `İtiraz karara bağlandı: ${pun.appealStatus}` };
  }
}

export class ReportService {
  public static getAll(): IReport[] {
    return store.reports;
  }

  public static submitReport(params: {
    category: ReportCategory;
    reportedSubject: string;
    description: string;
    privacyLevel: any;
    submitterId: string;
    submitterName: string;
    evidenceUrls?: string[];
  }): { success: boolean; report?: IReport; message: string } {
    const repNum = `IHBAR-${Math.floor(100 + Math.random() * 900)}`;
    const rep: IReport = {
      id: `rep-${Date.now()}`,
      reportNumber: repNum,
      category: params.category,
      reportedSubject: params.reportedSubject,
      description: params.description,
      privacyLevel: params.privacyLevel || 'Normal',
      status: 'Yeni',
      submitterId: params.submitterId,
      submitterName: params.submitterName,
      evidenceUrls: params.evidenceUrls || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    store.reports.unshift(rep);

    return { success: true, report: rep, message: `İhbar [${repNum}] gizli arşive iletildi.` };
  }

  public static resolveReport(params: {
    reportId: string;
    verdict: string;
    notes: string;
    executorName: string;
  }): { success: boolean; message: string } {
    const rep = store.reports.find(r => r.id === params.reportId || r.reportNumber === params.reportId);
    if (!rep) return { success: false, message: 'İhbar kaydı bulunamadı!' };

    rep.status = 'Sonuçlandı';
    rep.resolutionNotes = `${params.verdict}: ${params.notes} (İnceleyen: ${params.executorName})`;
    rep.updatedAt = new Date();

    return { success: true, message: `İhbar [${rep.reportNumber}] başarıyla sonuçlandırıldı.` };
  }
}

export class EvidenceService {
  public static getAll(): IEvidence[] {
    return store.evidenceList;
  }

  public static addEvidence(params: {
    title: string;
    type: any;
    contentUrl: string;
    relatedCase: string;
    description: string;
    privacyLevel: any;
    uploaderId: string;
    uploaderName: string;
  }): { success: boolean; evidence?: IEvidence; message: string } {
    const eviNum = `KNT-${Math.floor(100 + Math.random() * 900)}`;
    const evi: IEvidence = {
      id: `evi-${Date.now()}`,
      evidenceNumber: eviNum,
      title: params.title,
      type: params.type,
      contentUrl: params.contentUrl,
      relatedCaseOrMember: params.relatedCase,
      description: params.description,
      privacyLevel: params.privacyLevel,
      uploaderId: params.uploaderId,
      uploaderName: params.uploaderName,
      createdAt: new Date()
    };
    store.evidenceList.unshift(evi);

    return { success: true, evidence: evi, message: `Kanıt [${eviNum}] arşive kaydedildi.` };
  }
}

export class AnnouncementService {
  public static getAll(): IAnnouncement[] {
    return store.announcements;
  }

  public static publish(params: {
    title: string;
    content: string;
    targetRole?: string;
    isPinned?: boolean;
    authorId: string;
    authorName: string;
  }): { success: boolean; announcement?: IAnnouncement; message: string } {
    const ann: IAnnouncement = {
      id: `ann-${Date.now()}`,
      title: params.title,
      content: params.content,
      targetRole: params.targetRole,
      isPinned: !!params.isPinned,
      authorId: params.authorId,
      authorName: params.authorName,
      publishedAt: new Date()
    };
    store.announcements.unshift(ann);

    return { success: true, announcement: ann, message: 'Duyuru başarıyla yayınlandı.' };
  }
}

export class AchievementService {
  public static getAll(): IAchievement[] {
    return store.achievements;
  }

  public static getLeaderboard(): { rank: number; name: string; mtaName: string; xp: number; missions: number }[] {
    return store.members
      .slice()
      .sort((a, b) => b.xp - a.xp)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.discordUsername,
        mtaName: m.currentMtaName,
        xp: m.xp,
        missions: m.completedMissionsCount
      }));
  }
}

export class InvestigationService {
  public static getAll(): IInvestigation[] {
    return store.investigations;
  }

  public static createInvestigation(params: {
    targetMemberId: string;
    targetMemberName: string;
    leadInvestigatorId: string;
    leadInvestigatorName: string;
    reason: string;
    confidentiality: any;
  }): { success: boolean; investigation?: IInvestigation; message: string } {
    const invNum = `SOR-${Math.floor(10 + Math.random() * 90)}`;
    const inv: IInvestigation = {
      id: `invs-${Date.now()}`,
      investigationNumber: invNum,
      targetMemberId: params.targetMemberId,
      targetMemberName: params.targetMemberName,
      leadInvestigatorId: params.leadInvestigatorId,
      leadInvestigatorName: params.leadInvestigatorName,
      reason: params.reason,
      evidenceNotes: '',
      status: 'Devam Ediyor',
      confidentiality: params.confidentiality || 'Gizli',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    store.investigations.unshift(inv);

    return { success: true, investigation: inv, message: `İç soruşturma [${invNum}] başlatıldı.` };
  }

  public static concludeInvestigation(params: {
    investigationId: string;
    verdict: string;
    notes: string;
    executorName: string;
  }): { success: boolean; message: string } {
    const inv = store.investigations.find(
      i =>
        i.id === params.investigationId ||
        i.investigationNumber === params.investigationId ||
        i.targetMemberName.toLowerCase().includes(params.investigationId.toLowerCase())
    );
    if (!inv) return { success: false, message: 'Soruşturma dosyası bulunamadı!' };

    inv.status = params.verdict as any;
    inv.evidenceNotes = (inv.evidenceNotes ? inv.evidenceNotes + '\n' : '') + `Karar: ${params.verdict} - ${params.notes} (Müfettiş: ${params.executorName})`;
    inv.updatedAt = new Date();

    return { success: true, message: `Soruşturma [${inv.investigationNumber}] karara bağlandı: ${params.verdict}` };
  }
}

export class StatsService {
  public static getStats() {
    const totalMembers = store.members.length;
    const activeMembers = store.members.filter(m => m.status === 'Aktif').length;
    const passiveMembers = store.members.filter(m => m.status === 'Pasif' || m.status === 'İzinli').length;
    const leftMembers = store.members.filter(m => m.status === 'Ayrılmış' || m.status === 'Atılmış').length;

    const totalApps = store.applications.length;
    const acceptedApps = store.applications.filter(a => a.status === 'Kabul Edildi').length;
    const rejectedApps = store.applications.filter(a => a.status === 'Reddedildi').length;
    const acceptRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 0;

    const openTickets = store.tickets.filter(t => t.status === 'Açık' || t.status === 'Beklemede').length;
    const completedMissions = store.missions.filter(m => m.status === 'Tamamlandı').length;
    const totalVehicles = store.vehicles.length;
    const controlledTerritories = store.territories.filter(t => t.status === 'Kontrol Altında').length;
    const balance = store.treasury.balance;

    return {
      totalMembers,
      activeMembers,
      passiveMembers,
      leftMembers,
      totalApps,
      acceptedApps,
      rejectedApps,
      acceptRate,
      openTickets,
      completedMissions,
      totalVehicles,
      controlledTerritories,
      balance,
      auditLogsCount: store.auditLogs.length
    };
  }
}
