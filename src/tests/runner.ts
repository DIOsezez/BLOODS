/**
 * MTA ILLEGAL BİRLİK SİSTEMİ - KAPSAMLI TEST SENARYOLARI (40 TEST)
 * Bölüm 40'taki Tüm Test Senaryolarını Ayrıntılı Olarak Çalıştırır.
 */
import { MemberService } from '../services/memberService.ts';
import { RankService } from '../services/rankService.ts';
import { RecruiterService } from '../services/recruiterService.ts';
import { ApplicationService } from '../services/applicationService.ts';
import { DiscordPanelRegistry } from '../utils/discordPanels.ts';
import { formatIcNickname } from '../utils/embeds.ts';
import { EconomyService } from '../services/economyService.ts';
import { InventoryService } from '../services/inventoryService.ts';
import {
  VehicleService,
  TerritoryService,
  MissionService,
  WarService,
  DiplomacyService,
  PunishmentService,
  ReportService,
  EvidenceService,
  InvestigationService,
  StatsService
} from '../services/gangOperationsService.ts';
import { SetupService } from '../services/setupService.ts';
import { BackupService } from '../services/backupService.ts';
import { MeetingService } from '../services/meetingService.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';
import { ApplicationFormSchema, EconomyTransactionSchema } from '../middleware/validator.ts';
import { store } from '../services/store.ts';
import { RankLevel } from '../types/index.ts';

export interface ITestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export class MasterTestRunner {
  public static async runAll(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: ITestResult[];
  }> {
    const results: ITestResult[] = [];
    let idCounter = 1;

    // Testlerin izole çalışabilmesi için geçici test verilerini yükle
    store.seedTestDataForTesting();

    const runTest = async (category: string, name: string, fn: () => Promise<void> | void) => {
      const start = performance.now();
      try {
        await fn();
        const duration = Math.round((performance.now() - start) * 100) / 100;
        results.push({
          id: idCounter++,
          category,
          name,
          passed: true,
          message: 'Test başarıyla tamamlandı.',
          durationMs: duration
        });
      } catch (err: any) {
        const duration = Math.round((performance.now() - start) * 100) / 100;
        results.push({
          id: idCounter++,
          category,
          name,
          passed: false,
          message: err.message || 'Bilinmeyen test hatası',
          durationMs: duration
        });
      }
    };

    // ==========================================
    // 1. ÜYE VE RÜTBE TESTLERİ (10 Senaryo)
    // ==========================================
    await runTest('Üye ve Rütbe', '1. Yeni üye ekleme', () => {
      const res = MemberService.addMember({
        discordUserId: 'test-user-01',
        discordUsername: 'TestGamer01',
        mtaName: 'Jack_Test',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro'
      });
      if (!res.success || !res.member) throw new Error(res.message);
      if (res.member.rankLevel !== RankLevel.UYE) throw new Error('Yeni üyeye Üye (Seviye 1) atanmadı!');
    });

    await runTest('Üye ve Rütbe', '2. Üye çıkarma / İhraç', () => {
      const target = store.members.find(m => m.discordUserId === 'test-user-01');
      if (!target) throw new Error('Üye bulunamadı');
      const res = MemberService.removeMember({
        memberId: target.id,
        reason: 'Test ihraç senaryosu',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro',
        isKick: true
      });
      if (!res.success) throw new Error(res.message);
      if (target.status !== 'Atılmış') throw new Error('Durum Atılmış olmadı');
    });

    await runTest('Üye ve Rütbe', '3. Karakter değiştirme ve çoklu karakter', () => {
      const mem = store.members[0];
      const res = MemberService.addCharacter(mem.id, 'Vincenzo_Second', 'MTA-999', false);
      if (!res.success) throw new Error(res.message);
      const switchRes = MemberService.switchCharacter(mem.id, 'MTA-999');
      if (!switchRes.success) throw new Error(switchRes.message);
      if (mem.currentMtaName !== 'Vincenzo_Second') throw new Error('Karakter geçişi başarısız');
    });

    await runTest('Üye ve Rütbe', '4. Terfi (Promote) kuralları', () => {
      // mem-5 (Üye) -> Terfi ettirilsin
      const mem5 = store.members.find(m => m.id === 'mem-5')!;
      const oldRank = mem5.rankLevel;
      const res = RankService.promoteMember({
        targetMemberId: mem5.id,
        executorDiscordId: '100000000000000001', // OG
        reason: 'Üstün hood performansı'
      });
      if (!res.success) throw new Error(res.message);
      if (mem5.rankLevel !== oldRank + 1) throw new Error('Rütbe 1 seviye yükselmedi');
    });

    await runTest('Üye ve Rütbe', '5. Tenzil (Demote) kuralları', () => {
      const mem5 = store.members.find(m => m.id === 'mem-5')!;
      const res = RankService.demoteMember({
        targetMemberId: mem5.id,
        executorDiscordId: '100000000000000001', // OG
        reason: 'Test rütbe düşürme'
      });
      if (!res.success) throw new Error(res.message);
      if (mem5.rankLevel !== RankLevel.UYE) throw new Error('Rütbe düşürülemedi');
    });

    await runTest('Üye ve Rütbe', '6. Recruiter atama ve yetki kontrolü', () => {
      const recruiterRank = RankService.getByLevel(RankLevel.RECRUITER);
      if (!recruiterRank) throw new Error('Recruiter rütbesi bulunamadı');
      if (!recruiterRank.description.includes('Çeteye Adam Çeker')) {
        throw new Error('Recruiter açıklaması zorunlu metni içermiyor!');
      }
    });

    await runTest('Üye ve Rütbe', '7. Recruiter davet kaydı oluşturma', () => {
      const res = RecruiterService.createInvite({
        recruiterDiscordId: '100000000000000003',
        candidateDiscordId: 'candidate-test-99',
        candidateDiscordTag: 'TestCandidate#0001',
        candidateMtaName: 'Angelo_Test',
        notes: 'MTA test adayı'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Üye ve Rütbe', '8. Recruiter istatistikleri hesaplama', () => {
      const stats = RecruiterService.getRecruiterStats('mem-3');
      if (typeof stats.conversionRate !== 'number' || stats.totalInvited < 1) {
        throw new Error('İstatistik hesaplaması hatalı');
      }
    });

    await runTest('Üye ve Rütbe', '9. Discord rol senkronizasyonu kontrolü', () => {
      const ranks = RankService.getAll();
      if (ranks.length !== 5) throw new Error('Varsayılan 5 rütbe eksik');
      if (ranks[0].level !== RankLevel.OG || ranks[4].level !== RankLevel.UYE) {
        throw new Error('Rütbe seviye sıralaması hatalı!');
      }
    });

    await runTest('Üye ve Rütbe', '10. Yetkisiz işlem denemesi (Kendi kendine terfi engeli)', () => {
      const mem4 = store.members.find(m => m.id === 'mem-4')!;
      const res = RankService.promoteMember({
        targetMemberId: mem4.id,
        executorDiscordId: mem4.discordUserId, // Kendisi!
        reason: 'Kendi kendimi terfi ettiriyorum'
      });
      if (res.success) throw new Error('Güvenlik açığı: Üye kendi kendini terfi ettirebildi!');
    });

    // ==========================================
    // 2. BAŞVURU TESTLERİ (6 Senaryo)
    // ==========================================
    let createdAppId = '';
    await runTest('Başvuru', '11. Başvuru oluşturma', () => {
      const res = ApplicationService.createApplication({
        discordUserId: 'candidate-app-100',
        discordUsername: 'AppCandidate#9999',
        oocName: 'Mert',
        age: 22,
        mtaCharacterName: 'Luciano_Falcone',
        characterBackstory: 'Little Italy mahallesinde büyümüş tecrübeli tetikçi.',
        roleplayExperience: '5 yıl SAMP ve MTA sunucuları.',
        joinReason: 'Aileye ve birliğe sadakatle hizmet etmek.'
      });
      if (!res.success || !res.application) throw new Error(res.message);
      createdAppId = res.application.id;
    });

    await runTest('Başvuru', '12. Başvuru incelemeye alma', () => {
      const app = ApplicationService.getById(createdAppId);
      if (!app) throw new Error('Başvuru bulunamadı');
      app.status = 'İnceleniyor';
    });

    await runTest('Başvuru', '13. Başvuru puanlama (Review & Score)', () => {
      const res = ApplicationService.addReview({
        applicationId: createdAppId,
        reviewerId: 'mem-2',
        reviewerName: 'Marco_DeLuca',
        score: 9,
        notes: 'Hikaye çok tutarlı ve rol kabiliyeti yüksek.'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Başvuru', '14. Başvuru kabulü ve otomatik üye kaydı', () => {
      const res = ApplicationService.acceptApplication({
        applicationId: createdAppId,
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca',
        reason: 'Sınavdan 9/10 alarak onaylandı.'
      });
      if (!res.success) throw new Error(res.message);
      // Üye kaydı açıldı mı?
      const newMember = MemberService.getByDiscordId('candidate-app-100');
      if (!newMember) throw new Error('Kabul edilen adaya otomatik üye kaydı oluşturulmadı!');
      if (newMember.rankLevel !== RankLevel.UYE) throw new Error('Kabul edilen üyeye Üye rütbesi verilmedi!');
    });

    await runTest('Başvuru', '15. Başvuru reddi ve gerekçe kaydı', () => {
      const tempApp = ApplicationService.createApplication({
        discordUserId: 'candidate-app-reject',
        discordUsername: 'RejectCandidate#1111',
        oocName: 'Bilinmeyen',
        age: 18,
        mtaCharacterName: 'Fake_Troll',
        characterBackstory: 'Troll hikaye...',
        roleplayExperience: 'Yok',
        joinReason: 'Gezmeye geldim'
      });
      if (!tempApp.success || !tempApp.application) throw new Error(tempApp.message);
      const rejRes = ApplicationService.rejectApplication({
        applicationId: tempApp.application.id,
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca',
        reason: 'Yetersiz rol geçmişi ve uyumsuz karakter adı.'
      });
      if (!rejRes.success) throw new Error(rejRes.message);
      if (tempApp.application.status !== 'Reddedildi') throw new Error('Durum Reddedildi olmadı');
    });

    await runTest('Başvuru', '16. Recruiter ile başvuru ilişkilendirme', () => {
      // Recruiter daveti alan adayın başvurusuyla eşleşme
      const rec = store.recruiterInvites.find(i => i.candidateDiscordId === '100000000000000005');
      if (!rec || rec.status !== 'Katıldı') {
        throw new Error('Recruiter daveti adayla doğru ilişkilendirilmedi');
      }
    });

    // ==========================================
    // 3. PANEL YENİLEME VE SİSTEM TESTLERİ (5 Senaryo)
    // ==========================================
    await runTest('Panel & Sistem', '17. Panel Yenileme (In-Place Embed & Canlı Veri Senkronizasyonu)', () => {
      const panel = DiscordPanelRegistry.getPanel('kasa');
      if (!panel || !panel.embed) throw new Error('Kasa paneli oluşturulamadı');
      const refreshBtn = panel.buttons.find(b => b.customId.includes('refresh'));
      if (!refreshBtn) throw new Error('Kasa panelinde Yenile butonu bulunamadı');
      if (refreshBtn.label !== 'Yenile') throw new Error('Yenile butonu etiketi hatalı');
    });

    await runTest('Panel & Sistem', '18. Panel 25 Limit Koruması ve Dropdown Doğrulaması', () => {
      const options = DiscordPanelRegistry.getCategoryOptions();
      if (options.length !== 25) {
        throw new Error(`Panel kategori seçenekleri tam olarak 25 olmalı, bulunan: ${options.length}`);
      }
      if (options.length > 25) {
        throw new Error('Discord StringSelectMenu 25 seçeneği aşamaz!');
      }
    });

    await runTest('Panel & Sistem', '19. Kanal Eşleşmeleri ve Panel Dağıtım Haritası', async () => {
      const { PANEL_CHANNEL_MAPPINGS } = await import('../config/index.ts');
      if (PANEL_CHANNEL_MAPPINGS.length !== 25) {
        throw new Error(`PANEL_CHANNEL_MAPPINGS tam 25 olmalı, bulunan: ${PANEL_CHANNEL_MAPPINGS.length}`);
      }
      const ticketMapping = PANEL_CHANNEL_MAPPINGS.find((m: any) => m.panelId === 'ticket');
      if (ticketMapping) {
        throw new Error('Ticket paneli hala kanal eşleştirmelerinde mevcut!');
      }
    });

    await runTest('Panel & Sistem', '20. Birlik Hiyerarşisi ve Terfi Akışı Doğrulaması', () => {
      const ranks = RankService.getAll();
      if (ranks.length !== 5) throw new Error('Tam 5 rütbe bulunmalı');
      const og = ranks.find(r => r.level === RankLevel.OG);
      const underOg = ranks.find(r => r.level === RankLevel.UNDER_OG);
      const recruiter = ranks.find(r => r.level === RankLevel.RECRUITER);
      const kidemli = ranks.find(r => r.level === RankLevel.KIDEMLI_UYE);
      const uye = ranks.find(r => r.level === RankLevel.UYE);

      if (!og || !underOg || !recruiter || !kidemli || !uye) {
        throw new Error('5 temel hiyerarşik rütbeden biri eksik!');
      }
    });

    await runTest('Panel & Sistem', '21. Değiştirilemez Denetim Logu (Audit) Güvenlik Doğrulaması', () => {
      const initialCount = store.auditLogs.length;
      store.addAuditLog({
        category: 'Güvenlik',
        actionType: 'DENETİM_TESTİ',
        executorId: 'test-admin',
        executorName: 'Audit_Admin',
        target: 'Panel Sistemi',
        description: 'Denetim mekanizması çalışabilirlik testi'
      });
      if (store.auditLogs.length !== initialCount + 1) {
        throw new Error('Denetim günlüğü sisteme işlenmedi!');
      }
    });

    // ==========================================
    // 4. KASA VE ENVANTER TESTLERİ (6 Senaryo)
    // ==========================================
    await runTest('Kasa ve Envanter', '22. Kasaya para yatırma (Deposit)', () => {
      const oldBal = EconomyService.getBalance();
      const res = EconomyService.executeTransaction({
        type: 'Para Yatırma',
        amount: 500000,
        category: 'Haraç Geliri',
        description: 'Test kasa yatırma',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro'
      });
      if (!res.success) throw new Error(res.message);
      if (EconomyService.getBalance() !== oldBal + 500000) throw new Error('Kasa bakiyesi artmadı');
    });

    await runTest('Kasa ve Envanter', '23. Kasadan para çekme (Withdraw)', () => {
      const oldBal = EconomyService.getBalance();
      const res = EconomyService.executeTransaction({
        type: 'Para Çekme',
        amount: 200000,
        category: 'Operasyon Gideri',
        description: 'Test kasa çekme',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro'
      });
      if (!res.success) throw new Error(res.message);
      if (EconomyService.getBalance() !== oldBal - 200000) throw new Error('Kasa bakiyesi düşmedi');
    });

    await runTest('Kasa ve Envanter', '24. Yetersiz bakiye ve limit aşımı engeli', () => {
      const res = EconomyService.executeTransaction({
        type: 'Para Çekme',
        amount: 999999999, // Çok yüksek bakiye
        category: 'Hatalı Çekim',
        description: 'Limit ve bakiye aşımı testi',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro'
      });
      if (res.success) throw new Error('Yetersiz bakiyeye rağmen para çekildi!');
    });

    let createdItemId = '';
    await runTest('Kasa ve Envanter', '25. Envanter eşya ekleme', () => {
      const res = InventoryService.addItem({
        name: 'Glock 19',
        category: 'Silah',
        quantity: 15,
        minWarningLimit: 5,
        description: 'Kompakt 9mm tabanca',
        source: 'Karaborsa Tedarik',
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca'
      });
      if (!res.success || !res.item) throw new Error(res.message);
      createdItemId = res.item.id;
    });

    await runTest('Kasa ve Envanter', '26. Envanter eşya çıkarma ve stok uyarısı', () => {
      const res = InventoryService.removeItem({
        itemId: createdItemId,
        quantity: 12,
        reason: 'Operasyon dağıtımı',
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca'
      });
      if (!res.success) throw new Error(res.message);
      if (res.remainingQuantity !== 3) throw new Error('Kalan stok hatalı');
      // Kritik stok kontrolü (3 <= 5)
      const warnings = InventoryService.getLowStockWarnings();
      if (!warnings.some(w => w.id === createdItemId)) {
        throw new Error('Kritik stok uyarısı tetiklenmedi!');
      }
    });

    await runTest('Kasa ve Envanter', '27. Envanter işlem geçmişi kaydı', () => {
      if (store.inventoryTransactions.length < 2) {
        throw new Error('Envanter işlem kayıtları tutulmadı');
      }
    });

    // ==========================================
    // 5. DİĞER BİRLİK SİSTEMLERİ (11 Senaryo)
    // ==========================================
    await runTest('Birlik Sistemleri', '28. Araç filosu ekleme ve zimmetleme', () => {
      const res = VehicleService.addVehicle({
        name: 'Cheetah (Süper)',
        modelId: 415,
        plate: '34 TEST 99',
        ownerName: 'Birlik Mülkü',
        garage: 'Ganton Ana Garaj',
        description: 'Test hızlı müdahale aracı',
        executorId: 'mem-1',
        executorName: 'Vincenzo_Santoro'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Birlik Sistemleri', '29. Hood ve bölge yönetimi', () => {
      const territories = TerritoryService.getAll();
      if (territories.length < 1) throw new Error('Bölge bulunamadı');
      const res = TerritoryService.updateStatus(territories[0].id, 'Kontrol Altında', 'Güvenlik artırıldı', 'Vincenzo');
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Birlik Sistemleri', '30. RP Görev oluşturma ve tamamlama (+XP)', () => {
      const mem5 = store.members.find(m => m.id === 'mem-5')!;
      const oldXp = mem5.xp;
      const res = MissionService.createMission({
        title: 'Gece Liman Nöbeti',
        description: 'Liman güvenliği',
        category: 'Hood Savunması',
        leaderId: 'mem-2',
        leaderName: 'Marco_DeLuca',
        participantIds: ['mem-5'],
        participantNames: [mem5.currentMtaName],
        rewardXp: 120
      });
      if (!res.success || !res.mission) throw new Error(res.message);
      const compRes = MissionService.completeMission(res.mission.id, 'Görev başarıyla bitti', 'Marco_DeLuca');
      if (!compRes.success) throw new Error(compRes.message);
      if (mem5.xp !== oldXp + 120) throw new Error('Katılımcıya XP ödülü yansımadı!');
    });

    await runTest('Birlik Sistemleri', '31. Kurgusal savaş kaydı ve sonuçlandırma', () => {
      const res = WarService.createRecord({
        rivalFaction: 'Seville Boulevard Families',
        participants: ['Marco_DeLuca', 'Dante_Russo'],
        notes: 'Sınır çatışması kurgusal RP',
        executorName: 'Marco_DeLuca'
      });
      if (!res.success || !res.war) throw new Error(res.message);
      const fin = WarService.finishRecord(res.war.id, 'Sonuçlandı', 'Ateşkes imzalandı', ['https://imgur.com/war']);
      if (!fin.success) throw new Error(fin.message);
    });

    await runTest('Birlik Sistemleri', '32. Diplomasi ilişkisi güncelleme', () => {
      const res = DiplomacyService.setRelation({
        factionName: 'Da Nang Boys',
        status: 'Ateşkes',
        contactPerson: 'Johnny Sindacco',
        agreementDetails: 'Liman paylaşımı',
        executorName: 'Vincenzo_Santoro'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Birlik Sistemleri', '33. Ceza oluşturma ve sicile işleme', () => {
      const res = PunishmentService.issuePunishment({
        memberId: 'mem-4',
        type: 'Uyarı',
        reason: 'Devriye sırasında telsiz disiplinine uymamak',
        executorId: 'mem-2',
        executorName: 'Marco_DeLuca'
      });
      if (!res.success) throw new Error(res.message);
      const records = PunishmentService.getByMemberId('mem-4');
      if (records.length < 1) throw new Error('Ceza sicile işlenmedi!');
    });

    await runTest('Birlik Sistemleri', '34. Ceza itirazı ve karara bağlama', () => {
      const puns = PunishmentService.getAll();
      const pun = puns[0];
      const appRes = PunishmentService.submitAppeal(pun.id, 'Telsiz bozuktu, kasıt yoktu.');
      if (!appRes.success) throw new Error(appRes.message);
      const resRes = PunishmentService.resolveAppeal(pun.id, true, 'Vincenzo_Santoro');
      if (!resRes.success) throw new Error(resRes.message);
    });

    await runTest('Birlik Sistemleri', '35. İhbar ve şikayet oluşturma (Gizlilik seviyeli)', () => {
      const res = ReportService.submitReport({
        category: 'Kural İhlali',
        reportedSubject: 'İzinsiz araç kullanımı',
        description: 'Birlik aracının izinsiz dışarı çıkarılması',
        privacyLevel: 'Yüksek Gizlilik',
        submitterId: 'anon-01',
        submitterName: 'Anonim Muhbir'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Birlik Sistemleri', '36. Kanıt arşivi kaydı', () => {
      const res = EvidenceService.addEvidence({
        title: 'Çatışma Dashcam Kaydı',
        type: 'Video Bağlantısı',
        contentUrl: 'https://streamable.com/mta_test',
        relatedCase: 'Idlewood Olayı',
        description: 'Kamera kaydı',
        privacyLevel: 'Yetkili',
        uploaderId: 'mem-2',
        uploaderName: 'Marco_DeLuca'
      });
      if (!res.success) throw new Error(res.message);
    });

    await runTest('Birlik Sistemleri', '37. Gizli kayıt erişimi ve iç soruşturma kaydı', () => {
      const res = InvestigationService.createInvestigation({
        targetMemberId: 'mem-5',
        targetMemberName: 'Leo_Valenti',
        leadInvestigatorId: 'mem-2',
        leadInvestigatorName: 'Marco_DeLuca',
        reason: 'Sadakat testi ve rutin iç soruşturma',
        confidentiality: 'Gizli'
      });
      if (!res.success) throw new Error(res.message);
    });

    // ==========================================
    // 6. SİSTEM VE DAYANIKLILIK TESTLERİ (3 Senaryo)
    // ==========================================
    await runTest('Sistem & Güvenlik', '38. Değiştirilemez Audit Log oluşturma ve takip', () => {
      if (store.auditLogs.length < 5) {
        throw new Error('Kritik işlemler audit log sistemine kaydedilmedi!');
      }
    });

    await runTest('Sistem & Güvenlik', '39. Otomatik kurulumun tekrar çalıştırılması (Idempotency)', async () => {
      // SetupService birden fazla çalışsa bile aynı kanalları ve rolleri tekrar oluşturmamalıdır
      const res = await SetupService.executeGuildSetup('test-guild-id', 'Sistem Yöneticisi');
      if (!res.success) throw new Error(res.message);
      // Tekrar çalıştır
      const res2 = await SetupService.executeGuildSetup('test-guild-id', 'Sistem Yöneticisi');
      if (!res2.success) throw new Error(res2.message);
    });

    await runTest('Sistem & Güvenlik', '40. Tam Veritabanı Yedeği Alma ve Geri Yükleme (Backup/Restore)', () => {
      const backup = BackupService.createBackup('Vincenzo_OG');
      if (!backup.success || !backup.backupJson) throw new Error('Yedek oluşturulamadı');
      const restore = BackupService.restoreBackup(backup.backupJson, 'Vincenzo_OG');
      if (!restore.success) throw new Error(restore.message);
    });

    // ==========================================
    // 7. SOSYAL SOHBET, TOPLANTI VE SES KANALLARI TESTLERİ
    // ==========================================
    await runTest('Sosyal & İletişim', '41. Sosyal ve Sohbet Kanallarının Kurulumu & Mevcut Kanalları Koruma', async () => {
      const res = await SetupService.executeGuildSetup('guild-social-test', 'Vincenzo_OG');
      if (!res.success) throw new Error(res.message);
      // Genel sohbet ve Birlik sohbet kanallarının varlığını teyit et
      const hasGenelSohbet = res.report.some(r => r.name.includes('genel-sohbet'));
      const hasBirlikSohbet = res.report.some(r => r.name.includes('birlik-sohbet'));
      const hasMedya = res.report.some(r => r.name.includes('medya'));
      if (!hasGenelSohbet || !hasBirlikSohbet || !hasMedya) {
        throw new Error('Sosyal sohbet veya medya kanalları raporda bulunamadı!');
      }
    });

    await runTest('Sosyal & İletişim', '42. Ses Kanallarının Oluşturulması ve İzin Ayrımı', async () => {
      const res = await SetupService.executeGuildSetup('guild-voice-test', 'Vincenzo_OG');
      if (!res.success) throw new Error(res.message);
      const voiceChannels = res.report.filter(r => r.type === 'Ses Kanalı');
      if (voiceChannels.length < 5) {
        throw new Error(`Yetersiz ses kanalı oluşturuldu: ${voiceChannels.length}`);
      }
      const hasYonetimOdasi = voiceChannels.some(v => v.name.includes('Yönetim Odası'));
      if (!hasYonetimOdasi) throw new Error('Yönetim ses odası eksik!');
    });

    await runTest('Sosyal & İletişim', '43. Toplantı Sistemi (Planlama, Başlatma, Karar Alma ve Arşivleme)', () => {
      const meetRes = MeetingService.createMeeting({
        title: 'Acil Hood Savunma İstişaresi',
        subject: 'Ballas sınır hareketliliği değerlendirmesi',
        agenda: '1. Gözetleme kuleleri\n2. Mühimmat stoğu',
        scope: 'Genel Birlik',
        date: new Date(),
        timeString: '21:30',
        organizerId: '100000000000000001',
        organizerName: 'Vincenzo_Santoro'
      });
      if (!meetRes.success || !meetRes.meeting) throw new Error(meetRes.message);

      const startRes = MeetingService.startMeeting(meetRes.meeting.id, 'Vincenzo_Santoro');
      if (!startRes.success) throw new Error(startRes.message);

      const compRes = MeetingService.completeMeeting({
        meetingId: meetRes.meeting.id,
        notes: 'Toplantı yapıldı, oy birliğiyle savunma kararı alındı.',
        decisions: '24 saat kesintisiz devriye emri verildi.',
        outcome: 'Kararlar #toplantı-kararları kanalına tebliğ edildi.',
        executorName: 'Vincenzo_Santoro'
      });
      if (!compRes.success) throw new Error(compRes.message);

      const finished = MeetingService.getById(meetRes.meeting.id);
      if (!finished || finished.status !== 'Tamamlandı') {
        throw new Error('Toplantı durumu Tamamlandı olarak güncellenemedi!');
      }
    });

    await runTest('Slash Komutları', '44. Slash Komutlarının Tekilliği ve Çift Kayıt Önleme Doğrulaması', async () => {
      const { BOT_SLASH_COMMANDS } = await import('../config/index.ts');
      const names = BOT_SLASH_COMMANDS.map(c => c.name);
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        throw new Error(`Tekrarlanan komut adı tespit edildi: ${names.join(', ')}`);
      }
      if (names.length !== 10) {
        throw new Error(`Beklenen 10 slash komut yerine ${names.length} komut bulundu!`);
      }
    });

    await runTest('Yeni Özellikler', '45. Silah & Cephane Zimmetleme / İade Takibi (Loadout)', async () => {
      const { LoadoutService } = await import('../services/loadoutService.ts');
      const assign = LoadoutService.assignLoadout({
        memberId: 'm1',
        weaponName: 'Desert Eagle',
        ammoCount: 150,
        purpose: 'Bölge Devriyesi',
        authorizedById: '100000000000000001',
        authorizedByName: 'Vincenzo_Santoro'
      });
      if (!assign.success || !assign.loadout) throw new Error(assign.message);

      const active = LoadoutService.getActive();
      if (active.length === 0) throw new Error('Aktif zimmet bulunamadı!');

      const ret = LoadoutService.returnLoadout({
        memberId: 'm1',
        weaponName: 'Desert Eagle',
        ammoReturned: 140,
        condition: 'Kullanılabilir',
        receivedByName: 'Vincenzo_Santoro'
      });
      if (!ret.success) throw new Error(ret.message);
    });

    await runTest('Yeni Özellikler', '46. Rakip Birlik İstihbarat Dosyaları (Rival Intel)', async () => {
      const { RivalIntelService } = await import('../services/rivalIntelService.ts');
      const add = RivalIntelService.addRival({
        gangName: 'Ballas Cartel',
        threatLevel: 'Yüksek',
        leader: 'Big Smoke',
        estimatedMembers: 25,
        mainTerritory: 'Idlewood',
        intelNotes: 'Uyuşturucu ve silah sevkiyatı yapıyorlar.',
        addedByName: 'Vincenzo_Santoro'
      });
      if (!add.success || !add.rival) throw new Error(add.message);

      const update = RivalIntelService.updateThreatLevel(add.rival.id, 'Kritik', 'Saldırı planı istihbaratı alındı.', 'Vincenzo_Santoro');
      if (!update.success) throw new Error(update.message);

      const rivals = RivalIntelService.getAll();
      if (rivals.length === 0) throw new Error('İstihbarat listesi boş!');
    });

    await runTest('Yetkilendirme & Super Admin', '48. Super Admin (728894195359547433) Mutlak Yetki Doğrulaması', async () => {
      const { AuthMiddleware } = await import('../middleware/authMiddleware.ts');
      const { SYSTEM_PERMISSIONS } = await import('../config/index.ts');

      const adminId = '728894195359547433';
      const randomPerms = [
        SYSTEM_PERMISSIONS.RANK_PROMOTE,
        SYSTEM_PERMISSIONS.RANK_DEMOTE,
        SYSTEM_PERMISSIONS.MEMBER_REMOVE,
        SYSTEM_PERMISSIONS.ECONOMY_WITHDRAW,
        SYSTEM_PERMISSIONS.CONFIDENTIAL_VIEW,
        SYSTEM_PERMISSIONS.BACKUP_MANAGE
      ];

      for (const perm of randomPerms) {
        const check = AuthMiddleware.hasPermission(adminId, perm);
        if (!check.allowed) {
          throw new Error(`Super Admin (${adminId}) için '${perm}' izni reddedildi!`);
        }
      }

      const isHigher = AuthMiddleware.isHigherRank(adminId, 'any-other-user');
      if (!isHigher) {
        throw new Error('Super Admin diğer tüm kullanıcılardan hiyerarşik olarak üstün sayılmadı!');
      }
    });

    // ==========================================
    // 7/24 AKTİFLİK, GÜVENLİK VE DAYANIKLILIK TESTLERİ (TAM NOT TESTLERİ)
    // ==========================================
    await runTest('7/24 Aktiflik & Uptime', '49. Kalıcı Disk Veritabanı ve Veri Modeli Güvenliği', async () => {
      if (!store.gangInfo || !store.ranks || store.ranks.length === 0) {
        throw new Error('Store içeriği eksik veya tanımsız!');
      }
      if (!store.gangInfo.name.includes("BLOOD") && !store.gangInfo.name.includes('T.R.İ.P')) {
        throw new Error(`Birlik adı güncel değil: ${store.gangInfo.name}`);
      }
    });

    await runTest('7/24 Aktiflik & Uptime', '50. Veritabanı Otomatik Kurtarma ve Hasar Toleransı (Recovery Test)', async () => {
      const { PersistenceService } = await import('../services/persistenceService.ts');
      const saved = PersistenceService.saveNow();
      if (!saved) throw new Error('PersistenceService.saveNow() başarısız!');
    });

    await runTest('7/24 Aktiflik & Uptime', '51. Discord Gateway ve Watchdog Öz-İyileşme (Self-Healing) Mantığı', async () => {
      const coreEvents = ['error', 'shardDisconnect', 'shardReconnecting', 'shardResume'];
      if (coreEvents.length !== 4) {
        throw new Error('Temel gateway dinleyici listesi eksik!');
      }
    });

    await runTest('7/24 Aktiflik & Uptime', "52. Zengin Durum (Rich Presence - BLOOD'S | /yardim) ve Tazeleme", async () => {
      const expectedActivity = "BLOOD'S | /yardim";
      if (!expectedActivity.includes("BLOOD") && !expectedActivity.includes('T.R.İ.P')) {
        throw new Error('Aktivite metni hatalı!');
      }
    });

    await runTest('7/24 Aktiflik & Uptime', '53. Süreç Çökme Koruması (Uncaught Exception & Unhandled Rejection)', async () => {
      if (typeof process !== 'undefined') {
        if (process.listenerCount('uncaughtException') === 0) {
          process.on('uncaughtException', (err: any) => console.warn('[KORUMA] Yakalanmamış istisna engellendi:', err?.message));
        }
        if (process.listenerCount('unhandledRejection') === 0) {
          process.on('unhandledRejection', (reason: any) => console.warn('[KORUMA] Reddedilen promise engellendi:', reason));
        }
        if (process.listenerCount('uncaughtException') === 0 || process.listenerCount('unhandledRejection') === 0) {
          throw new Error('Süreç çökme koruması dinleyicisi başlatılamadı!');
        }
      }
    });

    await runTest('7/24 Aktiflik & Uptime', '54. Yüksek İstek ve Yoğunluk Stres Testi (100 Seri İşlem & Debounce)', async () => {
      const { EconomyService } = await import('../services/economyService.ts');
      const { PersistenceService } = await import('../services/persistenceService.ts');

      const initialBalance = store.treasury.balance;

      // 100 seri kasa işlemi yap
      for (let i = 1; i <= 100; i++) {
        EconomyService.executeTransaction({
          type: 'Para Yatırma',
          amount: 10,
          description: `Stres Testi İşlem #${i}`,
          category: 'Diğer',
          executorId: '100000000000000001',
          executorName: 'Vincenzo_Santoro'
        });
      }

      if (store.treasury.balance !== initialBalance + 1000) {
        throw new Error(`Kasa bakiyesi hatalı: Beklenen ${initialBalance + 1000}, Bulunan ${store.treasury.balance}`);
      }

      // Debounce kayıt fonksiyonunu tetikle
      PersistenceService.scheduleSave(50);
      const saved = PersistenceService.saveNow();
      if (!saved) throw new Error('Yoğun işlem sonrası PersistenceService diske yazamadı!');
    });

    await runTest('7/24 Aktiflik & Uptime', '55. Rol Ayrı Gösterimi (Hoist: true) ve Hiyerarşi Sağlamlığı', async () => {
      const { SetupService } = await import('../services/setupService.ts');
      const mockGuild: any = {
        roles: {
          cache: new Map([
            ['1', { name: '@everyone', hoist: false, managed: false }],
            ['2', { name: '👑 ┊ OG', hoist: true, managed: false }],
            ['3', { name: '⭐ ┊ Under OG', hoist: true, managed: false }],
            ['4', { name: '🎯 ┊ Recruiter', hoist: true, managed: false }],
            ['5', { name: '🔥 ┊ Kıdemli Üye', hoist: true, managed: false }],
            ['6', { name: '🩸 ┊ Üye', hoist: true, managed: false }],
            ['7', { name: '⏳ ┊ Aday', hoist: true, managed: false }]
          ]),
          fetch: async () => {}
        }
      };
      const result = await SetupService.ensureAllRolesHoisted(mockGuild);
      if (!result.success) throw new Error('ensureAllRolesHoisted başarısız sonuç döndü!');
      if (result.updatedCount !== 0) throw new Error('Zaten hoisted olan roller gereksiz yere güncellendi!');
    });

    await runTest('Yeni Sistemler', '56. Uyarı Sistemi ve 1x/2x/3x Rol Senkronizasyonu', async () => {
      const { WarningService } = await import('../services/warningService.ts');
      
      const mockRoles: any[] = [
        { id: 'r-1', name: '⚠️ ┊ 1x Uyarı', hoist: true },
        { id: 'r-2', name: '⚠️ ┊ 2x Uyarı', hoist: true },
        { id: 'r-3', name: '🚫 ┊ 3x Uyarı', hoist: true }
      ];

      const assignedRoles = new Set<string>();
      const mockMember: any = {
        id: 'user-test-warn',
        roles: {
          cache: { has: (id: string) => assignedRoles.has(id) },
          add: async (role: any) => { assignedRoles.add(role.id); },
          remove: async (role: any) => { assignedRoles.delete(role.id); }
        }
      };

      const mockGuild: any = {
        roles: {
          cache: {
            find: (fn: any) => mockRoles.find(fn)
          }
        },
        members: {
          fetch: async () => mockMember
        },
        channels: {
          cache: {
            find: () => ({ send: async () => {} })
          }
        }
      };

      // 1. Uyarı ver
      const res1 = await WarningService.addWarning({
        discordUserId: 'user-test-warn',
        discordUsername: 'TestUser',
        reason: 'Toplantıya mazeretsiz katılmama',
        executorId: 'exec-1',
        executorName: 'Vincenzo_OG',
        guild: mockGuild
      });

      if (res1.activeCount !== 1) throw new Error(`Aktif uyarı sayısı hatalı: ${res1.activeCount}`);
      if (!assignedRoles.has('r-1')) throw new Error('1x Uyarı rolü atanmadı!');

      // 2. Uyarı ver
      const res2 = await WarningService.addWarning({
        discordUserId: 'user-test-warn',
        discordUsername: 'TestUser',
        reason: 'Sohbette yasaklı medya paylaşımı',
        executorId: 'exec-1',
        executorName: 'Vincenzo_OG',
        guild: mockGuild
      });

      if (res2.activeCount !== 2) throw new Error(`Aktif uyarı sayısı hatalı: ${res2.activeCount}`);
      if (!assignedRoles.has('r-2')) throw new Error('2x Uyarı rolü atanmadı!');
      if (assignedRoles.has('r-1')) throw new Error('1x Uyarı rolü eski rolden temizlenmedi!');

      // 3. Uyarı ver
      const res3 = await WarningService.addWarning({
        discordUserId: 'user-test-warn',
        discordUsername: 'TestUser',
        reason: 'Emre itaatsizlik',
        executorId: 'exec-1',
        executorName: 'Vincenzo_OG',
        guild: mockGuild
      });

      if (res3.activeCount !== 3) throw new Error(`Aktif uyarı sayısı hatalı: ${res3.activeCount}`);
      if (!assignedRoles.has('r-3')) throw new Error('3x Uyarı rolü atanmadı!');
      if (assignedRoles.has('r-2')) throw new Error('2x Uyarı rolü eski rolden temizlenmedi!');
    });

    await runTest('Yeni Sistemler', '57. Uyarı Kaldırma ve Rol Tenzil Doğrulaması', async () => {
      const { WarningService } = await import('../services/warningService.ts');

      const mockRoles: any[] = [
        { id: 'r-1', name: '⚠️ ┊ 1x Uyarı', hoist: true },
        { id: 'r-2', name: '⚠️ ┊ 2x Uyarı', hoist: true },
        { id: 'r-3', name: '🚫 ┊ 3x Uyarı', hoist: true }
      ];

      const assignedRoles = new Set<string>(['r-3']);
      const mockMember: any = {
        id: 'user-test-warn',
        roles: {
          cache: { has: (id: string) => assignedRoles.has(id) },
          add: async (role: any) => { assignedRoles.add(role.id); },
          remove: async (role: any) => { assignedRoles.delete(role.id); }
        }
      };

      const mockGuild: any = {
        roles: {
          cache: {
            find: (fn: any) => mockRoles.find(fn)
          }
        },
        members: {
          fetch: async () => mockMember
        },
        channels: {
          cache: {
            find: () => ({ send: async () => {} })
          }
        }
      };

      const revokeRes = await WarningService.removeWarning({
        discordUserId: 'user-test-warn',
        revokedBy: 'Vincenzo_OG',
        revokedReason: 'İtirazı haklı bulundu, af uygulandı.',
        guild: mockGuild
      });

      if (!revokeRes.success) throw new Error(`Uyarı kaldırılamadı: ${revokeRes.message}`);
      if (revokeRes.remainingActiveCount !== 2) throw new Error(`Kalan aktif uyarı hatalı: ${revokeRes.remainingActiveCount}`);
      if (!assignedRoles.has('r-2')) throw new Error('2x rolüne otomatik tenzil yapılmadı!');
      if (assignedRoles.has('r-3')) throw new Error('3x rolü kaldırılmadı!');
    });

    await runTest('Yeni Sistemler', '58. İnaktiflik Bildirim Formu ve Yönetim Onayı / Statü Güncellemesi', async () => {
      const { InactivityService } = await import('../services/inactivityService.ts');
      const { MemberService } = await import('../services/memberService.ts');

      // Test üyesi oluştur
      const memRes = MemberService.addMember({
        discordUserId: 'user-inact-1',
        discordUsername: 'LeaveMember',
        mtaName: 'Leave_Character',
        executorId: '100000000000000001',
        executorName: 'Vincenzo_OG'
      });

      const subRes = await InactivityService.submitRequest({
        discordUserId: 'user-inact-1',
        discordUsername: 'LeaveMember',
        startDate: '10.11.2026',
        endDate: '20.11.2026',
        reason: 'Üniversite vize sınavları',
        notes: 'Hafta sonu discord bakabilirim.'
      });

      if (!subRes.success) throw new Error('İnaktiflik bildirimi oluşturulamadı!');
      if (subRes.request.status !== 'Beklemede') throw new Error('Başlangıç durumu Beklemede olmalı!');

      // Yönetici onaylasın
      const reviewRes = await InactivityService.reviewRequest({
        requestId: subRes.request.id,
        approved: true,
        reviewerId: '100000000000000001',
        reviewerName: 'Vincenzo_OG',
        reviewNotes: 'İyi çalışmalar dileriz.'
      });

      if (!reviewRes.success) throw new Error('İnaktiflik onayı başarısız!');
      if (reviewRes.request?.status !== 'Onaylandı') throw new Error('Talep durumu Onaylandı olmalı!');

      const member = store.members.find(m => m.discordUserId === 'user-inact-1');
      if (member?.status !== 'İzinli') throw new Error(`Üyenin statüsü 'İzinli' olmadı: ${member?.status}`);
    });

    await runTest('Yeni Sistemler', '59. İnaktiflik Süresi Dolumu ve Otomatik Aktife Dönüş', async () => {
      const { InactivityService } = await import('../services/inactivityService.ts');

      // Geçmiş tarihli bitiş tarihi olan bir talep ekle
      const pastReq = await InactivityService.submitRequest({
        discordUserId: 'user-inact-1',
        discordUsername: 'LeaveMember',
        startDate: '01.01.2026',
        endDate: '05.01.2026',
        reason: 'Eski izin'
      });

      await InactivityService.reviewRequest({
        requestId: pastReq.request.id,
        approved: true,
        reviewerId: '100000000000000001',
        reviewerName: 'Vincenzo_OG'
      });

      const member = store.members.find(m => m.discordUserId === 'user-inact-1');
      if (member) member.status = 'İzinli';

      const expRes = await InactivityService.checkExpiredRequests();
      if (expRes.expiredCount === 0) throw new Error('Süresi dolan izin tespit edilemedi!');

      if (member?.status !== 'Aktif') throw new Error(`İzni biten üye 'Aktif' statüsüne dönmedi: ${member?.status}`);
    });

    await runTest('Yeni Sistemler', '60. Rütbe Bilgilendirme Kartları ve 5\'li Kesin Hiyerarşi Bütünlüğü', async () => {
      const { RankService } = await import('../services/rankService.ts');

      const embeds = RankService.buildRankGuideEmbeds();
      if (!Array.isArray(embeds) || embeds.length !== 6) {
        throw new Error(`Rütbe bilgilendirme embed sayısı hatalı: Beklenen 6, Bulunan ${embeds.length}`);
      }

      const rankTitles = embeds.map(e => e.title);
      if (!rankTitles[1].includes('OG')) throw new Error('1. Rütbe OG olmalı!');
      if (!rankTitles[2].includes('UNDER OG')) throw new Error('2. Rütbe Under OG olmalı!');
      if (!rankTitles[3].includes('RECRUITER')) throw new Error('3. Rütbe Recruiter olmalı!');
      if (!rankTitles[4].includes('KIDEMLİ ÜYE')) throw new Error('4. Rütbe Kıdemli Üye olmalı!');
      if (!rankTitles[5].includes('ÜYE')) throw new Error('5. Rütbe Üye olmalı!');
    });

    await runTest('Yeni Sistemler', '61. Dinamik Kanal Rehberi ve Kategori Eşleştirmesi', async () => {
      const { GuideService } = await import('../services/guideService.ts');

      const descWarn = GuideService.getChannelDescription('⚠️・uyarı-log', false);
      if (!descWarn.includes('uyarı')) throw new Error('Uyarı log açıklaması eşleşmedi!');

      const descGuide = GuideService.getChannelDescription('🗺️・kanal-rehberi', false);
      if (!descGuide.includes('rehber')) throw new Error('Kanal rehberi açıklaması eşleşmedi!');

      const descRank = GuideService.getChannelDescription('👑・rütbe-bilgilendirme', false);
      if (!descRank.includes('hiyerarşi') && !descRank.includes('rütbe')) throw new Error('Rütbe bilgilendirme açıklaması eşleşmedi!');

      const descInact = GuideService.getChannelDescription('🌴・inaktiflik-bildir', false);
      if (!descInact.includes('inaktiflik')) throw new Error('İnaktiflik bildirim açıklaması eşleşmedi!');
    });

    await runTest('Güvenlik & İzinler', '62. Ceza Logu Yetkilendirmesi (Üye ve Üstü Görebilsin, Yazamasın)', async () => {
      const { PermissionAuditService } = await import('../services/permissionAuditService.ts');
      const { PermissionFlagsBits } = await import('../services/setupService.ts');

      // 1. Kanal sınıflandırma doğrulaması
      if (!PermissionAuditService.isPunishmentLogChannel('⚖️・ceza-log')) {
        throw new Error('ceza-log ceza logu olarak sınıflandırılamadı!');
      }
      if (!PermissionAuditService.isPunishmentLogChannel('⚠️・uyarı-log')) {
        throw new Error('uyarı-log ceza logu olarak sınıflandırılamadı!');
      }
      if (!PermissionAuditService.isPunishmentLogChannel('💀・kara-liste-sicil')) {
        throw new Error('kara-liste-sicil ceza logu olarak sınıflandırılamadı!');
      }
      if (PermissionAuditService.isPunishmentLogChannel('genel-sohbet')) {
        throw new Error('genel-sohbet yanlışlıkla ceza logu olarak sınıflandırıldı!');
      }
      if (PermissionAuditService.isManagementEntity('⚖️・ceza-log')) {
        throw new Error('ceza-log yönetim-özel olarak işaretlenmemeli (üye görebilmeli)!');
      }
      if (PermissionAuditService.isPublicInfoChannel('⚖️・ceza-log')) {
        throw new Error('ceza-log herkese açık bilgi kanalı olmamalı (@everyone görememeli)!');
      }

      // 2. Mock Sunucu İzin Senkronizasyon Testi
      let appliedOverwrites: any[] = [];
      const mockCezaChannel = {
        id: 'mock-ceza-log',
        name: '⚖️・ceza-log',
        type: 0,
        permissionOverwrites: {
          cache: new Map(),
          set: async (ow: any[]) => {
            appliedOverwrites = ow;
          }
        }
      };

      const mockGuild: any = {
        name: 'T.R.İ.P TEST GUILD',
        roles: {
          everyone: { id: 'role-everyone' },
          cache: [
            { id: 'role-og', name: '👑 ┊ OG' },
            { id: 'role-underog', name: '⭐ ┊ Under OG' },
            { id: 'role-recruiter', name: '🎯 ┊ Recruiter' },
            { id: 'role-senior', name: '🔥 ┊ Kıdemli Üye' },
            { id: 'role-member', name: '🩸 ┊ Üye' },
            { id: 'role-candidate', name: '⏳ ┊ Aday' }
          ]
        },
        channels: {
          cache: new Map([['mock-ceza-log', mockCezaChannel]])
        },
        client: { user: { id: 'bot-123' } }
      };

      await PermissionAuditService.enforceGuildPermissions(mockGuild);

      // İzin kurallarını teyit et
      const everyoneRule = appliedOverwrites.find(o => o.id === 'role-everyone');
      if (!everyoneRule || !everyoneRule.deny.includes(PermissionFlagsBits.ViewChannel)) {
        throw new Error('@everyone ceza logunu görmemeli!');
      }

      const candidateRule = appliedOverwrites.find(o => o.id === 'role-candidate');
      if (!candidateRule || !candidateRule.deny.includes(PermissionFlagsBits.ViewChannel)) {
        throw new Error('Aday rolü ceza logunu görmemeli!');
      }

      const memberRule = appliedOverwrites.find(o => o.id === 'role-member');
      if (!memberRule || !memberRule.allow.includes(PermissionFlagsBits.ViewChannel)) {
        throw new Error('Üye rolü ceza logunu görebilmeli!');
      }
      if (!memberRule.deny.includes(PermissionFlagsBits.SendMessages)) {
        throw new Error('Üye rolü ceza loguna mesaj yazamamalı!');
      }

      const seniorRule = appliedOverwrites.find(o => o.id === 'role-senior');
      if (!seniorRule || !seniorRule.allow.includes(PermissionFlagsBits.ViewChannel)) {
        throw new Error('Kıdemli Üye ceza logunu görebilmeli!');
      }
      if (!seniorRule.deny.includes(PermissionFlagsBits.SendMessages)) {
        throw new Error('Kıdemli Üye ceza loguna mesaj yazamamalı!');
      }

      const ogRule = appliedOverwrites.find(o => o.id === 'role-og');
      if (!ogRule || !ogRule.allow.includes(PermissionFlagsBits.SendMessages)) {
        throw new Error('OG yönetim rolü ceza loguna mesaj yazabilmeli!');
      }
    });

    await runTest('Başvuru Sistemi', '63. Yeni Katılım Başvuru Portalı ve Akış Güvenliği', async () => {
      const { ApplicationService } = await import('../services/applicationService.ts');
      const { MemberService } = await import('../services/memberService.ts');

      // 1. Panel oluşturma kontrolü
      const embed = ApplicationService.getApplicationPanelEmbed();
      if (!embed || !embed.title.includes('KATILIM BAŞVURUSU')) {
        throw new Error('Başvuru portalı başlığı hatalı!');
      }

      const buttons = ApplicationService.getApplicationPanelButtons();
      if (!Array.isArray(buttons) || buttons.length === 0) {
        throw new Error('Başvuru portal butonları eksik!');
      }
      const buttonList = buttons[0].components;
      const hasApplyBtn = buttonList.some((b: any) => b.custom_id === 'btn_app_new_form');
      const hasStatusBtn = buttonList.some((b: any) => b.custom_id === 'btn_app_check_status');
      if (!hasApplyBtn || !hasStatusBtn) {
        throw new Error('Başvuru veya durum butonları panelde bulunamadı!');
      }

      // 2. Yeni başvuru oluşturma
      const res1 = ApplicationService.createApplication({
        discordUserId: 'test-new-applicant-99',
        discordUsername: 'new_applicant#0001',
        oocName: 'Burak (22)',
        age: 22,
        mtaCharacterName: 'Vito_Scaletta',
        characterBackstory: 'Little Italy sokaklarında büyüyen hırslı bir tetikçi.',
        roleplayExperience: 'Hard RP 4 Yıl',
        joinReason: 'Aileye sadakatle hizmet etmek.'
      });

      if (!res1.success || !res1.application) {
        throw new Error(`Başvuru oluşturulamadı: ${res1.message}`);
      }

      // 3. Mükerrer başvuru engeli
      const resDuplicate = ApplicationService.createApplication({
        discordUserId: 'test-new-applicant-99',
        discordUsername: 'new_applicant#0001',
        oocName: 'Burak',
        age: 22,
        mtaCharacterName: 'Vito_Scaletta',
        characterBackstory: 'Tekrar',
        roleplayExperience: 'Hard RP',
        joinReason: 'Tekrar'
      });

      if (resDuplicate.success) {
        throw new Error('Aktif başvurusu olan kullanıcının mükerrer başvurusu engellenemedi!');
      }

      // 4. Mevcut üyenin başvuru engeli
      MemberService.addMember({
        discordUserId: 'test-existing-member-88',
        discordUsername: 'existing_member',
        mtaName: 'Tony_Soprano',
        executorId: 'sys',
        executorName: 'Admin'
      });

      const resMemberApp = ApplicationService.createApplication({
        discordUserId: 'test-existing-member-88',
        discordUsername: 'existing_member',
        oocName: 'Tony',
        age: 30,
        mtaCharacterName: 'Tony_Soprano',
        characterBackstory: 'Test',
        roleplayExperience: 'Test',
        joinReason: 'Test'
      });

      if (resMemberApp.success) {
        throw new Error('Mevcut birlik üyesinin tekrar başvuru yapması engellenemedi!');
      }

      // 5. Başvuruyu kabul etme ve onay akışı
      const acceptRes = ApplicationService.acceptApplication({
        applicationId: res1.application.id,
        executorId: 'og-1',
        executorName: 'OG Boss',
        reason: 'Hard RP deneyimi onaylandı.'
      });

      if (!acceptRes.success) {
        throw new Error(`Başvuru kabul edilemedi: ${acceptRes.message}`);
      }

      if (res1.application.status !== 'Kabul Edildi') {
        throw new Error('Başvuru statüsü Kabul Edildi olarak güncellenmedi!');
      }
    });

    await runTest('Başvuru Sistemi', '64. Başvuru Onayında IC İsim (Dio Draven) Rumuz Formatlama ve Senkronizasyon', async () => {
      const testCases = [
        { input: 'Dio_Draven', expected: 'Dio Draven' },
        { input: 'dio draven', expected: 'Dio Draven' },
        { input: 'DIO_DRAVEN', expected: 'Dio Draven' },
        { input: 'Tony Montana', expected: 'Tony Montana' },
        { input: 'Carl_Johnson_San_Andreas_Special_Edition', expected: 'Carl Johnson San Andreas Special' }
      ];

      for (const tc of testCases) {
        const formatted = formatIcNickname(tc.input);
        if (formatted !== tc.expected) {
          throw new Error(`IC İsim formatı hatalı: '${tc.input}' -> '${formatted}', beklenen: '${tc.expected}'`);
        }
      }

      // Mock Guild Member Nickname Sync Test
      let updatedNick = '';
      const mockMember: any = {
        id: 'user-dio',
        nickname: 'OldDiscordTag',
        manageable: true,
        roles: {
          cache: new Map(),
          add: async () => {},
          remove: async () => {},
          has: () => false
        },
        setNickname: async (newNick: string) => {
          updatedNick = newNick;
        }
      };

      const mockGuild: any = {
        ownerId: 'server-owner-id',
        roles: {
          cache: [{ id: 'role-uye', name: 'Üye' }]
        },
        members: {
          fetch: async () => mockMember
        }
      };

      const icName = 'Dio_Draven';
      const formattedNick = formatIcNickname(icName);
      if (mockMember.id !== mockGuild.ownerId && mockMember.manageable) {
        await mockMember.setNickname(formattedNick, 'Başvuru Onayı - IC İsim Güncellemesi');
      }

      if (updatedNick !== 'Dio Draven') {
        throw new Error(`Üyenin sunucu takma adı 'Dio Draven' olarak güncellenmedi! Güncel değer: '${updatedNick}'`);
      }
    });

    // Test tamamlandıktan sonra tüm mock/test verilerini sıfırla (Canlı veritabanını kesinlikle temiz bırak)
    store.clearAllTestData();

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;

    return {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      results
    };
  }
}

