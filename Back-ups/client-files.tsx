import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc } from '@react-native-firebase/firestore';
import { router } from 'expo-router';

// Force tab title
export const screenOptions = {
  title: 'Client Files',
  headerTitle: 'Client Files',
};

type ClientFile = {
  id: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  total: number;
  businessCalls: number;
  status: 'draft';
};

export default function ClientFiles() {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const [files, setFiles] = useState<ClientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const db = getFirestore();
      const q = query(collection(db, `users/${user.uid}/drafts`), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const loaded = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as ClientFile));

      setFiles(loaded);
    } catch (e) {
      console.error("Load Client Files error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, []);

  const openFile = (file: ClientFile) => {
    router.push({
      pathname: '/modals/edit-draft',
      params: { 
        editingDraftId: file.invoiceNumber || file.id 
      }
    });
  };

  const deleteFile = (file: ClientFile) => {
    Alert.alert(
      isEnglish ? "Delete File?" : "Lêer Verwyder?",
      `${file.invoiceNumber} - ${file.clientName}`,
      [
        { text: isEnglish ? "Cancel" : "Kanselleer", style: "cancel" },
        { 
          text: isEnglish ? "Delete" : "Verwyder", 
          style: "destructive",
          onPress: async () => {
            try {
              const db = getFirestore();
              const user = getAuth().currentUser;
              if (!user) return;

              const docId = file.invoiceNumber || file.id;
              await deleteDoc(doc(db, `users/${user.uid}/drafts`, docId));

              Alert.alert(
                isEnglish ? "Deleted" : "Verwyder", 
                isEnglish ? "File removed successfully" : "Lêer is verwyder"
              );
              loadFiles();
            } catch (e) {
              console.error("Delete error", e);
              Alert.alert("Error", "Failed to delete file");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <FlatList
        data={files}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.title}>
            {isEnglish ? "Client Files" : "Kliënt Lêers"}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={80} color="#ddd" />
            <Text style={styles.emptyText}>
              {isEnglish ? "No client files yet" : "Nog geen kliënt lêers"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.fileCard} onPress={() => openFile(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
            <Text style={styles.total}>R {item.total.toFixed(2)}</Text>

            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => { e.stopPropagation(); deleteFile(item); }}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>

            <Text style={styles.status}>Draft</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20, 
    color: '#007AFF' 
  },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, color: '#888', marginTop: 20 },

  fileCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  invoiceNumber: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
  date: { fontSize: 13, color: '#666' },
  clientName: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
  total: { fontSize: 19, fontWeight: 'bold', color: '#34C759' },
  status: { 
    fontSize: 13, 
    color: '#FF9500', 
    alignSelf: 'flex-start', 
    backgroundColor: '#fff3e0', 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 20,
    marginTop: 8 
  },
  deleteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
});