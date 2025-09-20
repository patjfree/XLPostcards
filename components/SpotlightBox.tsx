import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";

export type SpotlightRect = { x: number; y: number; w: number; h: number };

type Props = {
  rect: SpotlightRect | null;          // {x,y,w,h} of the target
  visible: boolean;
  onDismiss?: () => void;
  tip?: string;                         // Optional tooltip text
};

export default function SpotlightBox({ rect, visible, onDismiss, tip }: Props) {
  if (!visible || !rect) return null;

  const pad = 8; // padding around the target
  const box = {
    left: rect.x - pad,
    top: rect.y - pad,
    width: rect.w + pad * 2,
    height: rect.h + pad * 2,
  };

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
      {/* Dim layer */}
      <View style={styles.dim} pointerEvents="none" />

      {/* Highlight box */}
      <View
        pointerEvents="none"
        style={[
          styles.box,
          {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          },
        ]}
      />

      {/* Simple tooltip under the box */}
      {tip ? (
        <View style={[styles.tooltip, { left: box.left, top: box.top + box.height + 10, width: Math.max(220, box.width) }]}>
          <Text style={styles.tooltipText}>{tip}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  box: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  tooltip: {
    position: "absolute",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "white",
  },
  tooltipText: { color: "#111", fontSize: 15 },
});