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
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc } from '@react-native-firebase/firestore';
import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ServicesSummary from '../../components/ServicesSummary';
import { useClient } from '../contexts/ClientContext';

export default function Services() {
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

  const auth = getAuth();
  const db = getFirestore();

  console.log("🔥 SERVICES RENDER - Clients:", quickContacts.length);

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

      // Full totals for every client (same as History)
      const totals = callsData
        .filter((call: any) => call.callType === 'Business')
        .reduce((acc: { [key: string]: number }, call: any) => {
          const name = call.contactName || 'Unknown';
          acc[name] = (acc[name] || 0) + calculateCost(call.duration || '0:0:0');
          return acc;
        }, {});

      setPerClientTotals(totals);
      console.log("✅ Clients + totals loaded:", sorted.length);
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
      }
    } catch (e) {
      console.log("Load error", e);
    }
  };

  useEffect(() => {
    loadClients();
    loadCompany().then(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients();
    await loadCompany();
    setRefreshing(false);
  }, []);

  const generatePDF = () => {
    Alert.alert(isEnglish ? "Generate Invoice" : "Genereer Faktuur", "Coming soon", [{ text: "OK" }]);
  };

  const saveInvoice = async () => {
    if (!selectedClientName) {
      Alert.alert(isEnglish ? "Error" : "Fout", isEnglish ? "Please select a client first" : "Kies asseblief eers 'n kliënt");
      return;
    }
    try {
      const draftsRef = collection(db, `users/${auth.currentUser?.uid}/drafts`);
      const snapshot = await getDocs(draftsRef);
      let nextNum = 1;
      snapshot.docs.forEach(d => {
        const num = parseInt(d.id.replace('Inv', '')) || 0;
        if (num >= nextNum) nextNum = num + 1;
      });
      const invoiceNumber = `Inv${nextNum.toString().padStart(6, '0')}`;
      const draftData = {
        clientName: selectedClientName,
        invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        total: 1250.00,
        businessCalls: businessTotal,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      await addDoc(draftsRef, draftData);
      Alert.alert(
        isEnglish ? "Saved!" : "Gestoor!",
        `${isEnglish ? "Invoice" : "Faktuur"} ${invoiceNumber} saved to Drafts`,
        [{ text: "OK" }]
      );
    } catch (e) {
      console.error("Save error", e);
      Alert.alert("Error", "Failed to save draft");
    }
  };

  const fullPaymentRef = companyName ? `${companyName}-Inv-01` : "Firm-abc-Inv-01";

  const openSelector = () => {
    console.log("🖱️ Selector clicked -", quickContacts.length, "clients");
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

  if (loading) return <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center' }}>

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
          <Text style={styles.invoiceNumber}>Invoice-01</Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Address: <Text style={styles.value}>{address || "—"}</Text></Text>
            <Text style={styles.label}>Tel: <Text style={styles.value}>
              {phone1 || phone2 ? `${phone1} ${phone2 ? `/ ${phone2}` : ''}` : "—"}
            </Text></Text>
            <Text style={styles.label}>E-mail: <Text style={styles.value}>{email || "—"}</Text></Text>
          </View>

          <ServicesSummary />

          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Our banking details for direct payments:</Text>
            <Text style={styles.bankText}>Bank: <Text style={styles.value}>{bankName || "—"}</Text></Text>
            <Text style={styles.bankText}>Branch Code: <Text style={styles.value}>{branchCode || "—"}</Text></Text>
            <Text style={styles.bankText}>Account Number: <Text style={styles.value}>{accountNumber || "—"}</Text></Text>
            <Text style={{ fontSize: 15, color: '#007AFF', textAlign: 'center', marginTop: 12, fontWeight: '600' }}>
              Full Ref: <Text style={{ fontWeight: 'bold' }}>{fullPaymentRef}</Text>
            </Text>
            <Text style={styles.bankText}>Invoice provided without prejudice to rights.</Text>
            <Text style={styles.bankText}>The firm reserves the right to make corrections.</Text>
          </View>

          <View style={styles.qualBox}>
            <Text style={styles.qualTitle}>Partners & Qualifications</Text>
            <Text style={styles.qualText}>{qualifications || "Add qualifications in Profile tab"}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 25 }}>
            <TouchableOpacity style={styles.saveButton} onPress={saveInvoice}>
              <Ionicons name="save-outline" size={24} color="white" />
              <Text style={styles.saveButtonText}>
                {isEnglish ? "SAVE TO DRAFTS" : "STOOR IN KONSEPTE"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
              <Ionicons name="document-text-outline" size={24} color="white" />
              <Text style={styles.pdfButtonText}>
                {isEnglish ? "SAVE AS PDF" : "STOOR AS PDF"}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  companyName: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  invoiceNumber: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: '#007AFF', marginBottom: 20 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f0f0f0', borderRadius: 20, marginBottom: 15, gap: 8 },
  refreshText: { color: '#007AFF', fontWeight: '600' },
  infoBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  bankBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualBox: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginTop: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  qualTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 10, color: '#007AFF' },
  qualText: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', lineHeight: 22 },
  bankTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: '#007AFF' },
  bankText: { fontSize: 16, marginBottom: 8, color: '#333', textAlign: 'center' },

  pdfButton: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8 
  },
  saveButton: { 
    flex: 1, 
    backgroundColor: '#34C759', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8 
  },
  saveButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  pdfButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },

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
});