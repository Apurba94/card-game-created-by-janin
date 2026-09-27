import type { GameState } from "./game";

export type RoomSnapshot = { roomCode: string; status: "waiting" | "ready" | "playing"; game: GameState | null };
export interface GameTransport {
  createRoom(playerName: string): Promise<RoomSnapshot>;
  joinRoom(roomCode: string, playerName: string): Promise<RoomSnapshot>;
  submitAction(roomCode: string, action: { type: "draw" | "discard"; cardId?: string }): Promise<RoomSnapshot>;
  watchRoom(roomCode: string, onSnapshot: (snapshot: RoomSnapshot) => void): () => void;
}

/** A future socket service must validate identities, room membership, turns and server-side shuffles. */
export const MULTIPLAYER_NOTE = "Online rooms require an authoritative persistent server; this prototype preserves the real-time room contract and runs a local bot table.";
