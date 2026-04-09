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
    let fileUrl: string | null;
    let forceDownload = false;
    let customFilename: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      fileUrl = url.searchParams.get("url");
      forceDownload = url.searchParams.get("download") === "true";
      customFilename = url.searchParams.get("filename");
    } else {
      const body = await req.json();
      fileUrl = body.url;
      forceDownload = body.download === true;
      customFilename = body.filename || null;
    }

    if (!fileUrl) {
      return Response.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "https:") {
      return Response.json({ error: "Only HTTPS URLs are supported" }, { status: 400 });
    }

    const response = await fetch(fileUrl, {
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
    const urlPath = parsedUrl.pathname;
    const inferredFilename = customFilename || urlPath.split("/").pop() || "file";
    const fileData = await response.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(fileData.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    };

    if (forceDownload) {
      responseHeaders["Content-Disposition"] = `attachment; filename="${inferredFilename}"`;
    } else if (contentType.startsWith("image/") || contentType === "application/pdf") {
      responseHeaders["Content-Disposition"] = `inline; filename="${inferredFilename}"`;
    }

    return new Response(fileData, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});