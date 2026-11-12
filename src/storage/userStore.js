import AsyncStorage from "@react-native-async-storage/async-storage";

import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const KEY_USER_ID = "pomoment_user_id";
const KEY_FRIENDS = "pomoment_friends_v1";
const KEY_PROFILE = "pomoment_profile_v1";

let AUTH_UID = null;
export function getAuthUid() {
  return AUTH_UID;
}

function makeId() {
  const rand = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `PM-${rand}`;
}

// User publicId (AsyncStorage)
export async function getOrCreateUserId() {
  const existing = await AsyncStorage.getItem(KEY_USER_ID);
  if (existing) return existing;

  const newId = makeId();
  await AsyncStorage.setItem(KEY_USER_ID, newId);
  return newId;
}

export async function resetUserId() {
  const newId = makeId();
  await AsyncStorage.setItem(KEY_USER_ID, newId);
  return newId;
}

// Friends (Local)
export async function loadFriends() {
  const raw = await AsyncStorage.getItem(KEY_FRIENDS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFriends(friends) {
  await AsyncStorage.setItem(KEY_FRIENDS, JSON.stringify(friends));
}

export async function addFriend({ friendId, friendUid = null, displayName = "" }) {
  const id = (friendId || "").trim().toUpperCase();
  if (!id) throw new Error("EMPTY_ID");

  const friends = await loadFriends();
  const exists = friends.some((f) => String(f.friendId || "").toUpperCase() === id);
  if (exists) throw new Error("DUPLICATE");

  const next = [
    ...friends,
    {
      friendId: id,
      friendUid: friendUid || null,
      displayName: (displayName || "").toString(),
      addedAt: new Date().toISOString(),
    },
  ];
  await saveFriends(next);
  return next;
}

export async function updateFriendMeta(friendId, patch) {
  const id = (friendId || "").trim().toUpperCase();
  const friends = await loadFriends();
  const next = friends.map((f) => {
    if (String(f.friendId || "").toUpperCase() !== id) return f;
    return { ...f, ...patch };
  });
  await saveFriends(next);
  return next;
}

export async function removeFriend(friendId) {
  const id = (friendId || "").trim().toUpperCase();
  const friends = await loadFriends();
  const next = friends.filter((f) => String(f.friendId || "").toUpperCase() !== id);
  await saveFriends(next);
  return next;
}

export async function clearFriends() {
  await AsyncStorage.removeItem(KEY_FRIENDS);
}

// Profile (Local + Cloud sync)
const DEFAULT_PROFILE = {
  displayName: "",
  statusMessage: "",
  shareEnabled: false,      // "이번 주 기록 공개" 토글로 사용
  soundEnabled: true,
  vibrationEnabled: true,
};

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };

    const p = JSON.parse(raw);
    return {
      displayName: typeof p.displayName === "string" ? p.displayName : "",
      statusMessage: typeof p.statusMessage === "string" ? p.statusMessage : "",
      shareEnabled: !!p.shareEnabled,
      soundEnabled: p.soundEnabled === undefined ? true : !!p.soundEnabled,
      vibrationEnabled: p.vibrationEnabled === undefined ? true : !!p.vibrationEnabled,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function safeProfile(profile) {
  return {
    displayName: (profile?.displayName ?? "").toString(),
    statusMessage: (profile?.statusMessage ?? "").toString(),
    shareEnabled: !!profile?.shareEnabled,
    soundEnabled: profile?.soundEnabled === undefined ? true : !!profile?.soundEnabled,
    vibrationEnabled: profile?.vibrationEnabled === undefined ? true : !!profile?.vibrationEnabled,
  };
}

export async function saveProfile(profile) {
  const safe = safeProfile(profile);

  // 1) 로컬 저장
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(safe));

  // 2) 클라우드 저장(best-effort)
  const uid = getAuthUid();
  if (uid) {
    // users/{uid} : shareEnabled만 저장 (Rules의 shareEnabledOf()가 읽는 값)
    setDoc(
      doc(db, "users", uid),
      { shareEnabled: safe.shareEnabled, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch((e) => console.warn("[saveProfile users] skipped:", e?.message || e));

    // users/{uid}/public/profile : 항상 공개될 프로필(이름/상메)
    setDoc(
      doc(db, "users", uid, "public", "profile"),
      {
        displayName: safe.displayName,
        statusMessage: safe.statusMessage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((e) => console.warn("[saveProfile public/profile] skipped:", e?.message || e));

    // users/{uid}/private/settings : 알림 설정(나만)
    setDoc(
      doc(db, "users", uid, "private", "settings"),
      {
        soundEnabled: safe.soundEnabled,
        vibrationEnabled: safe.vibrationEnabled,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((e) => console.warn("[saveProfile private/settings] skipped:", e?.message || e));
  }

  return safe;
}

// Cloud init (called after anonymous auth)
export async function initCloudUser(uid) {
  AUTH_UID = uid;

  // publicId 확보
  const publicId = await getOrCreateUserId();

  // 로컬 프로필 로드
  const p = await loadProfile();

  // publicIds/{publicId} -> uid 매핑
  try {
    const mapRef = doc(db, "publicIds", publicId);
    const mapSnap = await getDoc(mapRef);
    if (!mapSnap.exists()) {
      await setDoc(mapRef, { uid }, { merge: false }); // create
    }
  } catch (e) {
    console.warn("[initCloudUser publicIds] skipped:", e?.message || e);
  }

  // users/{uid} 문서(shareEnabled만 최소 보장)
  try {
    await setDoc(
      doc(db, "users", uid),
      { publicId, shareEnabled: !!p.shareEnabled, createdAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("[initCloudUser users] skipped:", e?.message || e);
  }

  // public/profile & private/settings도 한 번 생성/갱신
  await saveProfile(p);

  return { uid, publicId };
}
