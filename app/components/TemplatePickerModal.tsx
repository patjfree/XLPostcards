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

const templateInfo = {
  single: { name: 'Single Photo', description: 'One photo covering the entire front' },
  two_side_by_side: { name: 'Side by Side', description: 'Two photos side by side' },
  three_photos: { name: 'Three Photos', description: 'One large left, two small right' },
  four_quarters: { name: 'Four Quarters', description: 'Four photos in quarters' },
};

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