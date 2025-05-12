import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ExifReader from 'expo-image-manipulator';

// Extended types to include EXIF support
interface ExtendedSaveOptions extends ImageManipulator.SaveOptions {
  exif?: boolean;
}

interface ExtendedImageResult extends ImageManipulator.ImageResult {
  exif?: {
    GPSLatitude?: number | string;
    GPSLongitude?: number | string;
    [key: string]: any;
  };
}

// Type for location data
export interface ImageLocationData {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  hasLocation: boolean;
}

/**
 * Parses DMS (Degrees, Minutes, Seconds) format to decimal degrees
 * e.g., "62°37'51.52"" to 62.63098
 */
function parseDMS(dmsStr: string): number | null {
  try {
    console.log('[XLPOSTCARDS][LOCATION] Attempting to parse DMS string:', dmsStr);
    
    // Handle format like "62°37'51.52""
    const degreeMatch = dmsStr.match(/(\d+)°(\d+)'(\d+\.\d+)"/);
    if (degreeMatch) {
      console.log('[XLPOSTCARDS][LOCATION] Matched degree format with symbols');
      const degrees = parseFloat(degreeMatch[1]);
      const minutes = parseFloat(degreeMatch[2]);
      const seconds = parseFloat(degreeMatch[3]);
      
      if (!isNaN(degrees) && !isNaN(minutes) && !isNaN(seconds)) {
        const decimal = degrees + (minutes / 60) + (seconds / 3600);
        console.log(`[XLPOSTCARDS][LOCATION] Parsed DMS ${degrees}° ${minutes}' ${seconds}" to decimal: ${decimal}`);
        return decimal;
      }
    }
    
    // Try to extract degrees, minutes, seconds from other string formats
    // Like "62:37:51.52" or "62 37 51.52"
    const parts = dmsStr.split(/[^\d.]+/).filter(part => part !== '');
    
    if (parts.length >= 3) {
      const degrees = parseFloat(parts[0]);
      const minutes = parseFloat(parts[1]);
      const seconds = parseFloat(parts[2]);
      
      if (!isNaN(degrees) && !isNaN(minutes) && !isNaN(seconds)) {
        const decimal = degrees + (minutes / 60) + (seconds / 3600);
        console.log(`[XLPOSTCARDS][LOCATION] Parsed DMS ${degrees} ${minutes} ${seconds} to decimal: ${decimal}`);
        return decimal;
      }
    }
    
    console.log('[XLPOSTCARDS][LOCATION] Failed to parse DMS string');
    return null;
  } catch (e) {
    console.error('[XLPOSTCARDS][LOCATION] Error parsing DMS format:', e);
    return null;
  }
}

/**
 * Extracts location data from an image
 */
export async function getImageLocationData(image: ImagePicker.ImagePickerAsset): Promise<ImageLocationData> {
  try {
    // Check if the image has EXIF data
    if (!image.exif) {
      console.log('[XLPOSTCARDS][LOCATION] No EXIF data available in the image');
      return { hasLocation: false };
    }

    console.log('[XLPOSTCARDS][LOCATION] Full EXIF data:', JSON.stringify(image.exif, null, 2));
    
    // Different devices might store GPS data in different formats/properties
    // Try multiple possible GPS data formats
    let latitude: number | undefined;
    let longitude: number | undefined;
    let sourceFormat: string = 'none';
    
    // Format 1: Direct GPS coordinates
    if (image.exif.GPSLatitude && image.exif.GPSLongitude) {
      latitude = typeof image.exif.GPSLatitude === 'number' 
        ? image.exif.GPSLatitude 
        : parseFloat(image.exif.GPSLatitude);
      
      longitude = typeof image.exif.GPSLongitude === 'number' 
        ? image.exif.GPSLongitude 
        : parseFloat(image.exif.GPSLongitude);
      
      console.log('[XLPOSTCARDS][LOCATION] Format 1 - GPS coordinates found:', latitude, longitude);
      sourceFormat = 'format1';
    }
    
    // Format 2: Android sometimes uses these tags
    else if (image.exif.latitude !== undefined && image.exif.longitude !== undefined) {
      latitude = typeof image.exif.latitude === 'number' 
        ? image.exif.latitude 
        : parseFloat(image.exif.latitude);
      
      longitude = typeof image.exif.longitude === 'number' 
        ? image.exif.longitude 
        : parseFloat(image.exif.longitude);
      
      console.log('[XLPOSTCARDS][LOCATION] Format 2 - GPS coordinates found:', latitude, longitude);
      sourceFormat = 'format2';
    }
    
    // Format 3: Some devices use a GPS object
    else if (image.exif.GPS && typeof image.exif.GPS === 'object') {
      const gps = image.exif.GPS;
      console.log('[XLPOSTCARDS][LOCATION] Format 3 - GPS object found:', JSON.stringify(gps, null, 2));
      
      if (gps.Latitude !== undefined && gps.Longitude !== undefined) {
        latitude = typeof gps.Latitude === 'number' ? gps.Latitude : parseFloat(String(gps.Latitude));
        longitude = typeof gps.Longitude === 'number' ? gps.Longitude : parseFloat(String(gps.Longitude));
        
        // Handle South and West coordinates (negative values)
        if (gps.LatitudeRef === 'S') latitude = -Math.abs(latitude || 0);
        if (gps.LongitudeRef === 'W') longitude = -Math.abs(longitude || 0);
        
        console.log('[XLPOSTCARDS][LOCATION] Format 3 - Parsed coordinates:', latitude, longitude);
        sourceFormat = 'format3';
      }
    }
    
    // Format 4: Some iPhones store location this way
    else if (image.exif['GPS'] && typeof image.exif['GPS'] === 'string') {
      try {
        console.log('[XLPOSTCARDS][LOCATION] Format 4 - GPS string found:', image.exif['GPS']);
        const gpsData = JSON.parse(image.exif['GPS']);
        if (gpsData.Latitude !== undefined && gpsData.Longitude !== undefined) {
          latitude = gpsData.Latitude;
          longitude = gpsData.Longitude;
          console.log('[XLPOSTCARDS][LOCATION] Format 4 - Parsed coordinates:', latitude, longitude);
          sourceFormat = 'format4';
        }
      } catch (e) {
        console.log('[XLPOSTCARDS][LOCATION] Error parsing GPS JSON string:', e);
      }
    }
    
    // Format 5: Check for DMS (Degrees, Minutes, Seconds) format strings
    else {
      console.log('[XLPOSTCARDS][LOCATION] Checking Format 5 - DMS format');
      // Look for latitude and longitude in various possible fields
      for (const key in image.exif) {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey.includes('latitude') && typeof image.exif[key] === 'string') {
          console.log(`[XLPOSTCARDS][LOCATION] Found latitude field '${key}' with value:`, image.exif[key]);
          const parsedValue = parseDMS(image.exif[key] as string);
          if (parsedValue !== null) {
            latitude = parsedValue;
            // Check if there's a reference (N/S) in another field
            for (const refKey in image.exif) {
              if (refKey.toLowerCase().includes('latituderef') && 
                  image.exif[refKey] === 'S') {
                latitude = -Math.abs(latitude);
                console.log('[XLPOSTCARDS][LOCATION] Applied South reference to latitude');
                break;
              }
            }
            console.log('[XLPOSTCARDS][LOCATION] Parsed latitude from DMS format:', latitude);
            sourceFormat = 'format5-lat';
          }
        }
        
        if (lowerKey.includes('longitude') && typeof image.exif[key] === 'string') {
          console.log(`[XLPOSTCARDS][LOCATION] Found longitude field '${key}' with value:`, image.exif[key]);
          const parsedValue = parseDMS(image.exif[key] as string);
          if (parsedValue !== null) {
            longitude = parsedValue;
            // Check if there's a reference (E/W) in another field
            for (const refKey in image.exif) {
              if (refKey.toLowerCase().includes('longituderef') && 
                  image.exif[refKey] === 'W') {
                longitude = -Math.abs(longitude);
                console.log('[XLPOSTCARDS][LOCATION] Applied West reference to longitude');
                break;
              }
            }
            console.log('[XLPOSTCARDS][LOCATION] Parsed longitude from DMS format:', longitude);
            sourceFormat = sourceFormat === 'format5-lat' ? 'format5' : 'format5-long';
          }
        }
      }
    }
    
    // If we found coordinates
    if (latitude !== undefined && longitude !== undefined && 
        !isNaN(latitude) && !isNaN(longitude) && 
        Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      
      console.log(`[XLPOSTCARDS][LOCATION] Valid coordinates extracted using ${sourceFormat}:`, latitude, longitude);
      
      // Try to get a readable address from coordinates
      try {
        console.log('[XLPOSTCARDS][LOCATION] Attempting reverse geocoding...');
        const location = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        console.log('[XLPOSTCARDS][LOCATION] Reverse geocoding result:', JSON.stringify(location, null, 2));
        
        if (location && location.length > 0) {
          const address = location[0];
          const locationName = buildLocationName(address);
          
          console.log('[XLPOSTCARDS][LOCATION] Final location data with name:', {
            latitude,
            longitude,
            locationName,
            hasLocation: true
          });
          
          return {
            latitude,
            longitude,
            locationName,
            hasLocation: true
          };
        }
      } catch (error) {
        console.error('[XLPOSTCARDS][LOCATION] Error reverse geocoding:', error);
      }
      
      // Return coordinates even if we couldn't get a name
      console.log('[XLPOSTCARDS][LOCATION] Final location data without name:', {
        latitude,
        longitude,
        hasLocation: true
      });
      
      return {
        latitude,
        longitude,
        hasLocation: true
      };
    }
    
    console.log('[XLPOSTCARDS][LOCATION] No valid GPS coordinates found in EXIF data');
    return { hasLocation: false };
  } catch (error) {
    console.error('[XLPOSTCARDS][LOCATION] Error extracting location data:', error);
    return { hasLocation: false };
  }
}

/**
 * Get the current location from the device
 */
export async function getCurrentLocation(): Promise<ImageLocationData> {
  try {
    // Request permissions first
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'We need location permission to add location data to your photos.'
      );
      return { hasLocation: false };
    }
    
    // Get the current position
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    
    // Try to get a readable address
    const address = await Location.reverseGeocodeAsync({ latitude, longitude });
    
    if (address && address.length > 0) {
      const locationName = buildLocationName(address[0]);
      
      return {
        latitude,
        longitude,
        locationName,
        hasLocation: true
      };
    }
    
    return {
      latitude,
      longitude,
      hasLocation: true
    };
  } catch (error) {
    console.error('[XLPOSTCARDS][LOCATION] Error getting current location:', error);
    return { hasLocation: false };
  }
}

/**
 * Helper to build a readable location name from address components
 */
function buildLocationName(address: Location.LocationGeocodedAddress): string {
  const parts = [];
  
  if (address.city) parts.push(address.city);
  if (address.region) parts.push(address.region);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
}

/**
 * Alternative method to extract location data directly from the image file
 */
export async function extractLocationFromImageFile(uri: string): Promise<ImageLocationData> {
  try {
    console.log('[XLPOSTCARDS][LOCATION] Attempting to extract location directly from file:', uri);
    
    // For photos from gallery that have stripped EXIF but visible in properties
    // This could happen because the image picker's EXIF parsing is incomplete
    // Check if the file contains GPS info using FileSystem
    
    // Read the file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('[XLPOSTCARDS][LOCATION] File info:', fileInfo);
    
    // If we have the original path, we can try to use more direct methods to read raw EXIF
    if (uri.startsWith('file://') || uri.startsWith('/')) {
      // Use image-manipulator to get metadata another way
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [], // no manipulations
          { 
            compress: 1, // keep original quality
            format: ImageManipulator.SaveFormat.JPEG,
            base64: false,
            exif: true // explicitly request EXIF
          } as ExtendedSaveOptions
        ) as ExtendedImageResult;
        
        console.log('[XLPOSTCARDS][LOCATION] Image manipulator metadata:', manipResult.exif);
        
        if (manipResult.exif) {
          // Now try to extract GPS data from this alternate EXIF data
          const exif = manipResult.exif;
          
          // Process EXIF data as we did before
          if (exif.GPSLatitude && exif.GPSLongitude) {
            const latitude = typeof exif.GPSLatitude === 'number' 
              ? exif.GPSLatitude : parseFloat(String(exif.GPSLatitude));
            const longitude = typeof exif.GPSLongitude === 'number' 
              ? exif.GPSLongitude : parseFloat(String(exif.GPSLongitude));
            
            // Perform the reverse geocoding and return location
            // ... rest of the location processing code
            return {
              latitude,
              longitude,
              hasLocation: true
            };
          }
        }
      } catch (err) {
        console.log('[XLPOSTCARDS][LOCATION] Error in image manipulator:', err);
      }
    }
    
    // If we couldn't extract EXIF data directly, return no location
    return { hasLocation: false };
  } catch (error) {
    console.error('[XLPOSTCARDS][LOCATION] Error in extractLocationFromImageFile:', error);
    return { hasLocation: false };
  }
} 