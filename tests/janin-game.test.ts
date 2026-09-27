import { describe, expect, it } from "vitest";
import { createGame, discardCard, drawCard, evaluatePattern, nextRound, takeBotTurn, type Card } from "../lib/janin/game";
import { createRoom, getRoom, joinRoom, submitRoomAction } from "../server/janinRooms";

const card = (suit: Card["suit"], value: number): Card => ({ id: `${suit}-${value}`, suit, value });

describe("Janin's Five engine", () => {
  it("builds a deterministic playable opening state", () => {
    const game = createGame("Janin", 9);
    expect(game.players[0].hand).toHaveLength(5);
    expect(game.players[1].hand).toHaveLength(5);
    expect(game.discard).toHaveLength(1);
    expect(game.deck).toHaveLength(29);
    expect(game.activePlayer).toBe("human");
  });

  it("recognises a five-card same-suit run", () => {
    const pattern = evaluatePattern([card("sun", 2), card("sun", 3), card("sun", 4), card("sun", 5), card("sun", 6)]);
    expect(pattern.name).toBe("Five-Card Straight");
    expect(pattern.score).toBeGreaterThan(150);
  });

  it("requires a draw before a player can discard", () => {
    const opening = createGame("Janin", 18);
    const cardId = opening.players[0].hand[0].id;
    expect(discardCard(opening, cardId)).toEqual(opening);
  });

  it("moves play from a human draw and discard into the bot turn", () => {
    const opening = createGame("Janin", 18);
    const drawn = drawCard(opening, "deck");
    expect(drawn.players[0].hand).toHaveLength(6);
    const afterDiscard = discardCard(drawn, drawn.players[0].hand[0].id);
    expect(afterDiscard.players[0].hand).toHaveLength(5);
    expect(afterDiscard.activePlayer).toBe("bot");
    const afterBot = takeBotTurn(afterDiscard);
    expect(afterBot.activePlayer).toBe("human");
  });

  it("creates and joins an online room with authoritative turn validation", () => {
    const created = createRoom("Janin");
    expect(created.status).toBe("waiting");
    const joined = joinRoom(created.roomCode, "Mira");
    expect(joined.status).toBe("playing");
    expect(joined.game?.players.map((player) => player.name)).toEqual(["Janin", "Mira"]);
    const afterDraw = submitRoomAction({ roomCode: created.roomCode, token: created.token, type: "draw", source: "deck" });
    expect(afterDraw.game?.hasDrawn).toBe(true);
    expect(() => submitRoomAction({ roomCode: created.roomCode, token: joined.token, type: "draw", source: "deck" })).toThrow("It is not your turn.");
    expect(getRoom(created.roomCode, created.token).roomCode).toBe(created.roomCode);
  });

  it("shows each seat only its own hand, never the deck or the opponent's cards", () => {
    const created = createRoom("Janin");
    const joined = joinRoom(created.roomCode, "Mira");
    const hostView = getRoom(created.roomCode, created.token).game!;
    const guestView = joined.game!;
    const hidden = (cards: Card[]) => cards.every((item) => item.id.startsWith("hidden-") && item.value === 0);

    expect(hidden(hostView.deck)).toBe(true);
    expect(hostView.deck).toHaveLength(29);
    expect(hidden(hostView.players.find((p) => p.id === "bot")!.hand)).toBe(true);
    expect(hidden(hostView.players.find((p) => p.id === "human")!.hand)).toBe(false);
    expect(hidden(guestView.players.find((p) => p.id === "human")!.hand)).toBe(true);
    expect(hidden(guestView.players.find((p) => p.id === "bot")!.hand)).toBe(false);
  });

  it("refuses unknown tokens, so nobody can act for a seat they do not hold", () => {
    const created = createRoom("Janin");
    joinRoom(created.roomCode, "Mira");
    expect(() => getRoom(created.roomCode, "guess")).toThrow("You are not seated at this table.");
    expect(() => submitRoomAction({ roomCode: created.roomCode, token: "guess", type: "draw" })).toThrow("You are not seated at this table.");
  });

  it("deals different online games from a secret seed", () => {
    const hands = Array.from({ length: 4 }, () => {
      const created = createRoom("Janin");
      joinRoom(created.roomCode, "Mira");
      return getRoom(created.roomCode, created.token).game!.players[0].hand.map((item) => item.id).join();
    });
    expect(new Set(hands).size).toBeGreaterThan(1);
  });

  it("ends the round when the last deck card is played, even without a bot turn", () => {
    let state = createGame("Janin", 18);
    state = { ...state, deck: state.deck.slice(-1) };
    state = drawCard(state, "deck");
    const done = discardCard(state, state.players[0].hand[0].id);
    expect(done.deck).toHaveLength(0);
    expect(done.status).toBe("round-over");
    expect(done.message).toMatch(/^Deck complete/);
  });

  it("shuffles each new round instead of repeating the same deal", () => {
    const deals = [1, 2, 3].map((seed) => nextRound(createGame("Janin", 5), seed * 7919).players[0].hand.map((item) => item.id).join());
    expect(new Set(deals).size).toBe(3);
  });
});
