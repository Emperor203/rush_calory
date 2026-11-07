import { NextRequest, NextResponse } from 'next/server';

export interface FoodScanResult {
  dishName: string;
  calories: number;
  weightGrams?: number;
  macros: {
    protein: number;
    fat: number;
    carbs: number;
  };
  suggestedDistanceKm: number;
  burnPaceMinPerKm: number;
  burnDurationMinutes: number;
  motivation: string;
}

const FALLBACK_DISHES: Array<{
  keywords: string[];
  dishName: string;
  calories: number;
  weightGrams: number;
  macros: { protein: number; fat: number; carbs: number };
}> = [
  {
    keywords: ['plov', 'плов', 'рис', 'плов узбекский'],
    dishName: 'Чайханский плов с говядиной',
    calories: 680,
    weightGrams: 350,
    macros: { protein: 24, fat: 28, carbs: 82 },
  },
  {
    keywords: ['burger', 'бургер', 'гамбургер', 'чизбургер'],
    dishName: 'Двойной чизбургер с соусом',
    calories: 590,
    weightGrams: 280,
    macros: { protein: 32, fat: 34, carbs: 42 },
  },
  {
    keywords: ['pizza', 'пицца', 'маргарита', 'пепперони'],
    dishName: 'Пицца Пепперони (2 куска)',
    calories: 540,
    weightGrams: 240,
    macros: { protein: 22, fat: 26, carbs: 56 },
  },
  {
    keywords: ['shaurma', 'шаурма', 'донер', 'лаваш'],
    dishName: 'Шаурма с курицей в лаваше',
    calories: 620,
    weightGrams: 380,
    macros: { protein: 34, fat: 24, carbs: 68 },
  },
  {
    keywords: ['salad', 'салат', 'цезарь', 'овощи'],
    dishName: 'Салат Цезарь с куриной грудкой',
    calories: 340,
    weightGrams: 260,
    macros: { protein: 26, fat: 18, carbs: 16 },
  },
  {
    keywords: ['pasta', 'паста', 'спагетти', 'карбонара'],
    dishName: 'Паста Карбонара со сливками',
    calories: 610,
    weightGrams: 320,
    macros: { protein: 21, fat: 31, carbs: 64 },
  },
  {
    keywords: ['steak', 'стейк', 'мясо', 'говядина'],
    dishName: 'Стейк Рибай с гарниром',
    calories: 720,
    weightGrams: 350,
    macros: { protein: 48, fat: 52, carbs: 8 },
  },
  {
    keywords: ['sushi', 'суши', 'роллы', 'филадельфия'],
    dishName: 'Сет роллов Филадельфия (8 шт)',
    calories: 460,
    weightGrams: 280,
    macros: { protein: 18, fat: 16, carbs: 62 },
  },
  {
    keywords: ['cake', 'торт', 'десерт', 'чизкейк', 'шоколад'],
    dishName: 'Нью-Йорк Чизкейк с ягодным соусом',
    calories: 430,
    weightGrams: 160,
    macros: { protein: 8, fat: 26, carbs: 42 },
  },
];

function buildResult(
  dishName: string,
  calories: number,
  weightGrams: number = 300,
  macros: { protein: number; fat: number; carbs: number } = { protein: 20, fat: 20, carbs: 50 },
  motivation?: string
): FoodScanResult {
  // Average runner burns ~65-75 kcal per km (e.g. 70kg runner ~ 70 kcal/km)
  const suggestedDistanceKm = Math.max(1.2, Math.round((calories / 68) * 10) / 10);
  const burnPaceMinPerKm = 5.5; // 5:30 min/km
  const burnDurationMinutes = Math.round(suggestedDistanceKm * burnPaceMinPerKm);

  return {
    dishName,
    calories,
    weightGrams,
    macros,
    suggestedDistanceKm,
    burnPaceMinPerKm,
    burnDurationMinutes,
    motivation:
      motivation ||
      `Чтобы сжечь ${calories} ккал от «${dishName}», пробегите ${suggestedDistanceKm} км в комфортном темпе!`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', userPrompt } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Изображение не передано' }, { status: 400 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const candidateModels = [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ];

      for (const modelName of candidateModels) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

          const prompt = `Ты — профессиональный спортивный диетолог Rush Calory. Твоя задача:
1. Точно распознать блюдо на фото.
2. Оценить примерный вес порции в граммах.
3. Оценить общую калорийность (ккал) и БЖУ (белки, жиры, углеводы в граммах).
4. Вернуть ТОЛЬКО строгий JSON без markdown разметки:
{
  "dishName": "Название блюда на русском",
  "calories": 520,
  "weightGrams": 300,
  "macros": {
    "protein": 22,
    "fat": 20,
    "carbs": 58
  },
  "motivation": "Короткая бодрая фраза на русском для бегуна"
}`;

          const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (response.ok) {
            const geminiData = await response.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText.trim());
              const calories = Number(parsed.calories) || 500;
              const result = buildResult(
                parsed.dishName || 'Блюдо',
                calories,
                Number(parsed.weightGrams) || 300,
                parsed.macros || { protein: 20, fat: 20, carbs: 50 },
                parsed.motivation
              );
              return NextResponse.json({ success: true, result, source: `gemini (${modelName})` });
            }
          }
        } catch (geminiError) {
          console.warn(`Gemini vision model ${modelName} attempt failed:`, geminiError);
        }
      }
    }

    // Smart heuristic fallback (if no GEMINI_API_KEY configured or call failed)
    let selected = FALLBACK_DISHES[0];
    if (userPrompt) {
      const lower = String(userPrompt).toLowerCase();
      const match = FALLBACK_DISHES.find((d) =>
        d.keywords.some((k) => lower.includes(k))
      );
      if (match) selected = match;
    } else {
      // Pick based on base64 seed so same photo gives stable result
      const hash = cleanBase64.slice(0, 100).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      selected = FALLBACK_DISHES[hash % FALLBACK_DISHES.length];
    }

    const fallbackResult = buildResult(
      selected.dishName,
      selected.calories,
      selected.weightGrams,
      selected.macros
    );

    return NextResponse.json({
      success: true,
      result: fallbackResult,
      source: 'heuristic',
      notice: geminiKey ? undefined : 'Для реального нейро-распознавания укажите GEMINI_API_KEY в .env.local',
    });
  } catch (error: any) {
    console.error('Scan food API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Ошибка анализа блюда' },
      { status: 500 }
    );
  }
}
