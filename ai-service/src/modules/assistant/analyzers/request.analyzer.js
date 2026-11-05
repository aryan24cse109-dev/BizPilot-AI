
import { detectLanguage } from './language.detector.js';
import { detectIntent } from './intent.detector.js';

const FOLLOW_UP_PATTERNS = [
  /\b(and|also|what about|same|that one|previous|last one|it|this)\b/i,
  /\b(aur|iska|uska|wahi|pichla|pichli|iske liye|uske liye)\b/i,
  /और|इसका|उसका|वही|पिछला|पिछली|इसके लिए|उसके लिए/
];

const isFollowUpMessage = (message = '') =>
  FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(message));

const getLastUserMessage = (history = []) => {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === 'user') {
      return history[index].content ?? '';
    }
  }

  return '';
};

export const analyzeAssistantRequest = ({
  message = '',
  history = []
} = {}) => {
  const normalizedMessage = String(message).trim();

  const language = detectLanguage(normalizedMessage);
  const currentDetection = detectIntent(normalizedMessage);

  let intent = currentDetection.intent;
  let source = intent ? 'current_message' : 'none';

  const isFollowUp = isFollowUpMessage(normalizedMessage);

  if (!intent && isFollowUp) {
    const previousUserMessage = getLastUserMessage(history);

    if (previousUserMessage) {
      const previousDetection = detectIntent(previousUserMessage);

      if (previousDetection.intent) {
        intent = previousDetection.intent;
        source = 'conversation_context';
      }
    }
  }

  return {
    language: language.language,
    script: language.script,
    isMixedLanguage: language.isMixed,
    intent,
    intentSource: source,
    isFollowUp,
    needsClarification: !intent
  };
};
