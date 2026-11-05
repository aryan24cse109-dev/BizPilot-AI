
import { assistantService } from '../../services/assistant.service.js';

export const interpretAssistantMessage = async (req, res, next) => {
  try {
    const result = await assistantService.interpretMessage(req.body);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
};
