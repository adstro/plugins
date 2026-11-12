# pstack in herdr

pstack skills use Cursor names. In herdr, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so.

herdr runs your agent CLI in a terminal that `hc` manages, and `$HC_TERMINAL_ID` is your address. That CLI is the host, such as Claude Code or Codex. Keep the host's own tools for files, edits, todos, and questions. Use `hc` for every subagent, background command, and other machine, even when the host has its own subagent tool, so each helper stays watchable, steerable, and on the model its role names. The `hc` skill (`hc --help`) has the exact flags.

## Install

| Host | Command |
| --- | --- |
| Claude Code | Make a new space in the Herdr app. In its terminal, run `claude --plugin-dir <repo>/harness/pstack/herdr`. This lead takes the space from there. The app's agent menu cannot add `--plugin-dir`, so it loads an installed Claude Code pstack instead. Outside the app, `hc run --bg --name lead claude --plugin-dir <repo>/harness/pstack/herdr`, then `hc attach lead`. Commands take a `pstack:` prefix, such as `/pstack:poteto-mode`. Do not also install the Claude Code tree, since its adapter routes subagents to `Agent`. |
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
- If the child sits at `idle` or `blocked` on turn 0, `hc read` it. Some startup screens are safe to clear yourself:
  - A folder-trust prompt for the child's own `--cwd` (the repo or its worktree). hc may report it as `blocked`. Read which line holds the trust option and press keys to select it, such as `hc keys <name> down enter` when it is second and `hc keys <name> enter` when it is first.
  - A sign-in spinner, such as Antigravity's `Signing in...`. Wait again.
  - An empty input line at `idle` on turn 0 after either screen means the brief was dropped. Send it once with `hc send <name> "<brief>"`.

  Any other dialog or permission prompt needs the user. Never `hc send --force` past a permission decision.
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
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | `claude --model <family> --effort <effort>`. Drop `-fast`. |
| `grok-<version>-<effort>[-fast]`, such as `grok-4.7-xhigh-fast` | `grok --always-approve -m grok-<version> --effort <effort>`. Drop `-fast`. Each Grok model takes its own efforts, listed under `reasoning_efforts` in `~/.grok/models_cache.json` and in grok's error for an effort it rejects. Use the highest one at or below `<effort>`, so `max` becomes `xhigh` on `grok-4.7` and `high` on `grok-4.5`. |
| A `gemini-*` slug, such as `gemini-4-argon-high` | `agy --dangerously-skip-permissions --model <id> -i`, where `<id>` is the first tab-separated field of a line `agy models` prints. `-i` stays last so the brief follows it and the session stays open for more turns. |
| A `gpt-*` slug | `codex --no-daemon -m <model> -c model_reasoning_effort=<effort>`. |
| Any other slug | `cursor-agent --model <slug>` when Cursor Agent is signed in. Otherwise the host's own command, and say so. |
| `auto` or `inherit-parent` | The host's own command with no model flag, such as `claude`. |
| A role value that is already a command, such as `pi --provider openai-codex --model gpt-6.1-sol --thinking high` | Use it as written. |
| A slug's family, such as arena's `claude-*` and `grok-*` prefixes | The model the command runs, not the program. `<model> <effort>` and a `claude-*` id are Claude, a `grok-*` id is Grok, a `gemini-*` id is Gemini, and a `gpt-*` id is GPT. `agy --model claude-opus-5-5-high -i` is Claude. The parent's family is the host's model. So a Claude lead's cross-judge pool `opus xhigh, grok ..., agy --model gemini-...` skips `opus xhigh` and tries `grok` first. |

## setup-pstack

Follow its steps with these changes:

- Detect. Check which of `claude`, `grok`, `agy`, `codex`, `pi`, and `cursor-agent` are on `PATH` and signed in. Claude Code offers `opus`, `sonnet`, `haiku`, and `fable`, each with an effort. `grok models` lists the Grok models. `agy models` lists Gemini models with some Claude and GPT-OSS ones, so take only its `gemini-*` ids. List the others with their own model commands. Write a Claude model as `<model> <effort>`, a Grok model as `grok --always-approve -m <model> --effort <effort>`, a Gemini model as `agy --dangerously-skip-permissions --model <id> -i`, and any other model as its full command with the effort last. The Grok and Gemini flags let a seat run tools without a person approving each one. Without them, every such seat stops at its first command.
- Budget. A Claude or Grok line's effort is its last token. For Grok, use the highest effort that model's `reasoning_efforts` lists at or below the target. A Gemini line's effort is the last part of its `<id>`, such as `high` in `gemini-4-argon-high`. Set it to the target effort when `agy models` lists that id, else to the highest listed effort below it.
- Defaults. Map each default slug with the Models rows.
- Write. Write `~/.config/herdr-core/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file.

## Paths

| Cursor | herdr |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | The host's skills folders, such as `.claude/skills/` for Claude Code, `~/.agents/skills/` for Codex and Grok, and `~/.gemini/skills/` for Antigravity. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | The folder the host loads this tree from, and its `.claude-plugin/plugin.json`. |
| `.cursor/rules/*.mdc`, always-applied rules | `CLAUDE.md` for Claude Code, `AGENTS.md` for other hosts. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | A live child's screen and history come from `hc read --lines <n> <t>`. Session logs are the host's: `~/.claude/projects/<slug>/<session>.jsonl` for Claude Code, where the slug is the workspace path with each `/` and `.` changed to `-`, and `~/.codex/sessions/` for Codex. Read only this workspace's sessions. |

## Cursor-only features

herdr has no Cursor Automations or Bugbot. When a step needs one, put one line in your reply, `Skipped in herdr: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | herdr |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree or an `hc` machine, as in Subagent fields. A cloud agent's status is `hc get <t>` and its screen is `hc read <t>`. Skip a step that needs the Cursor dashboard. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
