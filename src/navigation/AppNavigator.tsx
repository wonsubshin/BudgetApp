import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initDatabase } from "../database/db";
import { getNickname } from "../storage/mmkv";

import { AppNotificationsScreen } from "../screens/AppNotificationsScreen";
import { CustomHolidayScreen } from "../screens/CustomHolidayScreen";
import { DailyDetailScreen } from "../screens/DailyDetailScreen";
import { MainCalendarScreen } from "../screens/MainCalendarScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { ParseExceptionsScreen } from "../screens/ParseExceptionsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StatisticsScreen } from "../screens/StatisticsScreen";

const Stack = createNativeStackNavigator();

function MainTabContainer({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"CALENDAR" | "STATS" | "SETTINGS">(
    "CALENDAR",
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Screen Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "CALENDAR" && (
          <MainCalendarScreen
            onSelectDate={(dateStr: string) =>
              navigation.navigate("DailyDetail", { dateStr })
            }
            onOpenSettings={() => setActiveTab("SETTINGS")}
          />
        )}
        {activeTab === "STATS" && <StatisticsScreen />}
        {activeTab === "SETTINGS" && (
          <SettingsScreen
            navigation={navigation}
            onOpenCustomHolidays={() => navigation.navigate("CustomHolidays")}
            onOpenAppNotifications={() =>
              navigation.navigate("AppNotifications")
            }
            onOpenParseExceptions={() => navigation.navigate("ParseExceptions")}
          />
        )}
      </View>

      {/* Bottom Tab Bar with Safe Area Bottom Padding */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 6),
            height: 56 + Math.max(insets.bottom, 6),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("CALENDAR")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "CALENDAR" && styles.activeTabText,
            ]}
          >
            📅 달력
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("STATS")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "STATS" && styles.activeTabText,
            ]}
          >
            📊 통계
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("SETTINGS")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "SETTINGS" && styles.activeTabText,
            ]}
          >
            ⚙️ 설정
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const AppNavigator = () => {
  const [hasNickname, setHasNickname] = useState<boolean>(() => {
    try {
      return Boolean(getNickname());
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      initDatabase();
    } catch (e) {
      console.warn("Database initialization warning:", e);
    }
    try {
      const name = getNickname();
      setHasNickname(Boolean(name));
    } catch (e) {}
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasNickname ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onComplete={() => setHasNickname(true)}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabContainer} />
        )}
        <Stack.Screen
          name="DailyDetail"
          component={DailyDetailScreen}
          options={{ headerShown: true, title: "일별 지출 상세" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: "⚙️ 환경 설정" }}
        />
        <Stack.Screen
          name="CustomHolidays"
          component={CustomHolidayScreen}
          options={{ headerShown: true, title: "📅 임시공휴일 관리" }}
        />
        <Stack.Screen
          name="AppNotifications"
          component={AppNotificationsScreen}
          options={{ headerShown: true, title: "📨 수신된 앱 푸시 원문 로그" }}
        />
        <Stack.Screen
          name="ParseExceptions"
          component={ParseExceptionsScreen}
          options={{ headerShown: true, title: "🚫 파싱 예외 문구 관리" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    color: "#757575",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
});
