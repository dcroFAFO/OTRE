import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Keeps a filter object in sync with the URL query string so active filters &
// search survive a page refresh and can be shared/bookmarked.
//
// - `defaults` is the EMPTY_* constant for the page. Keys equal to their default
//   are omitted from the URL to keep it clean.
// - `preserveKeys` lists query params that belong to other concerns (e.g. the
//   job detail `id` / `group`) and must be carried through untouched.
export function useUrlFilters(defaults, preserveKeys = []) {
  const location = useLocation();
  const navigate = useNavigate();

  const filters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const val = params.get(key);
      if (val !== null) next[key] = val;
    }
    return next;
  }, [location.search, defaults]);

  const setFilters = useCallback((update) => {
    const params = new URLSearchParams(location.search);
    const current = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const val = params.get(key);
      if (val !== null) current[key] = val;
    }
    const resolved = typeof update === "function" ? update(current) : update;

    const out = new URLSearchParams();
    // Carry through unrelated params (id, group, etc).
    for (const key of preserveKeys) {
      const val = params.get(key);
      if (val !== null && val !== "") out.set(key, val);
    }
    // Only write keys that differ from their default.
    for (const key of Object.keys(defaults)) {
      const val = resolved[key];
      if (val !== undefined && val !== null && val !== defaults[key]) out.set(key, val);
    }
    navigate(`${location.pathname}?${out.toString()}`, { replace: true });
  }, [location.search, location.pathname, navigate, defaults, preserveKeys]);

  return [filters, setFilters];
}