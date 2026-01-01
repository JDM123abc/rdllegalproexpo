import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}