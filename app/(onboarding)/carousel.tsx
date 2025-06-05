import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  useWindowDimensions, 
  Pressable, 
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { AppIcon } from '@/components/AppIcon';

// Define the structure for slide data
type SlideData = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  buttonText: string;
};

// Define the data for all 5 slides
const slides: SlideData[] = [
  {
    id: '1',
    title: 'Welcome to FacuChat',
    description: 'Your campus community connection',
    imageUrl: 'https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    backgroundColor: '#E0F2FE', // Light blue
    textColor: '#1A1A1A',
    buttonText: 'Next',
  },
  {
    id: '2',
    title: 'Share thoughts and ask questions',
    description: 'Express yourself freely in a supportive environment',
    imageUrl: 'https://images.pexels.com/photos/3767411/pexels-photo-3767411.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    backgroundColor: '#FEF9C3', // Light yellow
    textColor: '#1A1A1A',
    buttonText: 'Next',
  },
  {
    id: '3',
    title: 'Connect with your peers anonymously',
    description: 'Build meaningful connections while maintaining privacy',
    imageUrl: 'https://images.pexels.com/photos/7709007/pexels-photo-7709007.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    backgroundColor: '#FFEDD5', // Light orange
    textColor: '#1A1A1A',
    buttonText: 'Next',
  },
  {
    id: '4',
    title: 'Your identity and data are protected',
    description: 'We prioritize your privacy and security',
    imageUrl: 'https://images.pexels.com/photos/6963944/pexels-photo-6963944.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    backgroundColor: '#F3E8FF', // Light purple
    textColor: '#1A1A1A',
    buttonText: 'Continue',
  },
  {
    id: '5',
    title: 'Let\'s get started!',
    description: 'Join your university community today',
    imageUrl: 'https://images.pexels.com/photos/6147369/pexels-photo-6147369.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    backgroundColor: '#DCFCE7', // Light green
    textColor: '#1A1A1A',
    buttonText: 'Get Started',
  },
];

// Component for a single slide
const OnboardingSlide = ({ 
  item, 
  width, 
  onNext, 
  isLastSlide 
}: { 
  item: SlideData; 
  width: number; 
  onNext: () => void; 
  isLastSlide: boolean 
}) => {
  return (
    <View style={[styles.slide, { width, backgroundColor: item.backgroundColor }]}>
      <SafeAreaView style={styles.slideContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: item.textColor }]}>{item.title}</Text>
          <Text style={[styles.description, { color: item.textColor }]}>{item.description}</Text>
        </View>
        
        {isLastSlide ? (
          <View style={styles.lastSlideButtons}>
            <Pressable 
              style={styles.createAccountButton}
              onPress={() => router.push('/(onboarding)')}
            >
              <Text style={styles.createAccountButtonText}>Create account</Text>
            </Pressable>
            <Pressable 
              style={styles.loginButton}
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text style={styles.loginButtonText}>Log in</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.nextButtonText}>{item.buttonText}</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
};

// Pagination dots component
const PaginationDots = ({ 
  activeIndex, 
  length 
}: { 
  activeIndex: number; 
  length: number 
}) => {
  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length }).map((_, index) => (
        <View 
          key={index} 
          style={[
            styles.paginationDot, 
            { 
              backgroundColor: activeIndex === index ? '#7C3AED' : '#D1D5DB',
              width: activeIndex === index ? 16 : 8,
            }
          ]} 
        />
      ))}
    </View>
  );
};

export default function OnboardingCarousel() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => (
          <OnboardingSlide 
            item={item} 
            width={width} 
            onNext={handleNext} 
            isLastSlide={index === slides.length - 1}
          />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      
      {/* Skip button for all slides except the last one */}
      {activeIndex < slides.length - 1 && (
        <Pressable 
          style={styles.skipButton}
          onPress={() => {
            flatListRef.current?.scrollToIndex({
              index: slides.length - 1,
              animated: true,
            });
          }}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      )}
      
      {/* Pagination dots */}
      <View style={styles.paginationWrapper}>
        <PaginationDots activeIndex={activeIndex} length={slides.length} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: 300,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  textContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSlideButtons: {
    width: '100%',
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
});