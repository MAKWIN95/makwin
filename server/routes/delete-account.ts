import { RequestHandler } from "express";
import {
  deleteAccountForUser,
  getUserIdFromAuthorizationHeader,
} from "../lib/delete-account";

export const handleDeleteAccount: RequestHandler = async (req, res) => {
  try {
    const userId = getUserIdFromAuthorizationHeader(req.headers.authorization);
    await deleteAccountForUser(userId);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE-ACCOUNT] Server error:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "Server error during account deletion" });
  }
};
