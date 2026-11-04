
import {
  createClientInvitation,
  acceptClientInvitation,
} from "./invitation.service.js";

export async function createInvitationController(req, res, next) {
  try {
    const invitation = await createClientInvitation(
      req.user.id,
      req.body.email
    );

    return res.status(201).json({
      success: true,
      message: invitation.delivery.delivered
        ? "Invitation email sent successfully."
        : "Invitation created, but email delivery is not configured.",
      data: { invitation },
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitationController(req, res, next) {
  try {
    const result = await acceptClientInvitation(
      req.user,
      req.body.token
    );

    return res.status(200).json({
      success: true,
      message: "Invitation accepted. Connection established.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
