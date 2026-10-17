# pstack in pi

pstack skills use Cursor names. In [pi](https://pi.dev), read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. pi names each skill's folder when it loads the skill. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

pstack needs the [`pi-subagents`](https://github.com/nicobailon/pi-subagents) package for subagents. A pstack skill that tells you to spawn a subagent counts as an instruction that authorizes delegation.

At the start of a session, read `<agent-dir>/pstack-models.mdc` if it exists. `<agent-dir>` is `$PI_CODING_AGENT_DIR`, or `~/.pi/agent` when that is unset. Treat its role lines as the always-applied rule that skills name.

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
| The `pstack-models.mdc` rule | `<agent-dir>/pstack-models.mdc`. `setup-pstack` writes it there with the same shape and Cursor slugs. Its step 1 detects models with `pi --list-models`. A slug counts as detected when the pi model it maps to is listed. |

## Paths

| Cursor | pi |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.pi/skills/`, `~/.pi/agent/skills/`. pi also reads `.agents/skills/` and `~/.agents/skills/`. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<agent-dir>/git/github.com/cursor/plugins/harness/pstack/pi/`, `package.json` in that folder. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or `CLAUDE.md` when no `AGENTS.md` exists. pi reads them from `<agent-dir>`, the working directory, and its parents. pi never reads `.mdc` files. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `<agent-dir>/sessions/--<slug>--/<timestamp>_<id>.jsonl`. The slug is the workspace path without its leading `/`, with each `/` changed to `-`, so `/Users/you/proj` is `--Users-you-proj--`. The newest `.jsonl` in that folder is the current session. Read a subagent's transcript with `subagent({ action: "status", id, options: { view: "transcript" } })`. Read only this workspace's folder. |

## Cursor-only features

Automations, Bugbot, Cursor cloud agents, and Cursor's pull request tool have no pi equivalent. Say so, skip that step, and continue.
