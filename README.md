# PoMoment (React Native + Expo)

 PoMoment는 Pomodoro 스타일의 **집중/휴식 타이머 세션**을 실행하고, 세션 결과를 **히스토리** 로 저장·조회할 수 있는 학습 타이머 앱입니다.

탭은 **홈 / 히스토리 / 친구 / 설정** 4개로 구성되어 있으며, 홈에서 세션을 시작해 타이머를 실행하고 세션을 저장하면, 이를 히스토리에서 확인할 수 있습니다.

자세한 유저플로우/화면 설명/특징점/자랑거리는 별도로 제출한 설명서(pdf)에 포함하여 적어두었습니다.


---


## 주요 기능 (간략한 소개)
- **Pomodoro 타이머 (집중/휴식)**  
  집중(FOCUS)과 휴식(REST)을 기반으로 세션을 진행하는 타이머 기능입니다.  
  남은 시간과 모드가 화면에 표시되며, **일시정지/재개**가 가능합니다.  
  세션 종료 시 기록을 저장하고, 저장 완료 후 히스토리에서 확인할 수 있습니다.
- **공부 기록 조회 (날짜/세션별)**  
  저장된 공부 세션 기록을 **날짜/세션 단위**로 조회할 수 있습니다.  
  공부한 과목명, 공부 시간(집중/휴식) 등 세션 요약 정보가 함께 제공됩니다.
- **친구 추가 & 주간 요약 조회**  
  친구를 추가하고, 친구의 프로필 및 주간 단위의 공부 기록 요약을 확인할 수 있습니다.  
  이를 통해 개인 기록뿐 아니라 친구의 학습 현황도 함께 참고할 수 있습니다.
- **설정 및 프로필**  
  타이머 전환 알림에 사용되는 **사운드/진동 옵션**을 설정할 수 있습니다.  
  설정값은 저장되며 이후 타이머 동작에 반영됩니다.
  프로필 정보, 즉 이름과 상태 메시지 또한 설정 화면에서 관리합니다.


---


## 실행 방법 (iOS / Android, Expo Go)

### 1) 기본 실행 (권장)

프로젝트 루트에서 아래 명령으로 실행합니다.

```bash
npx expo start -c
```

### 2) 네트워크 환경상 로컬 연결이 불안정할 때 (대안)

학교/회사망 등 환경에 따라 LAN 연결이 원활하지 않을 수 있으므로, 필요할 경우에는 터널 모드로 실행합니다.

```bash
npx expo start -c --tunnel
```

### 3) 기기에서 실행 (iOS/Android)

1. iPhone/Android 기기에 Expo Go 앱을 설치합니다.

2. 실행 후 터미널에 표시되는 QR 코드를 스캔하여 앱을 실행합니다.


---


## 제출 파일 구조

myapp1214/
├── App.js                 # 앱 엔트리 포인트
├── assets/                # 리소스
│   ├── beep.mp3
│   └── logo2.png
└── src/                  		# 소스 코드의 메인 디렉토리
    ├── screens/     	      # 각 화면 컴포넌트
    │   ├── HomeScreen.js
    │   ├── SetupScreen.js
    │   ├── TimerScreen.js
    │   ├── HistoryScreen.js
    │   ├── FriendsScreen.js
    │   ├── FriendDetailScreen.js
    │   └── SettingsScreen.js
    ├── components/       	 # 공통 UI 컴포넌트
    │   └── PrimaryButton.js
    ├── firebase/         	 # Firebase 설정 및 초기화
    │   └── firebase.js
    ├── storage/          	 # 데이터 상태 관리
    │   ├── sessionStore.js
    │   └── userStore.js
    ├── theme/            	 # 공통 스타일 관리
    │   ├── colors.js
    │   └── typography.js
    └── utils/           		 # 공통 utility 함수 설정
        └── time.js
   

---


## 설치해야 하는 패키지 목록 (dependencies)

### Core
- `expo` `~54.0.29`
- `react` `19.1.0`
- `react-native` `0.81.5`

### Navigation / 화면 구성
- `@react-navigation/native` `^7.1.25`
- `@react-navigation/native-stack` `^7.8.6`
- `@react-navigation/bottom-tabs` `^7.8.12`
- `react-native-screens` `~4.16.0`
- `react-native-safe-area-context` `~5.6.0`

### Expo 모듈
- `expo-status-bar` `~3.0.9`
- `expo-av` `~16.0.8` (사운드)
- `expo-haptics` `~15.0.8` (진동/햅틱)
- `expo-keep-awake` `~15.0.8` (화면 꺼짐 방지)
- `expo-clipboard` `~8.0.8`
- `@expo/vector-icons` `^15.0.3`

### 저장소 / 데이터
- `@react-native-async-storage/async-storage` `2.2.0`
- `firebase` `^12.6.0`

### UI 컴포넌트
- `react-native-calendars` `^1.1313.0`



### 패키치 설치 명령어(제출물에 따로 package.json을 포함하였음)


```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Local storage / UI
npx expo install @react-native-async-storage/async-storage
npm install react-native-calendars

# Expo modules
npx expo install expo-status-bar expo-clipboard expo-av expo-haptics expo-keep-awake

# Icons
npx expo install @expo/vector-icons

# Firebase
npm install firebase
```

