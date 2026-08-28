# Social posts: hosted MCP transition

Use these only after the self-hosted access page and repaired hosted MCP candidate are promoted and verified on the production domain.

## LinkedIn

I built the Education Agent Skills Library as a free, open-source set of 165 evidence-based teaching and curriculum design skills for AI tools.

It works with Claude, Codex, and any tool that can read Agent Skills-style `SKILL.md` files. The goal has always been simple: make high-quality, research-grounded education design more accessible.

One thing I underestimated: public MCP endpoints are real infrastructure.

The hosted MCP server I put up as a convenience has started generating meaningful Vercel costs, mostly from anonymous long-lived connections. The library itself is still free. The GitHub repo is still open. Local use still costs nothing. But the hosted MCP endpoint can’t remain an unlimited anonymous public service forever.

So I’m making a small change in how I talk about and support it:

- If you can install the skills locally from GitHub, please do that.
- Codex users can use the local plugin or copy skills into `~/.codex/skills/`.
- Claude Code users can install the plugin from GitHub.
- Anyone can still copy a `SKILL.md` file and paste it into Claude, ChatGPT, Codex, or another assistant.
- If your workflow specifically needs hosted MCP, the self-hosted access page issues an individual expiring credential and applies abuse limits.

This is not a paywall on the knowledge. It is a practical boundary around the hosted infrastructure.

Repo: https://github.com/GarethManning/education-agent-skills
Hosted MCP access request: https://mcp-server-sigma-sooty.vercel.app/request-access

If you were using the hosted MCP endpoint and the local options do not work for you, tell me. I’d rather understand real use cases before making a permanent decision.

## X / Twitter thread

1/ I need to make a small sustainability change to the Education Agent Skills Library.

The library is still free + open source: 165 evidence-based education skills for Claude, Codex, and other AI tools.

Repo: https://github.com/GarethManning/education-agent-skills

2/ The issue is the hosted MCP endpoint.

I put it online as a convenience, but anonymous long-lived MCP connections are now creating real Vercel costs.

The skills are free. The hosting is not.

3/ So the recommended path is now local use wherever possible:

- Claude Code: install the plugin from GitHub
- Codex: use the local plugin or copy skills into `~/.codex/skills/`
- Any AI: copy a `SKILL.md` prompt manually

No hosted server required.

4/ If your workflow specifically depends on hosted MCP, the self-hosted access page issues an individual expiring credential with abuse limits.

Hosted MCP request: https://mcp-server-sigma-sooty.vercel.app/request-access

5/ I’m trying to avoid the usual bad open-source pattern:

free public endpoint → surprise bill → sudden shutdown.

Instead: keep the library open, make free local options clear, and put sensible boundaries around hosted infrastructure.

## Single X / Twitter post

Small update: Education Agent Skills stays free + open source, but the hosted MCP endpoint has real infrastructure costs.

Please use local install where possible.

Hosted MCP request: https://mcp-server-sigma-sooty.vercel.app/request-access

Repo: https://github.com/GarethManning/education-agent-skills

## Substack / long-form draft

# Keeping the Education Agent Skills Library free while making hosted MCP sustainable

When I published the Education Agent Skills Library, I wanted it to be useful in as many AI environments as possible.

The library now contains 165 evidence-based education skills: curriculum design, assessment, learning science, wellbeing, historical thinking, AI literacy, professional learning, and more. Each skill is a structured `SKILL.md` file grounded in named research and designed to be usable by AI agents.

The important part: the library is free and open source.

That is not changing.

What is changing is the hosted MCP endpoint.

## The problem

I put up a hosted MCP server so people could connect tools like Claude directly to the skills library without installing anything locally.

That was useful, but it also created a cost problem. Anonymous MCP traffic can open long-lived connections. On Vercel, those connections cost money even when they are just sitting open until a timeout.

The result is that a free convenience endpoint started becoming a real infrastructure bill.

This is one of those boring but important realities of open AI infrastructure: prompts and skill files are cheap to share; hosted remote services are not always cheap to run.

## What is staying free

The skills library itself remains free and open.

You can still use it without the hosted MCP server:

- Install the plugin from GitHub in Claude Code.
- Use the local Codex plugin.
- Copy individual skills into `~/.codex/skills/`.
- Open any `SKILL.md` file and paste it into Claude, ChatGPT, Codex, Gemini, or another assistant.
- Clone the repository and run local workflows yourself.

For most users, local install is the best option. It is faster, more private, and does not create hosting costs for the project.

## What hosted MCP is for

Hosted MCP is still useful for some workflows:

- remote clients that cannot install local files;
- programmatic skill discovery;
- experiments that need a shared endpoint;
- users who need a connector rather than a local plugin.

But hosted MCP needs some kind of access control, rate limit, or supporter model. Otherwise the project becomes dependent on one person silently absorbing infrastructure costs.

That is not sustainable.

## What I am doing next

I am documenting the free local options clearly and using a self-hosted page to issue individual hosted MCP credentials.

The access page is intentionally short. I do not need your phone number, income, school address, or student data. It requires an email address so the credential can be delivered; name and tool are optional. The optional use-case text is discarded rather than added to a database.

If the local options work for you, please use them.

If hosted MCP is essential to your workflow, request access here:

https://mcp-server-sigma-sooty.vercel.app/request-access

## The principle

I do not want to close the library. I also do not want to pretend public infrastructure is free.

The sustainable version is:

- the knowledge remains open;
- local use remains free;
- hosted convenience access has sensible boundaries;
- people who genuinely need hosted MCP have a way to ask.

That seems like the right balance.

Repo: https://github.com/GarethManning/education-agent-skills
