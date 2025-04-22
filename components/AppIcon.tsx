import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define the icon names and their platform-specific variants
export type IconName = // Add export keyword here
  | 'home'
  | 'add-circle'
  | 'person'
  | 'search'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'trending-up'
  | 'chatbubble'
  | 'arrow-up-circle'
  | 'arrow-down-circle'
  | 'share'
  | 'copy'
  | 'information-circle'
  | 'mail'
  | 'lock-closed'
  | 'eye'
  | 'eye-off'
  | 'alert-circle'
  | 'chatbubble-ellipses'
  | 'refresh'
  | 'trash'
  | 'arrow-up'
  | 'arrow-back'
  | 'chevron-forward'
  | 'key'
  | 'log-out'
  | 'menu'
  | 'star'
  // Icons used in SortDropdown
  | 'time' 
  | 'flame' 
  | 'checkmark';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  outline?: boolean;
}

export function AppIcon({ name, size = 24, color = '#000', outline = true }: AppIconProps) {
  // Determine the correct icon name based on platform and outline preference
  const getIconName = () => {
    // For web, we can use the outline or filled versions directly
    if (Platform.OS === 'web') {
      return outline ? `${name}-outline` : name;
    }
    
    // For mobile, ensure we're using the correct naming convention
    // Some icons might need special handling on mobile
    return outline ? `${name}-outline` : name;
  };

  return <Ionicons name={getIconName() as any} size={size} color={color} />;
}
