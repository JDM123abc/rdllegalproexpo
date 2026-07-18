import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  Modal, 
  FlatList,
  Platform, 
  Pressable          
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../app/contexts/LanguageContext';

type SearchType = 'invoiceNumber' | 'date' | 'clientName' | 'amount';

type Props = {
  onNewInvoice: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onViewArchived: () => void;
  searchType: SearchType | null | undefined;
  searchText: string;
  onSearchTypeChange: (type: SearchType | null | undefined) => void;
  onSearchTextChange: (text: string) => void;
  onClearSearch: () => void;
  showArchived?: boolean;
  
  // Sort Props
  sortType: string;
  onSortChange: (type: string) => void;
};

const searchOptions = [
  { label: 'Search Select', value: null as any },
  { label: 'Search Invoice No.', value: 'invoiceNumber' as SearchType },
  { label: 'Search Client', value: 'clientName' as SearchType },
  { label: 'Search Date', value: 'date' as SearchType },
  { label: 'Search Amount', value: 'amount' as SearchType },
];

const sortOptions = [
  { label: 'Invoice No. (A → Z)', value: 'invoiceAsc' },
  { label: 'Invoice No. (Z → A)', value: 'invoiceDesc' },
  { label: 'Client Name (A → Z)', value: 'clientAsc' },
  { label: 'Client Name (Z → A)', value: 'clientDesc' },
  { label: 'Date (Newest)', value: 'dateDesc' },
  { label: 'Date (Oldest)', value: 'dateAsc' },
  { label: 'Amount (High → Low)', value: 'amountDesc' },
  { label: 'Amount (Low → High)', value: 'amountAsc' },
];

export default function ClientFilesButtonGrid({
  onNewInvoice,
  onRefresh,
  refreshing,
  onViewArchived,
  searchType,
  searchText,
  onSearchTypeChange,
  onSearchTextChange,
  onClearSearch,
  showArchived,
  sortType,
  onSortChange,
}: Props) {

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const isWeb = Platform.OS === 'web';
  const { lang } = useLang();
  const isEnglish = lang === 'en';

  const getSearchTypeLabel = () => {
    if (!searchType) return 'Search Select';
    const option = searchOptions.find(opt => opt.value === searchType);
    return option ? option.label : 'Search Select';
  };

  return (
    <View>
      {/* ROW 1 - Buttons 1,2,3 stay exactly the same */}
      <View style={styles.buttonGrid}>
        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#34C759' }]} onPress={onNewInvoice}>
          <View style={styles.numberBadge}><Text style={styles.numberText}>1</Text></View>
          <View style={isWeb ? styles.iconRow : styles.iconContainer}>
            <Ionicons name="add-circle" size={isWeb ? 22 : 28} color="white" />
          </View>
          <Text style={styles.gridButtonText}>
  {isEnglish ? "New Invoice" : "Nuwe Faktuur"}
</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#007AFF' }]} onPress={onRefresh} disabled={refreshing}>
          <View style={styles.numberBadge}><Text style={styles.numberText}>2</Text></View>
          <View style={isWeb ? styles.iconRow : styles.iconContainer}>
            <Ionicons name="refresh" size={isWeb ? 22 : 28} color="white" />
          </View>
          <Text style={styles.gridButtonText}>
  {refreshing ? "..." : (isEnglish ? "Refresh" : "Verfris")}
</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.gridButton, { backgroundColor: showArchived ? '#B0B0B0' : '#FF9500' }]} 
          onPress={onViewArchived}
        >
          <View style={styles.numberBadge}><Text style={styles.numberText}>3</Text></View>
          <View style={isWeb ? styles.iconRow : styles.iconContainer}>
            <Ionicons name="archive-outline" size={isWeb ? 22 : 28} color="white" />
          </View>
<Text style={[styles.gridButtonText, showArchived && { color: '#333333' }]}>
  {showArchived 
    ? (isEnglish ? "Hide Archived" : "Versteek Geargiveer") 
    : (isEnglish ? "View Archived" : "Wys Geargiveer")
  }
</Text>
        </TouchableOpacity>
      </View>

      {/* ROW 2 */}
      <View style={styles.searchRow}>
        {/* 4. Sort Button */}
        <TouchableOpacity 
          style={[styles.gridButton, { backgroundColor: '#6c757d', flex: 1 }]} 
          onPress={() => setShowSortDropdown(true)}
        >
          <View style={styles.numberBadge}><Text style={styles.numberText}>4</Text></View>
          <View style={isWeb ? styles.iconRow : styles.iconContainer}>
            <Ionicons name="swap-vertical" size={isWeb ? 20 : 24} color="white" />
          </View>
          <Text style={styles.gridButtonText}>
  {isEnglish ? "Sort" : "Sorteer"}
</Text>
        </TouchableOpacity>

        {/* 5. Search Input (Simple Global Search) */}
        <View style={[styles.gridButton, styles.searchInputWrapper, { flex: isWeb ? 0.95 : 0.7 }]}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>5</Text>
          </View>

          <View style={isWeb ? styles.webSearchIcon : styles.mobileSearchIcon}>
            <Ionicons name="search" size={isWeb ? 22 : 32} color="#007AFF" />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={isEnglish ? "Search..." : "Soek..."}
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholderTextColor="#999"
          />
        </View>

        {/* 6. Clear */}
        <TouchableOpacity 
          style={[styles.gridButton, { backgroundColor: '#dc3545', flex: 1 }]} 
          onPress={() => {
            onClearSearch();
            onSearchTypeChange(undefined);
          }}
        >
          <View style={styles.numberBadge}><Text style={styles.numberText}>6</Text></View>
          <View style={isWeb ? styles.iconRow : styles.iconContainer}>
            <Ionicons name="close-circle" size={isWeb ? 22 : 28} color="white" />
          </View>
          <Text style={styles.gridButtonText}>
  {isEnglish ? "Clear" : "Maak Skoon"}
</Text>
        </TouchableOpacity>
      </View>

      {/* === Sort Modal (Button 4) === */}
      <Modal visible={showSortDropdown} transparent animationType="fade" onRequestClose={() => setShowSortDropdown(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <FlatList
              data={sortOptions}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    onSortChange(item.value);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{item.label}</Text>
                </Pressable>
              )}
            />
            <Pressable style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' }} 
              onPress={() => setShowSortDropdown(false)}>
              <Text style={{ color: '#dc3545', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* === Search Type Modal (Button 5) === */}
      <Modal visible={showSearchDropdown} transparent animationType="fade" onRequestClose={() => setShowSearchDropdown(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSearchDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <FlatList
              data={searchOptions}
              keyExtractor={item => String(item.value)}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    onSearchTypeChange(item.value);
                    setShowSearchDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{item.label}</Text>
                </Pressable>
              )}
            />
            <Pressable style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' }} 
              onPress={() => setShowSearchDropdown(false)}>
              <Text style={{ color: '#dc3545', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },

  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },

gridButton: {
  flex: 1,
  flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: Platform.OS === 'web' ? 14 : 10,
  borderRadius: 12,
  minHeight: Platform.OS === 'web' ? 52 : 92,
  gap: Platform.OS === 'web' ? 8 : 4,
  position: 'relative',
  borderWidth: 1,
  borderColor: '#000',
},

  iconContainer: {
    marginBottom: Platform.OS === 'web' ? 0 : 6,
  },

  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  gridButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: Platform.OS === 'web' ? 14 : 12.5,
    textAlign: 'center',
  },

searchInputWrapper: {
  backgroundColor: '#E8F4FF',
  borderWidth: 2,
  borderColor: '#007AFF',
  paddingHorizontal: 12,
  height: Platform.OS === 'web' ? 52 : 92,
  paddingVertical: Platform.OS === 'web' ? 8 : 12,   // ← This controls inner top/bottom space
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
},

searchInput: {
  flex: 1,
  fontSize: Platform.OS === 'web' ? 16 : 12.5,   // ← bigger on web
  color: '#333',
  paddingLeft: 8,
  paddingTop: Platform.OS === 'web' ? 12 : 32,
  opacity: 1,
  zIndex: 10,

  // Remove default inner black border on web
  borderWidth: 0,
  borderColor: 'transparent',
  outlineWidth: 0,
  outlineColor: 'transparent',
},

numberBadge: {
  position: 'absolute',
  top: 6,
  left: 6,
  backgroundColor: 'rgba(0,0,0,0.35)',
  width: 18,           // ← Controls width
  height: 18,          // ← Controls height
  borderRadius: 9,     // ← Makes it round (half of width/height)
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},

  numberText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Web Icon
  webSearchIcon: {
    marginRight: 12,
    marginLeft: 16,
  },

  // Mobile: Search Icon Top Center
  mobileSearchIcon: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: [{ translateX: -2 }],
    zIndex: 6,
  },

  // Web Placeholder
  webPlaceholder: {
    position: 'absolute',
    left: 36,
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    alignItems: 'center',
  },

  // Mobile: Stacked Placeholder (centered under icon)
mobilePlaceholder: {
  position: 'absolute',
  top: 50,
  left: 40,
  alignItems: 'flex-start',
  paddingTop: 4,              // ← Small vertical nudge
  zIndex: 5,
},

  placeholderText: {
    fontSize: 14.5,
    color: '#999',
    textAlign: 'center',
  },

  placeholderLine: {
    fontSize: 13.5,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '70%',
    maxHeight: 280,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
});