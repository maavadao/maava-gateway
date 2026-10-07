/**
 * Authentication Routes — Google OAuth 2.0 for user sign-in
 */
import { Router, type Request, type Response } from "express";
import type express from "express";
import { userDb, type User } from "../db/user-db.ts";
import { sendSuccess, sendError } from "../middleware/response.ts";

const router: express.Router = Router();

// Environment variables for Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/v1/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Google OAuth URLs
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * GET /api/v1/auth/google
 * 
 * Initiates Google OAuth flow by redirecting to Google consent screen
 */
router.get("/auth/google", (_req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    return sendError(
      res,
      500,
      "Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
    );
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  res.redirect(authUrl);
});

/**
 * GET /api/v1/auth/google/callback
 * 
 * Callback from Google OAuth — exchanges code for tokens, creates/updates user
 */
router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error("[Auth] Google OAuth error:", error);
    return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`);
  }

  if (!code || typeof code !== "string") {
    return res.redirect(`${FRONTEND_URL}/auth/login?error=missing_code`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Auth] Token exchange failed:", errorText);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=no_access_token`);
    }

    // Fetch user info from Google
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error("[Auth] Failed to fetch user info");
      return res.redirect(`${FRONTEND_URL}/auth/login?error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json();

    // Create or update user in database
    const user = userDb.upsertGoogleUser({
      googleId: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
    });

    // Create session
    const session = userDb.createSession(user.id, 30); // 30-day session

    console.log(`[Auth] User signed in: ${user.email} (${user.id})`);

    // Redirect to frontend with session token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${session.token}`);
  } catch (err) {
    console.error("[Auth] OAuth callback error:", err);
    res.redirect(`${FRONTEND_URL}/auth/login?error=server_error`);
  }
});

/**
 * GET /api/v1/auth/me
 * 
 * Get current user info from session token
 */
router.get("/auth/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.query.token as string | undefined;

  if (!token) {
    return sendError(res, 401, "No authentication token provided");
  }

  const user = userDb.getUserByToken(token);

  if (!user) {
    return sendError(res, 401, "Invalid or expired token");
  }

  sendSuccess(res, {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  });
});

/**
 * POST /api/v1/auth/logout
 * 
 * Logout user by deleting session
 */
router.post("/auth/logout", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.body.token as string | undefined;

  if (!token) {
    return sendError(res, 401, "No authentication token provided");
  }

  const session = userDb.findSessionByToken(token);

  if (session) {
    userDb.deleteSession(session.id);
    console.log(`[Auth] User logged out: ${session.userId}`);
  }

  sendSuccess(res, { message: "Logged out successfully" });
});

/**
 * GET /api/v1/auth/status
 * 
 * Check if Google OAuth is configured
 */
router.get("/auth/status", (_req: Request, res: Response) => {
  const configured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

  sendSuccess(res, {
    googleOAuthConfigured: configured,
    redirectUri: GOOGLE_REDIRECT_URI,
  });
});

export { router as authRoutes };
