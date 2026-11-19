import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';
import type {
  Campaign,
  CampaignGuide,
  ChatMessage,
  DiceRollRecord,
  Difficulty,
  PlayerAttributes,
} from './types/rpg';
import { createBlankCampaign, EMPTY_GUIDE, GM_CORE_RULES, HASHID_CAMPAIGN } from './data/presets';
import { ChatPanel } from './components/ChatPanel';
import { NotepadPanel } from './components/NotepadPanel';
import { DicePanel } from './components/DicePanel';
import { DieIcon } from './components/DieIcon';
import { RulesModal } from './components/RulesModal';
import { CampaignsModal } from './components/CampaignsModal';
import { NewCampaignModal } from './components/NewCampaignModal';
import { SettingsModal } from './components/SettingsModal';
import { narrator } from './services/narrator/narrator';
import { apiUrl } from './utils/api';
import { difficultyPrompt } from './data/difficulty';
import {
  setBackgroundMusicVolume,
  startBackgroundMusic,
  stopBackgroundMusic,
} from './utils/sound';

const STORAGE_KEY_CAMPAIGNS = 'cronica_dado_campaigns_v1';
const STORAGE_KEY_ACTIVE_ID = 'cronica_dado_active_campaign_v1';
const STORAGE_KEY_THEME = 'cronica_dado_theme_v1';
const STORAGE_KEY_FONT_SIZE = 'cronica_dado_chat_font_size_v1';
const STORAGE_KEY_MUSIC_VOLUME = 'cronica_dado_music_volume_v1';

type ActivePane = 'chat' | 'notes' | 'dice';
type DesktopDrawer = 'notes' | 'dice' | null;

function hydrateCampaignGuide(camp: Campaign): Campaign {
  if (camp.guide) return camp;
  return {
    ...camp,
    guide: camp.id.includes('hashid') ? HASHID_CAMPAIGN.guide : { ...EMPTY_GUIDE },
  };
}

function loadInitialCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    if (raw) {
      const parsed = JSON.parse(raw) as Campaign[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(hydrateCampaignGuide);
      }
    }
  } catch {
    // Fallback to default preset
  }
  return [HASHID_CAMPAIGN];
}

function loadInitialActiveId(campaigns: Campaign[]): string {
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (savedId && campaigns.some((c) => c.id === savedId)) {
      return savedId;
    }
  } catch {
    // Ignore storage error
  }
  return campaigns[0].id;
}

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadInitialCampaigns());
  const [activeCampaignId, setActiveCampaignId] = useState<string>(() =>
    loadInitialActiveId(loadInitialCampaigns())
  );
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  // Mobile fullscreen view switcher (controlled via right-thumb floating dock)
  const [mobileView, setMobileView] = useState<ActivePane>('chat');
  // Desktop clean Chat-first layout with side panel toggle (Notes / Dice / Collapsed)
  const [desktopDrawer, setDesktopDrawer] = useState<DesktopDrawer>('notes');

  const [draft, setDraft] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isSyncingGuide, setIsSyncingGuide] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [campaignsOpen, setCampaignsOpen] = useState<boolean>(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [chatFontSize, setChatFontSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY_FONT_SIZE));
      return saved >= 12 && saved <= 22 ? saved : 15;
    } catch {
      return 15;
    }
  });

  const [musicEnabled, setMusicEnabled] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY_MUSIC_VOLUME));
      return saved >= 0.05 && saved <= 1 ? saved : 0.35;
    } catch {
      return 0.35;
    }
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) ?? campaigns[0],
    [campaigns, activeCampaignId]
  );

  // Sync HTML .dark class and persist theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  // Persist campaigns and active id
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeCampaignId);
    } catch {
      // Ignore quota errors
    }
  }, [campaigns, activeCampaignId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(chatFontSize));
    } catch {
      // Ignore storage error
    }
  }, [chatFontSize]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MUSIC_VOLUME, String(musicVolume));
    } catch {
      // Ignore storage error
    }
    if (musicEnabled) {
      setBackgroundMusicVolume(musicVolume);
    }
  }, [musicVolume, musicEnabled]);

  useEffect(() => {
    return () => {
      stopBackgroundMusic();
    };
  }, []);

  const handleToggleMusic = () => {
    setMusicEnabled((prev) => {
      const next = !prev;
      if (next) {
        startBackgroundMusic(musicVolume);
      } else {
        stopBackgroundMusic();
      }
      return next;
    });
  };

  const updateActiveCampaign = (updater: (prev: Campaign) => Campaign) => {
    setCampaigns((prevList) =>
      prevList.map((camp) =>
        camp.id === activeCampaign.id
          ? { ...updater(camp), updatedAt: new Date().toISOString() }
          : camp
      )
    );
  };

  const handleInsertRollToChat = (formattedRoll: string) => {
    setDraft((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${formattedRoll} ` : `${formattedRoll} `;
    });
    setMobileView('chat');
  };

  const handleQuickSaveToNotes = (excerpt: string) => {
    updateActiveCampaign((camp) => {
      const targetTab =
        camp.notes.find((n) => /invent[aá]rio|di[aá]rio/i.test(n.title)) ?? camp.notes[0];
      if (!targetTab) return camp;
      const stamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const addition = `\n* [${stamp}] ${excerpt}`;
      return {
        ...camp,
        notes: camp.notes.map((n) =>
          n.id === targetTab.id ? { ...n, content: `${n.content.trimEnd()}${addition}` } : n
        ),
      };
    });
  };

  const buildSystemPrompt = (campaign: Campaign): string => {
    const parts = [GM_CORE_RULES];
    if (campaign.gmContextNotes.trim()) {
      parts.push(`\n### CONTEXTO ESPECÍFICO DA CAMPANHA\n${campaign.gmContextNotes.trim()}`);
    }
    parts.push(difficultyPrompt(campaign.difficulty));
    return parts.join('\n');
  };

  const streamGmResponse = async (
    historyForApi: { role: 'user' | 'model'; text: string }[],
    campaignSnapshot: Campaign
  ) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setErrorMessage(null);

    // Narração por voz: começa junto com o texto (ajustes técnicos nunca são narrados).
    const lastUserText = [...historyForApi].reverse().find((m) => m.role === 'user')?.text ?? '';
    if (lastUserText.toLowerCase().startsWith('ajuste técnico:')) {
      narrator.stop();
    } else {
      narrator.begin();
    }

    const modelMessageId = `msg-gm-${Date.now()}`;
    const placeholderMsg: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      createdAt: new Date().toISOString(),
    };

    updateActiveCampaign((camp) => ({
      ...camp,
      messages: [...camp.messages, placeholderMsg],
    }));

    try {
      const response = await fetch(apiUrl('/api/gm/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(campaignSnapshot),
          messages: historyForApi,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Resposta sem fluxo de dados do servidor.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              narrator.feed(accumulatedText);
              updateActiveCampaign((camp) => ({
                ...camp,
                messages: camp.messages.map((m) =>
                  m.id === modelMessageId ? { ...m, text: accumulatedText } : m
                ),
              }));
            }
          } catch (innerErr) {
            if (innerErr instanceof Error && innerErr.message && !innerErr.message.includes('JSON')) {
              throw innerErr;
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        throw new Error('O Mestre retornou uma resposta vazia. Tente enviar novamente.');
      }

      narrator.finish(accumulatedText);

      const lastUserMsg = [...historyForApi].reverse().find((m) => m.role === 'user');
      const wasTechAdjustment = lastUserMsg?.text.toLowerCase().startsWith('ajuste técnico:');
      if (!wasTechAdjustment) {
        const recentSlice = [...historyForApi.slice(-4), { role: 'model' as const, text: accumulatedText }];
        void syncCampaignGuide(campaignSnapshot.id, campaignSnapshot.guide ?? EMPTY_GUIDE, recentSlice);
      }
    } catch (err: unknown) {
      narrator.stop();
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Falha na conexão com o Mestre.';
      setErrorMessage(message);
      updateActiveCampaign((camp) => ({
        ...camp,
        messages: camp.messages.filter((m) => m.id !== modelMessageId || m.text.trim().length > 0),
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const syncCampaignGuide = async (
    targetCampaignId: string,
    currentGuide: CampaignGuide,
    recentMessages: { role: 'user' | 'model'; text: string }[]
  ) => {
    if (recentMessages.length === 0) return;
    setIsSyncingGuide(true);
    try {
      const response = await fetch(apiUrl('/api/gm/update-guide'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentGuide,
          recentMessages,
        }),
      });
      if (!response.ok) return;
      const updatedGuide = (await response.json()) as CampaignGuide;
      if (updatedGuide && Array.isArray(updatedGuide.currentQuests)) {
        setCampaigns((prevList) =>
          prevList.map((camp) =>
            camp.id === targetCampaignId
              ? { ...camp, guide: updatedGuide, updatedAt: new Date().toISOString() }
              : camp
          )
        );
      }
    } catch {
      // Background sync should never interrupt gameplay
    } finally {
      setIsSyncingGuide(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isStreaming) return;

    const isTech = trimmed.toLowerCase().startsWith('ajuste técnico:');
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
      isTechnicalAdjustment: isTech,
    };

    const nextMessages = [...activeCampaign.messages, userMsg];
    const snapshot: Campaign = {
      ...activeCampaign,
      messages: nextMessages,
    };

    updateActiveCampaign((camp) => ({
      ...camp,
      messages: [...camp.messages, userMsg],
    }));

    setDraft('');

    const apiHistory = nextMessages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    await streamGmResponse(apiHistory, snapshot);
  };

  const handleRetryLastTurn = async () => {
    if (isStreaming) return;
    const msgs = activeCampaign.messages;
    if (msgs.length === 0) return;
    const apiHistory = msgs.map((m) => ({
      role: m.role,
      text: m.text,
    }));
    await streamGmResponse(apiHistory, activeCampaign);
  };

  const handleExportTranscript = () => {
    const lines = [
      `# ${activeCampaign.title}`,
      `${activeCampaign.subtitle} · ${activeCampaign.universe}`,
      '',
      '---',
      '',
      ...activeCampaign.messages.map((m) => {
        const author =
          m.role === 'model'
            ? '### Mestre'
            : m.isTechnicalAdjustment
              ? '### Ajuste Técnico'
              : '### Jogador';
        return `${author}\n\n${m.text}\n`;
      }),
      '---',
      '',
      '## Bloco de Notas',
      '',
      ...activeCampaign.notes.map((n) => `### ${n.title}\n\n${n.content}\n`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCampaign.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cronica.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateBlankCampaign = (title: string, attrs: PlayerAttributes, difficulty: Difficulty) => {
    const fresh = createBlankCampaign(title, attrs, difficulty);
    setCampaigns((prev) => [fresh, ...prev]);
    setActiveCampaignId(fresh.id);
    setErrorMessage(null);
    setDraft('');
    setMobileView('chat');
  };

  const handleCreateHashidPreset = (difficulty: Difficulty) => {
    const clone: Campaign = {
      ...HASHID_CAMPAIGN,
      difficulty,
      id: `campaign-hashid-${Date.now()}`,
      title: 'Oásis da Ravina (Nova Cópia)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: HASHID_CAMPAIGN.notes.map((n) => ({ ...n })),
      messages: HASHID_CAMPAIGN.messages.map((m) => ({ ...m })),
      rollHistory: [],
    };
    setCampaigns((prev) => [clone, ...prev]);
    setActiveCampaignId(clone.id);
    setErrorMessage(null);
    setDraft('');
    setMobileView('chat');
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) return prev;
      if (id === activeCampaignId) {
        setActiveCampaignId(remaining[0].id);
      }
      return remaining;
    });
  };

  const toggleDesktopDrawer = (target: 'notes' | 'dice') => {
    setDesktopDrawer((prev) => (prev === target ? null : target));
  };

  const renderNotepad = () => (
    <NotepadPanel
      notes={activeCampaign.notes}
      activeNoteId={activeCampaign.activeNoteId}
      onSelectNote={(id) => updateActiveCampaign((camp) => ({ ...camp, activeNoteId: id }))}
      onUpdateNoteContent={(id, content) =>
        updateActiveCampaign((camp) => ({
          ...camp,
          notes: camp.notes.map((n) => (n.id === id ? { ...n, content } : n)),
        }))
      }
      onRenameNote={(id, title) =>
        updateActiveCampaign((camp) => ({
          ...camp,
          notes: camp.notes.map((n) => (n.id === id ? { ...n, title } : n)),
        }))
      }
      onAddNote={() => {
        const newTabId = `tab-${Date.now()}`;
        updateActiveCampaign((camp) => ({
          ...camp,
          notes: [
            ...camp.notes,
            {
              id: newTabId,
              title: `Nota ${camp.notes.length + 1}`,
              content: '',
            },
          ],
          activeNoteId: newTabId,
        }));
      }}
      onDeleteNote={(id) =>
        updateActiveCampaign((camp) => {
          const filtered = camp.notes.filter((n) => n.id !== id);
          if (filtered.length === 0) return camp;
          return {
            ...camp,
            notes: filtered,
            activeNoteId: camp.activeNoteId === id ? filtered[0].id : camp.activeNoteId,
          };
        })
      }
    />
  );

  const renderDice = () => (
    <DicePanel
      attributes={activeCampaign.attributes}
      onUpdateAttributes={(next) =>
        updateActiveCampaign((camp) => ({ ...camp, attributes: next }))
      }
      rollHistory={activeCampaign.rollHistory}
      onAddRoll={(record: DiceRollRecord) =>
        updateActiveCampaign((camp) => ({
          ...camp,
          rollHistory: [record, ...camp.rollHistory].slice(0, 40),
        }))
      }
      onClearHistory={() => updateActiveCampaign((camp) => ({ ...camp, rollHistory: [] }))}
      onInsertRollToChat={handleInsertRollToChat}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F6F6F4] dark:bg-[#111317] text-zinc-900 dark:text-zinc-100">
      {/* Strict 3-Zone Top Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between gap-2 sm:gap-8 px-3.5 sm:px-5 border-b border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#16181D]">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#mesa"
          onClick={(e) => {
            e.preventDefault();
            setMobileView('chat');
          }}
          className="font-display text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0"
        >
          Crônica &amp; Dado
        </a>

        {/* Zone 2: Theme & Settings */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Configurações"
            aria-label="Configurações"
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setNewCampaignOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Nova Campanha
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative flex-1 min-h-0 flex overflow-hidden">
        {/* Chat Primary Area (always visible on desktop; active screen on mobile when mobileView === 'chat') */}
        <div
          className={`flex-1 min-w-0 h-full ${
            mobileView === 'chat' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ChatPanel
            campaign={activeCampaign}
            draft={draft}
            onDraftChange={setDraft}
            isStreaming={isStreaming}
            errorMessage={errorMessage}
            onSendMessage={handleSendMessage}
            onRetryLastTurn={handleRetryLastTurn}
            onExportTranscript={handleExportTranscript}
            onQuickSaveToNotes={handleQuickSaveToNotes}
            activeDrawer={desktopDrawer}
            onOpenNotes={() => {
              if (window.innerWidth < 1024) {
                setMobileView('notes');
              } else {
                toggleDesktopDrawer('notes');
              }
            }}
            onOpenDice={() => {
              if (window.innerWidth < 1024) {
                setMobileView('dice');
              } else {
                toggleDesktopDrawer('dice');
              }
            }}
            onOpenCampaigns={() => setCampaignsOpen(true)}
            onOpenRules={() => setRulesOpen(true)}
            chatFontSize={chatFontSize}
          />
        </div>

        {/* Desktop Side Panel (Notes or Dice, collapsible to pure Chat) */}
        {desktopDrawer !== null && (
          <div className="hidden lg:flex w-[420px] xl:w-[460px] shrink-0 h-full flex-col border-l border-zinc-200 dark:border-[#262932]">
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-[#262932] bg-zinc-50 dark:bg-[#14161B]">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-200/75 dark:bg-[#1C1F26]">
                <button
                  type="button"
                  onClick={() => setDesktopDrawer('notes')}
                  title="Bloco de Notas"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    desktopDrawer === 'notes'
                      ? 'bg-white dark:bg-[#2A2E38] text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Notas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopDrawer('dice')}
                  title="Dados RPG"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    desktopDrawer === 'dice'
                      ? 'bg-white dark:bg-[#2A2E38] text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <DieIcon sides={20} className="w-3.5 h-3.5" />
                  <span>Dados</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDesktopDrawer(null)}
                title="Minimizar painel lateral"
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-[#22252D]"
                aria-label="Minimizar painel lateral"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {desktopDrawer === 'notes' ? renderNotepad() : renderDice()}
            </div>
          </div>
        )}

        {/* Desktop Right-Edge Quick Rail when drawer is collapsed */}
        {desktopDrawer === null && (
          <div className="hidden lg:flex flex-col items-center gap-2 p-2 border-l border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#16181D] shrink-0">
            <button
              type="button"
              onClick={() => toggleDesktopDrawer('dice')}
              title="Abrir Dados de Mesa"
              className="w-11 h-11 rounded-lg border border-zinc-200 dark:border-[#2A2E38] hover:border-amber-500 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
              aria-label="Abrir Dados de Mesa"
            >
              <DieIcon sides={20} className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => toggleDesktopDrawer('notes')}
              title="Abrir Bloco de Notas"
              className="w-11 h-11 rounded-lg border border-zinc-200 dark:border-[#2A2E38] hover:border-amber-500 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              aria-label="Abrir Bloco de Notas"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setDesktopDrawer('notes')}
              title="Expandir painel lateral"
              className="mt-auto w-11 h-11 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Expandir painel lateral"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile Fullscreen Notepad & Dice Views + Compact Icon Switcher */}
        {mobileView !== 'chat' && (
          <div className="lg:hidden w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              {mobileView === 'notes' ? renderNotepad() : renderDice()}
            </div>
            <div className="shrink-0 h-12 border-t border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#16181D] px-6 flex items-center justify-around">
              <button
                type="button"
                onClick={() => setMobileView('chat')}
                aria-label="Voltar ao Chat"
                title="Voltar ao Chat"
                className="w-11 h-9 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileView('notes')}
                aria-label="Bloco de Notas"
                title="Bloco de Notas"
                className={`w-11 h-9 rounded-lg flex items-center justify-center ${
                  mobileView === 'notes'
                    ? 'bg-amber-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileView('dice')}
                aria-label="Dados RPG"
                title="Dados RPG"
                className={`w-11 h-9 rounded-lg flex items-center justify-center ${
                  mobileView === 'dice'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <DieIcon sides={20} className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      <RulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        guide={activeCampaign.guide ?? EMPTY_GUIDE}
        isSyncing={isSyncingGuide}
        onSyncGuide={() => {
          const recent = activeCampaign.messages
            .filter((m) => !m.isTechnicalAdjustment)
            .slice(-8)
            .map((m) => ({ role: m.role, text: m.text }));
          void syncCampaignGuide(
            activeCampaign.id,
            activeCampaign.guide ?? EMPTY_GUIDE,
            recent
          );
        }}
      />

      <CampaignsModal
        open={campaignsOpen}
        onClose={() => setCampaignsOpen(false)}
        campaigns={campaigns}
        activeCampaignId={activeCampaign.id}
        onSelectCampaign={(id) => {
          setActiveCampaignId(id);
          setErrorMessage(null);
          setMobileView('chat');
        }}
        onDeleteCampaign={handleDeleteCampaign}
        onOpenNewCampaign={() => setNewCampaignOpen(true)}
        onImportCampaign={(camp) => {
          setCampaigns((prev) => [camp, ...prev]);
          setActiveCampaignId(camp.id);
          setMobileView('chat');
        }}
      />

      <NewCampaignModal
        open={newCampaignOpen}
        onClose={() => setNewCampaignOpen(false)}
        onCreateBlank={handleCreateBlankCampaign}
        onCreateHashidPreset={handleCreateHashidPreset}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        chatFontSize={chatFontSize}
        onChangeChatFontSize={setChatFontSize}
        musicEnabled={musicEnabled}
        onToggleMusic={handleToggleMusic}
        musicVolume={musicVolume}
        onChangeMusicVolume={setMusicVolume}
      />
    </div>
  );
}
