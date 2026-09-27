import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MULTIPLAYER_NOTE } from "@/lib/janin/transport";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const [mode, setMode] = useState<"local" | "online">("local");
  const [name, setName] = useState("Janin");
  const [roomCode, setRoomCode] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const createRoom = trpc.janinRooms.create.useMutation();
  const joinRoom = trpc.janinRooms.join.useMutation();
  const onlinePending = createRoom.isPending || joinRoom.isPending;
  const startTable = async () => {
    if (mode === "local") { router.push("/play" as never); return; }
    try {
      const room = roomCode.trim()
        ? await joinRoom.mutateAsync({ roomCode: roomCode.trim().toUpperCase(), playerName: name || "Guest" })
        : await createRoom.mutateAsync({ playerName: name || "Host" });
      router.push({ pathname: "/play", params: { roomCode: room.roomCode, seat: room.seat, token: room.token } } as never);
    } catch {
      // The visual protocol note remains available; failed codes do not navigate away from the lobby.
    }
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} style={styles.safe}><View style={styles.page}>
    <View style={styles.top}><Text style={styles.eyebrow}>A SOCIAL TABLETOP ORIGINAL</Text><Text style={styles.title}>CARD GAME</Text><Text style={styles.byline}>CREATED BY JANIN</Text></View>
    <View style={styles.hero}><View style={[styles.heroCard, styles.back]}><Text style={styles.heroMark}>✦</Text></View><View style={[styles.heroCard, styles.front]}><Text style={styles.heroNumber}>5</Text><Text style={styles.heroSuit}>♧</Text></View><Text style={styles.spark}>✦</Text></View>
    <View style={styles.modeRow}><Pressable onPress={() => setMode("local")} style={[styles.mode, mode === "local" && styles.active]}><Text style={[styles.modeText, mode === "local" && styles.activeText]}>BOT TABLE</Text></Pressable><Pressable onPress={() => setMode("online")} style={[styles.mode, mode === "online" && styles.active]}><Text style={[styles.modeText, mode === "online" && styles.activeText]}>ONLINE ROOM</Text></Pressable></View>
    <View style={styles.panel}><Text style={styles.label}>YOUR TABLE NAME</Text><TextInput value={name} onChangeText={setName} maxLength={18} returnKeyType="done" style={styles.input} placeholder="Janin" placeholderTextColor="#7C86A5" />
      {mode === "online" ? <><Text style={[styles.label, styles.roomLabel]}>ROOM CODE</Text><TextInput value={roomCode} onChangeText={setRoomCode} autoCapitalize="characters" maxLength={8} returnKeyType="done" style={styles.input} placeholder="ENTER CODE" placeholderTextColor="#7C86A5" /><Text style={styles.protocol}>{MULTIPLAYER_NOTE}</Text></> : <Text style={styles.helper}>Play a complete five-card round against Mira. Tap a card, or use the smooth joystick on the table to choose it.</Text>}
    </View>
    <Pressable onPress={() => void startTable()} disabled={onlinePending} style={({ pressed }) => [styles.primary, onlinePending && styles.disabled, pressed && styles.pressed]}><Text style={styles.primaryText}>{onlinePending ? "CONNECTING…" : mode === "online" ? roomCode.trim() ? "JOIN ONLINE ROOM" : "CREATE ONLINE ROOM" : "START BOT TABLE"}  →</Text></Pressable>
    <View style={styles.footer}><Text style={styles.footerText}>JANIN’S FIVE · 2–4 PLAYERS · QUICK ROUNDS</Text><Pressable onPress={() => setSettingsOpen((current) => !current)}><Text style={styles.settings}>{settingsOpen ? "HAPTICS ON · JOYSTICK MEDIUM" : "SETTINGS"}</Text></Pressable></View>
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#172033" }, page: { flex: 1, paddingHorizontal: 22, backgroundColor: "#172033", justifyContent: "space-between", paddingVertical: 20 },
  top: { alignItems: "center", paddingTop: 4 }, eyebrow: { color: "#48D6A7", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 }, title: { color: "#FFF8EB", fontSize: 39, lineHeight: 44, fontWeight: "900", letterSpacing: -1, marginTop: 4 }, byline: { color: "#FFD166", fontSize: 12, fontWeight: "900", letterSpacing: 2.3, marginTop: 2 },
  hero: { height: 180, alignItems: "center", justifyContent: "center" }, heroCard: { position: "absolute", width: 105, height: 145, borderRadius: 18, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: .35, shadowRadius: 12, elevation: 8 }, back: { backgroundColor: "#6D4AFF", borderWidth: 2, borderColor: "#BEB5FF", transform: [{ rotate: "-12deg" }, { translateX: -38 }] }, front: { backgroundColor: "#FFF8EB", borderWidth: 1, borderColor: "#E5D8C6", transform: [{ rotate: "11deg" }, { translateX: 36 }] }, heroMark: { color: "#FFF8EB", fontSize: 46 }, heroNumber: { position: "absolute", top: 17, left: 17, color: "#FF6B6B", fontSize: 30, fontWeight: "900" }, heroSuit: { color: "#48D6A7", fontSize: 48 }, spark: { color: "#FFD166", fontSize: 28, transform: [{ translateY: -68 }, { translateX: 89 }] },
  modeRow: { flexDirection: "row", gap: 8 }, mode: { flex: 1, paddingVertical: 12, borderRadius: 13, alignItems: "center", backgroundColor: "#202A41", borderWidth: 1, borderColor: "#35405C" }, active: { backgroundColor: "#6D4AFF", borderColor: "#BEB5FF" }, modeText: { color: "#9AA5C6", fontWeight: "900", fontSize: 10, letterSpacing: .7 }, activeText: { color: "#FFF8EB" },
  panel: { borderRadius: 20, backgroundColor: "#202A41", borderWidth: 1, borderColor: "#35405C", padding: 16, marginTop: 12 }, label: { color: "#BEB5FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.15 }, roomLabel: { marginTop: 14 }, input: { color: "#FFF8EB", fontSize: 16, fontWeight: "800", borderBottomWidth: 1, borderBottomColor: "#485574", paddingVertical: 8, marginTop: 3 }, helper: { color: "#B6BED3", fontSize: 12, lineHeight: 17, marginTop: 13 }, protocol: { color: "#FFD166", fontSize: 11, lineHeight: 15, marginTop: 12 },
  primary: { backgroundColor: "#48D6A7", borderRadius: 17, paddingVertical: 18, alignItems: "center", marginTop: 13, shadowColor: "#000", shadowOpacity: .3, shadowRadius: 8, elevation: 6 }, primaryText: { color: "#172033", fontSize: 13, fontWeight: "900", letterSpacing: .8 }, disabled: { opacity: .55 }, pressed: { opacity: .82, transform: [{ scale: .98 }] },
  footer: { alignItems: "center", gap: 10 }, footerText: { color: "#717E9B", fontSize: 8, fontWeight: "900", letterSpacing: .95 }, settings: { color: "#BEB5FF", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
});
