
const HINDI_LATIN_WORDS = new Set([
  'hai', 'hain', 'ho', 'hu', 'hoga', 'hogi', 'kar', 'karo',
  'kare', 'karna', 'banao', 'bana', 'bhejo', 'bhejna',
  'dikhao', 'batao', 'kitna', 'kitne', 'kab', 'kya',
  'mera', 'meri', 'mere', 'aap', 'mujhe', 'client',
  'paise', 'paisa', 'jama', 'bhej', 'invoice', 'payment',
  'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me', 'aur',
  'nahi', 'mat', 'abhi', 'pichla', 'pichli', 'wala',
  'wali', 'kaise', 'kyun', 'kardo', 'krdo', 'check',
  'dikha', 'bata', 'chahiye'
]);

const HINDI_DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const LATIN_REGEX = /[a-zA-Z]/;

const tokenize = (text) =>
  text.toLowerCase().match(/[a-z]+|[\u0900-\u097F]+/g) ?? [];

export const detectLanguage = (input = '') => {
  const text = String(input).trim();

  if (!text) {
    return {
      language: 'unknown',
      script: 'unknown',
      isMixed: false
    };
  }

  const hasDevanagari = HINDI_DEVANAGARI_REGEX.test(text);
  const hasLatin = LATIN_REGEX.test(text);

  if (hasDevanagari && hasLatin) {
    return {
      language: 'hinglish',
      script: 'mixed',
      isMixed: true
    };
  }

  if (hasDevanagari) {
    return {
      language: 'hindi',
      script: 'devanagari',
      isMixed: false
    };
  }

  if (hasLatin) {
    const words = tokenize(text);
    const hindiWordCount = words.filter((word) =>
      HINDI_LATIN_WORDS.has(word)
    ).length;

    const ratio = words.length
      ? hindiWordCount / words.length
      : 0;

    if (hindiWordCount >= 2 && ratio >= 0.2) {
      return {
        language: 'hinglish',
        script: 'latin',
        isMixed: false
      };
    }

    return {
      language: 'english',
      script: 'latin',
      isMixed: false
    };
  }

  return {
    language: 'unknown',
    script: 'unknown',
    isMixed: false
  };
};
