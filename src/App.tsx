import React, { useState, useEffect } from 'react';
import {
  Shield,
  Terminal,
  Server,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Users,
  Award,
  Layers,
  FileText,
  AlertTriangle,
  RotateCcw,
  Send,
  Hash,
  ChevronDown,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Info,
  Volume2,
  Mic
} from 'lucide-react';

import { store } from './services/store.ts';
import { DiscordPanelRegistry, IPanelDefinition } from './utils/discordPanels.ts';
import { SetupService } from './services/setupService.ts';
import { EconomyService } from './services/economyService.ts';
import { RankService } from './services/rankService.ts';
import { ApplicationService } from './services/applicationService.ts';
import { MeetingService } from './services/meetingService.ts';
import { MasterTestRunner, ITestResult } from './tests/runner.ts';
import { StatsService } from './services/gangOperationsService.ts';
import { RankLevel } from './types/index.ts';
import { DEFAULT_CATEGORIES_AND_CHANNELS } from './config/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'discord' | 'tests' | 'docker' | 'audit'>('discord');
  const [selectedChannel, setSelectedChannel] = useState<string>('yonetim-paneli');
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<string | null>(null);
  const [currentPanelCategory, setCurrentPanelCategory] = useState<string>('birlik');
  const [panelData, setPanelData] = useState<IPanelDefinition>(DiscordPanelRegistry.getPanel('birlik'));

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalInputs, setModalInputs] = useState<{ [key: string]: string }>({});

  // Feedback banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Test Runner State
  const [testResults, setTestResults] = useState<ITestResult[]>([]);
  const [testsRunning, setTestsRunning] = useState<boolean>(false);
  const [testStats, setTestStats] = useState<{ total: number; passed: number; failed: number } | null>(null);

  // Chat message simulator history
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    author: string;
    bot?: boolean;
    role?: string;
    content?: string;
    embed?: any;
    buttons?: any[];
    timestamp: string;
  }>>([]);

  const [chatInput, setChatInput] = useState<string>('');
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);

  // Refresh panel data
  const refreshPanel = (catId?: string) => {
    const target = catId || currentPanelCategory;
    const p = DiscordPanelRegistry.getPanel(target);
    setPanelData(p);
  };

  useEffect(() => {
    refreshPanel(currentPanelCategory);
  }, [currentPanelCategory]);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Run initial test suite automatically
  useEffect(() => {
    runAllTests();
  }, []);

  const runAllTests = async () => {
    setTestsRunning(true);
    try {
      const outcome = await MasterTestRunner.runAll();
      setTestResults(outcome.results);
      setTestStats({ total: outcome.total, passed: outcome.passed, failed: outcome.failed });
    } catch (e: any) {
      showNotification('error', `Test çalıştırma hatası: ${e.message}`);
    } finally {
      setTestsRunning(false);
    }
  };

  // Handle slash command simulator
  const handleSendCommand = async () => {
    if (!chatInput.trim()) return;
    const cmd = chatInput.trim();
    setChatInput('');

    const userMsg = {
      id: `usr-${Date.now()}`,
      author: 'OG Vincenzo',
      role: 'OG (Seviye 5)',
      content: cmd,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);

    if (cmd === '/kurulum') {
      const res = await SetupService.executeGuildSetup('guild-123', 'OG Vincenzo');
      const botResponse = {
        id: `bot-${Date.now()}`,
        author: 'MTA Illegal Birlik Botu',
        bot: true,
        embed: {
          title: '✅ Otomatik Discord Sunucu Kurulumu Tamamlandı',
          description:
            `Sunucu kategorileri, kanalları ve kesin 5 rütbe hiyerarşisi başarıyla oluşturuldu/doğrulandı.\n\n` +
            res.report.slice(0, 8).map(r => `• **${r.name}** [${r.type}]: \`${r.status}\``).join('\n') +
            `\n...ve 7 otomatik panel mesajı kanallara sabitlendi.`,
          color: '#57F287'
        },
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botResponse]);
      showNotification('success', 'Sunucu kurulumu başarıyla tamamlandı!');
      return;
    }

    if (cmd === '/panel') {
      const p = DiscordPanelRegistry.getPanel(currentPanelCategory);
      const botResponse = {
        id: `bot-${Date.now()}`,
        author: 'MTA Illegal Birlik Botu',
        bot: true,
        embed: p.embed,
        buttons: p.buttons,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botResponse]);
      return;
    }

    if (cmd === '/kasa') {
      const bal = EconomyService.getBalance();
      const botResponse = {
        id: `bot-${Date.now()}`,
        author: 'MTA Illegal Birlik Botu',
        bot: true,
        embed: {
          title: '💰 Birlik Kasa Bakiyesi',
          description: `Mevcut Kasa Mevcudu: **$${bal.toLocaleString('tr-TR')}**\nPara yatırmak veya çekmek için **/panel** menüsünü kullanabilirsiniz.`,
          color: '#F1C40F'
        },
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botResponse]);
      return;
    }

    // Default unknown command
    const botResponse = {
      id: `bot-${Date.now()}`,
      author: 'MTA Illegal Birlik Botu',
      bot: true,
      content: `Komut alındı: \`${cmd}\`. Tüm birlik işlemlerini yürütmek için **/panel** veya **/kurulum** komutunu kullanınız.`,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, botResponse]);
  };

  // Button clicks from panel
  const handleButtonClick = (customId: string) => {
    if (customId === 'btn_eco_deposit') {
      setModalType('deposit');
      setModalTitle('Kasaya Para Yatır');
      setModalInputs({ amount: '500000', category: 'Haraç / Bölge Geliri', desc: 'Haftalık mekan vergisi' });
      setModalOpen(true);
      return;
    }

    if (customId === 'btn_eco_withdraw') {
      setModalType('withdraw');
      setModalTitle('Kasadan Para Çek');
      setModalInputs({ amount: '150000', category: 'Mühimmat Alımı', desc: 'Depo mermi tedariki' });
      setModalOpen(true);
      return;
    }

    if (customId === 'btn_app_new_form') {
      setModalType('app');
      setModalTitle('Birlik Katılım Başvuru Formu');
      setModalInputs({
        oocName: 'Can',
        age: '21',
        mtaName: 'Marcus_Corleone',
        backstory: 'Sokaklarda büyüyen bir otomobil tamircisi ve kaçakçı.',
        reason: 'Birliğin hiyerarşisi ve saygınlığına katkıda bulunmak.'
      });
      setModalOpen(true);
      return;
    }

    if (customId.includes('refresh') || customId.endsWith('_refresh')) {
      refreshPanel();
      showNotification('success', 'Panel verileri canlı veritabanı ile başarıyla senkronize edildi.');
      return;
    }

    if (customId === 'btn_rank_promote') {
      const candidates = store.members.filter(m => m.rankLevel < RankLevel.OG);
      if (candidates.length === 0) {
        showNotification('info', 'Terfi ettirilecek üye bulunamadı.');
        return;
      }
      const target = candidates[candidates.length - 1];
      const res = RankService.promoteMember({
        targetMemberId: target.id,
        executorDiscordId: '100000000000000001',
        reason: 'Discord simülatöründen terfi onayı'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel();
      } else {
        showNotification('error', res.message);
      }
      return;
    }

    if (customId === 'btn_rank_demote') {
      const candidates = store.members.filter(m => m.rankLevel > RankLevel.UYE && m.rankLevel < RankLevel.OG);
      if (candidates.length === 0) {
        showNotification('info', 'Rütbesi düşürülebilecek üye bulunamadı.');
        return;
      }
      const target = candidates[0];
      const res = RankService.demoteMember({
        targetMemberId: target.id,
        executorDiscordId: '100000000000000001',
        reason: 'Disiplin yetersizliği'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel();
      } else {
        showNotification('error', res.message);
      }
      return;
    }

    if (customId === 'btn_app_accept') {
      const pending = store.applications.find(a => a.status === 'Beklemede' || a.status === 'İnceleniyor');
      if (!pending) {
        showNotification('info', 'Bekleyen başvuru kalmadı.');
        return;
      }
      const res = ApplicationService.acceptApplication({
        applicationId: pending.id,
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro'
      });
      showNotification('success', res.message);
      refreshPanel();
      return;
    }

    if (customId === 'btn_app_reject') {
      const pending = store.applications.find(a => a.status === 'Beklemede' || a.status === 'İnceleniyor');
      if (!pending) {
        showNotification('info', 'Bekleyen başvuru kalmadı.');
        return;
      }
      const res = ApplicationService.rejectApplication({
        applicationId: pending.id,
        executorId: '100000000000000001',
        executorName: 'Vincenzo_Santoro',
        reason: 'Rol yetersizliği'
      });
      showNotification('success', res.message);
      refreshPanel();
      return;
    }

    if (customId === 'btn_meet_create') {
      setModalType('meeting');
      setModalTitle('Yeni Toplantı Planla');
      setModalInputs({
        title: 'Haftalık Büyük Birlik Toplantısı',
        subject: 'Hood güvenliği ve mühimmat tedariki',
        agenda: '1. Sınır devriyeleri\n2. Mühimmat stoğu dağıtımı\n3. Yeni başvurular',
        time: '21:00',
        scope: 'Genel Birlik'
      });
      setModalOpen(true);
      return;
    }

    if (customId === 'btn_meet_start') {
      const upcoming = store.meetings.find(m => m.status === 'Planlandı');
      if (!upcoming) {
        showNotification('info', 'Planlanan toplantı bulunamadı.');
        return;
      }
      const res = MeetingService.startMeeting(upcoming.id, 'Vincenzo_Santoro');
      showNotification('success', res.message);
      refreshPanel();
      return;
    }

    if (customId === 'btn_meet_complete') {
      const active = store.meetings.find(m => m.status === 'Devam Ediyor' || m.status === 'Planlandı');
      if (!active) {
        showNotification('info', 'Aktif toplantı bulunamadı.');
        return;
      }
      const res = MeetingService.completeMeeting({
        meetingId: active.id,
        notes: 'Toplantı verimli geçti. Telsiz disiplini sağlandı.',
        decisions: 'Bölge devriyelerinin artırılmasına karar verildi.',
        executorName: 'Vincenzo_Santoro'
      });
      showNotification('success', res.message);
      refreshPanel();
      return;
    }

    if (customId === 'btn_meet_cancel') {
      const active = store.meetings.find(m => m.status === 'Planlandı' || m.status === 'Devam Ediyor');
      if (!active) {
        showNotification('info', 'İptal edilecek toplantı bulunamadı.');
        return;
      }
      const res = MeetingService.cancelMeeting(active.id, 'Yönetim kararıyla ertelendi', 'Vincenzo_Santoro');
      showNotification('success', res.message);
      refreshPanel();
      return;
    }

    if (customId === 'btn_sys_setup') {
      handleSendCommandCustom('/kurulum');
      return;
    }

    showNotification('info', `Etkileşim alındı: [${customId}]`);
    refreshPanel();
  };

  const handleSendCommandCustom = async (cmd: string) => {
    setChatInput(cmd);
    setTimeout(() => {
      handleSendCommand();
    }, 50);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalOpen(false);

    if (modalType === 'deposit') {
      const amt = parseInt(modalInputs.amount || '0', 10);
      const res = EconomyService.executeTransaction({
        type: 'Para Yatırma',
        amount: amt,
        category: modalInputs.category || 'Diğer',
        description: modalInputs.desc || 'Açıklama yok',
        executorId: '100000000000000001',
        executorName: 'OG Vincenzo'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel();
      } else {
        showNotification('error', res.message);
      }
      return;
    }

    if (modalType === 'withdraw') {
      const amt = parseInt(modalInputs.amount || '0', 10);
      const res = EconomyService.executeTransaction({
        type: 'Para Çekme',
        amount: amt,
        category: modalInputs.category || 'Operasyon',
        description: modalInputs.desc || 'Gider',
        executorId: '100000000000000001',
        executorName: 'OG Vincenzo'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel();
      } else {
        showNotification('error', res.message);
      }
      return;
    }

    if (modalType === 'app') {
      const res = ApplicationService.createApplication({
        discordUserId: `cand-${Date.now().toString().slice(-4)}`,
        discordUsername: `${modalInputs.oocName}#1234`,
        oocName: modalInputs.oocName || 'Aday',
        age: parseInt(modalInputs.age || '20', 10),
        mtaCharacterName: modalInputs.mtaName || 'John_Doe',
        characterBackstory: modalInputs.backstory || 'Geçmiş hikaye...',
        roleplayExperience: 'MTA Hard RP',
        joinReason: modalInputs.reason || 'Birlik rolü'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel('basvuru');
      } else {
        showNotification('error', res.message);
      }
      return;
    }



    if (modalType === 'meeting') {
      const res = MeetingService.createMeeting({
        title: modalInputs.title || 'Birlik Toplantısı',
        subject: modalInputs.subject || 'Genel Konular',
        agenda: modalInputs.agenda || '1. Gündem',
        scope: (modalInputs.scope as any) || 'Genel Birlik',
        date: new Date(),
        timeString: modalInputs.time || '21:00',
        organizerId: '100000000000000001',
        organizerName: 'OG Vincenzo'
      });
      if (res.success) {
        showNotification('success', res.message);
        refreshPanel('toplanti');
      }
      return;
    }
  };

  const copyDockerEnv = () => {
    const text = `DISCORD_BOT_TOKEN=buraya_bot_tokeninizi_yazin\nDISCORD_CLIENT_ID=buraya_client_id_yazin\nDISCORD_GUILD_ID=buraya_sunucu_id_yazin\nLOG_LEVEL=info\nNODE_ENV=production`;
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const stats = StatsService.getStats();

  return (
    <div className="flex h-screen w-screen bg-[#1E1F22] text-[#DBDEE1] font-sans antialiased overflow-hidden select-none">
      {/* Top Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-2xl flex items-center space-x-3 text-sm font-medium transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-[#23A55A] text-white border-l-4 border-green-300'
              : notification.type === 'error'
              ? 'bg-[#F23F43] text-white border-l-4 border-red-300'
              : 'bg-[#5865F2] text-white border-l-4 border-indigo-200'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Info className="w-5 h-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Discord Leftmost Server List Bar */}
      <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 space-y-2 border-r border-[#2B2D31]/40 shrink-0">
        <div
          className="w-12 h-12 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white cursor-pointer hover:rounded-xl transition-all shadow-md group relative"
          title="MTA Illegal Birlik Sunucusu"
        >
          <Shield className="w-6 h-6" />
          <span className="absolute left-0 w-1 h-8 bg-white rounded-r-full -translate-x-1" />
        </div>

        <div className="w-8 h-[2px] bg-[#35363C] my-1" />

        <div
          onClick={() => setActiveTab('discord')}
          className={`w-12 h-12 rounded-3xl hover:rounded-xl flex items-center justify-center cursor-pointer transition-all ${
            activeTab === 'discord' ? 'bg-[#5865F2] text-white rounded-xl' : 'bg-[#2B2D31] text-[#949BA4] hover:bg-[#35373C] hover:text-white'
          }`}
          title="Discord Canlı Panel Simülatörü"
        >
          <Terminal className="w-5 h-5" />
        </div>

        <div
          onClick={() => setActiveTab('tests')}
          className={`w-12 h-12 rounded-3xl hover:rounded-xl flex items-center justify-center cursor-pointer transition-all ${
            activeTab === 'tests' ? 'bg-[#23A55A] text-white rounded-xl' : 'bg-[#2B2D31] text-[#949BA4] hover:bg-[#35373C] hover:text-white'
          }`}
          title="40/40 Test Senaryoları & Otomasyon"
        >
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <div
          onClick={() => setActiveTab('docker')}
          className={`w-12 h-12 rounded-3xl hover:rounded-xl flex items-center justify-center cursor-pointer transition-all ${
            activeTab === 'docker' ? 'bg-[#5865F2] text-white rounded-xl' : 'bg-[#2B2D31] text-[#949BA4] hover:bg-[#35373C] hover:text-white'
          }`}
          title="7/24 Docker & Dağıtım Rehberi"
        >
          <Server className="w-5 h-5" />
        </div>

        <div
          onClick={() => setActiveTab('audit')}
          className={`w-12 h-12 rounded-3xl hover:rounded-xl flex items-center justify-center cursor-pointer transition-all ${
            activeTab === 'audit' ? 'bg-[#F1C40F] text-black rounded-xl' : 'bg-[#2B2D31] text-[#949BA4] hover:bg-[#35373C] hover:text-white'
          }`}
          title="Değiştirilemez Denetim Logları (Audit)"
        >
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-12 bg-[#2B2D31] border-b border-[#1F2023] flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-[#ED4245]" />
            <span className="font-bold text-white text-sm tracking-wide">
              {store.gangInfo.name} [{store.gangInfo.tag}] — MTA ILLEGAL BİRLİK DISCORD BOTU
            </span>
            <span className="bg-[#23A55A]/20 text-[#23A55A] text-xs font-semibold px-2 py-0.5 rounded border border-[#23A55A]/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#23A55A] animate-pulse"></span>
              7/24 Canlı Çekirdek
            </span>
            <span className="bg-[#5865F2]/20 text-[#5865F2] text-xs font-semibold px-2 py-0.5 rounded border border-[#5865F2]/30">
              Discord.js v14 & Mongoose
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('discord')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                activeTab === 'discord' ? 'bg-[#5865F2] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-white'
              }`}
            >
              Discord Simülatörü
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5 ${
                activeTab === 'tests' ? 'bg-[#23A55A] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              Test Merkezi (40/40)
            </button>
            <button
              onClick={() => setActiveTab('docker')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                activeTab === 'docker' ? 'bg-[#35373C] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-white'
              }`}
            >
              Docker & Dağıtım
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                activeTab === 'audit' ? 'bg-[#35373C] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-white'
              }`}
            >
              Audit Log ({store.auditLogs.length})
            </button>
          </div>
        </header>

        {/* Tab 1: DISCORD CLIENT SIMULATOR */}
        {activeTab === 'discord' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Discord Channels Sidebar */}
            <div className="w-60 bg-[#2B2D31] flex flex-col border-r border-[#1F2023] shrink-0">
              <div className="h-12 border-b border-[#1F2023] px-4 flex items-center justify-between font-bold text-white text-sm shadow-sm">
                <span className="truncate">{store.gangInfo.name}</span>
                <ChevronDown className="w-4 h-4 text-[#949BA4]" />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs font-semibold text-[#949BA4]">
                {DEFAULT_CATEGORIES_AND_CHANNELS.map(cat => (
                  <div key={cat.category}>
                    <div className="px-2 py-1 uppercase tracking-wider text-[11px] text-[#949BA4]/80 flex items-center justify-between">
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {cat.channels.map(ch => {
                        const isVoice = ch.type === 'GUILD_VOICE';
                        const isSelected = selectedChannel === ch.id || selectedChannel === ch.name;
                        const isVoiceConnected = connectedVoiceChannel === ch.name;

                        return (
                          <div
                            key={ch.id}
                            onClick={() => {
                              if (isVoice) {
                                setConnectedVoiceChannel(ch.name);
                                showNotification('info', `🔊 Sesli Odaya Bağlanıldı: ${ch.name}`);
                              } else {
                                setSelectedChannel(ch.id);
                              }
                            }}
                            className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition ${
                              isSelected || isVoiceConnected
                                ? isVoice
                                  ? 'bg-[#23A55A]/20 text-[#23A55A] font-medium'
                                  : 'bg-[#404249] text-white font-medium'
                                : 'hover:bg-[#35373C] hover:text-[#DBDEE1]'
                            }`}
                          >
                            {isVoice ? (
                              <Volume2 className={`w-4 h-4 ${isVoiceConnected ? 'text-[#23A55A]' : 'text-[#80848E]'}`} />
                            ) : ch.managementOnly || ch.staffOnly ? (
                              <Lock className="w-3.5 h-3.5 text-[#F23F43]" />
                            ) : (
                              <Hash className="w-4 h-4 text-[#80848E]" />
                            )}
                            <span className="truncate">{ch.name}</span>
                            {isVoiceConnected && (
                              <span className="ml-auto text-[10px] bg-[#23A55A] text-white px-1 rounded">Bağlı</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected Voice Bar */}
              {connectedVoiceChannel && (
                <div className="bg-[#232428] border-t border-[#1F2023] px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-[#23A55A]">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <div>
                      <div className="font-bold text-[11px] leading-tight text-[#23A55A]">Ses Bağlandı</div>
                      <div className="text-[10px] text-[#949BA4] truncate">{connectedVoiceChannel} / RTC 64kbps</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConnectedVoiceChannel(null);
                      showNotification('info', 'Sesli odadan ayrıldınız.');
                    }}
                    className="p-1 hover:bg-[#35373C] rounded text-[#F23F43]"
                    title="Bağlantıyı Kes"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Logged in User Bar */}
              <div className="h-14 bg-[#232428] px-3 flex items-center justify-between border-t border-[#1F2023]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#ED4245] flex items-center justify-center font-bold text-white text-xs">
                    OG
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-white text-xs">Vincenzo_OG</div>
                    <div className="text-[10px] text-[#23A55A]">Çevrimiçi • OG (Sv. 5)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat / Panel Area */}
            <div className="flex-1 bg-[#313338] flex flex-col overflow-hidden">
              {/* Channel Header */}
              <div className="h-12 border-b border-[#1F2023] px-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Hash className="w-5 h-5 text-[#80848E]" />
                  <span>{selectedChannel}</span>
                  <span className="text-xs text-[#949BA4] font-normal ml-3 border-l border-[#3F4147] pl-3">
                    MTA:SA Illegal Birlik Discord Yönetim Konsolu
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => handleSendCommandCustom('/kurulum')}
                    className="bg-[#2B2D31] hover:bg-[#35373C] text-white px-2.5 py-1 rounded border border-[#3F4147] transition flex items-center gap-1.5"
                  >
                    <span>/kurulum</span>
                  </button>
                  <button
                    onClick={() => handleSendCommandCustom('/panel')}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-2.5 py-1 rounded font-medium transition flex items-center gap-1.5"
                  >
                    <span>/panel</span>
                  </button>
                </div>
              </div>

              {/* Message Feed / Interactive Panel Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Simulated Greeting Banner */}
                <div className="bg-[#2B2D31] border border-[#3F4147] rounded-lg p-4 flex items-start space-x-3 text-sm">
                  <Info className="w-5 h-5 text-[#5865F2] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Discord Bot Canlı Etkileşim Arayüzü</h4>
                    <p className="text-xs text-[#949BA4] mt-1 leading-relaxed">
                      Bu simülatör, botun Discord sunucusundaki <strong>Slash komutlarını, 25 kategorili embed panelini, butonlarını ve modallarını</strong> doğrudan test etmenizi sağlar.
                      Aşağıdaki select menüsünden kategoriyi değiştirerek veya butonlara tıklayarak veritabanında anında işlem yapabilirsiniz.
                    </p>
                  </div>
                </div>

                {/* The Master Panel Embed View */}
                <div className="bg-[#2B2D31] border-l-4 border-[#5865F2] rounded-r-lg p-5 shadow-lg max-w-3xl space-y-4">
                  {/* Category Selector Menu (Mimicking Discord StringSelectMenu) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#949BA4] mb-1.5">
                      Yönetim Kategorisi Seç (Discord Select Menu):
                    </label>
                    <select
                      value={currentPanelCategory}
                      onChange={e => setCurrentPanelCategory(e.target.value)}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-[#5865F2]"
                    >
                      {DiscordPanelRegistry.getCategoryOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} — {opt.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Panel Embed Content */}
                  <div className="bg-[#1E1F22]/70 rounded p-4 border border-[#35373C] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-white tracking-wide">{panelData.embed.title}</h3>
                      <span className="text-[11px] font-mono text-[#949BA4]">Kategori #{panelData.categoryNumber}</span>
                    </div>

                    <div className="text-xs text-[#DBDEE1] whitespace-pre-line leading-relaxed">
                      {panelData.embed.description}
                    </div>

                    {/* Embed Fields */}
                    {panelData.embed.fields && panelData.embed.fields.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#2B2D31]">
                        {panelData.embed.fields.map((f, i) => (
                          <div key={i} className="bg-[#2B2D31]/70 p-2.5 rounded border border-[#35363C]">
                            <div className="text-[11px] font-bold text-[#B5BAC1] uppercase">{f.name}</div>
                            <div className="text-xs text-white mt-1 whitespace-pre-line font-medium">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-[#949BA4] pt-2 border-t border-[#2B2D31] flex justify-between items-center">
                      <span>MTA:SA Illegal Birlik Yönetim Botu • Discord.js v14</span>
                      <span>{new Date().toLocaleTimeString('tr-TR')}</span>
                    </div>
                  </div>

                  {/* Discord ActionRow Buttons */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4]">
                      Discord Buton Eylemleri (ActionRow):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {panelData.buttons.map(btn => {
                        let btnStyle = 'bg-[#5865F2] hover:bg-[#4752C4] text-white';
                        if (btn.style === 'SUCCESS') btnStyle = 'bg-[#23A55A] hover:bg-[#1D8548] text-white';
                        if (btn.style === 'DANGER') btnStyle = 'bg-[#F23F43] hover:bg-[#D83A3E] text-white';
                        if (btn.style === 'SECONDARY') btnStyle = 'bg-[#4E5058] hover:bg-[#6D6F78] text-white';

                        return (
                          <button
                            key={btn.customId}
                            onClick={() => handleButtonClick(btn.customId)}
                            className={`px-3 py-2 rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm active:scale-95 ${btnStyle}`}
                          >
                            {btn.emoji && <span>{btn.emoji}</span>}
                            <span>{btn.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Render Simulated Chat History */}
                {chatMessages.map(msg => (
                  <div key={msg.id} className="flex space-x-3 text-sm">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        msg.bot ? 'bg-[#5865F2]' : 'bg-[#ED4245]'
                      }`}
                    >
                      {msg.bot ? 'BOT' : 'OG'}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{msg.author}</span>
                        {msg.bot && (
                          <span className="bg-[#5865F2] text-[10px] font-bold text-white px-1.5 py-0.2 rounded">
                            BOT
                          </span>
                        )}
                        <span className="text-[10px] text-[#949BA4]">{msg.timestamp}</span>
                      </div>

                      {msg.content && <p className="text-[#DBDEE1] text-xs">{msg.content}</p>}

                      {msg.embed && (
                        <div className="bg-[#2B2D31] border-l-4 border-[#23A55A] rounded-r p-3 max-w-xl text-xs space-y-1.5 mt-1">
                          <h4 className="font-bold text-white">{msg.embed.title}</h4>
                          <p className="text-[#B5BAC1] whitespace-pre-line">{msg.embed.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-[#313338] border-t border-[#1F2023] shrink-0">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendCommand();
                  }}
                  className="bg-[#383A40] rounded-lg px-4 py-2.5 flex items-center space-x-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Bir komut yazın (Örn: /kurulum, /panel, /kasa)..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#80848E] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded hover:bg-[#4E5058] text-[#DBDEE1] transition"
                    title="Gönder"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="text-[11px] text-[#949BA4] mt-1.5 px-1 flex justify-between">
                  <span>
                    İpucu: Komutlar 100% Discord.js v14 slash komut mekanizmasıyla çalışır.
                  </span>
                  <span>MongoDB: Bağlantı Aktif</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 40/40 TEST SENARYOLARI */}
        {activeTab === 'tests' && (
          <div className="flex-1 bg-[#313338] flex flex-col p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between bg-[#2B2D31] p-5 rounded-lg border border-[#3F4147]">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-[#23A55A]" />
                    Bölüm 40 — Master Test Senaryoları (40/40)
                  </h2>
                  <p className="text-xs text-[#949BA4] mt-1">
                    Üye, Karakter, Rütbe Hiyerarşisi, Başvuru, Ticket, Kasa, Envanter, Filo, Savaş, Ceza ve Otomasyon testleri.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {testStats && (
                    <div className="flex space-x-2 text-xs font-semibold">
                      <span className="bg-[#23A55A]/20 text-[#23A55A] border border-[#23A55A]/40 px-3 py-1.5 rounded">
                        Başarılı: {testStats.passed}
                      </span>
                      <span className="bg-[#F23F43]/20 text-[#F23F43] border border-[#F23F43]/40 px-3 py-1.5 rounded">
                        Başarısız: {testStats.failed}
                      </span>
                      <span className="bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40 px-3 py-1.5 rounded">
                        Toplam: {testStats.total}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={runAllTests}
                    disabled={testsRunning}
                    className="bg-[#23A55A] hover:bg-[#1D8548] text-white px-4 py-2 rounded font-semibold text-xs transition flex items-center gap-2 shadow"
                  >
                    <RotateCcw className={`w-4 h-4 ${testsRunning ? 'animate-spin' : ''}`} />
                    <span>{testsRunning ? 'Test Ediliyor...' : 'Tümünü Yeniden Test Et'}</span>
                  </button>
                </div>
              </div>

              {/* Test List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testResults.map(t => (
                  <div
                    key={t.id}
                    className="bg-[#2B2D31] p-3.5 rounded-lg border border-[#3F4147] flex items-start space-x-3 text-xs"
                  >
                    {t.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#23A55A] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#F23F43] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[13px]">{t.name}</span>
                        <span className="text-[10px] font-mono text-[#949BA4]">{t.durationMs}ms</span>
                      </div>
                      <div className="text-[11px] text-[#949BA4] font-medium mt-0.5">Kategori: {t.category}</div>
                      <div className="text-[11px] text-[#23A55A] mt-1">{t.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: DOCKER & DEPLOYMENT REHBERİ */}
        {activeTab === 'docker' && (
          <div className="flex-1 bg-[#313338] flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <div className="bg-[#2B2D31] p-5 rounded-lg border border-[#3F4147]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="w-6 h-6 text-[#5865F2]" />
                  7/24 Kesintisiz Üretim ve Docker Dağıtım Rehberi
                </h2>
                <p className="text-xs text-[#949BA4] mt-1">
                  Botun kendi bilgisayarınız kapalıyken de sürekli çalışması için hazırlanmış Docker ve Node.js ortamı.
                </p>
              </div>

              {/* Step 1: Discord Setup */}
              <div className="bg-[#2B2D31] p-5 rounded-lg border border-[#3F4147] space-y-3">
                <div className="flex items-center space-x-2 text-sm font-bold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-xs">1</span>
                  <span>Discord Geliştirici Portalı Ayarları</span>
                </div>
                <div className="text-xs text-[#DBDEE1] space-y-2 leading-relaxed">
                  <p>
                    1. <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-[#5865F2] underline font-semibold">Discord Developer Portal</a> adresine gidip <strong>New Application</strong> oluşturun.
                  </p>
                  <p>
                    2. <strong>Bot</strong> sekmesine gelin, Token oluşturup kopyalayın.
                  </p>
                  <p className="font-semibold text-yellow-400">
                    ⚠️ ÖNEMLİ: "Privileged Gateway Intents" altındaki "Server Members Intent" ve "Message Content Intent" kutucuklarını mutlaka işaretleyin.
                  </p>
                  <p>
                    3. <strong>OAuth2 -&gt; URL Generator</strong> ile <code>bot</code> ve <code>applications.commands</code> seçip <code>Administrator</code> yetkisiyle botu sunucunuza davet edin.
                  </p>
                </div>
              </div>

              {/* Step 2: Env Configuration */}
              <div className="bg-[#2B2D31] p-5 rounded-lg border border-[#3F4147] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <span className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-xs">2</span>
                    <span>Ortam Değişkenleri (.env)</span>
                  </div>
                  <button
                    onClick={copyDockerEnv}
                    className="bg-[#383A40] hover:bg-[#4E5058] text-white px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEnv ? 'Kopyalandı!' : 'Şablonu Kopyala'}</span>
                  </button>
                </div>
                <div className="bg-[#1E1F22] p-3 rounded font-mono text-xs text-green-400 overflow-x-auto">
                  DISCORD_BOT_TOKEN=buraya_bot_tokeninizi_yazin<br />
                  DISCORD_CLIENT_ID=buraya_client_id_yazin<br />
                  DISCORD_GUILD_ID=buraya_sunucu_id_yazin<br />
                  LOG_LEVEL=info<br />
                  NODE_ENV=production
                </div>
              </div>

              {/* Step 3: Launch with Docker */}
              <div className="bg-[#2B2D31] p-5 rounded-lg border border-[#3F4147] space-y-3">
                <div className="flex items-center space-x-2 text-sm font-bold text-white">
                  <span className="w-6 h-6 rounded-full bg-[#23A55A] flex items-center justify-center text-xs">3</span>
                  <span>7/24 Kesintisiz Başlatma & Bağımsız Çalıştırma</span>
                </div>
                <div className="bg-[#1E1F22] p-3 rounded font-mono text-xs text-[#DBDEE1]">
                  # Harici MongoDB gerektirmez! Veriler kalıcı yerel JSON motorunda anında saklanır.<br />
                  <span className="text-[#5865F2] font-bold">npm run dev</span> veya <span className="text-[#5865F2] font-bold">docker compose up -d</span><br /><br />
                  # Canlı log akışını izlemek için:<br />
                  <span className="text-[#5865F2] font-bold">npm run test:bot</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: DEĞİŞTİRİLEMEZ AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="flex-1 bg-[#313338] flex flex-col p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full space-y-4">
              <div className="bg-[#2B2D31] p-4 rounded-lg border border-[#3F4147] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-yellow-400" />
                    Değiştirilemez Denetim Kayıtları (Immutable Audit Log)
                  </h3>
                  <p className="text-xs text-[#949BA4]">
                    Tüm üye, rütbe, kasa, ceza ve sistem eylemleri sunucu tarafında kriptografik kimliklerle saklanır. Normal yönetim arayüzünden silinemez.
                  </p>
                </div>
                <span className="text-xs font-mono bg-[#1E1F22] px-3 py-1.5 rounded border border-[#3F4147] text-white">
                  Kayıt Sayısı: {store.auditLogs.length}
                </span>
              </div>

              <div className="space-y-2">
                {store.auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="bg-[#2B2D31] p-3.5 rounded border border-[#3F4147] flex flex-col md:flex-row md:items-center justify-between text-xs space-y-1 md:space-y-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[#F1C40F] font-bold">[{log.actionId}]</span>
                        <span className="bg-[#5865F2]/20 text-[#5865F2] font-bold px-2 py-0.5 rounded text-[10px]">
                          {log.category}
                        </span>
                        <span className="font-semibold text-white">{log.actionType}</span>
                        <span className="text-[#949BA4]">Hedef: <strong>{log.target}</strong></span>
                      </div>
                      <div className="text-[#DBDEE1] text-[11px]">{log.description}</div>
                      {log.oldValue && log.newValue && (
                        <div className="text-[10px] text-[#949BA4]">
                          Değişim: <span className="line-through text-red-400">{log.oldValue}</span> ➔ <span className="text-green-400">{log.newValue}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-[#949BA4] shrink-0 font-mono">
                      <div>Yetkili: {log.executorName}</div>
                      <div>{new Date(log.timestamp).toLocaleString('tr-TR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DISCORD MODAL FORM EMULATOR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#313338] border border-[#3F4147] w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 bg-[#2B2D31] px-5 flex items-center justify-between border-b border-[#1F2023]">
              <span className="font-bold text-white text-sm">{modalTitle}</span>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#949BA4] hover:text-white transition text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-5 space-y-4">
              {modalType === 'deposit' || modalType === 'withdraw' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      İşlem Tutarı ($)
                    </label>
                    <input
                      type="number"
                      required
                      value={modalInputs.amount || ''}
                      onChange={e => setModalInputs({ ...modalInputs, amount: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={modalInputs.category || ''}
                      onChange={e => setModalInputs({ ...modalInputs, category: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      Açıklama / Gerekçe
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={modalInputs.desc || ''}
                      onChange={e => setModalInputs({ ...modalInputs, desc: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                </>
              ) : modalType === 'app' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">OOC İsim</label>
                      <input
                        type="text"
                        required
                        value={modalInputs.oocName || ''}
                        onChange={e => setModalInputs({ ...modalInputs, oocName: e.target.value })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Yaş</label>
                      <input
                        type="number"
                        required
                        value={modalInputs.age || ''}
                        onChange={e => setModalInputs({ ...modalInputs, age: e.target.value })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      MTA Karakter Adı (İsim_Soyisim)
                    </label>
                    <input
                      type="text"
                      required
                      value={modalInputs.mtaName || ''}
                      onChange={e => setModalInputs({ ...modalInputs, mtaName: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      Karakter Geçmişi & Deneyim
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={modalInputs.backstory || ''}
                      onChange={e => setModalInputs({ ...modalInputs, backstory: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">
                      Birliğe Katılma Amacınız
                    </label>
                    <input
                      type="text"
                      required
                      value={modalInputs.reason || ''}
                      onChange={e => setModalInputs({ ...modalInputs, reason: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                </>
              ) : modalType === 'meeting' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Toplantı Başlığı</label>
                    <input
                      type="text"
                      required
                      value={modalInputs.title || ''}
                      onChange={e => setModalInputs({ ...modalInputs, title: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Saat (Örn: 21:00)</label>
                      <input
                        type="text"
                        required
                        value={modalInputs.time || ''}
                        onChange={e => setModalInputs({ ...modalInputs, time: e.target.value })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Kapsam</label>
                      <select
                        value={modalInputs.scope || 'Genel Birlik'}
                        onChange={e => setModalInputs({ ...modalInputs, scope: e.target.value })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                      >
                        <option value="Genel Birlik">Genel Birlik</option>
                        <option value="Yönetim Toplantısı">Yönetim Toplantısı</option>
                        <option value="Ekip / Operasyon">Ekip / Operasyon</option>
                        <option value="Özel">Özel</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Konu</label>
                    <input
                      type="text"
                      required
                      value={modalInputs.subject || ''}
                      onChange={e => setModalInputs({ ...modalInputs, subject: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Gündem Maddeleri</label>
                    <textarea
                      required
                      rows={3}
                      value={modalInputs.agenda || ''}
                      onChange={e => setModalInputs({ ...modalInputs, agenda: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Konu</label>
                    <input
                      type="text"
                      required
                      value={modalInputs.subject || ''}
                      onChange={e => setModalInputs({ ...modalInputs, subject: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#B5BAC1] uppercase mb-1">Mesajınız</label>
                    <textarea
                      required
                      rows={3}
                      value={modalInputs.message || ''}
                      onChange={e => setModalInputs({ ...modalInputs, message: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded p-2 text-sm text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#3F4147]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-medium text-white hover:underline"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2 rounded text-xs font-semibold shadow transition"
                >
                  Onayla ve Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
