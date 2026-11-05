import { describe, expect, it } from "bun:test";
import {
	generateSessionToken,
	hashPassword,
	hashSessionToken,
	isMasterPassword,
	normalizeEmail,
	readBearerToken,
	renewedExpiry,
	SESSION_TTL_MS,
	verifyAgainstDummy,
	verifyPassword,
} from "./auth.crypto";

const DAY = 24 * 60 * 60 * 1000;

describe("normalizeEmail", () => {
	it("trims and lowercases", () => {
		expect(normalizeEmail("  Dona@Loja.COM ")).toBe("dona@loja.com");
	});
});

describe("hashPassword / verifyPassword", () => {
	it("hashes with argon2id and verifies only the same password", async () => {
		const hash = await hashPassword("segredo-123");
		expect(hash).toStartWith("$argon2id$");
		expect(await verifyPassword("segredo-123", hash)).toBe(true);
		expect(await verifyPassword("segredo-124", hash)).toBe(false);
	});

	it("still spends a verification when there's no account", async () => {
		expect(await verifyAgainstDummy("qualquer")).toBe(false);
	});
});

describe("session tokens", () => {
	it("are 256-bit base64url and different every time", () => {
		const token = generateSessionToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(generateSessionToken()).not.toBe(token);
	});

	it("are stored as a SHA-256 hex digest", () => {
		const hash = hashSessionToken("abc");
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hashSessionToken("abc")).toBe(hash);
	});
});

describe("isMasterPassword", () => {
	it("is off when no master password is set", () => {
		expect(isMasterPassword("", undefined)).toBe(false);
		expect(isMasterPassword("anything", undefined)).toBe(false);
	});

	it("matches only the exact master password", () => {
		const master = "uma-senha-mestra-longa";
		expect(isMasterPassword(master, master)).toBe(true);
		expect(isMasterPassword(`${master} `, master)).toBe(false);
		expect(isMasterPassword("curta", master)).toBe(false);
	});
});

describe("readBearerToken", () => {
	it("reads the token, whatever the scheme's case", () => {
		expect(readBearerToken("Bearer abc-123_x")).toBe("abc-123_x");
		expect(readBearerToken("bearer abc")).toBe("abc");
	});

	it("rejects missing, empty and other schemes", () => {
		expect(readBearerToken(undefined)).toBeNull();
		expect(readBearerToken("Bearer ")).toBeNull();
		expect(readBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
		expect(readBearerToken("Bearer a b")).toBeNull();
	});
});

describe("renewedExpiry", () => {
	const now = new Date("2026-11-05T12:00:00Z");

	it("keeps a session used less than a day ago", () => {
		const expiresAt = new Date(now.getTime() + SESSION_TTL_MS - DAY / 2);
		expect(renewedExpiry(expiresAt, now)).toBeNull();
	});

	it("pushes the expiry 30 days from now after a day", () => {
		const expiresAt = new Date(now.getTime() + SESSION_TTL_MS - DAY);
		expect(renewedExpiry(expiresAt, now)?.getTime()).toBe(
			now.getTime() + SESSION_TTL_MS,
		);
	});
});
