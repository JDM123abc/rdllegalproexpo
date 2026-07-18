import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState, useRef } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { View, ActivityIndicator, AppState, Modal, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Text, Alert } from 'react-native';
import { LanguageProvider } from './contexts/LanguageContext';
import { ClientProvider } from './contexts/ClientContext';
import { CallProvider, useCallContext } from '../contexts/CallContext';
import { router } from 'expo-router';
import './firebaseConfig';
import * as Contacts from 'expo-contacts';
import { getFirestore, collection, addDoc, Timestamp, getDoc, doc } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from './contexts/LanguageContext';

function AppContent() {
  const colorScheme = useColorScheme();
  const auth = getAuth();
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [currentDuration, setCurrentDuration] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [showCallConfirmation, setShowCallConfirmation] = useState(false);
  const [callDetectionThreshold, setCallDetectionThreshold] = useState(0); // Default 0s

  const callStartTime = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  const db = getFirestore();
  const { justPickedContactRef, callInProgress, resetCallState } = useCallContext();

  // Load saved threshold
  useEffect(() => {
    const loadThreshold = async () => {
      try {
        const saved = await AsyncStorage.getItem('callDetectionThreshold');
        if (saved !== null) {
          setCallDetectionThreshold(parseInt(saved));
        }
      } catch (e) {}
    };
    loadThreshold();
  }, []);

  const saveCallThreshold = async (value: number) => {
    try {
      await AsyncStorage.setItem('callDetectionThreshold', value.toString());
      setCallDetectionThreshold(value);
    } catch (e) {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)');
    } else {
      router.replace('/(app)');
    }
  }, [user, loading]);

  // ====================== GLOBAL INCOMING CALL DETECTION ======================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (!callInProgress) {
          callStartTime.current = Date.now();
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {

        if (justPickedContactRef.current) {
          callStartTime.current = null;
          return;
        }

        if (callStartTime.current && !callInProgress) {
          const durationMs = Date.now() - callStartTime.current;
          const durationSeconds = Math.floor(durationMs / 1000);

          if (durationSeconds >= callDetectionThreshold) {
            setCurrentDuration('');
            setShowCallConfirmation(true);
          }
          callStartTime.current = null;
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [callInProgress, callDetectionThreshold]);

  const pickCallerFromContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }
    try {
      const result = await Contacts.presentContactPickerAsync();
      if (result && result.phoneNumbers?.[0]) {
        setManualName(result.name || '');
        setManualNumber(result.phoneNumbers[0].number.replace(/[^0-9+]/g, ''));
      }
    } catch (e) {}
  };

  const logCall = async (type) => {
    if (isLogging) return;

    setIsLogging(true);

    try {
      const logData = {
        contactName: manualName || 'Unknown',
        contactNumber: manualNumber || 'Unknown',
        duration: currentDuration,
        callType: type,
        direction: 'Incoming',
        timestamp: Timestamp.now()
      };

      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        const tenantId = userDoc.data()?.tenantId;
        if (tenantId) {
          await addDoc(collection(db, `tenants/${tenantId}/calls`), logData);
        }
      }

      Alert.alert('Saved!', `Call logged as ${type}`);
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Unknown error');
    } finally {
      setIsLogging(false);
      setModalVisible(false);
      setShowCallConfirmation(false);
      setManualName('');
      setManualNumber('');
      setCurrentDuration('');
      resetCallState();
      callStartTime.current = null;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {/* ==================== CONFIRMATION POPUP (Bilingual) ==================== */}
      {Platform.OS !== 'web' && showCallConfirmation && (
        <Modal visible={showCallConfirmation} transparent animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, width: '90%', maxWidth: 380 }}>

              <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                {isEnglish ? "Did you just take a call?" : "Het jy pas 'n oproep geneem?"}
              </Text>

              <Text style={{ fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 16 }}>
                {isEnglish 
                  ? "We noticed you were away from the app." 
                  : "Ons het opgemerk jy was weg van die app af."}
              </Text>

              {/* Quick Threshold Options */}
              <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 8 }}>
                {isEnglish 
                  ? "Ignore calls shorter than:" 
                  : "Ignoreer oproepe korter as:"}
              </Text>

              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                marginBottom: 20,
                backgroundColor: '#f8f9fa',
                borderRadius: 10,
                padding: 4
              }}>
                {[0, 15, 30, 60, 120].map((seconds) => (
                  <TouchableOpacity
                    key={seconds}
                    onPress={() => saveCallThreshold(seconds)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      backgroundColor: callDetectionThreshold === seconds ? '#007AFF' : 'transparent',
                      borderRadius: 8,
                      marginHorizontal: 2,
                    }}
                  >
                    <Text style={{
                      color: callDetectionThreshold === seconds ? 'white' : '#333',
                      fontWeight: '600',
                      fontSize: 13
                    }}>
                      {seconds === 0 ? '0s' : `${seconds}s`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity 
                style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 10, marginBottom: 10 }}
                onPress={() => {
                  setShowCallConfirmation(false);
                  setModalVisible(true);
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 17, textAlign: 'center' }}>
                  {isEnglish ? "Yes – Log Call" : "Ja – Log Oproep"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ backgroundColor: '#888', padding: 14, borderRadius: 10 }}
                onPress={() => {
                  setShowCallConfirmation(false);
                  callStartTime.current = null;
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 17, textAlign: 'center' }}>
                  {isEnglish ? "No – Ignore" : "Nee – Ignoreer"}
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>
      )}

      {/* ==================== LOGGING MODAL ==================== */}
      {Platform.OS !== 'web' && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, width: '90%', maxWidth: 420 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>
                Log Incoming Call
              </Text>

              <TouchableOpacity 
                onPress={pickCallerFromContacts}
                style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, marginBottom: 20 }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 17, textAlign: 'center' }}>
                  📱 Select from Contacts
                </Text>
              </TouchableOpacity>

              <Text style={{ fontWeight: '600' }}>Client Name</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 8 }}
                placeholder="Enter client name (optional)"
                value={manualName}
                onChangeText={setManualName}
              />

              <Text style={{ fontWeight: '600' }}>Client Number</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 20, borderRadius: 8 }}
                placeholder="Enter client number"
                value={manualNumber}
                onChangeText={setManualNumber}
                keyboardType="phone-pad"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 10, flex: 1, alignItems: 'center' }}
                  onPress={() => logCall('Business')}
                  disabled={isLogging}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 17 }}>Business</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ backgroundColor: '#888', padding: 14, borderRadius: 10, flex: 1, alignItems: 'center' }}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 17 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ClientProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </ClientProvider>
    </LanguageProvider>
  );
}