# Contributing

Thank you for considering a contribution to the Education Agent Skills Library. The bar is intentionally high: each skill should be evidence-grounded, practically useful, and clear enough for both educators and AI agents to use safely.

## What belongs here

Good contributions usually add or improve a reusable education skill that supports one of these needs:

- curriculum design;
- assessment design and validity;
- learning science and memory;
- self-regulated learning and metacognition;
- literacy, questioning, dialogue, and critical thinking;
- wellbeing, motivation, belonging, and student agency;
- inclusive design;
- AI literacy or AI learning support;
- student-facing study interactions;
- professional learning;
- systems thinking or original practitioner frameworks that are clearly labelled.

## Inclusion criteria

A skill should:

1. solve a recurring education design or learning-support problem;
2. be useful beyond one school, course, or lesson;
3. include named evidence sources where it claims to be research-grounded;
4. label emerging, mixed, practitioner, or original-framework evidence honestly;
5. preserve educator judgement rather than pretending the skill can decide everything;
6. include clear input and output schemas;
7. include practical quality checks and common pitfalls;
8. avoid unsupported frameworks, especially learning-styles/VAK-style claims.

See [`docs/EXCLUSIONS.md`](docs/EXCLUSIONS.md) for excluded ideas and [`docs/EVIDENCE.md`](docs/EVIDENCE.md) for evidence standards.

## Skill structure

Skills live at:

```text
skills/<domain>/<skill-name>/SKILL.md
```

Do not rename or move existing skill folders unless the change is part of a deliberate repository-wide migration.

Skill `name` values must be unique across the whole library (Claude Code identifies a skill by its name, so two skills cannot share one).

When you add a **new domain folder**, add its path to the `skills` array in `.claude-plugin/plugin.json`. Claude Code only discovers skills one level below each listed folder, so every domain folder must be listed there for its skills to load.

Every `SKILL.md` must preserve:

- YAML frontmatter;
- `name` and `description` fields required by the Agent Skills standard;
- evidence-strength metadata;
- input and output schemas;
- any existing citations and limitations.

## Validation before a pull request

After adding or editing skills, run:

```bash
python3 scripts/generate-registry.py
python3 scripts/validate-registry.py
python3 scripts/validate-skills.py
cd mcp-server && npm run bundle-skills && npm run build && npm test
cd ..
npm test
```

Commit generated files when they change:

```text
registry.json
mcp-server/src/skills.json
mcp-server/dist/skills.json
```

## Pull request guidance

In your PR, briefly explain:

- what skill or documentation changed;
- why the change is educationally useful;
- what evidence or practitioner framework it relies on;
- what validation commands you ran.

Small, well-evidenced improvements are better than broad additions that dilute the library. The point is not to have the most skills; it is to have skills worth trusting.
