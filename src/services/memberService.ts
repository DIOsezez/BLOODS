/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - ÜYE VE KARAKTER SERVİSİ
 */
import { store } from './store.ts';
import { IMember, MemberStatus, IMtaCharacter, RankLevel } from '../types/index.ts';

export class MemberService {
  public static getAll(): IMember[] {
    return store.members;
  }

  public static getById(id: string): IMember | undefined {
    return store.members.find(m => m.id === id);
  }

  public static getByDiscordId(discordUserId: string): IMember | undefined {
    return store.members.find(m => m.discordUserId === discordUserId);
  }

  public static search(query: string, statusFilter?: MemberStatus): IMember[] {
    const q = query.toLowerCase().trim();
    return store.members.filter(m => {
      const matchesQuery =
        !q ||
        m.discordUsername.toLowerCase().includes(q) ||
        m.currentMtaName.toLowerCase().includes(q) ||
        m.currentMtaId.toLowerCase().includes(q) ||
        m.rankName.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || m.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }

  public static addMember(params: {
    discordUserId: string;
    discordUsername: string;
    mtaName: string;
    mtaId?: string;
    recruiterId?: string;
    recruiterName?: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; member?: IMember; message: string } {
    const existing = this.getByDiscordId(params.discordUserId);
    if (existing) {
      return { success: false, message: 'Bu Discord kullanıcısı zaten birlik üyesi olarak kayıtlı!' };
    }

    const defaultRank = store.ranks.find(r => r.level === RankLevel.UYE) || {
      id: 'rank-1',
      name: 'Üye',
      level: RankLevel.UYE
    };

    const newChar: IMtaCharacter = {
      id: `char-${Date.now()}`,
      characterName: params.mtaName,
      characterId: params.mtaId || `MTA-${Math.floor(100 + Math.random() * 900)}`,
      isMain: true,
      createdAt: new Date()
    };

    const newMember: IMember = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      discordUserId: params.discordUserId,
      discordUsername: params.discordUsername,
      currentMtaName: params.mtaName,
      currentMtaId: newChar.characterId,
      characters: [newChar],
      rankId: defaultRank.id,
      rankLevel: defaultRank.level,
      rankName: defaultRank.name,
      joinedAt: new Date(),
      recruiterId: params.recruiterId,
      recruiterName: params.recruiterName,
      status: 'Aktif',
      warningsCount: 0,
      xp: 100,
      activityPoints: 50,
      completedMissionsCount: 0,
      updatedAt: new Date()
    };

    store.members.push(newMember);

    store.addAuditLog({
      category: 'Üye',
      actionType: 'ÜYE_EKLENDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: params.discordUsername,
      newValue: `MTA: ${params.mtaName} | Rütbe: ${defaultRank.name}`,
      description: `Yeni üye birliğe kaydedildi (Rütbe: ${defaultRank.name}).`
    });

    return { success: true, member: newMember, message: 'Üye kaydı başarıyla oluşturuldu.' };
  }

  public static removeMember(params: {
    memberId: string;
    reason: string;
    executorId: string;
    executorName: string;
    isKick?: boolean;
  }): { success: boolean; message: string } {
    const member = this.getById(params.memberId);
    if (!member) {
      return { success: false, message: 'Üye bulunamadı!' };
    }

    const oldStatus = member.status;
    member.status = params.isKick ? 'Atılmış' : 'Ayrılmış';
    member.statusReason = params.reason;
    member.leftAt = new Date();
    member.updatedAt = new Date();

    store.addAuditLog({
      category: 'Üye',
      actionType: params.isKick ? 'ÜYE_ATILDI' : 'ÜYE_AYRILDI',
      executorId: params.executorId,
      executorName: params.executorName,
      target: `${member.discordUsername} (${member.currentMtaName})`,
      oldValue: oldStatus,
      newValue: member.status,
      description: `Neden: ${params.reason}`
    });

    return {
      success: true,
      message: `${member.discordUsername} isimli üye ${params.isKick ? 'birlikten atıldı' : 'ayrıldı'}.`
    };
  }

  public static changeStatus(
    memberId: string,
    newStatus: MemberStatus,
    reason: string,
    executorId: string,
    executorName: string
  ): { success: boolean; message: string } {
    const member = this.getById(memberId);
    if (!member) return { success: false, message: 'Üye bulunamadı!' };

    const old = member.status;
    member.status = newStatus;
    member.statusReason = reason;
    member.updatedAt = new Date();

    store.addAuditLog({
      category: 'Üye',
      actionType: 'DURUM_GÜNCELLENDİ',
      executorId,
      executorName,
      target: member.discordUsername,
      oldValue: old,
      newValue: newStatus,
      description: `Durum '${old}' -> '${newStatus}' olarak güncellendi. Neden: ${reason}`
    });

    return { success: true, message: `Üye durumu başarıyla '${newStatus}' yapıldı.` };
  }

  public static addCharacter(
    memberId: string,
    charName: string,
    charId: string,
    setMain = false
  ): { success: boolean; message: string } {
    const member = this.getById(memberId);
    if (!member) return { success: false, message: 'Üye bulunamadı!' };

    const exists = member.characters.some(c => c.characterName.toLowerCase() === charName.toLowerCase());
    if (exists) return { success: false, message: 'Bu karakter adı zaten üyede kayıtlı!' };

    if (setMain) {
      member.characters.forEach(c => (c.isMain = false));
      member.currentMtaName = charName;
      member.currentMtaId = charId;
    }

    member.characters.push({
      id: `char-${Date.now()}`,
      characterName: charName,
      characterId: charId,
      isMain: setMain,
      createdAt: new Date()
    });
    member.updatedAt = new Date();

    return { success: true, message: `Karakter '${charName}' başarıyla eklendi.` };
  }

  public static switchCharacter(memberId: string, characterId: string): { success: boolean; message: string } {
    const member = this.getById(memberId);
    if (!member) return { success: false, message: 'Üye bulunamadı!' };

    const char = member.characters.find(c => c.id === characterId || c.characterId === characterId);
    if (!char) return { success: false, message: 'Karakter kaydı bulunamadı!' };

    member.characters.forEach(c => (c.isMain = c.id === char.id));
    member.currentMtaName = char.characterName;
    member.currentMtaId = char.characterId;
    member.updatedAt = new Date();

    return { success: true, message: `Aktif karakter '${char.characterName}' olarak değiştirildi.` };
  }

  public static deleteMember(identifier: string): { success: boolean; message: string } {
    const q = identifier.toLowerCase().trim();
    if (q === 'test' || q === 'testler' || q === 'all_test') {
      const count = this.cleanTestMembers();
      return { success: true, message: `${count} adet test üyesi sistemden başarıyla silindi.` };
    }

    const index = store.members.findIndex(
      m =>
        m.id.toLowerCase() === q ||
        m.discordUserId.toLowerCase() === q ||
        m.discordUsername.toLowerCase() === q ||
        m.currentMtaName.toLowerCase() === q
    );

    if (index === -1) {
      return { success: false, message: `Silinecek üye bulunamadı: '${identifier}'` };
    }

    const removed = store.members.splice(index, 1)[0];
    store.addAuditLog({
      category: 'Üye',
      actionType: 'ÜYE_SİLİNDİ',
      executorId: 'Sistem',
      executorName: 'Yönetici',
      target: `${removed.discordUsername} (${removed.currentMtaName})`,
      description: 'Üye kaydı veritabanından kalıcı olarak silindi.'
    });

    return { success: true, message: `${removed.discordUsername} (${removed.currentMtaName}) kalıcı olarak silindi.` };
  }

  public static cleanTestMembers(): number {
    const before = store.members.length;
    store.members = store.members.filter(m => {
      const u = (m.discordUsername || '').toLowerCase();
      const id = (m.discordUserId || '').toLowerCase();
      const mta = (m.currentMtaName || '').toLowerCase();
      const isTest =
        id.includes('test') ||
        u.includes('test') ||
        mta.includes('test') ||
        id.includes('candidate') ||
        u.includes('candidate') ||
        mta.includes('falcone') ||
        id.includes('app-') ||
        m.status === 'Atılmış' ||
        m.status === 'Ayrılmış' ||
        u.startsWith('üye_') ||
        mta.startsWith('yeni_uye_') ||
        u.includes('gamer') ||
        id.startsWith('dummy');
      return !isTest;
    });
    return before - store.members.length;
  }
}

