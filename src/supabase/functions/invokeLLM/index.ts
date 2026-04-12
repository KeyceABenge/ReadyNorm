import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import OpenAI from 'npm:openai@4.52.0';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { prompt, response_json_schema, file_urls, model } = await req.json();

    if (!prompt) {
      return jsonResponse({ error: 'prompt is required' }, 400);
    }

    // Build messages
    const messages: any[] = [];

    messages.push({
      role: "system",
      content: "You are a helpful assistant. Follow the user's instructions precisely."
    });

    // Build user message content (text + optional files/images)
    const userContent: any[] = [];
    userContent.push({ type: "text", text: prompt });

    // Track whether we have document files (need gpt-4o, not mini)
    let hasDocumentFiles = false;

    // Attach files if provided — handle PDFs vs images differently
    if (file_urls) {
      const urls = Array.isArray(file_urls) ? file_urls : [file_urls];
      for (const url of urls) {
        if (!url || typeof url !== 'string') continue;

        const lowerUrl = url.toLowerCase();
        const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('/pdf');
        const isImage = lowerUrl.match(/\.(png|jpg|jpeg|webp|gif)/) || lowerUrl.includes('image/');

        if (isPdf) {
          // PDFs: fetch, convert to base64, send as file content type
          try {
            console.log(`[invokeLLM] Fetching PDF: ${url.substring(0, 100)}...`);
            const fileResponse = await fetch(url);
            if (!fileResponse.ok) {
              console.error(`[invokeLLM] PDF fetch failed: ${fileResponse.status}`);
              continue;
            }
            const arrayBuffer = await fileResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:application/pdf;base64,${base64}`;

            userContent.push({
              type: "file" as any,
              file: {
                filename: "document.pdf",
                file_data: dataUrl
              }
            });
            hasDocumentFiles = true;
            console.log(`[invokeLLM] PDF attached (${(arrayBuffer.byteLength / 1024).toFixed(0)} KB)`);
          } catch (fetchErr) {
            console.error(`[invokeLLM] Failed to fetch PDF:`, fetchErr);
          }
        } else if (isImage) {
          // Images: send directly as image_url
          userContent.push({
            type: "image_url",
            image_url: { url, detail: "auto" }
          });
          hasDocumentFiles = true;
        } else {
          // Unknown file type — try the same fetch+base64 approach as PDFs
          try {
            const fileResponse = await fetch(url);
            if (!fileResponse.ok) continue;
            const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
            const arrayBuffer = await fileResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:${contentType};base64,${base64}`;

            userContent.push({
              type: "file" as any,
              file: {
                filename: url.split('/').pop()?.split('?')[0] || "document",
                file_data: dataUrl
              }
            });
            hasDocumentFiles = true;
          } catch (fetchErr) {
            console.error(`[invokeLLM] Failed to fetch file:`, fetchErr);
          }
        }
      }
    }

    messages.push({ role: "user", content: userContent.length === 1 ? prompt : userContent });

    // Select model — auto-upgrade to gpt-4o when files are attached
    const modelMap: Record<string, string> = {
      'gpt_5_mini': 'gpt-4o-mini',
      'gpt_5': 'gpt-4o',
      'gpt_5_4': 'gpt-4o',
      'automatic': 'gpt-4o-mini',
    };
    let selectedModel = modelMap[model] || 'gpt-4o-mini';
    if (hasDocumentFiles && selectedModel === 'gpt-4o-mini') {
      selectedModel = 'gpt-4o';
    }

    // Build request params — larger token budget when processing documents
    const maxTokens = hasDocumentFiles ? 16384 : 4096;
    const requestParams: any = {
      model: selectedModel,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    };

    // If structured output requested, use response_format
    if (response_json_schema) {
      requestParams.response_format = { type: "json_object" };
      messages[messages.length - 1] = {
        role: "user",
        content: userContent.length === 1
          ? `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(response_json_schema)}`
          : [
              { type: "text", text: `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(response_json_schema)}` },
              ...userContent.slice(1)
            ]
      };
    }

    const completion = await openai.chat.completions.create(requestParams);
    const content = completion.choices[0]?.message?.content || "";

    // If JSON schema was requested, parse the response
    if (response_json_schema) {
      try {
        const parsed = JSON.parse(content);
        return jsonResponse(parsed);
      } catch {
        return jsonResponse({ raw: content });
      }
    }

    return jsonResponse({ result: content });
  } catch (error) {
    console.error("invokeLLM error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});