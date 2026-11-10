/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - GİRDİ DOĞRULAMA (ZOD)
 */
import { z } from 'zod';

export const ApplicationFormSchema = z.object({
  oocName: z.string().min(2, 'OOC İsim en az 2 karakter olmalıdır.').max(32),
  age: z.number().min(14, 'Yaş en az 14 olmalıdır.').max(65),
  mtaCharacterName: z
    .string()
    .min(3, 'MTA Karakter adı en az 3 karakter olmalıdır.')
    .regex(/^[A-Za-z]+_[A-Za-z]+$/, 'MTA Karakter adı İsim_Soyisim (örn: John_Doe) formatında olmalıdır.'),
  characterBackstory: z.string().min(15, 'Karakter geçmişi en az 15 karakter olmalıdır.'),
  roleplayExperience: z.string().min(5, 'Roleplay deneyimi belirtilmelidir.'),
  joinReason: z.string().min(10, 'Birliğe katılma amacı en az 10 karakter olmalıdır.')
});

export const EconomyTransactionSchema = z.object({
  amount: z.number().positive('Tutar 0\'dan büyük pozitif bir sayı olmalıdır.'),
  category: z.string().min(2, 'Kategori en az 2 karakter olmalıdır.'),
  description: z.string().min(3, 'İşlem açıklaması en az 3 karakter olmalıdır.')
});

export const PunishmentSchemaValidation = z.object({
  reason: z.string().min(5, 'Ceza gerekçesi en az 5 karakter olmalıdır.'),
  type: z.enum(['Uyarı', 'İhtar', 'Yetki Kısıtlaması', 'Geçici Uzaklaştırma', 'Birlikten Çıkarma'])
});

export const TicketCreateSchema = z.object({
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır.'),
  initialMessage: z.string().min(5, 'İlk mesaj en az 5 karakter olmalıdır.')
});
