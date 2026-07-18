import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../app/contexts/LanguageContext';
import { useClient } from '../app/contexts/ClientContext';

type Props = {
  onPress: () => void;
};

export default function ClientSelector({ onPress }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';
  const { selectedClientName, businessTotal } = useClient();

  return (
    <TouchableOpacity style={styles.clientSelector} onPress={onPress}>
      <Text style={styles.clientLabel}>
        {isEnglish ? "Invoice Addressee (from Caller list)" : "Faktuur Adressee (van Oproeper lys)"}
      </Text>
      <View style={styles.selectedClientBox}>
        <Text style={styles.selectedText}>
          {selectedClientName || (isEnglish ? "Tap to choose from caller list" : "Tik om uit oproeperlys te kies")}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#007AFF" />
      </View>
      {businessTotal > 0 && (
        <Text style={{ color: '#d32f2f', fontWeight: '600', marginTop: 4 }}>
          📞 {isEnglish ? "Business Calls:" : "Besigheid Oproepe:"} R {businessTotal.toFixed(2)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  clientSelector: { marginBottom: 20, backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db' },
  clientLabel: { fontSize: 16, fontWeight: '600', color: '#007AFF', marginBottom: 6 },
  selectedClientBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: 14, borderRadius: 8 },
  selectedText: { fontSize: 16, color: '#1f2937', flex: 1 },
});