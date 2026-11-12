import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Alert, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";

import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { font } from "../theme/typography";

import {
  addFriend,
  getOrCreateUserId,
  loadFriends,
  removeFriend,
  getAuthUid,
  updateFriendMeta,
} from "../storage/userStore";

export default function FriendsScreen({ navigation }) {
  const [myId, setMyId] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState("");

  const lookupUidByPublicId = async (publicId) => {
    const ref = doc(db, "publicIds", publicId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data()?.uid || null;
  };

  const fetchFriendDisplayName = async (friendUid) => {
    const pref = doc(db, "users", friendUid, "public", "profile");
    const psnap = await getDoc(pref);
    if (!psnap.exists()) return "";
    const dn = psnap.data()?.displayName;
    return typeof dn === "string" ? dn : "";
  };

  const refresh = useCallback(async () => {
    const id = await getOrCreateUserId();
    const list = await loadFriends();
    setMyId(id);
    setFriends(list);

    // friendUid/displayName 없는 기존 항목 보강
    try {
      for (const f of list) {
        if (!f.friendUid) {
          const uid = await lookupUidByPublicId(f.friendId);
          if (uid) await updateFriendMeta(f.friendId, { friendUid: uid });
        }
        if (!f.displayName) {
          const uid = f.friendUid || (await lookupUidByPublicId(f.friendId));
          if (uid) {
            const dn = await fetchFriendDisplayName(uid);
            if (dn) await updateFriendMeta(f.friendId, { displayName: dn, friendUid: uid });
          }
        }
      }
      setFriends(await loadFriends());
    } catch {}
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", refresh);
    return unsub;
  }, [navigation, refresh]);

  const copyMyId = async () => {
    if (!myId) return;
    await Clipboard.setStringAsync(myId);
    Alert.alert("복사 완료", "내 ID가 클립보드에 복사되었습니다.");
  };

  const onAdd = async () => {
    const id = (friendId || "").trim().toUpperCase();
    if (!id) return Alert.alert("입력 필요", "친구 ID를 입력해주세요.");
    if (id === myId) return Alert.alert("불가", "본인 ID는 추가할 수 없습니다.");

    let friendUid = null;
    try {
      friendUid = await lookupUidByPublicId(id);
      if (!friendUid) return Alert.alert("존재하지 않음", "해당 ID를 가진 사용자를 찾을 수 없습니다.");
    } catch {
      return Alert.alert("오류", "ID 조회 중 문제가 발생했습니다. 네트워크를 확인해주세요.");
    }

    const myUid = getAuthUid();
    if (myUid && friendUid === myUid) return Alert.alert("불가", "본인 ID는 추가할 수 없습니다.");

    // 클라우드 friends 문서 먼저 생성 -> iAddedFriend 조건 만족
    try {
      if (myUid) {
        await setDoc(
          doc(db, "users", myUid, "friends", friendUid),
          { friendUid, friendPublicId: id, createdAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch {
      // 로컬은 계속 진행(오프라인일 수 있음)
    }

    // public/profile에서 displayName 읽기 (shareEnabled 상관 없음)
    let displayName = "";
    try {
      displayName = await fetchFriendDisplayName(friendUid);
    } catch {
      displayName = "";
    }

    // 로컬 저장
    try {
      const next = await addFriend({ friendId: id, friendUid, displayName });
      setFriends(next);
      setFriendId("");
      Alert.alert("추가 완료", "친구가 목록에 추가되었습니다.");
    } catch (e) {
      if (String(e?.message) === "DUPLICATE") Alert.alert("중복", "이미 추가된 친구입니다.");
      else Alert.alert("오류", "친구 추가 중 문제가 발생했습니다.");
    }
  };

  const onRemove = (publicId) => {
    Alert.alert("친구 삭제", "이 친구를 목록에서 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const next = await removeFriend(publicId);
          setFriends(next);

          // 클라우드 삭제(best-effort)
          try {
            const myUid = getAuthUid();
            if (!myUid) return;
            const friendUid = await lookupUidByPublicId(publicId);
            if (!friendUid) return;
            await deleteDoc(doc(db, "users", myUid, "friends", friendUid));
          } catch {}
        },
      },
    ]);
  };

  const openFriend = async (item) => {
    const friendUid = item.friendUid || (await lookupUidByPublicId(item.friendId));
    if (!friendUid) return Alert.alert("없음", "친구 정보를 찾을 수 없습니다.");
    navigation.navigate("FriendDetail", { friendUid, friendPublicId: item.friendId });
  };

  const sorted = useMemo(
    () => [...friends].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || "")),
    [friends]
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h2}>내 ID</Text>
        <View style={styles.idRow}>
          <Text style={styles.idText}>{myId || "생성 중..."}</Text>
          <Pressable onPress={copyMyId} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>복사</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>친구에게 ID를 공유해보세요!</Text>
      </View>

      <View style={{ height: 14 }} />

      <View style={styles.card}>
        <Text style={styles.h2}>친구 추가</Text>

        <Text style={styles.label}>친구 ID</Text>
        <TextInput
          value={friendId}
          onChangeText={setFriendId}
          placeholder="예) PM-AB12CD34"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="characters"
        />

        <View style={{ height: 12 }} />
        <PrimaryButton variant="accent" title="친구 추가" onPress={onAdd} />
      </View>

      <View style={{ height: 14 }} />

      <Text style={styles.sectionTitle}>친구 목록</Text>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.friendId}
        ListEmptyComponent={<Text style={styles.empty}>아직 추가된 친구가 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => openFriend(item)} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.displayName?.trim() ? item.displayName : "친구"}</Text>
              <Text style={styles.itemSub}>{item.friendId}</Text>
            </View>

            <Pressable onPress={() => onRemove(item.friendId)} style={styles.delBtn}>
              <Text style={styles.delText}>삭제</Text>
            </Pressable>
          </Pressable>
        )}
      />
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

  h2: { fontSize: font.h2, fontWeight: "900", color: colors.text, marginBottom: 10 },

  idRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  idText: { flex: 1, fontSize: font.body, fontWeight: "900", color: colors.text },
  copyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtnText: { fontSize: font.caption, fontWeight: "900", color: colors.text },
  caption: { marginTop: 10, fontSize: font.caption, fontWeight: "700", color: colors.textMuted },

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

  sectionTitle: { fontSize: font.h2, fontWeight: "900", color: colors.text, marginBottom: 10 },
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

  delBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  delText: { fontSize: font.caption, fontWeight: "900", color: colors.danger },
});
