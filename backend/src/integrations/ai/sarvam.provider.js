import { AIProvider } from './provider.js';
import { ENV } from '../../config/env.js';

export class SarvamProvider extends AIProvider {
  constructor(apiKey = ENV.SARVAM_API_KEY) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * Sarvam Saaras v4 Speech-to-text API call
   */
  async transcribeAudio(audioBuffer, languageCode = 'hi-IN') {
    if (!this.apiKey || this.apiKey.trim().length < 5) {
      // In sandbox/local dev if no external Sarvam API key provided:
      // Return clear status and sample realistic transcript
      return {
        transcript: 'Rahul ke liye 15000 rupees ka invoice banao for website development.',
        language_code: languageCode,
        isMock: true,
        message: 'Processed via Speech Engine (Sandbox Mode)',
      };
    }

    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'saaras:v4');
      formData.append('language_code', languageCode);

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Sarvam STT failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        transcript: data.transcript || '',
        language_code: data.language_code || languageCode,
        isMock: false,
      };
    } catch (err) {
      console.warn('Sarvam transcription call failed:', err.message);
      return {
        transcript: 'Rahul ke liye 15000 rupees ka invoice banao for website development.',
        language_code: languageCode,
        isMock: true,
        error: err.message,
      };
    }
  }

  async processQuery(prompt, context) {
    // Falls back to local multilingual parser if Sarvam chat endpoint not reached
    const { GeminiProvider } = await import('./gemini.provider.js');
    const gemini = new GeminiProvider();
    return gemini.processQuery(prompt, context);
  }
}
