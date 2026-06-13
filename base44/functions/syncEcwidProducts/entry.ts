import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STORE_ID = Deno.env.get("ECWID_STORE_ID");
const TOKEN = Deno.env.get("ECWID_SECRET_TOKEN");
const ECWID_HEADERS = { "Authorization": `Bearer ${TOKEN}` };

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
  return { category_key: "non-electrical", category_label: "Other Non-Electrical", group_key: "everything-else", group_label: "Everything else" };
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'technician'].includes(user?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse optional pagination params: offset into Ecwid, page_size (max products per call)
    const body = await req.json().catch(() => ({}));
    const ecwidOffset = body.offset ?? 0;
    const pageSize = Math.min(body.page_size ?? 25, 50); // max 50 per invocation

    // Fetch this page of Ecwid products
    const ecwidUrl = `https://app.ecwid.com/api/v3/${STORE_ID}/products?limit=${pageSize}&offset=${ecwidOffset}&enabled=true`;
    const ecwidRes = await fetch(ecwidUrl, { headers: ECWID_HEADERS });
    if (!ecwidRes.ok) throw new Error(`Ecwid API error: ${ecwidRes.status} ${await ecwidRes.text()}`);
    const ecwidData = await ecwidRes.json();
    const ecwidProducts = ecwidData.items || [];
    const ecwidTotal = ecwidData.total ?? 0;

    // Fetch categories (small request, cheap)
    const categoryMap = await fetchEcwidCategories();

    // Load existing products for upsert matching
    const existing = await base44.asServiceRole.entities.Product.filter({ supplier: "eScootNow" });
    const existingBySku = {};
    for (const p of existing) {
      if (p.sku) existingBySku[p.sku] = p;
    }

    let created = 0;
    let updated = 0;

    for (let i = 0; i < ecwidProducts.length; i++) {
      const ep = ecwidProducts[i];
      const catId = ep.categoryIds?.[0];
      const catName = catId ? (categoryMap[catId] || "") : "";
      const catMapped = mapCategory(catName);

      const imageUrl = ep.hdThumbnailUrl || ep.thumbnailUrl || ep.imageUrl || ep.originalImageUrl || "";
      const price = ep.price ?? ep.defaultDisplayedPrice ?? 0;
      const inStock = ep.inStock !== false && (ep.unlimited || (ep.quantity ?? 1) > 0);
      const productUrl = ep.url || `https://escootnow.com.au/p/${ep.id}`;

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

      // 300ms between writes to respect rate limits
      if (i < ecwidProducts.length - 1) await sleep(300);
    }

    const nextOffset = ecwidOffset + ecwidProducts.length;
    const hasMore = nextOffset < ecwidTotal;

    return Response.json({
      success: true,
      created,
      updated,
      processed: ecwidProducts.length,
      total: ecwidTotal,
      next_offset: hasMore ? nextOffset : null,
      has_more: hasMore,
      message: `Synced ${created + updated} products (${created} new, ${updated} updated). ${hasMore ? `${ecwidTotal - nextOffset} remaining.` : "All done!"}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});