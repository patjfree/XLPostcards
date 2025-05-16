import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export interface AddressBookEntry {
  id: string;
  name: string;
  salutation?: string;
  birthday?: string; // ISO date string
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

const STORAGE_KEY = '@XLPostcards_AddressBook';

export async function getAddressBook(): Promise<AddressBookEntry[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveAddressBook(entries: AddressBookEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addOrUpdateEntry(entry: AddressBookEntry): Promise<void> {
  const entries = await getAddressBook();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push({ ...entry, id: entry.id || uuidv4() });
  }
  await saveAddressBook(entries);
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getAddressBook();
  const filtered = entries.filter(e => e.id !== id);
  await saveAddressBook(filtered);
} 