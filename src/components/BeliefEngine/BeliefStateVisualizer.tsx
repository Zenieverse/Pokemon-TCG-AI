import React, { useState } from 'react';
import { GameState } from '../../types/pokemon';
import { computeOpponentBeliefDistributions } from '../../engine/aiBot';
import {
  Eye,
  BrainCircuit,
  Sliders,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Sparkles,
  AlertOctagon,
  CheckCircle,
} from 'lucide-react';

interface BeliefStateVisualizerProps {
  gameState: GameState;
}

export const BeliefStateVisualizer: React.FC<BeliefStateVisualizerProps> = ({ gameState }) => {
  // Sandbox parameters
  const [sandboxDeckSize, setSandboxDeckSize] = useState<number>(30);
  const [sandboxHandSize, setSandboxHandSize] = useState<number>(6);
  const [sandboxCopiesLeft, setSandboxCopiesLeft] = useState<number>(2);

  const realDistributions = computeOpponentBeliefDistributions(gameState, gameState.activePlayerIndex);

  // Hypergeometric computation for sandbox
  const calculateSandboxProb = () => {
    const totalUnseen = sandboxDeckSize + sandboxHandSize;
    if (totalUnseen <= 0 || sandboxCopiesLeft <= 0 || sandboxHandSize <= 0) return 0;
    
    let probNone = 1.0;
    for (let i = 0; i < sandboxHandSize; i++) {
      probNone *= (totalUnseen - sandboxCopiesLeft - i) / (totalUnseen - i);
    }
    return Number((Math.max(0, Math.min(1, 1 - probNone)) * 100).toFixed(1));
  };

  const sandboxProbability = calculateSandboxProb();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="p-6 bg-black border-2 border-white/10">
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-yellow-400 mb-1 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          BAYESIAN INFERENCE // IMPERFECT INFORMATION
        </p>
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tighter font-display">
          OPPONENT BELIEF <span className="text-stroke-white">RADAR</span>
        </h2>
        <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl font-medium">
          In contrast to Chess or Go, Pokémon TCG features hidden hand cards, face-down prize cards, and stochastic deck order.
          Our Bayesian Engine calculates exact real-time probabilities of opponent threats.
        </p>
      </div>

      {/* Grid: Live Match Beliefs (Left) & Interactive Bayesian Sandbox (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Match Belief Distribution */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-black border-2 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-yellow-400" />
                LIVE OPPONENT HAND THREAT PROBABILITIES
              </h3>
              <span className="text-xs text-white/50 font-mono font-bold uppercase">
                HAND: {gameState.players[1 - gameState.activePlayerIndex].hand.length} CARDS
              </span>
            </div>

            <div className="space-y-3">
              {realDistributions.map((belief, idx) => {
                const isCritical = belief.strategicThreat === 'Critical';
                return (
                  <div
                    key={idx}
                    className="p-4 bg-black border border-white/15 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase text-white text-sm tracking-tight">{belief.cardName}</span>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-white/10 text-white font-mono">
                          {belief.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-500 text-white'
                              : 'bg-yellow-400 text-black'
                          }`}
                        >
                          {belief.strategicThreat} THREAT
                        </span>
                        <span className="font-mono font-black text-yellow-400 text-sm">
                          {belief.probability}%
                        </span>
                      </div>
                    </div>

                    {/* Visual Probability Bar */}
                    <div className="w-full bg-white/10 h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          belief.probability > 60
                            ? 'bg-red-500'
                            : 'bg-yellow-400'
                        }`}
                        style={{ width: `${belief.probability}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-white/60">{belief.reasoning}</span>
                      <span className="text-white/40 shrink-0 ml-2 font-bold uppercase">
                        {belief.copiesRemainingInDeckOrHand} REMAINING IN POOL
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Bayesian Calculation Sandbox */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-black border-2 border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/15 pb-3">
              <Sliders className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">BAYESIAN SANDBOX</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Calculate hypergeometric sampling probabilities under custom game states:
            </p>

            <div className="space-y-4 text-xs font-mono">
              {/* Hand Size Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-white">
                  <span className="uppercase font-bold text-white/60">OPPONENT HAND SIZE (H):</span>
                  <span className="font-black text-yellow-400">{sandboxHandSize} CARDS</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={sandboxHandSize}
                  onChange={(e) => setSandboxHandSize(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>

              {/* Deck Size Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-white">
                  <span className="uppercase font-bold text-white/60">REMAINING UNSEEN DECK (D):</span>
                  <span className="font-black text-white">{sandboxDeckSize} CARDS</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={sandboxDeckSize}
                  onChange={(e) => setSandboxDeckSize(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              {/* Copies in Unseen Pool */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-white">
                  <span className="uppercase font-bold text-white/60">TARGET COPIES IN POOL (K):</span>
                  <span className="font-black text-yellow-400">{sandboxCopiesLeft} COPIES</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={sandboxCopiesLeft}
                  onChange={(e) => setSandboxCopiesLeft(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Result Display */}
            <div className="p-5 bg-black border-2 border-yellow-400 text-center space-y-1">
              <span className="text-xs font-black uppercase text-white/70 block tracking-wider">
                P(OPPONENT HOLDS ≥ 1 TARGET IN HAND)
              </span>
              <div className="text-4xl font-black text-yellow-400 font-mono tracking-tighter">
                {sandboxProbability}%
              </div>
              <span className="text-[10px] text-white/40 font-mono block uppercase font-bold">
                UNSEEN POPULATION: {sandboxDeckSize + sandboxHandSize} CARDS
              </span>
            </div>

            {/* Strategy implication card */}
            <div className="p-3.5 bg-black border border-white/20 text-xs text-white space-y-1">
              <span className="font-black uppercase text-yellow-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                STRATEGIC AI RULE
              </span>
              <p className="text-[11px] text-white/60 leading-normal font-medium">
                When Boss’s Orders probability exceeds <strong>50%</strong>, the AI policy network
                penalizes leaving high-value ex Pokémon damaged on the bench.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
