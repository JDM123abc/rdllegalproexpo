import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  FlatList,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import ClientFilesButtonGrid from '../../components/ClientFilesButtonGrid';
import RDLPageHeader from '../../components/RDLPageHeader';

type ClientFile = {
  id: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  total: number;
  businessCalls: number;
  status: 'draft';
};

type SearchType = 'invoiceNumber' | 'clientName' | 'amount' | 'date';

export default function ClientFiles() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const navigation = useNavigation();

  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchType, setSearchType] = useState<SearchType | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortType, setSortType] = useState<'invoiceAsc' | 'invoiceDesc' | 'clientAsc' | 'clientDesc' | 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc'>('dateDesc');

  // Set bilingual tab title
  useEffect(() => {
    navigation.setOptions({
      title: isEnglish ? "Client Files" : "Kliënte Lêers",
    });
  }, [isEnglish]);

  const loadFiles = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const db = getFirestore();
      const q = query(collection(db, `users/${user.uid}/client-files`), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      let loaded = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as ClientFile));

      loaded.sort((a, b) => {
        const numA = parseInt(a.invoiceNumber?.split('-Inv-')[1] || '0');
        const numB = parseInt(b.invoiceNumber?.split('-Inv-')[1] || '0');
        return numA - numB;
      });

      setFiles(loaded);
    } catch (e) {
      console.error("Load Client Files error", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, []);

  const openFile = (file: ClientFile) => {
    const id = file.invoiceNumber || file.id;
    router.push(`/modals/edit-client-files?editingDraftId=${id}`);
  };

  const performDelete = async (file: ClientFile) => {
    const displayId = file.invoiceNumber || file.id || "Unknown";
    setDeletingId(file.id);

    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const db = getFirestore();
      const docId = file.invoiceNumber || file.id;

      await deleteDoc(doc(db, `users/${user.uid}/client-files`, docId));

      Alert.alert(
        isEnglish ? "Deleted" : "Verwyder",
        `${displayId} ${isEnglish ? "has been deleted" : "is verwyder"}`
      );

      await loadFiles();
    } catch (e) {
      console.error("Delete error:", e);
      Alert.alert("Error", "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteFile = (file: ClientFile) => {
    const displayId = file.invoiceNumber || file.id || "Unknown";

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${displayId} - ${file.clientName}?`)) {
        performDelete(file);
      }
      return;
    }

    Alert.alert(
      isEnglish ? "Delete Client File?" : "Kliënt Lêer Verwyder?",
      `${displayId}\n${file.clientName}`,
      [
        { text: isEnglish ? "Cancel" : "Kanselleer", style: "cancel" },
        {
          text: isEnglish ? "DELETE" : "VERWYDER",
          style: "destructive",
          onPress: () => performDelete(file),
        },
      ]
    );
  };

  const archiveFile = async (file: ClientFile) => {
    try {
      const user = getAuth().currentUser;
      if (!user) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      const db = getFirestore();
      const docRef = doc(db, `users/${user.uid}/client-files`, file.id);

      await updateDoc(docRef, { 
        status: 'archived',
        archivedAt: new Date().toISOString()
      });

      Alert.alert("Success", `${file.invoiceNumber} archived`);
      await loadFiles();
    } catch (e) {
      console.error("Archive error:", e);
      Alert.alert("Error", "Failed to archive");
    }
  };
  
  const unarchiveFile = async (file: ClientFile) => {
    try {
      const user = getAuth().currentUser;
      if (!user) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      const db = getFirestore();
      const docRef = doc(db, `users/${user.uid}/client-files`, file.id);

      await updateDoc(docRef, { 
        status: 'active',
        archivedAt: null
      });

      Alert.alert("Success", `${file.invoiceNumber} unarchived`);
      await loadFiles();
    } catch (e) {
      console.error("Unarchive error:", e);
      Alert.alert("Error", "Failed to unarchive");
    }
  };

  const searchTextLower = searchText.toLowerCase().trim();
  const isSearchActive = searchTextLower.length > 0;

  const processedFiles = [...files]
    .filter(item => {
      const status = (item.status || '').toLowerCase().trim();
      
      if (showArchived) {
        return status === 'archived';
      } else {
        return status !== 'archived' && status !== 'archive';
      }
    })
    .filter(item => {
      if (!isSearchActive) return true;

      const invoice = (item.invoiceNumber || '').toLowerCase();
      const client = (item.clientName || '').toLowerCase();
      const date = (item.date || '').toLowerCase();
      const amount = item.total ? item.total.toString() : '';

      return (
        invoice.includes(searchTextLower) ||
        client.includes(searchTextLower) ||
        date.includes(searchTextLower) ||
        amount.includes(searchTextLower)
      );
    })
    .sort((a, b) => {
      switch (sortType) {
        case 'invoiceAsc':
          return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
        case 'invoiceDesc':
          return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '');
        case 'clientAsc':
          return (a.clientName || '').localeCompare(b.clientName || '');
        case 'clientDesc':
          return (b.clientName || '').localeCompare(a.clientName || '');
        case 'dateDesc':
          return (b.date || '').localeCompare(a.date || '');
        case 'dateAsc':
          return (a.date || '').localeCompare(b.date || '');
        case 'amountDesc':
          return (b.total || 0) - (a.total || 0);
        case 'amountAsc':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

  const numColumns = Platform.OS === 'web' ? 6 : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>

      <RDLPageHeader />

      <ClientFilesButtonGrid
        onNewInvoice={() => router.push('/new-invoice')}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onViewArchived={() => setShowArchived(!showArchived)}
        showArchived={showArchived}
        
        searchType={searchType}
        searchText={searchText}
        onSearchTypeChange={setSearchType}
        onSearchTextChange={setSearchText}
        onClearSearch={() => {
          setSearchText("");
          setSearchType('invoiceNumber');
        }}

        sortType={sortType}
        onSortChange={setSortType}
      />

      <FlatList
        data={processedFiles}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: 'flex-start', gap: 16 } : undefined}
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === 'web' ? 24 : 12,
          paddingVertical: 8,
          paddingBottom: 100,
          alignItems: 'center',
          maxWidth: Platform.OS === 'web' ? 1480 : undefined,
          alignSelf: 'center',
          width: '100%',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.title}>
            {showArchived 
              ? (isEnglish ? "Archived Files" : "Geargiveerde Lêers") 
              : (isEnglish ? "Client Files" : "Kliënt Lêers")
            }
          </Text>
        }
        renderItem={({ item }) => {
          const matches = isSearchActive && (
            (item.invoiceNumber?.toLowerCase().includes(searchTextLower)) ||
            (item.clientName?.toLowerCase().includes(searchTextLower)) ||
            (item.date?.toLowerCase().includes(searchTextLower)) ||
            (item.total?.toString().includes(searchTextLower))
          );

          return (
            <View style={styles.cardWrapper}>
              <TouchableOpacity
                style={[
                  styles.fileCard, 
                  matches && styles.highlightedCard, 
                  { width: '100%' },
                  showArchived && { backgroundColor: '#f0f0f0' }
                ]}
                onPress={() => openFile(item)}
                activeOpacity={0.95}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                </View>

                <Text style={styles.date}>{item.date}</Text>

                <Text style={styles.clientName} numberOfLines={2}>{item.clientName}</Text>

                <View style={styles.amountContainer}>
                  <Text style={styles.totalLabel}>Amount Due</Text>
                  <Text style={[styles.total, { minWidth: 120 }]} numberOfLines={1}>
                    R {item.total.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.footer}>
                  {showArchived ? (
                    <Pressable
                      onPress={(e: any) => {
                        e.stopPropagation();
                        unarchiveFile(item);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Ionicons name="archive-outline" size={22} color="#34C759" />
                      <Text style={{ color: '#34C759', fontSize: 13, fontWeight: '600' }}>Unarchive</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={(e: any) => {
                        e.stopPropagation();
                        archiveFile(item);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Ionicons name="archive-outline" size={22} color="#007AFF" />
                      <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>Archive</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.deleteButton}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      deleteFile(item);
                    }}
                    hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                    pointerEvents="box-only"
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#FF3B30" />
                    ) : (
                      <Ionicons name="trash-outline" size={26} color="#FF3B30" />
                    )}
                  </Pressable>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 16, 
    color: '#007AFF' 
  },

  cardWrapper: {
    width: Platform.OS === 'web' ? 230 : undefined,
    maxWidth: Platform.OS === 'web' ? 230 : 360,
    padding: 8,
    alignItems: 'center',
  },

  fileCard: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    minHeight: 235,
    justifyContent: 'space-between',
  },

  highlightedCard: {
    borderColor: '#FFD700',
    borderWidth: 3,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 12,
  },

  cardHeader: { marginBottom: 6 },
  invoiceNumber: { 
    fontSize: 15.5, 
    fontWeight: '700', 
    color: '#007AFF' 
  },
  date: { 
    fontSize: 13.5, 
    color: '#666',
    marginBottom: 10,
    textAlign: 'left'
  },
  clientName: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 12,
    lineHeight: 21 
  },

  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  totalLabel: { fontSize: 14.5, color: '#555' },
  total: { 
    fontSize: 19.5, 
    fontWeight: 'bold', 
    color: '#34C759',
    textAlign: 'right'
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 8,
  },
});