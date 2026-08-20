import React, { useState } from 'react';
import {
  Sparkles,
  Swords,
  GitFork,
  Eye,
  Layers,
  FileText,
  Bot,
  Play,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Settings2,
} from 'lucide-react';
import { sounds } from '../engine/audioEffects';

export type TabType = 'arena' | 'decision-tree' | 'belief' | 'meta' | 'strategy-report';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenGemini: () => void;
  onResetGame: () => void;
  onOpenSetup?: () => void;
  gameSpeed: number;
  setGameSpeed: (s: number) => void;
  isAutoPlaying: boolean;
  setIsAutoPlaying: (v: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGemini,
  onResetGame,
  onOpenSetup,
  gameSpeed,
  setGameSpeed,
  isAutoPlaying,
  setIsAutoPlaying,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(sounds.isMuted);

  const toggleSound = () => {
    sounds.isMuted = !sounds.isMuted;
    setIsMuted(sounds.isMuted);
    if (!sounds.isMuted) {
      sounds.playClickSound();
    }
  };

  return (
    <header className="border-b-2 border-white/10 bg-[#050505] sticky top-0 z-40">
      {/* Top Banner with Badges */}
      <div className="px-4 py-2 bg-black border-b border-white/10 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-black flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            WORLD CHAMPIONSHIP AI SERIES // POKÉMON × HEROZ × GOOGLE CLOUD
          </span>
          <span className="hidden lg:inline text-white/20">|</span>
          <span className="hidden lg:inline text-[10px] uppercase tracking-widest text-white/50 font-bold">
            STRATEGY & TOURNAMENT SIMULATOR
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSetup && (
            <button
              onClick={() => {
                sounds.playClickSound();
                onOpenSetup();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-black hover:bg-white/10 border border-white/20 text-white font-mono text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer"
            >
              <Settings2 className="w-3 h-3 text-yellow-400" />
              <span>CUSTOM MATCH</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            className="p-1.5 bg-black border border-white/20 hover:border-yellow-400 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/40" /> : <Volume2 className="w-3.5 h-3.5 text-yellow-400" />}
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              onOpenGemini();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-[11px] tracking-tight transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>GEMINI STRATEGIST</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 py-3.5">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
              <Zap className="w-6 h-6 fill-black" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.35em] text-white/50 font-bold leading-none mb-1">
                POKÉMON TCG AI CHALLENGE
              </p>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none text-white font-display">
                AI_BATTLE <span className="text-stroke-white">CHALLENGE</span>
              </h1>
            </div>
          </div>

          {/* Mobile Quick Action */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => {
                sounds.playClickSound();
                setIsAutoPlaying(!isAutoPlaying);
              }}
              className={`p-2 border font-black text-xs uppercase ${
                isAutoPlaying ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black text-white border-white/20'
              }`}
            >
              <Play className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 bg-black p-1.5 border border-white/15 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => {
              sounds.playClickSound();
              setActiveTab('arena');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Battle Arena</span>
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              setActiveTab('decision-tree');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'decision-tree'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>MCTS Game Tree</span>
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              setActiveTab('belief');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'belief'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Hidden Belief</span>
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              setActiveTab('meta');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'meta'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Meta Lab</span>
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              setActiveTab('strategy-report');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'strategy-report'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Strategy Paper</span>
          </button>
        </nav>

        {/* Global Game Controls */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Speed selector */}
          <div className="flex items-center bg-black border border-white/20 p-1 text-xs">
            <span className="px-2 text-white/40 font-mono text-[9px] font-bold tracking-widest">SPD:</span>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  sounds.playClickSound();
                  setGameSpeed(spd);
                }}
                className={`px-2 py-0.5 text-[10px] font-black font-mono cursor-pointer uppercase ${
                  gameSpeed === spd
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              sounds.playClickSound();
              setIsAutoPlaying(!isAutoPlaying);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
              isAutoPlaying
                ? 'bg-red-500 text-white border-red-400'
                : 'bg-white text-black border-white hover:bg-yellow-400 hover:border-yellow-400'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isAutoPlaying ? 'animate-pulse' : ''}`} />
            <span>{isAutoPlaying ? 'PAUSE BOT' : 'AUTO BOT'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClickSound();
              onResetGame();
            }}
            title="Reset Match"
            className="p-2 border border-white/20 bg-black hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
