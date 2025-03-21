import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { AppIcon } from './AppIcon';

export type SortOption = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

interface SortDropdownProps {
  options: SortOption[];
  selectedOption: SortOption;
  onSelect: (option: SortOption) => void;
}

export function SortDropdown({ options, selectedOption, onSelect }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<View>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  return (
    <View ref={dropdownRef} style={styles.container}>
      <Pressable
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
      >
        <AppIcon name={selectedOption.icon} size={20} color="#666" outline={true} />
        <Text style={styles.triggerText}>{selectedOption.label}</Text>
        <AppIcon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
          outline={true} 
        />
      </Pressable>

      {isOpen && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.option,
                selectedOption.id === option.id && styles.optionSelected
              ]}
              onPress={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <AppIcon 
                    name={option.icon} 
                    size={20} 
                    color={selectedOption.id === option.id ? '#7C3AED' : '#666'} 
                    outline={selectedOption.id !== option.id} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedOption.id === option.id && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {selectedOption.id === option.id && (
                <AppIcon name="checkmark" size={20} color="#7C3AED" outline={false} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  triggerText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    ...Platform.select({
      web: {
        minWidth: 280,
      },
    }),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: '#F3E8FF',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  optionLabelSelected: {
    color: '#7C3AED',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 28,
  },
});