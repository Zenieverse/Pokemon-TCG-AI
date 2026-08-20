import React from 'react';
import { Card } from '../../types/pokemon';
import { CardView } from './CardView';
import { X, Layers, Trash2 } from 'lucide-react';

interface DiscardPileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  discardCards: Card[];
}

export const DiscardPileModal: React.FC<DiscardPileModalProps> = ({
  isOpen,
  onClose,
  playerName,
  discardCards,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl bg-black border-2 border-yellow-400 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-black border-b-2 border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center font-black shadow-lg">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 font-display">
                {playerName}'s Discard Pile
                <span className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-mono font-black uppercase">
                  {discardCards.length} Cards
                </span>
              </h3>
              <p className="text-[10px] text-white/50 font-mono font-bold uppercase">
                Graveyard & Spent Energy / Trainer Pool
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

        {/* Card Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {discardCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/40 space-y-2">
              <Layers className="w-12 h-12 text-white/20" />
              <p className="font-mono text-xs uppercase font-bold tracking-wider">
                Discard Pile is Currently Empty
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 justify-items-center">
              {discardCards.map((card, idx) => (
                <CardView key={`${card.id}_disc_${idx}`} card={card} size="sm" />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black border-t-2 border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-tight shadow cursor-pointer transition-all"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
