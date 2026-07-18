import { Tabs } from 'expo-router';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderWithLogo from '../../components/HeaderWithLogo';   // ← NEW IMPORT

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarInactiveTintColor: '#666666',
          tabBarLabelPosition: 'below-icon',
          tabBarShowLabel: true,

          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: 13,
          },

          tabBarIconStyle: { marginTop: 4 },
          tabBarStyle: {
            height: 94,
            paddingBottom: 8,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.15,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <HeaderWithLogo title={isEnglish ? "Home" : "Tuis"} />,
            headerTitleAlign: 'center',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
          }}
        />

<Tabs.Screen
  name="history"
  options={{
    title: isEnglish ? "History" : "Geskiedenis",
    headerTitle: () => <HeaderWithLogo title={isEnglish ? "Call History" : "Oproep Geskiedenis"} />,
    headerTitleAlign: 'center',
    tabBarIcon: ({ color }) => <Ionicons name="time" size={28} color={color} />,
  }}
/>

<Tabs.Screen
  name="client-files"
  options={{
    title: isEnglish ? "Client Files" : "Kliënte Lêers",
    headerTitle: () => <HeaderWithLogo title={isEnglish ? "Client Files" : "Kliënt Lêers"} />,
    headerTitleAlign: 'center',
    tabBarIcon: ({ color }) => <Ionicons name="folder-open" size={28} color={color} />,
  }}
/>

<Tabs.Screen
  name="profile"
  options={{
    title: isEnglish ? "Profile" : "Profiel",
    headerTitle: () => <HeaderWithLogo title={isEnglish ? "Profile" : "Profiel"} />,
    headerTitleAlign: 'center',
    tabBarIcon: ({ color }) => <Ionicons name="business" size={28} color={color} />,
  }}
/>

        {/* Hidden New Invoice Tab */}
        <Tabs.Screen
          name="new-invoice"
          options={{
            href: null,
          }}
        />
		
		<Tabs.Screen
  name="manage-team"
  options={{
    href: null,           // hides from bottom tabs
    title: 'Manage Team',
  }}
/>
		
      </Tabs>
    </SafeAreaView>
  );
}