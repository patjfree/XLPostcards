import React from 'react';
import { View } from 'react-native';
import { TemplateType } from './TemplateSelector';

interface TemplatePreviewProps {
  templateId: TemplateType;
  previewSize: number;
  renderPreviewBox: (width: number, height: number, number: number) => React.ReactNode;
}

// IMPORTANT: This is the SINGLE SOURCE OF TRUTH for template preview layouts
// If you need to add a new template, add it here AND update the TemplateType in TemplateSelector.tsx
// DO NOT duplicate this logic in other files to avoid inconsistencies

export function renderTemplatePreview({ templateId, previewSize, renderPreviewBox }: TemplatePreviewProps) {
  // Standardized gap for all templates
  const gap = 2;
  
  switch (templateId) {
    case 'single':
      return renderPreviewBox(previewSize, previewSize * 0.67, 1);
    
    case 'two_side_by_side':
      return (
        <View style={{ flexDirection: 'row', gap }}>
          {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67, 1)}
          {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67, 2)}
        </View>
      );
    
    case 'three_photos':
      return (
        <View style={{ flexDirection: 'row', gap }}>
          {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67, 1)}
          <View style={{ gap }}>
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 2)}
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 3)}
          </View>
        </View>
      );
    
    case 'four_quarters':
      return (
        <View style={{ gap }}>
          <View style={{ flexDirection: 'row', gap }}>
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 1)}
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 2)}
          </View>
          <View style={{ flexDirection: 'row', gap }}>
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 3)}
            {renderPreviewBox(previewSize/2 - 1, previewSize * 0.67 / 2 - 1, 4)}
          </View>
        </View>
      );

    case 'two_vertical':
      return (
        <View style={{ gap }}>
          {renderPreviewBox(previewSize, previewSize * 0.67 / 2 - 1, 1)}
          {renderPreviewBox(previewSize, previewSize * 0.67 / 2 - 1, 2)}
        </View>
      );

    case 'five_collage':
      const quarterWidth = previewSize/2 - 1;
      const quarterHeight = previewSize * 0.67 / 2 - 1;
      const centerSize = quarterWidth * 0.6;
      const totalHeight = previewSize * 0.67;
      return (
        <View style={{ position: 'relative' }}>
          <View style={{ gap }}>
            <View style={{ flexDirection: 'row', gap }}>
              {renderPreviewBox(quarterWidth, quarterHeight, 1)}
              {renderPreviewBox(quarterWidth, quarterHeight, 2)}
            </View>
            <View style={{ flexDirection: 'row', gap }}>
              {renderPreviewBox(quarterWidth, quarterHeight, 3)}
              {renderPreviewBox(quarterWidth, quarterHeight, 4)}
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
            {renderPreviewBox(centerSize, centerSize, 5)}
          </View>
        </View>
      );

    case 'six_grid':
      const thirdWidth = previewSize/3 - 1;
      const thirdHeight = previewSize * 0.67 / 2 - 1;
      return (
        <View style={{ gap }}>
          <View style={{ flexDirection: 'row', gap }}>
            {renderPreviewBox(thirdWidth, thirdHeight, 1)}
            {renderPreviewBox(thirdWidth, thirdHeight, 2)}
            {renderPreviewBox(thirdWidth, thirdHeight, 3)}
          </View>
          <View style={{ flexDirection: 'row', gap }}>
            {renderPreviewBox(thirdWidth, thirdHeight, 4)}
            {renderPreviewBox(thirdWidth, thirdHeight, 5)}
            {renderPreviewBox(thirdWidth, thirdHeight, 6)}
          </View>
        </View>
      );

    case 'three_horizontal':
      const horizontalThirdWidth = previewSize/3 - 1;
      const horizontalHeight = previewSize * 0.67;
      return (
        <View style={{ flexDirection: 'row', gap }}>
          {renderPreviewBox(horizontalThirdWidth, horizontalHeight, 1)}
          {renderPreviewBox(horizontalThirdWidth, horizontalHeight, 2)}
          {renderPreviewBox(horizontalThirdWidth, horizontalHeight, 3)}
        </View>
      );

    case 'three_bookmarks':
      const bookmarkWidth = previewSize;
      const bookmarkHeight = (previewSize * 0.67) / 3 - 1; // Adjusted to use standard spacing
      return (
        <View style={{ gap }}>
          {renderPreviewBox(bookmarkWidth, bookmarkHeight, 1)}
          {renderPreviewBox(bookmarkWidth, bookmarkHeight, 2)}
          {renderPreviewBox(bookmarkWidth, bookmarkHeight, 3)}
        </View>
      );

    case 'three_sideways':
      const topWidth = previewSize;
      const topHeight = previewSize * 0.67 / 2.2;
      const bottomWidth = previewSize / 2 - 1; // Standardized spacing
      const bottomHeight = previewSize * 0.67 - topHeight - gap; // Use consistent gap
      return (
        <View style={{ gap }}>
          {renderPreviewBox(topWidth, topHeight, 1)}
          <View style={{ flexDirection: 'row', gap }}>
            {renderPreviewBox(bottomWidth, bottomHeight, 2)}
            {renderPreviewBox(bottomWidth, bottomHeight, 3)}
          </View>
        </View>
      );
    
    default:
      return renderPreviewBox(previewSize, previewSize * 0.67, 1);
  }
}