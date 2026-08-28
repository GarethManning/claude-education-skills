import type { LoadedSkill } from "./types.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };

export function assemblePrompt(skill: LoadedSkill, args: Record<string, unknown>): string {
  let prompt = skill.prompt;

  // Replace {{placeholder}} tokens with provided values
  for (const [key, value] of Object.entries(args)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    const strValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
    prompt = prompt.replace(placeholder, strValue);
  }

  // Strip any remaining {{placeholders}} for optional params not provided
  prompt = prompt.replace(/\{\{[^}]+\}\}/g, "[not provided]");

  // Build an input summary for any placeholders that weren't in the template
  // (some prompts use different placeholder conventions)
  const inputSummary = Object.entries(args)
    .map(([key, value]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const strValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      return `**${label}:** ${strValue}`;
    })
    .join("\n");

  return `${prompt}\n\n---\n\n## Teacher Input\n\n${inputSummary}`;
}

export function handleListSkills(
  skills: LoadedSkill[],
  args: Record<string, unknown>,
): ToolResult {
  const domain = typeof args.domain === "string" ? args.domain : undefined;
  const filtered = domain ? skills.filter((s) => s.metadata.domain === domain) : skills;

  const grouped = new Map<string, LoadedSkill[]>();
  for (const skill of filtered) {
    const d = skill.metadata.domain;
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(skill);
  }

  const lines: string[] = [];
  for (const [d, domainSkills] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${d}\n`);
    for (const s of domainSkills) {
      lines.push(
        `- **${s.metadata.skill_name}** (${s.toolName})\n  Evidence: ${s.metadata.evidence_strength} | Time: ${s.metadata.teacher_time ?? "not specified"} | Tags: ${s.metadata.tags.join(", ")}`,
      );
    }
    lines.push("");
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

export function handleGetSkillDetails(
  skillsById: Map<string, LoadedSkill>,
  args: Record<string, unknown>,
): ToolResult {
  const skillId = typeof args.skill_id === "string" ? args.skill_id : "";
  const skill = skillsById.get(skillId);

  if (!skill) {
    return { content: [{ type: "text", text: `Skill not found: ${skillId}` }] };
  }

  const m = skill.metadata;
  const details = {
    skill_id: m.skill_id,
    skill_name: m.skill_name,
    tool_name: skill.toolName,
    domain: m.domain,
    version: m.version,
    evidence_strength: m.evidence_strength,
    evidence_sources: m.evidence_sources,
    teacher_time: m.teacher_time ?? "not specified",
    tags: m.tags,
    chains_well_with: m.chains_well_with,
    input_schema: m.input_schema,
    output_schema: m.output_schema,
  };

  return { content: [{ type: "text", text: JSON.stringify(details, null, 2) }] };
}

export function handleFindSkills(
  skills: LoadedSkill[],
  args: Record<string, unknown>,
): ToolResult {
  const query = typeof args.query === "string" ? args.query.toLowerCase() : "";
  const domain = typeof args.domain === "string" ? args.domain : "";
  const evidenceStrength = typeof args.evidence_strength === "string" ? args.evidence_strength : "";
  const tag = typeof args.tag === "string" ? args.tag.toLowerCase() : "";

  let results = skills;

  if (domain) {
    results = results.filter((s) => s.metadata.domain === domain);
  }
  if (evidenceStrength) {
    results = results.filter((s) => s.metadata.evidence_strength === evidenceStrength);
  }
  if (tag) {
    results = results.filter((s) => s.metadata.tags.some((t) => t.toLowerCase().includes(tag)));
  }
  if (query) {
    results = results.filter((s) => {
      const haystack = [
        s.metadata.skill_name,
        s.metadata.skill_id,
        s.description,
        ...s.metadata.tags,
      ]
        .join(" ")
        .toLowerCase();
      return query.split(/\s+/).every((word) => haystack.includes(word));
    });
  }

  if (results.length === 0) {
    return { content: [{ type: "text", text: "No skills matched your search." }] };
  }

  const lines = results.map(
    (s) =>
      `- **${s.metadata.skill_name}** (${s.toolName})\n  ${s.description}\n  Evidence: ${s.metadata.evidence_strength} | Domain: ${s.metadata.domain}`,
  );

  return { content: [{ type: "text", text: lines.join("\n\n") }] };
}

export function handleSuggestSkills(
  skills: LoadedSkill[],
  args: Record<string, unknown>,
): ToolResult {
  const description = typeof args.problem_description === "string" ? args.problem_description : "";

  if (!description) {
    return {
      content: [{ type: "text", text: "Please provide a problem_description." }],
    };
  }

  // Build a keyword-scored ranking
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = skills.map((skill) => {
    const haystack = [
      skill.metadata.skill_name,
      skill.description,
      ...skill.metadata.tags,
      skill.metadata.domain.replace(/-/g, " "),
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    for (const word of words) {
      if (haystack.includes(word)) score++;
    }
    return { skill, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5).filter((s) => s.score > 0);

  if (top.length === 0) {
    // Fall back: return a catalogue summary so the user can browse
    const domains = [...new Set(skills.map((s) => s.metadata.domain))].sort();
    return {
      content: [
        {
          type: "text",
          text: `No strong matches found. Try browsing by domain using list_skills. Available domains:\n${domains.map((d) => `- ${d}`).join("\n")}`,
        },
      ],
    };
  }

  const lines = top.map(({ skill: s, score }) => {
    const tagHits = words.filter((w) =>
      s.metadata.tags.some((t) => t.toLowerCase().includes(w)),
    );
    const relevance = tagHits.length > 0
      ? `Matches: ${tagHits.join(", ")}`
      : `Relevant to your description`;
    return `- **${s.metadata.skill_name}** (\`${s.toolName}\`)\n  ${s.description}\n  ${relevance} | Evidence: ${s.metadata.evidence_strength}`;
  });

  return {
    content: [
      {
        type: "text",
        text: `Based on: "${description}"\n\nSuggested skills:\n\n${lines.join("\n\n")}`,
      },
    ],
  };
}
