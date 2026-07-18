import { useState, useRef, useEffect } from 'react';
import { AppState, Alert, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { getFirestore, collection, addDoc, Timestamp } from '@react-native-firebase/firestore';
import { useCallContext } from '../contexts/CallContext';

export const useIncomingCallLogger = (tenantId: string, isEnglish: boolean) => {
  const { ignoreNextCallRef, setIgnoreNextCall } = useCallContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [currentDuration, setCurrentDuration] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const callStartTime = useRef<number | null>(null);
  const callProcessed = useRef(false);
  const appState = useRef(AppState.currentState);

  const db = getFirestore();

  // ==================== SMART CALL DETECTION WITH DETAILED LOGS ====================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousState = appState.current;
      console.log(`[Call] State Change: ${previousState} → ${nextAppState} | ignore: ${ignoreNextCallRef.current}`);

      // === BACKGROUND ===
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('[Call] → App went to BACKGROUND. Starting call timer...');
        callStartTime.current = Date.now();
        callProcessed.current = false;
      }

      // === FOREGROUND ===
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[Call] → App returned to FOREGROUND');

        if (ignoreNextCallRef.current) {
          console.log('[Call] IGNORED (protection still active)');
          callStartTime.current = null;
          callProcessed.current = true;
          setIgnoreNextCall(false);
          return;
        }

        if (callStartTime.current && !callProcessed.current) {
          const endTime = Date.now();
          const diffMs = endTime - callStartTime.current;
          const totalSeconds = Math.floor(diffMs / 1000);

          console.log(`[Call] Call duration calculated: ${totalSeconds} seconds`);

          if (totalSeconds >= 5) {
            console.log('[Call] ✅ Valid duration → Showing logging modal');
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            setCurrentDuration(formatted);
            if (Platform.OS !== 'web') {
              setModalVisible(true);
            }
          } else {
            console.log('[Call] ❌ Duration too short - skipping modal');
          }

          callStartTime.current = null;
          callProcessed.current = true;
        } else {
          console.log('[Call] No active timer found (possible false trigger)');
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // ==================== OTHER FUNCTIONS ====================
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

  const logCall = async (type: 'Business' | 'Private') => {
    if (isLogging || !tenantId) return;

    setIsLogging(true);

    try {
      const logData = {
        contactName: manualName || 'Unknown Incoming',
        contactNumber: manualNumber || 'Unknown',
        duration: currentDuration,
        callType: type,
        direction: 'Incoming',
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${tenantId}/calls`), logData);

      Alert.alert(
        isEnglish ? 'Saved!' : 'Gestoor!',
        isEnglish 
          ? `Incoming call logged as ${type}` 
          : `Inkomende oproep gelog as ${type === 'Business' ? 'Besigheid' : 'Privaat'}`
      );
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Unknown error');
    } finally {
      setIsLogging(false);
      setModalVisible(false);
      setManualName('');
      setManualNumber('');
      setCurrentDuration('');
    }
  };

  return {
    modalVisible,
    setModalVisible,
    manualName,
    setManualName,
    manualNumber,
    setManualNumber,
    currentDuration,
    isLogging,
    logCall,
    pickCallerFromContacts,
  };
};