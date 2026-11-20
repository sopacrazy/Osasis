import { apiFetch } from '../../utils/api';
import { getCachedAudio, hashKey, putCachedAudio } from './audioCache';
import { classifyStyle, type NarrationStyle, type SceneContext } from './style';
import {
  fitToBudget,
  isTechnicalAck,
  narrativeOf,
  splitLong,
  takeCompleteSentences,
} from './text';

/**
 * Narrador do jogo.
 *  - chatterbox: voz expressiva gerada localmente pelo serviço tts-service (sem APIs pagas).
 *  - offline:    voz pt-BR do próprio navegador/sistema.
 *  - text:       só texto.
 * O texto aparece na hora; o áudio é gerado por trechos (frases) numa fila e tocado na ordem.
 */

export type NarratorMode = 'chatterbox' | 'offline' | 'text';

export interface NarratorSettings {
  enabled: boolean;
  mode: NarratorMode;
  volume: number; // 0..1
  voice: string; // voz do serviço (padrão: "padrao")
  autoStyle: boolean; // escolhe o estilo (suspense, combate...) pelo conteúdo da cena
  style: NarrationStyle; // estilo fixo quando autoStyle está desligado
  maxChars: number; // limite de caracteres narrados por evento
  onlyImportant: boolean; // só narra cenas longas
  offlineVoiceURI: string;
}

export interface TtsHealth {
  reachable: boolean;
  ok: boolean;
  ready: boolean;
  loading: boolean;
  error: string | null;
  model: string;
  device: string; // cpu | cuda
  rtf: number | null; // tempo gerando / tempo de áudio (menor que 1 = mais rápido que a fala)
  sec_per_char: number;
  max_chars: number;
  voices: string[];
  styles: Record<string, string>;
  queue: number;
}

export interface NarratorState {
  settings: NarratorSettings;
  generating: boolean; // há áudio sendo gerado pelo serviço
  playing: boolean;
  paused: boolean;
  usingFallback: boolean; // serviço indisponível → voz do navegador/texto
  notice: string | null;
  offlineAvailable: boolean;
  offlineVoiceName: string | null;
  offlineIsLocal: boolean;
  tts: TtsHealth | null;
  hasLast: boolean;
  progress: { ready: number; total: number } | null; // trechos prontos / total da narração atual
  etaSeconds: number | null; // estimativa de espera informada pelo serviço
  currentStyle: NarrationStyle | null;
}

const STORAGE_KEY = 'cronica_dado_narrator_v1';
const IMPORTANT_MIN_CHARS = 300;
const MAX_PARALLEL_FETCH = 4;
const TEST_TEXT = 'Que os ventos do norte guiem seus passos, aventureiro. A jornada começa agora.';
const SLOW_RTF = 1.15; // acima disso a geração é mais lenta que a fala: espera tudo ficar pronto antes de tocar

const DEFAULTS: NarratorSettings = {
  enabled: false,
  mode: 'chatterbox',
  volume: 0.9,
  voice: 'padrao',
  autoStyle: true,
  style: 'normal',
  maxChars: 400,
  onlyImportant: false,
  offlineVoiceURI: '',
};

type Engine = 'chatterbox' | 'offline' | 'text';

interface Item {
  text: string;
  style: NarrationStyle;
  audio?: Promise<Blob | null>;
}

interface Session {
  id: number;
  sid: string; // identificador enviado ao serviço (permite cancelar o que ficou na fila)
  controller: AbortController;
  engine: Engine;
  ctx: SceneContext;
  minChunk: number;
  maxChunk: number;
  bufferAll: boolean; // geração lenta: só começa a tocar quando tudo estiver pronto
  started: boolean;
  queue: Item[];
  consumed: number;
  pending: string;
  budgetLeft: number;
  exhausted: boolean;
  gateOpen: boolean;
  finished: boolean;
  ttsFailed: boolean;
  spoken: Item[];
  total: number;
  ready: number;
  wake: (() => void) | null;
}

function loadSettings(): NarratorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<NarratorSettings> & { mode?: string };
      const s = { ...DEFAULTS, ...stored } as NarratorSettings;
      if ((stored.mode as string) === 'elevenlabs') s.mode = 'chatterbox'; // migração da versão antiga
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
  private lastChunks: Item[] = [];
  private audioEl: HTMLAudioElement | null = null;
  private stopPlayback: (() => void) | null = null;
  private inflight = new Map<string, Promise<Blob | null>>();
  private fetchActive = 0;
  private fetchWaiters: (() => void)[] = [];
  private healthTimer: ReturnType<typeof setTimeout> | null = null;

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
      tts: null,
      hasLast: false,
      progress: null,
      etaSeconds: null,
      currentStyle: null,
    };
    if (speechSupported()) {
      this.refreshOfflineVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.refreshOfflineVoices());
    }
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
    if (patch.mode === 'chatterbox' || patch.enabled) void this.refreshStatus();
  }

  // ---- serviço de voz ----------------------------------------------------------
  /** Consulta o estado do serviço (modelo carregado, CPU/GPU, velocidade). Reconsulta enquanto o modelo carrega. */
  async refreshStatus() {
    if (this.healthTimer) clearTimeout(this.healthTimer);
    try {
      const r = await apiFetch('/api/tts/health');
      if (!r.ok) throw new Error(String(r.status));
      const h = (await r.json()) as TtsHealth;
      this.set({ tts: h });
      if (h.reachable && h.loading) this.healthTimer = setTimeout(() => void this.refreshStatus(), 4000);
    } catch {
      this.set({ tts: null });
    }
  }

  private isSlow(): boolean {
    const t = this.state.tts;
    if (!t) return true;
    return (t.rtf ?? (t.device === 'cpu' ? 4 : 0.5)) > SLOW_RTF;
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
    const { settings, tts, offlineAvailable, offlineIsLocal } = this.state;
    if (settings.mode === 'text') return { engine: 'text', fallback: false, notice: null };

    const offlineOk = offlineAvailable && (offlineIsLocal || navigator.onLine !== false);
    if (settings.mode === 'offline') {
      return offlineOk
        ? { engine: 'offline', fallback: false, notice: null }
        : { engine: 'text', fallback: false, notice: 'Nenhuma voz pt-BR disponível neste navegador. Modo somente texto.' };
    }

    // chatterbox
    let why: string | null = null;
    if (tts === null || !tts.reachable) why = 'Serviço de voz (Chatterbox) indisponível';
    else if (tts.error) why = `Serviço de voz com erro: ${tts.error}`;
    else if (tts.loading || !tts.ready) why = 'O modelo de voz ainda está carregando';
    if (!why) return { engine: 'chatterbox', fallback: false, notice: null };

    return offlineOk
      ? { engine: 'offline', fallback: true, notice: `${why}: usando a voz do navegador.` }
      : { engine: 'text', fallback: true, notice: `${why} e sem voz do navegador: somente texto.` };
  }

  // ---- API pública de narração ------------------------------------------------
  /** Chamar no início de uma resposta do mestre (antes do primeiro trecho). */
  begin(force = false, opts?: { minChars?: number; context?: SceneContext }) {
    this.stop();
    if (!force && !this.state.settings.enabled) return;
    const { engine, fallback, notice } = this.resolveEngine();
    this.set({ usingFallback: fallback, notice, progress: null, etaSeconds: null, currentStyle: null });
    if (engine === 'text') return;
    const slow = engine === 'chatterbox' && this.isSlow();
    this.session = {
      id: ++this.sessionSeq,
      sid: `n${this.sessionSeq}${Date.now().toString(36)}`,
      controller: new AbortController(),
      engine,
      ctx: opts?.context ?? { inCombat: false },
      // trechos menores quando a geração é lenta: o primeiro áudio chega antes
      minChunk: engine === 'chatterbox' ? 70 : 90,
      maxChunk: engine === 'chatterbox' ? (slow ? 170 : 260) : 280,
      bufferAll: slow,
      started: false,
      queue: [],
      consumed: 0,
      pending: '',
      // o prólogo da campanha pode ter um limite maior que o das narrações comuns
      budgetLeft: Math.max(this.state.settings.maxChars, opts?.minChars ?? 0),
      exhausted: false,
      gateOpen: !this.state.settings.onlyImportant,
      finished: false,
      ttsFailed: false,
      spoken: [],
      total: 0,
      ready: 0,
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
      if (s.pending.length >= s.minChunk) this.flush(s);
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
    this.lastChunks.forEach((it) => this.enqueue(s, it.text, it.style));
    s.finished = true;
    s.wake?.();
  }

  testVoice() {
    this.begin(true);
    const s = this.session;
    if (!s) return;
    s.budgetLeft = Number.POSITIVE_INFINITY;
    this.enqueue(s, TEST_TEXT, this.state.settings.autoStyle ? 'normal' : this.state.settings.style);
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

  /** Interrompe a narração e cancela o que ainda estava na fila do serviço. */
  stop() {
    const s = this.session;
    this.session = null;
    if (s) {
      s.controller.abort();
      s.finished = true;
      s.wake?.();
      if (s.engine === 'chatterbox') {
        void apiFetch(`/api/tts/sessions/${s.sid}`, { method: 'DELETE' }).catch(() => undefined);
      }
    }
    this.stopPlayback?.();
    if (speechSupported()) window.speechSynthesis.cancel();
    this.set({ playing: false, paused: false, generating: false, progress: null, etaSeconds: null, currentStyle: null });
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
  private styleFor(text: string, s: Session): NarrationStyle {
    const { autoStyle, style } = this.state.settings;
    return autoStyle ? classifyStyle(text, s.ctx) : style;
  }

  private flush(s: Session) {
    const text = s.pending.trim();
    s.pending = '';
    if (!text) return;
    for (const part of splitLong(text, s.maxChunk)) {
      if (s.exhausted || s.budgetLeft <= 0) {
        s.exhausted = true;
        return;
      }
      const fitted = fitToBudget(part, s.budgetLeft);
      if (fitted.length < part.length) s.exhausted = true;
      s.budgetLeft -= fitted.length + 1;
      this.enqueue(s, fitted, this.styleFor(fitted, s));
    }
  }

  private enqueue(s: Session, text: string, style: NarrationStyle) {
    const item: Item = { text, style };
    if (s.engine === 'chatterbox') {
      s.total++;
      this.set({ progress: { ready: s.ready, total: s.total } });
      item.audio = this.fetchTts(text, style, s).then((blob) => {
        if (this.session === s) {
          s.ready++;
          this.set({ progress: { ready: s.ready, total: s.total } });
        }
        return blob;
      });
    }
    s.queue.push(item);
    s.spoken.push(item);
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
      if (this.fetchActive === 0) this.set({ generating: false, etaSeconds: null });
    }
  }

  /** Pede o áudio ao serviço: cache local → enfileira → acompanha a fila → baixa o WAV. */
  private fetchTts(text: string, style: NarrationStyle, s: Session): Promise<Blob | null> {
    const { voice } = this.state.settings;
    const model = this.state.tts?.model ?? 'tts';

    const run = async (): Promise<Blob | null> => {
      const key = await hashKey([model, voice, style, text]);
      const cached = await getCachedAudio(key);
      if (cached) return cached;
      const shared = this.inflight.get(key);
      if (shared) return shared;

      const fail = (msg: string) => {
        s.ttsFailed = true;
        this.set({ notice: msg });
        return null;
      };

      const job = this.withFetchSlot(async (): Promise<Blob | null> => {
        const signal = s.controller.signal;
        if (s.ttsFailed || signal.aborted) return null;
        try {
          const r = await apiFetch('/api/tts/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({ text, voice, style, session: s.sid }),
          });
          if (!r.ok) {
            const err = (await r.json().catch(() => ({}))) as { error?: string };
            return fail(err.error || `Falha no serviço de voz (${r.status}).`);
          }
          let info = (await r.json()) as { id: string; status: string; eta_seconds?: number; error?: string | null };
          while (info.status === 'queued' || info.status === 'running') {
            if (signal.aborted || this.session !== s) return null;
            this.set({ etaSeconds: info.eta_seconds ?? null });
            const jr = await apiFetch(`/api/tts/jobs/${info.id}?wait=20`, { signal });
            if (!jr.ok) return fail('O serviço de voz parou de responder.');
            info = (await jr.json()) as typeof info;
          }
          if (info.status !== 'done') return info.status === 'cancelled' ? null : fail(info.error || 'O serviço de voz não conseguiu gerar o áudio.');
          const ar = await apiFetch(`/api/tts/audio/${info.id}`, { signal });
          if (!ar.ok) return fail('Não foi possível baixar o áudio gerado.');
          const blob = await ar.blob();
          void putCachedAudio(key, blob);
          return blob;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return null;
          return fail('Sem conexão com o serviço de voz.');
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
      // geração mais lenta que a fala: espera tudo ficar pronto para não tocar "picotado"
      if (s.engine === 'chatterbox' && s.bufferAll && !s.started) {
        if (!s.finished) {
          await new Promise<void>((resolve) => (s.wake = resolve));
          s.wake = null;
          continue;
        }
        await Promise.all(s.queue.map((i) => i.audio ?? null));
        if (this.session !== s) break;
        s.started = true;
      }

      const item = s.queue.shift();
      if (!item) {
        if (s.finished) break;
        await new Promise<void>((resolve) => (s.wake = resolve));
        s.wake = null;
        continue;
      }

      if (s.engine === 'chatterbox') {
        const blob = await item.audio;
        if (this.session !== s) break;
        if (blob) {
          this.set({ playing: true, paused: false, currentStyle: item.style });
          const ok = await this.playBlob(blob, s);
          if (!ok) break;
          continue;
        }
        // serviço falhou: alterna automaticamente para a voz do navegador, se houver; senão só texto.
        const offline = this.state.offlineAvailable;
        s.engine = offline ? 'offline' : 'text';
        this.set({
          usingFallback: true,
          notice: offline
            ? `${this.state.notice ?? 'Serviço de voz indisponível'} — usando a voz do navegador.`
            : `${this.state.notice ?? 'Serviço de voz indisponível'} — somente texto.`,
        });
        if (!offline) {
          s.queue.length = 0;
          break;
        }
      }

      if (s.engine === 'offline') {
        this.set({ playing: true, paused: false, currentStyle: null });
        await this.speak(item.text);
      }
    }
    if (this.session === s) {
      this.session = null;
      this.set({ playing: false, paused: false, currentStyle: null });
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
