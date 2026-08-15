import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const SCAN_BATCH_SIZE = 500;
const MAX_SEARCH_SCAN = 5000;

function clean(value: unknown, maxLength = 1000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function productDto(product: any) {
  return {
    id: product.id,
    name: clean(product.name, 240),
    sku: clean(product.sku, 120),
    category_key: clean(product.category_key, 120),
    category_label: clean(product.category_label, 160),
    group_key: clean(product.group_key, 120),
    description: clean(product.description, 3000),
    price: Number(product.price || 0),
    currency: clean(product.currency || 'AUD', 12),
    image_url: clean(product.image_url, 2000),
    in_stock: product.in_stock !== false,
    order: Number(product.order || 0),
  };
}

function productSearchText(product: any) {
  return `${product.name || ''} ${product.description || ''} ${product.sku || ''}`.toLowerCase();
}

function stableProductOrder(left: any, right: any) {
  const orderDifference = Number(left.order || 0) - Number(right.order || 0);
  if (orderDifference) return orderDifference;
  const nameDifference = clean(left.name, 240).localeCompare(clean(right.name, 240));
  if (nameDifference) return nameDifference;
  return clean(left.id, 160).localeCompare(clean(right.id, 160));
}

async function scanSearchResults(entity: any, query: Record<string, unknown>, search: string) {
  const matches: any[] = [];
  let scanned = 0;
  let exhausted = false;

  while (scanned < MAX_SEARCH_SCAN) {
    const limit = Math.min(SCAN_BATCH_SIZE, MAX_SEARCH_SCAN - scanned);
    const batch = await entity.filter(query, 'created_date', limit, scanned);
    matches.push(...batch.filter((product: any) => productSearchText(product).includes(search)));
    scanned += batch.length;
    if (batch.length < limit) {
      exhausted = true;
      break;
    }
  }

  matches.sort(stableProductOrder);
  return { matches, scanned, exhausted };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST for this action.' } }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const page = Math.max(1, Math.floor(Number(body.page) || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(body.page_size) || PAGE_SIZE)));
    const category = clean(body.category, 120);
    const search = clean(body.search, 120).toLowerCase();
    const query: Record<string, unknown> = { active: true };
    if (category) query.category_key = category;
    const start = (page - 1) * pageSize;

    if (!search) {
      const rows = await base44.asServiceRole.entities.Product.filter(query, 'order', pageSize + 1, start);
      return Response.json({
        ok: true,
        data: {
          items: rows.slice(0, pageSize).map(productDto),
          page,
          page_size: pageSize,
          has_more: rows.length > pageSize,
          potentially_truncated: false,
          search_scope_complete: true,
        },
      });
    }

    const { matches, scanned, exhausted } = await scanSearchResults(base44.asServiceRole.entities.Product, query, search);
    const items = matches.slice(start, start + pageSize).map(productDto);
    return Response.json({
      ok: true,
      data: {
        items,
        page,
        page_size: pageSize,
        has_more: matches.length > start + pageSize,
        potentially_truncated: !exhausted,
        search_scope_complete: exhausted,
        scanned_count: scanned,
        scan_limit: MAX_SEARCH_SCAN,
      },
    });
  } catch (error) {
    console.error('[publicCatalog]', clean(error?.message || error, 500));
    return Response.json({ ok: false, error: { code: 'catalog_unavailable', message: 'The product catalogue is temporarily unavailable.' } }, { status: 500 });
  }
});
