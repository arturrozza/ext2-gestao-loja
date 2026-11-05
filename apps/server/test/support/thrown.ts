/** What a call threw (Elysia's `status()` isn't an `Error`, so `toThrow` can't match it). */
export function thrown(call: () => void): unknown {
	try {
		call();
	} catch (error) {
		return error;
	}
	return undefined;
}
