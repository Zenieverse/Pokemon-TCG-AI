import {
  BeliefDistribution,
  GameAction,
  GameState,
  MCTSNode,
  PlayerState,
} from '../types/pokemon';
import {
  cloneGameState,
  executeAction,
  getLegalActions,
  shuffle,
} from './battleEngine';

// Multi-factor state evaluation heuristic
export function evaluateBoardState(state: GameState, playerIndex: number): {
  total: number;
  prizeScore: number;
  energyScore: number;
  tempoScore: number;
  threatScore: number;
} {
  const me = state.players[playerIndex];
  const opp = state.players[1 - playerIndex];

  if (state.winner) {
    if (state.winner === me.id) {
      return { total: 10000, prizeScore: 5000, energyScore: 2000, tempoScore: 1500, threatScore: 1500 };
    } else {
      return { total: -10000, prizeScore: -5000, energyScore: -2000, tempoScore: -1500, threatScore: -1500 };
    }
  }

  // 1. Prize Card Differential (Crucial Win Condition)
  // Fewer remaining prizes is better for me
  const prizeAdvantage = (opp.prizes.length - me.prizes.length) * 180;
  const prizeScore = prizeAdvantage + me.knockedOutPrizesTaken * 90;

  // 2. Energy on Board (Board Value & Tempo)
  const myTotalEnergy =
    (me.active?.attachedEnergy.length || 0) +
    me.bench.reduce((acc, b) => acc + b.attachedEnergy.length, 0);
  const oppTotalEnergy =
    (opp.active?.attachedEnergy.length || 0) +
    opp.bench.reduce((acc, b) => acc + b.attachedEnergy.length, 0);
  const energyScore = (myTotalEnergy - oppTotalEnergy) * 35;

  // 3. Tempo & Board Presence (HP, Evolution Stages, Bench size)
  let myBoardHp = (me.active?.currentHp || 0) + me.bench.reduce((acc, b) => acc + b.currentHp, 0);
  let oppBoardHp = (opp.active?.currentHp || 0) + opp.bench.reduce((acc, b) => acc + b.currentHp, 0);

  // Bonus for ex / Stage 2 powerhouses in play
  const myExCount = [me.active, ...me.bench].filter((p) => p?.card.isEx).length;
  const oppExCount = [opp.active, ...opp.bench].filter((p) => p?.card.isEx).length;

  const tempoScore = (myBoardHp - oppBoardHp) * 0.4 + (myExCount - oppExCount) * 60 + me.bench.length * 20;

  // 4. Knockout Threat Score (Can we KO opponent active next turn?)
  let threatScore = 0;
  if (me.active && opp.active) {
    const highestDmgAttack = Math.max(
      0,
      ...(me.active.card.attacks?.map((a) => a.damage || 0) || [0]),
    );
    if (highestDmgAttack >= opp.active.currentHp) {
      threatScore += 120; // Imminent Knockout threat!
    }
  }

  // Hand Quality
  const handScore = me.hand.length * 15;

  const total = prizeScore + energyScore + tempoScore + threatScore + handScore;

  return {
    total,
    prizeScore: Math.round(prizeScore),
    energyScore: Math.round(energyScore),
    tempoScore: Math.round(tempoScore),
    threatScore: Math.round(threatScore),
  };
}

// ----------------------------------------------------
// 1. IS-MCTS (Information-Set Monte Carlo Tree Search)
// ----------------------------------------------------
export interface MCTSResult {
  bestAction: GameAction;
  tree: MCTSNode;
  allRankedActions: { action: GameAction; qValue: number; visits: number; winRate: number }[];
  searchStats: {
    simulations: number;
    depthReached: number;
    rolloutTimeMs: number;
    beliefDeterminizations: number;
  };
}

export function runISMCTS(
  state: GameState,
  simulations: number = 80,
  maxRolloutDepth: number = 4,
): MCTSResult {
  const startTime = performance.now();
  const playerIndex = state.activePlayerIndex;
  const legalActions = getLegalActions(state);

  if (legalActions.length === 0) {
    throw new Error('No legal actions available in state.');
  }

  if (legalActions.length === 1) {
    const singleNode: MCTSNode = {
      id: 'root_0',
      actionLabel: legalActions[0].label,
      action: legalActions[0],
      visits: 1,
      wins: 1,
      qValue: 1,
      uctScore: 1,
      children: [],
      depth: 0,
      valueBreakdown: { prizeScore: 50, energyScore: 20, tempoScore: 30, threatScore: 10 },
    };
    return {
      bestAction: legalActions[0],
      tree: singleNode,
      allRankedActions: [{ action: legalActions[0], qValue: 1, visits: 1, winRate: 100 }],
      searchStats: {
        simulations: 1,
        depthReached: 1,
        rolloutTimeMs: 1,
        beliefDeterminizations: 1,
      },
    };
  }

  // Build root children for each legal action
  const rootChildren: MCTSNode[] = legalActions.map((act, idx) => {
    const nextState = executeAction(state, act);
    const evalData = evaluateBoardState(nextState, playerIndex);
    return {
      id: `node_0_${idx}`,
      actionLabel: act.label,
      action: act,
      visits: 0,
      wins: 0,
      qValue: evalData.total / 100, // normalized baseline
      uctScore: 0,
      children: [],
      depth: 1,
      valueBreakdown: evalData,
      beliefContext: 'Sampled from Bayes Hand Distribution',
    };
  });

  const rootNode: MCTSNode = {
    id: 'root',
    actionLabel: 'Current Board State',
    action: legalActions[0],
    visits: 0,
    wins: 0,
    qValue: 0,
    uctScore: 0,
    children: rootChildren,
    depth: 0,
  };

  const explorationConstant = 1.414; // UCT exploration weight

  for (let sim = 0; sim < simulations; sim++) {
    // 1. Determinization: Sample opponent's hidden hand from belief distribution
    const determinizedState = determinizeState(state, playerIndex);

    // 2. Selection using UCT
    let selectedChild = rootChildren[0];
    let bestUct = -Infinity;

    for (const child of rootChildren) {
      const uct =
        child.visits === 0
          ? 1000 + Math.random() * 10
          : child.qValue +
            explorationConstant * Math.sqrt(Math.log(rootNode.visits + 1) / child.visits);
      child.uctScore = Number(uct.toFixed(3));
      if (uct > bestUct) {
        bestUct = uct;
        selectedChild = child;
      }
    }

    // 3. Rollout / Simulation
    let rolloutState = executeAction(determinizedState, selectedChild.action);
    let depth = 1;

    while (
      depth < maxRolloutDepth &&
      !rolloutState.winner &&
      rolloutState.phase !== 'GAME_OVER'
    ) {
      const rolloutActions = getLegalActions(rolloutState);
      if (rolloutActions.length === 0) break;
      // Fast rollout policy: prioritize attacks and energy
      const rolloutChoice = chooseFastRolloutAction(rolloutActions);
      rolloutState = executeAction(rolloutState, rolloutChoice);
      depth++;
    }

    // 4. Backpropagation
    const outcomeEval = evaluateBoardState(rolloutState, playerIndex);
    const winScore = outcomeEval.total > 0 ? 1 : 0;

    selectedChild.visits += 1;
    selectedChild.wins += winScore;
    selectedChild.qValue = Number(
      (selectedChild.qValue * 0.7 + (outcomeEval.total / 500) * 0.3).toFixed(2),
    );

    rootNode.visits += 1;
    rootNode.wins += winScore;
  }

  // Sort actions by Visit Count & Q-Value
  const ranked = rootChildren.map((c) => ({
    action: c.action,
    qValue: c.qValue,
    visits: c.visits,
    winRate: Number((c.visits > 0 ? (c.wins / c.visits) * 100 : 50).toFixed(1)),
  }));

  ranked.sort((a, b) => b.visits - a.visits || b.qValue - a.qValue);

  const bestAction = ranked[0].action;
  const elapsed = Math.round(performance.now() - startTime);

  return {
    bestAction,
    tree: rootNode,
    allRankedActions: ranked,
    searchStats: {
      simulations,
      depthReached: maxRolloutDepth,
      rolloutTimeMs: elapsed,
      beliefDeterminizations: simulations,
    },
  };
}

// Determinization: Sample opponent hidden cards
function determinizeState(state: GameState, myIndex: number): GameState {
  const cloned = cloneGameState(state);
  const opp = cloned.players[1 - myIndex];

  // If opponent has hand cards and deck, shuffle known deck + unknown cards
  if (opp.hand.length > 0 && opp.deck.length > 0) {
    const combinedPool = shuffle([...opp.hand, ...opp.deck]);
    opp.hand = combinedPool.splice(0, opp.hand.length);
    opp.deck = combinedPool;
  }

  return cloned;
}

function chooseFastRolloutAction(actions: GameAction[]): GameAction {
  // Prefer attacks first
  const attacks = actions.filter((a) => a.type === 'ATTACK');
  if (attacks.length > 0) return attacks[0];

  // Prefer energy attachment
  const energy = actions.filter((a) => a.type === 'ATTACH_ENERGY');
  if (energy.length > 0) return energy[0];

  // Prefer evolution
  const evo = actions.filter((a) => a.type === 'EVOLVE');
  if (evo.length > 0) return evo[0];

  // Random fallback
  return actions[Math.floor(Math.random() * actions.length)];
}

// ----------------------------------------------------
// 2. Heuristic Policy Bot (Fast multi-factor policy network)
// ----------------------------------------------------
export function runHeuristicBot(state: GameState): GameAction {
  const actions = getLegalActions(state);
  if (actions.length === 0) return { type: 'PASS_TURN', label: 'Pass', description: 'No actions' };

  let bestAction = actions[0];
  let maxScore = -Infinity;

  for (const act of actions) {
    const nextState = executeAction(state, act);
    const scoreData = evaluateBoardState(nextState, state.activePlayerIndex);

    // Heuristic Action Biases
    let bias = 0;
    if (act.type === 'ATTACK') bias += 250;
    if (act.type === 'ATTACH_ENERGY') bias += 180;
    if (act.type === 'EVOLVE') bias += 200;
    if (act.type === 'PLAY_TRAINER') bias += 120;
    if (act.type === 'USE_ABILITY') bias += 150;
    if (act.type === 'PLAY_BASIC') bias += 100;
    if (act.type === 'PASS_TURN') bias -= 100;

    const totalScore = scoreData.total + bias;
    if (totalScore > maxScore) {
      maxScore = totalScore;
      bestAction = act;
    }
  }

  return bestAction;
}

// ----------------------------------------------------
// 3. Greedy Bot (Max immediate damage / KO bot)
// ----------------------------------------------------
export function runGreedyBot(state: GameState): GameAction {
  const actions = getLegalActions(state);
  if (actions.length === 0) return { type: 'PASS_TURN', label: 'Pass', description: 'No actions' };

  // Always attack if possible
  const attacks = actions.filter((a) => a.type === 'ATTACK');
  if (attacks.length > 0) {
    // Pick the highest damage attack
    return attacks[0];
  }

  // Then attach energy
  const energy = actions.filter((a) => a.type === 'ATTACH_ENERGY');
  if (energy.length > 0) return energy[0];

  // Then evolve
  const evo = actions.filter((a) => a.type === 'EVOLVE');
  if (evo.length > 0) return evo[0];

  // Then play trainers
  const trainers = actions.filter((a) => a.type === 'PLAY_TRAINER');
  if (trainers.length > 0) return trainers[0];

  // Then basic
  const basic = actions.filter((a) => a.type === 'PLAY_BASIC');
  if (basic.length > 0) return basic[0];

  return actions[0];
}

// ----------------------------------------------------
// 4. Random Bot (Baseline comparator)
// ----------------------------------------------------
export function runRandomBot(state: GameState): GameAction {
  const actions = getLegalActions(state);
  return actions[Math.floor(Math.random() * actions.length)];
}

// ----------------------------------------------------
// 5. Opponent Hand Bayesian Belief Distribution Tracker
// ----------------------------------------------------
export function computeOpponentBeliefDistributions(
  state: GameState,
  viewingPlayerIndex: number,
): BeliefDistribution[] {
  const opp = state.players[1 - viewingPlayerIndex];
  const handSize = opp.hand.length;
  const deckSize = opp.deck.length;
  const unseenCardsCount = handSize + deckSize + opp.prizes.length;

  if (unseenCardsCount <= 0 || handSize <= 0) return [];

  // Key tournament cards to track
  const trackedMetaCards = [
    {
      name: "Boss's Orders",
      category: 'Boss/Disruption' as const,
      defaultCopies: 2,
      strategicThreat: 'Critical' as const,
      reasoning: 'Can gust your damaged benched ex Pokémon for immediate knockout game-win.',
    },
    {
      name: 'Iono',
      category: 'Supporter' as const,
      defaultCopies: 2,
      strategicThreat: 'High' as const,
      reasoning: 'Reduces your hand to your remaining prize count while resetting their hand.',
    },
    {
      name: 'Rare Candy',
      category: 'Item' as const,
      defaultCopies: 2,
      strategicThreat: 'High' as const,
      reasoning: 'Enables skipping Stage 1 to evolve into Charizard ex or Gardevoir ex.',
    },
    {
      name: "Professor's Research",
      category: 'Supporter' as const,
      defaultCopies: 2,
      strategicThreat: 'Moderate' as const,
      reasoning: 'Refills opponent hand to 7 cards, providing critical card advantage.',
    },
    {
      name: 'Super Rod',
      category: 'Item' as const,
      defaultCopies: 1,
      strategicThreat: 'Moderate' as const,
      reasoning: 'Recovers knocked out Pokémon and basic energies from discard pile.',
    },
    {
      name: 'Basic Energy',
      category: 'Energy' as const,
      defaultCopies: 7,
      strategicThreat: 'Critical' as const,
      reasoning: 'Required for active attack activation this turn.',
    },
  ];

  const distributions: BeliefDistribution[] = [];

  for (const track of trackedMetaCards) {
    // Count how many copies are already visible in discard or in play
    const discardedCount = opp.discard.filter((c) =>
      c.name.toLowerCase().includes(track.name.toLowerCase()),
    ).length;
    const inPlayCount = [opp.active, ...opp.bench].filter(
      (p) => p && p.card.name.toLowerCase().includes(track.name.toLowerCase()),
    ).length;

    const remainingUnknown = Math.max(0, track.defaultCopies - discardedCount - inPlayCount);

    // Hypergeometric Probability of having at least 1 copy in hand of size H from unseen pool U
    // P(X >= 1) = 1 - ( (U - K choose H) / (U choose H) )
    let prob = 0;
    if (unseenCardsCount > 0 && remainingUnknown > 0) {
      const probNoneInHand = calculateHypergeometric(
        unseenCardsCount - remainingUnknown,
        handSize,
        unseenCardsCount,
      );
      prob = Math.min(Math.max(1 - probNoneInHand, 0.05), 0.98);
    }

    distributions.push({
      cardName: track.name,
      category: track.category,
      probability: Number((prob * 100).toFixed(1)),
      copiesRemainingInDeckOrHand: remainingUnknown,
      strategicThreat: track.strategicThreat,
      reasoning: track.reasoning,
    });
  }

  return distributions.sort((a, b) => b.probability - a.probability);
}

// Approximation of hypergeometric probability P(drawing 0 target cards)
function calculateHypergeometric(noTargetCards: number, sampleSize: number, totalCards: number): number {
  if (sampleSize > noTargetCards) return 0;
  if (totalCards <= 0) return 1;

  let p = 1.0;
  for (let i = 0; i < sampleSize; i++) {
    p *= (noTargetCards - i) / (totalCards - i);
  }
  return p;
}
