import {
  View,
  Text,
  Alert,
  Linking,
  AppState,
  Animated,
  TouchableOpacity,
  Button
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Contacts from 'expo-contacts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function Home() {
  const appState = useRef(AppState.currentState);
  const callStartTime = useRef<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ name: string; number: string } | null>(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const justPickedContact = useRef(false);

  const pulseSelect = useRef(new Animated.Value(1)).current;
  const pulseCall = useRef(new Animated.Value(1)).current;

  // Pulse Select Contact when no contact selected
  useEffect(() => {
    if (!selectedContact) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseSelect, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseSelect, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseSelect.setValue(1);
    }
  }, [selectedContact]);

  // Pulse Make Call only when contact selected and no active call
  useEffect(() => {
    if (selectedContact && callStartTime.current === null) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseCall, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseCall, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseCall.setValue(1);
    }
  }, [selectedContact, callStartTime.current]);

  const pickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }

    justPickedContact.current = true;

    try {
      const result = await Contacts.presentContactPickerAsync();
      justPickedContact.current = false;

      if (!result || !result.phoneNumbers?.[0]) return;

      const name = result.name || 'Unknown';
      const number = result.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
      setSelectedContact({ name, number });
      setIsIncoming(false);
      Alert.alert('Contact Selected', `${name}\n${number}`);
    } catch (e) {
      justPickedContact.current = false;
    }
  };

  const makeCall = () => {
    if (!selectedContact) return;
    setIsIncoming(false);
    callStartTime.current = Date.now();
    Linking.openURL(`tel:${selectedContact.number}`);
  };

  const logCall = async (type: 'Business' | 'Private', formatted: string) => {
    console.log('=== LOG CALL START ===');
    console.log('Contact:', selectedContact ? selectedContact.name : 'Incoming');
    console.log('Number:', selectedContact ? selectedContact.number : 'Unknown');
    console.log('Duration:', formatted);
    console.log('Type:', type);

    try {
      const logData = {
        contactName: selectedContact ? selectedContact.name : (isIncoming ? 'Incoming Call' : 'Unknown'),
        contactNumber: selectedContact ? selectedContact.number : 'Unknown',
        duration: formatted,
        callType: type,
        timestamp: serverTimestamp()
      };

      console.log('Data to save:', logData);

      const docRef = await addDoc(collection(db, 'calls'), logData);
      console.log('SUCCESS: Document written with ID:', docRef.id);

      Alert.alert('Saved to Database', `Logged as ${type}\nCheck Firestore soon`);
    } catch (e: any) {
      console.error('FIRESTORE ERROR:', e);
      console.error('Error code:', e.code);
      console.error('Error message:', e.message);
      Alert.alert('Save Failed', `Error: ${e.message || 'Unknown'}`);
    }

    console.log('=== LOG CALL END ===');
  };

  const showCallLogAlert = (formatted: string) => {
    const name = selectedContact ? selectedContact.name : (isIncoming ? 'Incoming Call' : 'Unknown');
    const number = selectedContact ? selectedContact.number : 'Unknown';

    Alert.alert(
      'Call Complete',
      `Contact Name: ${name}\nContact Number: ${number}\nDuration: ${formatted}`,
      [
        { text: 'Business', onPress: () => logCall('Business', formatted) },
        { text: 'Private', onPress: () => logCall('Private', formatted) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );

    // Clear contact after popup so Select Contact pulses again
    setSelectedContact(null);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (!justPickedContact.current && !callStartTime.current) {
          callStartTime.current = Date.now();
          setIsIncoming(!selectedContact);
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (callStartTime.current && !justPickedContact.current) {
          const endTime = Date.now();
          const diffMs = endTime - callStartTime.current;
          const totalSeconds = Math.floor(diffMs / 1000);

          if (totalSeconds < 5) {
            callStartTime.current = null;
            setIsIncoming(false);
            return;
          }

          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          showCallLogAlert(formatted);
          callStartTime.current = null;
          setIsIncoming(false);
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [selectedContact]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 40, textAlign: 'center' }}>
        RDL Legal Pro - Running!
      </Text>

      <Animated.View style={{ transform: [{ scale: pulseSelect }] }}>
        <Button title="Select Contact" onPress={pickContact} color="#007AFF" />
      </Animated.View>

      <View style={{ height: 40 }} />

      <Animated.View style={{ transform: [{ scale: pulseCall }] }}>
        <TouchableOpacity
          onPress={makeCall}
          disabled={!selectedContact}
          style={{
            backgroundColor: selectedContact ? '#007AFF' : '#A0A0A0',
            paddingHorizontal: 40,
            paddingVertical: 15,
            borderRadius: 10,
            opacity: selectedContact ? 1 : 0.5
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            Make Call
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {selectedContact && (
        <Text style={{ marginTop: 30, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#007AFF' }}>
          Ready to call:\n{selectedContact.name}\n({selectedContact.number})
        </Text>
      )}
    </View>
  );
}