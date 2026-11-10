---
name: start-mundomadam
description: Lists the open Linear tasks of the Mundomadam team as a table ordered from easiest to hardest, with each one's current status. Use when the maintainer runs /start-mundomadam or asks which tasks are open or what to pick up next.
---

# Start Mundomadam

Show the maintainer the open work in Linear, easiest first, so they can pick the next task.

## Steps

1. Load the Linear tools with ToolSearch (`select:mcp__linear-ext2__list_issues,mcp__linear-ext2__save_issue`). The
   project's Linear connection is `linear-ext2` (workspace `mundomadam`); never use `mcp__linear__*`, which is another
   workspace.
2. List the team's issues: `mcp__linear-ext2__list_issues` with `team: "MUN"`, `limit: 250`. Follow `cursor` while
   `hasNextPage` is true.
3. Keep only the ones still available to pick up: drop `statusType` `completed`, `canceled` and `duplicate`, and drop
   by status name `In Progress` (already being worked on) and `Waiting for Release` (merged into `main`, nothing left
   to pick up). Filter these two by status name, not `statusType`: both are `started`.
4. Rate each task's difficulty from what Linear says, reading its description. Do not open the code; this is a quick
   look, not a plan. Weigh, roughly in this order:
   - A business rule still undecided: the decision (written into the `docs/product/` module) comes before any code.
   - How many apps it touches (server, mobile): each one adds work, and the server adds unit, integration and e2e
     tests (`docs/testing.md`).
   - Whether it touches money, stock or store scoping (`docs/conventions.md`, Dados).
   - The Linear `estimate`, when set, overrides the guess.
   - A clear, narrow description is easier than a vague one.
   Give each task one level: `Fácil`, `Média` or `Difícil`.
5. Order by difficulty (easiest first); ties go by Linear priority (Urgent, High, Medium, Low, then none).

## Output

Brazilian Portuguese, short. One table, then at most three lines of suggestion.

| Tarefa | Dificuldade | Status | Prioridade | Por quê |
|---|---|---|---|---|
| **MUN-11** Título | Fácil | Backlog | Sem prioridade | Escopo claro, sem decisão pendente |

After the table, suggest which task to pick up and why in one or two lines. If any task is in `Waiting for Release`,
add one line naming them (they ship with `/release-prod`). If any task is `In Progress`, add one line naming them too,
without rating them. If nothing is open, say so. Do not start any task until the
maintainer chooses; once they do, move it to `In Progress` and assign it to them if unassigned
(`mcp__linear-ext2__save_issue`), and create the branch `<type>/mun-<n>-<slug>`.
