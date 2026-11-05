import { ApiError } from "@/lib/api-error";

/**
 * Message to show for an error thrown by a query or mutation. API errors carry a pt-BR message; anything else (a
 * crash, a raw network error in English) gets a generic text.
 */
export function errorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	return "Algo deu errado. Tente de novo.";
}
