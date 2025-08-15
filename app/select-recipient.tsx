import React from 'react';
import { SafeAreaView, View, FlatList, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { PostcardSize, supportedPostcardSizes } from '@/utils/printSpecs';

export default function SelectRecipientScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = React.useState<any[]>([]);
  const params = useLocalSearchParams();
// Validate and normalize postcardSize param for safe forwarding
const postcardSizeParam = (params?.postcardSize as string) || '';
const validPostcardSize: PostcardSize = (supportedPostcardSizes.includes(postcardSizeParam as PostcardSize)
  ? (postcardSizeParam as PostcardSize)
  : 'xl');


  React.useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('addresses');
      const parsed = stored ? JSON.parse(stored) : [];
      setAddresses(parsed);
    })();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = addresses.filter(a => a.id !== id);
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        setAddresses(updated);
      }},
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Recipient</Text>
        <FlatList
          data={[{ id: 'add_new', name: '+ Add new address' }, ...addresses]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  if (item.id === 'add_new') {
                    console.log('[XLPOSTCARDS][SELECT-RECIPIENT] Adding new address with params:', { addNewAddress: 'true', imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize });
                    router.replace({ pathname: '/', params: { addNewAddress: 'true', imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize } });
                  } else {
                    console.log('[XLPOSTCARDS][SELECT-RECIPIENT] Selecting recipient with params:', { selectedRecipientId: item.id, imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize });
                    router.replace({ pathname: '/', params: { selectedRecipientId: item.id, imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize } });
                  }
                }}
              >
                <Text style={[styles.itemText, item.id === 'add_new' && styles.addNew]}>{item.name}</Text>
              </TouchableOpacity>
              {item.id !== 'add_new' && (
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.replace({ pathname: '/', params: { editAddressId: item.id } })}
                  >
                    <Ionicons name="create-outline" size={22} color="#0a7ea4" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#f44336" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
        <View style={{ height: 32 }} />
        <TouchableOpacity style={styles.cancelButton} onPress={() => {
          console.log('[XLPOSTCARDS][SELECT-RECIPIENT] Canceling with params:', { imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize });
          router.replace({ pathname: '/', params: { imageUri: params.imageUri, message: params.message, postcardSize: validPostcardSize } });
        }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f28914',
    textAlign: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  item: {
    flex: 1,
    paddingVertical: 18,
  },
  itemText: {
    fontSize: 20,
    color: '#333',
  },
  addNew: {
    color: '#222',
    fontWeight: 'bold',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
  },
  cancelButton: {
    marginTop: 32,
    backgroundColor: '#f28914',
    borderRadius: 8,
    alignItems: 'center',
    padding: 16,
  },
  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});