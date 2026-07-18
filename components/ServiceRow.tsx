import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { useLang } from '../app/contexts/LanguageContext';

type ServiceRowProps = {
  number: string;
  labelEn: string;
  labelAf: string;
  minValue: string;
  onMinChange: (text: string) => void;
  showPages?: boolean;
  isKm?: boolean;
  isRate13?: boolean;
  globalRate: string;
  onRateChange: (text: string) => void;
  rate13Value?: string;
  total: number;
  isLocked?: boolean;        // ← NEW
  disabledPages?: boolean;     // ← ADD THIS
};

export default function ServiceRow({
  number,
  labelEn,
  labelAf,
  minValue,
  onMinChange,
  showPages = false,
  isKm = false,
  isRate13 = false,
  globalRate,
  onRateChange,
  rate13Value,
  total,
  isLocked = false,         // ← default false
  disabledPages = false,       // ← ADD HERE
}: ServiceRowProps) {
  const { lang } = useLang();
  const isEnglish = lang === 'en';
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[
      styles.serviceRow, 
      isLocked && styles.lockedRow
    ]}>
      <Text style={styles.number}>{number}</Text>

      <Text style={styles.longLabel}>
        {isEnglish ? labelEn : labelAf}
      </Text>

      <View style={[styles.inputsGroup, isWeb && styles.inputsGroupWeb]}>
        {/* Client/Court - disabled when locked */}
        <TextInput 
          style={[styles.input, isLocked && styles.lockedInput]} 
          placeholder={isEnglish ? "Client/Court" : "Kliënt/Hof"} 
          placeholderTextColor="#aaaaaa" 
          editable={!isLocked}
        />

{/* Pages */}
<View style={styles.smallInputContainer}>
  <TextInput 
    style={[styles.smallInput, (isLocked || disabledPages) && styles.lockedInput]} 
    placeholder="00" 
    keyboardType="numeric" 
    placeholderTextColor="#aaaaaa" 
    editable={!isLocked && !disabledPages}
  />
  <Text style={styles.minSuffix}>
    {showPages ? (isEnglish ? "Pages" : "Bladsye") : ""}
  </Text>
</View>

        {/* Minutes / Km */}
        <View style={styles.minutesInputContainer}>
          <TextInput 
            style={[styles.minutesInput, isLocked && styles.lockedInput]} 
            placeholder="00" 
            keyboardType="numeric" 
            value={minValue} 
            onChangeText={onMinChange} 
            placeholderTextColor="#aaaaaa" 
            editable={!isLocked}
          />
          <Text style={styles.minSuffix}>
            {isKm ? "km" : "min"}
          </Text>
        </View>

        {/* Rate */}
        <View style={styles.rateContainer}>
          <TextInput 
            style={[styles.rateInput, isLocked && styles.lockedInput]} 
            placeholder="00" 
            keyboardType="numeric" 
            value={isRate13 ? rate13Value : globalRate} 
            onChangeText={isRate13 ? () => {} : onRateChange} 
            editable={!isLocked && !isRate13}
            placeholderTextColor="#aaaaaa" 
          />
          <Text style={styles.rateSuffix}>Rate/Hr</Text>
        </View>

        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={[styles.totalBox, isLocked && styles.lockedTotalBox]}>
            R {total}
          </Text>
          <Text style={styles.totalSuffix}>Total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
    flexWrap: 'wrap',
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#fafcff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  lockedRow: {
    backgroundColor: '#f5f5f5',
    borderLeftColor: '#999',
  },

  number: {
    fontSize: 18,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
    color: '#007AFF',
  },
  longLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
    flexShrink: 1,
    minWidth: 160,
    maxWidth: 580,
  },

  inputsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inputsGroupWeb: {
    flexWrap: 'nowrap',
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    width: 225,
  },
  lockedInput: {
    backgroundColor: '#e9ecef',
    color: '#666',
    borderColor: '#ccc',
  },

  smallInputContainer: {
    position: 'relative',
    width: 90,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    width: 90,
  },

  rateContainer: {
    position: 'relative',
    width: 118,
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    paddingRight: 68,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    width: 118,
  },

  totalContainer: {
    position: 'relative',
    width: 110,
  },
  totalBox: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#e6f0ff',
    width: 110,
    color: '#007AFF',
    fontWeight: '700',
  },
  lockedTotalBox: {
    backgroundColor: '#e9ecef',
    borderColor: '#999',
    color: '#444',
  },

  rateSuffix: {
    position: 'absolute',
    right: 12,
    bottom: 11,
    fontSize: 10.5,
    color: '#666',
    pointerEvents: 'none',
  },
  minSuffix: {
    position: 'absolute',
    right: 8,
    bottom: 11,
    fontSize: 11,
    color: '#666',
    pointerEvents: 'none',
  },
  totalSuffix: {
    position: 'absolute',
    right: 8,
    bottom: 11,
    fontSize: 11,
    color: '#666',
    pointerEvents: 'none',
  },
  minutesInputContainer: {
  position: 'relative',
  width: 78,                    // ← You can change this independently
},

minutesInput: {
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  padding: 10,
  fontSize: 15,
  backgroundColor: '#f9fafb',
  width: 78,                    // ← You can change this independently
},
});