import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { recipeService } from '../services/recipeService';
import { geminiService } from '../services/geminiService';

interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: 'ml' | 'g' | 'pcs';
  cup: number;
}

interface Step {
  id: number;
  instruction: 'add ingredient' | 'stir' | 'idle';
  ingredientName?: string;
  duration: number; // in seconds
  temperature: number;
  stirrerSpeed: number;
  amount?: number;
  unit?: 'ml' | 'g' | 'pcs';
}

interface RecipeSuggestion {
  id: string;
  name: string;
  duration: number; // in minutes
  servings: number;
  steps: Step[];
}

const GEMINI_API_KEY_STORAGE = '@gemini_api_key';

export default function CustomScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [foodName, setFoodName] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');

  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  // AI Mode states
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecipeSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const savedKey = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
      if (savedKey) {
        setApiKey(savedKey);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  // Image Upload Functions
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Toast.show({
        type: 'error',
        text1: 'Permission required',
        text2: 'Please allow access to your photo library',
        position: 'bottom'
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageUrlInput('');
      setShowImageOptions(false);
    }
  };

  const useImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImageUri(imageUrlInput.trim());
      setShowImageOptions(false);
    }
  };

  // Generate AI Suggestions using Gemini
  const generateSuggestions = async () => {
    if (ingredients.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Add ingredients first',
        text2: 'Please add some ingredients to get recipe suggestions',
        position: 'bottom'
      });
      return;
    }

    // Try to load key again if not in state (in case it was just added in settings)
    let currentKey = apiKey;
    if (!currentKey) {
      try {
        const savedKey = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
        if (savedKey) {
          currentKey = savedKey;
          setApiKey(savedKey);
        }
      } catch (e) {
        console.error('Failed to reload key:', e);
      }
    }

    if (!currentKey) {
      Toast.show({
        type: 'error',
        text1: 'API Key Required',
        text2: 'Please configure your Gemini API key in Settings',
        position: 'bottom'
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate multiple recipe suggestions
      const suggestions = await geminiService.generateRecipeSuggestions(currentKey, ingredients);

      const parsedSuggestions: RecipeSuggestion[] = suggestions.map((s, index) => ({
        id: (index + 1).toString(),
        name: s.name,
        duration: Math.ceil(s.steps.reduce((sum, step) => sum + step.duration, 0) / 60),
        servings: Math.max(1, Math.floor(ingredients.reduce((sum, i) => sum + i.amount, 0) / 100)), // Approximate servings
        steps: s.steps
      }));

      setRecipeSuggestions(parsedSuggestions);
      setShowSuggestions(true);
      setExpandedSuggestionId(null);

      Toast.show({
        type: 'success',
        text1: 'Recipes Generated!',
        text2: `AI created ${parsedSuggestions.length} options`,
        position: 'bottom'
      });
    } catch (error) {
      console.error('Error generating recipe:', error);
      Toast.show({
        type: 'error',
        text1: 'Generation Failed',
        text2: error instanceof Error ? error.message : 'Please check your API key and try again',
        position: 'bottom'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectSuggestion = (suggestion: RecipeSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSteps(suggestion.steps);
    setShowSuggestions(false);
    Toast.show({
      type: 'success',
      text1: 'Recipe selected',
      text2: `${suggestion.name} - ${suggestion.servings} servings`,
      position: 'bottom'
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}min`;
  };

  // Publish recipe to database
  const publishRecipe = async () => {
    // Validation
    if (!foodName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a food name',
        position: 'bottom'
      });
      return;
    }

    if (!imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please add a food image',
        position: 'bottom'
      });
      return;
    }

    if (ingredients.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please add at least one ingredient',
        position: 'bottom'
      });
      return;
    }

    if (steps.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please add at least one cooking step',
        position: 'bottom'
      });
      return;
    }

    if (isPaid && (!price || parseFloat(price) <= 0)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price',
        position: 'bottom'
      });
      return;
    }

    setIsPublishing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please log in to publish recipes',
          position: 'bottom'
        });
        return;
      }

      // Update profile username if possible
      if (user.email) {
        const username = user.email.split('@')[0];
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            username: username,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.log('Error updating profile:', e);
          // Continue publishing even if profile update fails
        }
      }

      // Calculate average time from steps
      const avgTime = Math.ceil(steps.reduce((sum, step) => sum + step.duration, 0) / 60);

      // Create recipe
      const recipe = await recipeService.createRecipe({
        owner_id: user.id,
        name: foodName,
        image_url: imageUri,
        price: isPaid ? parseFloat(price) : 0,
        rating: 5.0,
        avg_time: avgTime
      });

      if (!recipe) {
        throw new Error('Failed to create recipe');
      }

      // Create/get ingredients and link to recipe
      for (const ing of ingredients) {
        // Check if ingredient exists
        const allIngredients = await recipeService.getAllIngredients();
        let ingredientId = allIngredients.find(i => i.name.toLowerCase() === ing.name.toLowerCase())?.ingredient_id;

        // Create ingredient if it doesn't exist
        if (!ingredientId) {
          const newIngredient = await recipeService.createIngredient(ing.name);
          ingredientId = newIngredient?.ingredient_id;
        }

        if (ingredientId) {
          await recipeService.addIngredientToRecipe(
            recipe.recipe_id,
            ingredientId,
            ing.amount,
            ing.cup
          );
        }
      }

      // Create cooking steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const action = step.instruction === 'add ingredient' ? 'add_ingredient' :
          step.instruction === 'stir' ? 'stir' : 'idle';

        // Find the cup index for add ingredient steps
        const targetCup = step.instruction === 'add ingredient' && step.ingredientName
          ? ingredients.find(ing => ing.name.toLowerCase() === step.ingredientName?.toLowerCase())?.cup
          : undefined;

        await recipeService.addCookingStep(
          recipe.recipe_id,
          action,
          step.duration,
          i + 1,
          targetCup
        );
      }

      Toast.show({
        type: 'success',
        text1: 'Recipe Published!',
        text2: `"${foodName}" has been shared`,
        position: 'bottom'
      });

      // Reset form
      setFoodName('');
      setImageUri('');
      setIngredients([]);
      setSteps([]);
      setIsPaid(false);
      setPrice('');
      setRecipeSuggestions([]);
      setSelectedSuggestion(null);
      setShowSuggestions(false);

      // Navigate to recipes screen
      setTimeout(() => {
        router.push('/recipes'); // Navigate to Recipes list
      }, 1000);

    } catch (error) {
      console.error('Error publishing recipe:', error);
      Toast.show({
        type: 'error',
        text1: 'Publishing Failed',
        text2: 'Please try again',
        position: 'bottom'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Create Recipe</Text>

      {/* MODE TOGGLE */}
      <View style={[styles.modeBox, { backgroundColor: colors.inputBackground }]}>
        {['manual', 'ai'].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m as any)}
            style={[
              styles.modeBtn,
              { backgroundColor: mode === m ? '#E53935' : colors.card },
              mode === m && styles.modeActive,
            ]}
          >
            <Text
              style={[
                styles.modeText,
                mode === m && { color: '#fff' },
              ]}
            >
              {m.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* FOOD NAME */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Food Name</Text>
      <TextInput
        value={foodName}
        onChangeText={setFoodName}
        placeholder="Enter food name"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
      />

      {/* IMAGE UPLOAD */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Food Image</Text>
      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <Pressable
            style={styles.removeImageBtn}
            onPress={() => {
              setImageUri('');
              setImageUrlInput('');
            }}
          >
            <Ionicons name="close-circle" size={24} color="#E53935" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.imageUploadBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowImageOptions(true)}
        >
          <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.imageUploadText, { color: colors.textSecondary }]}>
            Add Image
          </Text>
        </Pressable>
      )}

      {/* INGREDIENTS */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Ingredients</Text>
        <Pressable
          onPress={() => setEditingIngredient({ id: Date.now(), name: '', amount: 0, unit: 'g', cup: 1 })}
          style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnTextSmall}>Add Ingredient</Text>
        </Pressable>
      </View>

      {ingredients.map((ing) => (
        <Pressable
          key={ing.id}
          onPress={() => setEditingIngredient(ing)}
          style={[styles.ingredientCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.ingredientRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ingredientText, { color: colors.text, fontWeight: '700' }]}>
                {ing.name}
              </Text>
              <Text style={[styles.ingredientSub, { color: colors.textSecondary }]}>
                Cup {ing.cup} · {ing.amount}{ing.unit}
              </Text>
            </View>
            <Pressable
              onPress={() => setIngredients(ingredients.filter(i => i.id !== ing.id))}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color="#E53935" />
            </Pressable>
          </View>
        </Pressable>
      ))}

      {/* COOKING STEPS - Manual Mode */}
      {mode === 'manual' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Cooking Steps</Text>
            <Pressable
              onPress={() => setEditingStep({ id: Date.now(), instruction: 'idle', duration: 0, temperature: 25, stirrerSpeed: 0 })}
              style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnTextSmall}>Add Step</Text>
            </Pressable>
          </View>

          {steps.map((step, index) => (
            <Pressable
              key={step.id}
              onPress={() => setEditingStep(step)}
              style={[styles.stepCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Step {index + 1}: {step.instruction === 'add ingredient' ? `Add ${step.ingredientName}` : step.instruction}
                </Text>
                <Pressable
                  onPress={() => setSteps(steps.filter(s => s.id !== step.id))}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#E53935" />
                </Pressable>
              </View>
              <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
                Time: {formatTime(step.duration)} · {step.temperature}°C · Stirrer: {step.stirrerSpeed}
              </Text>
            </Pressable>
          ))}
        </>
      )}

      {/* AI MODE - Recipe Suggestions */}
      {mode === 'ai' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Recipe Suggestions</Text>
            <Pressable
              onPress={generateSuggestions}
              style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="sparkles" size={16} color="#fff" />
              )}
              <Text style={styles.addBtnTextSmall}>{isGenerating ? 'Generating...' : 'Generate'}</Text>
            </Pressable>
          </View>

          {showSuggestions && recipeSuggestions.map((suggestion) => {
            const isExpanded = expandedSuggestionId === suggestion.id;
            const isSelected = selectedSuggestion?.id === suggestion.id;

            return (
              <View
                key={suggestion.id}
                style={[styles.suggestionCard, {
                  backgroundColor: colors.card,
                  borderColor: '#E53935'
                }]}
              >
                {/* Header - Always visible */}
                <Pressable
                  onPress={() => setExpandedSuggestionId(isExpanded ? null : suggestion.id)}
                  style={styles.suggestionHeader}
                >
                  <Text style={[styles.suggestionName, { color: colors.text }]}>{suggestion.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#E53935" />
                    )}
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                </Pressable>

                {/* Meta - Always visible */}
                <View style={styles.suggestionMeta}>
                  <View style={styles.suggestionMetaItem}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.suggestionMetaText, { color: colors.textSecondary }]}>
                      {suggestion.duration} min
                    </Text>
                  </View>
                  <View style={styles.suggestionMetaItem}>
                    <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.suggestionMetaText, { color: colors.textSecondary }]}>
                      {suggestion.servings} servings
                    </Text>
                  </View>
                </View>

                {/* Dropdown - Steps Preview */}
                {isExpanded && (
                  <View style={styles.dropdownContent}>
                    <Text style={[styles.dropdownTitle, { color: colors.textSecondary }]}>
                      Cooking Steps:
                    </Text>
                    {suggestion.steps.map((step, index) => (
                      <View key={step.id} style={[styles.previewStepCard, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.previewStepText, { color: colors.text }]}>
                          {index + 1}. {step.instruction === 'add ingredient' ? `Add ${step.ingredientName}` : step.instruction}
                        </Text>
                        <Text style={[styles.previewStepDetails, { color: colors.textSecondary }]}>
                          {formatTime(step.duration)} · {step.temperature}°C
                        </Text>
                      </View>
                    ))}

                    {/* Select Food Button */}
                    <Pressable
                      style={styles.selectFoodBtn}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.selectFoodText}>Select Food</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Show editable steps after selection */}
          {selectedSuggestion && steps.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Cooking Steps (Editable)</Text>
              </View>

              {steps.map((step, index) => (
                <Pressable
                  key={step.id}
                  onPress={() => setEditingStep(step)}
                  style={[styles.stepCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>
                      Step {index + 1}: {step.instruction === 'add ingredient' ? `Add ${step.ingredientName}` : step.instruction}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      <Pressable
                        onPress={() => setSteps(steps.filter(s => s.id !== step.id))}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#E53935" />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
                    Time: {formatTime(step.duration)} · {step.temperature}°C · Stirrer: {step.stirrerSpeed}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </>
      )}

      {/* PRICE */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Pricing</Text>

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            setIsPaid(false);
            setPrice('');
          }}
          style={[styles.radio, { backgroundColor: colors.card }, !isPaid && styles.radioActive]}
        >
          <Text style={[styles.radioText, { color: !isPaid ? '#fff' : colors.text }]}>Free</Text>
        </Pressable>

        <Pressable
          onPress={() => setIsPaid(true)}
          style={[styles.radio, { backgroundColor: colors.card }, isPaid && styles.radioActive]}
        >
          <Text style={[styles.radioText, { color: isPaid ? '#fff' : colors.text }]}>Paid</Text>
        </Pressable>
      </View>

      {isPaid && (
        <TextInput
          placeholder="Price (USD)"
          placeholderTextColor={colors.textSecondary}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={[styles.input, styles.priceInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
        />
      )}

      {/* BUTTON */}
      <Pressable
        style={[styles.publishBtn, isPublishing && { opacity: 0.6 }]}
        onPress={publishRecipe}
        disabled={isPublishing}
      >
        {isPublishing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.publishText}>Publish Recipe</Text>
        )}
      </Pressable>

      <View style={{ height: 50 }} />

      {/* IMAGE OPTIONS MODAL */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Image</Text>

            <Pressable
              style={[styles.imageOptionBtn, { backgroundColor: colors.inputBackground }]}
              onPress={pickImage}
            >
              <Ionicons name="images-outline" size={24} color={colors.text} />
              <Text style={[styles.imageOptionText, { color: colors.text }]}>Select from Gallery</Text>
            </Pressable>

            <Text style={[styles.orText, { color: colors.textSecondary }]}>OR</Text>

            <TextInput
              placeholder="Enter image URL"
              placeholderTextColor={colors.textSecondary}
              value={imageUrlInput}
              onChangeText={setImageUrlInput}
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowImageOptions(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={useImageUrl}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Use URL</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* INGREDIENT EDITOR MODAL */}
      <Modal
        visible={!!editingIngredient}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingIngredient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {ingredients.some(i => i.id === editingIngredient?.id) ? 'Edit Ingredient' : 'Add Ingredient'}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={editingIngredient?.name}
              onChangeText={(val: string) => setEditingIngredient(prev => prev ? { ...prev, name: val } : null)}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editingIngredient?.amount === 0 ? '' : editingIngredient?.amount.toString()}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                  onChangeText={(val: string) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setEditingIngredient(prev => prev ? { ...prev, amount: cleaned === '' ? 0 : parseInt(cleaned) } : null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Unit</Text>
                <View style={styles.instructionOptions}>
                  {['ml', 'g', 'pcs'].map((u) => (
                    <Pressable
                      key={u}
                      onPress={() => setEditingIngredient(prev => prev ? { ...prev, unit: u as any } : null)}
                      style={[
                        styles.optBtn,
                        editingIngredient?.unit === u && styles.optBtnSelected
                      ]}
                    >
                      <Text style={[
                        styles.optText,
                        editingIngredient?.unit === u && styles.optTextSelected
                      ]}>{u}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Cup Number (1-7)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={editingIngredient?.cup === 0 ? '' : editingIngredient?.cup.toString()}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#666"
              onChangeText={(val: string) => {
                const cleaned = val.replace(/[^0-9]/g, '');
                setEditingIngredient(prev => prev ? { ...prev, cup: cleaned === '' ? 0 : parseInt(cleaned) } : null);
              }}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingIngredient(null)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (editingIngredient) {
                    let finalIngredient = { ...editingIngredient };
                    if (finalIngredient.cup > 7) finalIngredient.cup = 7;
                    if (finalIngredient.cup < 1) finalIngredient.cup = 1;

                    // Validation: Check if cup is already taken by another ingredient
                    const cupOccupied = ingredients.some(i => i.cup === finalIngredient.cup && i.id !== finalIngredient.id);
                    if (cupOccupied) {
                      Toast.show({
                        type: 'error',
                        text1: 'Cup Occupied',
                        text2: `Cup ${finalIngredient.cup} is already used by another ingredient`
                      });
                      return;
                    }

                    if (ingredients.some(i => i.id === finalIngredient.id)) {
                      setIngredients(prev => prev.map(i => i.id === finalIngredient.id ? finalIngredient : i));
                    } else {
                      setIngredients(prev => [...prev, finalIngredient]);
                    }
                    setEditingIngredient(null);
                  }
                }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>
                  {ingredients.some(i => i.id === editingIngredient?.id) ? 'Save' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* STEP EDITOR MODAL */}
      <Modal
        visible={!!editingStep}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingStep(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {steps.some(s => s.id === editingStep?.id) ? 'Edit Step' : 'Add Step'}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Instruction</Text>
            <View style={styles.instructionOptions}>
              {['add ingredient', 'stir', 'idle'].map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setEditingStep(prev => prev ? { ...prev, instruction: opt as any } : null)}
                  style={[
                    styles.optBtn,
                    editingStep?.instruction === opt && styles.optBtnSelected
                  ]}
                >
                  <Text style={[
                    styles.optText,
                    editingStep?.instruction === opt && styles.optTextSelected
                  ]}>{opt}</Text>
                </Pressable>
              ))}
            </View>

            {editingStep?.instruction === 'add ingredient' && (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Ingredient Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editingStep.ingredientName}
                  onChangeText={(val: string) => setEditingStep(prev => prev ? { ...prev, ingredientName: val } : null)}
                />
              </>
            )}

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Duration (seconds)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={editingStep?.duration === 0 ? '' : editingStep?.duration.toString()}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#666"
              onChangeText={(val: string) => {
                const cleaned = val.replace(/[^0-9]/g, '');
                setEditingStep(prev => prev ? { ...prev, duration: cleaned === '' ? 0 : parseInt(cleaned) } : null);
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Temperature (°C)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editingStep?.temperature === 0 ? '' : editingStep?.temperature.toString()}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor="#666"
                  onChangeText={(val: string) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setEditingStep(prev => prev ? { ...prev, temperature: cleaned === '' ? 0 : parseInt(cleaned) } : null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Stirrer Speed</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editingStep?.stirrerSpeed === 0 ? '' : editingStep?.stirrerSpeed.toString()}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                  onChangeText={(val: string) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setEditingStep(prev => prev ? { ...prev, stirrerSpeed: cleaned === '' ? 0 : parseInt(cleaned) } : null);
                  }}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingStep(null)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (editingStep) {
                    if (steps.some(s => s.id === editingStep.id)) {
                      setSteps(prev => prev.map(s => s.id === editingStep.id ? editingStep : s));
                    } else {
                      setSteps(prev => [...prev, editingStep]);
                    }
                    setEditingStep(null);
                  }
                }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>
                  {steps.some(s => s.id === editingStep?.id) ? 'Save' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  modeBox: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },

  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },

  modeActive: {
    backgroundColor: '#E53935',
  },

  modeText: {
    color: '#aaa',
    fontWeight: '700',
  },

  // Image Upload
  imageUploadBtn: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },

  imageUploadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },

  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },

  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },

  // Ingredients
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },

  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },

  addBtnTextSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  ingredientCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  ingredientText: {
    fontSize: 14,
  },

  ingredientSub: {
    fontSize: 11,
    marginTop: 2,
  },

  deleteBtn: {
    padding: 4,
  },

  // Steps
  stepCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
  },

  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stepTitle: {
    fontWeight: '700',
    flex: 1,
  },

  stepSub: {
    fontSize: 12,
    marginTop: 4,
  },

  // AI Suggestions
  suggestionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },

  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  suggestionName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },

  suggestionMeta: {
    flexDirection: 'row',
    gap: 16,
  },

  suggestionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  suggestionMetaText: {
    fontSize: 12,
  },

  // Price
  radio: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  radioActive: {
    backgroundColor: '#E53935',
  },

  radioText: {
    fontWeight: '700',
  },

  priceInput: {
    marginTop: 12, // Gap from Free/Paid selection
  },

  publishBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 30,
  },

  publishText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },

  instructionOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  optBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  optBtnSelected: {
    borderColor: '#E53935',
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },

  optText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },

  optTextSelected: {
    color: '#E53935',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 32,
  },

  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  saveBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Image modal
  imageOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },

  imageOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },

  orText: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  // Dropdown styles
  dropdownContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },

  dropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  previewStepCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },

  previewStepText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },

  previewStepDetails: {
    fontSize: 11,
  },

  selectFoodBtn: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },

  selectFoodText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
