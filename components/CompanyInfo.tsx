import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type Props = {
  companyName: string;
  address: string;
  phone1: string;
  phone2: string;
  email: string;
};

export default function CompanyInfo({ companyName, address, phone1, phone2, email }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  return (
    <View style={styles.infoBox}>
      <Text style={styles.companyName}>{companyName || "Company Name"}</Text>
      <Text style={styles.invoiceNumber}>Invoice-01</Text>

      <View style={styles.details}>
        <Text style={styles.label}>Address: <Text style={styles.value}>{address || "—"}</Text></Text>
        <Text style={styles.label}>Tel: <Text style={styles.value}>
          {phone1 || phone2 ? `${phone1} ${phone2 ? `/ ${phone2}` : ''}` : "—"}
        </Text></Text>
        <Text style={styles.label}>E-mail: <Text style={styles.value}>{email || "—"}</Text></Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  companyName: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  invoiceNumber: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#007AFF', marginBottom: 20 },
  details: { marginTop: 10 },
  label: { fontSize: 16, marginBottom: 6, color: '#333' },
  value: { color: '#007AFF' },
});