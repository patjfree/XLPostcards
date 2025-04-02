import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const Collapsible = ({ title, children, defaultExpanded = false }: CollapsibleProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        onPress={toggleExpand} 
        style={[
          styles.header,
          isExpanded && styles.headerExpanded
        ]}
      >
        <ThemedView style={styles.headerContent}>
          <ThemedText style={[{ fontSize: 20, fontWeight: '600' }, styles.title]}>
            {title}
          </ThemedText>
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#0a7ea4"
          />
        </ThemedView>
      </TouchableOpacity>
      {isExpanded && (
        <ThemedView style={styles.content}>
          {children}
        </ThemedView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
  },
  headerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#000000',
  },
  content: {
    padding: 16,
  },
});

export default Collapsible; 