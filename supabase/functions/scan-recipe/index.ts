import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MODEL = "claude-sonnet-5";
const MAX_IMAGE_BYTES = 8_000_000; // base64 length, not decoded size — a generous ceiling on what Claude's vision input accepts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EXTRACT_RECIPE_TOOL = {
  name: "extract_recipe",
  description:
    "Record a recipe read from a photo of a handwritten or printed recipe card/sheet.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "The recipe's name/title." },
      servings: { type: "number", description: "Number of servings, if stated." },
      prepMinutes: { type: "number", description: "Prep time in minutes, if stated." },
      cookMinutes: { type: "number", description: "Cook time in minutes, if stated." },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quantity: { type: "string", description: "e.g. '2', '1/2' — omit if not specified." },
            unit: { type: "string", description: "e.g. 'cups', 'tbsp' — omit if not specified." },
            item: { type: "string", description: "The ingredient itself, e.g. 'flour'." },
          },
          required: ["item"],
        },
      },
      steps: {
        type: "array",
        items: { type: "string" },
        description: "Each cooking step as its own array entry, in order.",
      },
    },
    required: ["title", "ingredients", "steps"],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Any signed-in user can scan a recipe — this just confirms they really
    // are signed in, it doesn't gate on any special permission.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const imageBase64 = body.imageBase64;
    const mediaType = body.mediaType;
    if (typeof imageBase64 !== "string" || !imageBase64) {
      return json({ error: "Missing imageBase64" }, 400);
    }
    if (imageBase64.length > MAX_IMAGE_BYTES) {
      return json({ error: "That photo is too large — try again with a smaller or lower-quality photo." }, 400);
    }
    const validMediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)
      ? mediaType
      : "image/jpeg";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        tools: [EXTRACT_RECIPE_TOOL],
        tool_choice: { type: "tool", name: "extract_recipe" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: validMediaType, data: imageBase64 } },
              {
                type: "text",
                text:
                  "This is a photo of a handwritten or printed home recipe card or sheet. Read it carefully and " +
                  "record it with the extract_recipe tool. Keep ingredient quantity/unit/item as separate fields " +
                  "when they're distinguishable; put the whole line in `item` if they're not. Split run-on " +
                  "handwriting into clear separate steps, preserving their original order. If a word is illegible, " +
                  "make your best reasonable guess from context rather than leaving it blank.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error", anthropicRes.status, errText);
      return json({ error: "Could not read that recipe. Please try again." }, 502);
    }

    const anthropicBody = await anthropicRes.json();
    const toolUse = (anthropicBody.content ?? []).find((block: { type: string }) => block.type === "tool_use");
    if (!toolUse) {
      return json({ error: "Could not read that recipe. Please try again with a clearer photo." }, 502);
    }

    return json({ recipe: toolUse.input });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
