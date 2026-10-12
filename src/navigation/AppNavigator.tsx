import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from '../database/db';
import { getNickname } from '../storage/mmkv';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MainCalendarScreen } from '../screens/MainCalendarScreen';
import { DailyDetailScreen } from '../screens/DailyDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';

const Stack = createNativeStackNavigator();

function MainTabContainer({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'STATS' | 'SETTINGS'>('CALENDAR');

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>
          {activeTab === 'CALENDAR'
            ? '📅 가계부 달력'
            : activeTab === 'STATS'
            ? '📊 지출 통계'
            : '⚙️ 환경 설정'}
        </Text>
        {activeTab !== 'SETTINGS' ? (
          <TouchableOpacity
            style={styles.headerSettingBtn}
            onPress={() => setActiveTab('SETTINGS')}
          >
            <Text style={styles.headerSettingText}>⚙️ 설정</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerSettingBtn}
            onPress={() => setActiveTab('CALENDAR')}
          >
            <Text style={styles.headerSettingText}>✕ 닫기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Screen Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'CALENDAR' && (
          <MainCalendarScreen
            onSelectDate={(dateStr: string) =>
              navigation.navigate('DailyDetail', { dateStr })
            }
            onOpenSettings={() => setActiveTab('SETTINGS')}
          />
        )}
        {activeTab === 'STATS' && <StatisticsScreen />}
        {activeTab === 'SETTINGS' && <SettingsScreen />}
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
          onPress={() => setActiveTab('CALENDAR')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'CALENDAR' && styles.activeTabText,
            ]}
          >
            📅 달력
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('STATS')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'STATS' && styles.activeTabText,
            ]}
          >
            📊 통계
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('SETTINGS')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'SETTINGS' && styles.activeTabText,
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
  const [hasNickname, setHasNickname] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      initDatabase();
    } catch (e) {
      console.warn('Database initialization warning:', e);
    }
    const name = getNickname();
    setHasNickname(Boolean(name));
  }, []);

  if (hasNickname === null) {
    return null; // 로딩 상태
  }

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
          options={{ headerShown: true, title: '일별 지출 상세' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: '⚙️ 환경 설정' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSettingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
  },
  headerSettingText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});
