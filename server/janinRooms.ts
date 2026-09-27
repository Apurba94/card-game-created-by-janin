import { randomBytes, randomInt } from "node:crypto";
import { createGame, discardForPlayer, drawForPlayer, randomSeed, type Card, type GameState, type PlayerState } from "../lib/janin/game";

type Seat = PlayerState["id"];
type OnlineRoom = {
  code: string; host: string; guest: string | null; game: GameState | null; updatedAt: number;
  /** Secret per-seat tokens: whoever holds one may act for that seat and see its hand. */
  tokens: Record<Seat, string | null>;
};
const rooms = new Map<string, OnlineRoom>();

/** Rooms untouched for this long are dropped, so abandoned tables do not pile up in memory. */
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

function pruneIdleRooms(now = Date.now()) {
  for (const [roomCode, room] of rooms) if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(roomCode);
}

function findRoom(roomCode: string, missing = "Room not found.") {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error(missing);
  return room;
}

function seatFor(room: OnlineRoom, token: string): Seat {
  if (token && room.tokens.human === token) return "human";
  if (token && room.tokens.bot === token) return "bot";
  throw new Error("You are not seated at this table.");
}

const hiddenCard = (index: number): Card => ({ id: `hidden-${index}`, suit: "sun", value: 0 });

/**
 * The game as one seat may see it: its own hand, the discard pile and scores.
 * The deck order and the opponent's hand are replaced by face-down placeholders
 * of the same length, so the client can still show counts without learning cards.
 */
function viewFor(game: GameState, seat: Seat): GameState {
  return {
    ...game,
    deck: game.deck.map((_, index) => hiddenCard(index)),
    players: game.players.map((player) => player.id === seat ? player : { ...player, hand: player.hand.map((_, index) => hiddenCard(index)) }),
  };
}

function snapshot(room: OnlineRoom, seat: Seat) {
  return {
    roomCode: room.code,
    status: room.game ? "playing" as const : room.guest ? "ready" as const : "waiting" as const,
    players: [{ slot: "human", name: room.host }, ...(room.guest ? [{ slot: "bot", name: room.guest }] : [])],
    game: room.game ? viewFor(room.game, seat) : null,
    updatedAt: room.updatedAt,
    seat,
  };
}

export function createRoom(playerName: string) {
  pruneIdleRooms();
  let roomCode = code();
  while (rooms.has(roomCode)) roomCode = code();
  const token = newToken();
  const room: OnlineRoom = { code: roomCode, host: playerName.trim().slice(0, 18) || "Host", guest: null, game: null, updatedAt: Date.now(), tokens: { human: token, bot: null } };
  rooms.set(roomCode, room);
  return { ...snapshot(room, "human"), token };
}

export function joinRoom(roomCode: string, playerName: string) {
  const room = findRoom(roomCode, "Room not found. Check the room code and try again.");
  if (room.guest) throw new Error("This room already has two players.");
  room.guest = playerName.trim().slice(0, 18) || "Guest";
  room.tokens.bot = newToken();
  // A server-side secret seed: neither player can predict or replay the deal.
  const game = createGame(room.host, randomSeed(() => randomInt(2 ** 47) / 2 ** 47));
  room.game = { ...game, players: game.players.map((player) => player.id === "bot" ? { ...player, name: room.guest! } : player) };
  room.updatedAt = Date.now();
  return { ...snapshot(room, "bot"), token: room.tokens.bot };
}

export function getRoom(roomCode: string, token: string) {
  const room = findRoom(roomCode);
  return snapshot(room, seatFor(room, token));
}

export function submitRoomAction(input: { roomCode: string; token: string; type: "draw" | "discard"; source?: "deck" | "discard"; cardId?: string }) {
  const room = findRoom(input.roomCode);
  const seat = seatFor(room, input.token);
  if (!room.game) throw new Error("Room is waiting for another player.");
  if (room.game.activePlayer !== seat) throw new Error("It is not your turn.");
  room.game = input.type === "draw" ? drawForPlayer(room.game, seat, input.source ?? "deck") : discardForPlayer(room.game, seat, input.cardId ?? "");
  room.updatedAt = Date.now();
  return snapshot(room, seat);
}
