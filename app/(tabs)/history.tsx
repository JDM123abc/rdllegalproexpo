import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import auth from '@react-native-firebase/auth';

type CallLog = {
  id: string;
  contactName: string;
  contactNumber: string;
  duration: string;
  callType: string;
  direction: 'Incoming' | 'Outgoing';
  timestamp: any;
};

export default function History() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/calls`), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CallLog));
      setCalls(logs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: CallLog }) => (
    <View style={styles.item}>
      <Text style={styles.title}>
        {item.direction === 'Outgoing' ? 'Outgoing → ' : 'Incoming ← '}
        {item.contactName || 'Unknown'}
      </Text>
      <Text>Number: {item.contactNumber || 'Unknown'}</Text>
      <Text>Duration: {item.duration}</Text>
      <Text>Type: {item.callType}</Text>
      <Text style={styles.date}>
        {item.timestamp 
          ? new Date(item.timestamp.seconds * 1000).toLocaleString() 
          : 'Just now'}
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
      <Button title="Logout" onPress={() => auth().signOut()} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    marginTop: 60, 
    textAlign: 'center' 
  },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#666', marginTop: 5 }
});