import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini API client with required User-Agent header
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'Pokemon TCG AI Battle Challenge',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Gemini Strategic Battle Advisor & Decision Explainer
app.post('/api/ai/analyze-state', async (req, res) => {
  try {
    const { gameState, question, mode } = req.body;
    const ai = getAI();

    const systemInstruction = `You are a world-class Pokémon Trading Card Game Grandmaster, World Championship AI Champion, and Game Theory / MCTS AI Researcher.
You specialize in evaluating imperfect information board states in Pokémon TCG, calculating prize card trade ratios, energy acceleration curves, opponent hand probability distributions, and optimal decision tree branches.
Provide crisp, tactical, and mathematically grounded advice. Format key insights with markdown bullet points, bold keywords, and clear turn-by-turn action recommendations.`;

    let prompt = '';
    if (mode === 'explain-action') {
      prompt = `Analyze the following Pokémon TCG match board state and explain the optimal play:
Current Board State:
${JSON.stringify(gameState, null, 2)}

Explain:
1. The strategic priority for this turn (e.g. Prize race, Setup, Disruption, Tempo preservation).
2. The Top 3 recommended action branches ranked by expected win-rate (Q-value).
3. Risk analysis considering opponent's hidden hand cards and response threats.
4. MCTS evaluation insight.`;
    } else if (mode === 'deck-review') {
      prompt = `Analyze the following Pokémon TCG Deck Archetype and Strategy:
Deck & Matchup Data:
${JSON.stringify(gameState, null, 2)}
User Query: ${question || 'Analyze consistency, win-conditions, and meta matchups.'}

Provide:
1. Consistency & Opening Hand probability assessment.
2. Key Energy & Evolution bottlenecks.
3. Matchup advantages and vulnerabilities against top meta decks (Charizard ex, Gardevoir ex, Pikachu ex).
4. Recommended tech card substitutions for AI tournament play.`;
    } else {
      prompt = `Board State:
${JSON.stringify(gameState, null, 2)}

User Question / Strategy Query:
${question || 'What is the highest EV (Expected Value) line of play right now?'}

Give a master-level tactical breakdown with concrete move sequencing.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
      },
    });

    const advice = response.text || 'Unable to generate strategic analysis at this moment.';
    res.json({ success: true, advice });
  } catch (error: any) {
    console.error('Gemini state analysis error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate AI strategy analysis.',
      fallbackAdvice: 'Focus on setting up your benched attackers and preserving your active Pokémon’s HP while tracking opponent prize count.',
    });
  }
});

// Monte Carlo Batch Match Simulator Endpoint
app.post('/api/sim/batch-matchup', (req, res) => {
  try {
    const { deckA, deckB, iterations = 100 } = req.body;
    // Fast analytical simulation based on archetype speed, HP, damage ceiling, and weakness
    const validIterations = Math.min(Math.max(Number(iterations) || 100, 10), 1000);
    
    let aWins = 0;
    let bWins = 0;
    const history: Array<{ match: number; winner: string; turns: number; prizeDiff: number }> = [];

    const baseWinRateA = calculateArchetypeEdge(deckA, deckB);

    for (let i = 1; i <= validIterations; i++) {
      // Stochastic variance with randomized prize trade curves
      const luckFactor = (Math.random() - 0.5) * 0.35;
      const effectiveWinProb = Math.min(Math.max(baseWinRateA + luckFactor, 0.05), 0.95);
      const isAWinner = Math.random() < effectiveWinProb;
      const turns = Math.floor(5 + Math.random() * 8);
      const prizeDiff = isAWinner ? Math.floor(1 + Math.random() * 4) : -Math.floor(1 + Math.random() * 4);

      if (isAWinner) {
        aWins++;
        history.push({ match: i, winner: deckA.name || 'Deck A', turns, prizeDiff });
      } else {
        bWins++;
        history.push({ match: i, winner: deckB.name || 'Deck B', turns, prizeDiff });
      }
    }

    res.json({
      success: true,
      deckA: deckA.name,
      deckB: deckB.name,
      totalMatches: validIterations,
      deckAWins: aWins,
      deckBWins: bWins,
      deckAWinRate: Number(((aWins / validIterations) * 100).toFixed(1)),
      deckBWinRate: Number(((bWins / validIterations) * 100).toFixed(1)),
      averageTurns: Number((history.reduce((acc, h) => acc + h.turns, 0) / validIterations).toFixed(1)),
      history: history.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function calculateArchetypeEdge(deckA: any, deckB: any): number {
  if (!deckA || !deckB) return 0.5;
  let edge = 0.5;

  const typeA = deckA.primaryType || 'Colorless';
  const typeB = deckB.primaryType || 'Colorless';

  // Weakness matrix
  const weaknessMap: Record<string, string> = {
    Fire: 'Water',
    Water: 'Lightning',
    Lightning: 'Fighting',
    Fighting: 'Psychic',
    Psychic: 'Darkness',
    Darkness: 'Fighting',
    Grass: 'Fire',
    Metal: 'Fire',
    Dragon: 'Fairy',
  };

  if (weaknessMap[typeB] === typeA) edge += 0.22;
  if (weaknessMap[typeA] === typeB) edge -= 0.22;

  // Setup speed vs late game scaling
  const speedA = deckA.speed || 5;
  const speedB = deckB.speed || 5;
  edge += (speedA - speedB) * 0.025;

  const powerA = deckA.power || 5;
  const powerB = deckB.power || 5;
  edge += (powerA - powerB) * 0.02;

  return Math.min(Math.max(edge, 0.15), 0.85);
}

// Start Server & Vite setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pokemon TCG AI Lab Server running on port ${PORT}`);
  });
}

startServer();
