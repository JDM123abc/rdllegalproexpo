import { getFirestore, collection, getDocs } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export const generateInvoiceNumber = async (tenantId: string): Promise<string> => {
  if (!tenantId) return 'Firm-abc-Inv-01';

  const user = getAuth().currentUser;
  if (!user) return `${tenantId}-Inv-01`;

  try {
    const draftsRef = collection(getFirestore(), `users/${user.uid}/client-files`);
    const snapshot = await getDocs(draftsRef);

    let maxNum = 0;

    snapshot.forEach(doc => {
      const invNum = doc.data().invoiceNumber || '';
      const match = invNum.match(/Inv-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${tenantId}-Inv-${String(nextNum).padStart(2, '0')}`;
  } catch (e) {
    console.error("Error generating invoice number", e);
    return `${tenantId}-Inv-01`;
  }
};