import React, { useState } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { BattleArena } from './components/Arena/BattleArena';
import { DecisionTreeExplorer } from './components/DecisionTree/DecisionTreeExplorer';
import { BeliefStateVisualizer } from './components/BeliefEngine/BeliefStateVisualizer';
import { MetaDeckLab } from './components/MetaLab/MetaDeckLab';
import { TournamentStrategyReport } from './components/StrategyReport/TournamentStrategyReport';
import { GeminiStrategistModal } from './components/GeminiCoPilot/GeminiStrategistModal';
import { META_ARCHETYPES } from './data/metaDecks';
import { createInitialGameState } from './engine/battleEngine';
import { GameState } from './types/pokemon';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('arena');
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [geminiModalOpen, setGeminiModalOpen] = useState<boolean>(false);

  // Initialize match between Charizard ex (Player 1) and Gardevoir ex (Player 2 AI)
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(
      META_ARCHETYPES[0], // Charizard ex / Pidgeot ex
      META_ARCHETYPES[1], // Gardevoir ex
      false, // Player 1 is Human (or can toggle AI)
      true,  // Player 2 is AI
      'is_mcts',
      'is_mcts',
      3, // 3 Prize cards for fast dynamic battles
    ),
  );

  const handleResetGame = () => {
    setIsAutoPlaying(false);
    setGameState(
      createInitialGameState(
        META_ARCHETYPES[0],
        META_ARCHETYPES[1],
        false,
        true,
        'is_mcts',
        'is_mcts',
        3,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar & Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGemini={() => setGeminiModalOpen(true)}
        onResetGame={handleResetGame}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
        isAutoPlaying={isAutoPlaying}
        setIsAutoPlaying={setIsAutoPlaying}
      />

      {/* Main Content Area Based on Active Tab */}
      <main className="flex-1 pb-12">
        {activeTab === 'arena' && (
          <BattleArena
            gameState={gameState}
            setGameState={setGameState}
            onOpenGemini={() => setGeminiModalOpen(true)}
            isAutoPlaying={isAutoPlaying}
            setIsAutoPlaying={setIsAutoPlaying}
            gameSpeed={gameSpeed}
          />
        )}

        {activeTab === 'decision-tree' && (
          <DecisionTreeExplorer gameState={gameState} />
        )}

        {activeTab === 'belief' && (
          <BeliefStateVisualizer gameState={gameState} />
        )}

        {activeTab === 'meta' && (
          <MetaDeckLab
            onSelectDeckForBattle={(deck) => {
              setGameState(
                createInitialGameState(
                  deck,
                  META_ARCHETYPES[1],
                  false,
                  true,
                  'is_mcts',
                  'is_mcts',
                  3,
                ),
              );
              setActiveTab('arena');
            }}
          />
        )}

        {activeTab === 'strategy-report' && (
          <TournamentStrategyReport />
        )}
      </main>

      {/* Gemini Grandmaster AI Strategist Modal */}
      <GeminiStrategistModal
        isOpen={geminiModalOpen}
        onClose={() => setGeminiModalOpen(false)}
        gameState={gameState}
      />

      {/* Ticker Bar */}
      <div className="h-10 bg-yellow-400 text-black flex items-center px-6 overflow-hidden text-[10px] font-black uppercase tracking-[0.25em] border-t-2 border-black">
        <div className="animate-marquee whitespace-nowrap flex gap-12 font-mono">
          <span>// POKÉMON TCG AI STRATEGY & BATTLE LAB</span>
          <span>// INFORMATION SET MCTS (ISMCTS) ACTIVE</span>
          <span>// BAYESIAN HIDDEN HAND BELIEF UPDATES</span>
          <span>// GEMINI 3.7 FLASH PROBABILISTIC REASONER</span>
          <span>// TOURNAMENT MATRIX & DECK ARCHETYPES ONLINE</span>
          <span>// OPTIMAL PRIZE MAP & BOARD EVALUATIONS COMPUTED</span>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="border-t border-white/10 bg-black py-4 px-6 text-xs text-white/50 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold uppercase tracking-wider text-white/70">
            POKÉMON TCG AI CHALLENGE // STRATEGY & SIMULATION SUITE
          </span>
          <span className="text-yellow-400 font-bold">
            POWERED BY GOOGLE CLOUD × HEROZ × THE POKÉMON COMPANY
          </span>
        </div>
      </footer>
    </div>
  );
}
