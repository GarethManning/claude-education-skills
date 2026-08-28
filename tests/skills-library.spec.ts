import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const SKILLS_DIR = path.join(__dirname, "..", "skills");
const REGISTRY_PATH = path.join(__dirname, "..", "registry.json");
const PLUGIN_PATH = path.join(__dirname, "..", ".claude-plugin", "plugin.json");
const CODEX_PLUGIN_PATH = path.join(__dirname, "..", ".codex-plugin", "plugin.json");
const BUNDLED_SKILLS_PATH = path.join(__dirname, "..", "mcp-server", "src", "skills.json");

// Helper: collect all SKILL.md paths
function getAllSkillPaths(): string[] {
  const paths: string[] = [];
  const domains = fs.readdirSync(SKILLS_DIR);
  for (const domain of domains) {
    const domainPath = path.join(SKILLS_DIR, domain);
    if (!fs.statSync(domainPath).isDirectory()) continue;
    const skills = fs.readdirSync(domainPath);
    for (const skill of skills) {
      const skillFile = path.join(domainPath, skill, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        paths.push(skillFile);
      }
    }
  }
  return paths.sort();
}

// Helper: parse YAML frontmatter from a SKILL.md file
function parseFrontmatter(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.startsWith("---")) throw new Error(`No frontmatter: ${filePath}`);
  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) throw new Error(`No closing ---: ${filePath}`);
  const fmText = content.slice(3, endIdx);
  return yaml.parse(fmText) as Record<string, unknown>;
}

test.describe("Skill Discovery", () => {
  test("finds the complete published set of 165 SKILL.md files", () => {
    const paths = getAllSkillPaths();
    expect(paths).toHaveLength(165);
  });

  test("skills span the complete set of 20 domains", () => {
    const domains = fs.readdirSync(SKILLS_DIR).filter((d) =>
      fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
    );
    expect(domains).toHaveLength(20);
  });

  test("every SKILL.md has valid YAML frontmatter", () => {
    const paths = getAllSkillPaths();
    for (const p of paths) {
      expect(() => parseFrontmatter(p)).not.toThrow();
    }
  });

  test("every SKILL.md has Agent Skills v2 name field", () => {
    const paths = getAllSkillPaths();
    for (const p of paths) {
      const fm = parseFrontmatter(p);
      expect(fm.name).toBeTruthy();
      expect(typeof fm.name).toBe("string");
      expect((fm.name as string).length).toBeLessThanOrEqual(64);
      expect(fm.name).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("every SKILL.md has description <= 250 chars", () => {
    const paths = getAllSkillPaths();
    for (const p of paths) {
      const fm = parseFrontmatter(p);
      expect(fm.description).toBeTruthy();
      expect(typeof fm.description).toBe("string");
      expect((fm.description as string).length).toBeLessThanOrEqual(250);
    }
  });

  test("every SKILL.md has disable-model-invocation boolean", () => {
    const paths = getAllSkillPaths();
    for (const p of paths) {
      const fm = parseFrontmatter(p);
      expect(typeof fm["disable-model-invocation"]).toBe("boolean");
    }
  });

  test("every SKILL.md preserves existing required fields", () => {
    const paths = getAllSkillPaths();
    const requiredFields = ["skill_id", "skill_name", "domain", "evidence_strength"];
    for (const p of paths) {
      const fm = parseFrontmatter(p);
      for (const field of requiredFields) {
        expect(fm[field]).toBeTruthy();
      }
    }
  });
});

test.describe("Registry Validation", () => {
  let registry: {
    version: string;
    standard: string;
    total_skills: number;
    domains: Array<{ id: string; label: string; skill_count: number }>;
    skills: Array<{
      id: string;
      name: string;
      description: string;
      disable_model_invocation: boolean;
      path: string;
      domain: string;
      chain_edges: {
        receives_from: unknown[];
        feeds_into: unknown[];
        output_field: unknown;
        input_field: unknown;
      };
    }>;
  };

  test.beforeAll(() => {
    const content = fs.readFileSync(REGISTRY_PATH, "utf-8");
    registry = JSON.parse(content);
  });

  test("registry.json is valid JSON with correct version", () => {
    expect(registry.version).toBe("2.0");
    expect(registry.standard).toBe("agent-skills-1.0");
  });

  test("registry skill count matches the generated skill list", () => {
    expect(registry.total_skills).toBe(registry.skills.length);
  });

  test("registry domain count matches the generated domain list", () => {
    const uniqueDomains = new Set(registry.skills.map((s) => s.domain));
    expect(registry.domains.length).toBe(uniqueDomains.size);
  });

  test("all descriptions are <= 250 characters", () => {
    for (const s of registry.skills) {
      expect(s.description.length).toBeLessThanOrEqual(250);
    }
  });

  test("all paths start with skills/ and point to existing files", () => {
    for (const s of registry.skills) {
      expect(s.path).toMatch(/^skills\//);
      const fullPath = path.join(__dirname, "..", s.path);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test("disable_model_invocation is boolean for all skills", () => {
    for (const s of registry.skills) {
      expect(typeof s.disable_model_invocation).toBe("boolean");
    }
  });

  test("chain_edges fields are null placeholders in v2", () => {
    for (const s of registry.skills) {
      expect(s.chain_edges.output_field).toBeNull();
      expect(s.chain_edges.input_field).toBeNull();
    }
  });

  test("domain skill counts match actual skill entries", () => {
    const counts: Record<string, number> = {};
    for (const s of registry.skills) {
      counts[s.domain] = (counts[s.domain] || 0) + 1;
    }
    for (const d of registry.domains) {
      expect(counts[d.id]).toBe(d.skill_count);
    }
  });

  test("registry matches SKILL.md files on disk", () => {
    const diskPaths = getAllSkillPaths().map((p) =>
      path.relative(path.join(__dirname, ".."), p)
    );
    const registryPaths = registry.skills.map((s) => s.path);
    expect(registryPaths.sort()).toEqual(diskPaths.sort());
  });
});

test.describe("Bundled MCP invariants", () => {
  test("keeps all 165 skills with non-empty prompts and the declared invocation flags", () => {
    const bundled = JSON.parse(fs.readFileSync(BUNDLED_SKILLS_PATH, "utf-8")) as Array<{
      prompt?: unknown;
      metadata?: { "disable-model-invocation"?: unknown };
    }>;

    expect(bundled).toHaveLength(165);
    expect(bundled.every((skill) => typeof skill.prompt === "string" && skill.prompt.trim().length > 0)).toBe(true);
    expect(bundled.filter((skill) => skill.metadata?.["disable-model-invocation"] === true)).toHaveLength(12);
  });
});

test.describe("Plugin Manifest Validation", () => {
  let plugin: {
    name: string;
    display_name: string;
    version: string;
    skills: string[];
    license: string;
  };

  test.beforeAll(() => {
    const content = fs.readFileSync(PLUGIN_PATH, "utf-8");
    plugin = JSON.parse(content);
  });

  test("plugin.json is valid JSON", () => {
    expect(plugin.name).toBe("education-agent-skills");
    expect(plugin.version).toBe("2.1.0");
  });

  // Claude Code and Codex scan only one directory level deep, while skills are
  // nested two levels deep (skills/<domain>/<skill>/SKILL.md). The `skills`
  // field must therefore be an explicit array of every domain folder, not the
  // bare "./skills/" root (which would discover zero skills).
  test("plugin.json skills field lists every domain folder", () => {
    const domainsOnDisk = fs
      .readdirSync(SKILLS_DIR)
      .filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
      .map((d) => `./skills/${d}`)
      .sort();

    expect(Array.isArray(plugin.skills)).toBe(true);
    expect([...plugin.skills].sort()).toEqual(domainsOnDisk);

    for (const entry of plugin.skills) {
      const skillsDir = path.join(__dirname, "..", entry);
      expect(fs.existsSync(skillsDir)).toBe(true);
      expect(fs.statSync(skillsDir).isDirectory()).toBe(true);
    }
  });

  // The Codex manifest must stay in lockstep with the Claude manifest so the
  // same domain folders load on both surfaces (see CONTRIBUTING.md governance).
  test("codex plugin.json skills field matches the claude manifest", () => {
    const codex = JSON.parse(fs.readFileSync(CODEX_PLUGIN_PATH, "utf-8"));
    expect(Array.isArray(codex.skills)).toBe(true);
    expect([...codex.skills].sort()).toEqual([...plugin.skills].sort());
  });

  test("plugin.json has correct license", () => {
    expect(plugin.license).toBe("CC BY-SA 4.0");
  });
});

test.describe("Hosted MCP access control", () => {
  test.skip(
    !process.env.HOSTED_MCP_BASE_URL,
    "Set HOSTED_MCP_BASE_URL to run the production smoke test",
  );

  test("anonymous MCP requests fail fast with a token-required response", async ({ request }) => {
    const response = await request.post("/mcp", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Hosted MCP access token required");
  });
});
