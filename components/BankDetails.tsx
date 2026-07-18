import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type Props = {
  bankName: string;
  branchCode: string;
  accountNumber: string;
  fullPaymentRef: string;
};

export default function BankDetails({ bankName, branchCode, accountNumber, fullPaymentRef }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  return (
    <View style={styles.bankBox}>
      <Text style={styles.bankTitle}>Our banking details for direct payments:</Text>
      <Text style={styles.bankText}>Bank: <Text style={styles.value}>{bankName || "—"}</Text></Text>
      <Text style={styles.bankText}>Branch Code: <Text style={styles.value}>{branchCode || "—"}</Text></Text>
      <Text style={styles.bankText}>Account Number: <Text style={styles.value}>{accountNumber || "—"}</Text></Text>
      <Text style={{ fontSize: 15, color: '#007AFF', textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
        Full Ref: <Text style={{ fontWeight: 'bold' }}>{fullPaymentRef}</Text>
      </Text>
      <Text style={styles.bankText}>Invoice provided without prejudice to rights.</Text>
      <Text style={styles.bankText}>The firm reserves the right to make corrections.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bankBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bankTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: '#007AFF' },
  bankText: { fontSize: 16, marginBottom: 8, color: '#333', textAlign: 'center' },
  value: { color: '#007AFF' },
});