import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ImagePicker from 'react-native-image-crop-picker';
import { TemplateType } from './TemplateSelector';

export interface SelectedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  type: string;
  fileName?: string;
  fileSize?: number;
  assetId?: string;
}

interface MultiImagePickerProps {
  images: SelectedImage[];
  onImagesChange: (images: SelectedImage[]) => void;
  templateType: TemplateType;
  maxImages: number;
}

const templateRequirements = {
  single: 1,
  two_side_by_side: 2,
  three_photos: 3,
  four_quarters: 4,
};

// Calculate aspect ratio for each photo slot based on template and position
const getAspectRatioForSlot = (templateType: TemplateType, slotIndex: number): [number, number] => {
  switch (templateType) {
    case 'single':
      return [3, 2]; // Full postcard 3:2
    
    case 'two_side_by_side':
      return [3, 4]; // Each half is 3:4 (vertical)
    
    case 'three_photos':
      if (slotIndex === 0) {
        return [3, 4]; // Left large photo is 3:4 (vertical)
      } else {
        return [3, 2]; // Right photos are 3:2 (horizontal)
      }
    
    case 'four_quarters':
      return [3, 2]; // Each quarter is 3:2
    
    default:
      return [3, 2]; // Default fallback
  }
};

export default function MultiImagePicker({ 
  images, 
  onImagesChange, 
  templateType, 
  maxImages 
}: MultiImagePickerProps) {
  const requiredImages = templateRequirements[templateType];
  const canAddMore = images.length < maxImages;

  const pickImage = async (targetSlotIndex?: number) => {
    // Determine which slot we're filling (either passed or next available)
    const slotIndex = targetSlotIndex !== undefined ? targetSlotIndex : images.length;
    const [aspectWidth, aspectHeight] = getAspectRatioForSlot(templateType, slotIndex);
    try {
      // iOS-specific: Force memory cleanup before opening picker
      if (Platform.OS === 'ios' && global.gc) {
        global.gc();
      }
      
      if (Platform.OS === 'ios') {
        // iOS: Use react-native-image-crop-picker for template-aware cropping
        const cropWidth = aspectWidth * 500; // Scale up for quality
        const cropHeight = aspectHeight * 500;
        console.log(`iOS cropping for slot ${slotIndex}: ${aspectWidth}:${aspectHeight} (${cropWidth}x${cropHeight})`);
        
        const pickedImage = await ImagePicker.openPicker({
          width: cropWidth,
          height: cropHeight,
          cropping: true,
          cropperToolbarTitle: 'Crop your postcard image',
          cropperChooseText: 'Choose',
          cropperCancelText: 'Cancel',
          cropperRotateButtonsHidden: false,
          includeBase64: true,
          mediaType: 'photo',
          forceJpg: true,
          // iOS-specific settings for better experience
          cropperCircleOverlay: false,
          showCropGuidelines: true,
          showCropFrame: true,
          enableRotationGesture: true,
          cropperActiveWidgetColor: '#f28914',
          cropperStatusBarColor: '#000000',
          cropperToolbarColor: '#000000',
          cropperToolbarWidgetColor: '#ffffff',
        });
        
        // Ensure we have base64 data for OpenAI analysis
        let imageBase64 = pickedImage.data;
        
        if (!imageBase64) {
          console.log('iOS: No base64 from picker, this should not happen with includeBase64: true');
          // This shouldn't happen with includeBase64: true, but just in case
          imageBase64 = undefined;
        }

        const newImage: SelectedImage = {
          uri: pickedImage.path,
          width: cropWidth,
          height: cropHeight,
          base64: imageBase64,
          type: 'image',
          fileName: pickedImage.filename || 'image.jpg',
          fileSize: pickedImage.size || 0,
          assetId: '',
        };
        
        // Insert image at the correct slot position  
        const updatedImages = [...images];
        if (targetSlotIndex !== undefined && targetSlotIndex < updatedImages.length) {
          updatedImages[targetSlotIndex] = newImage; // Replace existing slot
        } else {
          updatedImages.push(newImage); // Add to end
        }
        onImagesChange(updatedImages);
        
      } else {
        // Android: Use Expo ImagePicker with template-aware aspect ratio
        console.log(`Android cropping for slot ${slotIndex}: ${aspectWidth}:${aspectHeight}`);
        
        const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select photos.');
          return;
        }

        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [aspectWidth, aspectHeight], // Template-aware aspect ratio
          quality: 0.9,
          base64: true,
        });

        if (!result.canceled && result.assets[0]) {
          const selectedImage = result.assets[0];
          
          // Calculate target dimensions based on aspect ratio
          const targetWidth = aspectWidth * 500; // Scale up for quality  
          const targetHeight = aspectHeight * 500;
          
          // Ensure the image is properly sized to template aspect ratio
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [
              { resize: { width: targetWidth } } // Let height adjust automatically to maintain aspect ratio
            ],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          // Ensure final dimensions match exactly
          const finalImage = await ImageManipulator.manipulateAsync(
            manipulatedImage.uri,
            [
              { resize: { width: targetWidth, height: targetHeight } }
            ],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          // Ensure we have base64 data for OpenAI analysis
          let imageBase64 = finalImage.base64 || selectedImage.base64;
          
          // If still no base64, generate it from the final image
          if (!imageBase64) {
            console.log('No base64 found, regenerating from final image');
            const base64Result = await ImageManipulator.manipulateAsync(
              finalImage.uri,
              [],
              {
                compress: 0.8,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
              }
            );
            imageBase64 = base64Result.base64;
          }

          const newImage: SelectedImage = {
            uri: finalImage.uri,
            width: targetWidth,
            height: targetHeight,
            base64: imageBase64,
            type: 'image',
            fileName: selectedImage.fileName || 'image.jpg',
            fileSize: selectedImage.fileSize || 0,
            assetId: selectedImage.assetId || '',
          };
          
          // Insert image at the correct slot position
          const updatedImages = [...images];
          if (targetSlotIndex !== undefined && targetSlotIndex < updatedImages.length) {
            updatedImages[targetSlotIndex] = newImage; // Replace existing slot
          } else {
            updatedImages.push(newImage); // Add to end
          }
          onImagesChange(updatedImages);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      // User cancelled or error - don't show alert for cancellation
      if ((error as any)?.message && !(error as any).message.includes('cancelled')) {
        Alert.alert('Error', 'Failed to select image.');
      }
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    onImagesChange(updatedImages);
  };

  const renderImageSlot = (index: number) => {
    const image = images[index];
    const isEmpty = !image;
    const isRequired = index < requiredImages;

    if (isEmpty && !canAddMore && !isRequired) {
      return null; // Don't show empty slots if we can't add more and it's not required
    }

    return (
      <View key={index} style={[styles.imageSlot, isEmpty && styles.emptyImageSlot]}>
        {image ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={20} color="#ff4444" />
            </TouchableOpacity>
            <View style={styles.imageIndexBadge}>
              <Text style={styles.imageIndexText}>{index + 1}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addImageButton, !canAddMore && styles.disabledButton]}
            onPress={canAddMore ? () => pickImage(index) : undefined}
            disabled={!canAddMore}
          >
            <Ionicons 
              name="add" 
              size={32} 
              color={canAddMore ? '#f28914' : '#ccc'} 
            />
            <Text style={[styles.addImageText, !canAddMore && styles.disabledText]}>
              {isRequired ? 'Required' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>
          {images.length > 1 ? 'Photos' : 'Photo'} ({images.length}/{requiredImages})
        </Text>
        {images.length < requiredImages && (
          <Text style={styles.missingText}>
            Need {requiredImages - images.length} more
          </Text>
        )}
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imagesScroll}
        contentContainerStyle={styles.imagesContainer}
      >
        {Array.from({ length: Math.max(maxImages, requiredImages) }).map((_, index) =>
          renderImageSlot(index)
        )}
      </ScrollView>

      {images.length > 0 && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Tap the X to remove photos. Images are arranged left-to-right, top-to-bottom in the template.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontWeight: 'bold',
    color: '#f28914',
    fontSize: 18,
  },
  missingText: {
    color: '#ff6666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  imagesScroll: {
    marginHorizontal: -8,
  },
  imagesContainer: {
    paddingHorizontal: 8,
    gap: 12,
  },
  imageSlot: {
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyImageSlot: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  imageIndexBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#f28914',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  disabledButton: {
    opacity: 0.5,
  },
  addImageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#f28914',
    textAlign: 'center',
  },
  disabledText: {
    color: '#ccc',
  },
  instructionsContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});