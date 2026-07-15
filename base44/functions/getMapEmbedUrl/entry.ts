Deno.serve(async (req) => {
  try {
    // Public landing page endpoint — no auth required, just serves a map embed URL.
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) return Response.json({ error: 'Maps API key not configured' }, { status: 500 });

    const { address } = await req.json();
    const query = encodeURIComponent(address || "");
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`;

    return Response.json({ embedUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});