/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - ENVANTER SERVİSİ
 */
import { store } from './store.ts';
import { IInventoryItem, IInventoryTransaction } from '../types/index.ts';

export class InventoryService {
  public static getAll(): IInventoryItem[] {
    return store.inventory;
  }

  public static getById(id: string): IInventoryItem | undefined {
    return store.inventory.find(i => i.id === id);
  }

  public static getLowStockWarnings(): IInventoryItem[] {
    return store.inventory.filter(i => i.quantity <= i.minWarningLimit);
  }

  public static addItem(params: {
    name: string;
    category: string;
    quantity: number;
    minWarningLimit?: number;
    description: string;
    source: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; item?: IInventoryItem; message: string } {
    if (params.quantity <= 0) {
      return { success: false, message: 'Miktar 0\'dan büyük olmalıdır!' };
    }

    let item = store.inventory.find(i => i.name.toLowerCase() === params.name.toLowerCase());

    if (item) {
      item.quantity += params.quantity;
      item.lastUpdatedBy = params.executorName;
      item.updatedAt = new Date();
    } else {
      item = {
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: params.name,
        category: params.category,
        quantity: params.quantity,
        minWarningLimit: params.minWarningLimit || 5,
        description: params.description,
        source: params.source,
        lastUpdatedBy: params.executorName,
        updatedAt: new Date()
      };
      store.inventory.push(item);
    }

    const tx: IInventoryTransaction = {
      id: `itx-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: 'Ekleme',
      changeAmount: params.quantity,
      newQuantity: item.quantity,
      reason: params.description || 'Stoğa yeni tedarik eklendi.',
      executorId: params.executorId,
      executorName: params.executorName,
      date: new Date()
    };
    store.inventoryTransactions.unshift(tx);

    store.addAuditLog({
      category: 'Envanter',
      actionType: 'EŞYA_EKLENDİ',
      executorId: params.executorId,
      executorName: params.executorName,
      target: item.name,
      newValue: `${item.quantity} Adet (+${params.quantity})`,
      description: `Kategori: ${params.category} | Kaynak: ${params.source}`
    });

    return {
      success: true,
      item,
      message: `'${item.name}' envantere eklendi. Güncel stok: ${item.quantity} adet.`
    };
  }

  public static removeItem(params: {
    itemId: string;
    quantity: number;
    reason: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; message: string; remainingQuantity?: number } {
    const item = this.getById(params.itemId);
    if (!item) return { success: false, message: 'Eşya envanterde bulunamadı!' };

    if (params.quantity <= 0) return { success: false, message: 'Çıkarılacak miktar 0\'dan büyük olmalıdır!' };
    if (params.quantity > item.quantity) {
      return {
        success: false,
        message: `Yetersiz Stok! Mevcut miktar: ${item.quantity}, talep edilen: ${params.quantity}`
      };
    }

    item.quantity -= params.quantity;
    item.lastUpdatedBy = params.executorName;
    item.updatedAt = new Date();

    const tx: IInventoryTransaction = {
      id: `itx-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: 'Çıkarma',
      changeAmount: -params.quantity,
      newQuantity: item.quantity,
      reason: params.reason,
      executorId: params.executorId,
      executorName: params.executorName,
      date: new Date()
    };
    store.inventoryTransactions.unshift(tx);

    store.addAuditLog({
      category: 'Envanter',
      actionType: 'EŞYA_ÇIKARILDI',
      executorId: params.executorId,
      executorName: params.executorName,
      target: item.name,
      newValue: `${item.quantity} Adet (-${params.quantity})`,
      description: `Sebep: ${params.reason}`
    });

    return {
      success: true,
      message: `'${item.name}' eşyasından ${params.quantity} adet çıkarıldı. Kalan stok: ${item.quantity}`,
      remainingQuantity: item.quantity
    };
  }
}
