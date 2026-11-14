# PoMoment ⏱️

> **포모도로 기반 학습 기록·공유 모바일 앱**  
> **개인 프로젝트 | JavaScript · React Native · Expo · Firebase**

## 1. 프로젝트 개요

PoMoment는 사용자가 집중 시간과 휴식 시간을 설정해 학습 세션을 진행하고, 결과를 날짜별로 기록하며 친구의 주간 학습 현황을 확인할 수 있도록 만든 모바일 앱입니다.

## 2. 담당 역할

**개인 프로젝트로 기획부터 개발 및 테스트까지 단독 수행**

- React Native·Expo 기반 앱 화면 및 내비게이션 구현
- 포모도로 타이머와 학습 세션 생성·저장·조회 기능 개발
- AsyncStorage·Firebase를 활용한 로컬 및 클라우드 데이터 관리 로직 구현
- 친구 추가 및 주간 학습 기록 조회 기능 개발

## 3. 기술 스택

| 영역 | 기술 | 활용 내용 |
| --- | --- | --- |
| Mobile | JavaScript, React Native, Expo | 모바일 화면 및 타이머 동작 |
| Navigation | React Navigation (Stack / Tabs) | 탭 화면 및 타이머 화면 전환 |
| Local Storage | AsyncStorage | 학습 세션과 설정 저장·조회 |
| Cloud | Firebase Anonymous Authentication, Firestore | 사용자 식별 및 친구·학습 기록 연동 |
| UI / Device | React Native Calendars, Expo Haptics | 달력 UI, 기기 피드백 |

## 4. 주요 기능 및 화면

### 4.1 학습 세션 설정

25/5분, 50/10분 프리셋과 사용자 지정 집중·휴식 시간을 제공하며 학습 과목을 설정할 수 있습니다.

![홈과 세션 설정](docs/screenshots/01_home_setup.png)

### 4.2 집중·휴식 타이머

집중·휴식 모드 전환과 타이머 일시정지·재개, 세션 종료 후 기록 저장을 지원합니다.

![집중 및 휴식 타이머](docs/screenshots/02_focus_rest.png)

### 4.3 학습 기록 조회

달력에서 날짜를 선택해 세션별 학습 과목과 소요 시간을 확인할 수 있습니다.

![날짜별 학습 기록](docs/screenshots/03_history.png)

### 4.4 친구와 학습 현황 공유

친구 ID를 통해 친구를 등록하고 주간 학습 현황을 확인하는 기능을 구현했습니다.

![친구 추가 및 주간 학습 현황](docs/screenshots/04_friends.png)

## 5. 핵심 구현 및 데이터 흐름

**학습 세션 처리**

1. 사용자가 과목과 집중·휴식 시간을 설정합니다.
2. 타이머를 실행하고 일시정지·재개 또는 종료합니다.
3. 학습 결과를 로컬에 기록하고 히스토리 화면에서 조회합니다.
4. Firebase 사용자 식별 정보와 Firestore 연동을 통해 친구의 학습 현황을 조회합니다.

**관련 코드**

- [`App.js`](App.js) — Root Stack과 Bottom Tabs 구성
- [`src/screens/TimerScreen.js`](src/screens/TimerScreen.js) — 타이머 및 학습 세션 UI
- [`src/storage/sessionStore.js`](src/storage/sessionStore.js) — 학습 기록 저장·조회 로직
- [`src/storage/userStore.js`](src/storage/userStore.js) — 사용자·친구 데이터 관리 로직
- [`src/firebase/firebase.js`](src/firebase/firebase.js) — Firebase 설정 및 인증 관련 코드

> React Native에서 AsyncStorage 및 Firebase SDK를 활용한 모바일 앱

## 6. 문제 해결 및 개선

### 화면 전환 후 헤더가 상태바에 가려지는 문제

| 구분 | 내용 |
| --- | --- |
| **Problem** | 타이머 종료 후 화면 전환 시 노치·Dynamic Island가 있는 기기에서 상단 헤더가 Safe Area를 제대로 반영하지 못했습니다. |
| **Action** | 타이머 화면을 TabNavigator 내부에서 분리하여 Root Stack에 배치하고, 최상단 SafeAreaProvider를 적용했습니다. |
| **Result** | 화면 전환 후에도 상단 헤더와 레이아웃이 안정적으로 표시되도록 개선했습니다. |

관련 코드: [`App.js`](App.js)

## 7. 프로젝트 구조

```text
PoMoment/
├── App.js
├── src/
│   ├── screens/       # 홈·설정·타이머·히스토리·친구 화면
│   ├── components/    # 공통 UI
│   ├── storage/       # 학습 기록·사용자 데이터 관리
│   ├── firebase/      # Firebase 관련 코드
│   ├── theme/         # UI 스타일
│   └── utils/         # 시간 유틸리티
├── assets/            # 이미지·알림음
└── docs/screenshots/  # 앱 실행 화면
```

## 8. 실행 및 참고 사항

```bash
npm install
npx expo start -c
```

모바일 기기에서 Expo Go로 실행할 수 있으며 필요한 경우 `npx expo start -c --tunnel`을 이용할 수 있습니다. Firebase 기반 기능은 프로젝트에 맞는 인증·Firestore 설정과 보안 규칙이 필요합니다.

본 README의 이미지는 프로젝트 시연 화면을 정리한 것입니다.
