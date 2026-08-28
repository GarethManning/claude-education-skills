export interface SchemaField {
  field: string;
  type: string;
  description: string;
}

export type InputFieldType = "string" | "array" | "integer" | "number" | "boolean";

export interface InputSchemaField extends SchemaField {
  type: InputFieldType;
}

export interface InputSchema {
  required: InputSchemaField[];
  optional?: InputSchemaField[];
}

export interface OutputSchema {
  type: string;
  fields: SchemaField[];
}

export const EVIDENCE_STRENGTHS = [
  "strong",
  "moderate",
  "low-moderate",
  "medium",
  "emerging",
  "original",
  "practitioner",
] as const;

export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export interface SkillMetadata {
  // Agent Skills v2 fields
  name?: string;
  description?: string;
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  effort?: string;
  // Existing fields
  skill_id: string;
  skill_name: string;
  domain: string;
  version: string;
  evidence_strength: EvidenceStrength;
  evidence_sources: string[];
  input_schema: InputSchema;
  output_schema?: OutputSchema;
  chains_well_with: string[];
  teacher_time?: string;
  tags: string[];
}

export interface LoadedSkill {
  metadata: SkillMetadata;
  prompt: string;
  description: string;
  filePath?: string;
  toolName: string;
}
