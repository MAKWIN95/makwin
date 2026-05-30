"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserIdFromAuthorizationHeader = getUserIdFromAuthorizationHeader;
exports.deleteAccountForUser = deleteAccountForUser;
var supabase_js_1 = require("@supabase/supabase-js");
var jwt = require("jsonwebtoken");
var supabaseAdminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseAdminUrl || !supabaseAdminKey) {
    throw new Error("Server configuration error: SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}
var supabaseAdmin = (0, supabase_js_1.createClient)(supabaseAdminUrl, supabaseAdminKey);
function getUserIdFromAuthorizationHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or invalid Authorization header");
    }
    var token = authHeader.substring(7);
    var decoded = jwt.decode(token);
    var userId = decoded === null || decoded === void 0 ? void 0 : decoded.sub;
    if (!userId || typeof userId !== "string") {
        throw new Error("Invalid token - missing user ID");
    }
    return userId;
}
function deleteAccountForUser(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, existingUser, getUserError, deleteAuthError, cleanupTargets, _i, cleanupTargets_1, target, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("[DELETE-ACCOUNT] Starting deletion for user: ".concat(userId));
                    console.log("[DELETE-ACCOUNT] Supabase URL: ".concat(supabaseAdminUrl));
                    return [4 /*yield*/, supabaseAdmin.auth.admin.getUserById(userId)];
                case 1:
                    _a = _b.sent(), existingUser = _a.data, getUserError = _a.error;
                    if (getUserError) {
                        console.error("[DELETE-ACCOUNT] Error fetching auth user:", getUserError);
                        throw new Error("Failed to verify auth user before deletion");
                    }
                    console.log("[DELETE-ACCOUNT] Found auth user before deletion:", (existingUser === null || existingUser === void 0 ? void 0 : existingUser.email) || userId);
                    return [4 /*yield*/, supabaseAdmin.auth.admin.deleteUser(userId)];
                case 2:
                    deleteAuthError = (_b.sent()).error;
                    if (deleteAuthError) {
                        console.error("[DELETE-ACCOUNT] Error deleting auth user:", deleteAuthError);
                        throw new Error("Failed to delete auth user");
                    }
                    console.log("[DELETE-ACCOUNT] \u2705 Deleted auth user: ".concat(userId));
                    cleanupTargets = [
                        { table: "works", column: "user_id" },
                        { table: "likes", column: "user_id" },
                        { table: "saves", column: "user_id" },
                        { table: "profiles", column: "id" },
                    ];
                    _i = 0, cleanupTargets_1 = cleanupTargets;
                    _b.label = 3;
                case 3:
                    if (!(_i < cleanupTargets_1.length)) return [3 /*break*/, 6];
                    target = cleanupTargets_1[_i];
                    return [4 /*yield*/, supabaseAdmin
                            .from(target.table)
                            .delete()
                            .eq(target.column, userId)];
                case 4:
                    error = (_b.sent()).error;
                    if (error) {
                        console.error("[DELETE-ACCOUNT] Error deleting ".concat(target.table, ":"), error);
                        throw new Error("Failed to delete ".concat(target.table));
                    }
                    console.log("\u2705 Deleted ".concat(target.table, " for user: ").concat(userId));
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/];
            }
        });
    });
}
