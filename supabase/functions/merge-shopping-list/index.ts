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

const MERGE_TOOL = {
  name: "merge_shopping_list",
  description:
    "Decide, for each new ingredient being added to a shopping list, whether it's the same grocery item as " +
    "something already on the list (even if worded differently, e.g. 'bell pepper' and 'red pepper' and " +
    "'peppers, diced' are the same item) and if so what the combined quantity should be.",
  input_schema: {
    type: "object",
    properties: {
      merges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            newIngredientIndex: {
              type: "number",
              description: "Index into the newIngredients array this decision is for.",
            },
            existingItemId: {
              type: "string",
              description:
                "The id of the existing shopping list item this is the same grocery item as, if any. Omit " +
                "entirely (do not include this field) if it's not the same as anything already on the list.",
            },
            quantity: {
              type: "string",
              description:
                "The final quantity to store — the new ingredient's own quantity if this is a new item, or " +
                "the sum/combination with the existing item's quantity if merging (e.g. '1' + '2' -> '3'; " +
                "'1/2' + '1/2' -> '1'). If quantities can't be meaningfully combined (missing, non-numeric, or " +
                "incompatible units), just combine them as readable text instead, e.g. '2 cups + a splash'.",
            },
            unit: { type: "string", description: "The final unit to store, matching the quantity above. May be empty." },
            item: {
              type: "string",
              description: "The final, clean ingredient name to display, e.g. 'bell pepper' rather than 'peppers, diced'.",
            },
          },
          required: ["newIngredientIndex", "quantity", "unit", "item"],
        },
      },
    },
    required: ["merges"],
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
    const existingItems = Array.isArray(body.existingItems) ? body.existingItems : [];
    const newIngredients = Array.isArray(body.newIngredients) ? body.newIngredients : [];

    if (newIngredients.length === 0) {
      return json({ merges: [] });
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
        max_tokens: 2048,
        tools: [MERGE_TOOL],
        tool_choice: { type: "tool", name: "merge_shopping_list" },
        messages: [
          {
            role: "user",
            content:
              "Current shopping list items:\n" +
              JSON.stringify(existingItems, null, 2) +
              "\n\nNew ingredients being added:\n" +
              JSON.stringify(newIngredients, null, 2) +
              "\n\nFor every new ingredient (by its index in that array), decide whether it's the same grocery " +
              "item as one already on the list and what the combined quantity/unit/item should be, using the " +
              "merge_shopping_list tool. Every index from 0 to " +
              (newIngredients.length - 1) +
              " must appear exactly once in `merges`.",
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error", anthropicRes.status, errText);
      return json({ error: "Could not combine shopping list items right now." }, 502);
    }

    const anthropicBody = await anthropicRes.json();
    const toolUse = (anthropicBody.content ?? []).find((block: { type: string }) => block.type === "tool_use");
    if (!toolUse) {
      return json({ error: "Could not combine shopping list items right now." }, 502);
    }

    return json({ merges: toolUse.input.merges ?? [] });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
