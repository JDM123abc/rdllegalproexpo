import { useState, useRef, useEffect } from 'react';
import { AppState, Alert, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { getFirestore, collection, addDoc, Timestamp } from '@react-native-firebase/firestore';
import { useCallContext } from '../contexts/CallContext';

export const useCallLogger = (tenantId: string, isEnglish: boolean) => {
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

  // Detect Call End
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[CallLogger] AppState change:', nextAppState, 'ignoreRef:', ignoreNextCallRef.current);

      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        callStartTime.current = Date.now();
        callProcessed.current = false;
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (ignoreNextCallRef.current) {
          console.log('[CallLogger] IGNORING via context ref');
          callStartTime.current = null;
          callProcessed.current = true;
          setIgnoreNextCall(false);
          return;
        }

        if (callStartTime.current && !callProcessed.current) {
          const endTime = Date.now();
          const diffMs = endTime - callStartTime.current;
          const totalSeconds = Math.floor(diffMs / 1000);

          if (totalSeconds >= 5) {
            console.log('[CallLogger] SHOWING modal - duration:', totalSeconds);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            setCurrentDuration(formatted);

            if (Platform.OS !== 'web') {
              setModalVisible(true);
            }
          }

          callStartTime.current = null;
          callProcessed.current = true;
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

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

  const logCall = async (type: 'Business' | 'Private', direction: 'Incoming' | 'Outgoing' = 'Incoming') => {
    if (isLogging || !tenantId) return;

    setIsLogging(true);

    try {
      const logData = {
        contactName: manualName || `Unknown ${direction}`,
        contactNumber: manualNumber || 'Unknown',
        duration: currentDuration,
        callType: type,
        direction: direction,
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${tenantId}/calls`), logData);

      Alert.alert(
        isEnglish ? 'Saved!' : 'Gestoor!',
        isEnglish 
          ? `Call logged as ${type} (${direction})` 
          : `Oproep gelog as ${type === 'Business' ? 'Besigheid' : 'Privaat'} (${direction})`
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