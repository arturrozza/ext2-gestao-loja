---
name: pr-main
description: Opens a pull request from the current branch to main, watches its CI and merges it when every check passes. Use when the maintainer runs /pr-main or says "abre PR pra main", "se a CI passar pode mergear" after a task is finished.
---

# PR to main

Running this is the go-ahead to open the PR and to merge it if CI passes. Do not ask whether to open or merge.

## Steps

1. **Branch.** If on `main`, create a branch named after the work and switch to it: `<type>/mun-<n>-<slug>` for a
   Linear task (e.g. `feat/mun-12-products-listing`), `<type>/<slug>` without one. Never commit or push to `main` or
   `production`.
2. **Commit what is left.** Commit pending changes as Conventional Commits (`AGENTS.md`), with no AI attribution:
   no `Co-Authored-By`, no "Generated with". If the pre-commit hook fails, fix the cause and commit again; never
   `--no-verify`. Stop and report if the fix is more than mechanical.
3. **Task link.** Take the Linear id from the branch name (`mun-12` → `MUN-12`) and close it: `Closes MUN-12`, without
   asking. Only an argument changes that (`refs` for `Refs MUN-12`, `none` for no reference). No id: no reference.
4. **Open the PR.** `git push -u origin HEAD`, then `gh pr create --base main` (ready, not draft). Title: the
   Conventional Commit of the change. Body in pt-BR with `## O que muda` and `## Validação`, built from
   `git log main..HEAD` and `git diff main...HEAD`; Validação lists only checks that ran in this session. No AI
   attribution. End the body with the reference from step 3. If a PR for the branch already exists, push and reuse it.
5. **Watch CI.** `gh pr checks <number> --watch --fail-fast --interval 10` in the foreground. If it reports no checks
   yet, wait a few seconds and run it again. `Railway config` counts like any other check; when `.railway/` changed,
   read the plan it comments and stop if it deletes anything.
6. **Passed:** run `gh pr checks <number>` once more and merge only if every check reads `pass` (or `skipping`).
   Then `gh pr merge <number> --squash --delete-branch` and `git switch main && git pull --ff-only`. With `Closes`,
   move the task to `Waiting for Release` (`mcp__linear-ext2__save_issue`, `state: "Waiting for Release"`; load it
   with ToolSearch), even if Linear's automation already moved it to `Done`: it is not live until `/release-prod`
   ships it. Use only the `linear-ext2` connection (workspace `mundomadam`), never `mcp__linear__*`.
   **Failed:** do not merge. Read the log (`gh run view <run-id> --log-failed`), say in a few lines what broke, and fix
   it only if the cause is this branch's and the fix is small: commit, push, back to step 5. Otherwise stop and report.
   A failure unrelated to the diff (e.g. `expo doctor` after a new Expo patch) is fixed in its own PR, not here.
   A flaky failure gets one `gh run rerun <run-id> --failed`, never more.
   **Conflict or blocked merge:** stop and report; never rebase or force-push without the maintainer.

## Output

Brazilian Portuguese, short. Narrate only the milestones (PR aberta com o link, CI passou ou falhou, mergeado). The
final message is one or two lines: the PR link and whether it was merged (and the task moved to
`Waiting for Release`), or what broke and what is needed.
