import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function PrimaryButton({ title, onPress, disabled, variant = "primary" }) {
  const palette = getPalette(variant);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: disabled ? colors.neutralSoft : (pressed ? palette.pressed : palette.bg) },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{title}</Text>
    </Pressable>
  );
}

function getPalette(variant) {
  switch (variant) {
    case "accent":
      return { bg: colors.accent, pressed: colors.accentDark ?? colors.accent, text: colors.textOnPrimary };
    case "neutral":
      return { bg: colors.neutral, pressed: colors.neutralDark, text: colors.textOnNeutral };
    case "primary":
    default:
      return { bg: colors.primary, pressed: colors.primaryDark, text: colors.textOnPrimary };
  }
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 20,    // 버튼 높이
    paddingHorizontal: 15,  // 좌우 여백
    borderRadius: 25,   // 버튼 둥근 정도
    alignItems: "center",
  },
  text: { fontSize: 25, fontWeight: "600" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
