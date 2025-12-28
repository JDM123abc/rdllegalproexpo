import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

type CallLog = {
  id: string;
  name: string;
  number: string;
  duration: string;
  type: string;
  timestamp: any;
};

export default function History() {
  const [calls, setCalls] = useState<CallLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'calls'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CallLog));
      setCalls(logs);
    });
    return unsubscribe;
  }, []);

  const renderItem = ({ item }: { item: CallLog }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.name || 'Incoming Call'}</Text>
      <Text>Number: {item.number}</Text>
      <Text>Duration: {item.duration}</Text>
      <Text>Type: {item.type}</Text>
      <Text style={styles.date}>
        {item.timestamp?.toDate().toLocaleString() || 'Just now'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Call History</Text>
      <FlatList
        data={calls}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text>No calls logged yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#666', marginTop: 5 }
});