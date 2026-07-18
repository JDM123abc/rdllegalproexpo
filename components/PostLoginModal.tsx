import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Clipboard,
} from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type PostLoginModalProps = {
  visible: boolean;
  onClose: () => void;
  tenantId: string;
  isOwner: boolean;
};

export default function PostLoginModal({ visible, onClose, tenantId, isOwner }: PostLoginModalProps) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const copyFirmId = async () => {
    await Clipboard.setString(tenantId);
    Alert.alert(
      isEnglish ? 'Copied!' : 'Gekopieer!',
      isEnglish ? 'Firm ID copied to clipboard' : 'Firma ID na knipbord gekopieer'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 12, width: '90%', alignItems: 'center' }}>
          
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            {isEnglish ? "Welcome back" : "Welkom terug"}
          </Text>

          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 30 }}>
            {isEnglish ? "Gereed om oproepe te log?" : "Gereed om oproepe te log?"}
          </Text>

          {/* Main Action Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#007AFF',
              paddingVertical: 16,
              paddingHorizontal: 40,
              borderRadius: 10,
              width: '100%',
              marginBottom: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
              {isEnglish ? "Go to Caller Page" : "Gaan na Oproep Bladsy"}
            </Text>
          </TouchableOpacity>

          {/* Owner Section */}
          {isOwner && tenantId && (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                {isEnglish ? "Your Firm ID" : "Jou Firma ID"}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginBottom: 15 }}>
                {tenantId}
              </Text>

              <TouchableOpacity onPress={copyFirmId} style={{ padding: 12 }}>
                <Text style={{ color: '#007AFF', fontWeight: '600' }}>
                  {isEnglish ? "Copy Firm ID" : "Kopieer Firma ID"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}