import React, { useState } from 'react';
import { META_ARCHETYPES, getArchetypeById } from '../../data/metaDecks';
import { DeckArchetype, PlayerState } from '../../types/pokemon';
import { Swords, Bot, User, Shield, Zap, Sparkles, X } from 'lucide-react';

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (config: {
    deck1: DeckArchetype;
    deck2: DeckArchetype;
    p1IsAI: boolean;
    p2IsAI: boolean;
    p1AIType: PlayerState['aiType'];
    p2AIType: PlayerState['aiType'];
    prizeCount: number;
  }) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const [deck1Id, setDeck1Id] = useState<string>(META_ARCHETYPES[0].id);
  const [deck2Id, setDeck2Id] = useState<string>(META_ARCHETYPES[1].id);
  const [p1IsAI, setP1IsAI] = useState<boolean>(false);
  const [p2IsAI, setP2IsAI] = useState<boolean>(true);
  const [p1AIType, setP1AIType] = useState<PlayerState['aiType']>('is_mcts');
  const [p2AIType, setP2AIType] = useState<PlayerState['aiType']>('is_mcts');
  const [prizeCount, setPrizeCount] = useState<number>(3);

  if (!isOpen) return null;

  const handleLaunch = () => {
    onStartMatch({
      deck1: getArchetypeById(deck1Id),
      deck2: getArchetypeById(deck2Id),
      p1IsAI,
      p2IsAI,
      p1AIType,
      p2AIType,
      prizeCount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-black border-2 border-yellow-400 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-black border-b-2 border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center font-black shadow-lg">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 font-display">
                MATCH CONFIGURATION & ARENA SETUP
              </h3>
              <p className="text-[10px] text-white/50 font-mono font-bold uppercase">
                Customize Archetypes, Controllers, & AI Decision Engines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-black border border-white/20 hover:border-white text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Prize Count Selector */}
          <div className="p-4 bg-black border border-white/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-black uppercase text-xs">PRIZE CARD COUNT</span>
              <span className="text-yellow-400 font-bold">{prizeCount} PRIZES PER PLAYER</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPrizeCount(count)}
                  className={`flex-1 py-2 font-black uppercase text-xs transition-all cursor-pointer ${
                    prizeCount === count
                      ? 'bg-yellow-400 text-black shadow'
                      : 'bg-black text-white border border-white/20 hover:border-white'
                  }`}
                >
                  {count === 6 ? '6 (STANDARD)' : count === 3 ? '3 (FAST)' : `${count} PRIZE`}
                </button>
              ))}
            </div>
          </div>

          {/* Player 1 Setup */}
          <div className="p-4 bg-black border-2 border-yellow-400/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-yellow-400 font-black uppercase text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-yellow-400" />
                PLAYER 1 (YOU / LEFT SIDE)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setP1IsAI(false)}
                  className={`px-3 py-1 text-[10px] font-black uppercase cursor-pointer ${
                    !p1IsAI ? 'bg-yellow-400 text-black' : 'bg-black text-white border border-white/20'
                  }`}
                >
                  HUMAN
                </button>
                <button
                  type="button"
                  onClick={() => setP1IsAI(true)}
                  className={`px-3 py-1 text-[10px] font-black uppercase cursor-pointer ${
                    p1IsAI ? 'bg-yellow-400 text-black' : 'bg-black text-white border border-white/20'
                  }`}
                >
                  AI BOT
                </button>
              </div>
            </div>

            <div>
              <label className="text-white/60 text-[10px] block mb-1 font-bold uppercase">DECK ARCHETYPE</label>
              <select
                value={deck1Id}
                onChange={(e) => setDeck1Id(e.target.value)}
                className="w-full p-2.5 bg-black border border-white/30 text-white font-black uppercase cursor-pointer"
              >
                {META_ARCHETYPES.map((a) => (
                  <option key={a.id} value={a.id} className="bg-black text-white">
                    {a.name} ({a.tier}) - {a.primaryType}
                  </option>
                ))}
              </select>
            </div>

            {p1IsAI && (
              <div>
                <label className="text-white/60 text-[10px] block mb-1 font-bold uppercase">AI ENGINE</label>
                <select
                  value={p1AIType}
                  onChange={(e) => setP1AIType(e.target.value as any)}
                  className="w-full p-2 bg-black border border-white/30 text-yellow-400 font-bold uppercase cursor-pointer"
                >
                  <option value="is_mcts">Information-Set MCTS (Optimal)</option>
                  <option value="heuristic">Heuristic Value Network</option>
                  <option value="greedy">Greedy Damage Bot</option>
                  <option value="random">Random Policy (Baseline)</option>
                </select>
              </div>
            )}
          </div>

          {/* Player 2 Setup */}
          <div className="p-4 bg-black border-2 border-red-500/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-red-400 font-black uppercase text-xs flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-red-400" />
                PLAYER 2 (OPPONENT / RIGHT SIDE)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setP2IsAI(false)}
                  className={`px-3 py-1 text-[10px] font-black uppercase cursor-pointer ${
                    !p2IsAI ? 'bg-red-500 text-white' : 'bg-black text-white border border-white/20'
                  }`}
                >
                  HUMAN
                </button>
                <button
                  type="button"
                  onClick={() => setP2IsAI(true)}
                  className={`px-3 py-1 text-[10px] font-black uppercase cursor-pointer ${
                    p2IsAI ? 'bg-red-500 text-white' : 'bg-black text-white border border-white/20'
                  }`}
                >
                  AI BOT
                </button>
              </div>
            </div>

            <div>
              <label className="text-white/60 text-[10px] block mb-1 font-bold uppercase">DECK ARCHETYPE</label>
              <select
                value={deck2Id}
                onChange={(e) => setDeck2Id(e.target.value)}
                className="w-full p-2.5 bg-black border border-white/30 text-white font-black uppercase cursor-pointer"
              >
                {META_ARCHETYPES.map((a) => (
                  <option key={a.id} value={a.id} className="bg-black text-white">
                    {a.name} ({a.tier}) - {a.primaryType}
                  </option>
                ))}
              </select>
            </div>

            {p2IsAI && (
              <div>
                <label className="text-white/60 text-[10px] block mb-1 font-bold uppercase">AI ENGINE</label>
                <select
                  value={p2AIType}
                  onChange={(e) => setP2AIType(e.target.value as any)}
                  className="w-full p-2 bg-black border border-white/30 text-red-400 font-bold uppercase cursor-pointer"
                >
                  <option value="is_mcts">Information-Set MCTS (Optimal)</option>
                  <option value="heuristic">Heuristic Value Network</option>
                  <option value="greedy">Greedy Damage Bot</option>
                  <option value="random">Random Policy (Baseline)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black border-t-2 border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-black border border-white/20 hover:border-white text-white font-mono uppercase text-xs cursor-pointer font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-tight shadow-lg cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>START CUSTOM MATCH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
