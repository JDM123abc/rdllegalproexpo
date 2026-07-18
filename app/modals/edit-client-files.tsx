import {
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { useLang } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import ServicesSummary from '../../components/ServicesSummary';
import { useClient } from '../contexts/ClientContext';
import { generateAndSharePDF } from '../../utils/generatePDF';

export default function EditClientFiles() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';
  const { editingDraftId } = useLocalSearchParams();

  const { selectedClientName, setSelectedClientName, businessTotal } = useClient();

  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);
  const [serviceRows, setServiceRows] = useState({});

  // Company details
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone1, setPhone1] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const loadCompanyFromTenant = async () => {
  const user = getAuth().currentUser;
  if (!user) return;

  try {
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, `users/${user.uid}`));
    if (userDoc.exists() && userDoc.data()?.tenantId) {
      const tid = userDoc.data().tenantId;
      const tenantDoc = await getDoc(doc(db, `tenants/${tid}`));
      if (tenantDoc.exists()) {
        const data = tenantDoc.data();
        setCompanyName(data.companyName || '');
        setAddress(data.address || '');
        setPhone1(data.phone1 || '');
        setEmail(data.email || '');
        setBankName(data.bankName || '');
        setBranchCode(data.branchCode || '');
        setAccountNumber(data.accountNumber || '');
        setQualifications(data.qualifications || '');
      }
    }
  } catch (e) {
    console.log("Load company error", e);
  }
};

  // Load existing invoice
  useEffect(() => {
    const loadDraft = async () => {
      if (!editingDraftId) return;

      try {
        setLoading(true);
        const db = getFirestore();
        const user = getAuth().currentUser;
        if (!user) return;

        const docRef = doc(db, `users/${user.uid}/client-files`, editingDraftId as string);
        const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const data = docSnap.data();
  setDraft(data);
  setSelectedClientName(data.clientName || '');
  setGrandTotal(data.total || 0);

  // Load company details from Profile (tenant)
  await loadCompanyFromTenant();
}
      } catch (error) {
        console.error("Error loading invoice:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [editingDraftId]);

  const handleUpdate = async () => {
    if (!editingDraftId) return;

    try {
      setUpdating(true);
      const db = getFirestore();
      const user = getAuth().currentUser;
      if (!user) return;

      await setDoc(doc(db, `users/${user.uid}/client-files`, editingDraftId as string), {
        total: grandTotal,
        updatedAt: new Date(),
        clientName: selectedClientName,
        companyDetails: {
          companyName,
          address,
          phone1,
          email,
          bankName,
          branchCode,
          accountNumber,
          qualifications,
        },
        serviceRows: serviceRows,
      }, { merge: true });

      Alert.alert("Success", "Invoice updated successfully", [
        { text: "OK", onPress: () => router.replace('/client-files') }
      ]);
    } catch (error) {
      console.error("Error updating invoice:", error);
      Alert.alert("Error", "Failed to update invoice");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>

          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.pageTitle}>
              {isEnglish ? "Edit Client File" : "Wysig Kliënt Lêer"}
            </Text>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => router.replace('/client-files')}
            >
              <Ionicons name="close" size={32} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.invoiceNumber}>{draft?.invoiceNumber}</Text>

          <View style={styles.infoBox}>
<Text style={styles.label}>
  {isEnglish ? "Address:" : "Adres:"} <Text style={styles.value}>{address || "—"}</Text>
</Text>
<Text style={styles.label}>
  {isEnglish ? "Tel:" : "Tel:"} <Text style={styles.value}>{phone1 || "—"}</Text>
</Text>
<Text style={styles.label}>
  {isEnglish ? "E-mail:" : "E-pos:"} <Text style={styles.value}>{email || "—"}</Text>
</Text>
          </View>

          <ServicesSummary 
            onGrandTotalChange={setGrandTotal}
            initialValues={draft?.serviceRows || {}} 
            onSaveValues={setServiceRows} 
          />

<View style={styles.bankBox}>
  <Text style={styles.bankTitle}>
    {isEnglish ? "Our banking details for direct payments:" : "Ons bankbesonderhede vir direkte betalings:"}
  </Text>
  <Text style={styles.bankText}>
    {isEnglish ? "Bank:" : "Bank:"} <Text style={styles.value}>{bankName || "—"}</Text>
  </Text>
  <Text style={styles.bankText}>
    {isEnglish ? "Branch Code:" : "Tak Kode:"} <Text style={styles.value}>{branchCode || "—"}</Text>
  </Text>
  <Text style={styles.bankText}>
    {isEnglish ? "Account Number:" : "Rekeningnommer:"} <Text style={styles.value}>{accountNumber || "—"}</Text>
  </Text>

  <Text style={{ fontSize: 15, color: '#007AFF', textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
    {isEnglish ? "Full Ref:" : "Volledige Verwysing:"} <Text style={{ fontWeight: 'bold' }}>{draft?.invoiceNumber || `${tenantId || 'Firm-abc'}-Inv-01`}</Text>
  </Text>
  <Text style={styles.bankText}>
    {isEnglish ? "Invoice provided without prejudice to rights." : "Faktuur verskaf sonder vooroordeel tot regte."}
  </Text>
  <Text style={styles.bankText}>
    {isEnglish ? "The firm reserves the right to make corrections." : "Die firma behou die reg voor om regstellings te maak."}
  </Text>
</View>

<View style={styles.qualBox}>
  <Text style={styles.qualTitle}>
    {isEnglish ? "Partners & Qualifications" : "Vennote & Kwalifikasies"}
  </Text>
  <Text style={styles.qualText}>
    {qualifications || (isEnglish ? "Add qualifications in Profile tab" : "Voeg kwalifikasies by in Profiel-oortjie")}
  </Text>
</View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>

            <TouchableOpacity 
              style={styles.updateBtn} 
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.btnText}>
                  {isEnglish ? "UPDATE INVOICE" : "DATEER FAKTUUR OP"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity 
                style={styles.pdfButton} 
onPress={async () => {
  if (!draft) {
    Alert.alert("Error", "Invoice data not loaded");
    return;
  }

  setGeneratingPDF(true);

const invoiceData = {
  invoiceNumber: draft.invoiceNumber,
  date: draft.date || new Date().toISOString().split('T')[0],
  clientName: draft.clientName || selectedClientName,
  amount: grandTotal || draft.total || 0,
  serviceRows: draft.serviceRows || serviceRows,
  businessTotal: businessTotal || draft.businessTotal || 0,
  globalRate: draft.globalRate || '',

  // Company details (you already load these into state)
  companyName,
  address,
  phone1,
  email,
  bankName,
  branchCode,
  accountNumber,
  qualifications,
};

  try {
    await generateAndSharePDF(invoiceData, isEnglish);
  } catch (e) {
    Alert.alert("Error", "Failed to generate PDF");
  } finally {
    setGeneratingPDF(false);
  }
}}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.pdfButtonText}>
                    {isEnglish ? "SAVE AS PDF" : "STOOR AS PDF"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.bottomCloseBtn} 
                onPress={() => router.replace('/client-files')}
              >
                <Text style={styles.bottomCloseText}>
                  {isEnglish ? "CLOSE" : "SLUIT"}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  companyName: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  invoiceNumber: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#007AFF', marginBottom: 20 },

  label: { fontSize: 16, marginBottom: 6, color: '#555' },
  value: { fontWeight: '600', color: '#333' },

  infoBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bankBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 10, color: '#007AFF' },
  qualText: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', lineHeight: 22 },
  bankTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: '#007AFF' },
  bankText: { fontSize: 16, marginBottom: 8, color: '#333', textAlign: 'center' },

  buttonContainer: {
    marginTop: 30,
    alignItems: 'center',
    width: '100%',
  },

updateBtn: { 
  backgroundColor: '#34C759', 
  paddingVertical: 16, 
  borderRadius: 12, 
  alignItems: 'center',
  width: '100%',
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#000',
},

  btnText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 16 
  },

pdfButton: { 
  backgroundColor: '#007AFF', 
  paddingVertical: 14, 
  paddingHorizontal: 30,
  borderRadius: 12, 
  alignItems: 'center',
  flex: 1,
  borderWidth: 1,
  borderColor: '#000',
},
  pdfButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 16 
  },

bottomCloseBtn: {
  backgroundColor: '#FF3B30',
  paddingVertical: 14, 
  paddingHorizontal: 30,
  borderRadius: 12, 
  alignItems: 'center',
  flex: 1,
  borderWidth: 1,
  borderColor: '#000',
},

  bottomCloseText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 10,
  },

  pageTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#007AFF' 
  },

closeButton: { 
  padding: 8, 
  borderRadius: 20, 
  backgroundColor: '#ffebee',
  borderWidth: 1,
  borderColor: '#000',
},
});