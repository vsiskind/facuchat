import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { AppIcon, IconName } from './AppIcon'; // Import IconName

export type SortOption = {
  id: string;
  label: string;
  icon: IconName; // Use IconName type here
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

  // Animation setup
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isOpen ? 1 : 0, { duration: 200, easing: Easing.out(Easing.ease) }),
      transform: [
        {
          translateY: withTiming(isOpen ? 0 : -10, { duration: 200, easing: Easing.out(Easing.ease) }),
        },
      ],
      // Prevent interaction when hidden
      pointerEvents: isOpen ? 'auto' : 'none',
    };
  });

  return (
    <View ref={dropdownRef} style={styles.container}>
      <Pressable
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
      >
        {/* Use optional chaining for safety (remove 'as any') */}
        <AppIcon name={selectedOption?.icon} size={20} color="#666" outline={true} />
        <Text style={styles.triggerText}>{selectedOption?.label}</Text>
        <AppIcon
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666" 
          outline={true} 
        />
      </Pressable>

      {/* Use Animated.View for the dropdown */}
      <Animated.View style={[styles.dropdown, animatedStyle]}>
        {/* Inner view for padding and content */}
        <View style={styles.dropdownContent}>
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
      </Animated.View>
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
    backgroundColor: '#FFFFFF', // Keep background for shadow/border visibility
    borderRadius: 12,
    // padding: 8, // Moved to dropdownContent
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  // Added inner view for padding to avoid animating padding
  dropdownContent: {
    padding: 8,
    backgroundColor: '#FFFFFF', // Ensure background color is set here too
    borderRadius: 11, // Match outer radius minus border width (if any)
    overflow: 'hidden', // Clip content to rounded corners
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
