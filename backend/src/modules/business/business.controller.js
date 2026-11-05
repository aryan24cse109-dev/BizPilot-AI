
import { getBusinessProfile } from "./business.service.js";

export async function businessProfileController(req, res, next) {
  try {
    const profile = await getBusinessProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}
