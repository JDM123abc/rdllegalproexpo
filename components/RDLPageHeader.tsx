import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type Props = {
  showSlogan?: boolean;
  compact?: boolean;
};

export default function RDLPageHeader({ showSlogan = true, compact = false }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.title}>
        {isEnglish ? "RDL Legal Pro" : "RDL Regs Pro"}
      </Text>

      {showSlogan && (
        <Text style={styles.slogan}>
          {isEnglish ? "Track Time. Bill Smarter." : "Volg Tyd. Faktureer Slimmer."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 10 : 0,   // ← Higher on mobile
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  compact: {
    paddingTop: Platform.OS === 'web' ? 6 : 2,
    paddingBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  slogan: {
    fontSize: 14,
    color: '#555',
    marginTop: 3,
    textAlign: 'center',
  },
});