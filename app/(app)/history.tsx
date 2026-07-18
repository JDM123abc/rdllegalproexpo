import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc,
  getDoc 
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { signOut } from '@react-native-firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import { useNavigation } from 'expo-router';
import { webLogout } from '../../components/web-logout';
import RDLPageHeader from '../../components/RDLPageHeader';
import * as Contacts from 'expo-contacts';

type CallLog = {
  id: string;
  contactName: string;
  contactNumber: string;
  duration: string;
  callType: 'Business' | 'Private';
  direction: 'Incoming' | 'Outgoing';
  timestamp: any;
};

export default function History() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const navigation = useNavigation();

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [tenantId, setTenantId] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState(0);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCall, setEditingCall] = useState<CallLog | null>(null);
  const [editManualName, setEditManualName] = useState('');
  const [editManualNumber, setEditManualNumber] = useState('');
  const [editCallType, setEditCallType] = useState<'Business' | 'Private'>('Business');

  const auth = getAuth();
  const db = getFirestore();

  // Set bilingual tab title
  useEffect(() => {
    navigation.setOptions({
      title: isEnglish ? "History" : "Geskiedenis",
    });
  }, [isEnglish]);

  // Load Profile + TenantId
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const tid = data.tenantId || '';
          setTenantId(tid);

          if (tid) {
            const tenantDoc = await getDoc(doc(db, `tenants/${tid}`));
            if (tenantDoc.exists()) {
              setHourlyRate(tenantDoc.data().hourlyRate || 0);
            }
          }
        }
      } catch (e) {
        console.log("Failed to load profile", e);
      }
    };
    loadProfile();
  }, []);

  const loadCalls = async () => {
    if (!tenantId) return;
    try {
      const q = query(collection(db, `tenants/${tenantId}/calls`), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      setCalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallLog)));
    } catch (e) {
      console.log("Error loading calls", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) loadCalls();
  }, [tenantId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  }, [tenantId]);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(isEnglish ? 'en-ZA' : 'af-ZA', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateCost = (duration: string) => {
    if (!hourlyRate) return 0;
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    const totalMinutes = (hours || 0) * 60 + (minutes || 0) + (seconds || 0) / 60;
    return Math.round(totalMinutes * (hourlyRate / 60) * 100) / 100;
  };

  const perClientTotals = calls
    .filter(call => call.callType === 'Business')
    .reduce((acc: { [key: string]: number }, call) => {
      const name = call.contactName || 'Unknown';
      acc[name] = (acc[name] || 0) + calculateCost(call.duration);
      return acc;
    }, {});

  const showDetails = (item: CallLog) => {
    const cost = calculateCost(item.duration);
    Alert.alert(
      isEnglish ? "Call Details" : "Oproep Besonderhede",
      `Name: ${item.contactName || 'Unknown'}\n` +
      `Number: ${item.contactNumber || 'Unknown'}\n` +
      `Duration: ${item.duration}\n` +
      `Total: R${cost}\n` +
      `Date: ${formatDateTime(item.timestamp)}`
    );
  };

  const deleteCall = async (callId: string) => {
    if (!tenantId) return;
    Alert.alert(
      isEnglish ? 'Delete' : 'Vee Uit',
      isEnglish ? 'Delete this call log?' : 'Vee hierdie oproep uit?',
      [
        { text: isEnglish ? 'Cancel' : 'Kanselleer', style: 'cancel' },
        { text: isEnglish ? 'Delete' : 'Vee Uit', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, `tenants/${tenantId}/calls`, callId));
          loadCalls();
        }}
      ]
    );
  };

  // ==================== EDIT FUNCTIONALITY ====================
  const openEditModal = (item: CallLog) => {
    setEditingCall(item);
    setEditManualName(item.contactName || '');
    setEditManualNumber(item.contactNumber || '');
    setEditCallType(item.callType);
    setEditModalVisible(true);
  };

  const pickCallerFromContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Need contacts permission');
      return;
    }
    try {
      const result = await Contacts.presentContactPickerAsync();
      if (result && result.phoneNumbers?.[0]) {
        setEditManualName(result.name || '');
        setEditManualNumber(result.phoneNumbers[0].number.replace(/[^0-9+]/g, ''));
      }
    } catch (e) {}
  };

  const saveEditedCall = async () => {
    if (!editingCall || !tenantId) return;

    try {
      await updateDoc(doc(db, `tenants/${tenantId}/calls`, editingCall.id), {
        contactName: editManualName || 'Unknown',
        contactNumber: editManualNumber || 'Unknown',
        callType: editCallType,
      });

      setEditModalVisible(false);
      setEditingCall(null);
      loadCalls();

      Alert.alert(
        isEnglish ? 'Updated!' : 'Opgedateer!',
        isEnglish ? 'Call log updated successfully' : 'Oproep suksesvol opgedateer'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update call');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      isEnglish ? 'Logout' : 'Teken Uit',
      isEnglish ? 'Are you sure?' : 'Is jy seker?',
      [
        { text: isEnglish ? 'Cancel' : 'Kanselleer', style: 'cancel' },
        { text: isEnglish ? 'Logout' : 'Teken Uit', style: 'destructive', onPress: async () => {
          try { await signOut(auth); } catch (e) {}
          router.replace('/(auth)');
        }}
      ]
    );
  };

  if (loading) {
    return <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <RDLPageHeader />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 }}>
          
          <View style={{ alignItems: 'center', marginVertical: 15 }}>
            <TouchableOpacity onPress={onRefresh} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 25, marginBottom: 12, borderWidth: 1, borderColor: '#000' }} disabled={refreshing}>
              <Ionicons name={refreshing ? "time-outline" : "refresh"} size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{isEnglish ? "Refresh" : "Herlaai"}</Text>
              {refreshing && <ActivityIndicator color="white" size="small" style={{ marginLeft: 10 }} />}
            </TouchableOpacity>

            <Text style={styles.header}>{isEnglish ? "Call History" : "Oproep Geskiedenis"}</Text>
          </View>

          <View style={styles.rateNoteContainer}>
            <Text style={styles.rateNote}>{isEnglish ? "Rate:" : "Tarief:"} R{hourlyRate}/hour ÷ 60 = </Text>
            <Text style={styles.rateNoteValue}>R{(hourlyRate / 60).toFixed(2)}/min</Text>
          </View>

          <View style={styles.perClientContainer}>
            <Text style={styles.perClientTitle}>{isEnglish ? "Business Calls per Client" : "Besigheid Oproepe per Kliënt"}</Text>
            {Object.keys(perClientTotals).length > 0 ? (
              Object.entries(perClientTotals).map(([name, total]) => (
                <View key={name} style={styles.perClientRow}>
                  <Text style={styles.perClientName}>{name}</Text>
                  <Text style={styles.perClientAmount}>R {total.toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: '#666', padding: 10 }}>{isEnglish ? "No business calls yet" : "Nog geen besigheid oproepe"}</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: '#E5E5E5', borderRadius: 999, padding: 4, marginBottom: 12, width: '70%', alignSelf: 'center', borderWidth: 1, borderColor: '#000' }}>
            <TouchableOpacity onPress={() => setIsCompact(true)} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: isCompact ? '#007AFF' : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', color: isCompact ? 'white' : '#666' }}>{isEnglish ? "Compact" : "Kompak"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsCompact(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: !isCompact ? '#007AFF' : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', color: !isCompact ? 'white' : '#666' }}>{isEnglish ? "Detailed" : "Volledig"}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={calls}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.item, { 
                backgroundColor: item.callType === 'Business' ? '#FFEBEE' : '#E3F2FD',
                borderWidth: 1, 
                borderColor: '#000' 
              }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => showDetails(item)}>
                  {isCompact ? (
                    <Text style={styles.compactText}>
                      {item.direction === 'Outgoing' ? '→' : '←'} {item.contactName || 'Unknown'}
                    </Text>
                  ) : (
                    <View>
                      <Text style={styles.title}>{item.direction === 'Outgoing' ? 'Outgoing → ' : 'Incoming ← '} {item.contactName || 'Unknown'}</Text>
                      <Text>Duration: {item.duration}</Text>
                      <Text>Total: R{calculateCost(item.duration)}</Text>
                      <Text style={{ marginTop: 6, fontWeight: '600', color: '#555' }}>{formatDateTime(item.timestamp)}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCall(item.id)}>
                    <Ionicons name="trash-outline" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{isEnglish ? "No calls logged yet" : "Geen oproepe nog gelog nie"}</Text>}
          />

          <TouchableOpacity onPress={() => { if (Platform.OS === 'web') webLogout(); else handleLogout(); }}
            style={{ marginTop: 30, marginBottom: 40, backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 8, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: '#000' }}>
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{isEnglish ? 'Logout' : 'Teken Uit'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ==================== EDIT MODAL ==================== */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxWidth: 420 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>{isEnglish ? "Edit Call Log" : "Wysig Oproep"}</Text>

            <TouchableOpacity onPress={pickCallerFromContacts} style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, marginBottom: 20 }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 17, textAlign: 'center' }}>{isEnglish ? "📱 Select from Contacts" : "📱 Kies uit Kontakte"}</Text>
            </TouchableOpacity>

            <Text style={{ fontWeight: 'bold' }}>{isEnglish ? "Client Name" : "Kliënt Naam"}</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 }} value={editManualName} onChangeText={setEditManualName} />

            <Text style={{ fontWeight: 'bold' }}>{isEnglish ? "Client Number" : "Kliënt Nommer"}</Text>
            <TextInput style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5 }} value={editManualNumber} onChangeText={setEditManualNumber} keyboardType="phone-pad" />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity 
                onPress={() => setEditCallType('Business')} 
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{isEnglish ? "Business" : "Besigheid"}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)} 
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#888', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{isEnglish ? "Cancel" : "Kanselleer"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={saveEditedCall} style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>{isEnglish ? "Save Changes" : "Stoor Wysigings"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  rateNoteContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, gap: 4 },
  rateNote: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
  rateNoteValue: { fontSize: 15, color: '#007AFF', fontWeight: '700' },
  perClientContainer: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#000' },
  perClientTitle: { fontSize: 16, fontWeight: '600', color: '#D32F2F', marginBottom: 10, textAlign: 'center' },
  perClientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#FFCDD2' },
  perClientName: { fontSize: 16, color: '#333', flex: 1 },
  perClientAmount: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
  item: { padding: 15, borderWidth: 1, borderColor: '#000', marginBottom: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  compactText: { fontSize: 17, flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#666' },
});