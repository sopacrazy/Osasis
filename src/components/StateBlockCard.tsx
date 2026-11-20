import {
  Backpack,
  Bandage,
  CircleDot,
  CloudSun,
  Coins,
  Heart,
  Hourglass,
  MapPin,
  PawPrint,
  Shield,
  Skull,
  Star,
  Swords,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { splitList, type StateItem, type StateKind } from '../utils/stateBlock';

const ICONS: Record<StateKind, { icon: LucideIcon; tone: string }> = {
  location: { icon: MapPin, tone: 'text-amber-600 dark:text-amber-400' },
  weather: { icon: CloudSun, tone: 'text-sky-600 dark:text-sky-400' },
  deadline: { icon: Hourglass, tone: 'text-zinc-500 dark:text-zinc-400' },
  hp: { icon: Heart, tone: 'text-rose-500' },
  wounds: { icon: Bandage, tone: 'text-orange-500' },
  hunger: { icon: Utensils, tone: 'text-lime-600 dark:text-lime-400' },
  xp: { icon: Star, tone: 'text-yellow-500' },
  defense: { icon: Shield, tone: 'text-slate-500 dark:text-slate-300' },
  equipment: { icon: Swords, tone: 'text-amber-600 dark:text-amber-400' },
  inventory: { icon: Backpack, tone: 'text-amber-700 dark:text-amber-300' },
  money: { icon: Coins, tone: 'text-yellow-500' },
  companion: { icon: PawPrint, tone: 'text-emerald-600 dark:text-emerald-400' },
  threat: { icon: Skull, tone: 'text-rose-600 dark:text-rose-400' },
  other: { icon: CircleDot, tone: 'text-zinc-400' },
};

/** "Nenhum", "Nenhuma", "—", "sem ..." : nada a mostrar. */
const isNone = (v: string) => /^\s*(nenhum[ao]?|n[aã]o h[aá]|sem\b[^,]*|-|—|vazio|ileso)\W*$/i.test(v);

const divider = 'border-t border-zinc-200/80 dark:border-[#262932]';
const pill =
  'inline-flex items-center rounded-md border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50 dark:bg-[#1C1F26] px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200';

function Ico({ kind, className = 'w-4 h-4' }: { kind: StateKind; className?: string }) {
  const { icon: Icon, tone } = ICONS[kind];
  return <Icon className={`${className} shrink-0 ${tone}`} aria-hidden="true" />;
}

/** Linha de cena: o lugar em destaque; clima e prazo, menores, logo abaixo. */
function Scene({ items }: { items: StateItem[] }) {
  const place = items.find((i) => i.kind === 'location');
  const side = items.filter((i) => (i.kind === 'weather' || i.kind === 'deadline') && !isNone(i.value));
  if (!place && side.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {place && (
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100" title={place.label}>
          <Ico kind="location" />
          <span className="sr-only">{place.label}: </span>
          <span className="min-w-0 break-words">{place.value}</span>
        </div>
      )}
      {side.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-xs text-zinc-600 dark:text-zinc-400">
          {side.map((i, k) => (
            <span key={k} className="inline-flex items-center gap-1.5" title={i.label}>
              <Ico kind={i.kind} className="w-3.5 h-3.5" />
              <span className="sr-only">{i.label}: </span>
              {i.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Vitais em grade: vida (com barra) ocupa duas colunas; os demais, uma. */
function Vitals({ items }: { items: StateItem[] }) {
  const hp = items.find((i) => i.kind === 'hp');
  const rest = items.filter((i) => ['hunger', 'xp', 'defense', 'wounds'].includes(i.kind) && !(i.kind === 'wounds' && isNone(i.value)));
  if (!hp && rest.length === 0) return null;

  const m = hp ? /(\d+)\s*\/\s*(\d+)/.exec(hp.value) : null;
  const ratio = m ? Math.min(1, Number(m[1]) / Math.max(1, Number(m[2]))) : null;
  const tile =
    'flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50 dark:bg-[#1C1F26] px-2.5 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 min-w-0';

  return (
    <div className="space-y-2">
      {hp && (
        <div className={tile} title={hp.label}>
          <Ico kind="hp" />
          <span className="sr-only">{hp.label}: </span>
          <span className="font-mono-tabular font-semibold">{hp.value}</span>
          {ratio !== null && (
            <span className="ml-1 h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-[#2A2E38] overflow-hidden" aria-hidden="true">
              <span
                className={`block h-full rounded-full ${ratio > 0.6 ? 'bg-emerald-500' : ratio > 0.3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </span>
          )}
        </div>
      )}
      {rest.length > 0 && (
        // colunas se adaptam à largura do cartão (celular ou computador); o texto quebra linha, nunca é cortado
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
          {rest.map((i, k) => (
            <div key={k} className={tile} title={i.label}>
              <Ico kind={i.kind} />
              <span className="sr-only">{i.label}: </span>
              <span className="min-w-0 break-words leading-tight">{i.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Linha de lista: o ícone fica numa coluna de largura fixa, então todas as linhas alinham. */
function ListRow({ kind, label, entries }: { kind: StateKind; label: string; entries: string[] }) {
  return (
    <div className="grid grid-cols-[1.25rem_1fr] items-start gap-x-2.5" title={label}>
      <Ico kind={kind} className="w-4 h-4 mt-0.5" />
      <span className="sr-only">{label}: </span>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {entries.map((e, i) => (
          <span key={i} className={pill}>
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Painel do Bloco de Estado: cena → vitais → equipamento → mochila → companhia/ameaça. Itens vazios não aparecem. */
export function StateBlockCard({ items }: { items: StateItem[] }) {
  const lists = (kinds: StateKind[]) =>
    items
      .filter((i) => kinds.includes(i.kind) && !isNone(i.value))
      .flatMap((i) => splitList(i.value).map((v) => (i.kind === 'money' && !/\bouro|prata|cobre|moeda/i.test(v) ? `${v} moedas` : v)));

  const equipment = lists(['equipment']);
  const bag = lists(['inventory', 'money']);
  const company = items.filter((i) => ['companion', 'threat'].includes(i.kind) && !isNone(i.value));
  const others = items.filter((i) => i.kind === 'other');

  const scene = <Scene items={items} />;
  const vitals = <Vitals items={items} />;
  const hasScene = items.some((i) => ['location', 'weather', 'deadline'].includes(i.kind) && !isNone(i.value));
  const hasVitals = items.some((i) => ['hp', 'hunger', 'xp', 'defense', 'wounds'].includes(i.kind) && !isNone(i.value));
  const hasLists = equipment.length > 0 || bag.length > 0 || company.length > 0 || others.length > 0;

  return (
    <div
      className="mt-3 rounded-xl border border-zinc-200 dark:border-[#262932] bg-white/60 dark:bg-[#14161B] p-3.5 space-y-3"
      role="group"
      aria-label="Estado atual do personagem"
    >
      {hasScene && scene}
      {hasVitals && <div className={hasScene ? `${divider} pt-3` : ''}>{vitals}</div>}
      {hasLists && (
        <div className={`${hasScene || hasVitals ? `${divider} pt-3` : ''} space-y-2.5`}>
          {equipment.length > 0 && <ListRow kind="equipment" label="Equipamentos" entries={equipment} />}
          {bag.length > 0 && <ListRow kind="inventory" label="Inventário" entries={bag} />}
          {company.map((i, k) => (
            <ListRow key={k} kind={i.kind} label={i.label} entries={splitList(i.value)} />
          ))}
          {others.map((i, k) => (
            <ListRow key={`o${k}`} kind="other" label={i.label} entries={[`${i.label}: ${i.value}`]} />
          ))}
        </div>
      )}
    </div>
  );
}
