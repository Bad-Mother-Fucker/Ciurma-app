import { Preferences } from '@capacitor/preferences';

/**
 * Adapter di storage per Supabase Auth basato su @capacitor/preferences.
 * Funziona identico su web (IndexedDB/localStorage dietro le quinte) e su
 * Android nativo: niente `localStorage` diretto, come richiesto per poter
 * girare anche in Capacitor.
 */
export const capacitorStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};
