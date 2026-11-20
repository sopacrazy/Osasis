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

const chip =
  'inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50 dark:bg-[#1C1F26] px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200';
const SCENE: StateKind[] = ['location', 'weather', 'deadline'];
const VITALS: StateKind[] = ['hp', 'wounds', 'hunger', 'xp', 'defense', 'money'];
const LISTS: StateKind[] = ['equipment', 'inventory', 'companion', 'threat'];

const isNone = (v: string) => /^\s*(nenhum[ao]?|n[aã]o h[aá]|sem\b|-|—|vazio)\W*$/i.test(v);

function Chip({ item }: { item: StateItem }) {
  const { icon: Icon, tone } = ICONS[item.kind];
  const dim = isNone(item.value);
  const hp = item.kind === 'hp' ? /(\d+)\s*\/\s*(\d+)/.exec(item.value) : null;
  const ratio = hp ? Math.min(1, Number(hp[1]) / Math.max(1, Number(hp[2]))) : null;
  return (
    <span className={`${chip} ${dim ? 'opacity-55' : ''}`} title={item.label}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${tone}`} aria-hidden="true" />
      <span className="sr-only">{item.label}: </span>
      <span className="break-words">{item.value}</span>
      {ratio !== null && (
        <span className="ml-0.5 h-1 w-9 rounded-full bg-zinc-200 dark:bg-[#2A2E38] overflow-hidden" aria-hidden="true">
          <span
            className={`block h-full ${ratio > 0.6 ? 'bg-emerald-500' : ratio > 0.3 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </span>
      )}
    </span>
  );
}

function ListRow({ item }: { item: StateItem }) {
  const { icon: Icon, tone } = ICONS[item.kind];
  const entries = isNone(item.value) ? [] : splitList(item.value);
  return (
    <div className="flex items-start gap-2" title={item.label}>
      <Icon className={`w-4 h-4 mt-1 shrink-0 ${tone}`} aria-hidden="true" />
      <span className="sr-only">{item.label}: </span>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {entries.length === 0 ? (
          <span className={`${chip} opacity-55`}>—</span>
        ) : (
          entries.map((e, i) => (
            <span key={i} className={chip}>
              {e}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/** Painel compacto do Bloco de Estado, com ícones no lugar dos rótulos (o rótulo fica no tooltip e para leitores de tela). */
export function StateBlockCard({ items }: { items: StateItem[] }) {
  const pick = (kinds: StateKind[]) => items.filter((i) => kinds.includes(i.kind));
  const scene = pick(SCENE);
  const vitals = pick(VITALS);
  const lists = pick(LISTS);
  const others = items.filter((i) => i.kind === 'other');

  return (
    <div
      className="mt-3 rounded-lg border border-zinc-200 dark:border-[#262932] bg-zinc-50/60 dark:bg-[#14161B] p-3 space-y-2.5"
      role="group"
      aria-label="Estado atual do personagem"
    >
      {scene.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scene.map((i, k) => (
            <Chip key={k} item={i} />
          ))}
        </div>
      )}
      {vitals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vitals.map((i, k) => (
            <Chip key={k} item={i} />
          ))}
        </div>
      )}
      {lists.map((i, k) => (
        <ListRow key={k} item={i} />
      ))}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {others.map((i, k) => (
            <span key={k} className={chip}>
              <CircleDot className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              <span className="text-zinc-500 dark:text-zinc-400">{i.label}:</span> {i.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
