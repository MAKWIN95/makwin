import { RequestHandler } from "express";
import handler from "../../api/delete-account";

export const handleDeleteAccount: RequestHandler = (req, res) => handler(req as any, res as any);
