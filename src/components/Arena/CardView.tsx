import React from 'react';
import { Card, EnergyType, PokemonInPlay } from '../../types/pokemon';
import { Flame, Droplets, Zap, Sparkles, Moon, Shield, Skull, Sword, Heart } from 'lucide-react';

interface CardViewProps {
  card: Card;
  pokemonState?: PokemonInPlay;
  size?: 'sm' | 'md' | 'lg' | 'mini';
  isFacedown?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  pokemonState,
  size = 'md',
  isFacedown = false,
  isSelected = false,
  onClick,
  interactive = false,
}) => {
  if (isFacedown) {
    return (
      <div
        onClick={interactive ? onClick : undefined}
        className={`relative border-2 border-white/20 bg-black text-white shadow-md flex items-center justify-center overflow-hidden select-none transition-transform ${
          size === 'mini' ? 'w-14 h-20' : size === 'sm' ? 'w-20 h-28' : size === 'md' ? 'w-32 h-44' : 'w-44 h-60'
        } ${interactive ? 'cursor-pointer hover:scale-105' : ''}`}
      >
        <div className="w-8 h-8 border-2 border-yellow-400 flex items-center justify-center bg-yellow-400 text-black font-black text-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(250,204,21,0.15),transparent)]" />
      </div>
    );
  }

  const getTypeTheme = (type?: EnergyType) => {
    switch (type) {
      case 'Fire':
        return {
          bg: 'bg-gradient-to-b from-red-950/80 via-black to-black',
          border: 'border-2 border-red-500/80',
          badge: 'bg-red-600 text-white font-black',
          accent: 'text-red-400',
          icon: <Flame className="w-3 h-3 text-red-400 fill-red-400/20" />,
        };
      case 'Water':
        return {
          bg: 'bg-gradient-to-b from-blue-950/80 via-black to-black',
          border: 'border-2 border-blue-400/80',
          badge: 'bg-blue-600 text-white font-black',
          accent: 'text-blue-400',
          icon: <Droplets className="w-3 h-3 text-blue-400 fill-blue-400/20" />,
        };
      case 'Lightning':
        return {
          bg: 'bg-gradient-to-b from-yellow-950/80 via-black to-black',
          border: 'border-2 border-yellow-400',
          badge: 'bg-yellow-400 text-black font-black',
          accent: 'text-yellow-300',
          icon: <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />,
        };
      case 'Psychic':
        return {
          bg: 'bg-gradient-to-b from-purple-950/80 via-black to-black',
          border: 'border-2 border-purple-400/80',
          badge: 'bg-purple-600 text-white font-black',
          accent: 'text-purple-300',
          icon: <Sparkles className="w-3 h-3 text-purple-300" />,
        };
      case 'Darkness':
        return {
          bg: 'bg-gradient-to-b from-zinc-900 via-black to-black',
          border: 'border-2 border-zinc-400/80',
          badge: 'bg-zinc-800 text-white font-black',
          accent: 'text-zinc-300',
          icon: <Moon className="w-3 h-3 text-zinc-300" />,
        };
      case 'Grass':
        return {
          bg: 'bg-gradient-to-b from-emerald-950/80 via-black to-black',
          border: 'border-2 border-emerald-400/80',
          badge: 'bg-emerald-600 text-white font-black',
          accent: 'text-emerald-300',
          icon: <Sparkles className="w-3 h-3 text-emerald-300" />,
        };
      default:
        return {
          bg: 'bg-gradient-to-b from-zinc-900 via-black to-black',
          border: 'border-2 border-white/30',
          badge: 'bg-white text-black font-black',
          accent: 'text-white',
          icon: <Shield className="w-3 h-3 text-white" />,
        };
    }
  };

  const theme = getTypeTheme(card.pokemonType || card.energyType);

  const hpCurrent = pokemonState ? pokemonState.currentHp : card.hp;
  const hpMax = pokemonState ? pokemonState.maxHp : card.hp;
  const hpPercent = hpMax ? Math.max(0, Math.min(100, (hpCurrent! / hpMax) * 100)) : 100;

  if (size === 'mini') {
    return (
      <div
        onClick={interactive ? onClick : undefined}
        className={`relative border ${theme.border} ${theme.bg} p-1 text-[9px] shadow select-none flex flex-col justify-between w-16 h-24 transition-all ${
          isSelected ? 'ring-2 ring-yellow-400 scale-105 shadow-yellow-400/50' : ''
        } ${interactive ? 'cursor-pointer hover:scale-105' : ''}`}
      >
        <div className="flex items-center justify-between font-black uppercase leading-tight">
          <span className="truncate max-w-[40px] text-white">{card.name}</span>
          {card.hp && <span className="text-yellow-400 font-mono font-black">{hpCurrent}</span>}
        </div>
        <div className="text-center font-mono text-[8px] uppercase tracking-wider font-bold text-yellow-400">
          {card.cardType === 'pokemon' ? card.stage : card.cardType.toUpperCase()}
        </div>
        {pokemonState && pokemonState.attachedEnergy.length > 0 && (
          <div className="flex items-center gap-0.5 justify-center">
            {pokemonState.attachedEnergy.slice(0, 3).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 bg-yellow-400" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`relative ${theme.border} ${theme.bg} p-2 text-xs shadow-xl select-none flex flex-col justify-between transition-all duration-200 ${
        size === 'sm' ? 'w-28 h-40' : size === 'md' ? 'w-36 h-52' : 'w-48 h-68'
      } ${
        isSelected
          ? 'ring-2 ring-yellow-400 scale-105 shadow-yellow-400/50 shadow-2xl -translate-y-1'
          : 'hover:border-yellow-400/80'
      } ${interactive ? 'cursor-pointer hover:scale-[1.03]' : ''}`}
    >
      {/* Top Header: Name, Stage, HP */}
      <div>
        <div className="flex items-center justify-between gap-1 pb-1 border-b border-white/15">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-black text-white uppercase tracking-tight truncate text-[11px] sm:text-xs font-display">
              {card.name}
            </span>
          </div>
          {card.hp && (
            <div className="flex items-center gap-1 shrink-0 font-mono">
              <span className="text-[8px] text-white/50 font-bold">HP</span>
              <span
                className={`font-black text-xs ${
                  hpPercent < 35
                    ? 'text-red-400 animate-pulse'
                    : hpPercent < 65
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}
              >
                {hpCurrent}
              </span>
            </div>
          )}
        </div>

        {/* Stage & Card Type Subtitle */}
        <div className="flex items-center justify-between text-[9px] text-white/50 pt-1 font-mono uppercase">
          <span className="flex items-center gap-1">
            {card.isEx && (
              <span className="px-1 bg-yellow-400 text-black font-black text-[8px] tracking-tight">
                EX
              </span>
            )}
            {card.cardType === 'pokemon' ? card.stage : card.trainerType || 'ENERGY'}
          </span>
          {card.evolvesFrom && (
            <span className="text-[8px] text-white/40 truncate">FROM {card.evolvesFrom}</span>
          )}
        </div>
      </div>

      {/* HP Bar if in play */}
      {pokemonState && (
        <div className="w-full bg-black h-1.5 overflow-hidden my-1 border border-white/20">
          <div
            className={`h-full transition-all duration-300 ${
              hpPercent < 35 ? 'bg-red-500' : hpPercent < 65 ? 'bg-yellow-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      )}

      {/* Center Body: Attacks / Ability / Trainer Text */}
      <div className="my-auto space-y-1.5 py-1">
        {card.ability && (
          <div className="bg-red-950/50 border border-red-500/40 p-1 text-[9px]">
            <div className="font-black text-red-300 uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>ABILITY: {card.ability.name}</span>
            </div>
            <p className="text-[8px] text-white/80 line-clamp-2 leading-tight mt-0.5">
              {card.ability.description}
            </p>
          </div>
        )}

        {card.attacks && card.attacks.length > 0 && (
          <div className="space-y-1">
            {card.attacks.slice(0, 2).map((atk, idx) => (
              <div key={idx} className="bg-black/90 p-1 border border-white/15">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-white uppercase truncate">{atk.name}</span>
                  <span className="font-mono font-black text-yellow-400 flex items-center gap-0.5">
                    <Sword className="w-2.5 h-2.5" />
                    {atk.damage}
                  </span>
                </div>
                {atk.effectText && (
                  <p className="text-[8px] text-white/60 line-clamp-1">{atk.effectText}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {card.cardType === 'trainer' && (
          <div className="bg-black/80 p-1.5 border border-white/20">
            <p className="text-[9px] text-white/80 leading-tight line-clamp-3">
              {card.description}
            </p>
          </div>
        )}

        {card.cardType === 'energy' && (
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="p-2 border border-yellow-400/60 bg-black mb-1">
              {theme.icon}
            </div>
            <span className="text-[10px] font-black uppercase text-white">{card.energyType} ENERGY</span>
          </div>
        )}
      </div>

      {/* Bottom Footer: Energy Attached & Weakness */}
      <div className="border-t border-white/15 pt-1 flex items-center justify-between text-[8px] text-white/50 font-mono uppercase">
        <div className="flex items-center gap-1">
          {pokemonState ? (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-white/40">NRG</span>
              <span className="text-yellow-400 font-black font-mono">
                {pokemonState.attachedEnergy.length}
              </span>
            </div>
          ) : (
            card.retreatCost !== undefined && (
              <span>RETR: {card.retreatCost}</span>
            )
          )}
        </div>

        {card.weakness && (
          <span className="text-red-400 font-bold">
            WEAK: {card.weakness}
          </span>
        )}
      </div>
    </div>
  );
};
