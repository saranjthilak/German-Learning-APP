// ─────────────────────────────────────────────────────────────────────────────
// openai.ts — GPT-4o conversation engine for the Voice Tutor
// ─────────────────────────────────────────────────────────────────────────────

// ── Struggle / English detection (duplicated here for import convenience) ─────

const STRUGGLE_SIGNALS = [
  "i don't know", 'i dont know', 'what is', 'how do you say', 'how to say',
  'i forgot', "i don't remember", 'help', 'umm', 'ummm', 'uhh', 'uhhh',
  'i need help', 'what does',
];

export const detectStruggle = (text: string): boolean => {
  const lower = text.toLowerCase();
  return STRUGGLE_SIGNALS.some((s) => lower.includes(s));
};

export const hasEnglishWords = (text: string): boolean => {
  const englishWords = [
    'the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'will', 'would',
    'can', 'could', 'should', 'want', 'need', 'going', 'went', 'come', 'came',
    'think', 'know', 'like', 'shopping', 'restaurant', 'hotel', 'airport',
    'hospital', 'tomorrow', 'yesterday', 'because', 'maybe', 'really',
  ];
  const words = text.toLowerCase().split(/\s+/);
  const englishCount = words.filter((w) => englishWords.includes(w)).length;
  return englishCount >= 2 || (words.length <= 4 && englishCount >= 1);
};

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type ConversationTopic =
  | 'daily-conversation'
  | 'restaurant'
  | 'shopping'
  | 'airport'
  | 'hotel'
  | 'job-interview'
  | 'doctor-visit'
  | 'office-meeting'
  | 'travel'
  | 'friends-and-family';

export interface ChatMessage {
  role: 'user' | 'model';   // Gemini uses 'model' instead of 'assistant'
  content: string;
}

export interface TutorResponse {
  text: string;
  language: 'german' | 'mixed' | 'english';
  hasEnglishHelp: boolean;
}

// ── Level descriptions for the system prompt ──────────────────────────────────

const LEVEL_INSTRUCTIONS: Record<ProficiencyLevel, string> = {
  A1: `The learner is a complete beginner (A1 level).
- Use ONLY very simple, short sentences (5-8 words max).
- Speak slowly and clearly.
- Use high-frequency vocabulary only (greetings, numbers, colors, family, food).
- Provide English help freely and often.
- Repeat key words for reinforcement.`,

  A2: `The learner is at elementary level (A2).
- Use simple sentences with basic connectors (und, aber, oder, weil).
- Introduce common phrases and everyday situations.
- Provide English help when the learner struggles.
- Gently correct basic grammar mistakes.`,

  B1: `The learner is at intermediate level (B1).
- Use conversational German with moderate complexity.
- Include subordinate clauses and common separable verbs.
- Provide English help only when explicitly needed.
- Correct grammar mistakes with brief explanations.`,

  B2: `The learner is at upper-intermediate level (B2).
- Speak mostly naturally, as with a native speaker.
- Use idiomatic expressions and varied vocabulary.
- Give English help only when explicitly asked.
- Challenge the learner with follow-up questions.`,

  C1: `The learner is at advanced level (C1).
- Speak fully naturally in German at native speed.
- Use complex grammar, subjunctive, and rich vocabulary.
- Only switch to English if the learner explicitly requests it.
- Push for nuanced, elaborate responses.`,
};

// ── Topic scenario starters ───────────────────────────────────────────────────

const TOPIC_STARTERS: Record<ConversationTopic, string> = {
  'daily-conversation': 'Hallo! Wie geht es dir heute?',
  restaurant:           'Guten Abend! Herzlich willkommen in unserem Restaurant. Haben Sie eine Reservierung?',
  shopping:             'Hallo! Kann ich Ihnen helfen? Was suchen Sie heute?',
  airport:              'Guten Morgen! Ihr Flug geht nach Berlin. Darf ich Ihren Reisepass sehen?',
  hotel:                'Willkommen im Hotel! Haben Sie eine Buchung bei uns?',
  'job-interview':      'Guten Tag! Bitte nehmen Sie Platz. Erzählen Sie mir etwas über sich.',
  'doctor-visit':       'Guten Tag! Was kann ich heute für Sie tun? Was sind Ihre Beschwerden?',
  'office-meeting':     'Guten Morgen! Das Meeting beginnt gleich. Haben Sie die Unterlagen dabei?',
  travel:               'Wir sind in München! Was möchten Sie heute besichtigen?',
  'friends-and-family': 'Hey! Schön dich zu sehen! Was machst du am Wochenende?',
};

export const getTopicStarter = (topic: ConversationTopic): string =>
  TOPIC_STARTERS[topic];

// ── System prompt builder ─────────────────────────────────────────────────────

const buildSystemPrompt = (
  level: ProficiencyLevel,
  topic: ConversationTopic,
  learnerName: string
): string => `You are "Lena", a warm, patient, and encouraging German language tutor having a spoken conversation with ${learnerName}.

## Your Persona
- You are friendly, supportive, and enthusiastic about helping learners.
- You NEVER shame mistakes. Every error is a learning opportunity.
- You celebrate progress with brief encouragement ("Sehr gut!", "Wunderbar!", "Perfekt!").

## Proficiency Level: ${level}
${LEVEL_INSTRUCTIONS[level]}

## Current Topic: ${topic.replace(/-/g, ' ')}
Keep the conversation relevant to this scenario. Use vocabulary and phrases appropriate for this context.

## Core Rules
1. ALWAYS start your response in German.
2. When the learner uses English words, struggles, says "I don't know", "umm", or asks for help:
   - Provide the missing word/phrase in English AND German
   - Give a complete example sentence in German
   - Briefly explain in English if grammar is involved
   - End with an encouraging question or prompt in German
3. After any English help, ALWAYS return to German immediately.
4. Keep responses concise (2-4 sentences). This is spoken conversation, not an essay.
5. Ask follow-up questions to keep the conversation flowing.
6. If the learner says something incorrect, gently rephrase it correctly: "Du meinst: '...' — Das ist richtig!"
7. If you detect a pronunciation note is needed, add it in brackets: [Aussprache: ...]

## Struggle Detection
If the learner's message contains: English words, "umm", "uh", "I don't know", "how do you say", "what is", "I forgot" — treat it as a struggle signal and provide appropriate help.

## Response Format
- Speak naturally as if in a real conversation.
- Do NOT use bullet points, headers, or markdown.
- Keep it conversational and human.
- Maximum 3-4 sentences per response.`;

// ── API key / model storage ───────────────────────────────────────────────────────────────

export const OPENAI_KEY_STORAGE   = 'german-tutor-gemini-key';    // kept name for import compat
export const OPENAI_MODEL_STORAGE = 'german-tutor-gemini-model';  // kept name for import compat

export const getStoredApiKey = (): string =>
  localStorage.getItem(OPENAI_KEY_STORAGE) ?? '';

export const getStoredModel = (): string =>
  localStorage.getItem(OPENAI_MODEL_STORAGE) ?? 'gemini-2.5-flash';

export const saveApiKey = (key: string): void =>
  localStorage.setItem(OPENAI_KEY_STORAGE, key);

export const saveModel = (model: string): void =>
  localStorage.setItem(OPENAI_MODEL_STORAGE, model);

// ── Gemini API call ─────────────────────────────────────────────────────────────────

export const sendMessage = async (
  messages: ChatMessage[],
  level: ProficiencyLevel,
  topic: ConversationTopic,
  learnerName: string
): Promise<TutorResponse> => {
  const apiKey = getStoredApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const model = getStoredModel();
  const systemPrompt = buildSystemPrompt(level, topic, learnerName);

  // Gemini requires at least one 'user' turn; filter out any system-role messages
  // and convert 'assistant' -> 'model' just in case
  const geminiContents = messages
    .filter((m) => m.role === 'user' || m.role === 'model')
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

  // Ensure conversation starts with a user turn (Gemini requirement)
  if (geminiContents.length === 0 || geminiContents[0].role !== 'user') {
    geminiContents.unshift({ role: 'user', parts: [{ text: 'Hallo!' }] });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const status = response.status;
    const errMsg: string = err?.error?.message ?? '';
    if (status === 400 || status === 403) throw new Error('INVALID_API_KEY');
    if (status === 429) throw new Error('RATE_LIMIT');
    if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('not supported')) {
      throw new Error('MODEL_NOT_FOUND');
    }
    throw new Error(errMsg || 'API_ERROR');
  }

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content ?? '').trim();

  // Detect if the response contains significant English (help mode)
  const englishPhrases = ['it means', 'in english', 'you can say', 'the word is', 'means', 'try saying'];
  const hasEnglishHelp = englishPhrases.some((p) => text.toLowerCase().includes(p));
  const language: TutorResponse['language'] = hasEnglishHelp ? 'mixed' : 'german';

  return { text, language, hasEnglishHelp };
};
