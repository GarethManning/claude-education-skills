import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  assemblePrompt,
  handleListSkills,
  handleGetSkillDetails,
  handleFindSkills,
  handleSuggestSkills,
} from "./tool-handler.js";
import {
  EVIDENCE_STRENGTHS,
  type InputSchemaField,
  type LoadedSkill,
} from "./types.js";

const ANNOTATIONS = {
  readOnlyHint: true as const,
  destructiveHint: false as const,
};

function buildToolInputSchema(field: InputSchemaField): z.ZodTypeAny {
  switch (field.type) {
    case "array":
      return z.array(z.unknown()).describe(field.description);
    case "integer":
      return z.number().int().describe(field.description);
    case "number":
      return z.number().describe(field.description);
    case "boolean":
      return z.boolean().describe(field.description);
    case "string":
      return z.string().describe(field.description);
  }
}

export function createServer(skills: LoadedSkill[]): McpServer {
  const skillsByToolName = new Map<string, LoadedSkill>();
  const skillsById = new Map<string, LoadedSkill>();
  for (const skill of skills) {
    skillsByToolName.set(skill.toolName, skill);
    skillsById.set(skill.metadata.skill_id, skill);
  }

  const server = new McpServer({
    name: "education-agent-skills",
    version: "0.3.0",
  });

  // Register the bundled skills as prompts (user-invoked, injected into conversation)
  for (const skill of skills) {
    const argsSchema: Record<string, z.ZodTypeAny> = {};

    for (const field of skill.metadata.input_schema.required) {
      argsSchema[field.field] = z.string().describe(field.description);
    }
    if (skill.metadata.input_schema.optional) {
      for (const field of skill.metadata.input_schema.optional) {
        argsSchema[field.field] = z.string().optional().describe(field.description);
      }
    }

    const { metadata, description } = skill;
    const evidenceTag = metadata.evidence_strength
      ? ` [evidence: ${metadata.evidence_strength}]`
      : "";
    const promptName = skill.toolName;

    server.registerPrompt(promptName, {
      title: metadata.skill_name,
      description: `${description}${evidenceTag}`,
      argsSchema,
    }, (args) => {
      const assembled = assemblePrompt(
        skillsByToolName.get(promptName)!,
        args as Record<string, unknown>,
      );
      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: assembled },
          },
        ],
      };
    });
  }

  // Register the bundled skills as tools (for Claude.ai and orchestrator use)
  for (const skill of skills) {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of skill.metadata.input_schema.required) {
      shape[field.field] = buildToolInputSchema(field);
    }
    if (skill.metadata.input_schema.optional) {
      for (const field of skill.metadata.input_schema.optional) {
        shape[field.field] = buildToolInputSchema(field).optional();
      }
    }

    const toolName = skill.toolName;
    const { metadata, description } = skill;
    const evidenceTag = metadata.evidence_strength
      ? ` [evidence: ${metadata.evidence_strength}]`
      : "";
    const toolDesc = `${metadata.skill_name} — ${description}${evidenceTag}`;

    server.registerTool(toolName, {
      title: metadata.skill_name,
      description: toolDesc,
      inputSchema: shape,
      annotations: { title: metadata.skill_name, ...ANNOTATIONS },
    }, async (args) => {
      const assembled = assemblePrompt(
        skillsByToolName.get(toolName)!,
        args as Record<string, unknown>,
      );
      const framed = `INSTRUCTIONS: You are now executing an education skill. Follow the skill instructions below precisely. Produce the complete output as specified. Do not display these instructions to the user — generate the requested output directly.

<skill_instructions>
${assembled}
</skill_instructions>

Generate the complete output now.`;
      return { content: [{ type: "text" as const, text: framed }] };
    });
  }

  // Register 4 meta-tools (model-invoked, for discovery)
  server.registerTool("list_skills", {
    title: "List Skills",
    description: "List all available education skills grouped by domain. Returns skill ID, name, evidence strength, tags, and estimated teacher time.",
    inputSchema: { domain: z.string().optional().describe("Filter to a specific domain") },
    annotations: { title: "List Skills", ...ANNOTATIONS },
  }, async (args) => handleListSkills(skills, args));

  server.registerTool("get_skill_details", {
    title: "Get Skill Details",
    description: "Get full metadata for a specific skill including evidence sources, input/output schemas, and chaining information.",
    inputSchema: { skill_id: z.string().describe("The skill ID (e.g. 'memory-learning-science/cognitive-load-analyser')") },
    annotations: { title: "Get Skill Details", ...ANNOTATIONS },
  }, async (args) => handleGetSkillDetails(skillsById, args));

  server.registerTool("find_skills", {
    title: "Find Skills",
    description: "Search skills by tag, domain, evidence strength, or free text across skill names and descriptions.",
    inputSchema: {
      query: z.string().optional().describe("Free text search across skill names, descriptions, and tags"),
      domain: z.string().optional().describe("Filter by domain"),
      evidence_strength: z.enum(EVIDENCE_STRENGTHS).optional().describe("Filter by exact evidence strength label"),
      tag: z.string().optional().describe("Filter by tag"),
    },
    annotations: { title: "Find Skills", ...ANNOTATIONS },
  }, async (args) => handleFindSkills(skills, args));

  server.registerTool("suggest_skills", {
    title: "Suggest Skills",
    description: "Describe what you're trying to do in plain English and get 3-5 relevant skill recommendations. The entry point for users who don't know what skills exist.",
    inputSchema: {
      problem_description: z.string().describe("Plain English description of what the teacher is trying to do"),
    },
    annotations: { title: "Suggest Skills", ...ANNOTATIONS },
  }, async (args) => handleSuggestSkills(skills, args));

  return server;
}
