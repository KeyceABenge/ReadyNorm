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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
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

    const { prompt, response_json_schema, file_urls, model } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Build messages
    const messages: any[] = [];

    messages.push({
      role: "system",
      content: "You are a helpful assistant. Follow the user's instructions precisely."
    });

    // Build user message content (text + optional images)
    const userContent: any[] = [];
    userContent.push({ type: "text", text: prompt });

    // Attach images if provided
    if (file_urls) {
      const urls = Array.isArray(file_urls) ? file_urls : [file_urls];
      for (const url of urls) {
        if (url && typeof url === 'string') {
          userContent.push({
            type: "image_url",
            image_url: { url, detail: "auto" }
          });
        }
      }
    }

    messages.push({ role: "user", content: userContent.length === 1 ? prompt : userContent });

    // Select model
    const modelMap: Record<string, string> = {
      'gpt_5_mini': 'gpt-4o-mini',
      'gpt_5': 'gpt-4o',
      'gpt_5_4': 'gpt-4o',
      'automatic': 'gpt-4o-mini',
    };
    const selectedModel = modelMap[model] || 'gpt-4o-mini';

    // Build request params
    const requestParams: any = {
      model: selectedModel,
      messages,
      max_tokens: 4096,
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
        return Response.json(parsed);
      } catch {
        return Response.json({ raw: content });
      }
    }

    return Response.json({ result: content });
  } catch (error) {
    console.error("invokeLLM error:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});