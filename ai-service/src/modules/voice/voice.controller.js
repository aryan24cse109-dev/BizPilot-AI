import { transcribeAudio } from "./voice.service.js";

export async function transcribeVoiceController(req, res) {
  const output = await transcribeAudio(req.body);
  return res.json({ success: true, data: output, meta: null });
}
