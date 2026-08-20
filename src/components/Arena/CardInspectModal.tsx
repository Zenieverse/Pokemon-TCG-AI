import React from 'react';
import { Card, PokemonInPlay } from '../../types/pokemon';
import { CardView } from './CardView';
import { X, Sparkles, Shield, Sword, Heart, Zap } from 'lucide-react';

interface CardInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  pokemonState?: PokemonInPlay | null;
}

export const CardInspectModal: React.FC<CardInspectModalProps> = ({
  isOpen,
  onClose,
  card,
  pokemonState,
}) => {
  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-black border-2 border-yellow-400 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-black border-b-2 border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-400" />
            <h3 className="text-base font-black uppercase text-white tracking-tight font-display">
              CARD INSPECTOR // {card.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-black border border-white/20 hover:border-white text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col sm:flex-row items-center gap-6 overflow-y-auto max-h-[75vh]">
          {/* Card View Render */}
          <div className="shrink-0">
            <CardView card={card} pokemonState={pokemonState || undefined} size="md" />
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-3 text-xs font-mono w-full">
            <div>
              <span className="text-[10px] text-white/50 uppercase font-bold block">CARD CLASSIFICATION</span>
              <span className="text-sm font-black uppercase text-yellow-400 font-display">
                {card.name} {card.isEx && 'ex'}
              </span>
              <p className="text-[11px] text-white/60">
                {card.cardType === 'pokemon'
                  ? `${card.stage} • ${card.pokemonType} Type`
                  : card.cardType === 'trainer'
                  ? `Trainer • ${card.trainerType}`
                  : `Basic ${card.energyType} Energy`}
              </p>
            </div>

            {pokemonState && (
              <div className="p-3 bg-black border border-white/15 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 uppercase">CURRENT HP</span>
                  <span className="font-black text-emerald-400">
                    {pokemonState.currentHp} / {pokemonState.maxHp} HP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 uppercase">ATTACHED ENERGY</span>
                  <span className="font-black text-yellow-400">
                    {pokemonState.attachedEnergy.length > 0
                      ? pokemonState.attachedEnergy.join(', ')
                      : 'None'}
                  </span>
                </div>
              </div>
            )}

            {card.ability && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/40 space-y-1">
                <span className="font-black uppercase text-red-300 flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-red-400" />
                  ABILITY: {card.ability.name}
                </span>
                <p className="text-[10px] text-white/80 leading-tight">
                  {card.ability.description}
                </p>
              </div>
            )}

            {card.attacks && card.attacks.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-white/50 uppercase font-bold block">ATTACKS</span>
                {card.attacks.map((atk, idx) => (
                  <div key={idx} className="p-2 bg-black border border-white/20 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase text-white">
                      <span>{atk.name}</span>
                      <span className="text-yellow-400">{atk.damage} DMG</span>
                    </div>
                    {atk.cost && (
                      <span className="text-[9px] text-white/50 block">
                        COST: {atk.cost.join(', ')}
                      </span>
                    )}
                    {atk.effectText && (
                      <p className="text-[10px] text-white/70">{atk.effectText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {card.description && (
              <div className="p-2.5 bg-black border border-white/20">
                <p className="text-[11px] text-white/80 leading-relaxed">{card.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-black border-t-2 border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
