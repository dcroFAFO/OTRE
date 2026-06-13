import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STORE_ID = Deno.env.get("ECWID_STORE_ID");
const TOKEN = Deno.env.get("ECWID_SECRET_TOKEN");

// Map Ecwid category names to our internal category/group keys
function mapCategory(categoryName = "") {
  const name = categoryName.toLowerCase();
  if (name.includes("tyre") || name.includes("tire")) return { category_key: "tyres", category_label: "Tyres", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("tube")) return { category_key: "tubes", category_label: "Tubes", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("valve")) return { category_key: "valves", category_label: "Valves", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("brake pad")) return { category_key: "brake-pads", category_label: "Brake Pads", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("rotor") || name.includes("disc")) return { category_key: "brake-rotors", category_label: "Brake Disc Rotors", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("calliper") || name.includes("lever") || name.includes("caliper")) return { category_key: "brake-callipers", category_label: "Brake Callipers & Levers", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("brake hose") || name.includes("brake cable")) return { category_key: "brake-hose", category_label: "Brake Hose, Cable & Fittings", group_key: "tyres-brakes", group_label: "Tyres & Brakes" };
  if (name.includes("dynoroad")) return { category_key: "dynoroad", category_label: "TurboTread DynoRoad", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("dynogrip")) return { category_key: "dynogrip", category_label: "TurboTread DynoGrip", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("dynoslick")) return { category_key: "dynoslick", category_label: "TurboTread DynoSlick", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("turbobrake")) return { category_key: "turbobrake", category_label: "TurboBrake", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("suspension") || name.includes("turbotouch")) return { category_key: "turbotouch", category_label: "TurboTouch Suspension", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("turbocharge") || name.includes("charger")) return { category_key: "turbocharge", category_label: "TurboCharge", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("light") || name.includes("torch")) return { category_key: "turbotorch", category_label: "TurboTorch Lighting", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("harness") || name.includes("turbotap")) return { category_key: "turbotap", category_label: "TurboTap Harness", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("gps") || name.includes("track")) return { category_key: "turbotrack", category_label: "TurboTrack GPS", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("structural") || name.includes("turbotight")) return { category_key: "turbotight", category_label: "TurboTight Structural", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("tool")) return { category_key: "turbotool", category_label: "TurboTool", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("teverun") || name.includes("escooter") || name.includes("scooter")) return { category_key: "teverun", category_label: "Teverun eScooters", group_key: "esn-originals", group_label: "eSN Originals" };
  if (name.includes("nami")) return { category_key: "nami-spares", category_label: "NAMI Electric Spares", group_key: "oem-spares", group_label: "OEM Factory Spares" };
  if (name.includes("kaabo")) return { category_key: "kaabo-spares", category_label: "Kaabo Spares", group_key: "oem-spares", group_label: "OEM Factory Spares" };
  if (name.includes("security") || name.includes("lock")) return { category_key: "security", category_label: "Security", group_key: "everything-else", group_label: "Everything else" };
  if (name.includes("electrical") || name.includes("electric")) return { category_key: "electrical", category_label: "Other Electrical", group_key: "everything-else", group_label: "Everything else" };
  if (name.includes("service")) return { category_key: "services", category_label: "eScootNow Services", group_key: "everything-else", group_label: "Everything else" };
  if (name.includes("clearance") || name.includes("sale")) return { category_key: "clearance", category_label: "Clearance items", group_key: "everything-else", group_label: "Everything else" };
  // Default fallback
  return { category_key: "non-electrical", category_label: "Other Non-Electrical", group_key: "everything-else", group_label: "Everything else" };
}

const ECWID_HEADERS = { "Authorization": `Bearer ${TOKEN}` };

async function fetchAllEcwidProducts() {
  const products = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://app.ecwid.com/api/v3/${STORE_ID}/products?limit=${limit}&offset=${offset}&enabled=true`;
    const res = await fetch(url, { headers: ECWID_HEADERS });
    if (!res.ok) throw new Error(`Ecwid API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    products.push(...(data.items || []));
    if (products.length >= data.total || (data.items || []).length < limit) break;
    offset += limit;
  }

  return products;
}

async function fetchEcwidCategories() {
  const url = `https://app.ecwid.com/api/v3/${STORE_ID}/categories?limit=200`;
  const res = await fetch(url, { headers: ECWID_HEADERS });
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  for (const cat of (data.items || [])) {
    map[cat.id] = cat.name;
  }
  return map;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch categories map and all products from Ecwid
    const [categoryMap, ecwidProducts] = await Promise.all([
      fetchEcwidCategories(),
      fetchAllEcwidProducts(),
    ]);

    // Get existing products keyed by supplier_url (Ecwid product URL) or sku
    const existing = await base44.asServiceRole.entities.Product.filter({ supplier: "eScootNow" });
    const existingBySku = {};
    for (const p of existing) {
      if (p.sku) existingBySku[p.sku] = p;
    }

    let created = 0;
    let updated = 0;

    const BATCH_SIZE = 20;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < ecwidProducts.length; i++) {
      const ep = ecwidProducts[i];
      // Resolve category name from first category id
      const catId = ep.categoryIds?.[0];
      const catName = catId ? (categoryMap[catId] || "") : "";
      const catMapped = mapCategory(catName);

      const imageUrl = ep.thumbnailUrl || ep.imageUrl || ep.originalImageUrl || "";
      const price = ep.price ?? ep.defaultDisplayedPrice ?? 0;
      const inStock = ep.inStock !== false && (ep.unlimited || (ep.quantity ?? 1) > 0);
      const productUrl = `https://escootnow.com.au/p/${ep.id}`;

      const payload = {
        name: ep.name || "Unnamed Product",
        sku: String(ep.sku || ep.id),
        description: ep.description ? ep.description.replace(/<[^>]+>/g, "").slice(0, 500) : "",
        price,
        currency: "AUD",
        image_url: imageUrl,
        in_stock: inStock,
        supplier: "eScootNow",
        supplier_url: productUrl,
        active: ep.enabled !== false,
        ...catMapped,
      };

      const skuKey = String(ep.sku || ep.id);
      if (existingBySku[skuKey]) {
        await base44.asServiceRole.entities.Product.update(existingBySku[skuKey].id, payload);
        updated++;
      } else {
        await base44.asServiceRole.entities.Product.create(payload);
        created++;
      }

      // Small pause every batch to avoid rate limits
      if ((i + 1) % BATCH_SIZE === 0) await sleep(500);
    }

    return Response.json({
      success: true,
      total: ecwidProducts.length,
      created,
      updated,
      message: `Sync complete: ${created} created, ${updated} updated.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});