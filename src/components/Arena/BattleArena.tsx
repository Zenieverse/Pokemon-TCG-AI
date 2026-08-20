import React, { useState, useEffect } from 'react';
import {
  Card,
  GameAction,
  GameState,
  PlayerState,
  PokemonInPlay,
} from '../../types/pokemon';
import { CardView } from './CardView';
import {
  executeAction,
  getLegalActions,
} from '../../engine/battleEngine';
import {
  computeOpponentBeliefDistributions,
  evaluateBoardState,
  runGreedyBot,
  runHeuristicBot,
  runISMCTS,
  runRandomBot,
} from '../../engine/aiBot';
import { sounds } from '../../engine/audioEffects';
import { DiscardPileModal } from './DiscardPileModal';
import { CardInspectModal } from './CardInspectModal';
import {
  Swords,
  Sparkles,
  Zap,
  Shield,
  Bot,
  Flame,
  BrainCircuit,
  Eye,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCcw,
  Trophy,
  Download,
  Filter,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BattleArenaProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onOpenGemini: () => void;
  isAutoPlaying: boolean;
  setIsAutoPlaying: (v: boolean) => void;
  gameSpeed: number;
  onResetMatch?: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  gameState,
  setGameState,
  onOpenGemini,
  isAutoPlaying,
  setIsAutoPlaying,
  gameSpeed,
  onResetMatch,
}) => {
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null);
  const [inspectedCard, setInspectedCard] = useState<{
    card: Card;
    state?: PokemonInPlay;
  } | null>(null);
  const [discardModal, setDiscardModal] = useState<{
    isOpen: boolean;
    playerName: string;
    cards: Card[];
  }>({
    isOpen: false,
    playerName: '',
    cards: [],
  });
  const [activeTabSide, setActiveTabSide] = useState<'ai' | 'beliefs' | 'log'>('ai');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ATTACK' | 'TRAINER' | 'KO'>('ALL');
  const [aiThinking, setAiThinking] = useState<boolean>(false);

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isHumanTurn = !activePlayer.isAI && !gameState.winner;

  const legalActions = getLegalActions(gameState);
  const mctsResult = runISMCTS(gameState, 40, 3);
  const beliefDistributions = computeOpponentBeliefDistributions(gameState, gameState.activePlayerIndex);
  const evalMetrics = evaluateBoardState(gameState, gameState.activePlayerIndex);

  // Trigger win confetti & knockout audio
  useEffect(() => {
    if (gameState.winner) {
      sounds.playKnockoutSound();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [gameState.winner]);

  // Audio trigger helper
  const triggerActionSound = (action: GameAction) => {
    if (action.type === 'ATTACK') {
      sounds.playAttackSound(80);
    } else if (action.type === 'ATTACH_ENERGY') {
      sounds.playEnergySound();
    } else if (action.type === 'EVOLVE') {
      sounds.playEvolutionSound();
    } else if (action.type === 'PLAY_TRAINER') {
      sounds.playDrawSound();
    } else {
      sounds.playClickSound();
    }
  };

  // AI Turn Automator or Autoplay Loop
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!gameState.winner && (activePlayer.isAI || isAutoPlaying)) {
      setAiThinking(true);
      const delay = Math.max(500 / gameSpeed, 200);

      timeout = setTimeout(() => {
        let chosenAction: GameAction;
        const aiMode = activePlayer.aiType || 'is_mcts';

        if (aiMode === 'is_mcts') {
          const res = runISMCTS(gameState, 50, 3);
          chosenAction = res.bestAction;
        } else if (aiMode === 'heuristic') {
          chosenAction = runHeuristicBot(gameState);
        } else if (aiMode === 'greedy') {
          chosenAction = runGreedyBot(gameState);
        } else {
          chosenAction = runRandomBot(gameState);
        }

        triggerActionSound(chosenAction);
        const nextState = executeAction(gameState, chosenAction);
        setGameState(nextState);
        setAiThinking(false);
      }, delay);
    } else {
      setAiThinking(false);
    }

    return () => clearTimeout(timeout);
  }, [gameState, isAutoPlaying, gameSpeed, activePlayer.isAI, activePlayer.aiType]);

  const handleActionClick = (action: GameAction) => {
    if (gameState.winner) return;
    triggerActionSound(action);
    const nextState = executeAction(gameState, action);
    setGameState(nextState);
    setSelectedHandCard(null);
  };

  const handleStepOnce = () => {
    if (gameState.winner || legalActions.length === 0) return;
    const chosenAction = mctsResult.bestAction;
    triggerActionSound(chosenAction);
    const nextState = executeAction(gameState, chosenAction);
    setGameState(nextState);
  };

  const exportBattleLog = () => {
    const text = gameState.log
      .map(
        (l) =>
          `[T${l.turn}] [${l.timestamp}] ${l.playerName}: ${l.action} ${
            l.details ? `(${l.details})` : ''
          }`,
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokemon_tcg_match_turn_${gameState.turnNumber}_log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];

  const filteredLog = gameState.log.filter((entry) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'ATTACK') return entry.action.includes('used');
    if (logFilter === 'KO') return entry.action.includes('Knocked Out') || entry.action.includes('Prize');
    if (logFilter === 'TRAINER') return entry.action.includes('played') || entry.action.includes('Attached');
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Card Inspection Modal */}
      <CardInspectModal
        isOpen={Boolean(inspectedCard)}
        onClose={() => setInspectedCard(null)}
        card={inspectedCard?.card || null}
        pokemonState={inspectedCard?.state || null}
      />

      {/* Discard Pile Modal */}
      <DiscardPileModal
        isOpen={discardModal.isOpen}
        onClose={() => setDiscardModal({ isOpen: false, playerName: '', cards: [] })}
        playerName={discardModal.playerName}
        discardCards={discardModal.cards}
      />

      {/* Top Banner / Match Status & Win Notification */}
      {gameState.winner ? (
        <div className="p-5 border-2 border-yellow-400 bg-black shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-yellow-400 text-black flex items-center justify-center font-black shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-yellow-400">
                MATCH CONCLUDED
              </p>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight font-display">
                {gameState.winReason || `${gameState.winner} VICTORY`}
              </h2>
              <p className="text-xs text-white/60 font-mono">
                TOTAL TURNS: {gameState.turnNumber} // STRATEGY EXECUTION TERMINATED
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (onResetMatch) {
                onResetMatch();
              } else {
                window.location.reload();
              }
            }}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-sm tracking-tight flex items-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY NEXT MATCH</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 bg-black border-2 border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-white/50 text-[11px]">
              TURN <span className="text-yellow-400 font-black text-base">{gameState.turnNumber}</span>
            </span>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 font-black uppercase tracking-wider">
              <span className="w-2.5 h-2.5 bg-yellow-400 animate-ping" />
              <span className="text-white">{activePlayer.name}</span>
              <span className="text-[9px] px-2 py-0.5 border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 font-mono font-black">
                {activePlayer.isAI ? `BOT (${activePlayer.aiType?.toUpperCase()})` : 'HUMAN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {aiThinking && (
              <span className="inline-flex items-center gap-1.5 text-yellow-400 font-mono text-[11px] font-black uppercase animate-pulse">
                <BrainCircuit className="w-3.5 h-3.5" />
                IS-MCTS COMPUTING...
              </span>
            )}
            <button
              onClick={handleStepOnce}
              disabled={Boolean(gameState.winner)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-tight transition-all cursor-pointer disabled:opacity-50"
            >
              <span>AI STEP ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Arena Board (Left 8 cols) & AI Strategist HUD (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Battle Mat (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="border-2 border-white/10 bg-[#050505] p-4 shadow-2xl relative overflow-hidden">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

            {/* OPPONENT AREA (Player 2) */}
            <div className="p-3 bg-black border border-white/15 mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-white">
                  <Bot className="w-4 h-4 text-red-400" />
                  <span>{p2.name}</span>
                  <span className="text-[10px] text-white/50 font-mono font-normal">
                    (HAND: {p2.hand.length} | DECK: {p2.deck.length} |{' '}
                    <button
                      onClick={() =>
                        setDiscardModal({
                          isOpen: true,
                          playerName: p2.name,
                          cards: p2.discard,
                        })
                      }
                      className="underline text-yellow-400/80 hover:text-yellow-400 cursor-pointer font-bold"
                    >
                      DISCARD: {p2.discard.length}
                    </button>
                    )
                  </span>
                </div>
                {/* Prize cards tracker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/50 font-mono uppercase font-bold">PRIZES:</span>
                  <div className="flex gap-1">
                    {p2.prizes.map((_, i) => (
                      <span
                        key={i}
                        className="w-3 h-4 bg-red-500 border border-red-400 shadow-sm"
                      />
                    ))}
                    {Array.from({ length: 3 - p2.prizes.length }).map((_, i) => (
                      <span
                        key={`taken_${i}`}
                        className="w-3 h-4 bg-white/10 border border-white/20"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Opponent Bench & Active Spot */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                {/* Opponent Bench */}
                <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full justify-center">
                  {p2.bench.length === 0 ? (
                    <div className="w-16 h-20 border-2 border-dashed border-white/20 flex items-center justify-center text-[8px] uppercase tracking-wider text-white/40 font-mono font-bold">
                      EMPTY
                    </div>
                  ) : (
                    p2.bench.map((b) => (
                      <CardView
                        key={b.instanceId}
                        card={b.card}
                        pokemonState={b}
                        size="mini"
                        interactive
                        onClick={() => setInspectedCard({ card: b.card, state: b })}
                      />
                    ))
                  )}
                </div>

                {/* Opponent Active Pokémon */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-red-400 font-black uppercase tracking-wider mb-1">
                    OPPONENT ACTIVE
                  </span>
                  {p2.active ? (
                    <CardView
                      card={p2.active.card}
                      pokemonState={p2.active}
                      size="sm"
                      interactive
                      onClick={() => setInspectedCard({ card: p2.active!.card, state: p2.active })}
                    />
                  ) : (
                    <div className="w-28 h-40 border-2 border-dashed border-red-500/40 flex items-center justify-center text-xs text-red-400 font-mono uppercase font-bold">
                      NO ACTIVE
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER CLASH FIELD / STADIUM */}
            <div className="py-2.5 border-y-2 border-white/15 my-3 flex items-center justify-between text-xs font-mono px-4 bg-black">
              <div className="flex items-center gap-2 text-yellow-400 font-black uppercase tracking-wider">
                <Swords className="w-4 h-4 text-yellow-400" />
                <span>COMBAT STADIUM</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-black uppercase">
                  {p1.name}: {p1.knockedOutPrizesTaken} KO
                </span>
                <span className="text-white/30 font-bold">VS</span>
                <span className="text-red-400 font-black uppercase">
                  {p2.name}: {p2.knockedOutPrizesTaken} KO
                </span>
              </div>
            </div>

            {/* PLAYER 1 AREA */}
            <div className="p-3 bg-black border border-white/15 space-y-2">
              {/* Player Active & Bench */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Player Active Pokémon */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-yellow-400 font-black uppercase tracking-wider mb-1">
                    YOUR ACTIVE
                  </span>
                  {p1.active ? (
                    <CardView
                      card={p1.active.card}
                      pokemonState={p1.active}
                      size="sm"
                      interactive
                      onClick={() => setInspectedCard({ card: p1.active!.card, state: p1.active })}
                    />
                  ) : (
                    <div className="w-28 h-40 border-2 border-dashed border-yellow-400/40 flex items-center justify-center text-xs text-yellow-400 font-mono uppercase font-bold">
                      NO ACTIVE
                    </div>
                  )}
                </div>

                {/* Player Bench */}
                <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full justify-center">
                  {p1.bench.length === 0 ? (
                    <div className="w-16 h-20 border-2 border-dashed border-white/20 flex items-center justify-center text-[8px] uppercase tracking-wider text-white/40 font-mono font-bold">
                      EMPTY
                    </div>
                  ) : (
                    p1.bench.map((b) => (
                      <CardView
                        key={b.instanceId}
                        card={b.card}
                        pokemonState={b}
                        size="mini"
                        interactive
                        onClick={() => setInspectedCard({ card: b.card, state: b })}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 font-black uppercase text-white">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <span>{p1.name}</span>
                  <span className="text-[10px] text-white/50 font-mono font-normal">
                    (DECK: {p1.deck.length} |{' '}
                    <button
                      onClick={() =>
                        setDiscardModal({
                          isOpen: true,
                          playerName: p1.name,
                          cards: p1.discard,
                        })
                      }
                      className="underline text-yellow-400/80 hover:text-yellow-400 cursor-pointer font-bold"
                    >
                      DISCARD: {p1.discard.length}
                    </button>
                    )
                  </span>
                </div>
                {/* Player 1 Prize cards */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/50 font-mono uppercase font-bold">YOUR PRIZES:</span>
                  <div className="flex gap-1">
                    {p1.prizes.map((_, i) => (
                      <span
                        key={i}
                        className="w-3 h-4 bg-yellow-400 border border-yellow-300 shadow-sm"
                      />
                    ))}
                    {Array.from({ length: 3 - p1.prizes.length }).map((_, i) => (
                      <span
                        key={`taken_p1_${i}`}
                        className="w-3 h-4 bg-white/10 border border-white/20"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PLAYER HAND AREA */}
            <div className="mt-3 pt-3 border-t-2 border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span>YOUR HAND ({p1.hand.length})</span>
                </span>
                <span className="text-[11px] text-yellow-400/90 font-bold uppercase">
                  {isHumanTurn ? 'SELECT ACTION OR PLAY CARDS' : 'AI TURN RUNNING'}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 min-h-[140px] px-1">
                {p1.hand.map((card, idx) => (
                  <CardView
                    key={`${card.id}_${idx}`}
                    card={card}
                    size="sm"
                    interactive={isHumanTurn}
                    isSelected={selectedHandCard?.id === card.id}
                    onClick={() => {
                      sounds.playClickSound();
                      setSelectedHandCard(card);
                      setInspectedCard({ card });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* INTERACTIVE LEGAL ACTIONS COMMAND BAR */}
          <div className="p-4 border-2 border-white/10 bg-black space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Zap className="w-4 h-4 fill-yellow-400" />
                AVAILABLE LEGAL ACTIONS ({legalActions.length})
              </span>
              <span className="text-[11px] text-white/50 uppercase font-mono">
                IS-MCTS BRANCH EVALUATION ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {legalActions.map((action, idx) => {
                const isRecommended = mctsResult.bestAction.label === action.label;
                const isAttack = action.type === 'ATTACK';
                return (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(action)}
                    className={`text-left p-2.5 border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                      isRecommended
                        ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-md'
                        : isAttack
                        ? 'bg-red-950/60 border-red-500/60 text-red-200 hover:bg-red-900/60'
                        : 'bg-black border-white/20 hover:border-yellow-400 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-black uppercase">
                      <span className="truncate">{action.label}</span>
                      {isRecommended && (
                        <span className="px-1.5 py-0.5 bg-black text-yellow-400 text-[9px] font-black shrink-0">
                          TOP EV
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] line-clamp-1 mt-1 ${isRecommended ? 'text-black/80 font-medium' : 'text-white/50'}`}>
                      {action.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Strategist & MCTS Tree HUD (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Subtabs for Sidepanel */}
          <div className="flex items-center gap-1 bg-black p-1 border-2 border-white/10">
            <button
              onClick={() => {
                sounds.playClickSound();
                setActiveTabSide('ai');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                activeTabSide === 'ai'
                  ? 'bg-yellow-400 text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              AI Engine
            </button>
            <button
              onClick={() => {
                sounds.playClickSound();
                setActiveTabSide('beliefs');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                activeTabSide === 'beliefs'
                  ? 'bg-yellow-400 text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Beliefs
            </button>
            <button
              onClick={() => {
                sounds.playClickSound();
                setActiveTabSide('log');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                activeTabSide === 'log'
                  ? 'bg-yellow-400 text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Action Log
            </button>
          </div>

          {activeTabSide === 'ai' && (
            <div className="space-y-3">
              {/* MCTS Ranked Move Evaluations */}
              <div className="p-4 border-2 border-white/10 bg-black space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-yellow-400" />
                    MCTS SEARCH TREE
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-yellow-400">
                    {mctsResult.searchStats.simulations} ROLLS ({mctsResult.searchStats.rolloutTimeMs}ms)
                  </span>
                </div>

                <div className="space-y-2">
                  {mctsResult.allRankedActions.slice(0, 4).map((ranked, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-black border border-white/15 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-black uppercase">
                        <span className="truncate text-white max-w-[170px]">
                          {i + 1}. {ranked.action.label}
                        </span>
                        <span className="font-mono text-yellow-400">{ranked.winRate}% WIN</span>
                      </div>

                      {/* Probability Bar */}
                      <div className="w-full bg-white/10 h-2 overflow-hidden">
                        <div
                          className="bg-yellow-400 h-full transition-all"
                          style={{ width: `${ranked.winRate}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-white/50 font-mono pt-0.5 font-bold uppercase">
                        <span>VISITS: {ranked.visits}</span>
                        <span>Q(S,A): {ranked.qValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Factor Board Value Breakdown */}
              <div className="p-4 border-2 border-white/10 bg-black space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                  VALUE FUNCTION METRICS
                </h3>
                <p className="text-[10px] text-white/50 font-mono uppercase">
                  TOTAL EVAL: <span className="text-yellow-400 font-black text-sm">{evalMetrics.total}</span>
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-black border border-white/15">
                    <span className="text-[9px] uppercase font-bold text-white/50 block">PRIZE RACE</span>
                    <span
                      className={`font-black text-sm ${
                        evalMetrics.prizeScore >= 0 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {evalMetrics.prizeScore > 0 ? `+${evalMetrics.prizeScore}` : evalMetrics.prizeScore}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black border border-white/15">
                    <span className="text-[9px] uppercase font-bold text-white/50 block">NRG VELOCITY</span>
                    <span
                      className={`font-black text-sm ${
                        evalMetrics.energyScore >= 0 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {evalMetrics.energyScore > 0 ? `+${evalMetrics.energyScore}` : evalMetrics.energyScore}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black border border-white/15">
                    <span className="text-[9px] uppercase font-bold text-white/50 block">TEMPO & HP</span>
                    <span
                      className={`font-black text-sm ${
                        evalMetrics.tempoScore >= 0 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {evalMetrics.tempoScore > 0 ? `+${evalMetrics.tempoScore}` : evalMetrics.tempoScore}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black border border-white/15">
                    <span className="text-[9px] uppercase font-bold text-white/50 block">KO THREAT</span>
                    <span
                      className={`font-black text-sm ${
                        evalMetrics.threatScore >= 0 ? 'text-yellow-400' : 'text-white/50'
                      }`}
                    >
                      +{evalMetrics.threatScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Co-Pilot CTA */}
              <button
                onClick={() => {
                  sounds.playClickSound();
                  onOpenGemini();
                }}
                className="w-full p-3.5 bg-yellow-400 text-black text-left transition-all cursor-pointer group hover:bg-yellow-300 font-bold"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-black" />
                    GEMINI GRANDMASTER AI
                  </span>
                  <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-black/80 font-medium leading-snug">
                  Get full turn-by-turn strategic advice, risk math, and counter-tactics.
                </p>
              </button>
            </div>
          )}

          {activeTabSide === 'beliefs' && (
            <div className="p-4 border-2 border-white/10 bg-black space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-yellow-400" />
                  OPPONENT HAND BELIEF
                </h3>
                <span className="text-[10px] font-mono uppercase font-bold text-white/50">BAYESIAN RADAR</span>
              </div>
              <p className="text-[11px] text-white/60 font-medium">
                Probabilities of opponent holding critical unseen tech cards:
              </p>

              <div className="space-y-2">
                {beliefDistributions.map((belief, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-black border border-white/15 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase text-white">{belief.cardName}</span>
                      <span
                        className={`font-mono font-black ${
                          belief.probability > 60
                            ? 'text-red-400'
                            : belief.probability > 30
                            ? 'text-yellow-400'
                            : 'text-white/60'
                        }`}
                      >
                        {belief.probability}%
                      </span>
                    </div>

                    <div className="w-full bg-white/10 h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          belief.probability > 60
                            ? 'bg-red-500'
                            : belief.probability > 30
                            ? 'bg-yellow-400'
                            : 'bg-white/60'
                        }`}
                        style={{ width: `${belief.probability}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-white/60 font-mono">{belief.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTabSide === 'log' && (
            <div className="p-4 border-2 border-white/10 bg-black space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>BATTLE EVENT STREAM</span>
                </h3>
                <button
                  onClick={exportBattleLog}
                  className="flex items-center gap-1 text-[10px] text-yellow-400 hover:underline uppercase font-bold cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>EXPORT LOG</span>
                </button>
              </div>

              {/* Log filter buttons */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                {(['ALL', 'ATTACK', 'TRAINER', 'KO'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      sounds.playClickSound();
                      setLogFilter(filter);
                    }}
                    className={`px-2 py-0.5 uppercase font-black cursor-pointer transition-all ${
                      logFilter === filter
                        ? 'bg-yellow-400 text-black'
                        : 'bg-black text-white/60 border border-white/20 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredLog.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-xs font-mono">
                    No events matching filter.
                  </div>
                ) : (
                  filteredLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 bg-black border border-white/10 text-[11px] font-mono leading-tight space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[9px] text-white/40 uppercase font-bold">
                        <span>TURN {entry.turn} • {entry.playerName}</span>
                        <span>{entry.timestamp}</span>
                      </div>
                      <p className="text-white font-medium">{entry.action}</p>
                      {entry.details && <p className="text-white/50 text-[10px]">{entry.details}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

