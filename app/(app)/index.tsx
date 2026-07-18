import {
  View,
  Text,
  Alert,
  Linking,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { getAuth } from '@react-native-firebase/auth';
import { signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, addDoc, Timestamp, doc, getDoc } from '@react-native-firebase/firestore';
import { useLang } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import RDLPageHeader from '../../components/RDLPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { webLogout } from '../../components/web-logout';
import { Ionicons } from '@expo/vector-icons';
import { useCallContext } from '../../contexts/CallContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const navigation = useNavigation();

  const { 
    setJustPickedContact, 
    setCallInProgress, 
    resetCallState,
    justPickedContactRef,
    callInProgress
  } = useCallContext();

  const [tenantId, setTenantId] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [currentDuration, setCurrentDuration] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [outgoingCallThreshold, setOutgoingCallThreshold] = useState(0);

  const getRoleLabel = (role) => {
    if (role === 'employee') return isEnglish ? 'Employee' : 'Werknemer';
    if (role === 'partner') return isEnglish ? 'Partner' : 'Vennoot';
    if (role === 'owner') return isEnglish ? 'Owner' : 'Eienaar';
    return role;
  };

  const pulseSelect = useRef(new Animated.Value(1)).current;
  const pulseCall = useRef(new Animated.Value(1)).current;
  const callStartTime = useRef(null);
  const appState = useRef(AppState.currentState);

  const authInstance = getAuth();
  const db = getFirestore();

  // Load Outgoing Call Threshold
  useEffect(() => {
    const loadOutgoingThreshold = async () => {
      try {
        const saved = await AsyncStorage.getItem('outgoingCallThreshold');
        if (saved !== null) {
          setOutgoingCallThreshold(parseInt(saved));
        }
      } catch (e) {}
    };
    loadOutgoingThreshold();
  }, []);

  const saveOutgoingThreshold = async (value: number) => {
    try {
      await AsyncStorage.setItem('outgoingCallThreshold', value.toString());
      setOutgoingCallThreshold(value);
    } catch (e) {}
  };

  // Set bilingual tab title
  useEffect(() => {
    navigation.setOptions({
      title: isEnglish ? "Home" : "Tuis",
    });
  }, [isEnglish]);

  // Load Tenant ID + Role + Name
  useFocusEffect(useCallback(() => {
    const loadTenantId = async () => {
      const user = authInstance.currentUser;
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data?.tenantId) setTenantId(data.tenantId);
          setUserRole(data?.role || '');
          setUserName(data?.name || '');
        }
      } catch (e) {}
    };
    loadTenantId();
  }, []));

useFocusEffect(
  useCallback(() => {
    const selectAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSelect, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseSelect, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    selectAnim.start();

    const callAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseCall, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseCall, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    callAnim.start();

    return () => {
      selectAnim.stop();
      callAnim.stop();
    };
  }, [])
);

  const pickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }

    setJustPickedContact(true);

    try {
      const result = await Contacts.presentContactPickerAsync();

      setTimeout(() => {
        setJustPickedContact(false);
      }, 12000);

      if (!result || !result.phoneNumbers?.[0]) return;

      const name = result.name || 'Unknown';
      const number = result.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
      setSelectedContact({ name, number });

    } catch (e) {
      setJustPickedContact(false);
    }
  };

  const makeCall = () => {
    if (!selectedContact) return;

    setJustPickedContact(false);
    setCallInProgress(true);
    callStartTime.current = Date.now();

    (global as any).selectedContactForCall = selectedContact;
    Linking.openURL(`tel:${selectedContact.number}`);
  };

  // AppState listener for outgoing call logging
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (!justPickedContactRef.current && selectedContact) {
          callStartTime.current = Date.now();
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (justPickedContactRef.current) {
          callStartTime.current = null;
          return;
        }

        if (callStartTime.current && selectedContact) {
          const endTime = Date.now();
          const diffMs = endTime - callStartTime.current;
          const totalSeconds = Math.floor(diffMs / 1000);

          if (totalSeconds >= outgoingCallThreshold && callInProgress) {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            setCurrentDuration(formatted);

            if (selectedContact) {
              setManualName(selectedContact.name || '');
              setManualNumber(selectedContact.number || '');
            }

            setModalVisible(true);
            setCallInProgress(false);
          }
          callStartTime.current = null;
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [selectedContact, callInProgress, outgoingCallThreshold]);

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
    if (!tenantId) {
      Alert.alert('Error', isEnglish ? 'Company ID not loaded yet.' : 'Firma ID nie gelaai nie.');
      return;
    }

    setIsLogging(true);

    try {
      const logData = {
        contactName: manualName || selectedContact?.name || 'Unknown',
        contactNumber: manualNumber || selectedContact?.number || 'Unknown',
        duration: currentDuration,
        callType: type,
        direction: selectedContact ? 'Outgoing' : 'Incoming',
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${tenantId}/calls`), logData);

      Alert.alert(
        isEnglish ? 'Saved!' : 'Gestoor!',
        isEnglish 
          ? `Call logged as ${type}` 
          : `Oproep gelog as ${type === 'Business' ? 'Besigheid' : 'Privaat'}`
      );
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Unknown error');
    } finally {
      setIsLogging(false);
      setModalVisible(false);
      setManualName('');
      setManualNumber('');
      setCurrentDuration('');
      setSelectedContact(null);
      resetCallState();
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      isEnglish ? 'Logout' : 'Teken Uit',
      isEnglish ? 'Are you sure?' : 'Is jy seker?',
      [
        { text: isEnglish ? 'Cancel' : 'Kanselleer', style: 'cancel' },
        {
          text: isEnglish ? 'Logout' : 'Teken Uit',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(authInstance);
              router.replace('/(auth)');
            } catch {
              router.replace('/(auth)');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RDLPageHeader />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 0, alignItems: 'center', paddingBottom: 100 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignItems: 'center', paddingHorizontal: 20 }}>
          
          {/* Firm ID + Name/Role */}
          {tenantId && (
            <View style={{ marginBottom: 25, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#666', fontWeight: '500', marginBottom: 2 }}>
                {isEnglish ? 'Firm ID' : 'Firma ID'}
              </Text>
              <Text style={{ fontSize: 17, color: '#007AFF', fontWeight: 'bold' }}>
                {tenantId}
              </Text>

              <Text style={{ fontSize: 16, color: '#333', fontWeight: '600', marginTop: 6 }}>
                {userRole === 'owner' 
                  ? `(${getRoleLabel(userRole)}${userName ? ' - ' + userName : ''})`  
                  : userName 
                    ? `(${getRoleLabel(userRole)} - ${userName})` 
                    : `(${getRoleLabel(userRole)})`}
              </Text>
            </View>
          )}

          {/* ==================== OUTGOING CALL SENSITIVITY SETTING ==================== */}
          <View style={{ width: '100%', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 }}>
              {isEnglish ? "Outgoing Call Sensitivity" : "Uitgaande Oproep Sensitiwiteit"}
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              {isEnglish 
                ? "Ignore calls shorter than:" 
                : "Ignoreer oproepe korter as:"}
            </Text>

            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              backgroundColor: '#f8f9fa',
              borderRadius: 10,
              padding: 4
            }}>
              {[0, 15, 30, 60, 120].map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  onPress={() => saveOutgoingThreshold(seconds)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    backgroundColor: outgoingCallThreshold === seconds ? '#007AFF' : 'transparent',
                    borderRadius: 8,
                    marginHorizontal: 2,
                  }}
                >
                  <Text style={{
                    color: outgoingCallThreshold === seconds ? 'white' : '#333',
                    fontWeight: '600',
                    fontSize: 13
                  }}>
                    {seconds === 0 ? '0s' : `${seconds}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Select Contact Button */}
          {!selectedContact && (
            <Animated.View style={[styles.pulsingWrapper, { transform: [{ scale: pulseSelect }] }]}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.alert(
                      isEnglish 
                        ? "The Caller function is only available on the mobile app.\n\nPlease open this app on your phone."
                        : "Die Oproeper funksie is slegs beskikbaar op die selfoon app.\n\nMaak asseblief hierdie app op jou foon oop."
                    );
                    return;
                  }
                  pickContact();
                }}
                style={{ backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#000' }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  {isEnglish ? "Select Contact" : "Kies Kontak"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {!selectedContact && <View style={{ height: 25 }} />}

          {/* Make Call Button */}
          {selectedContact && (
            <Animated.View style={[styles.pulsingWrapper, { transform: [{ scale: pulseCall }] }]}>
              <TouchableOpacity
                onPress={makeCall}
                style={{ backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  {isEnglish ? "Make Call" : "Maak Oproep"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {selectedContact && (
            <Text style={{ marginTop: 40, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#007AFF' }}>
              {isEnglish ? `Ready to call:\n${selectedContact.name}\n(${selectedContact.number})` : `Gereed om te bel:\n${selectedContact.name}\n(${selectedContact.number})`}
            </Text>
          )}

          {selectedContact && (
            <TouchableOpacity 
              onPress={() => setSelectedContact(null)}
              style={{ 
                marginTop: 15, 
                padding: 10, 
                backgroundColor: '#FF3B30', 
                borderRadius: 8, 
                flexDirection: 'row', 
                alignItems: 'center',
                gap: 6
              }}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {isEnglish ? "Reset / Clear Contact" : "Herstel / Verwyder Kontak"}
              </Text>
            </TouchableOpacity>
          )}

          {/* ==================== MANAGE TEAM BUTTON (Moved lower) ==================== */}
          {userRole === 'owner' && (
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#34C759', 
                paddingVertical: 14, 
                borderRadius: 10, 
                width: '100%', 
                marginTop: 30,
                marginBottom: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#000'
              }}
              onPress={() => router.push('/(app)/manage-team')}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                {isEnglish ? "Manage Team" : "Bestuur Span"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS === 'web') webLogout();
              else handleLogout();
            }}
            style={{ backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 8, width: '100%', borderWidth: 1, borderColor: '#000' }}
          >
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
              {isEnglish ? 'Logout' : 'Teken Uit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Call Log Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxWidth: 420 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
              {isEnglish ? "Call Complete" : "Oproep Voltooi"}
            </Text>
            <Text style={{ marginBottom: 20, textAlign: 'center' }}>
              {isEnglish ? "Duration:" : "Duur:"} {currentDuration}
            </Text>

            <TouchableOpacity 
              onPress={pickCallerFromContacts}
              style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, marginBottom: 20 }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 17, textAlign: 'center' }}>
                {isEnglish ? "📱 Select from Contacts" : "📱 Kies uit Kontakte"}
              </Text>
            </TouchableOpacity>

            <Text style={{ fontWeight: 'bold' }}>{isEnglish ? "Client Name" : "Kliënt Naam"}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 }}
              placeholder={isEnglish ? "Enter client name (optional)" : "Voer kliënt naam in (opsioneel)"}
              value={manualName}
              onChangeText={setManualName}
            />

            <Text style={{ fontWeight: 'bold' }}>{isEnglish ? "Client Number (optional)" : "Kliënt Nommer (opsioneel)"}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 }}
              placeholder={isEnglish ? "Enter client number" : "Voer kliënt nommer in"}
              value={manualNumber}
              onChangeText={setManualNumber}
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' }}
                onPress={() => logCall('Business')}
                disabled={isLogging}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {isEnglish ? "Business" : "Besigheid"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ backgroundColor: '#888', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {isEnglish ? "Cancel" : "Kanselleer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pulsingWrapper: {
    width: '100%',
    borderWidth: 3,
    borderRadius: 12,
    padding: 3,
    borderColor: '#FFD700',
  },
});