/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - KASA VE EKONOMİ SERVİSİ
 * Atomik Bakiye Güncellemesi ve Yinelenen İşlem Engeli
 */
import { store } from './store.ts';
import { ITreasuryTransaction, TransactionType } from '../types/index.ts';

export class EconomyService {
  private static isLocked = false;

  public static getBalance(): number {
    return store.treasury.balance;
  }

  public static getMaxWithdrawLimit(): number {
    return store.treasury.maxWithdrawLimit;
  }

  public static getTransactions(filter?: {
    type?: TransactionType;
    category?: string;
    executorId?: string;
  }): ITreasuryTransaction[] {
    let result = [...store.transactions];
    if (filter) {
      if (filter.type) result = result.filter(t => t.type === filter.type);
      if (filter.category) result = result.filter(t => t.category.toLowerCase() === filter.category!.toLowerCase());
      if (filter.executorId) result = result.filter(t => t.executorId === filter.executorId);
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Atomik Kasa İşlemi
   */
  public static executeTransaction(params: {
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    executorId: string;
    executorName: string;
  }): { success: boolean; transaction?: ITreasuryTransaction; message: string; newBalance?: number } {
    if (this.isLocked) {
      return { success: false, message: 'Kasa üzerinde şu anda başka bir işlem yürütülüyor. Lütfen birkaç saniye sonra tekrar deneyin.' };
    }

    if (isNaN(params.amount) || params.amount <= 0) {
      return { success: false, message: 'İşlem tutarı 0\'dan büyük geçerli bir sayı olmalıdır!' };
    }

    this.isLocked = true;
    try {
      const currentBalance = store.treasury.balance;
      const isDeduction = params.type === 'Para Çekme' || params.type === 'Gider';

      if (isDeduction) {
        if (params.amount > currentBalance) {
          return {
            success: false,
            message: `Yetersiz Bakiye! Kasada mevcut: $${currentBalance.toLocaleString('tr-TR')}, talep edilen: $${params.amount.toLocaleString('tr-TR')}`
          };
        }

        if (params.amount > store.treasury.maxWithdrawLimit) {
          return {
            success: false,
            message: `İşlem Limiti Aşıldı! Tek seferde en fazla $${store.treasury.maxWithdrawLimit.toLocaleString('tr-TR')} çekilebilir.`
          };
        }
      }

      const balanceAfter = isDeduction ? currentBalance - params.amount : currentBalance + params.amount;

      // Atomik Güncelleme
      store.treasury.balance = balanceAfter;
      store.treasury.updatedAt = new Date();

      const transactionNumber = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const tx: ITreasuryTransaction = {
        id: `tx-${Date.now()}`,
        transactionNumber,
        type: params.type,
        amount: params.amount,
        category: params.category,
        description: params.description,
        balanceBefore: currentBalance,
        balanceAfter,
        executorId: params.executorId,
        executorName: params.executorName,
        createdAt: new Date()
      };

      store.transactions.unshift(tx);

      store.addAuditLog({
        category: 'Kasa',
        actionType: params.type.toUpperCase().replace(/\s/g, '_'),
        executorId: params.executorId,
        executorName: params.executorName,
        target: `Birlik Kasası [${transactionNumber}]`,
        oldValue: `$${currentBalance.toLocaleString('tr-TR')}`,
        newValue: `$${balanceAfter.toLocaleString('tr-TR')}`,
        description: `${params.category}: $${params.amount.toLocaleString('tr-TR')} (${params.description})`
      });

      return {
        success: true,
        transaction: tx,
        newBalance: balanceAfter,
        message: `İşlem Başarılı! [${transactionNumber}] Yeni Kasa Bakiyesi: $${balanceAfter.toLocaleString('tr-TR')}`
      };
    } finally {
      this.isLocked = false;
    }
  }
}
