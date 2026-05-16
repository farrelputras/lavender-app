import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Beranda',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'penyewaan',
    title: 'Penyewaan',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  {
    name: 'user',
    title: 'User',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    name: 'hutang',
    title: 'Hutang',
    icon: 'wallet-outline',
    iconFocused: 'wallet',
  },
  {
    name: 'test',
    title: 'Test',
    icon: 'flask-outline',
    iconFocused: 'flask',
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
