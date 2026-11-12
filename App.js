import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import SetupScreen from "./src/screens/SetupScreen";
import TimerScreen from "./src/screens/TimerScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import FriendDetailScreen from "./src/screens/FriendDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator(); // 루트 스택 추가

// 공통 헤더 스타일 (전 탭 동일)
const commonHeaderOptions = {
  headerTitleAlign: "center",
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "#FFFFFF" },
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: "900",
  },
  headerTopInsetEnabled: true,
};

function HomeStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={commonHeaderOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{
          title: "세션 설정",
        }}
      />

      {/* 변경: Timer는 여기서 제거 (탭 바깥 RootStack으로 이동) */}
    </Stack.Navigator>
  );
}

function HistoryStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={commonHeaderOptions}>
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: "공부 기록",
        }}
      />
    </Stack.Navigator>
  );
}

function FriendsStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={commonHeaderOptions}>
      <Stack.Screen
        name="FriendsHome"
        component={FriendsScreen}
        options={{
          title: "친구",
        }}
      />
      <Stack.Screen
        name="FriendDetail"
        component={FriendDetailScreen}
        options={{
          title: "친구 정보",
        }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator screenOptions={commonHeaderOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "설정",
        }}
      />
    </Stack.Navigator>
  );
}

// TabNavigator를 컴포넌트로 분리 (RootStack에 넣기 위해)
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
        tabBarActiveTintColor: "#ec786f",
        tabBarInactiveTintColor: "#9CA3AF",

        tabBarIcon: ({ focused, color, size }) => {
          let name = "home-outline";
          if (route.name === "홈") name = focused ? "home" : "home-outline";
          else if (route.name === "히스토리") name = focused ? "time" : "time-outline";
          else if (route.name === "친구") name = focused ? "people" : "people-outline";
          else if (route.name === "설정") name = focused ? "settings" : "settings-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeStack} />
      <Tab.Screen name="히스토리" component={HistoryStack} />
      <Tab.Screen name="친구" component={FriendsStack} />
      <Tab.Screen name="설정" component={SettingsStack} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* RootStack이 Tabs + Timer를 감싸는 구조 */}
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Tabs" component={Tabs} />

          {/* Timer는 탭 바깥에 존재 → 탭바 숨김 로직 필요 없음 */}
          <RootStack.Screen
            name="Timer"
            component={TimerScreen}
            options={{
              headerShown: false,
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
