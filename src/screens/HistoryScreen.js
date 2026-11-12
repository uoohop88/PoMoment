import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Pressable, Modal } from "react-native";
import { Calendar } from "react-native-calendars";

import { loadSessions, clearSessions, saveSession } from "../storage/sessionStore";
import { formatMMSS } from "../utils/time";
import { colors } from "../theme/colors";
import { font } from "../theme/typography";

export default function HistoryScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // 선택 삭제
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const todayKey = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const refresh = useCallback(async () => {
    const data = await loadSessions();
    setSessions(data);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", refresh);
    return unsub;
  }, [navigation, refresh]);

  // 날짜 바뀌면 선택 해제 + 모드 종료
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedDate]);

  // 선택한 날짜로 필터링
  const filtered = useMemo(() => sessions.filter((s) => s.date === selectedDate), [sessions, selectedDate]);

  // 요약
  const summary = useMemo(() => {
    const totalSeconds = filtered.reduce((acc, s) => acc + (s.focusedSeconds || 0), 0);
    return { count: filtered.length, totalSeconds };
  }, [filtered]);

  const onClearAll = useCallback(() => {
    Alert.alert("전체 삭제", "저장된 모든 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await clearSessions();
          await refresh();
          setSelectedIds(new Set());
          setSelectMode(false);
        },
      },
    ]);
  }, [refresh]);

  const rewriteAllSessions = useCallback(async (nextSessions) => {
    await clearSessions();
    for (const s of nextSessions) {
      await saveSession(s);
    }
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startSelectMode = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set());
  }, []);

  const endSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) {
      Alert.alert("선택 없음", "삭제할 항목을 먼저 선택해주세요.");
      return;
    }

    Alert.alert("선택 삭제", `선택한 ${count}개 기록을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const nextAll = sessions.filter((s) => !selectedIds.has(s.id));
          await rewriteAllSessions(nextAll);
          await refresh();
          endSelectMode();
        },
      },
    ]);
  }, [selectedIds, sessions, rewriteAllSessions, refresh, endSelectMode]);

  // 헤더 우측: 선택모드면 "취소/삭제"로 보임  /   선택모드 아니면 점 3개로 보임
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: { paddingRight: 12 },
      headerRight: () => {
        if (selectMode) {
          return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable onPress={endSelectMode} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>취소</Text>
              </Pressable>

              <Pressable
                onPress={deleteSelected}
                disabled={selectedIds.size === 0}
                style={[
                  styles.headerBtn,
                  styles.headerBtnDanger,
                  selectedIds.size === 0 ? { opacity: 0.4 } : null,
                ]}
              >
                <Text style={[styles.headerBtnText, styles.headerBtnTextDanger]}>
                  삭제({selectedIds.size})
                </Text>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable onPress={() => setMenuOpen(true)} style={{ paddingHorizontal: 20, paddingVertical: 6 }}>
            <Text style={{ fontSize: 40, color: colors.text }}>⋮</Text>
          </Pressable>
        );
      },
    });
  }, [navigation, selectMode, selectedIds, deleteSelected, endSelectMode]);

  const markedDates = useMemo(() => {
    return { [selectedDate]: { selected: true, selectedColor: colors.primary } };
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.h1}>{selectedDate}</Text>
        <Pressable onPress={() => setShowCalendar((v) => !v)} style={styles.calendarBtn}>
          <Text style={styles.calendarBtnText}>{showCalendar ? "캘린더 닫기" : "캘린더 열기"}</Text>
        </Pressable>
      </View>

      {showCalendar && (
        <View style={styles.calendarWrap}>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
            }}
            markedDates={markedDates}
            theme={{
              todayTextColor: colors.primaryDark,
              arrowColor: colors.primary,
              textSectionTitleColor: colors.textMuted,
              monthTextColor: colors.text,
              dayTextColor: colors.text,
              textDisabledColor: colors.border,
            }}
          />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.h2}>오늘의 공부</Text>
        <Text style={styles.rowText}>세션 수: {summary.count}</Text>
        <Text style={styles.rowText}>총 집중시간: {formatMMSS(summary.totalSeconds)}</Text>
      </View>

      <Text style={[styles.h2, { marginTop: 14 }]}>세션 기록</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>이 날짜에는 저장된 세션이 없습니다.</Text>}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);

          return (
            <Pressable
              onPress={() => {
                if (!selectMode) return;
                toggleSelect(item.id);
              }}
              onLongPress={() => {
                // 길게 누르면 선택모드 진입 + 해당 항목 선택
                if (!selectMode) {
                  setSelectMode(true);
                  setSelectedIds(new Set([item.id]));
                } else {
                  toggleSelect(item.id);
                }
              }}
              style={[styles.item, isSelected ? styles.itemSelected : null]}
            >
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.subject}</Text>
                  <Text style={styles.itemSub}>
                    {item.date} · 집중 {formatMMSS(item.focusedSeconds || 0)}
                  </Text>
                </View>

                {selectMode && (
                  <View style={[styles.check, isSelected ? styles.checkOn : styles.checkOff]}>
                    <Text style={[styles.checkText, isSelected ? styles.checkTextOn : styles.checkTextOff]}>
                      {isSelected ? "✓" : ""}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* 점 3개 메뉴: "선택 삭제"만 */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>Menu</Text>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                startSelectMode();
              }}
            >
              <Text style={styles.menuText}>선택 삭제</Text>
            </Pressable>

            {/* 원하면 전체 삭제 남겨도 됨 */}
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onClearAll();
              }}
            >
              <Text style={[styles.menuText, { color: colors.danger }]}>기록 전체 삭제</Text>
            </Pressable>

            <Pressable style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setMenuOpen(false)}>
              <Text style={[styles.menuText, { color: colors.textMuted }]}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#FFFFFF" },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  h1: { fontSize: font.h1, fontWeight: "800", color: colors.text },

  calendarBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarBtnText: { fontSize: font.caption, fontWeight: "800", color: colors.text },

  calendarWrap: { marginTop: 12, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.border },

  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h2: { fontSize: font.h2, fontWeight: "800", marginBottom: 8, color: colors.text },
  rowText: { fontSize: font.body, color: colors.text, marginBottom: 4 },

  item: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint ?? "#FFF0EE",
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemTitle: { fontSize: font.body, fontWeight: "900", color: colors.text },
  itemSub: { fontSize: font.caption, color: colors.textMuted, marginTop: 4 },
  empty: { fontSize: font.caption, color: colors.textMuted, marginTop: 10 },

  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkOff: { backgroundColor: "#FFFFFF", borderColor: colors.border },
  checkText: { fontSize: 16, fontWeight: "900" },
  checkTextOn: { color: "#FFFFFF" },
  checkTextOff: { color: colors.textMuted },

  // 헤더 오른쪽 버튼(취소/삭제)
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  headerBtnDanger: {
    borderColor: colors.danger,
    backgroundColor: "#FFFFFF",
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.text,
  },
  headerBtnTextDanger: {
    color: colors.danger,
  },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", padding: 18 },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuTitle: { fontSize: font.h2, fontWeight: "900", color: colors.text, padding: 10 },
  menuItem: { paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { fontSize: font.body, fontWeight: "900", color: colors.text },
});
