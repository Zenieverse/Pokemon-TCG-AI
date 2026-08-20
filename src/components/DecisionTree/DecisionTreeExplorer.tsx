import React, { useState } from 'react';
import { GameState, MCTSNode } from '../../types/pokemon';
import { runISMCTS } from '../../engine/aiBot';
import {
  GitFork,
  BrainCircuit,
  TrendingUp,
  Sparkles,
  Zap,
  Info,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface DecisionTreeExplorerProps {
  gameState: GameState;
}

export const DecisionTreeExplorer: React.FC<DecisionTreeExplorerProps> = ({ gameState }) => {
  const [simulations, setSimulations] = useState<number>(100);
  const [explorationConstant, setExplorationConstant] = useState<number>(1.414);
  const [selectedNode, setSelectedNode] = useState<MCTSNode | null>(null);

  const mctsResult = runISMCTS(gameState, simulations, 4);
  const rootNode = mctsResult.tree;

  const currentNode = selectedNode || rootNode.children[0] || rootNode;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-black border-2 border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-yellow-400 mb-1 flex items-center gap-2">
            <GitFork className="w-4 h-4" />
            DECISION INTELLIGENCE // POKÉMON TCG AI LAB
          </p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tighter font-display">
            IS-MCTS <span className="text-stroke-white">DECISION TREE</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl font-medium">
            Monte Carlo Tree Search policy rollouts, Bayesian opponent belief determinizations,
            and Upper Confidence Bound (UCT) branch selections for the active board state.
          </p>
        </div>

        {/* Simulation Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-black p-3 border border-white/20 text-xs font-mono">
          <div>
            <span className="text-white/50 block text-[9px] font-black uppercase tracking-widest">ROLLOUT SIMS</span>
            <div className="flex items-center gap-1 mt-1">
              {[50, 100, 250].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimulations(s)}
                  className={`px-3 py-1 font-black cursor-pointer uppercase ${
                    simulations === s
                      ? 'bg-yellow-400 text-black'
                      : 'bg-black text-white border border-white/20 hover:border-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border-l border-white/20 pl-3">
            <span className="text-white/50 block text-[9px] font-black uppercase tracking-widest">EXPLORATION CONSTANT</span>
            <span className="text-yellow-400 font-black text-xs mt-1 block">C = {explorationConstant}</span>
          </div>
        </div>
      </div>

      {/* UCT Mathematical Formula Card */}
      <div className="p-4 bg-black border-2 border-white/10 text-xs font-mono text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-400 text-black border border-white">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <span className="text-white font-black uppercase tracking-wider block text-sm">UCT SELECTION FORMULA</span>
            <span className="text-white/50 text-xs">
              Balancing Exploitation (Q-Value) vs Exploration (Unvisited Belief States)
            </span>
          </div>
        </div>
        <div className="px-5 py-2.5 bg-black border-2 border-yellow-400 font-mono text-yellow-400 text-sm font-black tracking-wider text-center">
          UCT(S, A) = Q(S, A) + C · √( LN N(S) / N(S, A) )
        </div>
      </div>

      {/* Tree Visualization Grid: Branches (Left) & Node Deep Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Action Candidates & MCTS Tree Nodes */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-black border-2 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-400" />
                ROOT CANDIDATE BRANCHES ({rootNode.children.length})
              </h3>
              <span className="text-xs text-white/50 font-mono font-bold uppercase">
                TOTAL VISITS: {rootNode.visits}
              </span>
            </div>

            <div className="space-y-2.5">
              {rootNode.children.map((child, idx) => {
                const isTopEV = idx === 0;
                const isSelected = currentNode?.id === child.id;
                const winRate = child.visits > 0 ? ((child.wins / child.visits) * 100).toFixed(1) : '50.0';

                return (
                  <div
                    key={child.id}
                    onClick={() => setSelectedNode(child)}
                    className={`p-4 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-xl'
                        : 'bg-black border-white/15 hover:border-white/40 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center font-mono text-[10px] font-black ${
                          isSelected ? 'bg-black text-yellow-400' : 'bg-white/10 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-black uppercase text-xs sm:text-sm tracking-tight">{child.actionLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTopEV && (
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isSelected ? 'bg-black text-yellow-400' : 'bg-yellow-400 text-black'
                          }`}>
                            OPTIMAL PATH
                          </span>
                        )}
                        <span className={`font-mono font-black text-xs sm:text-sm ${
                          isSelected ? 'text-black' : 'text-yellow-400'
                        }`}>
                          {winRate}% WIN
                        </span>
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className={`w-full h-2 overflow-hidden my-2 ${isSelected ? 'bg-black/20' : 'bg-white/10'}`}>
                      <div
                        className={`h-full transition-all ${isSelected ? 'bg-black' : 'bg-yellow-400'}`}
                        style={{ width: `${winRate}%` }}
                      />
                    </div>

                    {/* Stats */}
                    <div className={`flex flex-wrap items-center justify-between text-[11px] font-mono pt-1 uppercase font-bold ${
                      isSelected ? 'text-black/80' : 'text-white/50'
                    }`}>
                      <span>VISITS N: {child.visits}</span>
                      <span>Q-VALUE: {child.qValue}</span>
                      <span>UCT: {child.uctScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Node Explainability & Rollout Analytics */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-black border-2 border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">BRANCH EVALUATION</h3>
              </div>
              <span className="text-xs font-mono text-white/50 font-bold uppercase">DEPTH: {currentNode.depth}</span>
            </div>

            <div>
              <h4 className="text-lg font-black uppercase text-yellow-400 font-display">{currentNode.actionLabel}</h4>
              <p className="text-xs text-white/80 mt-1 font-medium">{currentNode.action.description}</p>
            </div>

            {/* Neural Value Heuristic Breakdown */}
            {currentNode.valueBreakdown && (
              <div className="space-y-2.5 pt-2 border-t border-white/15">
                <span className="text-xs font-black uppercase text-white font-mono flex items-center gap-1.5 tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                  HEURISTIC VALUE BREAKDOWN
                </span>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-black border border-white/15">
                    <span className="text-white/50 uppercase font-bold">PRIZE ADVANTAGE:</span>
                    <span className="font-black text-yellow-400">
                      +{currentNode.valueBreakdown.prizeScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black border border-white/15">
                    <span className="text-white/50 uppercase font-bold">ENERGY VELOCITY:</span>
                    <span className="font-black text-yellow-400">
                      +{currentNode.valueBreakdown.energyScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black border border-white/15">
                    <span className="text-white/50 uppercase font-bold">TEMPO & HP DIFFERENTIAL:</span>
                    <span className="font-black text-yellow-400">
                      +{currentNode.valueBreakdown.tempoScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black border border-white/15">
                    <span className="text-white/50 uppercase font-bold">KO THREAT CLOCK:</span>
                    <span className="font-black text-yellow-400">
                      +{currentNode.valueBreakdown.threatScore}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Belief Context */}
            <div className="p-3.5 bg-black border border-white/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-yellow-400 font-black uppercase font-mono">
                <Info className="w-3.5 h-3.5" />
                <span>IMPERFECT INFO DETERMINIZATION</span>
              </div>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Rollouts across this branch simulated <strong>{simulations}</strong> distinct opponent hand
                configurations sampled from Bayesian priors, ensuring robustness against surprise Boss’s
                Orders or Iono disruption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
