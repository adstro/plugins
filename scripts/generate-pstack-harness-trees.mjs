#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PSTACK = join(ROOT, "pstack");
const SKILLS = join(PSTACK, "skills");
// Outside pstack/ so Cursor, which copies the whole plugin folder, does not install this tree too.
const OUT = join(ROOT, "harness", "pstack");
const GUIDE = "docs/guide";
const PLUGIN = join(PSTACK, "plugin.json");
const COMMAND = "node scripts/generate-pstack-harness-trees.mjs";
const GITHUB = "https://github.com/cursor/plugins";
const LINK = /\]\(([^)\s]+)\)/g;
const README = `# pstack harness trees

This folder is generated from \`pstack/skills\`, \`pstack/agents\`, \`pstack/${GUIDE}\`, \`pstack/README.md\`, \`pstack/docs/harness/claude-code.md\`, \`pstack/docs/harness/pi.md\`, \`pstack/docs/harness/pi/agents\`, \`pstack/LICENSE\`, and \`pstack/plugin.json\`. Do not edit it by hand.

Cursor uses \`pstack/\` directly. Claude Code installs \`claude-code/\` through \`.claude-plugin/marketplace.json\`, and pi installs \`pi/\` through the \`package.json\` at the repository root. Each tree carries its own harness adapter and leaves out the rest of \`pstack/\`, such as \`pstack/automations\` and \`pstack/assets\`. A relative link to a pstack file that a tree leaves out points at that file on GitHub \`main\` instead.

After editing those sources, run \`${COMMAND}\` from the repository root and commit the result.
`;

const TERMS = [
  { key: "`Task`", re: /`Task`|\bTask (tool|subagent|call)/ },
  { key: "`AskQuestion`", re: /AskQuestion/ },
  { key: "todolist", re: /\btodo ?list\b/i },
  { key: "generalPurpose", re: /generalPurpose/ },
  { key: "poteto-agent", re: /poteto-agent/ },
  { key: "comment-sicko", re: /comment-sicko/ },
  { key: "`readonly: true`", re: /readonly: (true|false)|readonly\/Ask/ },
  { key: "`environment: \"cloud\"`", re: /environment: "(cloud|local)"/ },
  { key: "cloud_base_branch", re: /cloud_base_branch/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "`resume`", re: /`resume`/ },
  { key: "`file_attachments`", re: /file_attachments/ },
  { key: "claude-", re: /\bclaude-[a-z]+-\d/ },
  { key: "grok-", re: /\bgrok-\d/ },
  { key: "gpt-", re: /\bgpt-\d/ },
  { key: "inherit-parent", re: /inherit-parent/ },
  { key: "pstack-models.mdc", re: /pstack-models\.mdc/ },
  { key: ".cursor/skills/", re: /\.cursor\/skills/ },
  { key: "~/.cursor/plugins/", re: /\.cursor\/plugins|\.cursor-plugin/ },
  { key: ".cursor/rules/", re: /\.cursor\/rules|always-applied rule/ },
  { key: "agent-transcripts", re: /agent-transcripts|\.cursor\/projects/ },
  { key: "Cursor-only features", re: /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool/ },
];
// The pi-subagents package reads these. `package: pstack` registers each agent as `pstack.<name>`.
const PI_AGENT_FIELDS = "package: pstack\nsystemPromptMode: append\ninheritProjectContext: true\ninheritGlobalContext: true\ninheritSkills: true\n";

const json = (value) => ({ bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`), executable: false });

// `agents` lists the pstack folders whose files land in the tree's agents/, and `agent` rewrites each one.
const HARNESSES = [
  {
    tree: "claude-code",
    name: "Claude Code",
    adapter: "docs/harness/claude-code.md",
    agents: ["agents"],
    agent: (text) => text,
    manifests: () => ({ "plugin.json": file(PLUGIN), ".claude-plugin/plugin.json": file(PLUGIN) }),
  },
  {
    tree: "pi",
    name: "pi",
    adapter: "docs/harness/pi.md",
    agents: ["agents", "docs/harness/pi/agents"],
    agent: (text) => text.replace(/^---\n[\s\S]*?\n---\n/, (frontmatter) => frontmatter.replace(/^name:.*\n/m, `$&${PI_AGENT_FIELDS}`)),
    manifests() {
      const { name, version, description, author, homepage, repository, license, keywords } = JSON.parse(readFileSync(PLUGIN, "utf8"));
      const pi = { skills: ["./skills"], subagents: { agents: ["./agents"] } };
      return { "package.json": json({ name, version, description, author, homepage, repository, license, keywords: [...keywords, "pi-package"], pi }) };
    },
  },
];

const ROUTE_KEY = "Run another pstack skill";
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

const skills = readdirSync(SKILLS).filter((name) => existsSync(join(SKILLS, name, "SKILL.md")));

function classify(skill) {
  const dir = join(SKILLS, skill);
  const others = skills.filter((name) => name !== skill).join("|");
  const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
  const linksToSkill = (line, name) => line.includes(`(../${name}/`);
  const namesBareSkill = (line) =>
    [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
  const usesCursorNames = new Set();
  for (const path of walk(dir).filter((path) => path.endsWith(".md"))) {
    const text = readFileSync(path, "utf8");
    for (const term of TERMS) if (term.re.test(text)) usesCursorNames.add(term.key);
    if (text.split("\n").some(namesBareSkill)) usesCursorNames.add(ROUTE_KEY);
  }
  const text = readFileSync(join(dir, "SKILL.md"), "utf8");
  const wrap = usesCursorNames.size > 0 && /^# /m.test(text);
  return { usesCursorNames, wrap };
}

const classes = new Map(skills.map((skill) => [skill, classify(skill)]));
const problems = [];
const users = new Map();
for (const [skill, { usesCursorNames, wrap }] of classes) {
  if (usesCursorNames.size > 0 && !wrap) problems.push(`skills/${skill}/SKILL.md uses Cursor names but has no H1`);
  for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), skill]);
  // Cursor runs a skill by its folder name and Claude Code lists it by its frontmatter `name`, so the two must match. The Agent Skills spec limits both to SKILL_NAME.
  const frontmatter = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  if (name !== skill) problems.push(`skills/${skill}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
  if (!SKILL_NAME.test(skill) || skill.length > 64) problems.push(`skills/${skill} is not lowercase words joined by hyphens, at most 64 characters`);
}
// Each harness lists an agent by its frontmatter `name`, and the pi transform inserts its fields after that line.
for (const dir of new Set(HARNESSES.flatMap(({ agents }) => agents))) {
  for (const path of walk(join(PSTACK, dir))) {
    if (!/^---\n(?:.*\n)*?name:.*\n(?:.*\n)*?---\n/.test(readFileSync(path, "utf8"))) problems.push(`${relative(PSTACK, path)} has no name in its frontmatter`);
  }
}
for (const { name, adapter } of HARNESSES) {
  const text = readFileSync(join(PSTACK, adapter), "utf8");
  for (const [key, using] of users) {
    if (!text.includes(key)) problems.push(`${name} adapter has no row for ${key}, used by ${using.join(", ")}`);
  }
}
for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);

// The pstack-relative path that a relative link in `from` points at, if that path exists.
function resolve(from, href) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
  return existsSync(join(PSTACK, path)) ? path : undefined;
}

function has(files, path) {
  return files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
}

function render({ name, adapter, agents, agent, manifests }) {
  // Skills read the adapter, the guide, and the README at runtime, so the harness never fetches them.
  const copies = [...walk(SKILLS), ...walk(join(PSTACK, GUIDE)), join(PSTACK, adapter), join(PSTACK, "README.md")];
  const files = new Map(copies.map((path) => [relative(PSTACK, path), file(path)]));
  for (const dir of agents) {
    for (const path of walk(join(PSTACK, dir))) {
      const entry = file(path);
      entry.bytes = Buffer.from(agent(entry.bytes.toString("utf8")));
      files.set(posix.join("agents", relative(join(PSTACK, dir), path)), entry);
    }
  }
  const line =
    `In ${name}, read [the ${name} adapter](../../${adapter}) once per session before you follow this skill. ` +
    `It maps the Cursor names in pstack skills to ${name}.`;
  for (const [skill, { wrap }] of classes) {
    const path = `skills/${skill}/SKILL.md`;
    const text = files.get(path).bytes.toString("utf8");
    if (wrap) files.get(path).bytes = Buffer.from(text.replace(/^(# .*)\n+/m, `$1\n\n${line}\n\n`));
  }
  files.set("LICENSE", file(join(PSTACK, "LICENSE")));
  for (const [path, entry] of Object.entries(manifests())) files.set(path, entry);
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    const text = entry.bytes.toString("utf8").replace(LINK, (link, href) => {
      const target = resolve(path, href);
      if (!target || target.split("/")[0] === ".." || has(files, target)) return link;
      const kind = statSync(join(PSTACK, target)).isDirectory() ? "tree" : "blob";
      return `](${GITHUB}/${kind}/main/pstack/${target}${href.slice(href.search(/[#?]|$/))})`;
    });
    entry.bytes = Buffer.from(text);
  }
  return files;
}

// Each harness installs only its tree, so a relative link that works from pstack/ has to work inside the tree too.
// Links to pstack files that the tree leaves out already point at GitHub, so a failure here is a link that leaves pstack/.
const rendered = new Map([["README.md", { bytes: Buffer.from(README), executable: false }]]);
const failures = [];
for (const harness of HARNESSES) {
  const files = render(harness);
  for (const [path, entry] of files) {
    rendered.set(`${harness.tree}/${path}`, entry);
    if (!path.endsWith(".md")) continue;
    for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK)) {
      const target = resolve(path, href);
      if (target && !has(files, target)) failures.push(`harness/pstack/${harness.tree}/${path} links to ${href}, which is not in the tree`);
    }
  }
}
// pi cannot install a subfolder of a git repository, so the root package.json points pi into the pi tree.
const paths = (value) => (typeof value === "string" ? [value] : Object.values(value).flatMap(paths));
for (const path of paths(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).pi ?? {})) {
  const target = posix.relative("harness/pstack", posix.normalize(path));
  if (target.startsWith("..") || !has(rendered, target)) failures.push(`package.json pi path ${path} is not in harness/pstack`);
}
for (const failure of failures) console.log(`FAIL ${failure}`);
if (failures.length > 0) process.exit(1);

if (process.argv.includes("--check")) {
  const onDisk = new Map(existsSync(OUT) ? walk(OUT).map((path) => [relative(OUT, path), file(path)]) : []);
  const drifted = [...new Set([...rendered.keys(), ...onDisk.keys()])].sort().filter((path) => {
    const [want, have] = [rendered.get(path), onDisk.get(path)];
    return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
  });
  for (const path of drifted.slice(0, 20)) console.log(`harness/pstack/${path}`);
  if (drifted.length > 0) {
    console.log(`harness/pstack is out of date. Run \`${COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log("harness/pstack is up to date.");
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [path, { bytes, executable }] of rendered) {
    mkdirSync(dirname(join(OUT, path)), { recursive: true });
    writeFileSync(join(OUT, path), bytes);
    chmodSync(join(OUT, path), executable ? 0o755 : 0o644);
  }
  const wrapped = [...classes.values()].filter(({ wrap }) => wrap).length;
  console.log(`${skills.length} skills, ${wrapped} SKILL.md files with the adapter line`);
}
