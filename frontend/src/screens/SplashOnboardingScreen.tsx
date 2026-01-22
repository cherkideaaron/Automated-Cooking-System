import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const steps = [
  { title: 'Smart Cooking', description: 'Automated cooking with precise temperature and timing control.', icon: 'restaurant' },
  { title: 'Smart Recipes', description: 'Download and customize algorithms created by others.', icon: 'flame' },
  { title: 'Live Monitoring', description: 'Watch your cooking machine remotely in real time.', icon: 'videocam' },
  { title: 'AI Powered', description: 'Generate your own recipes using AI or customize manually.', icon: 'sparkles' },
];

export default function SplashOnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const isLast = step === steps.length - 1;

  // Handle Manual Button Press
  const handleNext = () => {
    if (isLast) {
      router.replace('/login');
    } else {
      flatListRef.current?.scrollToIndex({ index: step + 1, animated: true });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      flatListRef.current?.scrollToIndex({ index: step - 1, animated: true });
    }
  };

  // Sync state with Swipe gesture
  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== step) {
      setStep(roundIndex);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER - Fixed at top */}
      <View style={styles.header}>
        <View style={styles.headerSideSlot}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerCenterSlot}>
          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.activeDot]} />
            ))}
          </View>
        </View>

        <View style={styles.headerSideSlot} />
      </View>

      {/* SWIPABLE CONTENT */}
      <FlatList
        ref={flatListRef}
        data={steps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={44} color="#E53935" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
        )}
      />

      {/* FOOTER BUTTON - Fixed at bottom */}
      <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
        <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    paddingBottom: 24, // Padding for the bottom button
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    height: 60,
    paddingHorizontal: 24,
  },
  headerSideSlot: { flex: 1, alignItems: 'flex-start' },
  headerCenterSlot: { flex: 2, alignItems: 'center' },
  backButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, backgroundColor: '#333', borderRadius: 10 },
  activeDot: { width: 24, backgroundColor: '#E53935' },
  
  // Slide styles
  slide: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(229,57,53,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  desc: { color: '#aaa', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  
  button: {
    flexDirection: 'row',
    backgroundColor: '#E53935',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});