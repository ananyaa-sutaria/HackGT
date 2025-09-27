// client/src/lib/auth.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'subsense_token';

async function canUseSecureStore() {
  try {
    if (Platform.OS === 'web') return false; // no native keychain on web
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setToken(token: string) {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED, // optional
    });
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, token);
  } else {
    await AsyncStorage.setItem(KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (await canUseSecureStore()) {
    return await SecureStore.getItemAsync(KEY);
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(KEY);
  } else {
    return await AsyncStorage.getItem(KEY);
  }
}

export async function clearToken() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(KEY);
      } else if (await SecureStore.isAvailableAsync()) {
        await SecureStore.deleteItemAsync(KEY);
      } else {
        await AsyncStorage.removeItem(KEY);
      }
    } catch {}
  }