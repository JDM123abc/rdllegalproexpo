import { useState, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { useCallContext } from '../contexts/CallContext';

export const useOutgoingCallLogger = () => {
  const { setIgnoreNextCall } = useCallContext();
  const [selectedContact, setSelectedContact] = useState<{ name: string; number: string } | null>(null);
  const justPickedContact = useRef(false);

  const pickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }

    justPickedContact.current = true;
    console.log('[Outgoing] Opening contact picker...');

    try {
      const result = await Contacts.presentContactPickerAsync();
      justPickedContact.current = false;

      if (!result || !result.phoneNumbers?.[0]) {
        console.log('[Outgoing] No contact selected');
        return;
      }

      const name = result.name || 'Unknown';
      const number = result.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
      setSelectedContact({ name, number });

      // Protection after picking contact (like old working version)
      console.log('[Outgoing] Contact picked → starting protection');
      setIgnoreNextCall(true);
      setTimeout(() => {
        setIgnoreNextCall(false);
        console.log('[Outgoing] Contact protection ended');
      }, 7000);

    } catch (e) {
      justPickedContact.current = false;
    }
  };

  const makeCall = () => {
    if (!selectedContact) return;

    console.log('[Outgoing] Make Call pressed');
    Linking.openURL(`tel:${selectedContact.number}`);
  };

  return {
    selectedContact,
    setSelectedContact,
    pickContact,
    makeCall,
  };
};