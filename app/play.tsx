import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { VirtualJoystick } from "@/components/virtual-joystick";
import { createGame, discardCard, drawCard, evaluatePattern, nextRound, randomSeed, takeBotTurn, type Card, type GameState } from "@/lib/janin/game";
import { cardHaptics } from "@/lib/janin/haptics";
import { trpc } from "@/lib/trpc";

const glyph = { sun: "✦", moon: "◐", wave: "≈", leaf: "♧" };
const tint = { sun: "#FFB703", moon: "#B9B7FF", wave: "#55C7FF", leaf: "#48D6A7" };

function PlayingCard({ card, selected, hidden, onPress }: { card?: Card; selected?: boolean; hidden?: boolean; onPress?: () => void }) {
  if (hidden) return <View style={[styles.card, styles.backCard]}><Text style={styles.backMark}>✦</Text></View>;
  if (!card) return <View style={[styles.card, styles.emptyCard]} />;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, selected && styles.selectedCard, pressed && styles.pressed]}>
    <Text style={[styles.cardValue, { color: tint[card.suit] }]}>{card.value}</Text><Text style={[styles.suit, { color: tint[card.suit] }]}>{glyph[card.suit]}</Text>
  </Pressable>;
}

export default function PlayScreen() {
  const params = useLocalSearchParams<{ roomCode?: string; seat?: "human" | "bot"; token?: string }>();
  const roomCode = typeof params.roomCode === "string" ? params.roomCode : "";
  const online = Boolean(roomCode);
  const seat = params.seat === "bot" ? "bot" : "human";
  const token = typeof params.token === "string" ? params.token : "";
  // Start from the fixed deal so the pre-rendered web page and the first client
  // render match, then shuffle a fresh bot game once mounted.
  const [game, setGame] = useState<GameState>(() => createGame());
  useEffect(() => { if (!online) setGame(createGame(undefined, randomSeed())); }, [online]);
  const [selected, setSelected] = useState(0);
  const room = trpc.janinRooms.snapshot.useQuery({ roomCode, token }, { enabled: online, refetchInterval: online ? 800 : false });
  const roomAction = trpc.janinRooms.action.useMutation({ onSuccess: (snapshot) => { if (snapshot.game) setGame(snapshot.game); } });
  const human = game.players.find((player) => player.id === (online ? seat : "human"))!;
  const bot = game.players.find((player) => player.id !== (online ? seat : "human"))!;
  const pattern = useMemo(() => evaluatePattern(human.hand), [human.hand]);
  // Online, both seats share one game.message; phrase the prompt for this seat.
  const myTurn = game.activePlayer === human.id;
  const message = !online || game.status !== "playing" ? game.message
    : myTurn ? game.hasDrawn ? "Choose a card to discard." : "Your turn — draw from the deck or discard pile."
    : `Waiting for ${bot.name}…`;

  useEffect(() => {
    if (online || game.activePlayer !== "bot" || game.status !== "playing") return;
    const wait = setTimeout(() => setGame((current) => takeBotTurn(current)), 800);
    return () => clearTimeout(wait);
  }, [game.activePlayer, game.status, online]);
  useEffect(() => { if (room.data?.game) setGame(room.data.game); }, [room.data?.game]);
  useEffect(() => setSelected((current) => Math.min(current, Math.max(0, human.hand.length - 1))), [human.hand.length]);
  useEffect(() => { if (game.status === "round-over") cardHaptics.success(); }, [game.status]);

  const draw = useCallback((source: "deck" | "discard") => {
    cardHaptics.light();
    if (online) { roomAction.mutate({ roomCode, token, type: "draw", source }); return; }
    setGame((current) => drawCard(current, source));
  }, [online, roomAction, roomCode, token]);
  const discard = useCallback(() => {
    const card = human.hand[selected];
    if (!card) return;
    cardHaptics.medium();
    if (online) { roomAction.mutate({ roomCode, token, type: "discard", cardId: card.id }); return; }
    setGame((current) => discardCard(current, card.id));
  }, [human.hand, online, roomAction, roomCode, selected, token]);
  const navigate = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (direction === "left") { cardHaptics.select(); setSelected((index) => Math.max(0, index - 1)); }
    if (direction === "right") { cardHaptics.select(); setSelected((index) => Math.min(human.hand.length - 1, index + 1)); }
    if (direction === "down") draw("deck");
    if (direction === "up") discard();
  }, [discard, draw, human.hand.length]);

  if (online && !room.data?.game) return <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.safe}><View style={styles.waiting}><Text style={styles.kicker}>ONLINE ROOM · {roomCode}</Text><Text style={styles.waitingTitle}>TABLE RESERVED</Text><Text style={styles.waitingText}>{room.isError ? "This room is unavailable. Return to the lobby and check the code." : "Waiting for another player to join. This screen refreshes automatically."}</Text><Pressable onPress={() => router.back()} style={styles.next}><Text style={styles.nextText}>RETURN TO LOBBY</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.safe}><View style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.kicker}>TABLE 01 · {online ? "ONLINE ROOM" : "BOT MATCH"}</Text><Text style={styles.title}>JANIN’S FIVE</Text></View><View style={styles.round}><Text style={styles.roundText}>R{game.round}</Text></View></View>
    <View style={styles.playerPanel}><View><Text style={styles.playerName}>{bot.name.toUpperCase()}</Text><Text style={styles.playerMeta}>{game.activePlayer === bot.id ? online ? "PLAYING…" : "THINKING…" : "READY"}</Text></View><Score value={bot.score} /></View>
    <View style={styles.botHand}>{Array.from({ length: 5 }).map((_, index) => <PlayingCard key={index} hidden />)}</View>
    <View style={styles.table}><Text style={styles.message}>{message}</Text><View style={styles.piles}>
      <Pressable onPress={() => draw("deck")} style={({ pressed }) => [styles.deck, pressed && styles.pressed]}><Text style={styles.deckStar}>✦</Text><Text style={styles.pileLabel}>DRAW · {game.deck.length}</Text></Pressable>
      <Pressable onPress={() => draw("discard")} style={({ pressed }) => [styles.discardPile, pressed && styles.pressed]}><PlayingCard card={game.discard.at(-1)} /><Text style={styles.takeLabel}>TAKE</Text></Pressable>
    </View><View style={styles.pattern}><Text style={styles.patternText}>{pattern.name.toUpperCase()} · {pattern.score}</Text></View></View>
    <View style={styles.playerPanel}><View><Text style={styles.playerName}>YOU · {human.name.toUpperCase()}</Text><Text style={styles.playerMeta}>{game.hasDrawn ? "SELECT A CARD TO DISCARD" : "DRAW A CARD"}</Text></View><Score value={human.score} /></View>
    <View style={styles.hand}>{human.hand.map((card, index) => <PlayingCard key={card.id} card={card} selected={index === selected} onPress={() => setSelected(index)} />)}</View>
    {game.status === "round-over" ? <View style={styles.results}><Text style={styles.resultText}>{game.message}</Text><Pressable onPress={() => online ? router.back() : setGame((current) => nextRound(current))} style={styles.next}><Text style={styles.nextText}>{online ? "RETURN TO LOBBY" : "NEXT ROUND"}</Text></Pressable></View> : <View style={styles.controls}><VirtualJoystick onDirection={navigate} /><View style={styles.hint}><Text style={styles.hintTitle}>JOYSTICK</Text><Text style={styles.hintText}>← → select{`\n`}↓ draw · ↑ discard</Text></View><Pressable disabled={!game.hasDrawn || game.activePlayer !== (online ? seat : "human") || roomAction.isPending} onPress={discard} style={({ pressed }) => [styles.discardButton, (!game.hasDrawn || game.activePlayer !== (online ? seat : "human") || roomAction.isPending) && styles.disabled, pressed && styles.pressed]}><Text style={styles.discardText}>DISCARD</Text><Text style={styles.discardSub}>PLAY SELECTED</Text></Pressable></View>}
  </View></ScreenContainer>;
}

function Score({ value }: { value: number }) { return <View style={styles.score}><Text style={styles.scoreValue}>{value}</Text><Text style={styles.scoreLabel}>PTS</Text></View>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: "#172033" }, page: { flex: 1, paddingHorizontal: 16, backgroundColor: "#172033" }, header: { height: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#27304A", justifyContent: "center", alignItems: "center" }, backText: { color: "#FFF8EB", fontSize: 32, marginTop: -4 }, kicker: { color: "#BEB5FF", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, title: { color: "#FFF8EB", fontSize: 19, fontWeight: "900", letterSpacing: 1 }, round: { backgroundColor: "#FFD166", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }, roundText: { color: "#172033", fontSize: 12, fontWeight: "900" },
  playerPanel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 11, backgroundColor: "#202A41", borderRadius: 15, borderWidth: 1, borderColor: "#39445F" }, playerName: { color: "#FFF8EB", fontSize: 12, fontWeight: "900", letterSpacing: .7 }, playerMeta: { color: "#9AA5C6", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginTop: 3 }, score: { alignItems: "center", minWidth: 38 }, scoreValue: { color: "#48D6A7", fontSize: 20, fontWeight: "900" }, scoreLabel: { color: "#9AA5C6", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  botHand: { height: 87, flexDirection: "row", justifyContent: "center", alignItems: "center" }, card: { width: 52, height: 73, borderRadius: 10, backgroundColor: "#FFF8EB", borderWidth: 1, borderColor: "#E5D8C6", padding: 7, justifyContent: "space-between", shadowColor: "#000", shadowOpacity: .25, shadowRadius: 5, elevation: 3 }, backCard: { marginHorizontal: -9, backgroundColor: "#6D4AFF", borderColor: "#BEB5FF", justifyContent: "center", alignItems: "center" }, backMark: { color: "#FFF8EB", fontSize: 24 }, emptyCard: { opacity: .25 }, cardValue: { fontSize: 18, fontWeight: "900" }, suit: { alignSelf: "flex-end", fontSize: 19, fontWeight: "900" }, selectedCard: { transform: [{ translateY: -11 }], borderColor: "#FFD166", borderWidth: 3 }, pressed: { opacity: .76, transform: [{ scale: .97 }] },
  table: { flex: 1, minHeight: 172, borderRadius: 23, backgroundColor: "#27304A", borderWidth: 1, borderColor: "#44516F", padding: 14, alignItems: "center", justifyContent: "space-between" }, message: { color: "#D5D8E8", textAlign: "center", fontSize: 12, lineHeight: 17 }, piles: { flexDirection: "row", alignItems: "center", gap: 26 }, deck: { width: 74, height: 96, borderRadius: 14, backgroundColor: "#6D4AFF", borderWidth: 2, borderColor: "#BEB5FF", justifyContent: "center", alignItems: "center" }, deckStar: { color: "#FFF8EB", fontSize: 28 }, pileLabel: { color: "#E4DFFF", fontSize: 8, fontWeight: "900", letterSpacing: .7, marginTop: 5 }, discardPile: { alignItems: "center" }, takeLabel: { color: "#BEB5FF", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginTop: 5 }, pattern: { backgroundColor: "rgba(72,214,167,.16)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }, patternText: { color: "#48D6A7", fontSize: 10, fontWeight: "900", letterSpacing: .55 },
  hand: { height: 91, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 5, paddingTop: 8 }, controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }, hint: { flex: 1, paddingHorizontal: 11 }, hintTitle: { color: "#FFD166", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, hintText: { color: "#9AA5C6", fontSize: 10, lineHeight: 14, marginTop: 3 }, discardButton: { width: 109, height: 72, borderRadius: 18, backgroundColor: "#FF6B6B", justifyContent: "center", alignItems: "center" }, disabled: { opacity: .4 }, discardText: { color: "#FFF8EB", fontSize: 12, fontWeight: "900", letterSpacing: .5 }, discardSub: { color: "#FFE1DE", fontSize: 7, marginTop: 4, fontWeight: "800", letterSpacing: .7 },
  results: { backgroundColor: "#6D4AFF", borderRadius: 18, padding: 12, marginBottom: 9 }, resultText: { color: "#FFF8EB", fontSize: 12, textAlign: "center", fontWeight: "700" }, next: { marginTop: 9, backgroundColor: "#FFD166", paddingVertical: 10, borderRadius: 12, alignItems: "center" }, nextText: { color: "#172033", fontSize: 12, fontWeight: "900", letterSpacing: .7 },
  waiting: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 36, backgroundColor: "#172033" }, waitingTitle: { color: "#FFF8EB", fontSize: 28, fontWeight: "900", letterSpacing: .7, marginTop: 8 }, waitingText: { color: "#B6BED3", textAlign: "center", lineHeight: 20, fontSize: 13, marginTop: 12 },
});
