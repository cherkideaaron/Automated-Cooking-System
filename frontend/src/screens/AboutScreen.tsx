import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const instructions = [
  {
    title: 'Getting Started',
    icon: 'power',
    items: [
      'Ensure the smart cooking machine is powered on and connected to WiFi.',
      'The app will automatically detect your machine.',
      'Verify the ESP32 camera from the Monitoring screen.',
    ],
  },
  {
    title: 'Safety Guidelines',
    icon: 'shield-checkmark',
    items: [
      'Never leave the machine unattended while cooking.',
      'Use the emergency stop button when needed.',
      'Keep away from flammable materials.',
      'Allow cooling before cleaning.',
    ],
  },
  {
    title: 'Maintenance',
    icon: 'settings',
    items: [
      'Clean the stirrer after each session.',
      'Calibrate temperature sensor monthly.',
      'Update firmware when notified.',
      'Report malfunctions immediately.',
    ],
  },
];

const faqs = [
  { id: 1, question: 'How do I start cooking?', answer: 'Choose a recipe, review ingredients and steps, then press Start Cooking.' },
  { id: 2, question: 'Can I monitor cooking remotely?', answer: 'Yes. You can view the live camera feed and sensor values from the Monitoring tab.' },
  { id: 3, question: 'How do I stop cooking?', answer: 'Press the red Stop button on the Home screen and confirm.' },
  { id: 4, question: 'Can I publish my own recipes?', answer: 'Yes. Use the Custom tab to create and publish algorithms for others.' },
  { id: 5, question: 'Are paid recipes supported?', answer: 'Yes. Users can subscribe to creators and receive new recipe updates.' },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>About & Help</Text>
          <Text style={[styles.headerDesc, { color: colors.textSecondary }]}>Everything you need to master your Smart Cooker</Text>
        </View>

        {/* INSTRUCTIONS SECTIONS */}
        {instructions.map((section, index) => (
          <View key={index} style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconBox}>
                <Ionicons name={section.icon as any} size={20} color="#E53935" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>

            {section.items.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#E53935" style={styles.bulletIcon} />
                <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* FAQ SECTION */}
        <Text style={[styles.subtitle, { color: colors.text }]}>Frequently Asked Questions</Text>

        <View style={[styles.faqContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {faqs.map((faq) => {
            const isOpen = openFAQ === faq.id;
            return (
              <View key={faq.id} style={[styles.faqItem, { borderBottomColor: colors.border }, isOpen && styles.faqItemOpen]}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFAQ(faq.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.question, { color: colors.textSecondary }, isOpen && styles.textRed]}>{faq.question}</Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isOpen ? "#E53935" : "#777"}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.answerBox}>
                    <Text style={[styles.answer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="restaurant" size={24} color={colors.textSecondary} />
          </View>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Smart Cooker System v1.0.4</Text>
          <TouchableOpacity style={[styles.supportBtn, { borderColor: colors.border }]}>
            <Text style={styles.supportText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  headerDesc: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
  /* SECTION CARDS */
  sectionCard: {
    backgroundColor: '#16161E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(229,57,53,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  /* FAQ */
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    marginBottom: 20,
  },
  faqContainer: {
    backgroundColor: '#16161E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  faqItemOpen: {
    backgroundColor: 'rgba(229,57,53,0.02)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#eee',
    flex: 1,
    paddingRight: 10,
  },
  textRed: {
    color: '#E53935',
  },
  answerBox: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  answer: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
  /* FOOTER */
  footer: {
    marginTop: 48,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerLogo: {
    marginBottom: 12,
    opacity: 0.5,
  },
  versionText: {
    fontSize: 13,
    color: '#444',
    marginBottom: 16,
  },
  supportBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  supportText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '600',
  },
});