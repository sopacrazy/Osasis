import { useMemo, useState } from 'react';
import {
  X,
  Search,
  RefreshCw,
  Loader2,
  Compass,
  MapPin,
  ShieldAlert,
  FlaskConical,
  Users,
  ScrollText,
} from 'lucide-react';
import type { CampaignGuide } from '../types/rpg';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  guide: CampaignGuide;
  isSyncing: boolean;
  onSyncGuide: () => void;
}

type GuideTab = 'quests' | 'creatures' | 'locations' | 'remedies' | 'npcs' | 'rules';

export function RulesModal({
  open,
  onClose,
  guide,
  isSyncing,
  onSyncGuide,
}: RulesModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('quests');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return guide;
    return {
      ...guide,
      currentQuests: guide.currentQuests.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q)
      ),
      racesAndCreatures: guide.racesAndCreatures.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.bonuses.toLowerCase().includes(q) ||
          item.weaknesses.toLowerCase().includes(q)
      ),
      knownLocations: guide.knownLocations.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.resources ?? '').toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q)
      ),
      remediesAndItems: guide.remediesAndItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.effect.toLowerCase().includes(q) ||
          (item.usageOrSource ?? '').toLowerCase().includes(q)
      ),
      knownCharacters: guide.knownCharacters.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.allegiance.toLowerCase().includes(q) ||
          (item.notes ?? '').toLowerCase().includes(q)
      ),
    };
  }, [guide, q]);

  if (!open) return null;

  const tabs: { id: GuideTab; label: string; icon: typeof Compass; count?: number }[] = [
    { id: 'quests', label: 'Missões', icon: Compass, count: filtered.currentQuests.length },
    { id: 'creatures', label: 'Raças & Bichos', icon: ShieldAlert, count: filtered.racesAndCreatures.length },
    { id: 'locations', label: 'Locais & Coleta', icon: MapPin, count: filtered.knownLocations.length },
    { id: 'remedies', label: 'Remédios & Itens', icon: FlaskConical, count: filtered.remediesAndItems.length },
    { id: 'npcs', label: 'Nomes & NPCs', icon: Users, count: filtered.knownCharacters.length },
    { id: 'rules', label: 'Regras D20', icon: ScrollText },
  ];

  const lastSyncLabel = guide.lastUpdatedAt
    ? new Date(guide.lastUpdatedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200 dark:border-[#262932]">
          <div className="min-w-0">
            <h2 id="guide-modal-title" className="font-display text-lg font-semibold truncate">
              Guia Geral da Campanha
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tudo que você já descobriu no mundo · atualizado automaticamente
              {lastSyncLabel ? ` · às ${lastSyncLabel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onSyncGuide}
              disabled={isSyncing}
              title="Reanalisar mensagens recentes para atualizar o guia"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-[#2E323D] text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#22252D] disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isSyncing ? 'Atualizando...' : 'Sincronizar'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
              aria-label="Fechar guia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-zinc-200 dark:border-[#262932] space-y-3 bg-zinc-50/70 dark:bg-[#14161B]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar remédio, fraqueza de criatura, local de coleta, nome de NPC..."
              className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#111317] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-[#22252D]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`font-mono-tabular text-[11px] ${
                        active ? 'text-amber-100' : 'text-zinc-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm leading-relaxed">
          {activeTab === 'quests' && (
            <>
              {filtered.currentQuests.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhuma missão registrada ainda. Conforme você explorar o mundo, os objetivos e prazos aparecerão aqui.
                </p>
              ) : (
                filtered.currentQuests.map((quest, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display font-semibold text-base text-zinc-900 dark:text-zinc-100">
                        {quest.title}
                      </h3>
                      {quest.deadline && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Prazo: {quest.deadline}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Destino: {quest.location}
                    </p>
                    <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300">
                      {quest.summary}
                    </p>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'creatures' && (
            <>
              {filtered.racesAndCreatures.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhuma raça ou criatura catalogada ainda.
                </p>
              ) : (
                filtered.racesAndCreatures.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-2"
                  >
                    <h3 className="font-display font-semibold text-base text-zinc-900 dark:text-zinc-100">
                      {entry.name}
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/8 p-2.5">
                        <span className="block font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">
                          Traços &amp; Bônus
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-200">{entry.bonuses}</span>
                      </div>
                      <div className="rounded-md border border-rose-500/25 bg-rose-500/8 p-2.5">
                        <span className="block font-semibold text-rose-700 dark:text-rose-300 mb-0.5">
                          Fraquezas &amp; Penalidades
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-200">{entry.weaknesses}</span>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.notes}</p>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'locations' && (
            <>
              {filtered.knownLocations.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhuma localização conhecida registrada ainda.
                </p>
              ) : (
                filtered.knownLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display font-semibold text-base text-zinc-900 dark:text-zinc-100">
                        {loc.name}
                      </h3>
                      {loc.distanceOrDirection && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {loc.distanceOrDirection}
                        </span>
                      )}
                    </div>
                    {loc.resources && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Recursos / Coleta: {loc.resources}
                      </p>
                    )}
                    <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300">
                      {loc.notes}
                    </p>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'remedies' && (
            <>
              {filtered.remediesAndItems.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhum remédio, item especial ou receita catalogada ainda.
                </p>
              ) : (
                filtered.remediesAndItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-3.5 space-y-1"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </h3>
                      {item.usageOrSource && (
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.usageOrSource}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{item.effect}</p>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'npcs' && (
            <>
              {filtered.knownCharacters.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhum personagem encontrado ainda.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {filtered.knownCharacters.map((npc, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-3.5 space-y-1"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {npc.name}
                        </h3>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400">
                          {npc.allegiance}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {npc.role}
                      </p>
                      {npc.notes && (
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 pt-0.5">
                          {npc.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-5">
              <section>
                <h3 className="font-display text-base font-semibold mb-2">
                  Escala Rígida de D20 (Dado + Modificadores)
                </h3>
                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-[#2A2E38]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-[#1F222A] text-zinc-700 dark:text-zinc-300">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Resultado</th>
                        <th className="px-3 py-2 font-semibold">Categoria</th>
                        <th className="px-3 py-2 font-semibold">Consequência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-[#262932]">
                      <tr>
                        <td className="px-3 py-2 font-mono-tabular font-semibold">1 Natural</td>
                        <td className="px-3 py-2">Falha Crítica</td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          Ferramenta quebra, item destruído ou contra-ataque pesado imediato.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono-tabular font-semibold">2 – 8</td>
                        <td className="px-3 py-2">Falha / Complicação</td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          Ação falha com custo: materiais estragam, golpe resvala ou atrai perigo.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono-tabular font-semibold">9 – 13</td>
                        <td className="px-3 py-2">Sucesso Parcial</td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          Dobro do tempo, gasta munição extra, item frágil ou ferimento leve.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono-tabular font-semibold">14 – 18</td>
                        <td className="px-3 py-2">Sucesso Limpo</td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          Execução precisa exatamente conforme planejado.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono-tabular font-semibold">19+ / 20 Nat</td>
                        <td className="px-3 py-2">Sucesso Crítico</td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          Obra-prima, acerto vital ignorando armadura ou economia de materiais.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] p-3.5">
                  <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1.5">
                    4 Atributos Base (+2, +1, 0, -1)
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <li><strong>Potência:</strong> força, vigor, corpo a corpo, resistir a venenos.</li>
                    <li><strong>Agilidade:</strong> pontaria, esquiva, furtividade, trabalho manual fino.</li>
                    <li><strong>Percepção:</strong> instinto, rastreamento, emboscadas, ler NPCs.</li>
                    <li><strong>Engenho:</strong> intelecto, crafting, alquimia, tática, persuasão.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] p-3.5">
                  <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1.5">
                    Penalidades e Comandos
                  </h3>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    <li><strong>Penalidades (-1 a -3):</strong> agir sem luz, sem ferramentas, ferido, exausto ou com excesso de peso.</li>
                    <li><strong>Ajuste técnico:</strong> inicie a mensagem com <code>Ajuste técnico:</code> para corrigir uma regra ou detalhe sem resposta narrativa.</li>
                    <li><strong>Independência:</strong> o Mestre não rola dados e não edita o seu Bloco de Notas.</li>
                  </ul>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-200 dark:border-[#262932] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
