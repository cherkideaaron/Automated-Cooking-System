import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { recipeService, RecipeWithDetails } from '../services/recipeService';

interface Step {
  id: number;
  dbId?: string; // Database ID for updates
  instruction: 'add ingredient' | 'stir' | 'idle';
  ingredientName?: string;
  duration: number; // in seconds
  temperature: number;
  stirrerSpeed: number;
  amount?: number;
  unit?: 'ml' | 'g' | 'pcs';
  cup?: number;
}

interface Ingredient {
  id: number;
  dbRecipeIngredientId?: string; // Database recipe_ingredient ID for updates
  dbIngredientId?: string; // Database ingredient ID
  name: string;
  amount: number;
  unit: 'ml' | 'g' | 'pcs';
  cup: number;
}

// Assuming RecipeWithDetails is defined in recipeService.ts and now includes 'description'
// For the purpose of this file, we'll ensure the local Recipe interface is compatible
// and assume RecipeWithDetails from recipeService.ts has the new field.
// If the user intended to define RecipeWithDetails here, it would conflict with the import.
// Therefore, this is a placeholder to reflect the change in the type's structure.
// export interface RecipeWithDetails extends Recipe {
//   ingredients?: Array<RecipeIngredient & { ingredient: Ingredient }>;
//   cooking_steps?: CookingStep[];
//   profiles?: Database['public']['Tables']['profiles']['Row'];
//   description?: string | null;
// }

interface Recipe {
  id: string;
  name: string;
  duration: number;
  rating: number;
  image: string;
  creator: string;
  servings: number;
  steps: Step[];
  ingredients: Ingredient[];
}

// Recipes will be fetched from database

export default function RecipesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null);
  const [servings, setServings] = useState(1);
  const [steps, setSteps] = useState<Step[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [purchasedRecipeIds, setPurchasedRecipeIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Purchase State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseName, setPurchaseName] = useState('');
  const [purchasePhone, setPurchasePhone] = useState('');
  const [purchaseReceipt, setPurchaseReceipt] = useState<string | null>(null);

  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showConfirmCooking, setShowConfirmCooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const [stoveStatus, setStoveStatus] = useState<'idle' | 'cooking' | 'paused' | 'error'>('idle');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const params = useLocalSearchParams();
  const isCookingActive = (stoveStatus === 'cooking' || stoveStatus === 'paused') && hasActiveSession;

  // Fetch recipes from database on mount
  useEffect(() => {
    checkUser();
    loadRecipes();
    checkStoveStatus();
    checkActiveSession();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const ids = await (recipeService.getPurchasedRecipeIds() as any);
      setPurchasedRecipeIds(ids);
    }
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await (recipeService.getAllRecipes() as any);
      setRecipes(data);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load recipes'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    const { data } = await supabase
      .from('cooking_sessions')
      .select('id')
      .eq('status', 'active')
      .maybeSingle();

    setHasActiveSession(!!data);
  };

  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search as string);
    }
  }, [params.search]);

  useEffect(() => {
    if (params.recipeId && recipes.length > 0) {
      if (isCookingActive) {
        Toast.show({
          type: 'info',
          text1: 'Cooking in progress',
          text2: 'Please stop current session to select a new recipe.',
          position: 'bottom'
        });
        return;
      }
      const target = (recipes as any[]).find(r => r.recipe_id === params.recipeId);
      if (target) {
        setSelectedRecipe(target as any);
      }
    }
  }, [params.recipeId, recipes, isCookingActive]);

  // Secondary guard: If cooking starts while we are on this screen, clear any detail view
  useEffect(() => {
    if (isCookingActive && selectedRecipe) {
      setSelectedRecipe(null);
      Toast.show({
        type: 'info',
        text1: 'Cooking in progress',
        text2: 'Please stop current session to select a new recipe.',
        position: 'bottom'
      });
    }
  }, [isCookingActive]);

  // Handle screen focus: Reset recipe selection and check stove status
  useFocusEffect(
    useCallback(() => {
      setSelectedRecipe(null);
      checkStoveStatus();
      checkActiveSession();
    }, [])
  );

  const checkStoveStatus = async () => {
    const { data } = await (supabase
      .from('device_state') as any)
      .select('id, status')
      .limit(1)
      .maybeSingle();

    if (data) {
      console.log('RecipesScreen: Found device status:', (data as any).status);
      setDeviceId((data as any).id);
      setStoveStatus((data as any).status);
    }
  };

  // Subscribe to device and session status
  useEffect(() => {
    if (!deviceId) return;

    const deviceChannel = supabase
      .channel('recipe_screen_stove_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_state'
        },
        (payload: any) => {
          console.log('RecipesScreen: Device update:', payload.new?.status);
          const newStatus = payload.new?.status;
          if (newStatus) {
            setStoveStatus(newStatus);
          }
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel('recipe_screen_session_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cooking_sessions'
        },
        (payload: any) => {
          console.log('RecipesScreen: Session update:', payload.eventType, payload.new?.status);
          checkActiveSession(); // Re-fetch for accuracy
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [deviceId]);


  useEffect(() => {
    if (selectedRecipe) {
      // Transform database cooking_steps to UI Step format
      const transformedSteps: Step[] = (selectedRecipe.cooking_steps || []).map((dbStep, index) => ({
        id: index + 1,
        dbId: dbStep.id, // Store database ID
        instruction: dbStep.action === 'add_ingredient' ? 'add ingredient' :
          dbStep.action === 'stir' ? 'stir' : 'idle',
        ingredientName: dbStep.action === 'add_ingredient' && dbStep.target_cup ?
          selectedRecipe.ingredients?.find(ri => ri.cup_index === dbStep.target_cup)?.ingredient?.name : undefined,
        duration: dbStep.duration,
        temperature: 25, // Default temperature
        stirrerSpeed: dbStep.action === 'stir' ? 2 : 0,
        amount: dbStep.action === 'add_ingredient' && dbStep.target_cup ?
          selectedRecipe.ingredients?.find(ri => ri.cup_index === dbStep.target_cup)?.amount : undefined,
        unit: 'ml' as const,
        cup: dbStep.target_cup || undefined
      }));

      // Transform database recipe_ingredients to UI Ingredient format
      const transformedIngredients: Ingredient[] = (selectedRecipe.ingredients || []).map((ri, index) => ({
        id: index + 1,
        dbRecipeIngredientId: `${selectedRecipe.recipe_id}-${ri.ingredient_id}`, // Composite key
        dbIngredientId: ri.ingredient_id,
        name: ri.ingredient?.name || 'Unknown',
        amount: ri.amount,
        unit: 'ml' as const, // Default unit
        cup: ri.cup_index || 1
      }));

      setServings(1); // Default servings
      setSteps(transformedSteps);
      setIngredients(transformedIngredients);
    }
  }, [selectedRecipe]);

  const scaleValue = (value: number, originalServings: number) => {
    return Math.round((value / originalServings) * servings);
  };

  const scaledSteps = useMemo(() => {
    if (!selectedRecipe) return [];

    let currentIng: { name: string; amount: number; unit: string; cup: number } | null = null;

    return steps.map(step => {
      const scaledDuration = scaleValue((step as any).duration, 1); // servings is always 1 for now

      // If step has a manual amount, use it (scaled)
      if (step.amount !== undefined) {
        currentIng = {
          name: step.ingredientName || 'Ingredient',
          amount: scaleValue(step.amount, 1),
          unit: step.unit || 'g',
          cup: step.cup || ingredients.find(i => i.name === step.ingredientName)?.cup || 1
        };
      } else if (step.instruction === 'add ingredient' && step.ingredientName) {
        const ing = ingredients.find(i => i.name === step.ingredientName);
        if (ing) {
          currentIng = {
            name: ing.name,
            amount: scaleValue(ing.amount, 1),
            unit: ing.unit,
            cup: ing.cup
          };
        }
      }

      return {
        ...step,
        duration: scaledDuration,
        currentIngredient: currentIng ? { ...currentIng } : null
      };
    });
  }, [steps, ingredients, servings, selectedRecipe]);

  const scaledIngredients = useMemo(() => {
    if (!selectedRecipe) return [];
    return (ingredients as any[]).map(ing => ({
      ...ing,
      amount: scaleValue(ing.amount, 1)
    }));
  }, [ingredients, servings, selectedRecipe]);

  const handleStartCooking = () => {
    setShowConfirmCooking(true);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}min`;
  };

  // Filtered recipes for list view - MUST be before any conditional returns
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isOwnedByMe = currentUser && currentUser.id === r.owner_id;
      const isPurchased = purchasedRecipeIds.includes(r.recipe_id);
      return matchesSearch && (isOwnedByMe || isPurchased);
    });
  }, [searchQuery, recipes, currentUser, purchasedRecipeIds]);

  const maxLengthCreatorCheck = (ownerId: string) => {
    return currentUser && currentUser.id === ownerId;
  }

  const handlePurchaseConfirm = async () => {
    if (!purchaseName || !purchasePhone) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields'
      });
      return;
    }

    if (!selectedRecipe) return;

    try {
      const receiptUrl = purchaseReceipt || 'https://placeholder.com/receipt.jpg';

      const success = await recipeService.createPurchaseRequest(
        selectedRecipe.recipe_id,
        selectedRecipe.price || 0,
        purchasePhone,
        receiptUrl
      );

      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Purchase Request Sent',
          text2: 'The chef will review your receipt shortly.'
        });

        setPurchaseName('');
        setPurchasePhone('');
        setPurchaseReceipt(null);
        setShowPurchaseModal(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Purchase Failed',
          text2: 'Could not submit purchase request.'
        });
      }

    } catch (error) {
      console.error('Purchase error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.'
      });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPurchaseReceipt(result.assets[0].uri);
    }
  };

  /* =========================
     RECIPE DETAILS VIEW
  ========================== */
  /* =========================
     RECIPE DETAILS VIEW
  ========================== */
  if (selectedRecipe) {
    const isFree = !selectedRecipe.price || selectedRecipe.price === 0;
    const isOwnedByMe = maxLengthCreatorCheck(selectedRecipe.owner_id);
    const isPurchased = purchasedRecipeIds.includes(selectedRecipe.recipe_id);
    const hasAccess = isFree || isOwnedByMe || isPurchased;

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Modal
          visible={showPurchaseModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPurchaseModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: colors.card, padding: 20, borderRadius: 16 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
                Buy Recipe
              </Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>
                Send a receipt to unlock this recipe.
              </Text>

              <TextInput
                style={{ backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 8, marginBottom: 12 }}
                placeholder="Your Name"
                placeholderTextColor="#666"
                value={purchaseName}
                onChangeText={setPurchaseName}
              />
              <TextInput
                style={{ backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 8, marginBottom: 12 }}
                placeholder="Phone Number"
                placeholderTextColor="#666"
                value={purchasePhone}
                onChangeText={setPurchasePhone}
                keyboardType="phone-pad"
              />

              <Pressable
                onPress={pickImage}
                style={{ backgroundColor: colors.background, padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }}
              >
                {purchaseReceipt ? (
                  <Image source={{ uri: purchaseReceipt }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={32} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Upload Receipt</Text>
                  </>
                )}
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => setShowPurchaseModal(false)} style={{ flex: 1, padding: 12, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: colors.text }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handlePurchaseConfirm} style={{ flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* HEADER */}
          <View style={styles.detailsHeader}>
            <Pressable onPress={() => setSelectedRecipe(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.detailsTitle, { color: colors.text }]}>{selectedRecipe.name}</Text>
          </View>

          <Image source={{ uri: selectedRecipe.image_url || 'https://via.placeholder.com/400' }} style={styles.image} />

          {/* INFO CARDS */}
          <View style={styles.infoRow}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="time-outline" size={18} color="#E53935" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedRecipe.avg_time} min</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="star" size={18} color="#FFC107" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedRecipe.rating}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="pricetag" size={18} color="#4CAF50" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {selectedRecipe.price ? `$${selectedRecipe.price}` : 'Free'}
              </Text>
            </View>
          </View>

          {!hasAccess ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                This recipe is locked
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Purchase this premium recipe for ${selectedRecipe.price} to view steps and ingredients.
              </Text>
              <Pressable
                style={{ backgroundColor: '#FFD700', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 }}
                onPress={() => setShowPurchaseModal(true)}
              >
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
                  Buy Recipe (${selectedRecipe.price})
                </Text>
              </Pressable>

              <View style={{ marginTop: 32, width: '100%' }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
                  {selectedRecipe.description || "A premium recipe."}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* SERVINGS SECTION */}
              <View style={styles.servingsContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>Servings</Text>
                <View style={styles.servingsPicker}>
                  <Pressable
                    onPress={() => setServings(Math.max(1, servings - 1))}
                    style={[styles.servingBtn, { backgroundColor: colors.card }]}
                  >
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.servingValue, { color: colors.text }]}>{servings}</Text>
                  <Pressable
                    onPress={() => setServings(servings + 1)}
                    style={[styles.servingBtn, { backgroundColor: colors.card }]}
                  >
                    <Ionicons name="add" size={20} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* STEPS */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Cooking Steps</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={() => setEditingStep({ id: Date.now(), instruction: 'idle', duration: 0, temperature: 25, stirrerSpeed: 0 })}
                    style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnTextSmall}>Add Step</Text>
                  </Pressable>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>(Click to edit)</Text>
                </View>
              </View>

              {scaledSteps.map((step, index) => (
                <Pressable
                  key={step.id}
                  onPress={() => setEditingStep(steps.find(s => s.id === step.id) || null)}
                  style={[styles.stepCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>
                      Step {index + 1}: {step.instruction === 'add ingredient' ? `Add ${step.ingredientName}` : step.instruction}
                    </Text>
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
                    Time: {formatTime(step.duration)} · {step.temperature}°C
                  </Text>
                  {step.currentIngredient && (
                    <Text style={[styles.stepSub, { color: colors.text, fontWeight: '600', marginTop: 8 }]}>
                      {step.currentIngredient.name}: {step.currentIngredient.amount}{step.currentIngredient.unit}
                    </Text>
                  )}
                </Pressable>
              ))}

              {/* INGREDIENTS */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ingredients</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={() => setEditingIngredient({ id: Date.now(), name: '', amount: 0, unit: 'g', cup: 1 })}
                    style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnTextSmall}>Add Ingredient</Text>
                  </Pressable>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>(Click to edit)</Text>
                </View>
              </View>

              {scaledIngredients.map((ing) => (
                <Pressable
                  key={ing.id}
                  onPress={() => setEditingIngredient((ingredients as any[]).find(i => i.id === ing.id) || null)}
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
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}

              {/* START / STOP COOKING */}
              <Pressable
                style={[
                  styles.startBtn,
                  isCookingActive && { backgroundColor: '#E53935' }
                ]}
                onPress={isCookingActive ? async () => {
                  // Stop cooking from here too
                  const { error } = await (supabase
                    .from('device_state') as any)
                    .update({ status: 'idle' } as any)
                    .eq('id', deviceId || 'device_001');

                  if (!error) {
                    await (supabase
                      .from('cooking_sessions') as any)
                      .update({ status: 'stopped' } as any)
                      .eq('status', 'active');

                    // Add notification
                    if (currentUser) {
                      await (supabase.from('notifications') as any).insert({
                        user_id: currentUser.id,
                        message: `Cooking for "${selectedRecipe.name}" was stopped.`,
                        type: 'warning',
                        is_read: false
                      });
                    }

                    Toast.show({
                      type: 'success',
                      text1: 'Cooking Stopped',
                      position: 'bottom'
                    });
                  }
                } : handleStartCooking}
              >
                <Text style={styles.startText}>
                  {isCookingActive ? 'Stop Cooking' : 'Start Cooking'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>

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

              <Text style={[styles.label, { color: colors.textSecondary }]}>Instruction</Text>
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Ingredient Name</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={editingStep.ingredientName}
                    onChangeText={(val: string) => setEditingStep(prev => prev ? { ...prev, ingredientName: val } : null)}
                    placeholder="Enter ingredient name"
                    placeholderTextColor="#666"
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (seconds)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (optional)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={editingStep?.amount === 0 || editingStep?.amount === undefined ? '' : editingStep?.amount.toString()}
                    keyboardType="numeric"
                    placeholder="Auto"
                    placeholderTextColor="#666"
                    onChangeText={(val: string) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setEditingStep(prev => prev ? { ...prev, amount: cleaned === '' ? undefined : parseInt(cleaned) } : null);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Unit</Text>
                  <View style={styles.instructionOptions}>
                    {['ml', 'g', 'pcs'].map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setEditingStep(prev => prev ? { ...prev, unit: u as any } : null)}
                        style={[
                          styles.optBtn,
                          editingStep?.unit === u && styles.optBtnSelected
                        ]}
                      >
                        <Text style={[
                          styles.optText,
                          editingStep?.unit === u && styles.optTextSelected
                        ]}>{u}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable onPress={() => setEditingStep(null)} style={styles.cancelBtn}>
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (editingStep && selectedRecipe) {
                      // Validation: Check if ingredient exists in recipe
                      if (editingStep.instruction === 'add ingredient' && editingStep.ingredientName) {
                        const exists = ingredients.some(i => i.name.toLowerCase() === editingStep.ingredientName?.toLowerCase());
                        if (!exists) {
                          Toast.show({
                            type: 'error',
                            text1: 'Ingredient Error',
                            text2: `"${editingStep.ingredientName}" is not in the ingredients list.`
                          });
                          return;
                        }
                      }

                      const isEditing = steps.some(s => s.id === editingStep.id);

                      if (isEditing) {
                        // Update existing step
                        setSteps(prev => prev.map(s => s.id === editingStep.id ? editingStep : s));

                        // Update in database if it has a dbId
                        if (editingStep.dbId) {
                          const action = editingStep.instruction === 'add ingredient' ? 'add_ingredient' :
                            editingStep.instruction === 'stir' ? 'stir' : 'idle';
                          const targetCup = editingStep.instruction === 'add ingredient' ?
                            ingredients.find(i => i.name === editingStep.ingredientName)?.cup : null;

                          const success = await recipeService.updateCookingStep(
                            editingStep.dbId,
                            {
                              action,
                              duration: editingStep.duration,
                              target_cup: targetCup || undefined
                            }
                          );

                          if (success) {
                            Toast.show({
                              type: 'success',
                              text1: 'Step updated',
                              position: 'bottom'
                            });
                            await loadRecipes();
                          } else {
                            Toast.show({
                              type: 'error',
                              text1: 'Failed to update step',
                              position: 'bottom'
                            });
                          }
                        }
                      } else {
                        // Add new step to local state
                        setSteps(prev => [...prev, editingStep]);

                        // Save new step to database
                        const stepOrder = steps.length + 1;
                        const action = editingStep.instruction === 'add ingredient' ? 'add_ingredient' :
                          editingStep.instruction === 'stir' ? 'stir' : 'idle';
                        const targetCup = editingStep.instruction === 'add ingredient' ?
                          ingredients.find(i => i.name === editingStep.ingredientName)?.cup : null;

                        const success = await recipeService.addCookingStep(
                          selectedRecipe.recipe_id,
                          action,
                          editingStep.duration,
                          stepOrder,
                          targetCup || undefined
                        );

                        if (success) {
                          Toast.show({
                            type: 'success',
                            text1: 'Step added',
                            position: 'bottom'
                          });
                          // Reload recipe to get updated data
                          await loadRecipes();
                        } else {
                          Toast.show({
                            type: 'error',
                            text1: 'Failed to save step',
                            position: 'bottom'
                          });
                        }
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

              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={editingIngredient?.name}
                onChangeText={(val: string) => setEditingIngredient(prev => prev ? { ...prev, name: val } : null)}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Unit</Text>
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

              <Text style={[styles.label, { color: colors.textSecondary }]}>Cup Number (1-7)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
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
                  onPress={async () => {
                    if (editingIngredient && selectedRecipe) {
                      // Final validation/cleanup
                      let finalIngredient = { ...editingIngredient };
                      if (finalIngredient.cup > 7) finalIngredient.cup = 7;
                      if (finalIngredient.cup < 1) finalIngredient.cup = 1;

                      // Validation: Check for duplicate cup numbers
                      const cupExists = ingredients.some(i => i.cup === finalIngredient.cup && i.id !== finalIngredient.id);
                      if (cupExists) {
                        Toast.show({
                          type: 'error',
                          text1: 'Cup Conflict',
                          text2: `Cup #${finalIngredient.cup} is already used by another ingredient.`
                        });
                        return;
                      }

                      const isEditing = ingredients.some(i => i.id === finalIngredient.id);

                      if (isEditing) {
                        // Update existing ingredient
                        setIngredients(prev => prev.map(i => i.id === finalIngredient.id ? finalIngredient : i));

                        // Update in database if it has dbIngredientId
                        if (finalIngredient.dbIngredientId) {
                          const success = await recipeService.updateRecipeIngredient(
                            selectedRecipe.recipe_id,
                            finalIngredient.dbIngredientId,
                            finalIngredient.amount,
                            finalIngredient.cup
                          );

                          if (success) {
                            Toast.show({
                              type: 'success',
                              text1: 'Ingredient updated',
                              position: 'bottom'
                            });
                            await loadRecipes();
                          } else {
                            Toast.show({
                              type: 'error',
                              text1: 'Failed to update ingredient',
                              position: 'bottom'
                            });
                          }
                        }
                      } else {
                        // Add new ingredient to local state
                        setIngredients(prev => [...prev, finalIngredient]);

                        // First, check if ingredient exists in ingredients table
                        let ingredientInDb = await recipeService.getAllIngredients();
                        let ingredientId = ingredientInDb.find(i => i.name.toLowerCase() === finalIngredient.name.toLowerCase())?.ingredient_id;

                        // If ingredient doesn't exist, create it
                        if (!ingredientId) {
                          const newIngredient = await recipeService.createIngredient(finalIngredient.name);
                          ingredientId = newIngredient?.ingredient_id;
                        }

                        if (ingredientId) {
                          // Add ingredient to recipe
                          const success = await recipeService.addIngredientToRecipe(
                            selectedRecipe.recipe_id,
                            ingredientId,
                            finalIngredient.amount,
                            finalIngredient.cup
                          );

                          if (success) {
                            Toast.show({
                              type: 'success',
                              text1: 'Ingredient added',
                              position: 'bottom'
                            });
                            // Reload recipe to get updated data
                            await loadRecipes();
                          } else {
                            Toast.show({
                              type: 'error',
                              text1: 'Failed to save ingredient',
                              position: 'bottom'
                            });
                          }
                        }
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

        {/* COOKING CONFIRMATION MODAL */}
        <Modal
          visible={showConfirmCooking}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmCooking(false)}
        >
          <View style={styles.confirmModalOverlay}>
            <View style={[styles.confirmModalContent, { backgroundColor: colors.card }]}>
              <Ionicons
                name="warning"
                size={48}
                color="#FF9800"
                style={styles.modalIcon}
              />
              <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Confirm Cooking</Text>
              <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                Do you confirm every ingredient is mapped correctly and the steps are right?
              </Text>
              <View style={styles.confirmModalButtons}>
                <Pressable
                  style={[styles.confirmModalButton, styles.modalButtonCancel]}
                  onPress={() => setShowConfirmCooking(false)}
                >
                  <Text style={styles.confirmModalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmModalButton, styles.modalButtonConfirm]}
                  onPress={async () => {
                    if (!selectedRecipe) return;

                    try {
                      // Reset device to idle and mark any existing active sessions as stopped
                      await (supabase
                        .from('device_state') as any)
                        .update({ status: 'idle' } as any)
                        .eq('id', 'device_001'); // Using default ID as seen in Dashboard

                      const { error: updateError } = await (supabase
                        .from('cooking_sessions') as any)
                        .update({ status: 'stopped' } as any)
                        .or('status.eq.active,status.eq.ready');

                      if (updateError) {
                        console.warn('Error cleaning up old sessions:', updateError);
                        // Continue anyway, as we want to start the new one
                      }

                      // 2. Create the new session
                      const { error } = await (supabase
                        .from('cooking_sessions') as any)
                        .insert({
                          recipe_id: (selectedRecipe as any).recipe_id,
                          status: 'ready',
                          current_step: 0,
                          steps: scaledSteps // Store the scaled steps with ingredients
                        });

                      if (error) throw error;

                      setShowConfirmCooking(false);
                      Toast.show({
                        type: 'success',
                        text1: 'Cooking Session Initialized',
                        text2: "Click 'Start' in Stove Controls to begin cooking!",
                        position: 'bottom',
                        visibilityTime: 4000
                      });

                      // Navigate to Dashboard with cooking params
                      // Use a timestamp to force a refresh if the user is already on the dashboard
                      router.push({
                        pathname: "/(tabs)",
                        params: {
                          startCooking: 'true',
                          ts: Date.now().toString()
                        }
                      } as any);
                    } catch (e) {
                      console.error(e);
                      Toast.show({
                        type: 'error',
                        text1: 'Error starting session',
                        text2: 'Please try again',
                        position: 'bottom'
                      });
                    }
                  }}
                >
                  <Text style={[styles.confirmModalButtonText, styles.modalButtonTextConfirm]}>
                    Start Cooking
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {/* Cooking in Progress Overlay */}
        {isCookingActive && (
          <View style={styles.lockOverlay} pointerEvents="none">
            <Ionicons name="lock-closed" size={24} color="#fff" />
            <Text style={styles.lockText}>Cooking in progress. Please stop current session to select a new recipe.</Text>
          </View>
        )}
      </View>
    );
  }

  /* =========================
     RECIPE LIST VIEW
  ========================== */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, opacity: isCookingActive ? 0.7 : 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>My Recipes</Text>

        {/* SEARCH BAR */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search recipes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.emptySearch}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
              Loading recipes...
            </Text>
          </View>
        ) : filteredRecipes.length === 0 ? (
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
              {recipes.length === 0 ? 'No recipes yet. Add some recipes to get started!' : `No recipes found for "${searchQuery}"`}
            </Text>
          </View>
        ) : (
          filteredRecipes.map((recipe) => (
            <Pressable
              key={recipe.recipe_id}
              style={[styles.recipeCard, { backgroundColor: colors.card }]}
              onPress={() => {
                if (isCookingActive) {
                  Toast.show({
                    type: 'info',
                    text1: 'Cooking in progress',
                    text2: 'Please stop current session to select a new recipe.',
                    position: 'bottom'
                  });
                  return;
                }
                setSelectedRecipe(recipe);
              }}
            >
              <Image source={{ uri: recipe.image_url || 'https://via.placeholder.com/90' }} style={styles.thumb} />

              <View style={{ flex: 1 }}>
                <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.name}</Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>⏱ {recipe.avg_time} min</Text>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>⭐ {recipe.rating}</Text>
                  <Text style={[styles.metaText, { color: recipe.price ? colors.primary : '#4CAF50', fontWeight: 'bold' }]}>
                    {recipe.price ? `$${recipe.price}` : 'Free'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Cooking in Progress Overlay */}
      {isCookingActive && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={24} color="#fff" />
          <Text style={styles.lockText}>Cooking in progress. Please stop current session to select a new recipe.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },

  recipeCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },

  thumb: {
    width: 90,
    height: 90,
  },

  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    margin: 10,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 10,
  },

  metaText: {
    fontSize: 12,
  },

  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
  },

  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  infoCard: {
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    width: '30%',
  },

  infoText: {
    fontSize: 12,
    marginTop: 6,
  },

  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  servingsPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 4,
    borderRadius: 12,
  },

  servingBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  servingValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

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

  startBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  startText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
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
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptySearchText: {
    marginTop: 16,
    fontSize: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 14,
    flex: 1,
  },
  // Confirm Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonConfirm: {
    backgroundColor: '#E53935',
  },
  confirmModalButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
  },
  modalButtonTextConfirm: {
    color: '#fff',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(229, 57, 53, 0.9)',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
