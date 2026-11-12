import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  const goSetup = (preset) => {
    if (preset === "25_5") {
      navigation.navigate("Setup", { preset, focusMin: 25, restMin: 5, isCustom: false });
    } else if (preset === "50_10") {
      navigation.navigate("Setup", { preset, focusMin: 50, restMin: 10, isCustom: false });
    } else {
      navigation.navigate("Setup", { preset: "custom", focusMin: 25, restMin: 5, isCustom: true });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={require("../../assets/logo2.png")} style={styles.logo} resizeMode="contain" />

        <Text style={styles.sub}>프리셋 또는 Custom으로 세션을 시작하세요.</Text>

        <View style={styles.block}>
          <PrimaryButton variant="primaryDark" title="25 / 5 시작" onPress={() => goSetup("25_5")} />
          <View style={{ height: 10 }} />
          <PrimaryButton variant="primaryDark" title="50 / 10 시작" onPress={() => goSetup("50_10")} />
          <View style={{ height: 10 }} />
          <PrimaryButton variant="accent" title="Custom 설정" onPress={() => goSetup("custom")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" }, // 상단 SafeArea까지 흰색으로 덮음
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  sub: { fontSize: 16, color: colors.textMuted, marginBottom: 20, textAlign: "center" },
  block: { padding: 14, borderRadius: 25, marginBottom: 15, backgroundColor: colors.cardAlt },
  logo: { width: "100%", height: 280, marginBottom: 0, alignSelf: "center" },
});
