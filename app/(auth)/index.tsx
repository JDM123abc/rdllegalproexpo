import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../contexts/LanguageContext';
import { Platform as RNPlatform } from 'react-native';
import RDLHeaderLogo from '../../components/RDLHeaderLogo';
import { showAuthMessage } from '../../components/AuthMessage';

export default function Login() {
  const { lang, setLang } = useLang();
  const isEnglish = lang === 'en';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const authInstance = getAuth();
  const db = getFirestore();

  // Force fresh login on mobile
  useEffect(() => {
    const forceFreshLogin = async () => {
      if (RNPlatform.OS !== 'web') {
        try {
          if (authInstance.currentUser) {
            console.log("Mobile: Forcing sign out for fresh login");
            await signOut(authInstance);
          }
        } catch (e) {
          console.log("Force logout error", e);
        }
      }
    };
    forceFreshLogin();
  }, []);

  const handleAuth = async () => {
    const cleanedTenantId = tenantId.trim();
    const cleanedEmail = email.trim();

    if (!cleanedTenantId) {
      Alert.alert(isEnglish ? 'Error' : 'Fout', isEnglish ? 'Please enter Firm ID' : 'Voer asseblief Firma ID in');
      return;
    }
    if (!cleanedEmail || !password.trim()) {
      Alert.alert(isEnglish ? 'Error' : 'Fout', isEnglish ? 'Please enter email and password' : 'Voer asseblief e-pos en wagwoord in');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        // === OWNER REGISTRATION ===
        const userCredential = await createUserWithEmailAndPassword(authInstance, cleanedEmail, password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, `tenants/${cleanedTenantId}`), {
          tenantId: cleanedTenantId,
          createdAt: new Date(),
          ownerUid: uid
        });

        await setDoc(doc(db, `users/${uid}`), {
          email: cleanedEmail,
          tenantId: cleanedTenantId,
          role: 'owner',
          createdAt: new Date()
        }, { merge: true });

        showAuthMessage(isEnglish, 'register-success');
        router.replace('/(app)');

      } else {
        // === LOGIN (Updated) ===
        await signInWithEmailAndPassword(authInstance, cleanedEmail, password);
        const uid = authInstance.currentUser?.uid;

        // Check if user belongs to this tenant
        const userDoc = await getDoc(doc(db, `users/${uid}`));

        if (!userDoc.exists() || userDoc.data()?.tenantId !== cleanedTenantId) {
          await authInstance.signOut();
          Alert.alert(
            isEnglish ? 'Error' : 'Fout', 
            isEnglish ? 'Invalid credentials or wrong Firm ID' : 'Ongeldige besonderhede of verkeerde Firma ID'
          );
          setIsLoading(false);
          return;
        }

        showAuthMessage(isEnglish, 'login-success');
        router.replace('/(app)');
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        showAuthMessage(isEnglish, 'email-exists');
      } else {
        showAuthMessage(isEnglish, 'error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 480 }}>
        
          {/* === RDL SHIELD LOGO === */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <RDLHeaderLogo size={95} />
          </View>
          
          <Text style={styles.appTitle}>
            {isEnglish ? "RDL Legal Pro" : "RDL Regs Pro"}
          </Text>

          {/* Language Toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: '#E5E5E5', borderRadius: 999, padding: 4, marginBottom: 20, width: '80%', alignSelf: 'center' }}>
            <TouchableOpacity 
              onPress={() => setLang('en')} 
              style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: isEnglish ? '#007AFF' : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '600', color: isEnglish ? 'white' : '#666' }}>ENG</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setLang('af')} 
              style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: !isEnglish ? '#007AFF' : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '600', color: !isEnglish ? 'white' : '#666' }}>AFR</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.slogan}>
            {isEnglish ? "Track Time. Bill Smarter." : "Volg Tyd. Faktureer Slimmer."}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister ? (isEnglish ? "Register" : "Registreer") : (isEnglish ? "Login" : "Meld aan")}
          </Text>

          {/* Firm ID */}
          <Text style={{ fontWeight: '600', marginBottom: 4, color: '#333' }}>
            {isEnglish ? "Firm ID" : "Firma ID"}
          </Text>
          <TextInput 
            style={styles.input} 
            placeholder={isEnglish ? "e.g. Firma-abc" : "bv. Firma-abc"} 
            value={tenantId} 
            onChangeText={setTenantId} 
            autoCapitalize="none" 
          />

          {/* Email */}
          <Text style={{ fontWeight: '600', marginBottom: 4, color: '#333' }}>
            {isEnglish ? "Email" : "E-pos"}
          </Text>
          <TextInput 
            style={styles.input} 
            placeholder={isEnglish ? "your@email.com" : "jou@epos.com"} 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />

          {/* Password */}
          <Text style={{ fontWeight: '600', marginBottom: 4, color: '#333' }}>
            {isEnglish ? "Password" : "Wagwoord"}
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder={isEnglish ? "Enter password" : "Voer wagwoord in"} 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{
              backgroundColor: isLoading ? '#666' : isRegister ? '#FF3B30' : '#007AFF',
              paddingVertical: 14,
              borderRadius: 8,
              marginTop: 10,
            }}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                {isRegister 
                  ? (isEnglish ? "Create Account" : "Skep Rekening") 
                  : (isEnglish ? "Login" : "Meld aan")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsRegister(!isRegister)}
            style={{ padding: 12, alignItems: 'center', marginTop: 15 }}
          >
            <Text style={{ color: '#007AFF', fontWeight: '600' }}>
              {isRegister 
                ? (isEnglish ? "Already have an account? Login" : "Reeds 'n rekening? Meld aan") 
                : (isEnglish ? "Need an account? Register" : "Nie 'n rekening nie? Registreer")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  appTitle: { 
    fontSize: 30, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#007AFF',
    marginBottom: 8 
  },
  slogan: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 15, color: '#333' },
  subtitle: { fontSize: 26, textAlign: 'center', marginBottom: 25 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 12, 
    marginBottom: 15, 
    borderRadius: 8, 
    width: '100%' 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    marginBottom: 15, 
    paddingRight: 10, 
    width: '100%' 
  },
  passwordInput: { flex: 1, padding: 12 },
  eyeIcon: { padding: 10 },
});