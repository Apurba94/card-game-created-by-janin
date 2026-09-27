# Card Game Created by Janin

**Card Game Created by Janin** is a portrait-first mobile card game built with Expo, React Native, and TypeScript. It implements **Janin’s Five**, a quick tactical five-card game for two players. The repository includes local bot play, smooth virtual-joystick navigation, accessible direct-card tapping, haptics, deterministic scoring, and a real room service for same-instance online tables.

## Included experience

| Area | Included implementation |
| --- | --- |
| Card game rules | Seeded shuffles (a fresh random deal every game and round), draw/discard turns, runs, sets, pairs, scoring, round completion when the deck runs out, and instant straight wins. |
| Mobile interaction | Portrait table layout, large tap targets, a virtual joystick for hand movement and turn actions, direct card selection, pressed states, and restrained native haptics. |
| Local play | A complete fast-turn match against the Mira bot, including a next-round flow. |
| Online tables | Create a six-character room code, join it from a second device, poll its shared state, and submit validated actions to the room service. |
| Branding | Custom Janin launcher icon, native configuration, adaptive Android foreground icon, splash, and favicon. |

## Janin’s Five rules

Two players begin with five cards. On each turn, draw from the deck or discard pile and then discard one card. Hands score for a three-card run in one suit, a three-card value set, or two pairs. A five-card straight wins the round immediately. Otherwise, score accumulates during the round and the game is designed for short repeat matches.

| Input | Effect |
| --- | --- |
| Tap a card or joystick left/right | Select a card in your hand. |
| Joystick down or draw pile | Draw a card. |
| Joystick up or `DISCARD` | Discard the selected card after drawing. |
| Online mode without a code | Create a new room and share its code. |
| Online mode with a code | Join the host’s room. |

## Run and validate

```bash
pnpm install
pnpm dev        # API server on :3000 + Expo (web on :8081, scan the QR for a phone)
pnpm android    # native Android build (needs the Android SDK)
```

```bash
pnpm check      # TypeScript
pnpm lint
pnpm test       # game engine, online rooms and auth tests
```

On the very first `expo export` / web start after a fresh install, NativeWind can
fail with `Failed to get the SHA-1 for ... react-native-css-interop/.cache/web.css`.
It generates that file during the first bundle; run the command again.

## Configuration

Copy `.env.example` to `.env`. Bot play and online rooms need no configuration;
the database, sign-in (Manus OAuth) and Forge APIs are enabled by the variables
listed there. `.env` is git-ignored: never commit real values.

To play online from a phone, set `EXPO_PUBLIC_API_BASE_URL` to an address the
phone can reach, e.g. `http://192.168.1.20:3000`.

## Online multiplayer architecture

The server exposes `janinRooms.create`, `join`, `snapshot`, and `action` procedures. The same shared game engine validates both local and online actions, so a client cannot draw or discard outside its turn.

- **Seats are authenticated.** Creating or joining a room returns a secret seat token; `snapshot` and `action` require it, and the server derives the seat from the token rather than trusting the client.
- **Hidden information stays hidden.** Each seat receives only its own hand; the deck order and the opponent's hand are sent as face-down placeholders (counts only).
- **Deals are unpredictable.** Online games are shuffled from a cryptographically random server-side seed.
- **Rooms expire** after two idle hours.

The transport uses short polling and in-memory rooms; it works while users are connected to the same server instance.

> For a production public multiplayer release, replace the in-memory room map with a persistent authoritative room service (for example, a stateful Node/WebSocket deployment backed by Redis or Postgres). That service should authenticate players, persist room state, reconnect sessions, rate-limit requests, and provide horizontal scaling. A serverless instance cannot safely guarantee a shared in-memory room across multiple replicas.

## Source

<https://github.com/Apurba94/card-game-created-by-janin>

No credentials or release signing keys are included in this repository. The
Android `debug.keystore` is the standard public debug key, used only for
development builds.

## Credits

Created by **Janin A Apurba**. Released under the [MIT License](LICENSE).
