
import { getBusinessProfile, updateBusinessProfile } from "./business.service.js";

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

export async function updateBusinessProfileController(req, res, next) {
  try {
    const profile = await updateBusinessProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully.",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}
