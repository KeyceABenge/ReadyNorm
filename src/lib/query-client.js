import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Cache data for 2 minutes before it's considered stale.
			// Without this, every component mount triggers a fresh Supabase request.
			staleTime: 2 * 60 * 1000,
			// Keep unused query data in memory for 10 minutes.
			gcTime: 10 * 60 * 1000,
		},
	},
});