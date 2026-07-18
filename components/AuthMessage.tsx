import { Alert, Platform } from 'react-native';

export const showAuthMessage = (
  isEnglish: boolean, 
  type: 'login-success' | 'register-success' | 'email-exists' | 'error', 
  customMessage?: string
) => {
  if (type === 'email-exists') {
    const title = isEnglish ? 'Account Already Exists' : 'Rekening Bestaan Reeds';
    const msg = isEnglish 
      ? 'This email is already registered. Please login instead, or register new with a different email.' 
      : 'Hierdie e-pos is reeds geregistreer. Meld asseblief aan, of registreer nuut, met \'n ander e-pos.';

    if (Platform.OS === 'web') {
      window.alert(title + '\n\n' + msg);
    } else {
      Alert.alert(title, msg);
    }
  } 
  else if (type === 'login-success') {
    if (Platform.OS === 'web') {
      window.alert(isEnglish ? 'Logged in!' : 'Aangemeld!');
    } else {
      Alert.alert(isEnglish ? 'Success' : 'Sukses', isEnglish ? 'Logged in!' : 'Aangemeld!');
    }
  } 
  else if (type === 'register-success') {
    Alert.alert(
      isEnglish ? 'Success' : 'Sukses', 
      isEnglish ? 'Account created!' : 'Rekening geskep!'
    );
  } 
  else if (type === 'error') {
    Alert.alert(isEnglish ? 'Error' : 'Fout', customMessage || 'Something went wrong');
  }
};