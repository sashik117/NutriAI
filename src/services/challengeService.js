import { nutriApi } from '@/api/nutriApi';

export function cleanChallengeText(value, fallback = '') {
  return String(value || fallback)
    .replace(/```json|```/gi, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeChallenge(result, isEnglish) {
  return {
    title: cleanChallengeText(result?.title, isEnglish ? 'Personal challenge' : 'Персональний виклик'),
    description: cleanChallengeText(
      result?.description,
      isEnglish ? 'A small weekly goal for your nutrition progress.' : 'Невелика тижнева ціль для прогресу.'
    ),
    emoji: cleanChallengeText(result?.emoji, '✨'),
    tasks: Array.isArray(result?.tasks)
      ? result.tasks.map((task) => cleanChallengeText(task)).filter(Boolean)
      : [],
  };
}

const challengeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    emoji: { type: 'string' },
    tasks: { type: 'array', items: { type: 'string' } },
  },
};

function buildChallengePrompt({ profile = {}, streak = 0, isEnglish = false }) {
  const language = isEnglish ? 'English' : 'Ukrainian';
  return `Generate a personal weekly nutrition challenge in ${language}.
Goal: ${profile?.goal || 'maintain'}
Calories: ${profile?.daily_calories || 2000}
Protein: ${profile?.daily_proteins || 150} g
Current streak: ${streak} days

Return only clean JSON with title, description, emoji and 5 short daily tasks.
Make the challenge specific, practical, and different every time.
No markdown, no #, no *, no bullet characters.`;
}

export async function generatePersonalChallenge({ profile = {}, streak = 0, isEnglish = false }) {
  const result = await nutriApi.integrations.Core.InvokeLLM({
    prompt: buildChallengePrompt({ profile, streak, isEnglish }),
    response_json_schema: challengeSchema,
    model: 'gemini_3_flash',
  });

  return normalizeChallenge(result, isEnglish);
}
