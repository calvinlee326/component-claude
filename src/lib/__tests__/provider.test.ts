/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("MockLanguageModel", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("has correct specification version", async () => {
    const { MockLanguageModel } = await import("@/lib/provider");
    const model = new MockLanguageModel("mock-model");

    expect(model.specificationVersion).toBe("v1");
  });

  test("has correct provider name", async () => {
    const { MockLanguageModel } = await import("@/lib/provider");
    const model = new MockLanguageModel("mock-model");

    expect(model.provider).toBe("mock");
  });

  test("stores model ID from constructor", async () => {
    const { MockLanguageModel } = await import("@/lib/provider");
    const model = new MockLanguageModel("test-model-id");

    expect(model.modelId).toBe("test-model-id");
  });

  test("has default object generation mode", async () => {
    const { MockLanguageModel } = await import("@/lib/provider");
    const model = new MockLanguageModel("mock-model");

    expect(model.defaultObjectGenerationMode).toBe("tool");
  });

  describe("doGenerate", () => {
    test("returns text and tool calls", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe("string");
      expect(result.finishReason).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.usage.promptTokens).toBeGreaterThan(0);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
    });

    test("returns raw call information", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const prompt = [
        { role: "user" as const, content: [{ type: "text" as const, text: "Create a counter" }] },
      ];

      const result = await model.doGenerate({
        prompt,
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.rawCall).toBeDefined();
      expect(result.rawCall.rawPrompt).toEqual(prompt);
    });

    test("returns tool call for counter prompt", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls[0].toolName).toBe("str_replace_editor");
    });

    test("returns tool call for form prompt", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a contact form" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.path).toBe("/App.jsx");
    });

    test("returns tool call for card prompt", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a card component" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
    });
  });

  describe("doStream", () => {
    test("returns readable stream", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.stream).toBeInstanceOf(ReadableStream);
    });

    test("returns warnings array", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.warnings).toEqual([]);
    });

    test("returns raw call and response", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.rawCall).toBeDefined();
      expect(result.rawResponse).toBeDefined();
    });

    test("stream emits text-delta events", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      const reader = result.stream.getReader();
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const textDeltas = chunks.filter((c) => c.type === "text-delta");
      expect(textDeltas.length).toBeGreaterThan(0);
    });

    test("stream emits tool-call event", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      const reader = result.stream.getReader();
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const toolCalls = chunks.filter((c) => c.type === "tool-call");
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0].toolName).toBe("str_replace_editor");
    });

    test("stream emits finish event", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      const reader = result.stream.getReader();
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const finishEvents = chunks.filter((c) => c.type === "finish");
      expect(finishEvents.length).toBe(1);
      expect(finishEvents[0].finishReason).toBe("tool-calls");
    });
  });

  describe("multi-turn conversation", () => {
    test("generates component file on second turn", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      // Simulate second turn (after App.jsx created)
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
          { role: "assistant", content: [{ type: "text", text: "Creating..." }] },
          {
            role: "tool",
            content: [
              { type: "tool-result", toolCallId: "call_1", result: "File created" },
            ],
          },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.command).toBe("create");
      expect(args.path).toContain("/components/");
    });

    test("generates str_replace on third turn", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      // Simulate third turn
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
          { role: "assistant", content: [{ type: "text", text: "Creating..." }] },
          {
            role: "tool",
            content: [
              { type: "tool-result", toolCallId: "call_1", result: "File created" },
            ],
          },
          { role: "assistant", content: [{ type: "text", text: "Creating component..." }] },
          {
            role: "tool",
            content: [
              { type: "tool-result", toolCallId: "call_2", result: "File created" },
            ],
          },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.command).toBe("str_replace");
    });

    test("generates summary on final turn (no tool calls)", async () => {
      const { MockLanguageModel } = await import("@/lib/provider");
      const model = new MockLanguageModel("mock-model");

      // Simulate final turn (4+ tool messages)
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "Create a counter" }] },
          { role: "assistant", content: [{ type: "text", text: "Creating..." }] },
          { role: "tool", content: [{ type: "tool-result", toolCallId: "1", result: "ok" }] },
          { role: "assistant", content: [{ type: "text", text: "Creating..." }] },
          { role: "tool", content: [{ type: "tool-result", toolCallId: "2", result: "ok" }] },
          { role: "assistant", content: [{ type: "text", text: "Creating..." }] },
          { role: "tool", content: [{ type: "tool-result", toolCallId: "3", result: "ok" }] },
        ],
        mode: { type: "regular" },
        inputFormat: "messages",
      });

      expect(result.finishReason).toBe("stop");
      expect(result.text).toContain("created");
    }, 15000); // Extend timeout for slow mock delays
  });
});

describe("getLanguageModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  test("returns MockLanguageModel when no API key is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { getLanguageModel, MockLanguageModel } = await import("@/lib/provider");
    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns MockLanguageModel when API key is empty string", async () => {
    process.env.ANTHROPIC_API_KEY = "";

    const { getLanguageModel, MockLanguageModel } = await import("@/lib/provider");
    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns MockLanguageModel when API key is whitespace", async () => {
    process.env.ANTHROPIC_API_KEY = "   ";

    const { getLanguageModel, MockLanguageModel } = await import("@/lib/provider");
    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns anthropic model when API key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key-12345";

    vi.mock("@ai-sdk/anthropic", () => ({
      anthropic: vi.fn((modelId: string) => ({
        provider: "anthropic",
        modelId,
      })),
    }));

    const { getLanguageModel } = await import("@/lib/provider");
    const model = getLanguageModel();

    expect(model.provider).toBe("anthropic");
  });
});
