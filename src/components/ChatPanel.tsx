import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  AlertTriangle,
  RotateCcw,
  Download,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  Check,
  BookOpen,
  Map,
  ScrollText,
  Volume2,
} from 'lucide-react';
import type { Campaign } from '../types/rpg';
import { DieIcon } from './DieIcon';
import { NarratorControls } from './NarratorControls';
import { getDifficulty } from '../data/difficulty';
import { RollRequestCard } from './RollRequestCard';
import { SheetRequestCard } from './SheetRequestCard';
import { StateBlockCard } from './StateBlockCard';
import { splitStateBlock } from '../utils/stateBlock';
import { hasSheetRequest, parseRollRequest, stripRollTags, type PendingRoll } from '../utils/rollRequest';
import { narrator } from '../services/narrator/narrator';

interface ChatPanelProps {
  campaign: Campaign;
  draft: string;
  onDraftChange: (value: string) => void;
  isStreaming: boolean;
  errorMessage: string | null;
  onSendMessage: () => void;
  onRetryLastTurn: () => void;
  onExportTranscript: () => void;
  onQuickSaveToNotes: (excerpt: string) => void;
  activeDrawer: 'notes' | 'dice' | null;
  onOpenNotes: () => void;
  onOpenDice: () => void;
  onOpenCampaigns: () => void;
  onOpenRules: () => void;
  chatFontSize: number;
  pendingRoll: PendingRoll | null;
  onRollRequest: (messageId: string) => void;
  onOpenSheet: (messageId: string) => void;
}

function extractInventoryOrStateSnippet(text: string): string {
  const lines = text.split('\n');
  const invLine = lines.find((l) => /atualiza[cç][aã]o de invent[aá]rio/i.test(l));
  if (invLine) {
    return invLine.replace(/^\*+\s*/, '').trim();
  }
  const clean = text.replace(/[#*`]/g, '').trim();
  return clean.slice(0, 240) + (clean.length > 240 ? '...' : '');
}

export function ChatPanel({
  campaign,
  draft,
  onDraftChange,
  isStreaming,
  errorMessage,
  onSendMessage,
  onRetryLastTurn,
  onExportTranscript,
  onQuickSaveToNotes,
  activeDrawer,
  onOpenNotes,
  onOpenDice,
  onOpenCampaigns,
  onOpenRules,
  chatFontSize,
  pendingRoll,
  onRollRequest,
  onOpenSheet,
}: ChatPanelProps) {
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [campaign.messages.length, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && draft.trim() && canSend) {
        onSendMessage();
      }
    }
  };

  const applyTechnicalPrefix = () => {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('Ajuste técnico:')) {
      onDraftChange(`Ajuste técnico: ${trimmed}`);
    }
    textareaRef.current?.focus();
  };

  const handleSaveSnippet = (msgId: string, fullText: string) => {
    const snippet = extractInventoryOrStateSnippet(fullText);
    onQuickSaveToNotes(snippet);
    setSavedMsgId(msgId);
    setTimeout(() => setSavedMsgId(null), 1800);
  };

  // com um pedido de rolagem em aberto, só "Ajuste técnico:" pode ser enviado
  const canSend = !pendingRoll || draft.trimStart().toLowerCase().startsWith('ajuste técnico:');

  const turnCount = campaign.messages.filter((m) => m.role === 'user' && !m.isTechnicalAdjustment).length;

  return (
    <section className="flex flex-col h-full bg-[#F6F6F4] dark:bg-[#121418] overflow-hidden">
      {/* Compact Campaign Header */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#17191E]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              {campaign.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              <span className="truncate">{campaign.subtitle}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular shrink-0">{turnCount} turnos</span>
              {getDifficulty(campaign.difficulty) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    title="Nível da campanha"
                    className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getDifficulty(campaign.difficulty)!.badge}`}
                  >
                    {getDifficulty(campaign.difficulty)!.label}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 shrink-0">
          <NarratorControls />
          <button
            type="button"
            onClick={onExportTranscript}
            title="Exportar crônica em Markdown"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-[#2C303A] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors shrink-0 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          </div>
        </div>
      </div>

      {/* Scrollable Narrative Stream (Gemini-style readable column) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <div className="max-w-3xl mx-auto space-y-5 pb-4">
          {campaign.messages.map((msg) => {
            const isUser = msg.role === 'user';
            const timeLabel = new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-3 border ${
                      msg.isTechnicalAdjustment
                        ? 'bg-zinc-100 dark:bg-[#1D2027] border-zinc-300 dark:border-[#323744] text-zinc-700 dark:text-zinc-300'
                        : 'bg-amber-600/10 dark:bg-amber-500/10 border-amber-600/25 dark:border-amber-500/25 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium">
                        {msg.isTechnicalAdjustment ? 'Ajuste técnico' : 'Você'}
                      </span>
                      <span className="font-mono-tabular">{timeLabel}</span>
                    </div>
                    <div
                      style={{ fontSize: `${chatFontSize}px` }}
                      className="leading-relaxed whitespace-pre-wrap break-words"
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <article
                key={msg.id}
                className="rounded-xl border border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#17191E] px-4 sm:px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4 mb-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Mestre da Campanha
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => narrator.narrateText(msg.text, true)}
                      title="Ouvir esta narração"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Ouvir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSnippet(msg.id, msg.text)}
                      title="Copiar atualização de inventário/estado para o seu Bloco de Notas"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      {savedMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Salvo nas notas</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Salvar nas notas</span>
                        </>
                      )}
                    </button>
                    <span className="font-mono-tabular">{timeLabel}</span>
                  </div>
                </div>
                <div
                  style={{ fontSize: `${chatFontSize}px` }}
                  className="gm-prose text-zinc-800 dark:text-zinc-200"
                >
                  <ReactMarkdown>{splitStateBlock(stripRollTags(msg.text)).narrative || '...'}</ReactMarkdown>
                </div>
                {(() => {
                  const request = parseRollRequest(msg.text);
                  return request ? (
                    <RollRequestCard
                      messageId={msg.id}
                      request={request}
                      messages={campaign.messages}
                      attributes={campaign.attributes}
                      isPending={pendingRoll?.messageId === msg.id}
                      disabled={isStreaming}
                      onRoll={onRollRequest}
                    />
                  ) : null;
                })()}
                {hasSheetRequest(msg.text) && (
                  <SheetRequestCard
                    messageId={msg.id}
                    messages={campaign.messages}
                    character={campaign.character}
                    disabled={isStreaming}
                    onOpen={onOpenSheet}
                  />
                )}
                {(() => {
                  const { items } = splitStateBlock(stripRollTags(msg.text));
                  return items ? <StateBlockCard items={items} /> : null;
                })()}
              </article>
            );
          })}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              <span>O Mestre está narrando as consequências...</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={onRetryLastTurn}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-500 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tentar novamente</span>
              </button>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Action Input Composer */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#17191E] px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={applyTechnicalPrefix}
                title="Inserir prefixo Ajuste técnico:"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors whitespace-nowrap cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Ajuste técnico</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenCampaigns}
                title="Campanhas"
                aria-label="Campanhas"
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Map className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenRules}
                title="Guia Geral & Regras"
                aria-label="Guia Geral & Regras"
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ScrollText className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenNotes}
                title="Abrir Bloco de Notas"
                aria-label="Abrir Bloco de Notas"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  activeDrawer === 'notes'
                    ? 'lg:bg-amber-600/15 lg:border-amber-500 lg:text-amber-700 lg:dark:text-amber-300 border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200'
                    : 'border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenDice}
                title="Abrir Dados RPG (D20)"
                aria-label="Abrir Dados RPG"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  activeDrawer === 'dice'
                    ? 'lg:bg-amber-600/15 lg:border-amber-500 lg:text-amber-700 lg:dark:text-amber-300 border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-200'
                    : 'border-zinc-200 dark:border-[#2D313B] text-amber-600 dark:text-amber-400 hover:border-amber-500'
                }`}
              >
                <DieIcon sides={20} className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingRoll
                  ? 'Role o dado no cartão do Mestre acima para continuar...'
                  : 'Descreva sua ação, fala ou resposta ao Mestre...'
              }
              className="flex-1 min-h-[52px] max-h-36 resize-y rounded-lg border border-zinc-200 dark:border-[#2E323D] bg-zinc-50 dark:bg-[#111317] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              disabled={isStreaming || !draft.trim() || !canSend}
              onClick={onSendMessage}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shrink-0 whitespace-nowrap min-h-[48px] cursor-pointer"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
