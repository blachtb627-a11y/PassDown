import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MODEL = "claude-sonnet-5";

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

const TRANSLATE_TOOL = {
  name: "translate_recipe",
  description:
    "Translate a recipe's title, story, ingredients, and steps into natural English for a US home cook, and " +
    "convert any metric or otherwise non-US measurements (grams, milliliters, Celsius, etc.) into common US " +
    "customary cooking units (cups, tablespoons, teaspoons, ounces, pounds, Fahrenheit), rounded to sensible " +
    "cooking measurements rather than exact decimals (e.g. '1/4 cup' rather than '0.24 cup').",
  input_schema: {
    type: "object",
    properties: {
      sourceLanguage: {
        type: "string",
        description:
          "The language the recipe was originally written in (e.g. 'Spanish'), or 'English' if it was already " +
          "in English (in which case only unit conversion, if any, was needed).",
      },
      title: { type: "string", description: "The translated title." },
      story: { type: "string", description: "The translated story/description. Empty string if there was none." },
      ingredients: {
        type: "array",
        description: "Exactly as many ingredients as given, in the same order, translated and unit-converted.",
        items: {
          type: "object",
          properties: {
            quantity: { type: "string", description: "The converted quantity, e.g. '1/4' or '2'." },
            unit: { type: "string", description: "The converted unit, e.g. 'cup' or 'tsp'. May be empty." },
            item: { type: "string", description: "The translated ingredient name." },
          },
          required: ["quantity", "unit", "item"],
        },
      },
      steps: {
        type: "array",
        description: "Exactly as many steps as given, in the same order, translated and unit-converted.",
        items: { type: "string" },
      },
    },
    required: ["sourceLanguage", "title", "story", "ingredients", "steps"],
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
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "";
    const story = typeof body.story === "string" ? body.story : "";
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const steps = Array.isArray(body.steps) ? body.steps : [];

    if (!title && ingredients.length === 0 && steps.length === 0) {
      return json({ error: "Nothing to translate." }, 400);
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        tools: [TRANSLATE_TOOL],
        tool_choice: { type: "tool", name: "translate_recipe" },
        messages: [
          {
            role: "user",
            content:
              "Recipe to translate:\n" +
              JSON.stringify({ title, story, ingredients, steps }, null, 2) +
              "\n\nTranslate it to English and convert units to US customary measurements using the " +
              "translate_recipe tool. Preserve the exact number and order of ingredients (" +
              ingredients.length +
              ") and steps (" +
              steps.length +
              ").",
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error", anthropicRes.status, errText);
      return json({ error: "Could not translate this recipe right now." }, 502);
    }

    const anthropicBody = await anthropicRes.json();
    const toolUse = (anthropicBody.content ?? []).find((block: { type: string }) => block.type === "tool_use");
    if (!toolUse) {
      return json({ error: "Could not translate this recipe right now." }, 502);
    }

    return json({ translation: toolUse.input });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
