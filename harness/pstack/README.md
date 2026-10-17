# pstack harness trees

This folder is generated from `pstack/skills`, `pstack/agents`, `pstack/docs/guide`, `pstack/README.md`, `pstack/docs/harness/claude-code.md`, `pstack/docs/harness/pi.md`, `pstack/docs/harness/pi/agents`, `pstack/LICENSE`, and `pstack/plugin.json`. Do not edit it by hand.

Cursor uses `pstack/` directly. Claude Code installs `claude-code/` through `.claude-plugin/marketplace.json`, and pi installs `pi/` through the `package.json` at the repository root. Each tree carries its own harness adapter and leaves out the rest of `pstack/`, such as `pstack/automations` and `pstack/assets`. A relative link to a pstack file that a tree leaves out points at that file on GitHub `main` instead.

After editing those sources, run `node scripts/generate-pstack-harness-trees.mjs` from the repository root and commit the result.
