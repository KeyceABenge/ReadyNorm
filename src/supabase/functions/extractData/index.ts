import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import OpenAI from 'npm:openai@4.52.0';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, json_schema } = await req.json();

    if (!file_url || !json_schema) {
      return Response.json({ error: 'file_url and json_schema are required' }, { status: 400 });
    }

    const lowerUrl = file_url.toLowerCase();
    const isImage = lowerUrl.match(/\.(png|jpg|jpeg|webp|gif)/) ||
                    lowerUrl.includes('image/');

    let extractedData;

    if (isImage) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a document data extraction specialist. Extract structured data from the provided image according to the given JSON schema. Return valid JSON only."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract data from this document image according to this JSON schema:\n${JSON.stringify(json_schema)}\n\nReturn valid JSON matching the schema. For fields you cannot find, return empty string or empty array.`
              },
              {
                type: "image_url",
                image_url: { url: file_url, detail: "high" }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      extractedData = JSON.parse(content);
    } else {
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        return Response.json({
          status: "error",
          details: `Failed to fetch file: ${fileResponse.status}`,
          output: null
        });
      }

      const contentType = fileResponse.headers.get("content-type") || "";
      const arrayBuffer = await fileResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      const mimeType = contentType.includes("pdf") ? "application/pdf" : contentType;
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a document data extraction specialist. Extract structured data from the provided document according to the given JSON schema. Return valid JSON only."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract data from this document according to this JSON schema:\n${JSON.stringify(json_schema)}\n\nReturn valid JSON matching the schema. For fields you cannot find, return empty string or empty array.`
              },
              {
                type: "file" as any,
                file: {
                  filename: "document.pdf",
                  file_data: dataUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      extractedData = JSON.parse(content);
    }

    return Response.json({
      status: "success",
      details: null,
      output: extractedData
    });
  } catch (error) {
    console.error("extractData error:", error);
    return Response.json({
      status: "error",
      details: (error as Error).message,
      output: null
    });
  }
});