import React, { useState } from 'react';
import { GameState } from '../../types/pokemon';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  BrainCircuit,
  MessageSquare,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface GeminiStrategistModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export const GeminiStrategistModal: React.FC<GeminiStrategistModalProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'explain-action' | 'deck-review' | 'custom'>('explain-action');

  if (!isOpen) return null;

  const handleAnalyze = async (selectedMode: 'explain-action' | 'deck-review' | 'custom' = mode) => {
    setLoading(true);
    setAnalysisResult(null);

    try {
      const activeP = gameState.players[gameState.activePlayerIndex];
      const oppP = gameState.players[1 - gameState.activePlayerIndex];

      const payload = {
        gameState: {
          turn: gameState.turnNumber,
          activePlayer: {
            name: activeP.name,
            activePokemon: activeP.active
              ? {
                  name: activeP.active.card.name,
                  hp: `${activeP.active.currentHp}/${activeP.active.maxHp}`,
                  energy: activeP.active.attachedEnergy,
                }
              : 'None',
            bench: activeP.bench.map((b) => `${b.card.name} (${b.currentHp} HP, ${b.attachedEnergy.length} E)`),
            handSize: activeP.hand.length,
            prizesLeft: activeP.prizes.length,
          },
          opponent: {
            name: oppP.name,
            activePokemon: oppP.active
              ? {
                  name: oppP.active.card.name,
                  hp: `${oppP.active.currentHp}/${oppP.active.maxHp}`,
                  energy: oppP.active.attachedEnergy,
                }
              : 'None',
            bench: oppP.bench.map((b) => `${b.card.name} (${b.currentHp} HP)`),
            handSize: oppP.hand.length,
            prizesLeft: oppP.prizes.length,
          },
        },
        question: question || (selectedMode === 'explain-action' ? 'Explain optimal turn action' : 'Review deck strategy'),
        mode: selectedMode,
      };

      const response = await fetch('/api/ai/analyze-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data.advice);
      } else {
        setAnalysisResult(data.fallbackAdvice || 'Strategy analysis completed.');
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisResult(
        'Strategic Priority: Secure early-game energy attachments onto your bench while monitoring opponent Prize count to avoid high-damage revenge knockouts.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl bg-black border-2 border-yellow-400 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-black border-b-2 border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center font-black shadow-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 font-display">
                GEMINI AI STRATEGIST
                <span className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-mono font-black uppercase">
                  GEMINI 3.7 FLASH
                </span>
              </h3>
              <p className="text-[10px] text-white/50 font-mono font-bold uppercase">
                REAL-TIME STRATEGIC CO-PILOT // GAME TREE SYNTHESIZER
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

        {/* Quick Action Presets */}
        <div className="p-4 bg-black border-b-2 border-white/10 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => {
              setMode('explain-action');
              handleAnalyze('explain-action');
            }}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'explain-action'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-black text-white border border-white/20 hover:border-white'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>EXPLAIN CURRENT TURN PLAY</span>
          </button>

          <button
            onClick={() => {
              setMode('deck-review');
              handleAnalyze('deck-review');
            }}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'deck-review'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-black text-white border border-white/20 hover:border-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>META ARCHETYPE REVIEW</span>
          </button>

          <button
            onClick={() => setMode('custom')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-black text-white border border-white/20 hover:border-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>CUSTOM TACTICAL PROMPT</span>
          </button>
        </div>

        {/* Analysis Result Output / Chat Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              <p className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-wider">
                Gemini 3.7 Flash synthesizing game-tree probabilities & prize race vectors...
              </p>
            </div>
          ) : analysisResult ? (
            <div className="p-5 bg-black border-2 border-white/20 font-sans leading-relaxed whitespace-pre-line space-y-2 text-white/90 font-medium">
              {analysisResult}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-white/50 space-y-2">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              <p className="font-black uppercase text-white text-sm tracking-tight">
                SELECT A STRATEGIC PRESET ABOVE OR QUERY THE AI ENGINE
              </p>
              <p className="text-xs text-white/50 max-w-md font-medium">
                Gemini evaluates full board state, remaining prize cards, energy curves, and opponent hidden hand risk.
              </p>
            </div>
          )}
        </div>

        {/* Custom Input Bar */}
        <div className="p-4 bg-black border-t-2 border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze('custom')}
            placeholder="e.g. Should I attack with Charizard ex or retreat to Pidgeot ex? What is the risk of Boss's Orders?"
            className="flex-1 p-3 bg-black border-2 border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-yellow-400 transition-colors font-mono"
          />
          <button
            onClick={() => handleAnalyze('custom')}
            disabled={loading}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-tight shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4 fill-black" />
            <span className="hidden sm:inline">ASK AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
