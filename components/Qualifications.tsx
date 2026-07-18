import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type Props = {
  qualifications: string;
};

export default function Qualifications({ qualifications }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  return (
    <View style={styles.qualBox}>
      <Text style={styles.qualTitle}>Partners & Qualifications</Text>
      <Text style={styles.qualText}>
        {qualifications || (isEnglish ? "Add qualifications in Profile tab" : "Voeg kwalifikasies by in Profiel")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  qualBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 10, color: '#007AFF' },
  qualText: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', lineHeight: 22 },
});