import React, { useState } from 'react';
import { META_ARCHETYPES, getArchetypeById } from '../../data/metaDecks';
import { DeckArchetype } from '../../types/pokemon';
import { CardView } from '../Arena/CardView';
import {
  Layers,
  Flame,
  Zap,
  TrendingUp,
  Shield,
  Activity,
  Play,
  RotateCcw,
  Sparkles,
  BarChart3,
  Percent,
} from 'lucide-react';

interface MetaDeckLabProps {
  onSelectDeckForBattle?: (deck: DeckArchetype) => void;
}

export const MetaDeckLab: React.FC<MetaDeckLabProps> = ({ onSelectDeckForBattle }) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(META_ARCHETYPES[0].id);
  const [batchDeckAId, setBatchDeckAId] = useState<string>(META_ARCHETYPES[0].id);
  const [batchDeckBId, setBatchDeckBId] = useState<string>(META_ARCHETYPES[1].id);
  const [batchSimulating, setBatchSimulating] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  const selectedDeck = getArchetypeById(selectedDeckId);
  const deckA = getArchetypeById(batchDeckAId);
  const deckB = getArchetypeById(batchDeckBId);

  // Monte Carlo Opening Hand Consistency Analysis (10,000 simulations)
  const computeConsistencyMetrics = (archetype: DeckArchetype) => {
    let basicsCount = 0;
    let turn2EvoCount = 0;
    let energyInHandCount = 0;
    const totalSims = 5000;

    for (let s = 0; s < totalSims; s++) {
      const shuffled = [...archetype.cards].sort(() => Math.random() - 0.5);
      const hand = shuffled.slice(0, 5);

      const hasBasic = hand.some((c) => c.cardType === 'pokemon' && c.stage === 'Basic');
      const hasEnergy = hand.some((c) => c.cardType === 'energy');
      const hasEvoPiece =
        hand.some((c) => c.stage === 'Stage 1' || c.stage === 'Stage 2') ||
        hand.some((c) => c.id === 'tr_rare_candy');

      if (hasBasic) basicsCount++;
      if (hasEnergy) energyInHandCount++;
      if (hasBasic && hasEvoPiece) turn2EvoCount++;
    }

    return {
      basicRate: Number(((basicsCount / totalSims) * 100).toFixed(1)),
      energyRate: Number(((energyInHandCount / totalSims) * 100).toFixed(1)),
      turn2EvoRate: Number(((turn2EvoCount / totalSims) * 100).toFixed(1)),
      brickRate: Number((((totalSims - basicsCount) / totalSims) * 100).toFixed(1)),
    };
  };

  const consistencyMetrics = computeConsistencyMetrics(selectedDeck);

  const runBatchSimulation = async (sims: number = 100) => {
    setBatchSimulating(true);
    try {
      const response = await fetch('/api/sim/batch-matchup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckA,
          deckB,
          iterations: sims,
        }),
      });
      const data = await response.json();
      setBatchResult(data);
    } catch (e) {
      console.error('Batch sim error', e);
    } finally {
      setBatchSimulating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="p-6 bg-black border-2 border-white/10">
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-yellow-400 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          META INTELLIGENCE // MONTE CARLO MATRIX
        </p>
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tighter font-display">
          STANDARD ARCHETYPES & <span className="text-stroke-white">HEATMAPS</span>
        </h2>
        <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl font-medium">
          Evaluate tournament deck archetypes, run 5,000-hand Monte Carlo opening consistency calculations,
          and simulate batch matches across competing AI strategies.
        </p>
      </div>

      {/* Archetype Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {META_ARCHETYPES.map((arch) => (
          <button
            key={arch.id}
            onClick={() => setSelectedDeckId(arch.id)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              selectedDeckId === arch.id
                ? 'bg-yellow-400 text-black shadow-lg'
                : 'bg-black text-white border border-white/20 hover:border-white'
            }`}
          >
            <span>{arch.name}</span>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-black font-mono ${
                selectedDeckId === arch.id
                  ? 'bg-black text-yellow-400'
                  : 'bg-white/10 text-yellow-400'
              }`}
            >
              {arch.tier}
            </span>
          </button>
        ))}
      </div>

      {/* Grid: Deck Details & Consistency (Left) & Matchup Matrix + Batch Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Decklist & Consistency Stats */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 bg-black border-2 border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase text-white tracking-tight font-display">{selectedDeck.name}</h3>
                <span className="text-xs text-white/50 font-mono font-bold uppercase">
                  TYPE: {selectedDeck.primaryType} // TIER: {selectedDeck.tier}
                </span>
              </div>
              <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-mono font-black uppercase">
                {selectedDeck.cards.length} CARDS
              </span>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-medium">{selectedDeck.description}</p>

            {/* Power / Speed / Consistency Ratings */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-black border border-white/15 text-center">
                <span className="text-[9px] font-mono text-white/50 font-bold uppercase block">SPEED</span>
                <span className="text-lg font-black text-yellow-400 font-mono">
                  {selectedDeck.speed} / 10
                </span>
              </div>
              <div className="p-3 bg-black border border-white/15 text-center">
                <span className="text-[9px] font-mono text-white/50 font-bold uppercase block">DAMAGE CEILING</span>
                <span className="text-lg font-black text-red-400 font-mono">
                  {selectedDeck.power} / 10
                </span>
              </div>
              <div className="p-3 bg-black border border-white/15 text-center">
                <span className="text-[9px] font-mono text-white/50 font-bold uppercase block">CONSISTENCY</span>
                <span className="text-lg font-black text-yellow-400 font-mono">
                  {selectedDeck.consistency} / 10
                </span>
              </div>
            </div>

            {/* Monte Carlo 5,000 Opening Hand Simulation */}
            <div className="p-4 bg-black border-2 border-yellow-400 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-yellow-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <Percent className="w-3.5 h-3.5" />
                  MONTE CARLO 5,000-HAND CONSISTENCY
                </span>
                <span className="text-[10px] text-white/50 font-mono uppercase font-bold">EMPIRICAL SAMPLING</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-black border border-white/15">
                  <span className="text-[9px] text-white/50 uppercase font-bold block">OPENING BASIC</span>
                  <span className="font-black text-yellow-400 text-sm">{consistencyMetrics.basicRate}%</span>
                </div>
                <div className="p-2.5 bg-black border border-white/15">
                  <span className="text-[9px] text-white/50 uppercase font-bold block">T1 ENERGY</span>
                  <span className="font-black text-yellow-400 text-sm">{consistencyMetrics.energyRate}%</span>
                </div>
                <div className="p-2.5 bg-black border border-white/15">
                  <span className="text-[9px] text-white/50 uppercase font-bold block">T2 EVOLUTION</span>
                  <span className="font-black text-yellow-400 text-sm">{consistencyMetrics.turn2EvoRate}%</span>
                </div>
                <div className="p-2.5 bg-black border border-white/15">
                  <span className="text-[9px] text-white/50 uppercase font-bold block">BRICK / MULL</span>
                  <span className="font-black text-red-400 text-sm">{consistencyMetrics.brickRate}%</span>
                </div>
              </div>
            </div>

            {/* Strategic Guide */}
            <div className="p-3.5 bg-black border border-white/15 space-y-1">
              <span className="text-xs font-black uppercase text-yellow-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                EXECUTION STRATEGY
              </span>
              <p className="text-xs text-white/70 leading-relaxed font-medium">
                {selectedDeck.strategySummary}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Matchup Heatmap & Batch Simulator */}
        <div className="lg:col-span-6 space-y-4">
          {/* Matchup Heatmap Matrix */}
          <div className="p-5 bg-black border-2 border-white/10 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-yellow-400" />
              MATCHUP MATRIX HEATMAP
            </h3>
            <p className="text-xs text-white/60 font-medium">
              Empirical and simulated win percentages across standard format meta pairings:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-white/15 text-[10px] text-white/50 font-mono uppercase font-bold">
                    <th className="py-2.5 px-1">Archetype</th>
                    <th className="py-2.5 px-1 text-center">vs Charizard</th>
                    <th className="py-2.5 px-1 text-center">vs Gardevoir</th>
                    <th className="py-2.5 px-1 text-center">vs Pikachu</th>
                    <th className="py-2.5 px-1 text-center">vs Miraidon</th>
                    <th className="py-2.5 px-1 text-center">vs Starmie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-mono">
                  {META_ARCHETYPES.map((arch) => (
                    <tr
                      key={arch.id}
                      className={arch.id === selectedDeckId ? 'bg-yellow-400/10 font-black' : ''}
                    >
                      <td className="py-2.5 px-1 truncate max-w-[110px] text-white uppercase font-bold">
                        {arch.name.split('/')[0]}
                      </td>
                      {['charizard_pidgeot', 'gardevoir_ex', 'pikachu_zapdos', 'miraidon_ironhands', 'starmie_articuno'].map(
                        (oppId) => {
                          const rate = arch.winRatesAgainst[oppId] || 50;
                          const isHigh = rate >= 55;
                          const isLow = rate <= 45;
                          return (
                            <td key={oppId} className="py-2.5 px-1 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                                  isHigh
                                    ? 'bg-yellow-400 text-black'
                                    : isLow
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white/10 text-white'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Match Simulator */}
          <div className="p-5 bg-black border-2 border-white/10 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              BATCH IS-MCTS SIMULATOR
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-white/50 text-[10px] font-mono font-bold block mb-1 uppercase">DECK A</label>
                <select
                  value={batchDeckAId}
                  onChange={(e) => setBatchDeckAId(e.target.value)}
                  className="w-full p-2.5 bg-black border border-white/20 text-white font-bold uppercase cursor-pointer"
                >
                  {META_ARCHETYPES.map((a) => (
                    <option key={a.id} value={a.id} className="bg-black text-white">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-[10px] font-mono font-bold block mb-1 uppercase">DECK B</label>
                <select
                  value={batchDeckBId}
                  onChange={(e) => setBatchDeckBId(e.target.value)}
                  className="w-full p-2.5 bg-black border border-white/20 text-white font-bold uppercase cursor-pointer"
                >
                  {META_ARCHETYPES.map((a) => (
                    <option key={a.id} value={a.id} className="bg-black text-white">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runBatchSimulation(100)}
                disabled={batchSimulating}
                className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-tight shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>{batchSimulating ? 'SIMULATING 100 MATCHES...' : 'SIMULATE 100 GAMES'}</span>
              </button>
            </div>

            {/* Batch Result Display */}
            {batchResult && (
              <div className="p-4 bg-black border-2 border-yellow-400 text-xs font-mono space-y-2.5">
                <div className="flex items-center justify-between font-black uppercase text-sm">
                  <span className="text-yellow-400">
                    {batchResult.deckA}: {batchResult.deckAWinRate}% ({batchResult.deckAWins} WINS)
                  </span>
                  <span className="text-red-400">
                    {batchResult.deckB}: {batchResult.deckBWinRate}% ({batchResult.deckBWins} WINS)
                  </span>
                </div>

                <div className="w-full bg-white/10 h-3 overflow-hidden flex">
                  <div
                    className="bg-yellow-400 h-full transition-all"
                    style={{ width: `${batchResult.deckAWinRate}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${batchResult.deckBWinRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/50 font-bold uppercase">
                  <span>TOTAL SIMULATED: {batchResult.totalMatches}</span>
                  <span>AVG MATCH LENGTH: {batchResult.averageTurns} TURNS</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
