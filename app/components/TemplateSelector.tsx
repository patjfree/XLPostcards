import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import TemplatePickerModal from './TemplatePickerModal';
import MoreTemplatesModal from './MoreTemplatesModal';
import { SelectedImage } from './MultiImagePicker';
import { renderTemplatePreview } from './TemplatePreview';

export type TemplateType = 'single' | 'two_side_by_side' | 'three_photos' | 'four_quarters' | 'two_vertical' | 'five_collage' | 'six_grid' | 'three_horizontal' | 'three_bookmarks' | 'three_sideways';

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onTemplateSelect: (template: TemplateType) => void;
  images: SelectedImage[];
  onImagesChange: (images: SelectedImage[]) => void;
}

const mainTemplates = [
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

const allTemplates = [
  ...mainTemplates,
  {
    id: 'two_vertical' as TemplateType,
    name: 'Two Horizontal',
    requiredImages: 2,
  },
  {
    id: 'five_collage' as TemplateType,
    name: 'Five Collage',
    requiredImages: 5,
  },
  {
    id: 'six_grid' as TemplateType,
    name: 'Six Grid',
    requiredImages: 6,
  },
  {
    id: 'three_horizontal' as TemplateType,
    name: 'Three Vertical',
    requiredImages: 3,
  },
  {
    id: 'three_bookmarks' as TemplateType,
    name: 'Three Horizontal (Bookmarks!)',
    requiredImages: 3,
  },
  {
    id: 'three_sideways' as TemplateType,
    name: 'Three Sideways',
    requiredImages: 3,
  },
];

export { allTemplates };

export default function TemplateSelector({ 
  selectedTemplate, 
  onTemplateSelect, 
  images, 
  onImagesChange 
}: TemplateSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [moreTemplatesVisible, setMoreTemplatesVisible] = useState(false);
  const [modalTemplateType, setModalTemplateType] = useState<TemplateType>('single');

  const openTemplateModal = (templateType: TemplateType) => {
    setModalTemplateType(templateType);
    onTemplateSelect(templateType);
    setModalVisible(true);
  };

  const selectedTemplateData = allTemplates.find(t => t.id === selectedTemplate);
  const hasSelectedTemplate = selectedTemplateData && images.length > 0;

  if (hasSelectedTemplate) {
    // Show single large template view
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>1) Template & Photos</Text>
        
        <TouchableOpacity
          style={styles.selectedTemplateContainer}
          onPress={() => openTemplateModal(selectedTemplate)}
        >
          <View style={styles.largeTemplatePreview}>
            {renderTemplatePreviewWithImages(selectedTemplate, images, true)}
          </View>
          <View style={styles.selectedTemplateInfo}>
            <Text style={styles.selectedTemplateName}>{selectedTemplateData.name}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.moreTemplatesButton}
          onPress={() => setMoreTemplatesVisible(true)}
        >
          <Text style={styles.moreTemplatesText}>Change Template</Text>
        </TouchableOpacity>

        <MoreTemplatesModal
          visible={moreTemplatesVisible}
          onClose={() => setMoreTemplatesVisible(false)}
          onTemplateSelect={(templateType) => {
            setMoreTemplatesVisible(false);
            openTemplateModal(templateType);
          }}
          selectedTemplate={selectedTemplate}
        />

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

  // Show grid of main templates + "More Templates" button
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>1) Select Template & Add Photos</Text>
      <View style={styles.templatesGrid} testID="template-grid">
        {mainTemplates.map((template, index) => (
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
              {renderTemplatePreviewWithImages(template.id, selectedTemplate === template.id ? images : [])}
            </View>
            <Text style={[
              styles.templateName,
              selectedTemplate === template.id && { color: '#f28914' }
            ]}>
              {template.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.moreTemplatesButton}
        onPress={() => setMoreTemplatesVisible(true)}
      >
        <Text style={styles.moreTemplatesText}>More Templates</Text>
      </TouchableOpacity>

      <MoreTemplatesModal
        visible={moreTemplatesVisible}
        onClose={() => setMoreTemplatesVisible(false)}
        onTemplateSelect={(templateType) => {
          setMoreTemplatesVisible(false);
          openTemplateModal(templateType);
        }}
        selectedTemplate={selectedTemplate}
      />

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

// Local wrapper function that uses the shared template preview logic
// This allows us to show selected images in the preview boxes
function renderTemplatePreviewWithImages(templateId: TemplateType, previewImages: SelectedImage[] = [], isLarge: boolean = false) {
  const previewSize = isLarge ? 120 : 60;
  
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
      <View style={[styles.previewBox, { width, height }]} />
    );
  };
  
  // Use the shared template preview logic - SINGLE SOURCE OF TRUTH
  return renderTemplatePreview({
    templateId,
    previewSize,
    renderPreviewBox: renderPreviewBoxWithNumber
  });
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
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  imageCount: {
    fontSize: 11,
    color: '#f28914',
    fontWeight: 'bold',
    marginTop: 2,
  },
  selectedTemplateContainer: {
    backgroundColor: '#fff5f0',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f28914',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  largeTemplatePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTemplateInfo: {
    flex: 1,
  },
  selectedTemplateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f28914',
    marginBottom: 4,
  },
  selectedImageCount: {
    fontSize: 14,
    color: '#f28914',
    fontWeight: '600',
  },
  moreTemplatesButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  moreTemplatesText: {
    fontSize: 16,
    color: '#f28914',
    fontWeight: 'bold',
  },
});