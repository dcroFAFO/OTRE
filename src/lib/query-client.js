import { QueryClient } from '@tanstack/react-query';
import { shouldRetryQuery } from '@/lib/errors';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Retry only transient read failures. Auth and missing records need an
			// immediate, actionable state instead of repeated requests.
			retry: shouldRetryQuery,
			retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
		},
		mutations: {
			retry: false,
		},
	},
});
