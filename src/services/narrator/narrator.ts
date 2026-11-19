import { getCachedAudio, hashKey, putCachedAudio } from './audioCache';
import {
  fitToBudget,
  isTechnicalAck,
  narrativeOf,
  splitLong,
  takeCompleteSentences,
} from './text';

export type NarratorMode = 'elevenlabs' | 'offline' | 'text';

export interface NarratorSettings {
  enabled: boolean;
  mode: NarratorMode;
  volume: number; // 0..1
  voiceId: string; // vazio = voz padrão do servidor (ELEVENLABS_VOICE_ID)
  voiceName: string;
  maxChars: number; // limite de caracteres narrados por evento
  onlyImportant: boolean; // só narra cenas longas
  offlineVoiceURI: string;
}

export interface ElevenStatus {
  configured: boolean;
  hasDefaultVoice: boolean;
  model: string;
  usage: {
    month: string;
    estimatedCredits: number;
    estimatedChars: number;
    monthlyCreditBudget: number;
  };
}

export interface NarratorState {
  settings: NarratorSettings;
  generating: boolean; // há áudio sendo gerado pela ElevenLabs
  playing: boolean;
  paused: boolean;
  usingFallback: boolean; // ElevenLabs indisponível → narrador offline/texto
  notice: string | null;
  offlineAvailable: boolean;
  offlineVoiceName: string | null;
  offlineIsLocal: boolean;
  eleven: ElevenStatus | null;
  hasLast: boolean;
}

const STORAGE_KEY = 'cronica_dado_narrator_v1';
const MIN_CHUNK_CHARS = 90; // agrupa frases curtas p/ prosódia melhor e menos requisições
const IMPORTANT_MIN_CHARS = 300;
const MAX_PARALLEL_FETCH = 2;
const TEST_TEXT = 'Que os ventos do norte guiem seus passos, aventureiro. A jornada começa agora.';

const DEFAULTS: NarratorSettings = {
  enabled: false,
  mode: 'elevenlabs',
  volume: 0.9,
  voiceId: '',
  voiceName: '',
  maxChars: 400,
  onlyImportant: false,
  offlineVoiceURI: '',
};

type Engine = 'elevenlabs' | 'offline' | 'text';

interface Item {
  text: string;
  audio?: Promise<Blob | null>;
}

interface Session {
  id: number;
  controller: AbortController;
  engine: Engine;
  queue: Item[];
  consumed: number;
  pending: string;
  budgetLeft: number;
  exhausted: boolean;
  gateOpen: boolean;
  finished: boolean;
  elevenFailed: boolean;
  spoken: string[];
  wake: (() => void) | null;
}

function loadSettings(): NarratorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NarratorSettings>) };
      s.volume = Math.min(1, Math.max(0, Number(s.volume) || DEFAULTS.volume));
      s.maxChars = Math.min(1500, Math.max(100, Number(s.maxChars) || DEFAULTS.maxChars));
      return s;
    }
  } catch {
    // usa padrões
  }
  return { ...DEFAULTS };
}

const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export class NarratorService {
  private state: NarratorState;
  private listeners = new Set<() => void>();
  private session: Session | null = null;
  private sessionSeq = 0;
  private lastChunks: string[] = [];
  private audioEl: HTMLAudioElement | null = null;
  private stopPlayback: (() => void) | null = null;
  private inflight = new Map<string, Promise<Blob | null>>();
  private fetchActive = 0;
  private fetchWaiters: (() => void)[] = [];

  constructor() {
    this.state = {
      settings: loadSettings(),
      generating: false,
      playing: false,
      paused: false,
      usingFallback: false,
      notice: null,
      offlineAvailable: false,
      offlineVoiceName: null,
      offlineIsLocal: false,
      eleven: null,
      hasLast: false,
    };
    if (speechSupported()) {
      this.refreshOfflineVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.refreshOfflineVoices());
    }
    void this.refreshStatus();
  }

  // ---- store -----------------------------------------------------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<NarratorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  updateSettings(patch: Partial<NarratorSettings>) {
    const settings = { ...this.state.settings, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignora
    }
    if (this.audioEl) this.audioEl.volume = settings.volume;
    this.set({ settings, notice: null });
    if (patch.offlineVoiceURI !== undefined) this.refreshOfflineVoices();
    if (patch.enabled === false || patch.mode === 'text') this.stop();
    if (patch.enabled) this.unlockAudio();
  }

  // ---- status / vozes ---------------------------------------------------------
  async refreshStatus() {
    try {
      const r = await fetch('/api/narracao/status');
      if (!r.ok) throw new Error(String(r.status));
      const s = (await r.json()) as ElevenStatus;
      this.set({ eleven: s });
    } catch {
      this.set({ eleven: null });
    }
  }

  async listElevenVoices(): Promise<{ voiceId: string; name: string; labels: Record<string, string> }[]> {
    const r = await fetch('/api/narracao/voices');
    const data = (await r.json().catch(() => ({}))) as {
      voices?: { voiceId: string; name: string; labels: Record<string, string> }[];
      error?: string;
    };
    if (!r.ok) throw new Error(data.error || `Erro ${r.status}`);
    return data.voices ?? [];
  }

  getOfflineVoices(): SpeechSynthesisVoice[] {
    if (!speechSupported()) return [];
    return window.speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang));
  }

  private pickOfflineVoice(): SpeechSynthesisVoice | null {
    const voices = this.getOfflineVoices();
    if (voices.length === 0) return null;
    const chosen = voices.find((v) => v.voiceURI === this.state.settings.offlineVoiceURI);
    if (chosen) return chosen;
    const male = /antonio|antônio|daniel|ricardo|felipe|jorge|paulo|helio|hélio|male|masc/i;
    const score = (v: SpeechSynthesisVoice) =>
      (/pt[-_]br/i.test(v.lang) ? 4 : 0) + (v.localService ? 2 : 0) + (male.test(v.name) ? 1 : 0);
    return [...voices].sort((a, b) => score(b) - score(a))[0];
  }

  private refreshOfflineVoices() {
    const v = this.pickOfflineVoice();
    this.set({
      offlineAvailable: Boolean(v),
      offlineVoiceName: v?.name ?? null,
      offlineIsLocal: Boolean(v?.localService),
    });
  }

  // ---- escolha de motor -------------------------------------------------------
  private resolveEngine(): { engine: Engine; fallback: boolean; notice: string | null } {
    const { settings, eleven, offlineAvailable, offlineIsLocal } = this.state;
    if (settings.mode === 'text') return { engine: 'text', fallback: false, notice: null };

    const offlineOk = offlineAvailable && (offlineIsLocal || navigator.onLine !== false);
    if (settings.mode === 'offline') {
      return offlineOk
        ? { engine: 'offline', fallback: false, notice: null }
        : { engine: 'text', fallback: false, notice: 'Nenhuma voz pt-BR disponível neste navegador. Modo somente texto.' };
    }

    const elevenDown =
      navigator.onLine === false || (eleven !== null && (!eleven.configured || (!settings.voiceId && !eleven.hasDefaultVoice)));
    if (!elevenDown) return { engine: 'elevenlabs', fallback: false, notice: null };

    const why =
      navigator.onLine === false
        ? 'Sem internet'
        : eleven && !eleven.configured
          ? 'ElevenLabs não configurada'
          : 'Nenhuma voz da ElevenLabs definida';
    return offlineOk
      ? { engine: 'offline', fallback: true, notice: `${why}: usando o narrador offline.` }
      : { engine: 'text', fallback: true, notice: `${why} e sem voz offline: somente texto.` };
  }

  // ---- API pública de narração ------------------------------------------------
  /** Chamar no início de uma resposta do mestre (antes do primeiro trecho). */
  begin(force = false) {
    this.stop();
    if (!force && !this.state.settings.enabled) return;
    const { engine, fallback, notice } = this.resolveEngine();
    this.set({ usingFallback: fallback, notice });
    if (engine === 'text') return;
    this.session = {
      id: ++this.sessionSeq,
      controller: new AbortController(),
      engine,
      queue: [],
      consumed: 0,
      pending: '',
      budgetLeft: this.state.settings.maxChars,
      exhausted: false,
      gateOpen: !this.state.settings.onlyImportant,
      finished: false,
      elevenFailed: false,
      spoken: [],
      wake: null,
    };
    void this.pump(this.session);
  }

  /** Chamar a cada atualização do texto em streaming (texto COMPLETO até agora). */
  feed(fullText: string) {
    const s = this.session;
    if (!s || s.finished) return;
    const cleaned = narrativeOf(fullText);
    if (isTechnicalAck(cleaned)) return this.stop();
    if (!s.gateOpen) {
      if (cleaned.length < IMPORTANT_MIN_CHARS) return;
      s.gateOpen = true;
    }
    const { sentences, next } = takeCompleteSentences(cleaned, s.consumed);
    s.consumed = next;
    for (const sentence of sentences) {
      s.pending += (s.pending ? ' ' : '') + sentence;
      if (s.pending.length >= MIN_CHUNK_CHARS) this.flush(s);
    }
  }

  /** Chamar quando o texto terminou de chegar. */
  finish(fullText: string) {
    const s = this.session;
    if (!s || s.finished) return;
    const cleaned = narrativeOf(fullText).trim();
    if (isTechnicalAck(cleaned) || (!s.gateOpen && cleaned.length < IMPORTANT_MIN_CHARS)) {
      return this.stop();
    }
    const rest = cleaned.slice(s.consumed).trim();
    if (rest) s.pending += (s.pending ? ' ' : '') + rest;
    this.flush(s);
    s.finished = true;
    this.lastChunks = s.spoken;
    this.set({ hasLast: s.spoken.length > 0 });
    s.wake?.();
  }

  /** Narra um texto já pronto (mensagem antiga ou teste), respeitando o limite de caracteres. */
  narrateText(text: string, force = false) {
    this.begin(force);
    this.feed(text + '\n');
    this.finish(text);
  }

  replay() {
    if (this.lastChunks.length === 0) return;
    this.begin(true);
    const s = this.session;
    if (!s) return;
    s.budgetLeft = Number.POSITIVE_INFINITY; // já foi limitado na primeira vez
    this.lastChunks.forEach((t) => this.enqueue(s, t));
    s.finished = true;
    s.wake?.();
  }

  testVoice() {
    this.begin(true);
    const s = this.session;
    if (!s) return;
    s.budgetLeft = Number.POSITIVE_INFINITY;
    this.enqueue(s, TEST_TEXT);
    s.finished = true;
    s.wake?.();
  }

  pause() {
    this.audioEl?.pause();
    if (speechSupported()) window.speechSynthesis.pause();
    if (this.state.playing) this.set({ paused: true });
  }

  resume() {
    void this.audioEl?.play().catch(() => undefined);
    if (speechSupported()) window.speechSynthesis.resume();
    this.set({ paused: false });
  }

  stop() {
    const s = this.session;
    this.session = null;
    if (s) {
      s.controller.abort();
      s.finished = true;
      s.wake?.();
    }
    this.stopPlayback?.();
    if (speechSupported()) window.speechSynthesis.cancel();
    this.set({ playing: false, paused: false, generating: false });
  }

  /** Desbloqueia o áudio do navegador a partir de um gesto do usuário. */
  unlockAudio() {
    try {
      if (!this.audioEl) this.audioEl = new Audio();
      // wav mudo mínimo
      this.audioEl.src =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      void this.audioEl.play().catch(() => undefined);
    } catch {
      // ignora
    }
  }

  // ---- internos ---------------------------------------------------------------
  private flush(s: Session) {
    const text = s.pending.trim();
    s.pending = '';
    if (!text) return;
    for (const part of splitLong(text)) {
      if (s.exhausted || s.budgetLeft <= 0) {
        s.exhausted = true;
        return;
      }
      const fitted = fitToBudget(part, s.budgetLeft);
      if (fitted.length < part.length) s.exhausted = true;
      s.budgetLeft -= fitted.length + 1;
      this.enqueue(s, fitted);
    }
  }

  private enqueue(s: Session, text: string) {
    const item: Item = { text };
    if (s.engine === 'elevenlabs') item.audio = this.fetchAudio(text, s);
    s.queue.push(item);
    s.spoken.push(text);
    s.wake?.();
  }

  private async withFetchSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (this.fetchActive >= MAX_PARALLEL_FETCH) {
      await new Promise<void>((resolve) => this.fetchWaiters.push(resolve));
    }
    this.fetchActive++;
    this.set({ generating: true });
    try {
      return await fn();
    } finally {
      this.fetchActive--;
      this.fetchWaiters.shift()?.();
      if (this.fetchActive === 0) this.set({ generating: false });
    }
  }

  private fetchAudio(text: string, s: Session): Promise<Blob | null> {
    const { voiceId } = this.state.settings;
    const model = this.state.eleven?.model ?? 'default';

    const run = async (): Promise<Blob | null> => {
      const key = await hashKey([model, voiceId, text]);
      const cached = await getCachedAudio(key);
      if (cached) return cached;
      const shared = this.inflight.get(key);
      if (shared) return shared;

      const job = this.withFetchSlot(async () => {
        if (s.elevenFailed || s.controller.signal.aborted) return null;
        try {
          const r = await fetch('/api/narracao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: s.controller.signal,
            body: JSON.stringify({ text, voiceId: voiceId || undefined }),
          });
          if (!r.ok) {
            const err = (await r.json().catch(() => ({}))) as { code?: string; error?: string };
            s.elevenFailed = true;
            this.set({ notice: err.error || `Falha na ElevenLabs (${r.status}).` });
            if (err.code === 'not_configured' || err.code === 'budget_exceeded' || err.code === 'invalid_voice') {
              void this.refreshStatus();
            }
            return null;
          }
          const blob = await r.blob();
          void putCachedAudio(key, blob);
          void this.refreshStatus(); // atualiza a estimativa de consumo
          return blob;
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) {
            s.elevenFailed = true;
            this.set({ notice: 'Sem conexão com o servidor de voz.' });
          }
          return null;
        }
      });
      this.inflight.set(key, job);
      try {
        return await job;
      } finally {
        this.inflight.delete(key);
      }
    };
    return run();
  }

  private async pump(s: Session) {
    while (this.session === s) {
      const item = s.queue.shift();
      if (!item) {
        if (s.finished) break;
        await new Promise<void>((resolve) => (s.wake = resolve));
        s.wake = null;
        continue;
      }

      if (s.engine === 'elevenlabs') {
        const blob = await item.audio;
        if (this.session !== s) break;
        if (blob) {
          this.set({ playing: true, paused: false });
          const ok = await this.playBlob(blob, s);
          if (!ok) break;
          continue;
        }
        // ElevenLabs falhou: alterna automaticamente para offline, se houver voz; senão só texto.
        const offline = this.state.offlineAvailable;
        s.engine = offline ? 'offline' : 'text';
        this.set({
          usingFallback: true,
          notice: offline
            ? `${this.state.notice ?? 'ElevenLabs indisponível'} — usando o narrador offline.`
            : `${this.state.notice ?? 'ElevenLabs indisponível'} — somente texto.`,
        });
        if (!offline) {
          s.queue.length = 0;
          break;
        }
      }

      if (s.engine === 'offline') {
        this.set({ playing: true, paused: false });
        await this.speak(item.text);
      }
    }
    if (this.session === s) {
      this.session = null;
      this.set({ playing: false, paused: false });
    }
  }

  private playBlob(blob: Blob, s: Session): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.audioEl) this.audioEl = new Audio();
      const audio = this.audioEl;
      const url = URL.createObjectURL(blob);
      const done = (ok: boolean) => {
        audio.onended = null;
        audio.onerror = null;
        this.stopPlayback = null;
        URL.revokeObjectURL(url);
        resolve(ok);
      };
      this.stopPlayback = () => {
        audio.pause();
        done(false);
      };
      audio.onended = () => done(true);
      audio.onerror = () => done(this.session === s);
      audio.src = url;
      audio.volume = this.state.settings.volume;
      audio.play().catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
          this.set({ notice: 'O navegador bloqueou o áudio. Clique em "Repetir" para ouvir a narração.' });
        }
        done(false);
      });
    });
  }

  private speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!speechSupported()) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voice = this.pickOfflineVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'pt-BR';
      u.rate = 0.92;
      u.pitch = 0.85; // um pouco mais grave
      u.volume = this.state.settings.volume;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
}

export const narrator = new NarratorService();
