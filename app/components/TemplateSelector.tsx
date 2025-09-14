import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type TemplateType = 'single' | 'two_side_by_side' | 'three_photos' | 'four_quarters';

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onTemplateSelect: (template: TemplateType) => void;
}

const templates = [
  {
    id: 'single' as TemplateType,
    name: 'Single Photo',
    description: 'One photo covering the entire front',
    requiredImages: 1,
  },
  {
    id: 'two_side_by_side' as TemplateType,
    name: 'Side by Side',
    description: 'Two photos side by side',
    requiredImages: 2,
  },
  {
    id: 'three_photos' as TemplateType,
    name: 'Three Photos',
    description: 'One large left, two small right',
    requiredImages: 3,
  },
  {
    id: 'four_quarters' as TemplateType,
    name: 'Four Quarters',
    description: 'Four photos in quarters',
    requiredImages: 4,
  },
];

export default function TemplateSelector({ selectedTemplate, onTemplateSelect }: TemplateSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Select Template</Text>
      <View style={styles.templatesGrid}>
        {templates.map((template) => (
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
            <Text style={styles.templateDescription}>
              {template.description}
            </Text>
            <Text style={styles.requiredImages}>
              {template.requiredImages} photo{template.requiredImages > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function renderTemplatePreview(templateId: TemplateType) {
  const previewSize = 60;
  
  switch (templateId) {
    case 'single':
      return (
        <View style={[styles.previewBox, { width: previewSize, height: previewSize * 0.67 }]} />
      );
    
    case 'two_side_by_side':
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 }]} />
          <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 }]} />
        </View>
      );
    
    case 'three_photos':
      return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 }]} />
          <View style={{ gap: 2 }}>
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
          </View>
        </View>
      );
    
    case 'four_quarters':
      return (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
            <View style={[styles.previewBox, { width: previewSize/2 - 1, height: previewSize * 0.67 / 2 - 1 }]} />
          </View>
        </View>
      );
    
    default:
      return <View style={[styles.previewBox, { width: previewSize, height: previewSize * 0.67 }]} />;
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
  templateDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  requiredImages: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
});