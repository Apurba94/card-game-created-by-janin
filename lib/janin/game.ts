export const SUITS = ["sun", "moon", "wave", "leaf"] as const;
export type Suit = (typeof SUITS)[number];

export type Card = { id: string; suit: Suit; value: number };
export type Pattern = { name: "High Card" | "Two Pairs" | "Three of a Kind" | "Three-Card Run" | "Five-Card Straight"; score: number };
export type PlayerState = { id: "human" | "bot"; name: string; hand: Card[]; score: number };
export type GameState = {
  deck: Card[]; discard: Card[]; players: PlayerState[]; activePlayer: "human" | "bot";
  hasDrawn: boolean; round: number; status: "playing" | "round-over"; message: string;
};

/** A seed for the shuffle generator (valid range 1..2^31-2). Pass a secure source on the server. */
export function randomSeed(random: () => number = Math.random) {
  return 1 + Math.floor(random() * 2147483645);
}

function shuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let value = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    value = (value * 16807) % 2147483647;
    const swapIndex = value % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function makeDeck(seed: number) {
  return shuffle(SUITS.flatMap((suit) => Array.from({ length: 10 }, (_, index) => ({ id: `${suit}-${index + 1}`, suit, value: index + 1 }))), seed);
}

function player(state: GameState, id: PlayerState["id"]) { return state.players.find((item) => item.id === id)!; }
function withPlayer(state: GameState, next: PlayerState) { return { ...state, players: state.players.map((item) => item.id === next.id ? next : item) }; }

export function evaluatePattern(hand: Card[]): Pattern {
  const values = hand.map((card) => card.value).sort((a, b) => a - b);
  const counts = values.reduce<Record<number, number>>((result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }), {});
  const pairs = Object.values(counts).filter((count) => count >= 2).length;
  const isTriple = Object.values(counts).some((count) => count >= 3);
  const largestRun = SUITS.reduce((best, suit) => {
    const sorted = hand.filter((card) => card.suit === suit).map((card) => card.value).sort((a, b) => a - b);
    return Math.max(best, sorted.reduce((run, value, index) => index > 0 && value === sorted[index - 1] + 1 ? run + 1 : 1, sorted.length ? 1 : 0));
  }, 0);
  const fiveSameSuit = hand.length === 5 && hand.every((card) => card.suit === hand[0].suit);
  const high = Math.max(...values, 0);
  if (fiveSameSuit && largestRun === 5) return { name: "Five-Card Straight", score: 150 + high };
  if (isTriple) return { name: "Three of a Kind", score: 80 + high };
  if (largestRun >= 3) return { name: "Three-Card Run", score: 55 + high };
  if (pairs >= 2) return { name: "Two Pairs", score: 40 + high };
  return { name: "High Card", score: high };
}

export function createGame(playerName = "Janin", seed = 2026): GameState {
  const deck = makeDeck(seed);
  const human: PlayerState = { id: "human", name: playerName.trim() || "Janin", hand: deck.splice(0, 5), score: 0 };
  const bot: PlayerState = { id: "bot", name: "Mira", hand: deck.splice(0, 5), score: 0 };
  return { deck, discard: [deck.shift()!], players: [human, bot], activePlayer: "human", hasDrawn: false, round: 1, status: "playing", message: "Your turn — draw from the deck or discard pile." };
}

export function drawForPlayer(state: GameState, actor: PlayerState["id"], from: "deck" | "discard"): GameState {
  if (state.status !== "playing" || state.activePlayer !== actor || state.hasDrawn) return state;
  const source = from === "deck" ? state.deck : state.discard;
  const card = source.at(-1);
  if (!card) return { ...state, message: "No card is available from that pile." };
  const currentPlayer = player(state, actor);
  const next = { ...state, deck: from === "deck" ? state.deck.slice(0, -1) : state.deck, discard: from === "discard" ? state.discard.slice(0, -1) : state.discard, hasDrawn: true, message: "Choose a card to discard." };
  return withPlayer(next, { ...currentPlayer, hand: [...currentPlayer.hand, card] });
}

export function drawCard(state: GameState, from: "deck" | "discard"): GameState { return drawForPlayer(state, "human", from); }

export function discardForPlayer(state: GameState, actor: PlayerState["id"], cardId: string): GameState {
  if (state.status !== "playing" || state.activePlayer !== actor || !state.hasDrawn) return state;
  const currentPlayer = player(state, actor);
  const card = currentPlayer.hand.find((item) => item.id === cardId);
  if (!card) return state;
  const hand = currentPlayer.hand.filter((item) => item.id !== cardId);
  const pattern = evaluatePattern(hand);
  const nextActor = actor === "human" ? "bot" : "human";
  const next = withPlayer({ ...state, discard: [...state.discard, card], activePlayer: nextActor, hasDrawn: false, message: `${currentPlayer.name} made ${pattern.name}.` }, { ...currentPlayer, hand, score: currentPlayer.score + pattern.score });
  if (pattern.name === "Five-Card Straight") return { ...next, status: "round-over", message: "Five-Card Straight — instant round win!" };
  if (next.deck.length === 0) {
    // The deck is spent: end the round here rather than leave the next player
    // cycling the discard pile forever (online tables have no bot turn to end it).
    const [first, second] = next.players.map((item) => ({ item, pattern: evaluatePattern(item.hand) }));
    const winner = first.pattern.score >= second.pattern.score ? first : second;
    return { ...next, status: "round-over", message: `Deck complete — ${winner.item.name}’s ${winner.pattern.name} wins the round.` };
  }
  return next;
}

export function discardCard(state: GameState, cardId: string): GameState { return discardForPlayer(state, "human", cardId); }

export function takeBotTurn(state: GameState): GameState {
  if (state.status !== "playing" || state.activePlayer !== "bot") return state;
  const bot = player(state, "bot");
  const drawn = state.deck.at(-1);
  if (!drawn) return { ...state, status: "round-over", message: "Deck complete — compare your patterns." };
  const expanded = [...bot.hand, drawn];
  const discarded = [...expanded].sort((a, b) => a.value - b.value)[0];
  const hand = expanded.filter((card) => card.id !== discarded.id);
  const pattern = evaluatePattern(hand);
  const deck = state.deck.slice(0, -1);
  const humanPattern = evaluatePattern(player(state, "human").hand);
  const finished = deck.length === 0;
  const message = finished ? humanPattern.score >= pattern.score ? `Deck complete — ${humanPattern.name} wins the round.` : `Deck complete — Mira’s ${pattern.name} wins.` : "Mira discarded a card. Your turn — draw again.";
  return withPlayer({ ...state, deck, discard: [...state.discard, discarded], activePlayer: "human", hasDrawn: false, status: finished ? "round-over" : "playing", message }, { ...bot, hand, score: bot.score + pattern.score });
}

export function nextRound(state: GameState, seed = randomSeed()): GameState {
  const human = player(state, "human");
  const bot = player(state, "bot");
  const next = createGame(human.name, seed);
  return { ...next, round: state.round + 1, players: next.players.map((item) => ({ ...item, score: item.id === "human" ? human.score : bot.score })) };
}
