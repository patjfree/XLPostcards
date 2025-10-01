import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateType, allTemplates } from './TemplateSelector';

const { width: screenWidth } = Dimensions.get('window');

interface MoreTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onTemplateSelect: (template: TemplateType) => void;
  selectedTemplate: TemplateType;
}

// Import the preview function from TemplateSelector
function renderTemplatePreview(templateId: TemplateType) {
  const previewSize = 80;
  
  const renderPreviewBoxWithNumber = (width: number, height: number, number: number) => (
    <View style={[styles.previewBox, { width, height }]} />
  );
  
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

    case 'two_vertical':
      return (
        <View style={{ gap: 2 }}>
          {renderPreviewBoxWithNumber(previewSize, previewSize * 0.67 / 2 - 1, 1)}
          {renderPreviewBoxWithNumber(previewSize, previewSize * 0.67 / 2 - 1, 2)}
        </View>
      );

    case 'five_collage':
      const quarterWidth = previewSize/2 - 1;
      const quarterHeight = previewSize * 0.67 / 2 - 1;
      const centerSize = quarterWidth * 0.6; // Made smaller for preview
      const totalHeight = previewSize * 0.67;
      return (
        <View style={{ position: 'relative' }}>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {renderPreviewBoxWithNumber(quarterWidth, quarterHeight, 1)}
              {renderPreviewBoxWithNumber(quarterWidth, quarterHeight, 2)}
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {renderPreviewBoxWithNumber(quarterWidth, quarterHeight, 3)}
              {renderPreviewBoxWithNumber(quarterWidth, quarterHeight, 4)}
            </View>
          </View>
          <View style={{ 
            position: 'absolute', 
            top: (totalHeight - centerSize) / 2, 
            left: (previewSize - centerSize) / 2,
            zIndex: 1,
            borderWidth: 2,
            borderColor: '#fff',
            borderRadius: 4
          }}>
            {renderPreviewBoxWithNumber(centerSize, centerSize, 5)}
          </View>
        </View>
      );

    case 'six_grid':
      const thirdWidth = previewSize/3 - 1;
      const thirdHeight = previewSize * 0.67 / 2 - 1;
      return (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 1)}
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 2)}
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 3)}
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 4)}
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 5)}
            {renderPreviewBoxWithNumber(thirdWidth, thirdHeight, 6)}
          </View>
        </View>
      );

    case 'three_horizontal':
      const horizontalThirdWidth = previewSize/3 - 1;
      const horizontalHeight = previewSize * 0.67;
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {renderPreviewBoxWithNumber(horizontalThirdWidth, horizontalHeight, 1)}
          {renderPreviewBoxWithNumber(horizontalThirdWidth, horizontalHeight, 2)}
          {renderPreviewBoxWithNumber(horizontalThirdWidth, horizontalHeight, 3)}
        </View>
      );
    
    default:
      return renderPreviewBoxWithNumber(previewSize, previewSize * 0.67, 1);
  }
}

export default function MoreTemplatesModal({
  visible,
  onClose,
  onTemplateSelect,
  selectedTemplate
}: MoreTemplatesModalProps) {

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
            <Text style={styles.modalTitle}>Choose Template</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.templatesGrid}>
            {allTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.selectedTemplateCard
                ]}
                onPress={() => onTemplateSelect(template.id)}
              >
                <View style={styles.templatePreview}>
                  {renderTemplatePreview(template.id)}
                </View>
                <Text style={[
                  styles.templateName,
                  selectedTemplate === template.id && styles.selectedTemplateName
                ]}>
                  {template.name}
                </Text>
                <Text style={styles.photoCount}>
                  {template.requiredImages} photo{template.requiredImages > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  templateCard: {
    width: (screenWidth - 60) / 2, // Account for padding and gap
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplateCard: {
    borderColor: '#f28914',
    backgroundColor: '#fff5f0',
  },
  templatePreview: {
    marginBottom: 12,
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
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedTemplateName: {
    color: '#f28914',
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});