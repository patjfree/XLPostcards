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
import { renderTemplatePreview } from './TemplatePreview';

const { width: screenWidth } = Dimensions.get('window');

interface MoreTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onTemplateSelect: (template: TemplateType) => void;
  selectedTemplate: TemplateType;
}

// Simple wrapper that uses the shared template preview logic
// This ensures consistent template previews across all modals - SINGLE SOURCE OF TRUTH
function renderTemplatePreviewForModal(templateId: TemplateType) {
  const previewSize = 80;
  
  const renderPreviewBoxWithNumber = (width: number, height: number, number: number) => (
    <View style={[styles.previewBox, { width, height }]} />
  );
  
  return renderTemplatePreview({
    templateId,
    previewSize,
    renderPreviewBox: renderPreviewBoxWithNumber
  });
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
                  {renderTemplatePreviewForModal(template.id)}
                </View>
                <Text style={[
                  styles.templateName,
                  selectedTemplate === template.id && styles.selectedTemplateName
                ]}>
                  {template.name}
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