# Architecture — Composable by Design

The library works standalone today. Any educator with access to Claude can use any skill immediately. Everything else in this document describes where the system is going — not where it needs to be before you can use it.

---

## How the Skills Are Structured

Each skill is a single markdown file with two parts: a YAML header and a plain-English prompt.

The **YAML header** contains machine-readable metadata: skill ID, domain, evidence strength rating, evidence sources with named citations, input schema (what the educator provides), output schema (what comes back), chaining metadata (which skills compose well together), estimated educator time, and discovery tags.

The **prompt** section contains the full Claude prompt — including the expert role framing, the evidence-based criteria Claude checks its output against, the structured output format, and a self-check instruction.

This dual structure means every skill can be:

- **Read by an educator** who opens the file, copies the prompt, fills in the input fields, and gets a useful output
- **Parsed by a machine** that reads the YAML header to discover the skill's capabilities, validate inputs, route outputs to other skills, and make decisions about when to invoke it

The YAML schemas are not documentation. They are the interface definition. Any system that can read YAML can discover what this library offers, what each skill needs, and what it returns.

---

## The Three-Layer Architecture

### Layer 1 — The Skill Library (this repository)

165 skills across 20 domains. Each skill encodes a specific, evidence-grounded instructional or curriculum design decision — retrieval practice scheduling, rubric construction, scaffolded task modification, adaptive hint design, student-facing study support, and more.

An educator uses a skill by providing context through the input fields. Claude returns a structured output ready to use: a spaced practice schedule, a set of retrieval questions, a rubric with co-construction plan, a scaffolded task adapted for a specific language proficiency level.

Every skill works today. No dependencies. No setup.

### Layer 2 — Context Engine (in development)

The context engine sits between the library and the orchestrator. It holds persistent information about students, classes, curriculum sequences, prior assessment data, and learning history.

When a skill is called through the context engine, the output is personalised. Not generic advice about spacing — a specific spacing schedule for this class, based on what they studied last term, which topics showed weak retention on the last assessment, and when the next summative assessment falls. Not a generic rubric — a rubric calibrated to this developmental band, this competency framework, and this student's current performance level.

The skill input schemas already accommodate this. Every skill defines `optional` input fields — student profiles, curriculum data, assessment history, school context — that are designed for the context engine to inject. Skills produce quality output without this data. They produce tailored output with it.

The context engine is what transforms a useful general tool into a genuinely intelligent one.

### Layer 3 — Orchestrator (in development)

The orchestrator allows an educator to state a high-level goal and receive a complete, personalised plan.

**Example:** An educator says: *"Design a 6-week unit on climate change for my Year 8 class."*

The orchestrator:

1. Queries the context engine for class profile, curriculum requirements, prior learning, and upcoming assessments
2. Invokes the **Backwards Design Unit Planner** with curriculum standards and enduring understandings
3. Invokes the **Spaced Practice Scheduler** to distribute retrieval across the 6-week timeline
4. Invokes the **Interleaving Unit Planner** to restructure the topic sequence for better discrimination between related concepts
5. For each lesson, invokes the **Lesson Opening Designer** for retrieval-based starters
6. Invokes the **Language Demand Analyser** for EAL students in the class
7. Invokes the **Criterion-Referenced Rubric Generator** for the summative assessment
8. Invokes the **Ecological Inquiry Anchor Designer** to ground the unit in the local environment
9. Presents a complete draft unit for the educator to review, edit, and approve

The educator remains in the loop throughout. The orchestrator proposes; the educator decides. This is not AI replacing educators. It is AI doing the time-consuming assembly work so educators can focus on the decisions that require human judgement — what matters for these students, what to prioritise, what to cut, and what to change.

The `chains_well_with` field in every skill's YAML header provides explicit chaining hints. The orchestrator can also discover novel chains by matching output schemas to input schemas across the library.

---

## MCP Server

An MCP server exposes the full skill library as prompts plus the model-invocable subset as callable tools. Any MCP-compatible client can discover all 165 prompts and 157 tools, read their input requirements, and use strict typed inputs.

**Production URL:** `https://mcp-server-sigma-sooty.vercel.app/mcp`

The server registers all 165 skills as prompts. It registers 153 skills as tools; the 12 skills marked `disable-model-invocation: true` remain available for discovery and explicit prompt use but are not model-invoked tools. Four additional meta-tools provide discovery: `list_skills`, `find_skills`, `suggest_skills`, and `get_skill_details`, for 157 tools total.

The hosted surface is access-controlled. It requires a configured canonical public origin and strong token/OAuth secrets, accepts bearer credentials only in the `Authorization` header, requires S256 PKCE and exact approved redirects, and uses encrypted short-lived authorization and refresh credentials. New access tokens expire after 30 days; deployed legacy signed/hash/plain credentials remain compatible. A SHA-256 revocation list supports individual credential revocation without rotating the signing secret.

The server is stateless across instances. Request bodies are bounded (16 KiB for OAuth/access requests and 1 MiB for MCP), while authorization-code/refresh replay detection and access-request abuse limits are bounded in-memory controls. They reduce same-instance replay and abuse but cannot guarantee cross-instance single use without durable shared state.

Source code and setup instructions: [`mcp-server/`](../mcp-server/)

---

## Agent Skills Compliance (v2)

### Plugin Structure

The library is packaged as an Agent Skills 1.0–compliant plugin. The entry point is `plugin.json`, which declares the library metadata and points to the `skills/` directory. Each skill lives at `skills/{domain}/{skill-name}/SKILL.md`.

### Progressive Disclosure

The platform does not load all 165 skill files into context at once. Instead it uses metadata-first loading:

1. **Discovery** — `registry.json` provides a lightweight index of all skills with descriptions, tags, and domain grouping. An orchestrator or the platform itself reads this to decide which skills are relevant.
2. **Activation** — Only when a skill is selected (by the model, the user, or an orchestrator) is the full SKILL.md loaded into context.
3. **Invocation control** — Skills with `disable-model-invocation: true` are never auto-activated by the model. They must be explicitly invoked by the user or an orchestrator. This prevents broad-trigger skills (e.g. `formative-assessment-technique-selector`) and contextually specific original frameworks from misfiring.

### registry.json

The registry is the machine-readable skill index. It is generated from SKILL.md frontmatter by `scripts/generate-registry.py` and validated in CI. It enables:

- Programmatic skill discovery and filtering
- Domain-level browsing
- Chain graph traversal via `chains_with` arrays
- Description-based semantic matching for auto-activation

### Typed Chain Edges (v2 placeholder)

Each skill entry in `registry.json` includes a `chain_edges` object with four fields: `receives_from`, `feeds_into`, `output_field`, and `input_field`. All are null in v2 — these are placeholder slots for typed chain edges that will be populated in a dedicated chaining design session. The `chains_with` array (derived from the existing `chains_well_with` metadata) provides untyped chaining hints in the interim.

### Conflict Resolution

When multiple skills auto-activate based on conversation context, the platform should surface them as suggestions rather than auto-firing more than one. The user selects which skill to invoke. This prevents conflicting or redundant outputs from competing skills.

---

## Contributing Orchestration-Ready Skills

Skills added to the library should follow the schema specification in [CONTRIBUTING.md](CONTRIBUTING.md). Orchestration-ready means:

- **YAML header complete** — all fields populated, input and output schemas precisely typed
- **Input and output schemas well-defined** — field names, types, and descriptions that a machine can parse without ambiguity
- **`chains_well_with` populated** — where relevant, listing the skill IDs that compose naturally with this skill
- **`evidence_strength` honest** — `strong` for robust quantitative evidence, `moderate` for solid but limited evidence, `emerging` for practitioner frameworks and qualitative traditions

The schema is the contract between the skill and any system that calls it. Precision here is not bureaucracy — it is what makes composability work.
