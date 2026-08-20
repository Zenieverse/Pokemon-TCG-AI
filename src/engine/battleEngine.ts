import {
  Card,
  DeckArchetype,
  GameAction,
  GameState,
  PlayerState,
  PokemonInPlay,
  EnergyType,
} from '../types/pokemon';

export function createInitialGameState(
  player1Deck: DeckArchetype,
  player2Deck: DeckArchetype,
  player1IsAI: boolean = false,
  player2IsAI: boolean = true,
  player1AIType: PlayerState['aiType'] = 'heuristic',
  player2AIType: PlayerState['aiType'] = 'is_mcts',
  prizeCount: number = 3,
): GameState {
  const p1 = initPlayer('p1', player1Deck.name, player1Deck.cards, player1IsAI, player1AIType, prizeCount);
  const p2 = initPlayer('p2', player2Deck.name, player2Deck.cards, player2IsAI, player2AIType, prizeCount);

  const initialLog = [
    {
      id: 'log_0',
      turn: 1,
      playerIndex: 0,
      playerName: p1.name,
      action: 'Game Started',
      details: `${p1.name} vs ${p2.name}. ${prizeCount} Prize Cards set.`,
      type: 'info' as const,
      timestamp: new Date().toLocaleTimeString(),
    },
  ];

  return {
    turnNumber: 1,
    activePlayerIndex: 0,
    players: [p1, p2],
    phase: 'MAIN',
    stadium: null,
    winner: null,
    log: initialLog,
  };
}

function initPlayer(
  id: string,
  name: string,
  rawCards: Card[],
  isAI: boolean,
  aiType: PlayerState['aiType'] = 'is_mcts',
  prizeCount: number = 3,
): PlayerState {
  const deck = shuffle([...rawCards]);
  
  // Find at least 1 basic pokemon for opening hand
  const basicIndices = deck
    .map((c, i) => (c.cardType === 'pokemon' && c.stage === 'Basic' ? i : -1))
    .filter((i) => i !== -1);

  if (basicIndices.length > 0) {
    // Swap first basic to front
    const firstBasicIndex = basicIndices[0];
    const temp = deck[0];
    deck[0] = deck[firstBasicIndex];
    deck[firstBasicIndex] = temp;
  }

  // Draw opening hand (5 cards)
  const hand = deck.splice(0, 5);

  // Setup Active Pokemon
  let active: PokemonInPlay | null = null;
  const basicInHandIndex = hand.findIndex((c) => c.cardType === 'pokemon' && c.stage === 'Basic');
  if (basicInHandIndex !== -1) {
    const card = hand.splice(basicInHandIndex, 1)[0];
    active = {
      instanceId: `${id}_active_${card.id}_${Date.now()}`,
      card,
      currentHp: card.hp || 70,
      maxHp: card.hp || 70,
      attachedEnergy: [],
      turnPlayed: 1,
      statusConditions: [],
      damageCounters: 0,
    };
  }

  // Setup 1 bench pokemon if available
  const bench: PokemonInPlay[] = [];
  const secondBasicIndex = hand.findIndex((c) => c.cardType === 'pokemon' && c.stage === 'Basic');
  if (secondBasicIndex !== -1 && bench.length < 3) {
    const bCard = hand.splice(secondBasicIndex, 1)[0];
    bench.push({
      instanceId: `${id}_bench_${bCard.id}_${Date.now()}_1`,
      card: bCard,
      currentHp: bCard.hp || 70,
      maxHp: bCard.hp || 70,
      attachedEnergy: [],
      turnPlayed: 1,
      statusConditions: [],
      damageCounters: 0,
    });
  }

  // Set Prize Cards
  const prizes = deck.splice(0, prizeCount);

  return {
    id,
    name,
    isAI,
    aiType,
    deck,
    hand,
    prizes,
    discard: [],
    active,
    bench,
    energyAttachedThisTurn: false,
    supporterPlayedThisTurn: false,
    abilityUsedThisTurn: {},
    hasRetreatedThisTurn: false,
    knockedOutPrizesTaken: 0,
  };
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

// Generate all legal actions for the active player
export function getLegalActions(state: GameState): GameAction[] {
  if (state.winner || state.phase === 'GAME_OVER') return [];

  const actions: GameAction[] = [];
  const activeP = state.players[state.activePlayerIndex];
  const oppP = state.players[1 - state.activePlayerIndex];

  if (!activeP.active) {
    // Need to promote a bench pokemon
    activeP.bench.forEach((b, idx) => {
      actions.push({
        type: 'PLAY_BASIC',
        targetInstanceId: b.instanceId,
        benchIndex: idx,
        label: `Promote ${b.card.name} to Active`,
        description: `Move ${b.card.name} (${b.currentHp}/${b.maxHp} HP) into the Active Spot.`,
      });
    });
    return actions;
  }

  // 1. ATTACH ENERGY (Max 1 per turn)
  if (!activeP.energyAttachedThisTurn) {
    const energyCards = activeP.hand.filter((c) => c.cardType === 'energy');
    const targets = [activeP.active, ...activeP.bench];

    energyCards.forEach((energy) => {
      targets.forEach((target) => {
        actions.push({
          type: 'ATTACH_ENERGY',
          cardId: energy.id,
          targetInstanceId: target.instanceId,
          label: `Attach ${energy.name} to ${target.card.name}`,
          description: `Attach 1 ${energy.energyType || 'Colorless'} Energy to ${target.card.name}.`,
        });
      });
    });
  }

  // 2. PLAY BASIC POKÉMON TO BENCH
  if (activeP.bench.length < 5) {
    const basicCards = activeP.hand.filter((c) => c.cardType === 'pokemon' && c.stage === 'Basic');
    const uniqueBasics = Array.from(new Set(basicCards.map((c) => c.id))).map((id) =>
      basicCards.find((c) => c.id === id)!,
    );

    uniqueBasics.forEach((basic) => {
      actions.push({
        type: 'PLAY_BASIC',
        cardId: basic.id,
        label: `Bench ${basic.name}`,
        description: `Place ${basic.name} (${basic.hp} HP) onto your Bench.`,
      });
    });
  }

  // 3. EVOLVE POKÉMON (Regular Evolution or Rare Candy)
  const evolutionCards = activeP.hand.filter(
    (c) => c.cardType === 'pokemon' && (c.stage === 'Stage 1' || c.stage === 'Stage 2'),
  );
  const targets = [activeP.active, ...activeP.bench];

  evolutionCards.forEach((evoCard) => {
    targets.forEach((target) => {
      // Standard Stage 1 / Stage 2 evolution
      if (evoCard.evolvesFrom && target.card.name.toLowerCase() === evoCard.evolvesFrom.toLowerCase()) {
        // Can evolve if turnPlayed < currentTurn
        if (target.turnPlayed < state.turnNumber) {
          actions.push({
            type: 'EVOLVE',
            cardId: evoCard.id,
            targetInstanceId: target.instanceId,
            label: `Evolve ${target.card.name} into ${evoCard.name}`,
            description: `Evolve ${target.card.name} into ${evoCard.name} (${evoCard.hp} HP).`,
          });
        }
      }
    });
  });

  // Rare Candy Evolution (Basic -> Stage 2 directly)
  const hasRareCandy = activeP.hand.some((c) => c.id === 'tr_rare_candy');
  if (hasRareCandy) {
    const stage2Cards = activeP.hand.filter((c) => c.cardType === 'pokemon' && c.stage === 'Stage 2');
    stage2Cards.forEach((stage2) => {
      targets.forEach((target) => {
        if (target.card.stage === 'Basic' && target.turnPlayed < state.turnNumber) {
          // Check if target is in the evolutionary line
          const isCharmanderToCharizard = target.card.name === 'Charmander' && stage2.name === 'Charizard ex';
          const isRaltsToGardevoir = target.card.name === 'Ralts' && stage2.name === 'Gardevoir ex';
          const isPidgeyToPidgeot = target.card.name === 'Pidgey' && stage2.name === 'Pidgeot ex';

          if (isCharmanderToCharizard || isRaltsToGardevoir || isPidgeyToPidgeot) {
            actions.push({
              type: 'EVOLVE',
              cardId: stage2.id,
              targetInstanceId: target.instanceId,
              label: `Rare Candy: ${target.card.name} ➔ ${stage2.name}`,
              description: `Use Rare Candy to evolve ${target.card.name} directly into ${stage2.name}!`,
            });
          }
        }
      });
    });
  }

  // 4. PLAY TRAINER CARDS
  const trainerCards = activeP.hand.filter((c) => c.cardType === 'trainer');
  trainerCards.forEach((tr) => {
    if (tr.trainerType === 'Supporter' && activeP.supporterPlayedThisTurn) {
      return; // Only 1 Supporter per turn
    }

    actions.push({
      type: 'PLAY_TRAINER',
      cardId: tr.id,
      label: `Play ${tr.name} (${tr.trainerType})`,
      description: tr.description || `Execute effect of ${tr.name}.`,
    });
  });

  // 5. USE ABILITY
  targets.forEach((p) => {
    if (p.card.ability && !activeP.abilityUsedThisTurn[p.instanceId]) {
      actions.push({
        type: 'USE_ABILITY',
        targetInstanceId: p.instanceId,
        label: `Ability: ${p.card.ability.name} (${p.card.name})`,
        description: p.card.ability.description,
      });
    }
  });

  // 6. RETREAT ACTIVE POKÉMON (Once per turn, if enough energy)
  if (!activeP.hasRetreatedThisTurn && activeP.bench.length > 0) {
    const retreatCost = activeP.active.card.retreatCost ?? 1;
    if (activeP.active.attachedEnergy.length >= retreatCost) {
      activeP.bench.forEach((b) => {
        actions.push({
          type: 'RETREAT',
          targetInstanceId: b.instanceId,
          label: `Retreat to ${b.card.name} (Cost: ${retreatCost})`,
          description: `Discard ${retreatCost} Energy and switch ${activeP.active?.card.name} with ${b.card.name}.`,
        });
      });
    }
  }

  // 7. ATTACK WITH ACTIVE POKÉMON
  if (activeP.active.card.attacks && activeP.active.card.attacks.length > 0) {
    activeP.active.card.attacks.forEach((atk, idx) => {
      if (canPayAttackCost(activeP.active!.attachedEnergy, atk.cost)) {
        // Calculate estimated damage
        const damage = calculateAttackDamage(atk, activeP.active!, oppP.active, activeP, oppP);
        actions.push({
          type: 'ATTACK',
          attackIndex: idx,
          label: `Attack: ${atk.name} (${damage} DMG)`,
          description: `Strike opponent's ${oppP.active?.card.name || 'Active'} for ${damage} damage. ${atk.effectText || ''}`,
        });
      }
    });
  }

  // 8. PASS TURN
  actions.push({
    type: 'PASS_TURN',
    label: 'End Turn',
    description: 'Pass the turn to your opponent.',
  });

  return actions;
}

export function canPayAttackCost(attached: EnergyType[], cost: EnergyType[]): boolean {
  if (cost.length === 0) return true;
  if (attached.length < cost.length) return false;

  const pool = [...attached];
  const requiredSpecific = cost.filter((c) => c !== 'Colorless');
  const colorlessCount = cost.filter((c) => c === 'Colorless').length;

  // Pay specific energies first
  for (const req of requiredSpecific) {
    const idx = pool.indexOf(req);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }

  // Check if remaining pool can cover colorless
  return pool.length >= colorlessCount;
}

export function calculateAttackDamage(
  attack: any,
  attacker: PokemonInPlay,
  defender: PokemonInPlay | null,
  attackerPlayer: PlayerState,
  defenderPlayer: PlayerState,
): number {
  let dmg = attack.damage || 0;

  // Custom attack scaling rules
  if (attack.name === 'Burning Darkness') {
    // 180 + 30 for each Prize opponent has taken
    const opponentPrizesTaken = defenderPlayer.knockedOutPrizesTaken || 0;
    dmg = 180 + opponentPrizesTaken * 30;
  } else if (attack.name === 'Circle Circuit') {
    // 30 per benched pokemon
    dmg = attackerPlayer.bench.length * 30;
  } else if (attack.name === 'Roaring Scream') {
    // 20 per damage counter
    dmg = attacker.damageCounters * 20;
  } else if (attack.name === 'Frenzied Gouging') {
    dmg = 999;
  }

  if (!defender) return dmg;

  // Apply Weakness (x2 damage if matching)
  if (defender.card.weakness && attacker.card.pokemonType === defender.card.weakness) {
    dmg = dmg * 2;
  }

  // Apply Resistance (-30 damage)
  if (defender.card.resistance && attacker.card.pokemonType === defender.card.resistance) {
    dmg = Math.max(dmg - 30, 0);
  }

  return dmg;
}

// Execute an action and return a new GameState
export function executeAction(initialState: GameState, action: GameAction): GameState {
  const state = cloneGameState(initialState);
  const activeP = state.players[state.activePlayerIndex];
  const oppP = state.players[1 - state.activePlayerIndex];
  const timestamp = new Date().toLocaleTimeString();

  switch (action.type) {
    case 'ATTACH_ENERGY': {
      const cardIdx = activeP.hand.findIndex((c) => c.id === action.cardId);
      if (cardIdx !== -1) {
        const energyCard = activeP.hand.splice(cardIdx, 1)[0];
        const target = [activeP.active, ...activeP.bench].find((p) => p?.instanceId === action.targetInstanceId);
        if (target && energyCard.energyType) {
          target.attachedEnergy.push(energyCard.energyType);
          activeP.energyAttachedThisTurn = true;
          log(state, 'energy', `Attached ${energyCard.name} to ${target.card.name}.`);
        }
      }
      break;
    }

    case 'PLAY_BASIC': {
      if (action.benchIndex !== undefined && action.targetInstanceId) {
        // Promote bench to active
        const bIdx = activeP.bench.findIndex((b) => b.instanceId === action.targetInstanceId);
        if (bIdx !== -1) {
          activeP.active = activeP.bench.splice(bIdx, 1)[0];
          log(state, 'info', `Promoted ${activeP.active.card.name} to Active.`);
        }
      } else if (action.cardId) {
        const cardIdx = activeP.hand.findIndex((c) => c.id === action.cardId);
        if (cardIdx !== -1 && activeP.bench.length < 5) {
          const card = activeP.hand.splice(cardIdx, 1)[0];
          activeP.bench.push({
            instanceId: `${activeP.id}_bench_${card.id}_${Date.now()}`,
            card,
            currentHp: card.hp || 70,
            maxHp: card.hp || 70,
            attachedEnergy: [],
            turnPlayed: state.turnNumber,
            statusConditions: [],
            damageCounters: 0,
          });
          log(state, 'info', `Benched ${card.name}.`);
        }
      }
      break;
    }

    case 'EVOLVE': {
      const evoCardIdx = activeP.hand.findIndex((c) => c.id === action.cardId);
      if (evoCardIdx !== -1) {
        const evoCard = activeP.hand.splice(evoCardIdx, 1)[0];
        const target = [activeP.active, ...activeP.bench].find((p) => p?.instanceId === action.targetInstanceId);
        if (target) {
          // If Rare Candy was used, consume it
          const candyIdx = activeP.hand.findIndex((c) => c.id === 'tr_rare_candy');
          if (candyIdx !== -1 && target.card.stage === 'Basic' && evoCard.stage === 'Stage 2') {
            const candy = activeP.hand.splice(candyIdx, 1)[0];
            activeP.discard.push(candy);
          }

          const oldName = target.card.name;
          const hpDiff = (evoCard.hp || 100) - (target.card.hp || 70);
          target.card = evoCard;
          target.maxHp = evoCard.hp || 100;
          target.currentHp = Math.min(target.currentHp + hpDiff, target.maxHp);
          target.turnPlayed = state.turnNumber;

          // Trigger on-evolution abilities (e.g. Infernal Reign)
          if (evoCard.ability && evoCard.ability.name === 'Infernal Reign') {
            const fireEnergies = activeP.deck.filter((c) => c.energyType === 'Fire').slice(0, 3);
            fireEnergies.forEach((fe) => {
              const dIdx = activeP.deck.findIndex((c) => c.id === fe.id);
              if (dIdx !== -1) {
                activeP.deck.splice(dIdx, 1);
                target.attachedEnergy.push('Fire');
              }
            });
            log(state, 'evolution', `Evolved ${oldName} into ${evoCard.name}! Triggered Infernal Reign (+3 Fire Energy).`);
          } else {
            log(state, 'evolution', `Evolved ${oldName} into ${evoCard.name} (${evoCard.hp} HP).`);
          }
        }
      }
      break;
    }

    case 'PLAY_TRAINER': {
      const trIdx = activeP.hand.findIndex((c) => c.id === action.cardId);
      if (trIdx !== -1) {
        const tr = activeP.hand.splice(trIdx, 1)[0];
        activeP.discard.push(tr);

        if (tr.trainerType === 'Supporter') {
          activeP.supporterPlayedThisTurn = true;
        }

        executeTrainerEffect(state, activeP, oppP, tr);
        log(state, 'trainer', `Played ${tr.name} (${tr.trainerType}).`);
      }
      break;
    }

    case 'USE_ABILITY': {
      const target = [activeP.active, ...activeP.bench].find((p) => p?.instanceId === action.targetInstanceId);
      if (target && target.card.ability) {
        activeP.abilityUsedThisTurn[target.instanceId] = true;
        executeAbilityEffect(state, activeP, target);
        log(state, 'info', `Used Ability: ${target.card.ability.name} on ${target.card.name}.`);
      }
      break;
    }

    case 'RETREAT': {
      if (activeP.active && action.targetInstanceId) {
        const bIdx = activeP.bench.findIndex((b) => b.instanceId === action.targetInstanceId);
        if (bIdx !== -1) {
          const cost = activeP.active.card.retreatCost || 1;
          activeP.active.attachedEnergy.splice(0, cost);
          const oldActive = activeP.active;
          const newActive = activeP.bench.splice(bIdx, 1)[0];
          activeP.bench.push(oldActive);
          activeP.active = newActive;
          activeP.hasRetreatedThisTurn = true;
          log(state, 'info', `Retreated ${oldActive.card.name} for ${newActive.card.name}.`);
        }
      }
      break;
    }

    case 'ATTACK': {
      if (activeP.active && oppP.active && action.attackIndex !== undefined) {
        const attack = activeP.active.card.attacks?.[action.attackIndex];
        if (attack) {
          const dmg = calculateAttackDamage(attack, activeP.active, oppP.active, activeP, oppP);
          oppP.active.currentHp -= dmg;
          oppP.active.damageCounters += Math.floor(dmg / 10);

          // Handle attack effects
          if (attack.effectType === 'discard_energy') {
            activeP.active.attachedEnergy.splice(0, 2);
          } else if (attack.effectType === 'bench_damage') {
            oppP.bench.forEach((b) => {
              b.currentHp -= 20;
              b.damageCounters += 2;
            });
          }

          log(
            state,
            'attack',
            `${activeP.active.card.name} used ${attack.name} for ${dmg} damage! (${oppP.active.card.name}: ${Math.max(0, oppP.active.currentHp)}/${oppP.active.maxHp} HP)`,
          );

          // Self damage on Frenzied Gouging
          if (attack.name === 'Frenzied Gouging') {
            activeP.active.currentHp -= 200;
            activeP.active.damageCounters += 20;
          }

          // Check Knockout on opponent
          if (oppP.active.currentHp <= 0) {
            handleKnockout(state, activeP, oppP, oppP.active, attack);
          }

          // Check Self Knockout
          if (activeP.active.currentHp <= 0) {
            handleKnockout(state, oppP, activeP, activeP.active);
          }

          // Attacking automatically ends the turn
          endTurn(state);
          return state;
        }
      }
      break;
    }

    case 'PASS_TURN': {
      log(state, 'info', `${activeP.name} ended turn.`);
      endTurn(state);
      return state;
    }
  }

  return state;
}

function handleKnockout(
  state: GameState,
  winnerOfPrize: PlayerState,
  victimPlayer: PlayerState,
  knockedOutPokemon: PokemonInPlay,
  attack?: any,
) {
  // Calculate prize cards taken
  let prizesToTake = knockedOutPokemon.card.isEx ? 2 : 1;
  if (attack && attack.name === 'Amp You Very Much') {
    prizesToTake += 1;
  }

  // Take prizes
  prizesToTake = Math.min(prizesToTake, winnerOfPrize.prizes.length);
  for (let i = 0; i < prizesToTake; i++) {
    if (winnerOfPrize.prizes.length > 0) {
      const prizeCard = winnerOfPrize.prizes.pop()!;
      winnerOfPrize.hand.push(prizeCard);
      winnerOfPrize.knockedOutPrizesTaken += 1;
    }
  }

  // Move KO'd Pokemon to discard
  victimPlayer.discard.push(knockedOutPokemon.card);
  victimPlayer.active = null;

  log(
    state,
    'knockout',
    `💥 ${knockedOutPokemon.card.name} was Knocked Out! ${winnerOfPrize.name} took ${prizesToTake} Prize card(s). (${winnerOfPrize.prizes.length} remaining)`,
  );

  // Check Win Condition 1: All prizes taken
  if (winnerOfPrize.prizes.length === 0) {
    state.winner = winnerOfPrize.id;
    state.winReason = `${winnerOfPrize.name} took all Prize cards!`;
    state.phase = 'GAME_OVER';
    log(state, 'info', `🏆 VICTORY: ${winnerOfPrize.name} took all prize cards!`);
    return;
  }

  // Check Win Condition 2: Opponent has no pokemon left
  if (victimPlayer.bench.length === 0 && !victimPlayer.active) {
    state.winner = winnerOfPrize.id;
    state.winReason = `${victimPlayer.name} has no Pokémon remaining in play!`;
    state.phase = 'GAME_OVER';
    log(state, 'info', `🏆 VICTORY: ${victimPlayer.name} ran out of Pokémon!`);
    return;
  }

  // Promote first bench pokemon if available
  if (victimPlayer.bench.length > 0) {
    victimPlayer.active = victimPlayer.bench.shift()!;
    log(state, 'info', `${victimPlayer.name} promoted ${victimPlayer.active.card.name} to Active.`);
  }
}

function executeTrainerEffect(state: GameState, player: PlayerState, opponent: PlayerState, tr: Card) {
  switch (tr.trainerEffect) {
    case 'search_basic': {
      const basic = player.deck.find((c) => c.cardType === 'pokemon' && c.stage === 'Basic');
      if (basic && player.bench.length < 5) {
        const idx = player.deck.indexOf(basic);
        player.deck.splice(idx, 1);
        player.bench.push({
          instanceId: `${player.id}_bench_${basic.id}_${Date.now()}`,
          card: basic,
          currentHp: basic.hp || 70,
          maxHp: basic.hp || 70,
          attachedEnergy: [],
          turnPlayed: state.turnNumber,
          statusConditions: [],
          damageCounters: 0,
        });
      }
      break;
    }

    case 'search_pokemon': {
      // Ultra ball: discards handled, search any pokemon
      const pkmn = player.deck.find((c) => c.cardType === 'pokemon');
      if (pkmn) {
        const idx = player.deck.indexOf(pkmn);
        player.deck.splice(idx, 1);
        player.hand.push(pkmn);
      }
      break;
    }

    case 'discard_draw_7': {
      // Professor's Research: discard hand, draw 7
      player.discard.push(...player.hand);
      player.hand = [];
      const drawn = player.deck.splice(0, 5);
      player.hand.push(...drawn);
      break;
    }

    case 'gust_opponent_bench': {
      // Boss's Orders: switch opponent active with bench
      if (opponent.bench.length > 0 && opponent.active) {
        const b = opponent.bench.shift()!;
        opponent.bench.push(opponent.active);
        opponent.active = b;
      }
      break;
    }

    case 'hand_disruption_draw_prizes': {
      // Iono: each player puts hand at bottom, draws equal to prizes
      player.deck.push(...player.hand);
      player.hand = [];
      const pDrawn = player.deck.splice(0, Math.max(player.prizes.length, 1));
      player.hand.push(...pDrawn);

      opponent.deck.push(...opponent.hand);
      opponent.hand = [];
      const oDrawn = opponent.deck.splice(0, Math.max(opponent.prizes.length, 1));
      opponent.hand.push(...oDrawn);
      break;
    }

    case 'switch_active': {
      if (player.bench.length > 0 && player.active) {
        const b = player.bench.shift()!;
        player.bench.push(player.active);
        player.active = b;
      }
      break;
    }

    case 'recycle_discard': {
      // Super Rod: shuffle 3 cards from discard into deck
      const recyclable = player.discard.splice(0, 3);
      player.deck.push(...recyclable);
      player.deck = shuffle(player.deck);
      break;
    }
  }
}

function executeAbilityEffect(state: GameState, player: PlayerState, sourcePokemon: PokemonInPlay) {
  if (sourcePokemon.card.ability?.abilityType === 'draw') {
    // Kirlia Refinement: draw 2
    const drawn = player.deck.splice(0, 2);
    player.hand.push(...drawn);
  } else if (sourcePokemon.card.ability?.abilityType === 'search_deck') {
    if (sourcePokemon.card.name === 'Miraidon ex') {
      // Tandem unit: bench 2 basic lightning
      const lBasics = player.deck.filter((c) => c.pokemonType === 'Lightning' && c.stage === 'Basic').slice(0, 2);
      lBasics.forEach((b) => {
        const idx = player.deck.indexOf(b);
        if (idx !== -1 && player.bench.length < 5) {
          player.deck.splice(idx, 1);
          player.bench.push({
            instanceId: `${player.id}_bench_${b.id}_${Date.now()}`,
            card: b,
            currentHp: b.hp || 70,
            maxHp: b.hp || 70,
            attachedEnergy: [],
            turnPlayed: state.turnNumber,
            statusConditions: [],
            damageCounters: 0,
          });
        }
      });
    } else if (sourcePokemon.card.name === 'Pidgeot ex') {
      // Quick Search: draw 1 best card from deck
      if (player.deck.length > 0) {
        const card = player.deck.shift()!;
        player.hand.push(card);
      }
    }
  }
}

function endTurn(state: GameState) {
  if (state.phase === 'GAME_OVER') return;

  const nextPlayerIndex = 1 - state.activePlayerIndex;
  const nextPlayer = state.players[nextPlayerIndex];

  // Reset per-turn flags
  nextPlayer.energyAttachedThisTurn = false;
  nextPlayer.supporterPlayedThisTurn = false;
  nextPlayer.abilityUsedThisTurn = {};
  nextPlayer.hasRetreatedThisTurn = false;

  state.activePlayerIndex = nextPlayerIndex;
  state.turnNumber += 1;

  // Draw 1 card at start of turn
  if (nextPlayer.deck.length > 0) {
    const drawn = nextPlayer.deck.shift()!;
    nextPlayer.hand.push(drawn);
    log(state, 'draw', `${nextPlayer.name} drew 1 card. (${nextPlayer.deck.length} cards left in deck)`);
  } else {
    // Deck out win condition
    const opponent = state.players[1 - nextPlayerIndex];
    state.winner = opponent.id;
    state.winReason = `${nextPlayer.name} has no cards left in deck (Deck Out)!`;
    state.phase = 'GAME_OVER';
    log(state, 'info', `🏆 VICTORY: ${opponent.name} won by Deck Out!`);
  }
}

function log(state: GameState, type: any, action: string, details?: string) {
  state.log.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    turn: state.turnNumber,
    playerIndex: state.activePlayerIndex,
    playerName: state.players[state.activePlayerIndex].name,
    action,
    details,
    type,
    timestamp: new Date().toLocaleTimeString(),
  });
}
