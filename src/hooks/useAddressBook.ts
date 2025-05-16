import { useCallback } from 'react';
import { useAddressBookStore, Address } from '../store/addressBookStore';

export const useAddressBook = () => {
  const { addresses, addAddress, removeAddress, updateAddress, loadAddresses } = useAddressBookStore();

  const saveAddress = useCallback(async (address: Address) => {
    await addAddress(address);
  }, [addAddress]);

  const deleteAddress = useCallback(async (id: string) => {
    await removeAddress(id);
  }, [removeAddress]);

  const editAddress = useCallback(async (address: Address) => {
    await updateAddress(address);
  }, [updateAddress]);

  const getAddresses = useCallback(async () => {
    console.log('[XLPOSTCARDS][DEBUG] Getting addresses from store...');
    await loadAddresses();
    console.log('[XLPOSTCARDS][DEBUG] Current addresses in store:', addresses);
    return addresses;
  }, [loadAddresses, addresses]);

  return {
    addresses,
    saveAddress,
    deleteAddress,
    editAddress,
    getAddresses,
  };
}; 