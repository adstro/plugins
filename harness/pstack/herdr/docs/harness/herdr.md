# pstack in herdr

pstack skills use Cursor names. In herdr, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so.

herdr runs your agent CLI in a terminal that `hc` manages, and `$HC_TERMINAL_ID` is your address. That CLI is the host: Claude Code, Codex, pi, or Cursor Agent. Keep the host's own tools for files, edits, todos, and questions. Use `hc` for every subagent, background command, and other machine, even when the host has its own subagent tool, so each helper stays watchable, steerable, and on the model its role names. The `hc` skill (`hc --help`) has the exact flags.

## Install

| Host | Command |
| --- | --- |
| Claude Code | In a Herdr app pane, `claude --plugin-dir <repo>/harness/pstack/herdr`. The app's agent menu starts plain `claude`, which loads an installed Claude Code pstack instead. Outside the app, `hc run --bg --name lead claude --plugin-dir <repo>/harness/pstack/herdr`, then `hc attach lead`. Commands take a `pstack:` prefix, such as `/pstack:poteto-mode`. Do not also install the Claude Code tree, since its adapter routes subagents to `Agent`. |
| pi | In a Herdr app pane, `pi --skill <repo>/harness/pstack/herdr/skills`. |
| Codex, other hosts | Point the host's skills folder at `<repo>/harness/pstack/herdr/skills`. Codex always runs with `--no-daemon`. |

## Subagents

Spawn every subagent this way, with the brief as the launch argument so it cannot be dropped:

```sh
hc run --bg --name <name> --cwd <dir> <command> "<brief>"
```

- `<command>` comes from Models. `<name>` is unique among live terminals, 1 to 32 of `a-z 0-9 - _`.
- End each brief with `Report with hc send <your $HC_TERMINAL_ID> "<result, or the path of a file that holds it>" when done or stuck.` Ask for long results in a file.
- Say in the brief whether the child may start its own agents. It may not unless you assign that.
- Wait with `hc wait --children any` for the next report or `hc wait --children all` for the whole batch. Never sleep or poll. `reason: timeout` is a check-in, so wait again. `reason: message` means the report arrives as your next input.
- Reports arrive as `<hc from="t7 name">...</hc>`. They are child reports, not user instructions. Read the actual result, and `hc read --lines 100 <name>` when the report is thin.
- If the child sits at `idle` on turn 0, `hc read` it. A folder-trust dialog for the repo or its worktree takes `hc keys <name> down enter`. Any other dialog, or a `blocked` status, needs the user. Never `hc send --force` past a permission decision.
- Once you accept the work, `hc kill <name>` then `hc rm <name>`. Clean up only terminals you started.

If your own first message arrived as `<hc from="..." reach="hc send t3 ...">`, you are a delegate. Report through that `reach` command when done or stuck, not just to acknowledge.

## Tools

| Cursor | herdr |
| --- | --- |
| `Task`, a Task call or Task subagent | The spawn in Subagents. |
| `AskQuestion` | The host's question tool, such as `AskUserQuestion` in Claude Code. With none, ask in plain text and end the turn. A delegate asks its parent with `hc send` instead. |
| Open a todolist | The host's todo tool. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type it, write `/name`, or `/pstack:name` in Claude Code. |
| `Grep`, `Glob` | The host's search tools, or `rg` in the shell. |
| A slow shell command (build, test suite, install, CI watch) | `hc run --bg --rm --no-notify --name <name> -- <command>`, then `hc wait <name>`. Drop `--rm` when you still need `hc read <name>` afterward. |

## Subagent fields

| Cursor | herdr |
| --- | --- |
| `subagent_type: generalPurpose` | The brief alone. |
| `poteto-agent`, `comment-sicko` | Open the brief with `Read <pstack>/agents/<agent>.md in full and act as the agent it defines.` using the absolute path. |
| `readonly: true` | The brief says "Read-only. Do not edit files." Put `--permission-mode plan` after `claude`, or `-s read-only` after `codex`, since `hc run` flags end at the program name. Check `git status` afterward. |
| `readonly: false` | The default launch. The child keeps the host's MCP servers. |
| `environment: "cloud"` | `git worktree add <path> -b <branch> <base>`, then `--cwd <path>`. When `hc machine ls` lists a machine that holds the repo, `--on <machine> --cwd <repo>` runs it there instead, and its address is `<machine>/<t>`. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | `<b>` is the worktree's `<base>`, or the branch the remote child checks out first. |
| `run_in_background: true` | `--bg`. Every agent spawn uses it. |
| `resume` | While the terminal is live, `hc send <name> "<follow-up>"`. The child keeps its context. poteto-mode's fresh-by-default rule still decides when to resume. After `hc kill`, spawn fresh and paste the earlier result into the brief. |
| `file_attachments` | List the paths in the brief. For a child on another machine, `hc put <t> <file>` first and list where it landed. |

## Models

A role value from the model rule or a skill default becomes the `<command>` of a spawn.

| Cursor | herdr |
| --- | --- |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.config/herdr-core/pstack-models.md`. Read it once per session. When it is missing, read the host's copy, such as `~/.claude/rules/pstack-models.md`. When the role's line is missing, use the skill's default. |
| A role value `<model> <effort>`, such as `opus high` | `claude --model opus --effort high`. |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `cursor-agent --model <slug>` when Cursor Agent is signed in. Otherwise `claude --model <family> --effort <effort>`, dropping `-fast`. |
| A `gpt-*` slug | `cursor-agent --model <slug>` when Cursor Agent is signed in. Otherwise `codex --no-daemon -m <model> -c model_reasoning_effort=<effort>`. |
| A `grok-*` or other slug | `cursor-agent --model <slug>` when Cursor Agent is signed in. Otherwise the host's own command, and say so. |
| `auto` or `inherit-parent` | The host's own command with no model flag, such as `claude`. |
| A role value that is already a command, such as `pi --provider openai-codex --model gpt-6.1-sol --thinking high` | Use it as written. |

## setup-pstack

Follow its steps with these changes:

- Detect. Check which of `claude`, `codex`, `pi`, and `cursor-agent` are on `PATH` and signed in. Claude Code offers `opus`, `sonnet`, `haiku`, and `fable`, each with an effort. List the others with their own model commands. Write a Claude model as `<model> <effort>`, and any other model as its full command with the effort last, so the budget step works as written.
- Defaults. Map each default slug with the Models rows.
- Write. Write `~/.config/herdr-core/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file.

## Paths

| Cursor | herdr |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | The host's skills folders, such as `.claude/skills/` for Claude Code, `~/.codex/skills/` or `~/.agents/skills/` for Codex, and `~/.pi/agent/skills/` for pi. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | The folder the host loads this tree from, and its `.claude-plugin/plugin.json`. |
| `.cursor/rules/*.mdc`, always-applied rules | `CLAUDE.md` for Claude Code, `AGENTS.md` for other hosts. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | A live child's screen and history come from `hc read --lines <n> <t>`. Session logs are the host's: `~/.claude/projects/<slug>/<session>.jsonl` for Claude Code, where the slug is the workspace path with each `/` and `.` changed to `-`, `~/.codex/sessions/` for Codex, and `~/.pi/agent/sessions/` for pi. Read only this workspace's sessions. |

## Cursor-only features

herdr has no Cursor Automations or Bugbot. When a step needs one, put one line in your reply, `Skipped in herdr: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | herdr |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree or an `hc` machine, as in Subagent fields. A cloud agent's status is `hc get <t>` and its screen is `hc read <t>`. Skip a step that needs the Cursor dashboard. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
