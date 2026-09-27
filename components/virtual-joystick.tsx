import { PanResponder, StyleSheet, Text, View } from "react-native";
import { useMemo, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right";
export function VirtualJoystick({ onDirection }: { onDirection: (direction: Direction) => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const emitted = useRef<Direction | null>(null);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      setOffset({ x: Math.max(-26, Math.min(26, gesture.dx)), y: Math.max(-26, Math.min(26, gesture.dy)) });
      if (Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) < 22) return;
      const direction: Direction = Math.abs(gesture.dx) > Math.abs(gesture.dy) ? gesture.dx > 0 ? "right" : "left" : gesture.dy > 0 ? "down" : "up";
      if (emitted.current !== direction) { emitted.current = direction; onDirection(direction); }
    },
    onPanResponderRelease: () => { setOffset({ x: 0, y: 0 }); emitted.current = null; },
    onPanResponderTerminate: () => { setOffset({ x: 0, y: 0 }); emitted.current = null; },
  }), [onDirection]);
  return <View style={styles.wrap} {...responder.panHandlers} accessibilityLabel="Card navigation joystick"><View style={[styles.stick, { transform: [{ translateX: offset.x }, { translateY: offset.y }] }]}><Text style={styles.mark}>◆</Text></View><Text style={styles.caption}>SWIPE</Text></View>;
}
const styles = StyleSheet.create({
  wrap: { width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(109,74,255,0.22)", borderWidth: 1, borderColor: "rgba(255,248,235,0.24)", justifyContent: "center", alignItems: "center" },
  stick: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#6D4AFF", justifyContent: "center", alignItems: "center" }, mark: { color: "#FFF8EB", fontSize: 18 }, caption: { position: "absolute", bottom: 7, fontSize: 8, fontWeight: "800", letterSpacing: 1.4, color: "#BEB5FF" },
});

