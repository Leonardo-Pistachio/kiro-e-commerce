import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from './db';
import { AppError, badRequest, conflict } from './errors';
import { deleteSession, findSessionUser, findUserByEmail, insertSession, insertUser } from './repo';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PublicUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return key.toString('hex');
}

async function verifyPassword(password: string, salt: string, expectedHex: string): Promise<boolean> {
  const actual = Buffer.from(await hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createSession(db: Db, userId: number, now: number): string {
  const token = randomBytes(32).toString('base64url');
  insertSession(db, token, userId, now, now + SESSION_TTL_MS);
  return token;
}

export interface SignupInput {
  email: string;
  name: string;
  password: string;
}

export function validateSignup(input: Record<string, unknown>): SignupInput {
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const problems: { field: string; reason: string }[] = [];
  if (!EMAIL_PATTERN.test(email) || email.length > 200) problems.push({ field: 'email', reason: 'Enter a valid email address.' });
  if (name.length < 1 || name.length > 100) problems.push({ field: 'name', reason: 'Name must be 1 to 100 characters.' });
  if (password.length < 8 || password.length > 200) problems.push({ field: 'password', reason: 'Password must be at least 8 characters.' });
  if (problems.length > 0) throw badRequest(problems.map((problem) => problem.reason).join(' '), problems);
  return { email, name, password };
}

export async function signup(db: Db, input: SignupInput, now: number): Promise<AuthResult> {
  if (findUserByEmail(db, input.email)) {
    throw conflict('EMAIL_TAKEN', 'An account with this email already exists. Try logging in instead.');
  }
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(input.password, passwordSalt);
  let userId: number;
  try {
    userId = insertUser(db, { email: input.email, name: input.name, passwordHash, passwordSalt }, now);
  } catch (error) {
    // Two sign-ups for the same email can race past the check above.
    if (String((error as Error).message).includes('UNIQUE')) {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists. Try logging in instead.');
    }
    throw error;
  }
  const token = createSession(db, userId, now);
  return { token, user: { id: userId, email: input.email, name: input.name } };
}

export async function login(db: Db, emailInput: unknown, passwordInput: unknown, now: number): Promise<AuthResult> {
  if (typeof emailInput !== 'string' || typeof passwordInput !== 'string' || !emailInput || !passwordInput) {
    throw badRequest('Email and password are required.');
  }
  const user = findUserByEmail(db, normalizeEmail(emailInput));
  const isValid = user ? await verifyPassword(passwordInput, user.passwordSalt, user.passwordHash) : false;
  if (!user || !isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.');
  }
  const token = createSession(db, user.id, now);
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export function logout(db: Db, token: string): void {
  deleteSession(db, token);
}

export function userForToken(db: Db, token: string, now: number): PublicUser | undefined {
  const user = findSessionUser(db, token, now);
  return user ? { id: user.id, email: user.email, name: user.name } : undefined;
}
