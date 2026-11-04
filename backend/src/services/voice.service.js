import { SarvamProvider } from '../integrations/ai/sarvam.provider.js';

export class VoiceService {
  static async transcribe({ audioBase64, language = 'hi-IN' }) {
    const sarvam = new SarvamProvider();

    let buffer = null;
    if (audioBase64) {
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    }

    const result = await sarvam.transcribeAudio(buffer, language);

    return {
      transcript: result.transcript,
      languageCode: result.language_code,
      isMock: result.isMock,
    };
  }
}
