import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';

import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc 
} from '@react-native-firebase/firestore';

import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ServicesSummary from '../../components/ServicesSummary';
import { useClient } from '../contexts/ClientContext';
import { generateAndSharePDF } from '../../utils/generatePDF';
import { generateInvoiceNumber } from '../../utils/generateInvoiceNumber';

export default function NewInvoice() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const { selectedClientName, setSelectedClientName, businessTotal, hourlyRate } = useClient();

  const [quickContacts, setQuickContacts] = useState<string[]>([]);
  const [perClientTotals, setPerClientTotals] = useState<{ [key: string]: number }>({});

  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qualifications, setQualifications] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWebList, setShowWebList] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);   // ← ADD THIS
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [serviceRows, setServiceRows] = useState({});   // ← ADD THIS LINE
  const [grandTotal, setGrandTotal] = useState(0);   // ← ADD THIS LINE
  const [tenantId, setTenantId] = useState<string>('');

  const auth = getAuth();
  const db = getFirestore();

  // ==================== LOAD CLIENTS ====================
  const calculateCost = (duration: string) => {
    if (!hourlyRate) return 0;
    const [h, m, s] = duration.split(':').map(Number);
    const minutes = (h || 0) * 60 + (m || 0) + (s || 0) / 60;
    return Math.round(minutes * (hourlyRate / 60) * 100) / 100;
  };

  const loadClients = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, `users/${user.uid}`));
      const tid = userDoc.data()?.tenantId || user.uid;
      const callsSnap = await getDocs(collection(db, `tenants/${tid}/calls`));
      const callsData = callsSnap.docs.map(d => d.data());

      const namesSet = new Set<string>();
      callsData.forEach((call: any) => {
        const name = call.contactName?.toString().trim();
        if (name) namesSet.add(name);
      });

      const sorted = Array.from(namesSet).sort();
      setQuickContacts(sorted);

      const totals = callsData
        .filter((call: any) => call.callType === 'Business')
        .reduce((acc: { [key: string]: number }, call: any) => {
          const name = call.contactName || 'Unknown';
          acc[name] = (acc[name] || 0) + calculateCost(call.duration || '0:0:0');
          return acc;
        }, {});

      setPerClientTotals(totals);
    } catch (e) {
      console.error("Load clients error", e);
    }
  };

const loadCompany = async () => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userDoc = await getDoc(doc(db, `users/${user.uid}`));
    if (userDoc.exists() && userDoc.data()?.tenantId) {
      const tid = userDoc.data().tenantId;
      console.log("✅ Tenant ID loaded:", tid);
      setTenantId(tid);   // ← THIS WAS MISSING

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
      }
    } else {
      console.log("❌ No tenantId found");
    }
  } catch (e) {
    console.log("Load company error", e);
  }
};

// ==================== GET NEXT INVOICE NUMBER ====================
const getNextInvoiceNumber = async () => {
  if (!tenantId) return;
  const number = await generateInvoiceNumber(tenantId);
  setNextInvoiceNumber(number);
};

  // ==================== MAIN USE EFFECT ====================
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadClients(),
        loadCompany(),
        getNextInvoiceNumber(),
      ]);
      setLoading(false);
    };

    loadAllData();
  }, []);

// Force invoice number generation AFTER tenantId is loaded
useEffect(() => {
  if (tenantId) {
    console.log("✅ Tenant ID ready:", tenantId);
    getNextInvoiceNumber();
  }
}, [tenantId]);

// Force invoice number after tenantId is loaded
useEffect(() => {
  if (tenantId) {
    getNextInvoiceNumber();
  }
}, [tenantId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadClients(), loadCompany(), getNextInvoiceNumber()]);
    setRefreshing(false);
  }, []);

  // ==================== SAVE INVOICE ====================
  const saveInvoice = async () => {
    if (!selectedClientName) {
      Alert.alert(isEnglish ? "Error" : "Fout", isEnglish ? "Please select a client first" : "Kies asseblief eers 'n kliënt");
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const draftsRef = collection(db, `users/${user.uid}/client-files`);
      const snapshot = await getDocs(draftsRef);

      let nextNum = 1;
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.invoiceNumber) {
          const match = data.invoiceNumber.match(/Inv-(\d{2,})$/);
          if (match) {
            const num = parseInt(match[1]);
            if (num >= nextNum) nextNum = num + 1;
          }
        }
      });

      const invoiceNumber = `${tenantId}-Inv-${nextNum.toString().padStart(2, '0')}`;

const draftData = {
  clientName: selectedClientName,
  invoiceNumber,
  date: new Date().toISOString().split('T')[0],
  total: grandTotal,                    // ← CHANGE THIS
  businessCalls: businessTotal,
  serviceRows: serviceRows,                    // ← ADD THIS LINE
  status: 'draft',
  createdAt: new Date().toISOString(),
};

      await setDoc(doc(draftsRef, invoiceNumber), draftData);

      Alert.alert(
        isEnglish ? "Saved!" : "Gestoor!",
        `${isEnglish ? "Invoice" : "Faktuur"} ${invoiceNumber} saved to Client Files`,
        [{ text: "OK" }]
      );

    } catch (e) {
      console.error("Save error", e);
      Alert.alert("Error", "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

const generatePDF = async () => {
  if (!selectedClientName) {
    Alert.alert(
      isEnglish ? "Error" : "Fout", 
      isEnglish ? "Please select a client first" : "Kies asseblief eers 'n kliënt"
    );
    return;
  }

  setGeneratingPDF(true);

  const invoiceData = {
    invoiceNumber: nextInvoiceNumber,
    date: new Date().toISOString().split('T')[0],
    clientName: selectedClientName,
    amount: grandTotal || 0,
    serviceRows: serviceRows,
    businessTotal: businessTotal || 0,
    globalRate: '',

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
};

  const fullPaymentRef = `${tenantId}-Inv-01`;

  const openSelector = () => {
    if (Platform.OS === 'web') {
      setShowWebList(!showWebList);
    } else {
      setShowMobileModal(true);
    }
  };

  const selectClient = (name: string) => {
    setSelectedClientName(name);
    setShowMobileModal(false);
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
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>

          {/* === TOP BAR === */}
          <View style={styles.topBar}>
            <Text style={styles.pageTitle}>
              {isEnglish 
                ? `New Invoice (${nextInvoiceNumber})` 
                : `Nuwe Faktuur (${nextInvoiceNumber})`}
            </Text>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => router.replace('/client-files')}
            >
              <Ionicons name="close" size={32} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {/* Client Selector */}
          <TouchableOpacity style={styles.clientSelector} onPress={openSelector}>
            <Text style={styles.clientLabel}>
              {isEnglish ? "Invoice Addressee (from Caller list)" : "Faktuur Adressee (van Oproeper lys)"}
            </Text>
            <View style={styles.selectedClientBox}>
              <Text style={styles.selectedText}>
                {selectedClientName || (isEnglish ? "Tap to choose from caller list" : "Tik om uit oproeperlys te kies")}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#007AFF" />
            </View>
            {businessTotal > 0 && (
              <Text style={{ color: '#d32f2f', fontWeight: '600', marginTop: 4 }}>
                📞 {isEnglish ? "Business Calls:" : "Besigheid Oproepe:"} R {businessTotal.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Mobile Modal */}
          <Modal visible={showMobileModal} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={() => setShowMobileModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
                    <Text style={{ padding: 20, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                      {isEnglish ? "Select Client" : "Kies Kliënt"}
                    </Text>
                    <FlatList
                      data={quickContacts}
                      keyExtractor={item => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={{ padding: 18, borderBottomWidth: 1, borderColor: '#eee' }}
                          onPress={() => selectClient(item)}
                        >
                          <Text style={{ fontSize: 17 }}>
                            {item}
                            {perClientTotals[item] > 0 && <Text style={{ color: '#d32f2f', fontWeight: '600' }}> R {perClientTotals[item].toFixed(2)}</Text>}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity onPress={() => setShowMobileModal(false)} style={{ paddingVertical: 35, backgroundColor: '#f8f9fa' }}>
                      <Text style={{ color: 'red', textAlign: 'center', fontWeight: '600', fontSize: 17 }}>
                        {isEnglish ? "Cancel" : "Kanselleer"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Web List */}
          {showWebList && Platform.OS === 'web' && (
            <View style={styles.webList}>
              <Text style={{ padding: 15, backgroundColor: '#e3f2fd', fontWeight: '700', textAlign: 'center' }}>
                Select Client ({quickContacts.length})
              </Text>
              {quickContacts.map(name => (
                <TouchableOpacity 
                  key={name} 
                  style={styles.webListItem} 
                  onPress={() => {
                    setSelectedClientName(name);
                    setShowWebList(false);
                  }}
                >
                  <Text style={{ fontSize: 17 }}>
                    {name}
                    {perClientTotals[name] > 0 && <Text style={{ color: '#d32f2f', fontWeight: '600' }}> R {perClientTotals[name].toFixed(2)}</Text>}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowWebList(false)} style={{ padding: 15, backgroundColor: '#ffebee' }}>
                <Text style={{ color: 'red', textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color="#007AFF" />
            <Text style={styles.refreshText}>
              {isEnglish ? "Refresh from Profile" : "Verfris vanaf Profiel"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.companyName}>{companyName || "Company Name"}</Text>

<ServicesSummary 
  onSaveValues={setServiceRows}
  onGrandTotalChange={setGrandTotal}     // ← ADD THIS LINE
/>

          {/* Banking Details */}
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Our banking details for direct payments:</Text>
            <Text style={styles.label}>Bank: <Text style={styles.value}>{bankName || "—"}</Text></Text>
            <Text style={styles.bankText}>Branch Code: <Text style={styles.value}>{branchCode || "—"}</Text></Text>
            <Text style={styles.bankText}>Account Number: <Text style={styles.value}>{accountNumber || "—"}</Text></Text>
            <Text style={{ fontSize: 15, color: '#007AFF', textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
              Full Ref: <Text style={{ fontWeight: 'bold' }}>{fullPaymentRef}</Text>
            </Text>
            <Text style={styles.bankText}>Invoice provided without prejudice to rights.</Text>
            <Text style={styles.bankText}>The firm reserves the right to make corrections.</Text>
          </View>

          {/* Qualifications */}
          <View style={styles.qualBox}>
            <Text style={styles.qualTitle}>Partners & Qualifications</Text>
            <Text style={styles.qualText}>{qualifications || "Add qualifications in Profile tab"}</Text>
          </View>

          {/* Bottom Buttons - Same as Edit Screen */}
          <View style={styles.buttonContainer}>

            {/* Green Full Width - SAVE */}
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={async () => {
                await saveInvoice();
                router.replace('/client-files');
              }} 
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.btnText}>
                  {isEnglish ? "SAVE TO CLIENT FILES" : "STOOR IN KLIËNT LÊERS"}
                </Text>
              )}
            </TouchableOpacity>

            {/* PDF + Close Side by Side */}
            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity 
                style={styles.pdfButton} 
                onPress={generatePDF}
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
  invoiceNumber: { 
    fontSize: 19, 
    fontWeight: '700', 
    textAlign: 'center', 
    color: '#007AFF', 
    marginBottom: 25,
    marginTop: 8 
  },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f0f0f0', borderRadius: 20, marginBottom: 15, gap: 8 },
  refreshText: { color: '#007AFF', fontWeight: '600' },
  infoBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bankBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 10, color: '#007AFF' },
  qualText: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', lineHeight: 22 },
  bankTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: '#007AFF' },
  bankText: { fontSize: 16, marginBottom: 8, color: '#333', textAlign: 'center' },
  
    label: { 
    fontSize: 16, 
    marginBottom: 6, 
    color: '#555',
    textAlign: 'center'
  },
  value: { 
    fontWeight: '600', 
    color: '#333' 
  },

  /* ==================== BUTTON STYLES (New Layout) ==================== */
  buttonContainer: {
    marginTop: 30,
    alignItems: 'center',
    width: '100%',
  },

saveButton: { 
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

  /* Old styles you can keep */
  clientSelector: { marginBottom: 20, backgroundColor: 'white', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db' },
  clientLabel: { fontSize: 16, fontWeight: '600', color: '#007AFF', marginBottom: 6 },
  selectedClientBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: 14, borderRadius: 8 },
  selectedText: { fontSize: 16, color: '#1f2937', flex: 1 },

  webList: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 8, 
    marginBottom: 15, 
    borderWidth: 2, 
    borderColor: '#007AFF',
    maxHeight: 400,
    overflow: 'auto'
  },
  webListItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },

topBar: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingRight: 16,        // ← Increase this (try 16 or 20)
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
  marginRight: 4,          // ← Small value is enough
},
});