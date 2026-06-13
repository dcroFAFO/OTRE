import { BRAND_NAMES } from "@/config/scooterBrands";

// Brands we can detect inside product name / description text.
// "Other" is excluded since it isn't a real brand keyword.
const DETECTABLE_BRANDS = BRAND_NAMES.filter((b) => b !== "Other");

// Return the list of known scooter brands mentioned in a product's text.
export function detectBrands(product) {
  const haystack = `${product.name || ""} ${product.description || ""}`.toLowerCase();
  return DETECTABLE_BRANDS.filter((b) => haystack.includes(b.toLowerCase()));
}

// Build the option lists for the filter dropdowns from the loaded products.
export function buildPartsFacets(products) {
  const categories = new Set();
  const brands = new Set();
  for (const p of products) {
    if (p.category_label) categories.add(p.category_label);
    detectBrands(p).forEach((b) => brands.add(b));
  }
  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
  };
}

// Apply all active filters to the product list.
export function applyPartsFilters(products, filters) {
  const q = filters.search.trim().toLowerCase();
  return products.filter((p) => {
    if (q) {
      const match =
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category_label?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.category && p.category_label !== filters.category) return false;
    if (filters.stock === "in" && !p.in_stock) return false;
    if (filters.stock === "out" && p.in_stock) return false;
    if (filters.brand || filters.suits) {
      const detected = detectBrands(p);
      if (filters.brand && !detected.includes(filters.brand)) return false;
      if (filters.suits && !detected.includes(filters.suits)) return false;
    }
    return true;
  });
}