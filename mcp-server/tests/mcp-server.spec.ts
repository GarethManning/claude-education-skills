import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createServer } from "../src/server.js";
import type { LoadedSkill } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_SCRIPT = resolve(__dirname, "../dist/index.js");
const bundledSkills = JSON.parse(
  readFileSync(resolve(__dirname, "../src/skills.json"), "utf-8"),
) as LoadedSkill[];

async function createClient(env?: Record<string, string>): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_SCRIPT],
    env: { ...process.env, ...env } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

test.describe("MCP Server — Startup", () => {
  let client: Client;

  test.afterEach(async () => {
    await client?.close();
  });

  test("registers 153 invocable skill tools plus 4 meta-tools and all 165 prompts", async () => {
    client = await createClient();

    const { tools } = await client.listTools();
    const metaTools = ["list_skills", "get_skill_details", "find_skills", "suggest_skills"];
    expect(bundledSkills).toHaveLength(165);
    expect(bundledSkills.filter((skill) => skill.metadata["disable-model-invocation"])).toHaveLength(12);
    expect(tools).toHaveLength(157);
    for (const name of metaTools) {
      expect(tools.find((t) => t.name === name)).toBeTruthy();
    }

    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(165);
    for (const skill of bundledSkills.filter((candidate) => candidate.metadata["disable-model-invocation"])) {
      expect(tools.some((tool) => tool.name === skill.toolName)).toBe(false);
      expect(prompts.some((prompt) => prompt.name === skill.toolName)).toBe(true);
    }
  });

  test("rejects malformed bundled data at runtime before registration", () => {
    const malformed = structuredClone(bundledSkills);
    malformed[0].prompt = "";
    expect(() => createServer(malformed)).toThrow(/prompt must be a non-empty string/);
  });
});

test.describe("MCP Server — list_skills", () => {
  let client: Client;

  test.beforeEach(async () => {
    client = await createClient();
  });

  test.afterEach(async () => {
    await client?.close();
  });

  test("returns skills grouped by all bundled domains", async () => {
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    const expectedDomains = Array.from(
      new Set(bundledSkills.map((s) => s.metadata.domain)),
    );

    for (const domain of expectedDomains) {
      expect(text).toContain(`## ${domain}`);
    }
  });

  test("filters by single domain", async () => {
    const result = await client.callTool({
      name: "list_skills",
      arguments: { domain: "memory-learning-science" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    expect(text).toContain("## memory-learning-science");
    expect(text).not.toContain("## curriculum-assessment");
    expect(text).toContain("Cognitive Load Analyser");
  });

  test("renders missing teacher time as documented absence", async () => {
    const result = await client.callTool({
      name: "list_skills",
      arguments: { domain: "student-learning" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Time: not specified");
    expect(text).not.toContain("Time: undefined");
  });
});

test.describe("MCP Server — suggest_skills", () => {
  let client: Client;

  test.beforeEach(async () => {
    client = await createClient();
  });

  test.afterEach(async () => {
    await client?.close();
  });

  test("returns 3-5 results for a plain English query", async () => {
    const result = await client.callTool({
      name: "suggest_skills",
      arguments: {
        problem_description:
          "My students struggle with reading comprehension and I need scaffolded tasks for EAL learners",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    const skillMatches = text.match(/- \*\*[^*]+\*\*/g);
    expect(skillMatches).toBeTruthy();
    expect(skillMatches!.length).toBeGreaterThanOrEqual(3);
    expect(skillMatches!.length).toBeLessThanOrEqual(5);
  });

  test("returns domain fallback when no matches found", async () => {
    const result = await client.callTool({
      name: "suggest_skills",
      arguments: {
        problem_description: "xyzzyplugh",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    expect(text).toContain("list_skills");
    expect(text).toContain("Available domains");
  });
});

test.describe("MCP Server — skill tools", () => {
  let client: Client;

  test.beforeEach(async () => {
    client = await createClient();
  });

  test.afterEach(async () => {
    await client?.close();
  });

  test("returns instruction-framed prompt with inputs substituted", async () => {
    const result = await client.callTool({
      name: "cognitive-load-analyser",
      arguments: {
        task_description:
          "Students read a passage about mitosis while labelling a diagram",
        student_level: "Year 9 novice",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    expect(text).toContain("INSTRUCTIONS: You are now executing an education skill");
    expect(text).toContain("<skill_instructions>");
    expect(text).toContain("Generate the complete output now.");
    expect(text).toContain("Cognitive Load Theory");
    expect(text).toContain("mitosis");
    expect(text).toContain("Year 9 novice");
  });

  // The former slug collision (two `critical-thinking-task-designer` skills) was
  // resolved by renaming the curriculum-assessment copy. With no duplicate slug,
  // buildToolName exposes clean, un-prefixed tool names on both surfaces.
  test("exposes both critical-thinking skills under distinct un-prefixed names", async () => {
    const { tools } = await client.listTools();
    const criticalThinkingTools = tools.filter((t) =>
      t.name.includes("critical-thinking-task-designer"),
    );

    expect(criticalThinkingTools.length).toBe(2);
    expect(criticalThinkingTools.map((t) => t.name).sort()).toEqual([
      "critical-thinking-task-designer",
      "discipline-specific-critical-thinking-task-designer",
    ]);
    // No domain-prefixed (collision) form should remain.
    expect(tools.some((t) => t.name.includes("__"))).toBe(false);
  });

  test("publishes strict scalar JSON schemas without string coercion", async () => {
    const { tools } = await client.listTools();
    const integerTool = tools.find((tool) => tool.name === "ai-socratic-dialogue-designer")!;
    const booleanTool = tools.find((tool) => tool.name === "ai-learning-boundary-mapper")!;
    const integerProperties = (integerTool.inputSchema as { properties: Record<string, { type: string }> }).properties;
    const booleanProperties = (booleanTool.inputSchema as { properties: Record<string, { type: string }> }).properties;
    expect(integerProperties.rounds.type).toBe("integer");
    expect(booleanProperties.tool_comparison_needed.type).toBe("boolean");

    const integerError = await client.callTool({
      name: "ai-socratic-dialogue-designer",
      arguments: {
        interrogation_topic: "A claim",
        student_level: "Year 10",
        rounds: "4",
      },
    });
    expect(integerError.isError).toBe(true);
    expect((integerError.content as Array<{ text: string }>)[0].text).toContain("Expected number, received string");

    const booleanError = await client.callTool({
      name: "ai-learning-boundary-mapper",
      arguments: {
        assignment_description: "An essay",
        learning_objectives: "Construct an argument",
        tool_comparison_needed: "false",
      },
    });
    expect(booleanError.isError).toBe(true);
    expect((booleanError.content as Array<{ text: string }>)[0].text).toContain("Expected boolean, received string");
  });
});

test.describe("MCP Server — skill prompts", () => {
  let client: Client;

  test.beforeEach(async () => {
    client = await createClient();
  });

  test.afterEach(async () => {
    await client?.close();
  });

  test("returns assembled prompt as user message with inputs substituted", async () => {
    const result = await client.getPrompt({
      name: "cognitive-load-analyser",
      arguments: {
        task_description:
          "Students read a passage about mitosis while labelling a diagram",
        student_level: "Year 9 novice",
      },
    });

    expect(result.messages.length).toBe(1);
    expect(result.messages[0].role).toBe("user");

    const text = result.messages[0].content as { type: string; text: string };
    expect(text.type).toBe("text");
    // Should contain the expert role framing from the prompt
    expect(text.text).toContain("Cognitive Load Theory");
    // Should contain the teacher input section with substituted values
    expect(text.text).toContain("## Teacher Input");
    expect(text.text).toContain("mitosis");
    expect(text.text).toContain("Year 9 novice");
  });

  // Mirror of the tools-side check: the resolved collision means both
  // critical-thinking prompts are registered under clean, un-prefixed names.
  test("exposes both critical-thinking prompts under distinct un-prefixed names", async () => {
    const { prompts } = await client.listPrompts();
    const criticalThinking = prompts.filter((p) =>
      p.name.includes("critical-thinking-task-designer"),
    );

    expect(criticalThinking.length).toBe(2);
    expect(criticalThinking.map((p) => p.name).sort()).toEqual([
      "critical-thinking-task-designer",
      "discipline-specific-critical-thinking-task-designer",
    ]);
    // No domain-prefixed (collision) form should remain.
    expect(prompts.some((p) => p.name.includes("__"))).toBe(false);
  });
});

test.describe("MCP Server — SKILLS_FILTER", () => {
  let client: Client;

  test.afterEach(async () => {
    await client?.close();
  });

  test("limits loaded domains to those in SKILLS_FILTER", async () => {
    client = await createClient({
      SKILLS_FILTER: "memory-learning-science,explicit-instruction",
    });

    // Skill tools + 4 meta-tools, filtered
    const { tools } = await client.listTools();
    const metaTools = ["list_skills", "get_skill_details", "find_skills", "suggest_skills"];
    const skillTools = tools.filter((t) => !metaTools.includes(t.name));
    expect(skillTools.length).toBeGreaterThan(0);
    expect(skillTools.length).toBeLessThan(153);

    // Prompts should be filtered too
    const { prompts } = await client.listPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.length).toBeLessThan(165);

    // Verify via list_skills that only filtered domains appear
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;

    expect(text).toContain("## memory-learning-science");
    expect(text).toContain("## explicit-instruction");
    expect(text).not.toContain("## curriculum-assessment");
    expect(text).not.toContain("## wellbeing-motivation-agency");
  });
});
