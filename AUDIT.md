# Codex Compatibility Audit

> [!WARNING]
> Historical snapshot from 2026-05-10. Counts, manifests, tests, and compatibility conclusions below describe the repository at that date and are not maintained as current project documentation. Use `README.md`, `registry.json`, and the live validation suite for the current state.

**Date:** 2026-05-10  
**Scope:** Read-only audit of current repo structure vs. OpenAI Codex / agentskills.io requirements.  
**No files were modified.**

---

## 1. Current Structure

### Top-level files and directories

```
education-agent-skills/
├── .claude-plugin/          # Claude Code plugin manifest
│   ├── marketplace.json
│   └── plugin.json
├── .github/                 # GitHub Actions CI
│   └── workflows/
│       └── validate.yml
├── .gitignore
├── CLAUDE.md                # Claude Code session entry point
├── README.md
├── education-agent-skills-skills-only.zip   # pre-built archive (untracked)
├── education-agent-skills.zip               # pre-built archive (untracked)
├── docs/                    # supporting documentation
│   ├── AGENT_SKILLS_V2_SPEC.md
│   ├── AGENT_SKILLS.md
│   ├── ARCHITECTURE.md
│   ├── EVIDENCE.md
│   ├── EXCLUSIONS.md
│   ├── IMPLEMENTATIONS.md
│   ├── PRIVACY.md
│   ├── REVIEW.md
│   ├── brief.md
│   └── migration-log.md
├── llms.txt                 # LLM-facing library overview
├── mcp-server/              # MCP server (TypeScript, deployed on Vercel)
├── node_modules/            # Playwright test runner deps (root-level)
├── package-lock.json
├── package.json
├── playwright.config.ts
├── registry.json            # machine-readable skill index (generated)
├── schemas/                 # (empty dir)
├── scripts/                 # Python build + validation scripts
│   ├── generate-registry.py
│   ├── validate-registry.py
│   └── validate-skills.py
├── skills/                  # all 131 SKILL.md files
├── test-results/
└── tests/
    └── skills-library.spec.ts
```

### Exact file path pattern for skills

Three representative examples from different domains:

```
skills/ai-learning-science/formative-assessment-loop-designer/SKILL.md
skills/historical-thinking/sourcing-skill-builder/SKILL.md
skills/montessori-alternative-approaches/prepared-environment-designer/SKILL.md
```

Pattern: `skills/<domain>/<skill-slug>/SKILL.md`  
Each skill lives in its own directory. Each directory contains only `SKILL.md` (no other files).

### Total skill file count

```
131 SKILL.md files
```

Verified: `find skills/ -name "SKILL.md" | wc -l` → `131`

Skills per domain:

| Domain | Count |
|---|---|
| ai-learning-science | 14 |
| ai-literacy | 7 |
| curriculum-alignment | 4 |
| curriculum-assessment | 13 |
| eal-language-development | 5 |
| environmental-experiential-learning | 6 |
| explicit-instruction | 5 |
| global-cross-cultural-pedagogies | 9 |
| historical-thinking | 10 |
| literacy-critical-thinking | 7 |
| memory-learning-science | 8 |
| montessori-alternative-approaches | 4 |
| original-frameworks | 8 |
| professional-learning | 10 |
| questioning-discussion | 4 |
| self-regulated-learning | 5 |
| wellbeing-motivation-agency | 12 |
| **Total** | **131** |

### Non-skill files mixed in with skill directories

`.DS_Store` files are present in four locations inside `skills/`:

```
skills/.DS_Store
skills/original-frameworks/.DS_Store
skills/curriculum-alignment/.DS_Store
skills/curriculum-assessment/.DS_Store
```

These are macOS metadata files. They are not tracked by git (confirmed: `git ls-files skills/ --others` would show them) but sit on disk. No other non-SKILL.md files exist within skill folders.

---

## 2. Current YAML Frontmatter

### Fields present (10 skills sampled across different domains)

All 10 skills examined had identical field structure. The frontmatter is consistent across the library. Fields appear in two blocks, separated by comments:

**Block 1 — Agent Skills v2 standard fields (added during v2 migration):**
- `name` — lowercase slug, matches parent directory name exactly
- `description` — ≤250 characters, action-first trigger description
- `disable-model-invocation` — boolean
- `user-invocable` — boolean (always `true` in all skills examined)
- `effort` — string (always `"medium"` in all skills examined)

**Block 2 — Existing library fields (original schema):**
- `skill_id` — `"domain/slug"` format
- `skill_name` — human-readable display name
- `domain` — domain slug
- `version` — semver string (always `"1.0"`)
- `evidence_strength` — `"strong"`, `"moderate"`, `"emerging"`, or `"original"`
- `evidence_sources` — array of citation strings
- `input_schema` — object with `required` and `optional` arrays, each containing `{field, type, description}`
- `output_schema` — object with `type` and `fields` array
- `chains_well_with` — array (present in most, may be absent or empty in some)

**Optional fields present in some skills (not universal):**
- `contributor` — string (e.g. `"Sean Hu"`, `"Gareth Manning"`)
- `tags` — array
- `teacher_time` — string

### Variations and anomalies

Two skills have non-standard `evidence_strength` values not matching the defined enum (`"strong" | "moderate" | "emerging" | "original" | "practitioner"`):

- `ai-literacy/prompt-literacy-sequence-designer`: `evidence_strength: "low-moderate"`
- `professional-learning/panel-review`: `evidence_strength: medium` (unquoted, parses as string)

Twelve skills have `disable-model-invocation: true`:
```
ai-learning-science/cognitive-tutoring-architecture-designer
ai-learning-science/individual-spacing-algorithm-explainer
curriculum-assessment/formative-assessment-technique-selector
original-frameworks/coherent-rubric-logic-builder
original-frameworks/developmental-band-system-designer
original-frameworks/developmental-progression-synthesis
original-frameworks/dispositional-knowledge-assessment-designer
original-frameworks/learning-target-authoring-guide
original-frameworks/seeds-regenerative-inquiry-cycle
original-frameworks/self-determined-project-design-protocol
original-frameworks/single-point-rubric-designer
professional-learning/panel-review
```

### One complete representative frontmatter block

From `skills/memory-learning-science/spaced-practice-scheduler/SKILL.md`:

```yaml
---
# AGENT SKILLS STANDARD FIELDS (v2)
name: spaced-practice-scheduler
description: "Design a spaced retrieval schedule for any topic list and timeline. Use when planning units, term sequences, or revision programmes."
disable-model-invocation: false
user-invocable: true
effort: medium

# EXISTING FIELDS

skill_id: "memory-learning-science/spaced-practice-scheduler"
skill_name: "Spaced Practice Schedule Builder"
domain: "memory-learning-science"
version: "1.0"
evidence_strength: "strong"
evidence_sources:
  - "Ebbinghaus (1885/1913) — The forgetting curve: exponential decay of memory without review"
  - "Cepeda et al. (2006) — Meta-analysis of 254 studies on distributed practice: optimal spacing depends on retention interval"
  - "Kornell & Bjork (2008) — Spacing and interleaving effects on learning"
  - "Carpenter et al. (2012) — Using spacing to enhance diverse forms of learning"
  - "Dunlosky et al. (2013) — Distributed practice rated high-utility learning strategy"
input_schema:
  required:
    - field: "topics"
      type: "array"
      description: "List of topics or concepts to be spaced across the schedule"
    - field: "timeline"
      type: "string"
      description: "Available teaching period (e.g. '6-week half-term' or 'Term 2: Jan 15 – Mar 28')"
    - field: "lessons_per_week"
      type: "integer"
      description: "Number of lessons per week for this subject"
  optional:
    - field: "assessment_date"
      ...
output_schema:
  type: "object"
  fields:
    - field: "schedule"
      type: "array"
      description: "Week-by-week schedule showing new teaching and spaced review slots"
    ...
---
```

### Do skills have `name` and `description` fields?

**Yes.** Both fields are present in all 131 skills. They were added during the v2 migration (documented in `docs/AGENT_SKILLS_V2_SPEC.md`). These are the two fields the Agent Skills open standard requires.

---

## 3. Codex Compatibility Gap Analysis

### What the standards require

**agentskills.io specification (the open standard):**

Required frontmatter: only `name` (≤64 chars, lowercase/hyphens/numbers, must match parent directory name) and `description` (≤1024 chars). All other fields are optional or go in `metadata:` mapping.

Expected directory layout for a plugin:
```
plugin-root/
├── .codex-plugin/
│   └── plugin.json        ← required for Codex plugin packaging
└── skills/
    └── <skill-name>/      ← skill folder sits DIRECTLY under skills/
        └── SKILL.md
```

`plugin.json` minimal required fields: `name` (kebab-case), `version` (semver), `description`, `skills` (relative path to skills directory).

**OpenAI Codex plugin docs** (developers.openai.com/codex/plugins/build):

The Codex docs use `.codex-plugin/plugin.json` as the plugin manifest location, and confirm they also read `$REPO_ROOT/.claude-plugin/marketplace.json` for Claude-style compat. Skills directory is scanned for immediate subdirectories where each contains a `SKILL.md`.

### Structural changes needed

#### Problem 1: Domain subdirectory (BLOCKING)

**Current:** `skills/<domain>/<skill-name>/SKILL.md` — two levels deep  
**Required:** `skills/<skill-name>/SKILL.md` — one level deep

The plugin.json points to a `skills/` directory. Both the agentskills.io spec and Codex docs show the skills scanner treating each immediate subdirectory of the skills root as a skill folder. In the current structure, those immediate subdirectories are domain folders (`ai-learning-science/`, `curriculum-assessment/`, etc.) — none of which contain a `SKILL.md`. Codex would find no skills.

Whether Codex recurses into nested subdirectories is not documented. The spec's explicit structure and the `name`-must-match-parent-directory constraint both assume a flat layout. **This is the primary structural incompatibility.**

There are three options to resolve it, with different trade-offs:

- **Option A (flatten):** Move all 131 skills to `skills/<skill-name>/SKILL.md`. Loses domain grouping in the filesystem. Requires updating MCP server, registry generator, CI, tests, README, and all path references.
- **Option B (parallel flat directory):** Create `.agents/skills/<skill-name>/SKILL.md` as symlinks or copies. Preserves existing structure. Adds maintenance burden (two copies of every skill file).
- **Option C (build step):** Add a script that generates a Codex-compatible flat directory from the current domain structure. Codex-facing copy is generated artefact; source of truth stays at `skills/<domain>/`.

#### Problem 2: No `.codex-plugin/plugin.json`

The current plugin manifest is at `.claude-plugin/plugin.json`. Codex looks for `.codex-plugin/plugin.json`. 

The existing `.claude-plugin/plugin.json` content:

```json
{
  "name": "education-agent-skills",
  "display_name": "Claude Education Skills Library",
  "version": "2.1.0",
  "description": "124 evidence-based pedagogical skills...",
  "author": { "name": "Gareth Manning", "url": "https://github.com/GarethManning" },
  "homepage": "https://github.com/GarethManning/education-agent-skills",
  "license": "CC BY-SA 4.0"
}
```

This file is **missing the `skills` field** — the path pointing to the skills directory. It also lacks `version` in semver format as strictly required. Codex will read this file for Claude compat but cannot discover skills from it without the `skills` field.

A Codex-compatible `.codex-plugin/plugin.json` would need at minimum:

```json
{
  "name": "education-agent-skills",
  "version": "2.1.0",
  "description": "...",
  "skills": "./skills/"
}
```

#### Problem 3: Duplicate skill slug

One slug exists in two domains:

```
skills/curriculum-assessment/critical-thinking-task-designer/SKILL.md  →  name: critical-thinking-task-designer
skills/literacy-critical-thinking/critical-thinking-task-designer/SKILL.md  →  name: critical-thinking-task-designer
```

In the current domain-namespaced structure this is handled by the MCP server's `buildToolName()` function (it detects duplicate slugs and qualifies them with the domain). In a flat Codex skills directory, both would have `name: critical-thinking-task-designer` and one would overwrite the other or cause a load error. **This collision must be resolved before any flattening.**

### Frontmatter changes needed

**None required.** The two fields mandated by the Agent Skills open standard — `name` and `description` — are already present in all 131 skills.

The existing extra fields (`skill_id`, `domain`, `evidence_strength`, `input_schema`, etc.) are non-standard but harmless. The agentskills.io spec treats unknown frontmatter fields as ignored; structured metadata can live under the optional `metadata:` mapping if strict compliance is needed but this is not a blocker.

The current `description` limit is 250 chars. The agentskills.io standard allows up to 1024 chars — no truncation issue.

`disable-model-invocation` is a Claude Code/agent-skills extension. It has no Codex equivalent; Codex uses `agents/openai.yaml` per skill for invocation policy. These are separate mechanisms — not a blocker.

### New files needed

**For minimum viable Codex loadability:**

1. `.codex-plugin/plugin.json` with `name`, `version`, `description`, `skills` fields

**For recommended plugin distribution:**

1. `.codex-plugin/plugin.json` (as above, with full `interface` block for marketplace listing)
2. Resolution of the domain subdirectory problem (one of the three options above)
3. Resolution of the `critical-thinking-task-designer` slug collision

**Optional Codex-specific additions (not required):**
- `AGENTS.md` at repo root — Codex looks for this for repo-level instructions
- `agents/openai.yaml` per skill — for per-skill invocation policy (Codex equivalent of `disable-model-invocation`)

### Minimum change to make skills loadable in Codex

1. Create `.codex-plugin/plugin.json` with `"skills": "./skills/"` — **1 new file**
2. Resolve the domain subdirectory issue — likely requires either:
   - Adding a build step that generates a flat `.agents/skills/` directory (adds 1 script + 131 generated files), OR
   - Testing whether Codex recurses (undocumented; may work without changes)
3. Rename one of the two `critical-thinking-task-designer` slugs — **2 SKILL.md edits + registry/bundle rebuild**

### Recommended change for proper plugin distribution

All of the above, plus:
- Full `.codex-plugin/plugin.json` with `interface` block (display name, category, description, logo)
- Resolve domain nesting definitively (Option A or C is cleaner than Option B long-term)
- Update `name` field in the renamed critical-thinking skill
- Update `.claude-plugin/plugin.json` to add the missing `skills` field (fixes Claude plugin discovery too)

---

## 4. Risk Assessment

### What existing functionality could break

#### MCP server (HIGH RISK if skills are moved)

The MCP server (`mcp-server/`) is deployed on Vercel at `mcp-server-sigma-sooty.vercel.app/mcp`. It is part of **this repo**. It serves a pre-built snapshot bundled at `mcp-server/src/skills.json`.

`skill-loader.ts` at line 55–56:
```typescript
const skillsDir = join(resolvedRoot, "skills");
// v2 structure: skills/{domain}/{skill-name}/SKILL.md
```

If the domain subdirectory layer is removed (Option A), skill-loader.ts must be updated. If a parallel directory is used (Option B/C), skill-loader.ts is unaffected.

The `bundle-skills` script also reads from `skills/`. Any structural change requires:
1. Updating `mcp-server/src/skill-loader.ts`
2. Rebuilding `mcp-server/src/skills.json`
3. Redeploying to Vercel

#### CI validation (MEDIUM RISK)

`.github/workflows/validate.yml` hardcodes:
```bash
[ "$COUNT" -eq 131 ] || (echo "Expected 131 skills, found $COUNT" && exit 1)
```

Any restructuring that changes skill count or moves SKILL.md files out of the `skills/` tree will break CI until the count is updated.

The `validate-skills.py` script scans `skills/**/SKILL.md` — would not find files at `.agents/skills/`.

The `generate-registry.py` script uses `git ls-files -- skills` — would not pick up untracked files at a new path.

#### Playwright test suite (MEDIUM RISK)

`tests/skills-library.spec.ts` has hardcoded expected counts that are already stale:

```typescript
test("finds exactly 107 SKILL.md files", () => {
  expect(paths.length).toBe(108);  // ← expects 108, repo has 131
});
test("skills span exactly 14 domains", () => {
  expect(domains.length).toBe(14); // ← expects 14, repo has 17
});
test("registry contains 107 skills", () => {
  expect(registry.total_skills).toBe(108); // ← wrong for current state
});
test("plugin.json is valid JSON", () => {
  expect(plugin.version).toBe("2.0.0"); // ← .claude-plugin/plugin.json has "2.1.0"
});
```

The test also references `plugin.skills` (line 205):
```typescript
const skillsDir = path.join(__dirname, "..", plugin.skills);
```

But the current `.claude-plugin/plugin.json` has no `skills` field, so `plugin.skills` is `undefined`. This test suite currently fails on multiple assertions even without any Codex work. **The test suite is not a reliable gate in its current state.**

#### registry.json

Generated by `scripts/generate-registry.py` using `git ls-files -- skills`. If skills move to `.agents/skills/`, the generator must be updated to scan the new path, or the registry will become empty on next regeneration.

#### README.md

References skill paths directly:
- Line 153: `"Example:** Open `skills/memory-learning-science/spaced-practice-scheduler/SKILL.md`"`
- Line 323: `"git add skills/<domain>/<skill-name>/SKILL.md registry.json mcp-server/src/skills.json"`
- Multiple domain table links point to `skills/domain/` paths on GitHub

#### llms.txt

References old pre-v2 paths (domain root without `skills/` prefix, e.g. `memory-learning-science/` not `skills/memory-learning-science/`). This file is already stale relative to current structure.

### Files that reference current skill paths

| File | Type of reference | Impact if paths change |
|---|---|---|
| `mcp-server/src/skill-loader.ts` | Code — scans `skills/{domain}/{slug}/SKILL.md` | **High** — server breaks |
| `mcp-server/src/skills.json` | Generated bundle snapshot | **High** — must be rebuilt |
| `scripts/generate-registry.py` | Code — `git ls-files -- skills` | **High** — registry empties |
| `scripts/validate-skills.py` | Code — `glob("skills/**/SKILL.md")` | Medium — validation skips new path |
| `scripts/validate-registry.py` | Code — validates paths start with `skills/` | Medium — false failures |
| `tests/skills-library.spec.ts` | Code — `SKILLS_DIR = "../skills"` | Medium — tests fail |
| `.github/workflows/validate.yml` | CI — `find skills/ -name "SKILL.md"` | Medium — count check fails |
| `README.md` | Documentation — multiple path examples | Low — cosmetic |
| `llms.txt` | Documentation — stale paths (already stale) | Low |
| `registry.json` | Generated artefact — paths in `path` field | Regenerated, not manually edited |

### Does the MCP server live in this repo or elsewhere?

The MCP server lives **inside this repo** at `mcp-server/`. It is deployed separately to Vercel but its source is part of this repository. The Vercel deployment reads `mcp-server/src/skills.json` (a pre-built snapshot), not the live `skills/` directory. Any skill content changes require `cd mcp-server && npm run bundle-skills` to take effect on the deployed server.

---

## 5. Effort Estimate

### Minimum viable Codex compatibility (skills loadable by Codex)

**Files to create or edit:**

| Action | File | Notes |
|---|---|---|
| Create | `.codex-plugin/plugin.json` | 1 new file, ~10 lines |
| Edit | `skills/curriculum-assessment/critical-thinking-task-designer/SKILL.md` | Rename slug to resolve collision |
| Edit | `skills/literacy-critical-thinking/critical-thinking-task-designer/SKILL.md` | Rename slug or change `name` field |
| Rebuild | `registry.json` | Run `python3 scripts/generate-registry.py` |
| Rebuild | `mcp-server/src/skills.json` | Run `cd mcp-server && npm run bundle-skills` |
| Edit | `.github/workflows/validate.yml` | Update skill count (optional but CI will fail) |

**Total files touched: 3 new/edited skill/manifest files + 2 generated artefacts.**

**Unresolved blocker:** Whether Codex recurses into domain subdirectories when scanning `./skills/`. If it does not recurse, skills will not load regardless of the plugin.json. This must be tested empirically before claiming minimum viable status.

### Full plugin packaging (proper distribution on Codex marketplace)

**Additional files beyond minimum viable:**

| Action | File | Notes |
|---|---|---|
| Decide + implement | Domain subdirectory resolution | Options A/B/C — see Section 3. Option A (flatten) touches 131 SKILL.md paths. Option C (build step) adds 1 script. |
| Update | `mcp-server/src/skill-loader.ts` | Only needed for Option A (flatten) |
| Update | `scripts/generate-registry.py` | Only needed if skills move to new root |
| Update | `scripts/validate-skills.py` | Path scan update |
| Update | `scripts/validate-registry.py` | Path validation update |
| Update | `.github/workflows/validate.yml` | Skill count and path |
| Update | `tests/skills-library.spec.ts` | Fix stale counts + add Codex manifest test |
| Update | `.claude-plugin/plugin.json` | Add missing `skills` field |
| Update | `README.md` | Update path examples |
| Rebuild | `mcp-server/src/skills.json` | Bundle rebuild |
| Redeploy | Vercel | After bundle rebuild |

**Total files touched if Option A (flatten):** ~145 files (131 SKILL.md moves + 14 directory deletes + ~10 supporting files)  
**Total files touched if Option C (build step):** ~15 files (1 new script + ~14 supporting files, no skill content edits)

### Human review required vs. safely automated

**Requires human review:**
- Choosing between Options A, B, and C for domain subdirectory resolution — architectural decision with UX consequences for repo users
- Renaming the `critical-thinking-task-designer` slug collision — need to decide which domain's version gets the name
- Deciding whether to rename/merge or just add a `name` alias for the collision

**Can be safely automated (given human approval of the above):**
- Creating `.codex-plugin/plugin.json` — pure JSON file generation
- Adding `skills` field to `.claude-plugin/plugin.json` — trivial edit
- Updating CI skill count in `validate.yml` — trivial sed
- Running registry and bundle rebuild scripts — already documented in CLAUDE.md workflow
- If Option C: writing the flattening build script — straightforward file copy/symlink generation

---

*Audit complete. 0 files modified.*
