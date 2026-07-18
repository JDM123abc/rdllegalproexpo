import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import RDLPageHeader from '../../components/RDLPageHeader';

export default function Profile() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const navigation = useNavigation();

  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');

  const [bankName, setBankName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [qualifications, setQualifications] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [saving, setSaving] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Set bilingual tab title
  useEffect(() => {
    navigation.setOptions({
      title: isEnglish ? "Profile" : "Profiel",
    });
  }, [isEnglish]);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists() && userDoc.data()?.tenantId) {
          const tid = userDoc.data().tenantId;
          const tenantDoc = await getDoc(doc(db, `tenants/${tid}`));

          if (tenantDoc.exists()) {
            const data = tenantDoc.data();
            setCompanyName(data.companyName || tid);
            setAddress(data.address || '');
            setPhone1(data.phone1 || '');
            setPhone2(data.phone2 || '');
            setEmail(data.email || '');

            setBankName(data.bankName || '');
            setBranchCode(data.branchCode || '');
            setAccountNumber(data.accountNumber || '');
            setQualifications(data.qualifications || '');
            setHourlyRate(data.hourlyRate?.toString() || '');
          }
        }
      } catch (e) {}
    };

    loadProfile();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, `users/${user.uid}`));
      const tenantId = userDoc.data()?.tenantId;

      if (tenantId) {
        await setDoc(doc(db, `tenants/${tenantId}`), {
          companyName,
          address,
          phone1,
          phone2,
          email,
          bankName,
          branchCode,
          accountNumber,
          qualifications,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
          updatedAt: new Date(),
        }, { merge: true });

        Alert.alert(
          isEnglish ? "Saved!" : "Gestoor!",
          isEnglish ? "All details updated" : "Alle besonderhede opgedateer"
        );
      }
    } catch (e) {
      Alert.alert("Error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    
      <RDLPageHeader />

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isEnglish ? "Company Profile" : "Maatskappy Profiel"}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>{isEnglish ? "Company Name" : "Maatskappy Naam"}</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={isEnglish ? "e.g. De Lange Prokureurs" : "bv. De Lange Prokureurs"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Address" : "Adres"}</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder={isEnglish ? "Full address" : "Volledige adres"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Phone 1" : "Telefoon 1"}</Text>
          <TextInput
            style={styles.input}
            value={phone1}
            onChangeText={setPhone1}
            keyboardType="phone-pad"
            placeholder={isEnglish ? "e.g. 021 555 1234" : "bv. 021 555 1234"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Phone 2" : "Telefoon 2"}</Text>
          <TextInput
            style={styles.input}
            value={phone2}
            onChangeText={setPhone2}
            keyboardType="phone-pad"
            placeholder={isEnglish ? "e.g. 082 123 4567" : "bv. 082 123 4567"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Email" : "E-pos"}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={isEnglish ? "e.g. info@delangeprokureurs.co.za" : "bv. info@delangeprokureurs.co.za"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={[styles.label, { marginTop: 25, color: '#007AFF' }]}>
            {isEnglish ? "Banking Details" : "Bankbesonderhede"}
          </Text>

          <Text style={styles.label}>{isEnglish ? "Bank Name" : "Bank Naam"}</Text>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder={isEnglish ? "e.g. ABSA" : "bv. ABSA"}
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Branch Code" : "Takkode"}</Text>
          <TextInput
            style={styles.input}
            value={branchCode}
            onChangeText={setBranchCode}
            placeholder="632005"
            keyboardType="numeric"
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Account Number" : "Rekeningnommer"}</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="123 456 789"
            keyboardType="numeric"
            placeholderTextColor="#aaaaaa"
          />

          <Text style={styles.label}>{isEnglish ? "Hourly Rate (R)" : "Uurskoers (R)"}</Text>
          <TextInput
            style={styles.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="1200"
            keyboardType="numeric"
            placeholderTextColor="#aaaaaa"
          />

          <Text style={[styles.label, { marginTop: 25, color: '#007AFF' }]}>
            {isEnglish ? "Partners & Qualifications" : "Vennote & Kwalifikasies"}
          </Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={qualifications}
            onChangeText={setQualifications}
            multiline
            placeholder={isEnglish 
              ? "e.g. Person1 B Proc (UPE)\nPerson2 B Comm LLB (UPE)" 
              : "bv. Persoon1 B Proc (UPE)\nPersoon2 B Comm LLB (UPE)"}
            placeholderTextColor="#aaaaaa"
          />

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveProfile}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving 
                ? (isEnglish ? "Saving..." : "Besig...") 
                : (isEnglish ? "Save All Details" : "Stoor Alle Besonderhede")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#007AFF',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#000',
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});