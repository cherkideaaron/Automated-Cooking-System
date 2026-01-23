import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
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

interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: 'ml' | 'g' | 'pcs';
  cup: number;
}

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

const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Pasta Carbonara',
    duration: 25,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
    creator: 'Chef Maria',
    servings: 2,
    steps: [
      { id: 1, instruction: 'add ingredient', ingredientName: 'Water', duration: 5, temperature: 100, stirrerSpeed: 0 },
      { id: 2, instruction: 'idle', duration: 600, temperature: 100, stirrerSpeed: 0 },
      { id: 3, instruction: 'add ingredient', ingredientName: 'Pasta', duration: 5, temperature: 95, stirrerSpeed: 0 },
      { id: 4, instruction: 'stir', duration: 600, temperature: 95, stirrerSpeed: 2 },
    ],
    ingredients: [
      { id: 1, name: 'Water', amount: 500, unit: 'ml', cup: 1 },
      { id: 2, name: 'Pasta', amount: 200, unit: 'g', cup: 2 },
      { id: 3, name: 'Eggs', amount: 2, unit: 'pcs', cup: 3 },
      { id: 4, name: 'Bacon', amount: 150, unit: 'g', cup: 4 },
    ],
  },
  {
    id: '2',
    name: 'Vegetable Stir Fry',
    duration: 15,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1631021967261-c57ee4dfa9bb?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    creator: 'Chef John',
    servings: 1,
    steps: [
      { id: 1, instruction: 'add ingredient', ingredientName: 'Oil', duration: 5, temperature: 180, stirrerSpeed: 0 },
      { id: 2, instruction: 'idle', duration: 60, temperature: 180, stirrerSpeed: 0 },
      { id: 3, instruction: 'add ingredient', ingredientName: 'Vegetables', duration: 10, temperature: 160, stirrerSpeed: 0 },
      { id: 4, instruction: 'stir', duration: 300, temperature: 160, stirrerSpeed: 4 },
    ],
    ingredients: [
      { id: 1, name: 'Oil', amount: 30, unit: 'ml', cup: 1 },
      { id: 2, name: 'Broccoli', amount: 150, unit: 'g', cup: 2 },
      { id: 3, name: 'Carrots', amount: 100, unit: 'g', cup: 3 },
      { id: 4, name: 'Soy Sauce', amount: 50, unit: 'ml', cup: 4 },
    ],
  },
];

export default function RecipesScreen() {
  const { colors } = useTheme();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [steps, setSteps] = useState<Step[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showConfirmCooking, setShowConfirmCooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search as string);
    }
  }, [params.search]);

  useEffect(() => {
    if (selectedRecipe) {
      setServings(selectedRecipe.servings);
      setSteps(selectedRecipe.steps);
      setIngredients(selectedRecipe.ingredients);
    }
  }, [selectedRecipe]);

  const scaleValue = (value: number, originalServings: number) => {
    return Math.round((value / originalServings) * servings);
  };

  const scaledSteps = useMemo(() => {
    if (!selectedRecipe) return [];

    let currentIng: { name: string; amount: number; unit: string } | null = null;

    return steps.map(step => {
      const scaledDuration = scaleValue(step.duration, selectedRecipe.servings);

      // If step has a manual amount, use it (scaled)
      if (step.amount !== undefined) {
        currentIng = {
          name: step.ingredientName || 'Ingredient',
          amount: scaleValue(step.amount, selectedRecipe.servings),
          unit: step.unit || 'g'
        };
      } else if (step.instruction === 'add ingredient' && step.ingredientName) {
        const ing = ingredients.find(i => i.name === step.ingredientName);
        if (ing) {
          currentIng = {
            name: ing.name,
            amount: scaleValue(ing.amount, selectedRecipe.servings),
            unit: ing.unit
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
    return ingredients.map(ing => ({
      ...ing,
      amount: scaleValue(ing.amount, selectedRecipe.servings)
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
    return mockRecipes.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  /* =========================
     RECIPE DETAILS VIEW
  ========================== */
  if (selectedRecipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* HEADER */}
          <View style={styles.detailsHeader}>
            <Pressable onPress={() => setSelectedRecipe(null)}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.detailsTitle, { color: colors.text }]}>{selectedRecipe.name}</Text>
          </View>

          <Image source={{ uri: selectedRecipe.image }} style={styles.image} />

          {/* INFO CARDS */}
          <View style={styles.infoRow}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="time-outline" size={18} color="#E53935" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedRecipe.duration} min</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="star" size={18} color="#FFC107" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedRecipe.rating}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="restaurant" size={18} color="#E53935" />
              <Text style={[styles.infoText, { color: colors.text }]}>{selectedRecipe.creator}</Text>
            </View>
          </View>

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
              onPress={() => setEditingIngredient(ingredients.find(i => i.id === ing.id) || null)}
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

          {/* START COOKING */}
          <Pressable
            style={styles.startBtn}
            onPress={handleStartCooking}
          >
            <Text style={styles.startText}>Start Cooking</Text>
          </Pressable>
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
                  onPress={() => {
                    if (editingIngredient) {
                      // Final validation/cleanup
                      let finalIngredient = { ...editingIngredient };
                      if (finalIngredient.cup > 7) finalIngredient.cup = 7;
                      if (finalIngredient.cup < 1) finalIngredient.cup = 1;

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
                  onPress={() => {
                    setShowConfirmCooking(false);
                    Toast.show({
                      type: 'success',
                      text1: 'Cooking started',
                      position: 'bottom'
                    });
                  }}
                >
                  <Text style={[styles.confirmModalButtonText, styles.modalButtonTextConfirm]}>
                    Confirm
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  /* =========================
     RECIPE LIST VIEW
  ========================== */
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
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

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptySearch}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
            No recipes found for "{searchQuery}"
          </Text>
        </View>
      ) : (
        filteredRecipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            style={[styles.recipeCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedRecipe(recipe)}
          >
            <Image source={{ uri: recipe.image }} style={styles.thumb} />

            <View style={{ flex: 1 }}>
              <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.name}</Text>

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>⏱ {recipe.duration} min</Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>⭐ {recipe.rating}</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
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
    fontSize: 14,
    marginTop: 12,
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
});
