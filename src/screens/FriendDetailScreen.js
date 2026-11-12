import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Pressable, ActivityIndicator } from "react-native";

import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

import { colors } from "../theme/colors";
import { font } from "../theme/typography";

function formatMinutes(seconds) {
  const sec = typeof seconds === "number" ? seconds : 0;
  return Math.round(sec / 60);
}

function formatHoursMinutes(seconds) {
  const totalMin = formatMinutes(seconds);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}분`;
  if (m <= 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function FriendDetailScreen({ route }) {
  const { friendUid, friendPublicId } = route.params;

  const [loading, setLoading] = useState(true);

  // 공개 프로필
  const [profile, setProfile] = useState({ displayName: "", statusMessage: "" });

  // 이번 주 요약 (public/summary)
  const [summary, setSummary] = useState(null);

  // 요약만 막혔는지 확인(shareEnabled=false 등)
  const [summaryBlocked, setSummaryBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSummaryBlocked(false);

    try {
      // 공개 프로필(users/{friendUid}/public/profile) 읽기 (shareEnabled 상관 없음)
      const pref = doc(db, "users", friendUid, "public", "profile");
      const psnap = await getDoc(pref);

      if (psnap.exists()) {
        const p = psnap.data() || {};
        setProfile({
          displayName: typeof p.displayName === "string" ? p.displayName : "",
          statusMessage: typeof p.statusMessage === "string" ? p.statusMessage : "",
        });
      } else {
        // 프로필 문서가 아직 없는 경우(상대가 아직 저장/초기화 전)
        setProfile({ displayName: "", statusMessage: "" });
      }

      // 이번 주 요약(users/{friendUid}/public/summary) 읽기
      try {
        const sumRef = doc(db, "users", friendUid, "public", "summary");
        const sumSnap = await getDoc(sumRef);

        if (!sumSnap.exists()) {
          setSummary(null);
        } else {
          setSummary(sumSnap.data());
        }
      } catch (e) {
        const msg = String(e?.message || "").toLowerCase();
        if (msg.includes("permission") || msg.includes("denied")) {
          setSummaryBlocked(true);
          setSummary(null);
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.warn("[FriendDetail] load failed:", e);
      Alert.alert("오류", "친구 정보를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [friendUid]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Array.isArray(summary?.days) ? summary.days : [];
  const totalSeconds = typeof summary?.totalSeconds7d === "number" ? summary.totalSeconds7d : 0;
  const totalSessions = typeof summary?.totalSessions7d === "number" ? summary.totalSessions7d : 0;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h2}>{profile.displayName?.trim() ? profile.displayName : "친구"}</Text>
        <Text style={styles.sub}>ID: {friendPublicId}</Text>

        <View style={{ height: 10 }} />

        <Text style={styles.label}>이름</Text>
        <Text style={styles.value}>{profile.displayName || "-"}</Text>

        <View style={{ height: 10 }} />

        <Text style={styles.label}>상태메시지</Text>
        <Text style={styles.value}>{profile.statusMessage || "-"}</Text>

        <View style={{ height: 12 }} />

        <Pressable onPress={load} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>새로고침</Text>
        </Pressable>
      </View>

      <View style={{ height: 14 }} />

      <Text style={styles.sectionTitle}>이번 주 요약</Text>

      {loading ? (
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : summaryBlocked ? (
        <Text style={styles.empty}>친구가 이번 주 기록을 비공개로 설정하였습니다.</Text>
      ) : !summary ? (
        <Text style={styles.empty}>아직 공개된 요약이 없습니다.</Text>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>총 집중 시간</Text>
              <Text style={styles.summaryValue}>{formatHoursMinutes(totalSeconds)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>총 세션 수</Text>
              <Text style={styles.summaryValue}>{totalSessions}회</Text>
            </View>

            {summary?.range?.from && summary?.range?.to ? (
              <Text style={styles.rangeText}>
                {summary.range.from} ~ {summary.range.to}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 10 }} />

          <FlatList
            data={days}
            keyExtractor={(item, idx) => String(item?.day || idx)}
            ListEmptyComponent={<Text style={styles.empty}>일자별 데이터가 없습니다.</Text>}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item?.day || "-"}</Text>
                  <Text style={styles.itemSub}>
                    {typeof item?.sessionCount === "number" ? `${item.sessionCount}회` : "-"}
                  </Text>
                </View>
                <Text style={styles.rightValue}>
                  {formatHoursMinutes(typeof item?.totalSeconds === "number" ? item.totalSeconds : 0)}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
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

  h2: { fontSize: font.h2, fontWeight: "900", color: colors.text },
  sub: { marginTop: 6, fontSize: font.caption, fontWeight: "700", color: colors.textMuted },

  label: { fontSize: font.caption, fontWeight: "900", color: colors.text, marginBottom: 6 },
  value: { fontSize: font.body, fontWeight: "800", color: colors.text },

  refreshBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  refreshText: { fontSize: font.caption, fontWeight: "900", color: colors.text },

  sectionTitle: { fontSize: font.h2, fontWeight: "900", color: colors.text, marginBottom: 10 },

  summaryCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel: { fontSize: font.caption, fontWeight: "900", color: colors.textMuted },
  summaryValue: { fontSize: font.body, fontWeight: "900", color: colors.text },
  rangeText: { marginTop: 6, fontSize: font.caption, fontWeight: "700", color: colors.textMuted },

  empty: { fontSize: font.caption, color: colors.textMuted, marginTop: 6 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  itemTitle: { fontSize: font.body, fontWeight: "900", color: colors.text },
  itemSub: { fontSize: font.caption, fontWeight: "700", color: colors.textMuted, marginTop: 4 },
  rightValue: { fontSize: font.body, fontWeight: "900", color: colors.text },
});
