import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const healthKeys = {
	all: ["health"] as const,
};

export function useHealth() {
	return useQuery({
		queryKey: healthKeys.all,
		queryFn: async () => {
			const { data, error } = await api.health.get();
			if (error) throw error;
			return data;
		},
	});
}
