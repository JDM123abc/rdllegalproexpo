import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import RDLHeaderLogo from './RDLHeaderLogo';
import { useLang } from '../app/contexts/LanguageContext';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

type Props = {
  title: string;
};

export default function HeaderWithLogo({ title }: Props) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const [firmName, setFirmName] = useState('');

  useEffect(() => {
    const loadFirm = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists() && userDoc.data()?.tenantId) {
          const tid = userDoc.data().tenantId;
          setFirmName(tid);
        }
      } catch (e) {
        console.log("Header firm load error", e);
      }
    };

    loadFirm();
  }, []);

  return (
    <View style={styles.container}>
      <RDLHeaderLogo size={28} />
      <Text style={styles.title}>
        {title}: {firmName || 'Loading...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Platform.OS === 'web' ? -30 : -12,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
});