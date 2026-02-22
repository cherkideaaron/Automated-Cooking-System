import { GoogleGenerativeAI } from '@google/generative-ai';

interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: 'ml' | 'g' | 'pcs';
  cup: number;
}

export interface Step {
  id: number;
  instruction: 'add ingredient' | 'stir' | 'idle';
  ingredientName?: string;
  duration: number; // in seconds
  temperature: number;
  stirrerSpeed: number;
  amount?: number;
  unit?: 'ml' | 'g' | 'pcs';
}

interface GeminiStepResponse {
  instruction: 'add ingredient' | 'stir' | 'idle';
  ingredientName?: string;
  duration: number;
  temperature: number;
  stirrerSpeed: number;
}

class GeminiService {
  /**
   * Generate cooking steps using Gemini AI based on ingredients
   */
  async generateCookingSteps(apiKey: string, ingredients: Ingredient[]): Promise<Step[]> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Gemini API key is required');
    }

    if (!ingredients || ingredients.length === 0) {
      throw new Error('At least one ingredient is required');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      const ingredientList = ingredients
        .map(ing => `- ${ing.name} (${ing.amount}${ing.unit}, Cup ${ing.cup})`)
        .join('\n');

      const prompt = `You are an automated cooking system controller.
      
AVAILABLE INGREDIENTS:
${ingredientList}

Generate a recipe sequence (5-8 steps) as a JSON array.

RULES:
1. "add ingredient": Must use EXACT ingredient name from list. Duration 5-10s. Temp 25-200. Speed 0.
2. "stir": Duration 30-300s. Temp 25-200. Speed 1-10.
3. "idle": Duration 30s+. Temp 25-200. Speed 0.

RETURN JSON ARRAY ONLY matching this schema:
[{ "instruction": "string", "ingredientName": "string", "duration": number, "temperature": number, "stirrerSpeed": number }]`;

      // Use only modern models. 1.5 Flash is best for speed/cost.
      // Use only modern models available to the user's key
      const modelsToTry = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-1.5-flash' // Fallback
      ];

      let result;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          // Enable JSON mode via generationConfig
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });

          result = await model.generateContent(prompt);
          break; // Success
        } catch (e: any) {
          console.warn(`Failed with model ${modelName}:`, e.message);
          lastError = e;
        }
      }

      if (!result) {
        throw new Error(`AI Generation failed: ${lastError?.message || 'Unknown error'}`);
      }

      const response = await result.response;
      const text = response.text();

      // Parse JSON directly (JSON mode guarantees valid JSON structure)
      const parsedSteps: GeminiStepResponse[] = JSON.parse(text);

      if (!Array.isArray(parsedSteps)) {
        throw new Error('AI response is not an array');
      }

      // Validate and transform
      const validatedSteps: Step[] = parsedSteps.map((step, index) => {
        // 1. Basic Validation
        let instruction = step.instruction;
        if (!['add ingredient', 'stir', 'idle'].includes(instruction)) {
          // Fallback for AI hallucination on instruction types
          instruction = 'idle';
        }

        // 2. Data Cleaning
        const safeStep: Step = {
          id: index + 1,
          instruction: instruction as 'add ingredient' | 'stir' | 'idle',
          duration: Number(step.duration) || 30,
          temperature: Number(step.temperature) || 25,
          stirrerSpeed: Number(step.stirrerSpeed) || 0,
        };

        // 3. Handle Ingredients
        if (safeStep.instruction === 'add ingredient') {
          if (!step.ingredientName) {
            safeStep.instruction = 'idle'; // Fail safe if name missing
          } else {
            const match = ingredients.find(
              ing => ing.name.toLowerCase() === (step.ingredientName || '').toLowerCase()
            );

            if (match) {
              safeStep.ingredientName = match.name;
              safeStep.amount = match.amount;
              safeStep.unit = match.unit;
            } else {
              // If AI hallucinates an ingredient not in the list, change to idle or stir
              safeStep.instruction = 'stir';
              safeStep.stirrerSpeed = 5;
            }
          }
        }

        return safeStep;
      });

      return validatedSteps;

    } catch (error) {
      console.error('Error generating cooking steps:', error);
      throw error;
    }
  }

  /**
   * Generate 3 recipe suggestions based on ingredients
   */
  async generateRecipeSuggestions(apiKey: string, ingredients: Ingredient[]): Promise<{ name: string; steps: Step[] }[]> {
    if (!apiKey) throw new Error('API Key required');

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const ingredientList = ingredients
        .map(ing => `- ${ing.name} (${ing.amount}${ing.unit})`)
        .join('\n');

      const prompt = `You are an automated cooking system controller.

AVAILABLE INGREDIENTS THE USER LIKES:
${ingredientList}

Generate 3 DISTINCT food options that can be made using these ingredients. Return a JSON ARRAY.

RULES:
1. Each food option must have a unique "name" and a complete "cooking algorithm" (steps).
2. **CRITICAL: Each algorithm MUST have at least 10 steps.**
3. "steps" must be an array of:
   - "instruction": "add ingredient", "stir", or "idle"
   - "ingredientName": exact match from list (only for "add ingredient")
   - "duration": seconds (int)
   - "temperature": 25-200 (int)
   - "stirrerSpeed": 0-10 (int)
4. Use "stir" and "idle" instructions generously to break down the cooking into a precise, managed sequence.

RETURN JSON ARRAY ONLY matching this schema:
[
  {
    "name": "Food Name 1",
    "steps": [{ "instruction": "...", "duration": ..., "temperature": ..., "stirrerSpeed": ... }]
  },
  ...
]`;

      const modelsToTry = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-1.5-flash'
      ];

      let result;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });
          result = await model.generateContent(prompt);
          break;
        } catch (e: any) {
          lastError = e;
        }
      }

      if (!result) throw new Error(`AI Generation failed: ${lastError?.message}`);

      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid AI response structure');
      }

      // Validate and transform each recipe
      return parsed.slice(0, 3).map((recipe: any) => ({
        name: recipe.name || 'Unnamed Recipe',
        steps: (recipe.steps || []).map((step: any, index: number) => {
          let instruction = step.instruction;
          if (!['add ingredient', 'stir', 'idle'].includes(instruction)) instruction = 'idle';

          const safeStep: Step = {
            id: index + 1,
            instruction,
            duration: Number(step.duration) || 30,
            temperature: Number(step.temperature) || 25,
            stirrerSpeed: Number(step.stirrerSpeed) || 0,
          };

          if (safeStep.instruction === 'add ingredient') {
            const match = ingredients.find(i => i.name.toLowerCase() === (step.ingredientName || '').toLowerCase());
            if (match) {
              safeStep.ingredientName = match.name;
              safeStep.amount = match.amount;
              safeStep.unit = match.unit;
            } else {
              safeStep.instruction = 'stir';
              safeStep.stirrerSpeed = 5;
            }
          }
          return safeStep;
        })
      }));

    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate a full recipe (ingredients + 10+ steps) from a food name
   */
  async generateFullRecipe(apiKey: string, foodName: string): Promise<{ ingredients: Ingredient[]; steps: Step[] }> {
    if (!apiKey) throw new Error('API Key required');
    if (!foodName) throw new Error('Food name required');

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `You are an automated cooking system controller.
      
FOOD: ${foodName}

Generate a complete recipe for this dish as a JSON object.

RULES:
1. "ingredients": Array of objects { "name": string, "amount": number (g/ml), "unit": "g"|"ml"|"pcs", "cup": 1-6 }.
2. "steps": Array of at least 10 objects. Each must be:
   - "instruction": "add ingredient", "stir", or "idle"
   - "ingredientName": exact match from the ingredients array you created (only for "add ingredient")
   - "duration": seconds (int)
   - "temperature": 25-200 (int)
   - "stirrerSpeed": 0-10 (int)
3. Return ONLY the JSON object.

SCHEMA:
{
  "ingredients": [{ "name": "...", "amount": ..., "unit": "...", "cup": ... }],
  "steps": [{ "instruction": "...", "duration": ..., "temperature": ..., "stirrerSpeed": ... }]
}`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      if (!parsed.ingredients || !parsed.steps) throw new Error('Invalid AI response');

      // Transform ingredients to include unique IDs
      const ingredients: Ingredient[] = parsed.ingredients.map((ing: any, idx: number) => ({
        id: Date.now() + idx,
        name: ing.name,
        amount: Number(ing.amount) || 100,
        unit: (ing.unit === 'g' || ing.unit === 'ml' || ing.unit === 'pcs') ? ing.unit : 'g',
        cup: Math.min(6, Math.max(1, Number(ing.cup) || 1))
      }));

      // Transform steps
      const steps: Step[] = parsed.steps.map((step: any, idx: number) => {
        let instruction = step.instruction;
        if (!['add ingredient', 'stir', 'idle'].includes(instruction)) instruction = 'idle';

        const safeStep: Step = {
          id: Date.now() + idx + 100,
          instruction,
          duration: Number(step.duration) || 30,
          temperature: Number(step.temperature) || 25,
          stirrerSpeed: Number(step.stirrerSpeed) || 0,
        };

        if (instruction === 'add ingredient') {
          const match = ingredients.find(i => i.name.toLowerCase() === (step.ingredientName || '').toLowerCase());
          if (match) {
            safeStep.ingredientName = match.name;
            safeStep.amount = match.amount;
            safeStep.unit = match.unit;
          } else {
            safeStep.instruction = 'stir';
            safeStep.stirrerSpeed = 5;
          }
        }
        return safeStep;
      });

      return { ingredients, steps };

    } catch (error) {
      console.error('Error in generateFullRecipe:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
