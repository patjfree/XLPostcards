import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  Image, 
  SafeAreaView,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ImagePicker from 'react-native-image-crop-picker';
import { TemplateType } from './TemplateSelector';
import { SelectedImage } from './MultiImagePicker';

const { width: screenWidth } = Dimensions.get('window');

interface TemplatePickerModalProps {
  visible: boolean;
  templateType: TemplateType;
  images: SelectedImage[];
  onClose: () => void;
  onImagesChange: (images: SelectedImage[]) => void;
}

// Centralized template configuration for aspect ratios
// This makes it easy to add new templates and maintain consistency
//
// TO ADD A NEW TEMPLATE:
// 1. Add the template type to TemplateType in TemplateSelector.tsx
// 2. Add aspect ratio configuration here with either:
//    - default: [width, height] for all slots in the template
//    - specific slot ratios: { 0: [w, h], 1: [w, h], default: [w, h] }
// 3. Add template info to templateInfo object below
// 4. Add preview rendering in TemplateSelector.tsx renderTemplatePreview()
// 5. Add full template rendering in this file's renderTemplatePreview() 
// 6. Add server-side template method in PostcardService/main.py
// 7. Update templateRequirements in app/(drawer)/index.tsx
const TEMPLATE_ASPECT_RATIOS = {
  single: {
    default: [3, 2], // Full postcard 3:2
  },
  two_side_by_side: {
    default: [3, 4], // Each half is 3:4 (vertical)
  },
  three_photos: {
    0: [3, 4], // Left large photo is 3:4 (vertical)
    default: [3, 2], // Right photos are 3:2 (horizontal)
  },
  four_quarters: {
    default: [3, 2], // Each quarter is 3:2
  },
  two_vertical: {
    default: [3, 1], // Each photo is 3:1 (wide horizontal)
  },
  five_collage: {
    default: [3, 2], // All photos are 3:2
  },
  six_grid: {
    default: [1, 1], // Each photo is 1:1 (square)
  },
  three_horizontal: {
    default: [1, 2], // Each photo is 1:2 (vertical)
  },
} as const;

// Calculate aspect ratio for each photo slot based on template and position
const getAspectRatioForSlot = (templateType: TemplateType, slotIndex: number): [number, number] => {
  const templateConfig = TEMPLATE_ASPECT_RATIOS[templateType];
  if (!templateConfig) {
    return [3, 2]; // Default fallback
  }
  
  // Check if there's a specific ratio for this slot index
  const slotSpecificRatio = templateConfig[slotIndex as keyof typeof templateConfig];
  if (slotSpecificRatio) {
    return slotSpecificRatio as [number, number];
  }
  
  // Use default ratio for this template
  return templateConfig.default;
};

const templateInfo = {
  single: { name: 'Single Photo', description: 'One photo covering the entire front' },
  two_side_by_side: { name: 'Side by Side', description: 'Two photos side by side' },
  three_photos: { name: 'Three Photos', description: 'One large left, two small right' },
  four_quarters: { name: 'Four Quarters', description: 'Four photos in quarters' },
  two_vertical: { name: 'Two Vertical', description: 'Two photos stacked vertically' },
  five_collage: { name: 'Five Collage', description: 'Four photos with one overlaid in center' },
  six_grid: { name: 'Six Grid', description: 'Six photos in a 2x3 grid' },
  three_horizontal: { name: 'Three Horizontal', description: 'Three photos side by side' },
} as const;

export default function TemplatePickerModal({
  visible,
  templateType,
  images,
  onClose,
  onImagesChange
}: TemplatePickerModalProps) {

  const pickImageForSlot = async (slotIndex: number) => {
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
        
        const pickedImage = await ImagePicker.openPicker({
          width: cropWidth,
          height: cropHeight,
          cropping: true,
          cropperToolbarTitle: `Crop image for position ${slotIndex + 1}`,
          cropperChooseText: 'Choose',
          cropperCancelText: 'Cancel',
          cropperRotateButtonsHidden: false,
          includeBase64: true,
          mediaType: 'photo',
          forceJpg: true,
          cropperCircleOverlay: false,
          showCropGuidelines: true,
          showCropFrame: true,
          enableRotationGesture: true,
          cropperActiveWidgetColor: '#f28914',
          cropperStatusBarColor: '#000000',
          cropperToolbarColor: '#000000',
          cropperToolbarWidgetColor: '#ffffff',
        });
        
        let imageBase64 = pickedImage.data;
        
        if (!imageBase64) {
          const base64Result = await ImageManipulator.manipulateAsync(
            pickedImage.path,
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
          uri: pickedImage.path,
          width: cropWidth,
          height: cropHeight,
          base64: imageBase64,
          type: 'image',
          fileName: pickedImage.filename || 'image.jpg',
          fileSize: pickedImage.size || 0,
          assetId: '',
        };
        
        const updatedImages = [...images];
        updatedImages[slotIndex] = newImage;
        onImagesChange(updatedImages);
        
      } else {
        // Android: Use Expo ImagePicker with template-aware aspect ratio
        const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to select photos.');
          return;
        }

        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [aspectWidth, aspectHeight],
          quality: 0.9,
          base64: true,
        });

        if (!result.canceled && result.assets[0]) {
          const selectedImage = result.assets[0];
          
          const targetWidth = aspectWidth * 500;
          const targetHeight = aspectHeight * 500;
          
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [{ resize: { width: targetWidth } }],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          const finalImage = await ImageManipulator.manipulateAsync(
            manipulatedImage.uri,
            [{ resize: { width: targetWidth, height: targetHeight } }],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          let imageBase64 = finalImage.base64 || selectedImage.base64;
          
          if (!imageBase64) {
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
          
          const updatedImages = [...images];
          updatedImages[slotIndex] = newImage;
          onImagesChange(updatedImages);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if ((error as any)?.message && !(error as any).message.includes('cancelled')) {
        alert('Failed to select image.');
      }
    }
  };

  const removeImageFromSlot = (slotIndex: number) => {
    const updatedImages = [...images];
    updatedImages.splice(slotIndex, 1);
    onImagesChange(updatedImages);
  };

  const renderTemplatePreview = () => {
    const baseSize = Math.min(screenWidth - 40, 300);
    const postcardWidth = baseSize;
    const postcardHeight = baseSize * 0.67; // 3:2 aspect ratio for postcard

    const renderPhotoSlot = (slotIndex: number, width: number, height: number, left: number, top: number) => {
      const image = images[slotIndex];
      
      return (
        <TouchableOpacity
          key={slotIndex}
          style={[
            styles.photoSlot,
            {
              width,
              height,
              left,
              top,
            }
          ]}
          onPress={() => pickImageForSlot(slotIndex)}
        >
          {image ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: image.uri }}
                style={styles.slotImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImageFromSlot(slotIndex)}
              >
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptySlot}>
              <Ionicons name="add" size={24} color="#f28914" />
              <Text style={styles.slotNumber}>{slotIndex + 1}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    switch (templateType) {
      case 'single':
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, postcardWidth, postcardHeight, 0, 0)}
          </View>
        );

      case 'two_side_by_side':
        const halfWidth = postcardWidth / 2 - 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, halfWidth, postcardHeight, 0, 0)}
            {renderPhotoSlot(1, halfWidth, postcardHeight, halfWidth + 4, 0)}
          </View>
        );

      case 'three_photos':
        const leftWidth = postcardWidth / 2 - 2;
        const rightWidth = postcardWidth / 2 - 2;
        const rightHeight = postcardHeight / 2 - 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, leftWidth, postcardHeight, 0, 0)}
            {renderPhotoSlot(1, rightWidth, rightHeight, leftWidth + 4, 0)}
            {renderPhotoSlot(2, rightWidth, rightHeight, leftWidth + 4, rightHeight + 4)}
          </View>
        );

      case 'four_quarters':
        const quarterWidth = postcardWidth / 2 - 2;
        const quarterHeight = postcardHeight / 2 - 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, quarterWidth, quarterHeight, 0, 0)}
            {renderPhotoSlot(1, quarterWidth, quarterHeight, quarterWidth + 4, 0)}
            {renderPhotoSlot(2, quarterWidth, quarterHeight, 0, quarterHeight + 4)}
            {renderPhotoSlot(3, quarterWidth, quarterHeight, quarterWidth + 4, quarterHeight + 4)}
          </View>
        );

      case 'two_vertical':
        const verticalHeight = postcardHeight / 2 - 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, postcardWidth, verticalHeight, 0, 0)}
            {renderPhotoSlot(1, postcardWidth, verticalHeight, 0, verticalHeight + 4)}
          </View>
        );

      case 'five_collage':
        const collageQuarterWidth = postcardWidth / 2 - 2;
        const collageQuarterHeight = postcardHeight / 2 - 2;
        const centerWidth = collageQuarterWidth * 0.7;
        const centerHeight = collageQuarterHeight * 0.7;
        const centerLeft = (postcardWidth - centerWidth) / 2;
        const centerTop = (postcardHeight - centerHeight) / 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {/* Background quarters */}
            {renderPhotoSlot(0, collageQuarterWidth, collageQuarterHeight, 0, 0)}
            {renderPhotoSlot(1, collageQuarterWidth, collageQuarterHeight, collageQuarterWidth + 4, 0)}
            {renderPhotoSlot(2, collageQuarterWidth, collageQuarterHeight, 0, collageQuarterHeight + 4)}
            {renderPhotoSlot(3, collageQuarterWidth, collageQuarterHeight, collageQuarterWidth + 4, collageQuarterHeight + 4)}
            {/* Center overlay */}
            <View style={{
              position: 'absolute',
              left: centerLeft,
              top: centerTop,
              zIndex: 1,
            }}>
              {renderPhotoSlot(4, centerWidth, centerHeight, 0, 0)}
            </View>
          </View>
        );

      case 'six_grid':
        const sixthWidth = postcardWidth / 3 - 3;
        const sixthHeight = postcardHeight / 2 - 2;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {/* Top row */}
            {renderPhotoSlot(0, sixthWidth, sixthHeight, 0, 0)}
            {renderPhotoSlot(1, sixthWidth, sixthHeight, sixthWidth + 4, 0)}
            {renderPhotoSlot(2, sixthWidth, sixthHeight, (sixthWidth + 4) * 2, 0)}
            {/* Bottom row */}
            {renderPhotoSlot(3, sixthWidth, sixthHeight, 0, sixthHeight + 4)}
            {renderPhotoSlot(4, sixthWidth, sixthHeight, sixthWidth + 4, sixthHeight + 4)}
            {renderPhotoSlot(5, sixthWidth, sixthHeight, (sixthWidth + 4) * 2, sixthHeight + 4)}
          </View>
        );

      case 'three_horizontal':
        const horizontalWidth = postcardWidth / 3 - 3;
        return (
          <View style={[styles.postcardContainer, { width: postcardWidth, height: postcardHeight }]}>
            {renderPhotoSlot(0, horizontalWidth, postcardHeight, 0, 0)}
            {renderPhotoSlot(1, horizontalWidth, postcardHeight, horizontalWidth + 4, 0)}
            {renderPhotoSlot(2, horizontalWidth, postcardHeight, (horizontalWidth + 4) * 2, 0)}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.modalTitle}>{templateInfo[templateType].name}</Text>
            <Text style={styles.modalSubtitle}>{templateInfo[templateType].description}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.instructionText}>
            Tap on each photo area to select an image for that position
          </Text>
          
          <View style={styles.previewContainer}>
            {renderTemplatePreview()}
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  postcardContainer: {
    position: 'relative',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoSlot: {
    position: 'absolute',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f28914',
    borderStyle: 'dashed',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  emptySlot: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  slotNumber: {
    fontSize: 12,
    color: '#f28914',
    fontWeight: 'bold',
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: '#f28914',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});