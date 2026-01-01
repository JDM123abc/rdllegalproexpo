import {
  View,
  Text,
  Alert,
  Linking,
  AppState,
  Animated,
  TouchableOpacity,
  Button,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Contacts from 'expo-contacts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function Home() {
  const appState = useRef(AppState.currentState);
  const callStartTime = useRef<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ name: string; number: string } | null>(null);
  const justPickedContact = useRef(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [currentDuration, setCurrentDuration] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const pulseSelect = useRef(new Animated.Value(1)).current;
  const pulseCall = useRef(new Animated.Value(1)).current;

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

  const pickContactForModal = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }

    try {
      const result = await Contacts.presentContactPickerAsync();

      if (!result || !result.phoneNumbers?.[0]) return;

      const name = result.name || 'Unknown';
      const number = result.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
      setManualName(name);
      setManualNumber(number);
    } catch (e) {
      // silent
    }
  };

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
      Alert.alert('Contact Selected', `${name}\n${number}`);
    } catch (e) {
      justPickedContact.current = false;
    }
  };

  const makeCall = () => {
    if (!selectedContact) return;
    callStartTime.current = Date.now();
    Linking.openURL(`tel:${selectedContact.number}`);
  };

  const logCall = async (type: 'Business' | 'Private') => {
    if (isLogging) return;
    setIsLogging(true);

    console.log('=== LOG CALL START ===');

    try {
      const isOutgoing = !!selectedContact;
      const logData = {
        contactName: manualName || (isOutgoing ? selectedContact?.name || 'Outgoing Call' : 'Incoming Call'),
        contactNumber: manualNumber || (isOutgoing ? selectedContact?.number || 'Unknown' : 'Unknown'),
        duration: currentDuration,
        callType: type,
        direction: isOutgoing ? 'Outgoing' : 'Incoming',
        timestamp: serverTimestamp()
      };

      console.log('Data to save:', logData);

      const docRef = await addDoc(collection(db, 'calls'), logData);
      console.log('SUCCESS: Document written with ID:', docRef.id);

      Alert.alert('Saved!', `Call logged as ${type}`);
    } catch (e: any) {
      console.error('FIRESTORE ERROR:', e);
      Alert.alert('Save Failed', `Error: ${e.message || 'Unknown'}`);
    } finally {
      setIsLogging(false);
      setModalVisible(false);
      setManualName('');
      setManualNumber('');
      setCurrentDuration('');
      setSelectedContact(null);
    }

    console.log('=== LOG CALL END ===');
  };

  const showCallLogModal = (formatted: string) => {
    const isOutgoing = !!selectedContact;
    setCurrentDuration(formatted);
    setManualName(isOutgoing ? selectedContact?.name || '' : '');
    setManualNumber(isOutgoing ? selectedContact?.number || '' : '');
    setModalVisible(true);
  };

  useEffect(() => {
    const subscription = AppState.addEventEmitter('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (!justPickedContact.current && !callStartTime.current) {
          callStartTime.current = Date.now();
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (callStartTime.current && !justPickedContact.current) {
          const endTime = Date.now();
          const diffMs = endTime - callStartTime.current;
          const totalSeconds = Math.floor(diffMs / 1000);

          if (totalSeconds < 5) {
            callStartTime.current = null;
            return;
          }

          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          showCallLogModal(formatted);
          callStartTime.current = null;
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

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Call Complete</Text>
            <Text style={{ marginBottom: 20 }}>Duration: {currentDuration}</Text>

            <Button title="Pick from Contacts" onPress={pickContactForModal} color="#007AFF" />

            <View style={{ height: 10 }} />

            <Text style={{ fontWeight: 'bold' }}>Client Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 }}
              placeholder="Enter client name (optional)"
              value={manualName}
              onChangeText={setManualName}
            />

            <Text style={{ fontWeight: 'bold' }}>Client Number (optional)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 }}
              placeholder="Enter client number"
              value={manualNumber}
              onChangeText={setManualNumber}
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <Button title="Business" onPress={() => logCall('Business')} disabled={isLogging} />
              <Button title="Private" onPress={() => logCall('Private')} disabled={isLogging} />
              <Button title="Cancel" onPress={() => {
                setModalVisible(false);
                setSelectedContact(null);
              }} color="gray" />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}