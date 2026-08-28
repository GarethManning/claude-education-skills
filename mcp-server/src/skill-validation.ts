import {
  EVIDENCE_STRENGTHS,
  type InputFieldType,
  type LoadedSkill,
} from "./types.js";

const INPUT_FIELD_TYPES = new Set<InputFieldType>([
  "string",
  "array",
  "integer",
  "number",
  "boolean",
]);
const EVIDENCE_LABELS = new Set<string>(EVIDENCE_STRENGTHS);

export function assertValidLoadedSkills(value: unknown): asserts value is LoadedSkill[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Skill bundle must be a non-empty array");
  }

  const ids = new Set<string>();
  const toolNames = new Set<string>();
  for (const [index, candidate] of value.entries()) {
    const location = `skills[${index}]`;
    if (!isRecord(candidate)) throw new Error(`${location} must be an object`);
    if (!isRecord(candidate.metadata)) throw new Error(`${location}.metadata must be an object`);

    const metadata = candidate.metadata;
    requireString(metadata.skill_id, `${location}.metadata.skill_id`);
    requireString(metadata.skill_name, `${location}.metadata.skill_name`);
    requireString(metadata.domain, `${location}.metadata.domain`);
    requireString(metadata.version, `${location}.metadata.version`);
    requireString(candidate.toolName, `${location}.toolName`);
    requireString(candidate.description, `${location}.description`);
    requireString(candidate.prompt, `${location}.prompt`);

    if (!EVIDENCE_LABELS.has(String(metadata.evidence_strength))) {
      throw new Error(`${location}.metadata.evidence_strength is unsupported`);
    }
    if (typeof metadata["disable-model-invocation"] !== "boolean") {
      throw new Error(`${location}.metadata.disable-model-invocation must be boolean`);
    }
    requireStringArray(metadata.evidence_sources, `${location}.metadata.evidence_sources`);
    requireStringArray(metadata.chains_well_with, `${location}.metadata.chains_well_with`);
    requireStringArray(metadata.tags, `${location}.metadata.tags`);
    if (metadata.teacher_time !== undefined && typeof metadata.teacher_time !== "string") {
      throw new Error(`${location}.metadata.teacher_time must be a string when present`);
    }

    if (!isRecord(metadata.input_schema)) {
      throw new Error(`${location}.metadata.input_schema must be an object`);
    }
    const requiredNames = validateInputFields(
      metadata.input_schema.required,
      `${location}.metadata.input_schema.required`,
    );
    const optionalNames = validateInputFields(
      metadata.input_schema.optional ?? [],
      `${location}.metadata.input_schema.optional`,
    );
    const allNames = [...requiredNames, ...optionalNames];
    if (new Set(allNames).size !== allNames.length) {
      throw new Error(`${location}.metadata.input_schema contains duplicate field names`);
    }

    if (ids.has(metadata.skill_id)) throw new Error(`Duplicate skill_id: ${metadata.skill_id}`);
    if (toolNames.has(candidate.toolName)) throw new Error(`Duplicate toolName: ${candidate.toolName}`);
    ids.add(metadata.skill_id);
    toolNames.add(candidate.toolName);
  }
}

function validateInputFields(value: unknown, location: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${location} must be an array`);
  return value.map((candidate, index) => {
    const fieldLocation = `${location}[${index}]`;
    if (!isRecord(candidate)) throw new Error(`${fieldLocation} must be an object`);
    requireString(candidate.field, `${fieldLocation}.field`);
    requireString(candidate.description, `${fieldLocation}.description`);
    if (!INPUT_FIELD_TYPES.has(candidate.type as InputFieldType)) {
      throw new Error(`${fieldLocation}.type is unsupported`);
    }
    return candidate.field as string;
  });
}

function requireString(value: unknown, location: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${location} must be a non-empty string`);
  }
}

function requireStringArray(value: unknown, location: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${location} must be an array of strings`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
