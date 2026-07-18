import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from '@react-native-firebase/firestore';

type ClientContextType = {
  quickContacts: string[];
  selectedClientName: string | null;
  setSelectedClientName: (name: string | null) => void;
  businessTotal: number;
  perClientTotals: { [key: string]: number };
  hourlyRate: number;
  loading: boolean;
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [quickContacts, setQuickContacts] = useState<string[]>([]);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [businessTotal, setBusinessTotal] = useState(0);
  const [perClientTotals, setPerClientTotals] = useState<{ [key: string]: number }>({});
  const [hourlyRate, setHourlyRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allCalls, setAllCalls] = useState<any[]>([]);

  const loadData = async (user: any) => {
    if (!user) return;
    try {
      setLoading(true);
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, `users/${user.uid}`));
      const tid = userDoc.data()?.tenantId || user.uid;

      const tenantDoc = await getDoc(doc(db, `tenants/${tid}`));
      setHourlyRate(tenantDoc.exists() ? (tenantDoc.data().hourlyRate || 0) : 0);

      const callsSnap = await getDocs(collection(db, `tenants/${tid}/calls`));
      const callsData = callsSnap.docs.map(d => ({ ...d.data() }));
      setAllCalls(callsData);

      const namesSet = new Set<string>();
      callsData.forEach(call => {
        const name = call.contactName?.toString().trim();
        if (name) namesSet.add(name);
      });

      const uniqueNames = Array.from(namesSet).sort();
      setQuickContacts(uniqueNames);

      console.log(`✅ ClientContext loaded ${uniqueNames.length} clients:`, uniqueNames);
    } catch (e) {
      console.error("ClientContext error", e);
    } finally {
      setLoading(false);
    }
  };

  // perClientTotals for every client
  useEffect(() => {
    if (allCalls.length === 0) {
      setPerClientTotals({});
      return;
    }
    const ratePerMin = hourlyRate / 60 || 0;
    const totals: { [key: string]: number } = {};
    allCalls
      .filter(call => call.callType === 'Business')
      .forEach(call => {
        const name = call.contactName?.toString().trim();
        if (!name) return;
        const [h, m, s] = (call.duration || '0:0:0').split(':').map(Number);
        const minutes = (h||0)*60 + (m||0) + (s||0)/60;
        const cost = Math.round(minutes * ratePerMin * 100) / 100;
        totals[name] = (totals[name] || 0) + cost;
      });
    setPerClientTotals(totals);
  }, [allCalls, hourlyRate]);

  // businessTotal derives instantly
  useEffect(() => {
    if (!selectedClientName) {
      setBusinessTotal(0);
      return;
    }
    setBusinessTotal(perClientTotals[selectedClientName] || 0);
  }, [selectedClientName, perClientTotals]);

  // Proper auth listener (fixes web refresh)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadData(user);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <ClientContext.Provider value={{
      quickContacts,
      selectedClientName,
      setSelectedClientName,
      businessTotal,
      perClientTotals,
      hourlyRate,
      loading,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export const useClient = () => {
  const c = useContext(ClientContext);
  if (!c) throw new Error('useClient must be used within ClientProvider');
  return c;
};

export default function Dummy() { return null; }