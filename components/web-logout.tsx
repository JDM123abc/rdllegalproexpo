import { Platform } from 'react-native';
import { signOut, getAuth } from '@react-native-firebase/auth';
import { router } from 'expo-router';

export const webLogout = () => {
  console.log("🔥 webLogout called, platform:", Platform.OS);
  if (Platform.OS !== 'web') return;

  const confirmed = window.confirm('Are you sure you want to logout?');
  console.log("🪟 window.confirm result:", confirmed);

  if (confirmed) {
    console.log("🚪 CONFIRM clicked");
    (async () => {
      try {
        const auth = getAuth();
        console.log("Current user:", auth.currentUser);
        await signOut(auth);
        console.log("✅ signOut done");
      } catch (e) {
        console.error("❌ signOut error:", e);
      }
      console.log("➡️ router.replace('/(auth)')");
      router.replace('/(auth)');
      console.log("✅ Done");
    })();
  } else {
    console.log("❌ Cancelled");
  }
};