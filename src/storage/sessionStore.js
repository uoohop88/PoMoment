// 로컬(AsyncStorage)은 유지 + Firestore는 동기화/백업용으로 사용(best-effort)
// + 친구 공개용 "이번 주(일~토) 요약" 문서(users/{uid}/public/summary)까지 업데이트

import AsyncStorage from "@react-native-async-storage/async-storage";

import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

import { getAuthUid } from "./userStore";

const KEY = "POMOMENT_SESSIONS_V1";

// Local (AsyncStorage)
export async function loadSessions() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveSessionsToLocal(sessions) {
  await AsyncStorage.setItem(KEY, JSON.stringify(sessions));
  return sessions;
}

export async function clearSessions(options = { alsoCloud: false }) {
  await AsyncStorage.removeItem(KEY);

  // 기본값은 로컬만 삭제
  if (options?.alsoCloud) {
    console.warn("[clearSessions] alsoCloud is not implemented by default.");
  }
}

// Date helpers
function toYYYYMMDD(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

function todayYYYYMMDD() {
  return toYYYYMMDD(new Date());
}

// 이번 주(일~토) 7일 리스트 (일->토)
function getThisWeekDaysList(baseDate = new Date()) {
  const d = new Date(baseDate);

  // getDay(): 일=0, 월=1, ... 토=6
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());

  const out = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(sunday);
    cur.setDate(sunday.getDate() + i);
    out.push(toYYYYMMDD(cur));
  }
  return out; // 일 -> 토
}

// Session ID / Sanitizer
function makeSessionId() {
  const rand = Math.random().toString(16).slice(2, 10);
  return `S-${Date.now()}-${rand}`;
}

function stripUndefined(obj) {
  // Firestore는 undefined 저장 불가 -> 제거
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function normalizeSession(session) {
  const s = { ...(session || {}) };

  const sessionId = s.sessionId || s.id || makeSessionId();

  const createdAtMs =
    typeof s.createdAtMs === "number"
      ? s.createdAtMs
      : typeof s.endedAtMs === "number"
      ? s.endedAtMs
      : typeof s.startedAtMs === "number"
      ? s.startedAtMs
      : Date.now();

  // date가 없으면 createdAtMs 기반으로 보정(요약 계산을 위해)
  const date =
    typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date)
      ? s.date
      : toYYYYMMDD(new Date(createdAtMs));

  return {
    ...s,
    sessionId,
    createdAtMs,
    updatedAtMs: typeof s.updatedAtMs === "number" ? s.updatedAtMs : createdAtMs,
    date,
  };
}

// 이번 주 요약(로컬 계산): buildLast7DaysSummary사용
export function buildLast7DaysSummary(sessions, baseDate = new Date()) {
  const normalized = (sessions || []).map(normalizeSession);

  // "이번 주(일~토)" 고정
  const days = getThisWeekDaysList(baseDate); // 일 -> 토
  const dayMap = new Map();
  days.forEach((d) => {
    dayMap.set(d, { day: d, totalSeconds: 0, sessionCount: 0 });
  });

  for (const s of normalized) {
    if (!s?.date) continue;
    if (!dayMap.has(s.date)) continue;

    const focused = typeof s.focusedSeconds === "number" ? s.focusedSeconds : 0;
    const row = dayMap.get(s.date);
    row.totalSeconds += focused;
    row.sessionCount += 1;
  }

  const series = days.map((d) => dayMap.get(d));

  const totalSeconds7d = series.reduce((acc, r) => acc + (r.totalSeconds || 0), 0);
  const totalSessions7d = series.reduce((acc, r) => acc + (r.sessionCount || 0), 0);

  return {
    // 이번 주 범위(일~토)
    range: { from: days[0], to: days[days.length - 1] },
    days: series, // [{day, totalSeconds, sessionCount}] 일->토
    totalSeconds7d,
    totalSessions7d,
    updatedAtLocal: Date.now(),
  };
}

// Cloud (Firestore) - best effort

// Path: users/{uid}/sessions/{sessionId}
async function upsertSessionToCloud(uid, session) {
  if (!uid) return;

  const normalized = normalizeSession(session);
  const ref = doc(db, "users", uid, "sessions", normalized.sessionId);

  const payload = stripUndefined({
    ...normalized,
    serverUpdatedAt: serverTimestamp(),
  });

  await setDoc(ref, payload, { merge: true });
}

// Path: users/{uid}/public/summary  (친구 공개용)
async function upsertPublicSummaryToCloud(uid, summary) {
  if (!uid) return;

  const ref = doc(db, "users", uid, "public", "summary");
  const payload = stripUndefined({
    ...summary,
    updatedAt: serverTimestamp(),
  });

  await setDoc(ref, payload, { merge: true });
}

// Public APIs
export async function saveSession(session) {
  const normalized = normalizeSession(session);

  // 1) 로컬 저장 우선
  const prev = await loadSessions();
  const next = [normalized, ...prev];
  await saveSessionsToLocal(next);

  // 2) 클라우드 백업(best-effort)
  const uid = getAuthUid();
  if (uid) {
    // 세션 업로드
    upsertSessionToCloud(uid, normalized).catch((e) => {
      console.warn("[saveSession cloud] skipped:", e?.message || e);
    });

    // 이번 주 요약 업로드 (친구 공개용)
    const summary = buildLast7DaysSummary(next);
    upsertPublicSummaryToCloud(uid, summary).catch((e) => {
      console.warn("[saveSession summary cloud] skipped:", e?.message || e);
    });
  }

  return next;
}

export function calcTodaySummary(sessions, today = null) {
  const day = today ?? todayYYYYMMDD(); // YYYY-MM-DD
  const todays = (sessions || []).map(normalizeSession).filter((s) => s.date === day);
  const totalSeconds = todays.reduce((acc, s) => acc + (s.focusedSeconds || 0), 0);
  return {
    day,
    count: todays.length,
    totalSeconds,
  };
}

// Sync helpers (원할 때만 호출)

// 로컬 세션들을 클라우드에 일괄 업로드(best-effort)
// + 이번 주 요약도 함께 업로드

export async function backupAllSessionsToCloud() {
  const uid = getAuthUid();
  if (!uid) return;

  const local = await loadSessions();

  for (const s of local) {
    try {
      await upsertSessionToCloud(uid, s);
    } catch (e) {
      console.warn("[backupAllSessionsToCloud] skipped one:", e?.message || e);
    }
  }

  // 요약 업로드
  try {
    const summary = buildLast7DaysSummary(local);
    await upsertPublicSummaryToCloud(uid, summary);
  } catch (e) {
    console.warn("[backupAllSessionsToCloud summary] skipped:", e?.message || e);
  }
}

// 클라우드에서 최근 N개 세션을 가져와 로컬과 merge
// merge 키는 sessionId
// 같은 sessionId면 updatedAtMs가 더 큰 쪽을 남김

export async function syncSessionsFromCloud(maxCount = 200) {
  const uid = getAuthUid();
  if (!uid) return await loadSessions();

  try {
    const colRef = collection(db, "users", uid, "sessions");
    const q = query(colRef, orderBy("createdAtMs", "desc"), limit(maxCount));
    const snap = await getDocs(q);

    const cloudSessions = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data) cloudSessions.push(normalizeSession({ ...data, sessionId: data.sessionId || d.id }));
    });

    const local = await loadSessions();

    const map = new Map();
    for (const s of local) {
      const ns = normalizeSession(s);
      map.set(ns.sessionId, ns);
    }
    for (const s of cloudSessions) {
      const existing = map.get(s.sessionId);
      if (!existing) {
        map.set(s.sessionId, s);
      } else {
        const a = existing.updatedAtMs || 0;
        const b = s.updatedAtMs || 0;
        map.set(s.sessionId, b >= a ? s : existing);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
    );

    await saveSessionsToLocal(merged);

    // merge 후 요약도 다시 업로드(best-effort)
    const summary = buildLast7DaysSummary(merged);
    upsertPublicSummaryToCloud(uid, summary).catch(() => {});

    return merged;
  } catch (e) {
    console.warn("[syncSessionsFromCloud] skipped:", e?.message || e);
    return await loadSessions();
  }
}

// 로컬에 있는 sessions로 "이번 주 요약"을 만들고, 클라우드에 업로드만 하고 싶을 때
// (예: 앱 시작 시 1회 호출)

export async function updatePublicSummaryFromLocal() {
  const uid = getAuthUid();
  if (!uid) return;

  try {
    const local = await loadSessions();
    const summary = buildLast7DaysSummary(local);
    await upsertPublicSummaryToCloud(uid, summary);
  } catch (e) {
    console.warn("[updatePublicSummaryFromLocal] skipped:", e?.message || e);
  }
}
