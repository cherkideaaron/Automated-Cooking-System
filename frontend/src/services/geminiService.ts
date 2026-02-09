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

AVAILABLE INGREDIENTS:
${ingredientList}

Generate 3 DISTINCT recipe options using these ingredients. Return a JSON ARRAY.

RULES:
1. Each recipe must have a unique "name" and "steps".
2. **CRITICAL: Each recipe MUST have at least 10 steps.**
3. "steps" must be an array of:
   - "instruction": "add ingredient", "stir", or "idle"
   - "ingredientName": exact match from list (only for "add ingredient")
   - "duration": seconds (int)
   - "temperature": 25-200 (int)
   - "stirrerSpeed": 0-10 (int)
4. To reach the 10-step minimum, use "stir" and "idle" instructions generously. Break down cooking processes into smaller, managed steps (e.g., instead of one long stir, have "stir", "idle", "stir").

RETURN JSON ARRAY ONLY matching this schema:
[
  {
    "name": "Recipe Name 1",
    "steps": [{ "instruction": "...", "duration": ... }]
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
}

export const geminiService = new GeminiService();
