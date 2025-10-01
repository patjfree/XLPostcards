import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import TemplatePickerModal from './TemplatePickerModal';
import { SelectedImage } from './MultiImagePicker';

export type TemplateType = 'single' | 'two_side_by_side' | 'three_photos' | 'four_quarters';

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onTemplateSelect: (template: TemplateType) => void;
  images: SelectedImage[];
  onImagesChange: (images: SelectedImage[]) => void;
}

const templates = [
  {
    id: 'single' as TemplateType,
    name: 'Single Photo',
    requiredImages: 1,
  },
  {
    id: 'two_side_by_side' as TemplateType,
    name: 'Side by Side',
    requiredImages: 2,
  },
  {
    id: 'three_photos' as TemplateType,
    name: 'Three Photos',
    requiredImages: 3,
  },
  {
    id: 'four_quarters' as TemplateType,
    name: 'Four Quarters',
    requiredImages: 4,
  },
];

export default function TemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect, 
  images, 
  onImagesChange 
}: TemplateSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTemplateType, setModalTemplateType] = useState<TemplateType>('single');

  const openTemplateModal = (templateType: TemplateType) => {
    setModalTemplateType(templateType);
    onTemplateSelect(templateType); // Set the selected template
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>1) Select Template & Add Photos</Text>
      <View style={styles.templatesGrid} testID="template-grid">
        {templates.map((template, index) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              selectedTemplate === template.id && styles.selectedTemplateCard
            ]}
            onPress={() => openTemplateModal(template.id)}
            testID={index === 0 ? "first-template-card" : undefined}
          >
            <View style={styles.templatePreview}>
              {renderTemplatePreview(template.id, selectedTemplate === template.id ? images : [])}
            </View>
            <Text style={[
              styles.templateName,
              selectedTemplate === template.id && styles.selectedTemplateName
            ]}>
              {template.name}
            </Text>
            {selectedTemplate === template.id && (
              <Text style={styles.imageCount}>
                {images.length}/{template.requiredImages} photos
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TemplatePickerModal
        visible={modalVisible}
        templateType={modalTemplateType}
        images={images}
        onClose={() => setModalVisible(false)}
        onImagesChange={onImagesChange}
      />
    </View>
  );
}

function renderTemplatePreview(templateId: TemplateType, previewImages: SelectedImage[] = []) {
  const previewSize = 60;
  
  const renderPreviewBoxWithNumber = (width: number, height: number, number: number) => {
    const image = previewImages[number - 1]; // Convert 1-based to 0-based index
    
    if (image) {
      return (
        <View style={[styles.previewBox, { width, height }]}>
          <Image 
            source={{ uri: image.uri }} 
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>
      );
    }
    
    return (
      <View style={[styles.previewBox, { width, height }]}>
        <View style={styles.previewNumber}>
          <Text style={styles.previewNumberText}>{number}</Text>
        </View>
      </View>
    );
  };
  
  switch (templateId) {
    case 'single':
      return renderPreviewBoxWithNumber(previewSize, previewSize * 0.67, 1);
    
    case 'two_side_by_side':
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67, 1)}
          {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67, 2)}
        </View>
      );
    
    case 'three_photos':
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67, 1)}
          <View style={{ gap: 2 }}>
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 2)}
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 3)}
          </View>
        </View>
      );
    
    case 'four_quarters':
      return (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 1)}
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 2)}
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 3)}
            {renderPreviewBoxWithNumber(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 4)}
          </View>
        </View>
      );
    
    default:
      return renderPreviewBoxWithNumber(previewSize, previewSize * 0.67, 1);
  }
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
  sectionLabel: {
    fontWeight: 'bold',
    color: '#f28914',
    fontSize: 18,
    marginBottom: 12,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  templateCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplateCard: {
    borderColor: '#f28914',
    backgroundColor: '#fff5f0',
  },
  templatePreview: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    backgroundColor: '#ddd',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  previewNumber: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#f28914',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNumberText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedTemplateName: {
    color: '#f28914',
  },
  imageCount: {
    fontSize: 11,
    color: '#f28914',
    fontWeight: 'bold',
    marginTop: 2,
  },
});