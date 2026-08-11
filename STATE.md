# State — Education Agent Skills Library

## Last updated: 2026-08-03

## What was done this session

Prepared an educator-first GitHub entry experience on `codex/github-educator-entry`:

- Reframed the README opening around two routes: educators and school leaders, and AI/EdTech builders.
- Added `docs/EDUCATOR_QUICKSTART.md` with entry points for a lesson, unit/project, curriculum/programme, and whole-school learning-model redesign.
- Added issue forms, a pull-request template, and a project-specific community code of conduct.
- Preserved all 165 skill files, evidence metadata, registry data, and MCP bundle unchanged.

## What was verified

- `npm test`: 21 tests passed.
- All three GitHub issue-form YAML files parse successfully.
- `git diff --check` passes.
- Every skill name referenced in the educator quick start resolves to an existing skill directory.

## Current library state

- 165 skills across 20 domains
- Domain 20 is new and different from Domains 1–19: student-facing live interaction patterns, not educator-facing artefact generation
- Domain 20 introduces `evidence_captured` YAML schema extension for structured learning evidence
- `generate-registry.py` updated with "student-learning" in DOMAIN_LABELS

## Still to decide

- Licensing needs an explicit owner decision before adding or changing legal files: the educational content is described as CC BY-SA 4.0 while the software package declares ISC.
- A first formal GitHub release and custom social-preview image should follow after the licence and release boundary are confirmed.

## What's next

- Review and merge the educator-entry pull request.
- Test the educator quick-start prompts with novice teachers, experienced educators who are new to AI, curriculum leaders, and whole-school designers.
- Use those results to improve skill discovery, context gathering, and scenario-specific orchestration.
