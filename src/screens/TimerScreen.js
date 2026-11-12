import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake"; // 발표 이후 Keep Awake 추가
import { useIsFocused } from "@react-navigation/native";
import PrimaryButton from "../components/PrimaryButton";
import { formatMMSS, todayKey, nowISO } from "../utils/time";
import { saveSession } from "../storage/sessionStore";
import { font } from "../theme/typography";

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { loadProfile } from "../storage/userStore";

export default function TimerScreen({ navigation, route }) {
  const { subject, focusMin, restMin, preset } = route.params;

  const focusTotal = useMemo(() => Math.round(focusMin * 60), [focusMin]);
  const restTotal = useMemo(() => Math.round(restMin * 60), [restMin]);

  const isFocused = useIsFocused();

  const [mode, setMode] = useState("FOCUS"); // FOCUS | REST
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(focusTotal);

  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const startedAtRef = useRef(nowISO());

  // 설정(소리/진동) 로드
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // 소리 객체/타이머 ref
  const soundRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  // “종료됨” 플래그: 종료 후에는 알람/틱/전환 다 막기
  const endedRef = useRef(false);

  const isRest = mode === "REST";

  // Keep Awake : 타이머 실행 중 화면 꺼짐 방지, 정지/종료/화면이탈 시 해제
  useEffect(() => {
    const TAG = "pomoment-timer";

    // "실행 중" 정의: 화면이 Timer에 포커스 + 일시정지 아님 + 종료 아님
    const shouldKeepAwake = isFocused && !paused && !endedRef.current;

    try {
      if (shouldKeepAwake) {
        activateKeepAwake(TAG);
      } else {
        deactivateKeepAwake(TAG);
      }
    } catch {}

    // 화면 이탈/언마운트 시 무조건 해제 (배터리 보호)
    return () => {
      try {
        deactivateKeepAwake(TAG);
      } catch {}
    };
  }, [isFocused, paused]); // paused 토글될 때 즉시 켜고/끄도록

  // Settings 토글 불러오기
  useEffect(() => {
    (async () => {
      try {
        const p = await loadProfile();
        setSoundEnabled(p.soundEnabled === undefined ? true : !!p.soundEnabled);
        setVibrationEnabled(p.vibrationEnabled === undefined ? true : !!p.vibrationEnabled);
      } catch {}
    })();
  }, []);

  // 효과음 로드 + 언로드
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/beep.mp3"),
          { volume: 1.0 }
        );
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {
        soundRef.current = null;
      }
    })();

    return () => {
      mounted = false;

      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  // 전환 알림(소리/진동): 종료되었으면 아무것도 안함
  const notifySwitch = useCallback(async () => {
    if (endedRef.current) return;

    try {
      if (vibrationEnabled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}

    try {
      if (soundEnabled && soundRef.current) {
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current);
          stopTimeoutRef.current = null;
        }

        try {
          await soundRef.current.stopAsync();
        } catch {}
        try {
          await soundRef.current.setPositionAsync(0);
        } catch {}

        await soundRef.current.playAsync();

        stopTimeoutRef.current = setTimeout(async () => {
          try {
            if (soundRef.current) {
              await soundRef.current.stopAsync();
              await soundRef.current.setPositionAsync(0);
            }
          } catch {}
        }, 2000);
      }
    } catch {}
  }, [soundEnabled, vibrationEnabled]);

  // 타이머 tick (intervalRef로 관리)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (endedRef.current) return;

      setRemaining((prev) => {
        if (paused) return prev;
        if (prev <= 0) return 0;
        return prev - 1;
      });

      if (!paused && mode === "FOCUS") {
        setFocusedSeconds((s) => s + 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paused, mode]);

  // 모드 전환
  useEffect(() => {
    if (endedRef.current) return;
    if (remaining !== 0) return;

    (async () => {
      await notifySwitch();
      if (endedRef.current) return;

      if (mode === "FOCUS") {
        setMode("REST");
        setRemaining(restTotal);
      } else {
        setMode("FOCUS");
        setRemaining(focusTotal);
      }
    })();
  }, [remaining, mode, focusTotal, restTotal, notifySwitch]);

  // 종료할 때: 타이머/알림 stop
  const hardStopAll = useCallback(async () => {
    endedRef.current = true;
    setPaused(true);

    // 종료 시 즉시 해제(effect 타이밍보다 빠르게 끄기)
    try {
      deactivateKeepAwake("pomoment-timer");
    } catch {}

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      }
    } catch {}
  }, []);

  const endSession = async () => {
    await hardStopAll();

    const endedAt = nowISO();
    const session = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      subject,
      preset,
      focusMin,
      restMin,
      focusedSeconds,
      date: todayKey(),
      startedAt: startedAtRef.current,
      endedAt,
    };

    try {
      await saveSession(session);
      Alert.alert("저장 완료", "세션 기록이 저장되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            // reset으로 한 번에 처리
            navigation.reset({
              index: 0,
              routes: [{ name: "Tabs", params: { screen: "히스토리" } }],
            });
          },
        },
      ]);
    } catch (e) {
      Alert.alert("저장 실패", "기록 저장 중 오류가 발생했습니다.");
    }
  };

  const confirmEnd = () => {
    const wasPaused = paused;
    setPaused(true);

    Alert.alert("세션 종료", "세션을 종료하고 기록을 저장할까요?", [
      { text: "취소", style: "cancel", onPress: () => setPaused(wasPaused) },
      { text: "저장 후 종료", style: "destructive", onPress: endSession },
    ]);
  };

  return (
    <View style={[styles.container, isRest && styles.containerRest]}>
      {/* 숨김 + 모드별 스타일 */}
      {isFocused && <StatusBar hidden style={isRest ? "dark" : "light"} />}

      <Text style={[styles.subject, isRest && styles.subjectRest]}>{subject}</Text>

      <Text style={[styles.mode, isRest && styles.modeRest]}>
        {mode === "FOCUS" ? "FOCUS" : "REST"}
      </Text>

      <Text style={[styles.timer, isRest && styles.timerRest]}>{formatMMSS(remaining)}</Text>

      <Text style={[styles.meta, isRest && styles.metaRest]}>
        누적 집중 시간: {Math.floor(focusedSeconds / 60)}분 {focusedSeconds % 60}초
      </Text>

      <View style={{ height: 18 }} />

      <PrimaryButton
        variant={paused ? "accent" : "primary"}
        title={paused ? "재개" : "일시정지"}
        onPress={() => setPaused((p) => !p)}
      />

      <View style={{ height: 12 }} />

      <PrimaryButton variant="neutral" title="세션 종료 & 저장" onPress={confirmEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#0B1220",
    justifyContent: "center",
  },
  containerRest: { backgroundColor: "#FFFFFF" },

  subject: {
    color: "#E5E7EB",
    fontSize: Math.round(font.title * 1.25),
    fontWeight: "900",
    textAlign: "center",
  },
  subjectRest: { color: "#111827" },

  mode: {
    color: "#93C5FD",
    fontSize: Math.round(font.h1 * 1.1),
    fontWeight: "900",
    textAlign: "center",
    marginTop: 40,
    letterSpacing: 2,
  },
  modeRest: { color: "#94499cff" },

  timer: {
    color: "white",
    fontSize: Math.round(font.title * 2.4),
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  timerRest: { color: "#111827" },

  meta: {
    color: "#D1D5DB",
    fontSize: font.body,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
  metaRest: { color: "#4B5563" },
});
