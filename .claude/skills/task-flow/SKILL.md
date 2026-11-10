---
name: task-flow
description: Runs a task end to end in the maintainer's standard flow (grilling, phased implementation with two Sonnet reviews each, final review, checks, docs, /pr-main and merge). ONLY runs when the maintainer types /task-flow themselves; never start it on your own, not even for "bora trabalhar na MUN-x" or similar.
disable-model-invocation: true
---

# Task flow

**Manual only.** This skill runs only when the maintainer types `/task-flow` (the frontmatter blocks the model from
invoking it). Never start this flow, or any phase of it, because a task was mentioned, a Linear id came up or the
maintainer said "bora trabalhar na MUN-x". Without `/task-flow`, do only what was asked: read, answer, ask.

The argument is the task. It can be a Linear id (`MUN-16`), a GitHub issue or PR (number or URL), or free text.
Running this skill is the go-ahead for the whole flow, through `/pr-main` and its merge. Ask the maintainer only
about real product or design decisions.

## 1. Load the task

- **Linear:** use `mcp__linear-ext2__get_issue` and `list_comments` (load them with ToolSearch). Use only the
  `linear-ext2` connection, never `mcp__linear__*`. Move the task to `In Progress` and assign it to the maintainer
  if nobody has it.
- **GitHub:** `GH_TOKEN=$(gh auth token --user gugeldev) gh issue view <n> --comments` (or `gh pr view`).
- **Free text:** use it as it is.

Then read the matching module in `docs/product/` and the parts of `docs/` the task touches. Look at the code enough
to ask good questions, but don't plan yet.

## 2. Align (grilling)

Run the `grilling` skill on the task. Keep it in plain pt-BR with concrete examples ("o app diz 8, a prateleira tem
10"). The maintainer doesn't read jargon. Follow its rounds, and ask only about decisions that are really open; a
sensible default needs no question, just mention it. When a business rule is decided or changes, write it into
the `docs/product/` module and into `docs/decisions.md` in the same change.

Alignment ends when nothing is open. Don't ask "posso começar?". Start right away, unless the maintainer slowed things
down ("calma", "um por vez"). In that case wait for an explicit go ("pode implementar", "bora codar"). Agreeing to a
design is not a go.

## 3. Phases

**Branch:** if this is a git worktree (`git rev-parse --git-dir` differs from `git rev-parse --git-common-dir`) or
the current branch is not `main`, work on the current branch and create nothing. Only on `main` in the main checkout,
create `<type>/mun-<n>-<slug>` (or `<type>/<slug>` without a Linear id) from an up-to-date `main`. Split the
work into small phases that each stand on their own (e.g. schema + service, routes + e2e, app screen). Show the list
in a few lines and keep going without waiting. KISS everywhere.

For each phase:

1. **Study** the code the phase touches.
2. **Plan** briefly: files, the shape of the change, the tests.
3. **Implement**, including the phase's tests.
4. **Review, round 1.** Spawn a fresh agent: `Agent` with `subagent_type: "general-purpose"`, `model: "sonnet"`,
   `effort: "high"`, in the foreground. Prompt: run the `thermo-nuclear-code-quality-review` skill on this phase's
   uncommitted changes (`git diff HEAD` plus untracked files from `git status`), following the repo's `AGENTS.md`
   files, report the findings ranked by severity with file:line, and edit nothing. Give it the phase's goal in one or
   two lines, but not your reasoning: it starts cold on purpose.
5. **Fix** the findings that make sense. Skip the ones that add complexity for no real gain, and say why in one line.
6. **Review, round 2.** Same agent setup, fresh again, on the diff as it is now. Fix what makes sense.
7. **Commit** the phase as a Conventional Commit scoped to the module (`feat(sales): ...`). Commits carry no AI
   attribution: no `Co-Authored-By`, no "Generated with". If the pre-commit hook fails, fix the cause and commit again.
   Never use `--no-verify`.

Tell the maintainer, in one line per phase, what was done and what the reviews changed.

## 4. Final review

Once every phase is committed, spawn one more fresh agent with the same setup. This time it reviews the whole branch
(`git diff main...HEAD`) with `thermo-nuclear-code-quality-review` and looks at how the phases fit together. Fix what
makes sense and commit.

## 5. Checks

Make sure postgres is up (`bun run db:up`), then run from the root: `bun run format`, `bun run check`,
`bun run typecheck`, `bun run test`. Fix any failure that comes from this branch and commit. If a failure has nothing
to do with the branch, stop and report it.

## 6. Docs

Update `docs/` so the decisions and the current state are fully recorded: the `docs/product/` module (rules, open
questions closed), `docs/decisions.md` (what was decided and why, newest first), and `architecture.md`, `stack.md`,
`conventions.md` or `testing.md` when the change touches them. Also update the `AGENTS.md` files when a rule for agents
changed. Docs are in pt-BR, and product docs stay at business level. Commit as `docs(<scope>): ...`.

## 7. Ship

Run the `pr-main` skill.

## Output

Brazilian Portuguese, short. Narrate the milestones: alignment closed, each phase committed, final review, checks,
docs, then the PR link and the merge.
