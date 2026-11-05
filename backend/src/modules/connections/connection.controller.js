
import {
  createConnectionRequest,
  respondToConnection,
  listMyConnections,
} from "./connection.service.js";

export async function createConnectionController(req, res, next) {
  try {
    const result = await createConnectionRequest(
      req.user.id,
      req.body.username
    );

    return res.status(201).json({
      success: true,
      message: "Connection request created.",
      data: { connection: result },
    });
  } catch (error) {
    next(error);
  }
}

export async function respondConnectionController(req, res, next) {
  try {
    const result = await respondToConnection(
      req.user.id,
      req.params.id,
      req.body.decision
    );

    return res.status(200).json({
      success: true,
      message: "Connection request updated.",
      data: { connection: result },
    });
  } catch (error) {
    next(error);
  }
}

export async function listConnectionsController(req, res, next) {
  try {
    const connections = await listMyConnections(
      req.user.id,
      req.user.accountCategory
    );

    return res.status(200).json({
      success: true,
      data: { connections },
    });
  } catch (error) {
    next(error);
  }
}
