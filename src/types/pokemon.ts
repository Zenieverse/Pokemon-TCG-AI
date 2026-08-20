export type EnergyType = 'Fire' | 'Water' | 'Grass' | 'Lightning' | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal' | 'Dragon' | 'Colorless';

export type CardType = 'pokemon' | 'trainer' | 'energy';

export type PokemonStage = 'Basic' | 'Stage 1' | 'Stage 2' | 'ex' | 'VSTAR';

export type TrainerType = 'Item' | 'Supporter' | 'Stadium' | 'Tool';

export interface Attack {
  name: string;
  cost: EnergyType[];
  damage: number;
  effectText?: string;
  effectType?: 'discard_energy' | 'bench_damage' | 'heal' | 'draw' | 'status' | 'none';
  effectVal?: number;
}

export interface Ability {
  name: string;
  description: string;
  abilityType: 'energy_accel' | 'search_deck' | 'draw' | 'damage_spread' | 'passive';
}

export interface Card {
  id: string;
  name: string;
  cardType: CardType;
  image?: string;
  description?: string;
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Double Rare' | 'Ultra Rare' | 'Special Art';
  
  // Pokemon attributes
  stage?: PokemonStage;
  evolvesFrom?: string;
  pokemonType?: EnergyType;
  hp?: number;
  attacks?: Attack[];
  ability?: Ability;
  weakness?: EnergyType;
  resistance?: EnergyType;
  retreatCost?: number;
  isEx?: boolean;

  // Trainer attributes
  trainerType?: TrainerType;
  trainerEffect?: string;

  // Energy attributes
  energyType?: EnergyType;
  providesCount?: number;
}

export interface PokemonInPlay {
  instanceId: string;
  card: Card;
  currentHp: number;
  maxHp: number;
  attachedEnergy: EnergyType[];
  turnPlayed: number;
  statusConditions: ('Asleep' | 'Poisoned' | 'Burned' | 'Paralyzed')[];
  damageCounters: number;
}

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  aiType?: 'is_mcts' | 'heuristic' | 'greedy' | 'random' | 'gemini';
  deck: Card[];
  hand: Card[];
  prizes: Card[];
  discard: Card[];
  active: PokemonInPlay | null;
  bench: PokemonInPlay[];
  energyAttachedThisTurn: boolean;
  supporterPlayedThisTurn: boolean;
  abilityUsedThisTurn: Record<string, boolean>;
  hasRetreatedThisTurn: boolean;
  knockedOutPrizesTaken: number;
}

export type GamePhase = 
  | 'SETUP'
  | 'DRAW'
  | 'MAIN'
  | 'ATTACK'
  | 'CHECKUP'
  | 'GAME_OVER';

export interface GameState {
  turnNumber: number;
  activePlayerIndex: number; // 0 for player 1, 1 for player 2
  players: [PlayerState, PlayerState];
  phase: GamePhase;
  stadium: Card | null;
  winner: string | null;
  winReason?: string;
  log: BattleLogEntry[];
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  playerIndex: number;
  playerName: string;
  action: string;
  details?: string;
  type: 'info' | 'attack' | 'evolution' | 'trainer' | 'knockout' | 'draw' | 'energy';
  timestamp: string;
}

export type GameActionType =
  | 'ATTACH_ENERGY'
  | 'PLAY_BASIC'
  | 'EVOLVE'
  | 'PLAY_TRAINER'
  | 'USE_ABILITY'
  | 'RETREAT'
  | 'ATTACK'
  | 'PASS_TURN';

export interface GameAction {
  type: GameActionType;
  cardId?: string;
  targetInstanceId?: string;
  benchIndex?: number;
  attackIndex?: number;
  label: string;
  description: string;
  estimatedValue?: number; // Score / win probability evaluated by AI
}

export interface MCTSNode {
  id: string;
  actionLabel: string;
  action: GameAction;
  visits: number;
  wins: number;
  qValue: number;
  uctScore: number;
  children: MCTSNode[];
  depth: number;
  beliefContext?: string;
  valueBreakdown?: {
    prizeScore: number;
    energyScore: number;
    tempoScore: number;
    threatScore: number;
  };
}

export interface BeliefDistribution {
  cardName: string;
  category: 'Supporter' | 'Item' | 'Energy' | 'Key Evolution' | 'Boss/Disruption';
  probability: number;
  copiesRemainingInDeckOrHand: number;
  strategicThreat: 'Critical' | 'High' | 'Moderate' | 'Low';
  reasoning: string;
}

export interface DeckArchetype {
  id: string;
  name: string;
  primaryType: EnergyType;
  secondaryType?: EnergyType;
  tier: 'Tier 1 (S)' | 'Tier 1.5 (A)' | 'Tier 2 (B)';
  description: string;
  speed: number; // 1-10
  power: number; // 1-10
  consistency: number; // 1-10
  keyCards: string[];
  cards: Card[];
  winRatesAgainst: Record<string, number>;
  strategySummary: string;
}
