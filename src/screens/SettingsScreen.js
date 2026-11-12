import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, Pressable, Switch, KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import { colors } from "../theme/colors";
import { font } from "../theme/typography";
import { loadProfile, saveProfile } from "../storage/userStore";

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  // 프로필
  const [displayName, setDisplayName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // 공개 설정
  const [shareEnabled, setShareEnabled] = useState(false);

  // 알림 설정
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);


  const [savedSnap, setSavedSnap] = useState({
    displayName: "",
    statusMessage: "",
    shareEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [saving, setSaving] = useState(false);


  const isValidName = useMemo(() => displayName.trim().length >= 2, [displayName]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = await loadProfile();
    setDisplayName(p.displayName || "");
    setStatusMessage(p.statusMessage || "");
    setShareEnabled(!!p.shareEnabled);
    setSoundEnabled(p.soundEnabled !== undefined ? !!p.soundEnabled : true);
    setVibrationEnabled(p.vibrationEnabled !== undefined ? !!p.vibrationEnabled : true);


    setSavedSnap({
        displayName: p.displayName || "",
        statusMessage: p.statusMessage || "",
        shareEnabled: !!p.shareEnabled,
        soundEnabled: p.soundEnabled !== undefined ? !!p.soundEnabled : true,
        vibrationEnabled: p.vibrationEnabled !== undefined ? !!p.vibrationEnabled : true,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const onSave = async () => {
    if (!isValidName) {
      Alert.alert("이름 확인", "이름(닉네임)은 2글자 이상으로 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const next = {
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        shareEnabled,
        soundEnabled,
        vibrationEnabled,
      };

      await saveProfile(next);
      setSavedSnap(next);

      Alert.alert("저장 완료", "설정이 저장되었습니다.");
    } catch (e) {
      Alert.alert("저장 실패", "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleShare = async (next) => {
    setShareEnabled(next);
    try {
      const current = await loadProfile();
      await saveProfile({
        ...current,
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        shareEnabled: next,
      });
    } catch (e) {
      Alert.alert("저장 실패", "공개 설정 저장 중 문제가 발생했습니다.");
    }
  };

  const isDirty =
    displayName.trim() !== savedSnap.displayName.trim() ||
    statusMessage.trim() !== savedSnap.statusMessage.trim() ||
    shareEnabled !== savedSnap.shareEnabled ||
    soundEnabled !== savedSnap.soundEnabled ||
    vibrationEnabled !== savedSnap.vibrationEnabled;

  const canSave = !loading && !saving && isDirty && isValidName;


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.h2}>프로필</Text>

        <Text style={styles.label}>이름</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="예) 토마토"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
        />
        <Text style={styles.helper}>친구 화면에서 표시되는 이름입니다. (2글자 이상 입력)</Text>

        <View style={{ height: 12 }} />

        <Text style={styles.label}>상태 메시지 (선택)</Text>
        <TextInput
          value={statusMessage}
          onChangeText={setStatusMessage}
          placeholder="예) 오늘은 2시간 집중!"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { height: 54 }]}
          autoCorrect={false}
        />
      </View>

      <View style={{ height: 14 }} />

      <View style={styles.card}>
        <Text style={styles.h2}>공개 설정</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>친구에게 기록 공개</Text>
            <Text style={styles.rowDesc}>켜면 친구에게 내 공부 기록을 공유할 수 있습니다.</Text>
          </View>

          <Switch
            value={shareEnabled}
            onValueChange={setShareEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={"#FFFFFF"}
          />
        </View>
      </View>

      <View style={{ height: 14 }} />

      {/* 알림 설정 카드: 공개 설정 아래, 저장 버튼 위에 넣기 */}
      <View style={styles.card}>
        <Text style={styles.h2}>알림</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>전환 알림 소리</Text>
            <Text style={styles.rowDesc}>FOCUS/REST 전환 시 소리가 울립니다.</Text>
          </View>

          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={"#FFFFFF"}
          />
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>전환 알림 진동</Text>
            <Text style={styles.rowDesc}>FOCUS/REST 전환 시 진동이 울립니다.</Text>
          </View>

          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={"#FFFFFF"}
          />
        </View>
      </View>

      <View style={{ height: 14 }} />


      <Pressable
        onPress={onSave}
        disabled={!canSave}
        style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            pressed && canSave && { opacity: 0.9 },
        ]}
      >
        <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {saving ? "저장 중..." : isDirty ? "저장" : "저장"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#FFFFFF" },
  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: font.h2, fontWeight: "900", color: colors.text, marginBottom: 10 },
  label: { fontSize: font.caption, fontWeight: "900", color: colors.text, marginBottom: 8 },
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
  helper: { marginTop: 8, fontSize: font.caption, fontWeight: "700", color: colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: font.body, fontWeight: "900", color: colors.text },
  rowDesc: { marginTop: 6, fontSize: font.caption, fontWeight: "700", color: colors.textMuted, lineHeight: 20 },
  saveBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    backgroundColor: colors.border, // 흐린 회색 느낌
  },
  saveTextDisabled: {
    color: "#FFFFFF",
    opacity: 0.9,
  },
  saveText: { fontSize: font.button, fontWeight: "900", color: "#FFFFFF" },
});