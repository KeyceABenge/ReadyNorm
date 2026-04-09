Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    let imageUrl: string | null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      imageUrl = url.searchParams.get("url");
    } else {
      const body = await req.json();
      imageUrl = body.url;
    }

    if (!imageUrl) {
      return Response.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "https:") {
      return Response.json({ error: "Only HTTPS URLs are supported" }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "Accept": "*/*",
        "User-Agent": "ReadyNorm-FileProxy/1.0",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const fileData = await response.arrayBuffer();

    return new Response(fileData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileData.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});