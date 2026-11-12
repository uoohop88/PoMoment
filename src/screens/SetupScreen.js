import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { font } from "../theme/typography";

export default function SetupScreen({ navigation, route }) {
  const { preset, focusMin: initFocus, restMin: initRest, isCustom } = route.params;

  const [subject, setSubject] = useState("");
  const [focusMin, setFocusMin] = useState(String(initFocus));
  const [restMin, setRestMin] = useState(String(initRest));

  const parsed = useMemo(() => {
    const f = Number(focusMin);
    const r = Number(restMin);
    return {
      focusMin: Number.isFinite(f) ? f : NaN,
      restMin: Number.isFinite(r) ? r : NaN,
    };
  }, [focusMin, restMin]);

  const start = () => {
    if (!subject.trim()) {
      Alert.alert("과목 입력", "공부할 과목명을 입력해주세요.");
      return;
    }
    if (!Number.isFinite(parsed.focusMin) || parsed.focusMin <= 0 || parsed.focusMin > 240) {
      Alert.alert("시간 설정", "집중 시간(분)을 1~240 범위로 입력해주세요.");
      return;
    }
    if (!Number.isFinite(parsed.restMin) || parsed.restMin < 0 || parsed.restMin > 120) {
      Alert.alert("시간 설정", "휴식 시간(분)을 0~120 범위로 입력해주세요.");
      return;
    }

    const params = {
    preset,
    subject: subject.trim(),
    focusMin: parsed.focusMin,
    restMin: parsed.restMin,
  };

  // RootStack에 있는 Timer로 확실히 이동
  const rootNav = navigation.getParent()?.getParent?.() ?? navigation;
  rootNav.navigate("Timer", params);
  };

  return (
    <View style={styles.container}>

      <Text style={styles.label}>공부 과목</Text>
      <TextInput
        placeholder="예) Mobile App, 알고리즘, 영어"
        placeholderTextColor={colors.textMuted}
        value={subject}
        onChangeText={setSubject}
        style={styles.input}
      />

      <View style={{ height: 18 }} />

      <Text style={styles.label}>시간 설정</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>집중(분)</Text>
          <TextInput
            value={focusMin}
            onChangeText={setFocusMin}
            keyboardType="number-pad"
            editable={!!isCustom}
            style={[styles.input, !isCustom && styles.readonly]}
          />
        </View>

        <View style={{ width: 12 }} />

        <View style={{ flex: 1 }}>
          <Text style={styles.small}>휴식(분)</Text>
          <TextInput
            value={restMin}
            onChangeText={setRestMin}
            keyboardType="number-pad"
            editable={!!isCustom}
            style={[styles.input, !isCustom && styles.readonly]}
          />
        </View>
      </View>

      <View style={{ height: 22 }} />

      <PrimaryButton title="시작" onPress={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#FFFFFF" },

  label: {
    fontSize: font.body,
    fontWeight: "900",
    marginBottom: 10,
    color: colors.text,
  },

  small: {
    fontSize: font.caption,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: font.body,
    fontWeight: "700",
    backgroundColor: "#FFFFFF",
    color: colors.text,
  },

  readonly: {
    backgroundColor: colors.cardAlt,
    color: colors.textMuted,
  },

  row: { flexDirection: "row" },
});
