import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'STATS' | 'SETTINGS'>('CALENDAR');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'CALENDAR' && (
          <MainCalendarScreen
            onSelectDate={(dateStr: string) =>
              navigation.navigate('DailyDetail', { dateStr })
            }
          />
        )}
        {activeTab === 'STATS' && <StatisticsScreen />}
        {activeTab === 'SETTINGS' && <SettingsScreen />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
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
          <>
            <Stack.Screen name="MainTabs" component={MainTabContainer} />
            <Stack.Screen
              name="DailyDetail"
              component={DailyDetailScreen}
              options={{ headerShown: true, title: '일별 지출 상세' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});
