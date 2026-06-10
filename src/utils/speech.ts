// Speech synthesis and recognition utilities

export const SpeechManager = {
  // Speak German word
  speak: (text: string, language: string = 'de-DE'): void => {
    if (!('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  },

  // Start listening for speech input
  listen: (
    onResult: (transcript: string) => void,
    onError: (error: string) => void
  ): void => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError('Speech recognition not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      onError(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log('Listening ended');
    };

    try {
      recognition.start();
    } catch (error) {
      console.log('Error starting recognition:', error);
    }
  },

  // Calculate pronunciation similarity (simple implementation)
  calculateSimilarity: (input: string, expected: string): number => {
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-züöä]/g, '').trim();

    const normalizedInput = normalize(input);
    const normalizedExpected = normalize(expected);

    if (normalizedInput === normalizedExpected) return 100;

    // Levenshtein distance calculation
    const len1 = normalizedInput.length;
    const len2 = normalizedExpected.length;
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (normalizedInput[i - 1] === normalizedExpected[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1],
            matrix[i][j - 1],
            matrix[i - 1][j]
          ) + 1;
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.max(0, Math.round(similarity));
  },

  // Check if text contains the word (for typing challenge)
  isCorrectSpelling: (input: string, expected: string): boolean => {
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-züöä]/g, '').trim();
    return normalize(input) === normalize(expected);
  },
};
