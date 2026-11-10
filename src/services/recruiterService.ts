/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - RECRUITER VE ADAY YÖNETİMİ
 * Görevi: Çeteye Adam Çeker
 */
import { store } from './store.ts';
import { IRecruiterInvite } from '../types/index.ts';

export class RecruiterService {
  public static getAllInvites(): IRecruiterInvite[] {
    return store.recruiterInvites;
  }

  public static getInvitesByRecruiter(recruiterId: string): IRecruiterInvite[] {
    return store.recruiterInvites.filter(i => i.recruiterId === recruiterId);
  }

  public static createInvite(params: {
    recruiterDiscordId: string;
    candidateDiscordId: string;
    candidateDiscordTag: string;
    candidateMtaName: string;
    notes?: string;
  }): { success: boolean; invite?: IRecruiterInvite; message: string } {
    const recruiterMember = store.members.find(m => m.discordUserId === params.recruiterDiscordId);
    const recruiterName = recruiterMember ? recruiterMember.currentMtaName : 'Bilinmeyen Recruiter';

    const existing = store.recruiterInvites.find(
      i => i.candidateDiscordId === params.candidateDiscordId && i.status !== 'Reddedildi'
    );
    if (existing) {
      return { success: false, message: 'Bu aday için zaten aktif bir davet kaydı bulunmaktadır!' };
    }

    const newInvite: IRecruiterInvite = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recruiterId: recruiterMember ? recruiterMember.id : params.recruiterDiscordId,
      recruiterName,
      candidateDiscordId: params.candidateDiscordId,
      candidateDiscordTag: params.candidateDiscordTag,
      candidateMtaName: params.candidateMtaName,
      inviteDate: new Date(),
      status: 'Davet Edildi',
      notes: params.notes || 'Recruiter tarafından çeteye davet edildi.'
    };

    store.recruiterInvites.unshift(newInvite);

    store.addAuditLog({
      category: 'Recruiter',
      actionType: 'DAVET_OLUŞTURULDU',
      executorId: params.recruiterDiscordId,
      executorName: recruiterName,
      target: `${params.candidateDiscordTag} (${params.candidateMtaName})`,
      description: `Aday çeteye davet edildi. Not: ${params.notes || '-'}`
    });

    return {
      success: true,
      invite: newInvite,
      message: `Aday '${params.candidateDiscordTag}' başarıyla davet listesine kaydedildi.`
    };
  }

  public static getRecruiterStats(recruiterMemberId?: string): {
    totalInvited: number;
    applied: number;
    accepted: number;
    rejected: number;
    joined: number;
    conversionRate: number;
  } {
    const invites = recruiterMemberId
      ? store.recruiterInvites.filter(i => i.recruiterId === recruiterMemberId)
      : store.recruiterInvites;

    const totalInvited = invites.length;
    const applied = invites.filter(i => i.status === 'Başvurdu' || i.status === 'Kabul Edildi' || i.status === 'Katıldı').length;
    const accepted = invites.filter(i => i.status === 'Kabul Edildi' || i.status === 'Katıldı').length;
    const rejected = invites.filter(i => i.status === 'Reddedildi').length;
    const joined = invites.filter(i => i.status === 'Katıldı').length;
    const conversionRate = totalInvited > 0 ? Math.round((joined / totalInvited) * 100) : 0;

    return {
      totalInvited,
      applied,
      accepted,
      rejected,
      joined,
      conversionRate
    };
  }
}
