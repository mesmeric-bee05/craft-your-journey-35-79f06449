/**
 * Provider-agnostic chat-completion adapter for the edge functions.
 *
 * Provider preference:
 *   1. Gemini      — GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)
 *   2. Lovable AI  — LOVABLE_API_KEY (existing behaviour, kept as a fallback)
 *   3. OpenAI-API  — OPENAI_API_KEY, optionally OPENAI_BASE_URL for compatible hosts
 *
 * Call sites keep the shape they already parse: this returns an OpenAI-style
 * Response (`choices[0].message.content` / `.tool_calls`), so switching provider
 * needs no changes to how each function reads the answer.
 */

export type AIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatRequest = {
  model?: string;
  messages: AIMessage[];
  max_tokens?: number;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
};

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Model pools. Google retires models for new API keys and individual models
 * return 503 when busy, so each request carries an ordered list of acceptable
 * models and falls through to the next one instead of failing the feature.
 */
const FLASH_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
const LITE_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"];
const DEFAULT_GEMINI_MODEL = FLASH_MODELS[0];

/**
 * Call sites still name the familiar Gemini 2.5 models; map those legacy names
 * onto the current equivalents so the app keeps working without touching every
 * function.
 */
const GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.5-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-2.0-flash": "gemini-3.5-flash",
  "gemini-2.0-flash-lite": "gemini-3.5-flash-lite",
  "gemini-1.5-flash": "gemini-3.5-flash",
  "gemini-1.5-pro": "gemini-3.5-flash",
};

function readEnv(name: string): string | undefined {
  // Deno is the runtime; the guard keeps the module importable in plain Node tests.
  const deno = (globalThis as { Deno?: { env?: { get(key: string): string | undefined } } }).Deno;
  const value = deno?.env?.get?.(name);
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getGeminiKey(): string | undefined {
  return (
    readEnv("GEMINI_API_KEY") ??
    readEnv("GOOGLE_AI_API_KEY") ??
    readEnv("GOOGLE_GENERATIVE_AI_API_KEY")
  );
}

export function getLovableKey(): string | undefined {
  return readEnv("LOVABLE_API_KEY");
}

export function getOpenAIKey(): string | undefined {
  return readEnv("OPENAI_API_KEY");
}

/** True when at least one AI provider is configured. */
export function isAIConfigured(): boolean {
  return Boolean(getGeminiKey() ?? getLovableKey() ?? getOpenAIKey());
}

/** The provider that will be used, for logging and diagnostics. */
export function activeAIProvider(): "gemini" | "lovable" | "openai" | "none" {
  if (getGeminiKey()) return "gemini";
  if (getLovableKey()) return "lovable";
  if (getOpenAIKey()) return "openai";
  return "none";
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * A clear, user-safe response used when no provider is configured, so the UI can
 * say "AI is not configured" instead of an unexplained failure.
 */
export function aiNotConfiguredResponse(): Response {
  return jsonResponse(
    {
      error: {
        code: "AI_NOT_CONFIGURED",
        message: "AI is not configured for this project. Add GEMINI_API_KEY to the project secrets.",
      },
    },
    503,
  );
}

/**
 * `google/gemini-2.5-flash-lite` → ["gemini-3.5-flash-lite", ...lite fallbacks]
 * The first entry is the requested model; the rest are fallbacks for 404/429/503.
 */
function geminiModelCandidates(model?: string): string[] {
  const bare = (model ?? "").replace(/^google\//, "").trim();
  const isLite = /lite/i.test(bare);
  const pool = isLite ? LITE_MODELS : FLASH_MODELS;
  const alias = GEMINI_MODEL_ALIASES[bare];
  const primary = alias ?? (bare.startsWith("gemini") ? bare : pool[0]);
  return [primary, ...pool.filter((m) => m !== primary)];
}

/**
 * Gemini's function declarations accept only a subset of JSON Schema and reject
 * unknown keywords outright (400 INVALID_ARGUMENT), so unsupported keys are
 * removed recursively before the schema is sent.
 */
const UNSUPPORTED_SCHEMA_KEYS = new Set([
  "additionalProperties",
  "unevaluatedProperties",
  "$schema",
  "$id",
  "$ref",
  "definitions",
  "$defs",
  "strict",
]);

function sanitizeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSchema);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (UNSUPPORTED_SCHEMA_KEYS.has(key)) continue;
    if (key === "properties" && child && typeof child === "object") {
      const properties: Record<string, unknown> = {};
      for (const [name, schema] of Object.entries(child as Record<string, unknown>)) {
        properties[name] = sanitizeSchema(schema);
      }
      out[key] = properties;
      continue;
    }
    out[key] = sanitizeSchema(child);
  }
  return out;
}

type OpenAITool = {
  type?: string;
  function?: {
    name?: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

function toGeminiTools(tools: unknown[] | undefined): unknown[] | undefined {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  const declarations = tools
    .map((tool) => (tool as OpenAITool)?.function)
    .filter((fn): fn is NonNullable<OpenAITool["function"]> => Boolean(fn?.name))
    .map((fn) => ({
      name: fn.name,
      description: fn.description ?? "",
      parameters: sanitizeSchema(fn.parameters ?? { type: "object", properties: {} }),
    }));
  return declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;
}

function toGeminiToolConfig(choice: unknown): unknown {
  if (!choice || typeof choice !== "object") return undefined;
  const record = choice as { type?: string; function?: { name?: string } };
  if (record.function?.name) {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [record.function.name],
      },
    };
  }
  if (record.type === "none") return { functionCallingConfig: { mode: "NONE" } };
  if (record.type === "required" || record.type === "any") {
    return { functionCallingConfig: { mode: "ANY" } };
  }
  return { functionCallingConfig: { mode: "AUTO" } };
}

function buildGeminiBody(request: ChatRequest): Record<string, unknown> {
  const systemText = request.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "" }] }],
    generationConfig: {
      maxOutputTokens: request.max_tokens ?? 800,
      temperature: request.temperature ?? 0.7,
    },
  };

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const tools = toGeminiTools(request.tools);
  if (tools) {
    body.tools = tools;
    const toolConfig = toGeminiToolConfig(request.tool_choice);
    if (toolConfig) body.toolConfig = toolConfig;
  }

  return body;
}

type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
};

function toOpenAIShape(gemini: Record<string, unknown>): Record<string, unknown> {
  const candidate = (gemini.candidates as Array<Record<string, unknown>> | undefined)?.[0] ?? {};
  const content = (candidate.content as { parts?: GeminiPart[] } | undefined) ?? {};
  const parts = Array.isArray(content.parts) ? content.parts : [];

  const text = parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");

  const toolCalls = parts
    .filter((p) => p.functionCall?.name)
    .map((p, index) => ({
      id: `call_${index}`,
      type: "function",
      function: {
        name: p.functionCall!.name,
        arguments: JSON.stringify(p.functionCall!.args ?? {}),
      },
    }));

  const finishReason = candidate.finishReason === "MAX_TOKENS" ? "length" : "stop";
  const usage = (gemini.usageMetadata as Record<string, number> | undefined) ?? {};

  return {
    id: `gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: gemini.modelVersion ?? DEFAULT_GEMINI_MODEL,
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        message: {
          role: "assistant",
          content: text.length > 0 ? text : null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
      },
    ],
    usage: {
      prompt_tokens: usage.promptTokenCount ?? 0,
      completion_tokens: usage.candidatesTokenCount ?? 0,
      total_tokens: usage.totalTokenCount ?? 0,
    },
  };
}

async function requestGemini(model: string, request: ChatRequest, apiKey: string): Promise<Response> {
  const upstream = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildGeminiBody(request)),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text();
    // Surface the status so callers keep their existing 429/402 handling;
    // the body is normalised into the same error envelope they expect.
    return jsonResponse(
      {
        error: {
          code: "AI_PROVIDER_ERROR",
          provider: "gemini",
          model,
          status: upstream.status,
          message: detail.slice(0, 500),
        },
      },
      upstream.status,
    );
  }

  const payload = (await upstream.json()) as Record<string, unknown>;
  return jsonResponse(toOpenAIShape(payload), 200);
}

/**
 * Tries the requested model, then the fallbacks, on the transient/retirement
 * statuses (retired model, rate limited, model overloaded).
 */
async function callGemini(request: ChatRequest, apiKey: string): Promise<Response> {
  let lastResponse: Response | null = null;

  for (const model of geminiModelCandidates(request.model)) {
    const response = await requestGemini(model, request, apiKey);
    if (response.ok) return response;

    lastResponse = response;
    if (![404, 429, 503].includes(response.status)) return response;
  }

  return lastResponse ?? aiNotConfiguredResponse();
}

async function callLovable(request: ChatRequest, apiKey: string): Promise<Response> {
  const upstream = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model ?? "google/gemini-2.5-flash",
      messages: request.messages,
      max_tokens: request.max_tokens ?? 800,
      temperature: request.temperature ?? 0.7,
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
    }),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

async function callOpenAI(request: ChatRequest, apiKey: string): Promise<Response> {
  const base = (readEnv("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model ?? "gpt-4o-mini",
      messages: request.messages,
      max_tokens: request.max_tokens ?? 800,
      temperature: request.temperature ?? 0.7,
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
    }),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Runs a chat completion against the configured provider and always resolves to
 * an OpenAI-shaped `Response`. When nothing is configured it resolves to a 503
 * with `AI_NOT_CONFIGURED`, so screens can explain the problem precisely.
 */
export async function createChatCompletion(request: ChatRequest): Promise<Response> {
  const geminiKey = getGeminiKey();
  if (geminiKey) return callGemini(request, geminiKey);

  const lovableKey = getLovableKey();
  if (lovableKey) return callLovable(request, lovableKey);

  const openAIKey = getOpenAIKey();
  if (openAIKey) return callOpenAI(request, openAIKey);

  return aiNotConfiguredResponse();
}
