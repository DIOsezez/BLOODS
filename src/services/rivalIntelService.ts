/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - RAKİP BİRLİK İSTİHBARATI VE ÇETE HARİTASI (FACTION INTEL)
 * Düşman çetelerin liderleri, araçları, bölgeleri ve istihbarat notları arşivi.
 */
import { store } from './store.ts';

export interface IRivalFaction {
  id: string;
  name: string;
  tag: string;
  leaderName: string;
  threatLevel: 'Düşman' | 'Ateşkes' | 'Müttefik' | 'Savaş Halinde' | 'Bilinmiyor';
  controlledZones: string[];
  estimatedMemberCount: number;
  knownVehicles: string[];
  intelNotes: string;
  lastUpdated: Date;
  createdAt: Date;
}

export class RivalIntelService {
  public static getAll(): IRivalFaction[] {
    return store.rivals || [];
  }

  public static getById(id: string): IRivalFaction | undefined {
    return (store.rivals || []).find(r => r.id === id || r.name.toLowerCase() === id.toLowerCase() || r.tag.toLowerCase() === id.toLowerCase());
  }

  public static addRival(params: {
    name?: string;
    gangName?: string;
    tag?: string;
    leaderName?: string;
    leader?: string;
    threatLevel: 'Düşman' | 'Ateşkes' | 'Müttefik' | 'Savaş Halinde' | 'Bilinmiyor' | 'Kritik' | 'Yüksek' | 'Orta' | 'Düşük';
    controlledZones?: string[];
    mainTerritory?: string;
    estimatedMemberCount?: number;
    estimatedMembers?: number;
    knownVehicles?: string[];
    intelNotes: string;
    executorName?: string;
    addedByName?: string;
  }): { success: boolean; rival?: IRivalFaction; message: string } {
    if (!store.rivals) store.rivals = [];

    const name = params.name || params.gangName || 'Bilinmeyen Birlik';
    const tag = (params.tag || name.slice(0, 3)).toUpperCase();
    const leader = params.leaderName || params.leader || 'Bilinmiyor';
    const executorName = params.executorName || params.addedByName || 'Sistem';
    const zones = params.controlledZones || (params.mainTerritory ? [params.mainTerritory] : ['Bilinmeyen Bölge']);
    const members = params.estimatedMemberCount || params.estimatedMembers || 10;

    const existing = store.rivals.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return { success: false, message: 'Bu isimde bir rakip birlik dosyası zaten mevcut!' };
    }

    const rival: IRivalFaction = {
      id: `riv-${Date.now()}`,
      name,
      tag,
      leaderName: leader,
      threatLevel: params.threatLevel as any,
      controlledZones: zones,
      estimatedMemberCount: members,
      knownVehicles: params.knownVehicles || [],
      intelNotes: params.intelNotes,
      lastUpdated: new Date(),
      createdAt: new Date()
    };

    store.rivals.unshift(rival);

    store.addAuditLog({
      category: 'Diplomasi',
      actionType: 'İSTİHBARAT_EKLENDİ',
      executorId: 'SİSTEM',
      executorName,
      target: `${rival.name} [${rival.tag}]`,
      description: `Yeni rakip birlik istihbarat dosyası açıldı. Tehdit: ${rival.threatLevel}`
    });

    return {
      success: true,
      rival,
      message: `**${rival.name} [${rival.tag}]** istihbarat arşivi başarıyla açıldı. Tehdit: **${rival.threatLevel}**`
    };
  }

  public static updateThreatLevel(
    id: string,
    threatLevel: 'Düşman' | 'Ateşkes' | 'Müttefik' | 'Savaş Halinde' | 'Bilinmiyor' | 'Kritik' | 'Yüksek' | 'Orta' | 'Düşük',
    notes: string,
    executorName: string
  ): { success: boolean; message: string } {
    const rival = this.getById(id);
    if (!rival) return { success: false, message: 'İstihbarat dosyası bulunamadı!' };

    rival.threatLevel = threatLevel as any;
    rival.intelNotes = `${rival.intelNotes}\n[${new Date().toLocaleDateString('tr-TR')}]: ${notes}`;
    rival.lastUpdated = new Date();

    store.addAuditLog({
      category: 'Diplomasi',
      actionType: 'İSTİHBARAT_GÜNCELLENDİ',
      executorId: 'SİSTEM',
      executorName,
      target: rival.name,
      description: `Tehdit düzeyi güncellendi: ${threatLevel} - Not: ${notes}`
    });

    return {
      success: true,
      message: `**${rival.name}** tehdit düzeyi **${threatLevel}** olarak güncellendi.`
    };
  }
}
