/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - ZULA, MÜHİMMAT VE SİLAH ZİMMET SERVİSİ (ARMORY & LOADOUT)
 * Operasyon öncesi üyelere silah/mühimmat zimmetleme, çatışma sonrası iade ve kayıp takibi.
 */
import { store } from './store.ts';
import { InventoryService } from './inventoryService.ts';

export interface ILoadoutItem {
  id: string;
  loadoutNumber: string;
  memberId: string;
  memberMtaName: string;
  itemName: string;
  category: string;
  quantity: number;
  ammo: number;
  status: 'Zimmetli' | 'İade Edildi' | 'Kayıp / Çatışmada Düştü';
  notes?: string;
  assignedAt: Date;
  returnedAt?: Date;
  executorId: string;
  executorName: string;
}

export class LoadoutService {
  public static getAll(): ILoadoutItem[] {
    return store.loadouts || [];
  }

  public static getActive(): ILoadoutItem[] {
    return (store.loadouts || []).filter(l => l.status === 'Zimmetli');
  }

  public static getByMemberId(memberId: string): ILoadoutItem[] {
    return (store.loadouts || []).filter(l => l.memberId === memberId);
  }

  /**
   * Üyeye silah veya mühimmat zimmetler (Depodan otomatik düşer)
   */
  public static assignLoadout(params: {
    memberId: string;
    memberMtaName?: string;
    itemName?: string;
    weaponName?: string;
    category?: string;
    quantity?: number;
    ammo?: number;
    ammoCount?: number;
    notes?: string;
    purpose?: string;
    authorizedById?: string;
    authorizedByName?: string;
    executorId?: string;
    executorName?: string;
  }): { success: boolean; loadout?: ILoadoutItem; message: string } {
    if (!store.loadouts) store.loadouts = [];

    const member = store.members.find(m => m.id === params.memberId);
    const mtaName = params.memberMtaName || (member ? member.currentMtaName : 'Birlik Üyesi');
    const itemName = params.itemName || params.weaponName || 'Tabanca';
    const quantity = params.quantity || 1;
    const ammo = params.ammo || params.ammoCount || 100;
    const executorId = params.executorId || params.authorizedById || 'SİSTEM';
    const executorName = params.executorName || params.authorizedByName || 'Sistem';

    // Depoda yeterli stok var mı kontrol et
    const item = store.inventory.find(i => i.name && i.name.toLowerCase().includes(itemName.toLowerCase()));
    if (item && item.quantity < quantity) {
      return { success: false, message: `Depoda yeterli ${item.name} bulunmuyor! Mevcut stok: ${item.quantity}` };
    }

    // Depodan çıkar
    if (item) {
      InventoryService.removeItem({
        itemId: item.id,
        quantity,
        reason: `Zimmet: ${mtaName} üyesine verildi.`,
        executorId,
        executorName
      });
    }

    const nextNum = (store.loadouts.length + 1).toString().padStart(3, '0');
    const loadout: ILoadoutItem = {
      id: `zmt-${Date.now()}`,
      loadoutNumber: `ZMT-${nextNum}`,
      memberId: params.memberId,
      memberMtaName: mtaName,
      itemName: item ? item.name : itemName,
      category: params.category || (item ? item.category : 'Silah / Mühimmat'),
      quantity,
      ammo,
      status: 'Zimmetli',
      notes: params.notes || params.purpose,
      assignedAt: new Date(),
      executorId,
      executorName
    };

    store.loadouts.unshift(loadout);

    store.addAuditLog({
      category: 'Envanter',
      actionType: 'ZİMMET_VERİLDİ',
      executorId,
      executorName,
      target: mtaName,
      description: `[${loadout.loadoutNumber}] ${quantity}x ${loadout.itemName} (+${loadout.ammo} Mermi) zimmetlendi.`
    });

    return {
      success: true,
      loadout,
      message: `[${loadout.loadoutNumber}] **${loadout.itemName}** (${quantity} adet) başarıyla ${mtaName} üyesine zimmetlendi.`
    };
  }

  /**
   * Zimmetli eşyayı depoya geri teslim alır
   */
  public static returnLoadout(params: {
    loadoutId?: string;
    memberId?: string;
    weaponName?: string;
    returnedQuantity?: number;
    ammoReturned?: number;
    condition?: string;
    notes?: string;
    isLost?: boolean;
    receivedByName?: string;
    executorId?: string;
    executorName?: string;
  }): { success: boolean; message: string } {
    if (!store.loadouts) store.loadouts = [];
    
    let loadout = store.loadouts.find(l => (params.loadoutId && (l.id === params.loadoutId || l.loadoutNumber === params.loadoutId)));
    if (!loadout && params.memberId) {
      loadout = store.loadouts.find(l => l.memberId === params.memberId && l.status === 'Zimmetli' && (!params.weaponName || l.itemName.toLowerCase().includes(params.weaponName.toLowerCase())));
    }

    if (!loadout) {
      return { success: false, message: 'Zimmet kaydı bulunamadı!' };
    }

    const executorId = params.executorId || 'SİSTEM';
    const executorName = params.executorName || params.receivedByName || 'Sistem';
    const qty = params.returnedQuantity || 1;

    if (loadout.status !== 'Zimmetli') {
      return { success: false, message: `Bu zimmet zaten ${loadout.status} olarak işaretlenmiş.` };
    }

    if (params.isLost) {
      loadout.status = 'Kayıp / Çatışmada Düştü';
      loadout.returnedAt = new Date();
      loadout.notes = params.notes || 'Operasyonda kaybedildi';

      store.addAuditLog({
        category: 'Envanter',
        actionType: 'ZİMMET_KAYIP',
        executorId,
        executorName,
        target: loadout.memberMtaName,
        description: `[${loadout.loadoutNumber}] ${loadout.itemName} kayıp olarak kayda geçti: ${loadout.notes}`
      });

      return { success: true, message: `[${loadout.loadoutNumber}] ${loadout.itemName} zayiat/kayıp olarak kayda geçti.` };
    }

    // Depoya geri iade et
    InventoryService.addItem({
      name: loadout.itemName,
      category: loadout.category,
      quantity: qty,
      minWarningLimit: 5,
      description: `Zimmet İadesi: ${loadout.memberMtaName} tarafından teslim edildi.`,
      source: 'Zimmet İadesi',
      executorId,
      executorName
    });

    loadout.status = 'İade Edildi';
    loadout.returnedAt = new Date();
    if (params.notes || params.condition) loadout.notes = params.notes || params.condition;

    store.addAuditLog({
      category: 'Envanter',
      actionType: 'ZİMMET_İADE',
      executorId,
      executorName,
      target: loadout.memberMtaName,
      description: `[${loadout.loadoutNumber}] ${qty}x ${loadout.itemName} depoya iade alındı.`
    });

    return {
      success: true,
      message: `[${loadout.loadoutNumber}] ${loadout.itemName} başarıyla depoya iade alındı ve stoka eklendi.`
    };
  }
}
