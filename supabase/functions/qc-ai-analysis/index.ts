import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a QC production management assistant for a dubbing studio. Analyze QC and Mix task metadata and produce actionable insights.

Produce a JSON array of insights:
[{
  "type": "deadline_risk" | "stale" | "workload" | "waiting_vendor",
  "title": "short title",
  "description": "1-2 sentence explanation",
  "taskIds": ["id1", "id2"],
  "severity": "high" | "medium" | "low"
}]

Rules:
- "deadline_risk": tasks due within 3 days missing submissions or with no updates
- "stale": tasks with no updates in 3+ days
- "waiting_vendor": tasks where internal reply was sent but vendor hasn't responded
- "workload": if one QC assignee has significantly more tasks than others
- Maximum 6 insights, only actionable ones
- Today: ${new Date().toISOString().split('T')[0]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(tasks) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_insights",
            description: "Return analyzed insights about QC tasks",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["deadline_risk", "stale", "workload", "waiting_vendor"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      taskIds: { type: "array", items: { type: "string" } },
                      severity: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["type", "title", "description", "taskIds", "severity"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["insights"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let insights = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      insights = parsed.insights || [];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("QC Analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", insights: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
