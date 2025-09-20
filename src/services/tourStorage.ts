import AsyncStorage from '@react-native-async-storage/async-storage';
import { tourConfig } from '../config/tourConfig';

export interface TourState {
  hasSeen: boolean;
  versionSeen: number;
}

const STORAGE_KEY = tourConfig.storage.asyncStorageKey;

export class TourStorageService {
  /**
   * Get the current tour state from AsyncStorage
   */
  static async getTourState(): Promise<TourState> {
    try {
      const storedState = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        return {
          hasSeen: parsed.hasSeen || false,
          versionSeen: parsed.versionSeen || 0
        };
      }
    } catch (error) {
      console.warn('Error reading tour state from AsyncStorage:', error);
    }
    
    // Return default state if nothing stored or error occurred
    return {
      hasSeen: false,
      versionSeen: 0
    };
  }

  /**
   * Save the tour state to AsyncStorage
   */
  static async saveTourState(state: TourState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving tour state to AsyncStorage:', error);
    }
  }

  /**
   * Mark the tour as completed for the current version
   */
  static async markTourCompleted(): Promise<void> {
    const state: TourState = {
      hasSeen: true,
      versionSeen: tourConfig.version
    };
    await this.saveTourState(state);
  }

  /**
   * Check if the tour should be shown
   * Returns true if:
   * - User has never seen the tour, OR
   * - User has seen an older version of the tour
   */
  static async shouldShowTour(): Promise<boolean> {
    const state = await this.getTourState();
    
    // Show if never seen
    if (!state.hasSeen) {
      return true;
    }
    
    // Show if current version is newer than what user has seen
    if (state.versionSeen < tourConfig.version) {
      return true;
    }
    
    return false;
  }

  /**
   * Reset tour state (for testing or retaking tour)
   */
  static async resetTourState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[TOUR] Tour state reset - cleared from AsyncStorage');
    } catch (error) {
      console.warn('Error resetting tour state:', error);
    }
  }

  /**
   * Force show tour (for "retake tour" functionality)
   */
  static async forceTourRestart(): Promise<void> {
    const state: TourState = {
      hasSeen: false,
      versionSeen: 0
    };
    await this.saveTourState(state);
    console.log('[TOUR] Tour state reset for restart - set hasSeen to false');
  }
}