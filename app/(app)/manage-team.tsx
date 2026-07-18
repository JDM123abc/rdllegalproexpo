import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Share, Animated, Easing, Platform, Linking } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { 
  collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc 
} from '@react-native-firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../contexts/LanguageContext';
import { useNavigation } from 'expo-router';
import { firebase } from '@react-native-firebase/app';

// ==================== SECONDARY FIREBASE APP (SAFE) ====================
let secondaryApp: any = null;
let secondaryAuth: any = null;

try {
  secondaryApp = firebase.app('Secondary');
} catch {
  try {
    const defaultApp = firebase.app();
    secondaryApp = firebase.initializeApp(
      {
        ...defaultApp.options,
        databaseURL: defaultApp.options.databaseURL || '',
      },
      'Secondary'
    );
  } catch (e) {
    console.log("Firebase not ready yet");
  }
}

if (secondaryApp) {
  secondaryAuth = getAuth(secondaryApp);
}
// ================================================================

export default function ManageTeam() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';
  
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: isEnglish ? "Manage Team" : "Bestuur Span",
    });
  }, [isEnglish]);

  const [team, setTeam] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('employee');
  const [myTenantId, setMyTenantId] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const db = getFirestore();
  const auth = getAuth();
  
  const currentUserId = auth.currentUser?.uid;

  // ==================== UPDATED PULSE ANIMATION (GENTLER ON WEB) ====================
  useEffect(() => {
    if (email.length > 0 && password.length > 0 && !hasShared) {
      const isWeb = Platform.OS === 'web';
      const scaleValue = isWeb ? 1.03 : 1.08;     // ← Much gentler on web
      const duration = isWeb ? 1000 : 800;

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: scaleValue,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [email, password, hasShared]);
  // ========================================================================

  const loadTeam = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDoc = await getDoc(doc(db, `users/${currentUser.uid}`));
    const tenantId = userDoc.data()?.tenantId || '';
    setMyTenantId(tenantId);

    const snap = await getDocs(
      query(collection(db, 'users'), where('tenantId', '==', tenantId))
    );
    setTeam(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = 'Firm-Java-';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

const shareToWhatsApp = async () => {
  if (!email || !password) {
    Alert.alert(
      isEnglish ? 'Error' : 'Fout',
      isEnglish ? 'Please enter email and password first' : 'Voer asseblief e-pos en wagwoord in'
    );
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const userDoc = await getDoc(doc(db, `users/${currentUser.uid}`));
  const tenantId = userDoc.data()?.tenantId || 'Firm-Java';

  const message = `Firm ID: ${tenantId}\nName: ${name || 'N/A'}\nEmail: ${email}\nPassword: ${password}\nRole: ${role}`;

  if (Platform.OS === 'web') {
    // WhatsApp Web
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedMessage}`;
    Linking.openURL(whatsappUrl);
    setHasShared(true);
  } else {
    // Mobile
    try {
      await Share.share({
        message: message,
        title: isEnglish ? 'Team Member Login Details' : 'Spanlid Aanmeld Besonderhede',
      });
      setHasShared(true);
    } catch (error) {
      Alert.alert(isEnglish ? 'Error' : 'Fout', 'Could not open share');
    }
  }
};

  const addMember = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Email and Password required');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        email, 
        password
      );
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email,
        role: role,
        tenantId: myTenantId,
        createdAt: new Date()
      });

      Alert.alert('Success', 'Member added successfully');

      await secondaryAuth.signOut();

      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      setHasShared(false);
      loadTeam();

    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'This email is already registered');
      } else {
        Alert.alert('Error', e.message);
      }
    }
  };

  const startEdit = (member) => {
    setEditingMember(member);
    setEditName(member.name || '');
    setEditRole(member.role || 'employee');
  };

  const saveEdit = async () => {
    if (!editingMember) return;

    try {
      await updateDoc(doc(db, 'users', editingMember.id), {
        name: editName.trim(),
        role: editRole,
      });
      Alert.alert(isEnglish ? 'Saved' : 'Gestoor', isEnglish ? 'Changes updated' : 'Veranderinge opgedateer');
      setEditingMember(null);
      setEditName('');
      setEditRole('employee');
      loadTeam();
    } catch (e: any) {
      Alert.alert(isEnglish ? 'Error' : 'Fout', e.message);
    }
  };

  const deleteMember = (member) => {
    Alert.alert(
      isEnglish ? 'Delete Member?' : 'Verwyder Lid?',
      `${isEnglish ? 'Remove' : 'Verwyder'} ${member.email}?`,
      [
        { text: isEnglish ? 'Cancel' : 'Kanselleer', style: 'cancel' },
        {
          text: isEnglish ? 'DELETE' : 'VERWYDER',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', member.id));
              Alert.alert(isEnglish ? 'Deleted' : 'Verwyder', isEnglish ? 'Member removed' : 'Lid verwyder');
              loadTeam();
            } catch (e: any) {
              Alert.alert(isEnglish ? 'Error' : 'Fout', e.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        {isEnglish ? "Manage Team" : "Bestuur Span"}
      </Text>

      {/* Team list */}
      {team.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          {team.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1 }}>
              <Text style={{ flex: 1 }}>
                {item.email} - {item.role}
              </Text>

              <TouchableOpacity onPress={() => startEdit(item)} style={{ marginRight: 12 }}>
                <Ionicons name="pencil" size={20} color="#007AFF" />
              </TouchableOpacity>

              {item.id !== currentUserId && (
                <TouchableOpacity onPress={() => deleteMember(item)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Edit form */}
      {editingMember && (
        <View style={{ 
          backgroundColor: '#f0f0f0', 
          padding: 15, 
          borderRadius: 8, 
          marginBottom: 15,
          borderColor: '#FFD700',
          borderWidth: 3,
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 12,
          elevation: 12,
        }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            {isEnglish ? "Editing:" : "Besig om te wysig:"} {editingMember.email}
          </Text>

          <Text style={{ fontWeight: '600', marginBottom: 4 }}>
            {isEnglish ? "Firm ID (Auto)" : "Firma ID (Outo)"}
          </Text>
          <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 16, marginBottom: 12, backgroundColor: '#fff', padding: 10, borderRadius: 6 }}>
            {myTenantId || 'Firm-Java'}
          </Text>

          <Text style={{ fontWeight: '600', marginBottom: 4 }}>
            {isEnglish ? "Name" : "Naam"}
          </Text>
          <TextInput
            placeholder={isEnglish ? "Enter name" : "Voer naam in"}
            value={editName}
            onChangeText={setEditName}
            style={{ borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 6, backgroundColor: 'white' }}
          />

          <Text style={{ fontWeight: '600', marginBottom: 4 }}>
            {isEnglish ? "Email" : "E-pos"}
          </Text>
          <Text style={{ backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 12, color: '#333' }}>
            {editingMember.email}
          </Text>

          <Text style={{ fontWeight: '600', marginBottom: 6 }}>
            {isEnglish ? "Role" : "Rol"}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
            {['employee', 'partner', 'owner'].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setEditRole(r)}
                style={{
                  flex: 1,
                  backgroundColor: editRole === r ? '#007AFF' : '#eee',
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: editRole === r ? 'white' : '#333', fontWeight: '600', fontSize: 10 }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TouchableOpacity onPress={saveEdit} style={{ flex: 1, backgroundColor: '#34C759', padding: 12, borderRadius: 8 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                {isEnglish ? "Save Changes" : "Stoor Veranderinge"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingMember(null)} style={{ flex: 1, backgroundColor: '#FF3B30', padding: 12, borderRadius: 8 }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                {isEnglish ? "Cancel" : "Kanselleer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Member Form */}
      <Text style={{ fontWeight: '600', marginBottom: 4 }}>
        {isEnglish ? "Firm ID (from your account)" : "Firma ID (van jou rekening)"}
      </Text>
      <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 18, marginBottom: 15, backgroundColor: '#f0f8ff', padding: 10, borderRadius: 6 }}>
        {myTenantId || (isEnglish ? 'Loading...' : 'Laai...')}
      </Text>

      <Text style={{ fontWeight: '600', marginBottom: 4 }}>
        {isEnglish ? "Name (Optional)" : "Naam (Opsioneel)"}
      </Text>
      <TextInput 
        placeholder={isEnglish ? "Enter name" : "Voer naam in"} 
        value={name} 
        onChangeText={setName} 
        style={{ borderWidth: 1, padding: 10, marginBottom: 15 }} 
      />

      <TextInput 
        placeholder={isEnglish ? "Email" : "E-pos"} 
        value={email} 
        onChangeText={setEmail} 
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }} 
        keyboardType="email-address" 
      />

      <Text style={{ fontWeight: '600', marginBottom: 4 }}>
        {isEnglish ? "Password" : "Wagwoord"}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: 'white' }}>
          <TextInput
            placeholder={isEnglish ? "Password" : "Wagwoord"}
            value={password}
            onChangeText={setPassword}
            style={{ flex: 1, padding: 10 }}
            secureTextEntry={!showAddPassword}
          />
          <TouchableOpacity style={{ padding: 10 }} onPress={() => setShowAddPassword(!showAddPassword)}>
            <Ionicons name={showAddPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={generatePassword} style={{ backgroundColor: '#34C759', padding: 12, marginLeft: 8, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isEnglish ? "Auto Gen" : "Outo Gen"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: '600', marginBottom: 6 }}>
        {isEnglish ? "Role" : "Rol"}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
        {['employee', 'partner', 'owner'].map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            style={{
              flex: 1,
              backgroundColor: role === r ? '#007AFF' : '#eee',
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: role === r ? 'white' : '#333', fontWeight: '600', fontSize: 10 }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Share to WhatsApp Button */}
      {(email.length > 0 && password.length > 0) && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            onPress={shareToWhatsApp} 
            style={{ 
              backgroundColor: '#25D366', 
              padding: 14, 
              borderRadius: 8, 
              marginBottom: 10,
              borderWidth: 3,
              borderColor: '#FFD700'
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              {isEnglish ? "Share to WhatsApp" : "Deel na WhatsApp"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Add Member Button */}
      <TouchableOpacity 
        onPress={addMember} 
        disabled={!hasShared}
        style={{ 
          backgroundColor: hasShared ? '#007AFF' : '#ccc', 
          padding: 15, 
          borderRadius: 8, 
          marginBottom: 10 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isEnglish ? "Add Member" : "Voeg Lid By"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 10 }}>
        <Text style={{ color: '#007AFF', textAlign: 'center' }}>
          {isEnglish ? "Back" : "Terug"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}