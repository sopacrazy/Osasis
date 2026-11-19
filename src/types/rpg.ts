export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export type AttributeKey = 'potencia' | 'agilidade' | 'percepcao' | 'engenho';

export interface PlayerAttributes {
  potencia: number;
  agilidade: number;
  percepcao: number;
  engenho: number;
}

export interface CharacterSheet {
  name: string;
  race: string;
  className: string;
  origin: string;
  attributes: PlayerAttributes;
  skills: [string, string];
  classAbility: string;
  companion: string;
  equipment: string[];
  gold: number;
  silver: number;
  copper: number;
}

export interface DiceRollRecord {
  id: string;
  timestamp: string;
  sides: DieSides;
  quantity: number;
  rolls: number[];
  droppedRoll?: number;
  mode: RollMode;
  modifier: number;
  modifierLabel?: string;
  total: number;
  outcomeLabel?: string;
  outcomeTone?: 'critical-fail' | 'fail' | 'partial' | 'success' | 'critical-success';
}

export interface NoteTab {
  id: string;
  title: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
  isTechnicalAdjustment?: boolean;
  attachedRolls?: string[];
  error?: boolean;
  /** Mensagem do jogador que responde a um pedido de rolagem do Mestre (id da mensagem do Mestre). */
  rollAnswerTo?: string;
  /** Rolagem feita no cartão (registro completo). */
  roll?: DiceRollRecord;
  /** Mensagem do jogador que envia a ficha de personagem pedida pelo Mestre (id da mensagem do Mestre). */
  sheetAnswerTo?: string;
}

export interface GuideQuest {
  title: string;
  location: string;
  deadline?: string;
  summary: string;
}

export interface GuideLocation {
  name: string;
  distanceOrDirection?: string;
  resources?: string;
  notes: string;
}

export interface GuideRaceOrCreature {
  name: string;
  bonuses: string;
  weaknesses: string;
  notes?: string;
}

export interface GuideRemedyOrItem {
  name: string;
  effect: string;
  usageOrSource?: string;
}

export interface GuideCharacter {
  name: string;
  role: string;
  allegiance: string;
  notes?: string;
}

export interface GuideInventoryItem {
  name: string;
  /** Características exatas citadas na história (cor, material, estado, encantamentos). */
  description: string;
  /** equipado, na mochila, no chão... */
  status: string;
  quantity?: number;
}

export interface CampaignGuide {
  currentQuests: GuideQuest[];
  knownLocations: GuideLocation[];
  racesAndCreatures: GuideRaceOrCreature[];
  remediesAndItems: GuideRemedyOrItem[];
  knownCharacters: GuideCharacter[];
  inventory?: GuideInventoryItem[];
  lastUpdatedAt?: string;
}

export type Difficulty = 'muito-facil' | 'facil' | 'medio' | 'dificil';

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  universe: string;
  difficulty?: Difficulty;
  character?: CharacterSheet;
  createdAt: string;
  updatedAt: string;
  attributes: PlayerAttributes;
  gmContextNotes: string;
  messages: ChatMessage[];
  notes: NoteTab[];
  activeNoteId: string;
  rollHistory: DiceRollRecord[];
  guide?: CampaignGuide;
}
