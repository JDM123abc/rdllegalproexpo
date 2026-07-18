import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import ServiceRow from './ServiceRow';
import { useClient } from '../app/contexts/ClientContext';

const styles = StyleSheet.create({
  contentCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 1050,
    alignSelf: 'center',
    width: '100%',
  },

  serviceRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    flexWrap: 'wrap',
    gap: 8,
  },

  lockedRow: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#999',
  },

  number: { 
    fontSize: 17, 
    fontWeight: '700', 
    width: 40, 
    color: '#555',
    textAlign: 'right',
  },
  
  longLabel: { 
    flex: 1, 
    fontSize: 15.5, 
    color: '#222',
    minWidth: 180,
    paddingLeft: 8,
  },

  inputsGroup: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  smallInputContainer: {
    width: 100,
  },

  lockedField: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  totalContainer: {
    width: 110,
    alignItems: 'flex-end',
  },

  lockedTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d32f2f',
    textAlign: 'center',
    minWidth: 92,
  },

  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    flex: 1,
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
});

export default function ServicesSummary({ onGrandTotalChange, initialValues = {}, onSaveValues }) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const { selectedClientName, businessTotal } = useClient();

  const [globalRate, setGlobalRate] = useState('0');

  const handleSaveValues = onSaveValues || (() => {});

  // Load hourly rate from Firestore
  useEffect(() => {
    const loadRate = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, `users/${user.uid}`));
        if (userDoc.exists() && userDoc.data()?.tenantId) {
          const tid = userDoc.data().tenantId;
          const tenantDoc = await getDoc(doc(db, `tenants/${tid}`));
          if (tenantDoc.exists()) {
            const rate = tenantDoc.data().hourlyRate || 0;
            setGlobalRate(rate.toString());
          }
        }
      } catch (e) {
        console.log("Failed to load rate", e);
      }
    };
    loadRate();
  }, []);

  const rateValue = globalRate || '0';
  const rate13Value = globalRate ? Math.round(parseFloat(globalRate) / 2).toString() : '0';

  // Initialize states
  const [min1, setMin1] = useState('');
  const [min2, setMin2] = useState('');
  const [min3, setMin3] = useState('');
  const [min4, setMin4] = useState('');
  const [min5, setMin5] = useState('');
  const [min6, setMin6] = useState('');
  const [min7, setMin7] = useState('');
  const [min8, setMin8] = useState('');
  const [min9, setMin9] = useState('');
  const [min10, setMin10] = useState('');
  const [min11, setMin11] = useState('');
  const [min12, setMin12] = useState('');
  const [min13, setMin13] = useState('');
  const [min14, setMin14] = useState('');
  const [min15, setMin15] = useState('');

  // Update when initialValues change (this is the key fix)
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setMin1(initialValues.min1 || '');
      setMin2(initialValues.min2 || '');
      setMin3(initialValues.min3 || '');
      setMin4(initialValues.min4 || '');
      setMin5(initialValues.min5 || '');
      setMin6(initialValues.min6 || '');
      setMin7(initialValues.min7 || '');
      setMin8(initialValues.min8 || '');
      setMin9(initialValues.min9 || '');
      setMin10(initialValues.min10 || '');
      setMin11(initialValues.min11 || '');
      setMin12(initialValues.min12 || '');
      setMin13(initialValues.min13 || '');
      setMin14(initialValues.min14 || '');
      setMin15(initialValues.min15 || '');
    }
  }, [initialValues]);

  // Calculate Grand Total
  const grandTotal = 
    businessTotal +
    (min1 && rateValue ? Math.round(parseFloat(min1)/60 * parseFloat(rateValue)) : 0) +
    (min2 && rateValue ? Math.round(parseFloat(min2)/60 * parseFloat(rateValue)) : 0) +
    (min3 && rateValue ? Math.round(parseFloat(min3)/60 * parseFloat(rateValue)) : 0) +
    (min4 && rateValue ? Math.round(parseFloat(min4)/60 * parseFloat(rateValue)) : 0) +
    (min5 && rateValue ? Math.round(parseFloat(min5)/60 * parseFloat(rateValue)) : 0) +
    (min6 && rateValue ? Math.round(parseFloat(min6)/60 * parseFloat(rateValue)) : 0) +
    (min7 && rateValue ? Math.round(parseFloat(min7)/60 * parseFloat(rateValue)) : 0) +
    (min8 && rateValue ? Math.round(parseFloat(min8)/60 * parseFloat(rateValue)) : 0) +
    (min9 && rateValue ? Math.round(parseFloat(min9)/60 * parseFloat(rateValue)) : 0) +
    (min10 && rateValue ? Math.round(parseFloat(min10)/60 * parseFloat(rateValue)) : 0) +
    (min11 && rateValue ? Math.round(parseFloat(min11)/60 * parseFloat(rateValue)) : 0) +
    (min12 && rateValue ? Math.round(parseFloat(min12) * parseFloat(rateValue) * 0.006) : 0) +
    (min13 && rate13Value ? Math.round(parseFloat(min13)/60 * parseFloat(rate13Value)) : 0) +
    (min14 && rateValue ? Math.round(parseFloat(min14)/60 * parseFloat(rateValue)) : 0) +
    (min15 && rateValue ? Math.round(parseFloat(min15)/60 * parseFloat(rateValue)) : 0);

  // Report grandTotal to parent
  useEffect(() => {
    if (onGrandTotalChange) {
      onGrandTotalChange(grandTotal);
    }
  }, [grandTotal, onGrandTotalChange]);

  // Send all rows back for saving
  useEffect(() => {
    handleSaveValues({
      min1, min2, min3, min4, min5,
      min6, min7, min8, min9, min10,
      min11, min12, min13, min14, min15,
      globalRate
    });
  }, [min1, min2, min3, min4, min5, min6, min7, min8, min9, min10, 
      min11, min12, min13, min14, min15, globalRate, handleSaveValues]);

  return (
    <View style={styles.contentCard}>

      {/* ROW 01 - Locked */}
      <View style={[styles.serviceRowContainer, styles.lockedRow]}>
        <Text style={styles.number}>01.</Text>
        
        <Text style={styles.longLabel} numberOfLines={2} ellipsizeMode="tail">
          {isEnglish 
            ? `Professional services rendered to ${selectedClientName || 'Client'} (Business calls)` 
            : `Professionele dienste gelewer aan ${selectedClientName || 'Kliënt'} (Besigheid oproepe)`}
        </Text>

        <View style={styles.inputsGroup}>
          <View style={styles.smallInputContainer}>
            <Text style={styles.lockedField}>Locked</Text>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.lockedTotal}>
            R {businessTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* ROW 02 */}
      <ServiceRow 
        number="02." 
        labelEn="Taking of instructions from:" 
        labelAf="Neem van instruksies van:" 
        minValue={min1} 
        onMinChange={setMin1} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min1 && rateValue ? Math.round(parseFloat(min1)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 03 */}
      <ServiceRow 
        number="03." 
        labelEn="Examine and study of documents and attachments received from:" 
        labelAf="Deurlees en bestudeer van dokumente en aanhangsels ontvang van:" 
        minValue={min2} 
        onMinChange={setMin2} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min2 && rateValue ? Math.round(parseFloat(min2)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 04 */}
      <ServiceRow 
        number="04." 
        labelEn="Receive and study e-mail from:" 
        labelAf="Ontvang en deurlees van e-pos vanaf:" 
        minValue={min3} 
        onMinChange={setMin3} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min3 && rateValue ? Math.round(parseFloat(min3)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 05 */}
      <ServiceRow 
        number="05." 
        labelEn="Draft letter, document, affidavit, court document for:" 
        labelAf="Opstel van brief, beëdigde verklaring, prosesstuk op aan:" 
        minValue={min4} 
        onMinChange={setMin4} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min4 && rateValue ? Math.round(parseFloat(min4)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 06 */}
      <ServiceRow 
        number="06." 
        labelEn="Send letter with attachments to:" 
        labelAf="Stuur brief per epos aan:" 
        minValue={min5} 
        onMinChange={setMin5} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min5 && rateValue ? Math.round(parseFloat(min5)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 07 */}
      <ServiceRow 
        number="07." 
        labelEn="Study of e-mail received from:" 
        labelAf="Deurlees van e-pos van:" 
        minValue={min6} 
        onMinChange={setMin6} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min6 && rateValue ? Math.round(parseFloat(min6)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 08 */}
      <ServiceRow 
        number="08." 
        labelEn="Draft e-mail to:" 
        labelAf="Skryf E-pos aan:" 
        minValue={min7} 
        onMinChange={setMin7} 
        showPages 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min7 && rateValue ? Math.round(parseFloat(min7)/60 * parseFloat(rateValue)) : 0} 
      />

      {/* ROW 09 */}
      <ServiceRow 
        number="09." 
        labelEn="Teleconsultation with:" 
        labelAf="Telefoniese konsultasie met:" 
        minValue={min8} 
        onMinChange={setMin8} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min8 && rateValue ? Math.round(parseFloat(min8)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 10 */}
      <ServiceRow 
        number="10." 
        labelEn="Receive telephonic instructions from:" 
        labelAf="Ontvang telefoniese instruksies van:" 
        minValue={min9} 
        onMinChange={setMin9} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min9 && rateValue ? Math.round(parseFloat(min9)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 11 */}
      <ServiceRow 
        number="11." 
        labelEn="Consultation with:" 
        labelAf="Konsulteer met:" 
        minValue={min10} 
        onMinChange={setMin10} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min10 && rateValue ? Math.round(parseFloat(min10)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 12 */}
      <ServiceRow 
        number="12." 
        labelEn="Visit ___ for consultation with:" 
        labelAf="Opwagting by ___ en konsulteer met:" 
        minValue={min11} 
        onMinChange={setMin11} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min11 && rateValue ? Math.round(parseFloat(min11)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 13 */}
      <ServiceRow 
        number="13." 
        labelEn="Travelling expenses (km @ R per km) from office to, and back:" 
        labelAf="Reiskoste (km @ R per km) van kantoor na, en terug:" 
        minValue={min12} 
        onMinChange={setMin12} 
        isKm 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min12 && rateValue ? Math.round(parseFloat(min12) * parseFloat(rateValue) * 0.006) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 14 */}
      <ServiceRow 
        number="14." 
        labelEn="Travelling time (min @ 50% of hourly tariff) from office to and back:" 
        labelAf="Reistyd (min @ 50% van uurse tariff) van kantoor na en terug:" 
        minValue={min13} 
        onMinChange={setMin13} 
        isRate13 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        rate13Value={rate13Value} 
        total={min13 && rate13Value ? Math.round(parseFloat(min13)/60 * parseFloat(rate13Value)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 15 */}
      <ServiceRow 
        number="15." 
        labelEn="Preparation for:" 
        labelAf="Voorbereiding vir:" 
        minValue={min14} 
        onMinChange={setMin14} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min14 && rateValue ? Math.round(parseFloat(min14)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* ROW 16 */}
      <ServiceRow 
        number="16." 
        labelEn="Attendance and appear in court:" 
        labelAf="Opwagting en bywoon van verhoor by:" 
        minValue={min15} 
        onMinChange={setMin15} 
        globalRate={globalRate} 
        onRateChange={setGlobalRate} 
        total={min15 && rateValue ? Math.round(parseFloat(min15)/60 * parseFloat(rateValue)) : 0} 
		disabledPages={true}     // ← ADD THIS
      />

      {/* Grand Total */}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>
          {isEnglish ? "GRAND TOTAL" : "GROOT TOTAAL"}
        </Text>
        <Text style={styles.grandTotalAmount}>
          R {grandTotal}
        </Text>
      </View>

    </View>
  );
}