import { timingSafeEqual } from "node:crypto";

/** 30 days without use ends a session (docs/product/acesso-e-loja.md). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The expiry only moves forward once a day, so a busy session doesn't write on every request. */
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

/** Login is by e-mail without the store, so e-mails are compared trimmed and lowercased. */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** argon2id with Bun's defaults (above OWASP's minimum). The algorithm and salt travel inside the hash. */
export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password);
}

export function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return Bun.password.verify(password, hash);
}

/** Hashed at startup, so even the first check after a deploy takes as long as a real one. */
const dummyHash = hashPassword("dummy-password-for-timing");

/**
 * Burns the same time as a real check when the e-mail doesn't exist, so response time doesn't tell which e-mails
 * have an account.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
	await verifyPassword(password, await dummyHash);
	return false;
}

/** 256 random bits, base64url: the bearer token the app keeps (RFC 6750). */
export function generateSessionToken(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
		"base64url",
	);
}

/** What the database keeps instead of the token. A fast hash is enough: the token is random, not guessable. */
export function hashSessionToken(token: string): string {
	return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

/** Constant-time comparison; hashing first makes both sides the same length. */
export function isMasterPassword(
	password: string,
	masterPassword: string | undefined,
): boolean {
	if (!masterPassword) return false;
	const digest = (value: string) =>
		new Bun.CryptoHasher("sha256").update(value).digest();
	return timingSafeEqual(digest(password), digest(masterPassword));
}

/** Token from an `Authorization: Bearer <token>` header (scheme is case-insensitive, RFC 6750 / RFC 9110). */
export function readBearerToken(header: string | undefined): string | null {
	const match = header?.match(/^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i);
	return match?.[1] ?? null;
}

/** New expiry when the session is due for renewal, `null` when it's still fresh enough. */
export function renewedExpiry(expiresAt: Date, now: Date): Date | null {
	const elapsed = SESSION_TTL_MS - (expiresAt.getTime() - now.getTime());
	if (elapsed < SESSION_RENEW_AFTER_MS) return null;
	return new Date(now.getTime() + SESSION_TTL_MS);
}
