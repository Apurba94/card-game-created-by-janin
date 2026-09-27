import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const gameHaptics = {
  light: (enabled = true) => enabled && Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  hit: (enabled = true) => enabled && Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  warning: (enabled = true) => enabled && Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  success: (enabled = true) => enabled && Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
