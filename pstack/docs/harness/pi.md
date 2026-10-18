# pstack in pi

pstack skills use Cursor names. In [pi](https://pi.dev), read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. pi names each skill's folder when it loads the skill. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

pstack needs the [`pi-subagents`](https://github.com/nicobailon/pi-subagents) package for subagents. A pstack skill that tells you to spawn a subagent counts as an instruction that authorizes delegation.

At the start of a session, read `<agent-dir>/pstack-models.md` if it exists. `<agent-dir>` is `$PI_CODING_AGENT_DIR`, or `~/.pi/agent` when that is unset. Treat its role lines as the always-applied model rule that skills name.

## Tools

| Cursor | pi |
| --- | --- |
| `Task` | The `subagent` tool. If the session only offers `subagents_enable`, call it first. If neither tool exists, do the work yourself one task at a time, say so, and tell the user to run `pi install npm:pi-subagents`. |
| `AskQuestion` | A question tool, if the session has one. Otherwise ask in plain text, number the options, say the user can answer in their own words, and end your turn. |
| Open a todolist | A todo tool, if the session has one. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | `read` `<pstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| `Grep`, `Glob` | `grep` and `find` when the session has them. Otherwise `bash` with `rg`. |

## Subagent fields

One `Task` call is one `subagent` call. For a fan-out, make every `subagent` call in one reply. Each call runs in the background, so they run at the same time.

| Cursor | pi |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "pstack.general"` |
| `poteto-agent`, `comment-sicko` | `agent: "pstack.poteto-agent"`, `agent: "pstack.comment-sicko"` |
| `readonly: true` | `agent: "pstack.readonly"`. It has no `edit` or `write` tool. It keeps `bash`, so the brief also says "do not edit files", and you check `git status` afterward. |
| `readonly: false` | `agent: "pstack.general"`, or the named agent. |
| `environment: "cloud"` | `worktree: true`. The child works in a managed git worktree. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Add `options: { baseRef: "refs/heads/<b>" }` to the `worktree: true` call. |
| `run_in_background: true` | `async: true`. Wait for results with `bg_wait`, or read one with `subagent({ action: "status", id })`. |
| `resume` | Spawn a new agent and paste the earlier result into its `task`. |
| `file_attachments` | List the paths in the `task`. |

## Models

pi runs models from many providers, so a mixed panel such as Opus and Grok stays mixed. `pi --list-models` lists the models this user can run, by provider and id.

| Cursor | pi |
| --- | --- |
| `<id>-<effort>[-fast]` from any family (`claude-*`, `grok-*`, `gpt-*`), such as `claude-opus-5-5-xhigh` or `grok-4.7-xhigh-fast` | `model: "<provider>/<id>:<effort>"`, such as `anthropic/claude-opus-5-5:xhigh` or `xai/grok-4.7:xhigh`. `<provider>` is the provider that `pi --list-models <id>` lists for `<id>`. Drop `-fast`. `<effort>` is one of `max`, `xhigh`, `high`, `medium`, `low`. |
| A slug whose `<id>` pi does not list | Use the same family's listed id. If that family has none, omit `model` so the agent runs on the session model, and say so. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `<agent-dir>/pstack-models.md`. pi does not load it on its own, so read it at the start of the session. If the file or the role's line is missing, use the skill's default slug. |
| A role value `<provider>/<id>:<effort>`, such as `anthropic/claude-opus-5-5:high` | `model: "anthropic/claude-opus-5-5:high"`. |

## setup-pstack

pi has no always-applied rules folder, so `setup-pstack` writes its rule to `<agent-dir>/pstack-models.md`, and this adapter reads it each session. Follow its steps with these changes:

- Detect. The detected models are the rows that `pi --list-models` prints. Write a real model as `<provider>/<id>:<effort>`, such as `xai/grok-4.7:xhigh`. The effort follows the last `:`, so the budget step works as written. pi has no fast variants.
- Defaults. Map each default slug with the rows above: `claude-opus-5-5-xhigh` is `anthropic/claude-opus-5-5:xhigh`, and `grok-4.7-xhigh-fast` is `xai/grok-4.7:xhigh`. When pi lists no model for a default, mark the role as needing a choice.
- Write. Write `<agent-dir>/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Never put the role lines in `AGENTS.md` or `CLAUDE.md`.

## Paths

| Cursor | pi |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.pi/skills/`, `~/.pi/agent/skills/`. pi also reads `.agents/skills/` and `~/.agents/skills/`. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<agent-dir>/git/github.com/cursor/plugins/harness/pstack/pi/`, `package.json` in that folder. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or `CLAUDE.md` when no `AGENTS.md` exists. pi reads them from `<agent-dir>`, the working directory, and its parents. pi never reads `.mdc` files. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. The package ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `<agent-dir>/sessions/--<slug>--/<timestamp>_<id>.jsonl`. The slug is the workspace path without its leading `/`, with each `/` changed to `-`, so `/Users/you/proj` is `--Users-you-proj--`. The newest `.jsonl` in that folder is the current session. Read a subagent's transcript with `subagent({ action: "status", id, options: { view: "transcript" } })`. Read only this workspace's folder. |

## Cursor-only features

pi has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in pi: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | pi |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
