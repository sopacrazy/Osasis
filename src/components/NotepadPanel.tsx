import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Copy,
  Check,
  Trash2,
  X,
  Clock,
  Minus,
} from 'lucide-react';
import type { NoteTab } from '../types/rpg';

interface NotepadPanelProps {
  notes: NoteTab[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onUpdateNoteContent: (id: string, content: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
}

export function NotepadPanel({
  notes,
  activeNoteId,
  onSelectNote,
  onUpdateNoteContent,
  onRenameNote,
  onAddNote,
  onDeleteNote,
}: NotepadPanelProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? notes[0],
    [notes, activeNoteId]
  );

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return notes
      .map((note) => {
        const lines = note.content.split('\n');
        const matchedLines = lines.filter((line) => line.toLowerCase().includes(q));
        return { note, matchedLines };
      })
      .filter((entry) => entry.matchedLines.length > 0 || entry.note.title.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const handleCopy = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted iframe
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!activeNote) return;
    const prefix = activeNote.content.endsWith('\n') || activeNote.content.length === 0 ? '' : '\n';
    onUpdateNoteContent(activeNote.id, `${activeNote.content}${prefix}${snippet}`);
    setViewMode('edit');
  };

  const startRename = (note: NoteTab) => {
    setRenamingId(note.id);
    setRenameDraft(note.title);
  };

  const commitRename = () => {
    if (renamingId && renameDraft.trim()) {
      onRenameNote(renamingId, renameDraft.trim());
    }
    setRenamingId(null);
  };

  const lineCount = activeNote ? activeNote.content.split('\n').length : 0;
  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <section className="flex flex-col h-full bg-white dark:bg-[#17191E] border-l border-zinc-200 dark:border-[#262932] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-[#262932] shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Bloco de Notas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Exclusivo do jogador · salvo localmente
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center p-0.5 rounded-md bg-zinc-100 dark:bg-[#22252D] border border-zinc-200 dark:border-[#2E323D]">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-[#2E323D] text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Pencil className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-[#2E323D] text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Leitura</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              title="Copiar conteúdo desta aba"
              className="p-2 rounded-md border border-zinc-200 dark:border-[#2E323D] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors"
              aria-label="Copiar conteúdo da nota"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Search across all notes */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar em fichas, itens, missões..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-[#2C303A] bg-zinc-50 dark:bg-[#121418] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {notes.map((note) => {
            const active = note.id === activeNote?.id;
            if (renamingId === note.id) {
              return (
                <input
                  key={note.id}
                  type="text"
                  value={renameDraft}
                  autoFocus
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="px-2 py-1 text-xs rounded border border-amber-500 bg-white dark:bg-[#121418] text-zinc-900 dark:text-zinc-100 w-32 focus:outline-none"
                />
              );
            }
            return (
              <div key={note.id} className="flex items-center shrink-0 group">
                <button
                  type="button"
                  onClick={() => {
                    onSelectNote(note.id);
                    setSearchQuery('');
                  }}
                  onDoubleClick={() => startRename(note)}
                  title="Clique duplo para renomear aba"
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-amber-600/12 text-amber-800 dark:text-amber-300 border border-amber-500/35'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#22252D] border border-transparent'
                  }`}
                >
                  {note.title}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onAddNote}
            title="Adicionar nova aba de anotações"
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-[#22252D] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aba</span>
          </button>
        </div>
      </div>

      {/* Search Results Overlay OR Active Note Body */}
      {searchMatches ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {searchMatches.length} {searchMatches.length === 1 ? 'aba encontrada' : 'abas encontradas'} para &ldquo;{searchQuery}&rdquo;
          </div>
          {searchMatches.length === 0 && (
            <p className="text-xs text-zinc-500 py-6 text-center">
              Nenhuma anotação corresponde à busca.
            </p>
          )}
          {searchMatches.map(({ note, matchedLines }) => (
            <div
              key={note.id}
              className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50 dark:bg-[#1B1E24] p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {note.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectNote(note.id);
                    setSearchQuery('');
                  }}
                  className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                >
                  Abrir aba
                </button>
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {matchedLines.slice(0, 5).map((line, i) => (
                  <li key={i} className="truncate font-mono-tabular">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : activeNote ? (
        <>
          {/* Quick Editing Utilities */}
          <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-b border-zinc-100 dark:border-[#21242C] bg-zinc-50/70 dark:bg-[#14161B] text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => insertSnippet('* ')}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Item</span>
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => insertSnippet('\n---\n')}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 whitespace-nowrap"
              >
                <Minus className="w-3 h-3" />
                <span>Divisor</span>
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() =>
                  insertSnippet(
                    `\n## Registro (${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})\n* `
                  )
                }
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 whitespace-nowrap"
              >
                <Clock className="w-3 h-3" />
                <span>Carimbo</span>
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono-tabular">
                {wordCount} palavras · {lineCount} linhas
              </span>
              {notes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteNote(activeNote.id)}
                  title="Excluir aba atual"
                  className="text-zinc-400 hover:text-rose-500 transition-colors"
                  aria-label="Excluir aba atual"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {viewMode === 'edit' ? (
            <textarea
              value={activeNote.content}
              onChange={(e) => onUpdateNoteContent(activeNote.id, e.target.value)}
              spellCheck={false}
              placeholder="Anote aqui atributos, equipamentos, moedas, pistas, receitas e história..."
              className="flex-1 w-full resize-none p-4 bg-transparent text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none font-sans"
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4 gm-prose text-[14px] text-zinc-800 dark:text-zinc-200">
              <ReactMarkdown>{activeNote.content || '*Aba vazia.*'}</ReactMarkdown>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
