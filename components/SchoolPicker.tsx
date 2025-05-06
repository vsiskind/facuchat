import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { AppIcon } from './AppIcon'; // Assuming AppIcon is used for chevron

// Define the structure for a school option
export type SchoolOption = {
  label: string;
  value: string;
};

interface SchoolPickerProps {
  options: SchoolOption[];
  selectedSchool: string | null; // Can be null initially
  onSelect: (value: string) => void;
  placeholder?: string;
}

export function SchoolPicker({
  options,
  selectedSchool,
  onSelect,
  placeholder = 'Select your school...',
}: SchoolPickerProps) {
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

  // Find the label for the currently selected school value
  const selectedLabel = options.find(option => option.value === selectedSchool)?.label || placeholder;

  return (
    <View ref={dropdownRef} style={styles.container}>
      <Pressable
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
      >
        {/* Display selected label or placeholder */}
        <Text style={[styles.triggerText, !selectedSchool ? styles.placeholderText : {}]}> {/* Use empty object {} here */}
          {selectedLabel}
        </Text>
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
              key={option.value}
              style={[
                styles.option,
                selectedSchool === option.value && styles.optionSelected
              ]}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              {/* Simplified option display */}
              <Text style={[
                styles.optionLabel,
                selectedSchool === option.value && styles.optionLabelSelected
              ]}>
                {option.label}
              </Text>
              {selectedSchool === option.value ? ( // Use ternary operator here
                <AppIcon name="checkmark" size={20} color="#7C3AED" outline={false} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// Styles adapted from SortDropdown, simplified for school picker
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    width: '100%', // Make picker take full width
    marginBottom: 30, // Add margin like the original picker
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Space out text and icon
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15, // Increased padding
    paddingVertical: 12, // Increased padding
    borderRadius: 8,
    borderWidth: 1, // Add border like original input
    borderColor: '#E0E0E0', // Border color like original
    minHeight: 50, // Ensure consistent height
  },
  triggerText: {
    fontSize: 16, // Match original input font size
    color: '#1A1A1A', // Match original input text color
  },
  placeholderText: {
    color: '#999999', // Placeholder color
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // Slightly larger radius
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Slightly increased shadow
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Remove padding from the animated container
    // padding: 8, // Moved to dropdownContent
  },
  // Added inner view for padding to avoid animating padding
  dropdownContent: {
    padding: 8,
    backgroundColor: '#FFFFFF', // Ensure background color is set here too
    borderRadius: 11, // Match outer radius minus border width
    overflow: 'hidden', // Clip content to rounded corners
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // Consistent padding
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: '#F3E8FF', // Highlight color
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500', // Slightly less bold than SortDropdown
    color: '#1A1A1A',
  },
  optionLabelSelected: {
    color: '#7C3AED', // Primary color for selected
    fontWeight: '600', // Make selected slightly bolder
  },
});
