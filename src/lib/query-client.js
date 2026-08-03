import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Reads retry on transient network/server failures with backoff, so a
			// brief blip shows data rather than an error state.
			retry: 2,
			retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
		},
	},
});