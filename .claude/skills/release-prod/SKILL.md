---
name: release-prod
description: Ships main to production. Opens the release PR main → production, checks what must happen before the deploy, watches CI, merges it with a merge commit when every check passes and confirms the server is healthy. Use when the maintainer runs /release-prod or asks to release, ship or "subir pra prod".
---

# Release to production

`main` collects merged PRs; nothing deploys until a PR `main → production` merges. The merge deploys the server on
Railway (after CI passes on `production`) and applies `.railway/railway.ts` (`Railway config` workflow). Running this
skill is the go-ahead to open and merge; ask only where a step says so.

## Steps

1. **What is going out.** `git fetch origin`, then `git log --oneline origin/production..origin/main`. Nothing ahead:
   say so and stop. Note the Linear tasks they close: `Closes MUN-N` in each PR body (`gh pr view <n> --json body`);
   the branch name alone is not enough, since a `Refs` PR carries it too.
2. **Pre-release checks.** Read `git diff origin/production...origin/main` for what must happen before the deploy:
   a new env var (it must be in the server's `env.ts`, in `.env.example` and in the service `env` of
   `.railway/railway.ts`), a new migration, a change in `.railway/`. List them and ask the maintainer to confirm
   (AskUserQuestion) before merging. None: no question.
3. **Release PR.** `gh pr create --base production --head main`, ready. Reuse one already open. Title
   `chore(release): <what ships>`. Body in pt-BR: `## O que sobe` (the PRs by number) and `## Validação` (each PR's
   CI and the pre-release checks confirmed). No AI attribution. No `MUN-N` and no `Closes` in the title or body, or
   Linear links the release PR to the tasks and its automation moves them.
4. **Watch CI.** `gh pr checks <number> --watch --fail-fast --interval 10` in the foreground. When `.railway/` changed,
   read the `Railway config` plan comment (`gh pr view <number> --comments`) and stop if it deletes anything.
5. **Passed:** run `gh pr checks <number>` once more and merge only if every check reads `pass` (or `skipping`). Then
   `gh pr merge <number> --merge` (merge commit, never squash; never delete `main`) and
   `git switch main && git pull --ff-only`.
   **Failed:** do not merge. Report what broke (`gh run view <run-id> --log-failed`). The fix goes through a PR to
   `main` (`/pr-main`), never a commit on `production`; ask before starting one.
6. **Follow the deploy.** Watch the CI run on `production` (`gh run list --branch production --limit 3`, then
   `gh run watch <run-id> --exit-status`) and, when `.railway/` changed, the `Railway config` apply run. Then poll
   `curl -fsS https://ext2-production.up.railway.app/health` for up to ~3 minutes until it answers. Do not rerun a
   failed deploy on your own.
7. **Close the tasks.** When the deploy is healthy, move each task noted in step 1 to `Done`
   (`mcp__linear-ext2__save_issue`, `state: "Done"`; load it with ToolSearch). Also list the team's tasks in
   `Waiting for Release` and report any this release did not carry, without moving them. If the deploy failed, leave
   them in `Waiting for Release`. Use only the `linear-ext2` connection (workspace `mundomadam`).

## Output

Brazilian Portuguese, short. Narrate only the milestones (PR aberta com o link, CI, mergeado, deploy). The final
message is a few lines: the release PR link, whether the server is healthy and anything that still needs the
maintainer, plus the tasks moved to `Done`.
