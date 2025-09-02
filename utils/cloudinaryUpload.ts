import * as FileSystem from 'expo-file-system';

/**
 * Upload image to Cloudinary using unsigned upload preset
 * Railway uses SDK, app uses unsigned uploads for React Native compatibility
 */
export const uploadToCloudinary = async (
  imageUri: string,
  filename: string
): Promise<string> => {
  console.log('[CLOUDINARY] Uploading image to Cloudinary...');
  console.log('[CLOUDINARY] Source URI:', imageUri.substring(0, 50) + '...');
  console.log('[CLOUDINARY] Filename:', filename);

  try {
    // Read image as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[CLOUDINARY] Image converted to base64, size:', base64Image.length);
    
    // Create data URL format
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
    // Create form data for unsigned upload
    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('upload_preset', 'xlpostcards-unsigned');
    formData.append('folder', 'postcards/fronts');
    
    // Upload to Cloudinary
    const response = await fetch('https://api.cloudinary.com/v1_1/db9totnmb/image/upload', {
      method: 'POST',
      body: formData,
    });
    
    console.log('[CLOUDINARY] Upload response status:', response.status);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('[CLOUDINARY] Upload successful!');
      console.log('[CLOUDINARY] Cloudinary URL:', result.secure_url);
      console.log('[CLOUDINARY] Public ID:', result.public_id);
      
      return result.secure_url;
    } else {
      const errorText = await response.text();
      console.error('[CLOUDINARY] Upload failed:', response.status, errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('[CLOUDINARY] Error during upload:', error);
    throw error;
  }
};