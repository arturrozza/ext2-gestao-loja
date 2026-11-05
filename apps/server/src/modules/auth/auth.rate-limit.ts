import { httpError } from "../../lib/http-error";

type Entry = { attempts: number; resetAt: number };

const tooManyAttempts = () =>
	httpError(429, {
		code: "too_many_attempts",
		message: "Muitas tentativas. Espere alguns minutos e tente de novo.",
	});

/** Expired entries are swept once the map gets this big, so random keys can't grow it forever. */
const SWEEP_AT = 1000;

/**
 * Counts password attempts per key (an e-mail, a user) in memory. An attempt is reserved before the password is
 * checked, synchronously, so parallel requests can't all slip past the limit; a success clears the key. After
 * `maxAttempts` failed ones within `windowMs` the key is refused until the window ends. In memory is enough: the API
 * runs as a single instance.
 */
export function createAttemptLimiter({
	maxAttempts,
	windowMs,
}: {
	maxAttempts: number;
	windowMs: number;
}) {
	const entries = new Map<string, Entry>();

	function sweep(now: number) {
		for (const [key, entry] of entries) {
			if (entry.resetAt <= now) entries.delete(key);
		}
	}

	return {
		/** Reserves an attempt for the key, or throws 429 when it has none left. */
		reserve(key: string, now = Date.now()): void {
			if (entries.size >= SWEEP_AT) sweep(now);
			const entry = entries.get(key);
			if (!entry || entry.resetAt <= now) {
				entries.set(key, { attempts: 1, resetAt: now + windowMs });
				return;
			}
			if (entry.attempts >= maxAttempts) throw tooManyAttempts();
			entry.attempts += 1;
		},
		/** The attempt succeeded: the key starts over. */
		clear(key: string): void {
			entries.delete(key);
		},
	};
}

export type AttemptLimiter = ReturnType<typeof createAttemptLimiter>;

/**
 * Caps how many password hashes run at once. Each argon2 check takes ~64 MiB, and an unknown e-mail still costs one
 * (timing), so without this a burst of sign-ins with random e-mails could exhaust the server's memory.
 */
export function createHashGate(maxInFlight: number) {
	let inFlight = 0;
	return async function run<T>(work: () => Promise<T>): Promise<T> {
		if (inFlight >= maxInFlight) throw tooManyAttempts();
		inFlight += 1;
		try {
			return await work();
		} finally {
			inFlight -= 1;
		}
	};
}

export type HashGate = ReturnType<typeof createHashGate>;
