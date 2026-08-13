const GENERIC_ERROR = "Something went wrong. Please try again.";

function numericStatus(error) {
  const value = error?.status ?? error?.response?.status ?? error?.data?.status;
  const status = Number(value);
  return Number.isFinite(status) ? status : undefined;
}

export function getErrorStatus(error) {
  return numericStatus(error);
}

export function shouldRetryQuery(failureCount, error) {
  const status = numericStatus(error);
  if ([401, 403, 404].includes(status)) return false;
  return failureCount < 2;
}

export function getSafeErrorMessage(error, fallback = GENERIC_ERROR) {
  const status = numericStatus(error);

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to complete that action.";
  if (status === 404) return "The requested information could not be found.";
  if (status === 408) return "The request timed out. Please try again.";
  if (status === 409) return "That change conflicts with newer information. Refresh and try again.";
  if (status === 429) return "Too many requests were made. Please wait a moment and try again.";
  if (status && status >= 500) return fallback;

  const publicMessage = error?.response?.data?.user_message ?? error?.response?.data?.error;
  if (status && status >= 400 && status < 500 && typeof publicMessage === "string" && publicMessage.length <= 240) {
    return publicMessage;
  }

  if (!status && (error?.name === "TypeError" || /network|fetch/i.test(String(error?.message || "")))) {
    return "We could not connect. Check your connection and try again.";
  }

  return fallback;
}

