/**
 * User Database — SQLite-based user management for OAuth authentication
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { mkdirSync } from "node:fs";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

class UserDatabase {
  private db: DatabaseSync | null = null;
  private dbPath: string;

  constructor() {
    // Store database in data directory relative to project root
    const dataDir = path.join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });
    this.dbPath = path.join(dataDir, "users.db");
  }

  /**
   * Initialize database connection and create tables if needed
   */
  initialize(): void {
    if (this.db) return;

    this.db = new DatabaseSync(this.dbPath);

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        displayName TEXT,
        avatarUrl TEXT,
        googleId TEXT UNIQUE,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_googleId ON users(googleId);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    `);

    console.log(`[UserDB] Initialized at ${this.dbPath}`);
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email) as User | undefined;
    return row || null;
  }

  /**
   * Find user by Google ID
   */
  findByGoogleId(googleId: string): User | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare("SELECT * FROM users WHERE googleId = ?");
    const row = stmt.get(googleId) as User | undefined;
    return row || null;
  }

  /**
   * Find user by ID
   */
  findById(id: string): User | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as User | undefined;
    return row || null;
  }

  /**
   * Create a new user
   */
  createUser(data: {
    email: string;
    displayName?: string;
    avatarUrl?: string;
    googleId?: string;
  }): User {
    this.ensureInitialized();

    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db!.prepare(`
      INSERT INTO users (id, email, displayName, avatarUrl, googleId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.email,
      data.displayName || null,
      data.avatarUrl || null,
      data.googleId || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Update user
   */
  updateUser(id: string, data: Partial<Omit<User, "id" | "createdAt">>): User | null {
    this.ensureInitialized();

    const user = this.findById(id);
    if (!user) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }
    if (data.displayName !== undefined) {
      updates.push("displayName = ?");
      values.push(data.displayName);
    }
    if (data.avatarUrl !== undefined) {
      updates.push("avatarUrl = ?");
      values.push(data.avatarUrl);
    }
    if (data.googleId !== undefined) {
      updates.push("googleId = ?");
      values.push(data.googleId);
    }

    updates.push("updatedAt = ?");
    values.push(new Date().toISOString());

    values.push(id);

    const stmt = this.db!.prepare(`
      UPDATE users SET ${updates.join(", ")} WHERE id = ?
    `);

    stmt.run(...(values as (string | number | null)[]));

    return this.findById(id);
  }

  /**
   * Create or update user (upsert based on googleId)
   */
  upsertGoogleUser(data: {
    googleId: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  }): User {
    this.ensureInitialized();

    const existing = this.findByGoogleId(data.googleId);

    if (existing) {
      // Update existing user
      return this.updateUser(existing.id, {
        email: data.email,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      })!;
    } else {
      // Create new user
      return this.createUser(data);
    }
  }

  /**
   * Create a session for a user
   */
  createSession(userId: string, expiresInDays = 30): Session {
    this.ensureInitialized();

    const id = this.generateId();
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const stmt = this.db!.prepare(`
      INSERT INTO sessions (id, userId, token, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, token, expiresAt, createdAt);

    return { id, userId, token, expiresAt, createdAt };
  }

  /**
   * Find session by token
   */
  findSessionByToken(token: string): Session | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare("SELECT * FROM sessions WHERE token = ?");
    const row = stmt.get(token) as Session | undefined;

    if (!row) return null;

    // Check if expired
    if (new Date(row.expiresAt) < new Date()) {
      this.deleteSession(row.id);
      return null;
    }

    return row;
  }

  /**
   * Delete session
   */
  deleteSession(id: string): void {
    this.ensureInitialized();
    const stmt = this.db!.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Delete all sessions for a user
   */
  deleteUserSessions(userId: string): void {
    this.ensureInitialized();
    const stmt = this.db!.prepare("DELETE FROM sessions WHERE userId = ?");
    stmt.run(userId);
  }

  /**
   * Get user by session token
   */
  getUserByToken(token: string): User | null {
    const session = this.findSessionByToken(token);
    if (!session) return null;
    return this.findById(session.userId);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error("UserDatabase not initialized — call initialize() first");
    }
  }

  private generateId(): string {
    return `usr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateToken(): string {
    // Generate a secure random token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// Singleton instance
export const userDb = new UserDatabase();
