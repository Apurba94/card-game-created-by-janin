# Card Game Created by Janin — Game Design

## Product concept

**Card Game Created by Janin** is a quick, tactical multi-card game for two to four players. Each player manages a hand of five cards and competes to complete colour runs and value sets before their opponents. The game is designed for portrait phones, fast turns, bright cards, and a virtual joystick that makes choosing cards feel immediate without precision tapping.

The first deliverable combines a complete local match with deterministic computer opponents and a clean multiplayer transport boundary. A production online room requires an authoritative real-time service; the app will expose room, player, turn, and event models that can be connected to such a service without reworking gameplay UI.

## Screen list

| Screen | Content and function | Mobile layout |
| --- | --- | --- |
| **Welcome Lobby** | Game title, player name, online/local mode switch, room code entry, and quick match action. | Central play card and large lower-thumb actions. |
| **Room Lobby** | Player seats, ready states, shareable room code, match settings, and start control. | Table-inspired room card with obvious host actions. |
| **Game Table** | Player hand, discard/draw stacks, opponent status, turn timer, objective, score, virtual joystick, play/draw action. | Main table in the centre; joystick anchored lower left and large play action lower right. |
| **Round Results** | Winning pattern, cards scored, round points, match progress, and rematch action. | Bottom-sheet results with a prominent next-round choice. |
| **Settings Sheet** | Sound, haptics, joystick sensitivity, colour assistance, and how-to-play summary. | Accessible controls with large rows and native-style toggles. |

## Rule set: Janin’s Five

Each round uses a standard 40-card deck: four suits in five colours, values 1–10. Players receive five cards. On a turn they draw one card from the deck or discard pile, then discard one card. A player may claim a **Pattern** when their five-card hand contains either a three-card run of the same suit, a three-card set of matching values, or two matching pairs. The player with the highest current Pattern at the end of the deck earns the round; completing a five-card straight ends the round immediately. Matches are first to 150 points.

## Key interactions

The virtual joystick highlights the active card and supports hand navigation: **left/right** moves across the hand; **up** plays the selected card into a Pattern attempt; **down** draws from the deck; a large `DISCARD` button sends the selected card to the pile. Players can still tap any card as an accessible alternative. Soft snap animation, haptics, and a visible focus ring make each selection easy to track.

## Color system

The visual identity is a warm modern tabletop: **Table Ink #172033**, **Royal Violet #6D4AFF**, **Mint Deal #48D6A7**, **Sun Gold #FFD166**, **Coral #FF6B6B**, and **Paper #FFF8EB**. Each suit is supported by a unique high-contrast shape in addition to colour.

## Online architecture boundary

The local game engine uses serialisable `RoomState`, `PlayerState`, `TurnAction`, `Card`, and `GameEvent` types. A `GameTransport` interface can submit actions and receive state snapshots. The starter implementation is a local bot transport; a future authoritative socket service must validate turn order, generate the deck server-side, store room state, and broadcast events to connected players.
