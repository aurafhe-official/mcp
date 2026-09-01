#!/usr/bin/env node
/**
 * fhe — shell access to the Aura FHE coprocessor.
 *
 * Usage:
 *   fhe <command> [args...]
 *
 * Pipes:
 *   fhe enc int 25 > a.ct
 *   fhe enc int 17 > b.ct
 *   fhe add int "$(cat a.ct)" "$(cat b.ct)" | fhe dec int
 */

import { connect, AfheApiError } from "@aura/fhe-client";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

const CONFIG_DIR = join(homedir(), ".aura-fhe");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const HELP = `\
fhe — shell access to the Aura FHE coprocessor

Lifecycle:
  fhe connect [--url URL] [--insecure] [--keys-dir PATH]
                                  Save defaults so you don't repeat --url every time
  fhe health                      Probe the server
  fhe functions                   List available operations
  fhe load [--skb P] [--pkb P] [--dictb P]
                                  Load key blocks on the server
  fhe keygen [--force] [--m N] [--n N] [--q N] [--p N] [--delta N]
             [--skb-file P] [--pkb-file P] [--dictb-file P]
                                  Generate fresh keys (slow)

Encrypt / decrypt:
  fhe enc  <int|float|string|binary> <value> [--public]
  fhe dec  <int|float|string|binary> <ciphertext>
                                  Reads ciphertext from stdin if not given

Compute (any operation listed by 'fhe functions'):
  fhe call <fnName> <arg1> [arg2] [arg3]
  fhe add  <int|float>   <a> <b>
  fhe sub  <int|float>   <a> <b>
  fhe mul  <int|float>   <a> <b>
  fhe div  <int|float>   <a> <b>
  fhe xor  <a> <b>                And: and, or, not(arity-1)
  fhe cmux <sel> <a> <b>
  fhe sqrt <c>                    And: log, exp, sin, cos, ...
  fhe sign   <message>
  fhe verify <message> <signature>

Global flags (override the saved config):
  --url URL          Server base URL (default: $AFHE_API_URL or https://localhost:8443)
  --insecure         Accept self-signed TLS (auto-on for localhost and api.afhe.io)
  --no-autoload      Don't auto-load keys
  --quiet            Print result only, no trailing newline
  --help, -h         Show this help

Examples:
  fhe connect --url https://localhost:8443
  fhe enc int 25 > a.ct
  fhe enc int 17 > b.ct
  fhe add int "$(cat a.ct)" "$(cat b.ct)" | fhe dec int
`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(HELP);
    return;
  }

  const { flags, positional } = parseArgs(argv);
  const cmd = positional.shift();
  if (!cmd) {
    process.stdout.write(HELP);
    return;
  }

  switch (cmd) {
    case "connect":   return cmdConnect(flags);
    case "health":    return cmdHealth(flags);
    case "functions": return cmdFunctions(flags);
    case "load":      return cmdLoad(flags);
    case "keygen":    return cmdKeygen(flags);
    case "enc":       return cmdEncrypt(positional, flags);
    case "dec":       return cmdDecrypt(positional, flags);
    case "call":      return cmdCall(positional, flags);
    case "add":       return cmdBinaryOp("add", positional, flags);
    case "sub":       return cmdBinaryOp("sub", positional, flags);
    case "mul":       return cmdBinaryOp("mul", positional, flags);
    case "div":       return cmdBinaryOp("div", positional, flags);
    case "xor":       return cmdRawCall("XORCipher", positional, flags, 2);
    case "and":       return cmdRawCall("ANDCipher", positional, flags, 2);
    case "or":        return cmdRawCall("ORCipher", positional, flags, 2);
    case "not":       return cmdRawCall("NOTCipher", positional, flags, 1);
    case "cmux":      return cmdRawCall("CMux", positional, flags, 3);
    case "sqrt":      return cmdRawCall("SqrtCipher", positional, flags, 1);
    case "log":       return cmdRawCall("LogCipher", positional, flags, 1);
    case "exp":       return cmdRawCall("ExpCipher", positional, flags, 1);
    case "sin":       return cmdRawCall("SinCipher", positional, flags, 1);
    case "cos":       return cmdRawCall("CosCipher", positional, flags, 1);
    case "tan":       return cmdRawCall("TanCipher", positional, flags, 1);
    case "sign":      return cmdRawCall("GenSign", positional, flags, 1);
    case "verify":    return cmdVerify(positional, flags);
    default:
      die(`unknown command: ${cmd}\nrun 'fhe --help' for usage`);
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdConnect(flags) {
  const cfg = await loadConfig();
  if (flags.url) cfg.baseUrl = flags.url;
  if (flags.insecure) cfg.insecureTLS = true;
  if (flags["keys-dir"]) {
    cfg.keys = {
      skb:   join(flags["keys-dir"], "skb"),
      pkb:   join(flags["keys-dir"], "pkb"),
      dictb: join(flags["keys-dir"], "dictb"),
    };
  }

  // Verify the connection works with the new settings.
  const client = await connectFrom({ ...flags, ...stripUndef(cfg) });
  await client.health();
  await saveConfig(cfg);

  out(`saved config to ${CONFIG_PATH}`);
  out(`  baseUrl:      ${cfg.baseUrl ?? "https://localhost:8443"}`);
  out(`  insecureTLS:  ${cfg.insecureTLS ?? "(auto)"}`);
  if (cfg.keys) out(`  keys: ${JSON.stringify(cfg.keys)}`);
}

async function cmdHealth(flags) {
  const c = await connectFrom(flags);
  printResult(JSON.stringify(await c.health()), flags);
}

async function cmdFunctions(flags) {
  const c = await connectFrom({ ...flags, autoLoad: false });
  printResult(JSON.stringify(await c.functions(), null, 2), flags);
}

async function cmdLoad(flags) {
  const c = await connectFrom({ ...flags, autoLoad: false });
  const r = await c.load({
    skb:   flags.skb,
    pkb:   flags.pkb,
    dictb: flags.dictb,
  });
  printResult(JSON.stringify(r), flags);
}

async function cmdKeygen(flags) {
  const c = await connectFrom({ ...flags, autoLoad: false });
  const r = await c.keygen(stripUndef({
    m: numberFlag(flags.m),
    n: numberFlag(flags.n),
    q: numberFlag(flags.q),
    p: numberFlag(flags.p),
    delta: numberFlag(flags.delta),
    skb_file: flags["skb-file"],
    pkb_file: flags["pkb-file"],
    dictb_file: flags["dictb-file"],
    force: !!flags.force,
  }));
  printResult(JSON.stringify(r), flags);
}

async function cmdEncrypt(positional, flags) {
  const [domain, value] = positional;
  if (!domain || value == null) die("usage: fhe enc <int|float|string|binary> <value> [--public]");
  assertDomain(domain);
  const c = await connectFrom(flags);
  const ct = await c.encrypt(domain, value, { public: !!flags.public });
  printResult(ct, flags);
}

async function cmdDecrypt(positional, flags) {
  const [domain] = positional;
  let ciphertext = positional[1];
  if (!domain) die("usage: fhe dec <int|float|string|binary> <ciphertext>");
  assertDomain(domain);
  if (ciphertext == null) ciphertext = (await readStdin()).trim();
  if (!ciphertext) die("no ciphertext on the command line or stdin");
  const c = await connectFrom(flags);
  printResult(await c.decrypt(domain, ciphertext), flags);
}

async function cmdCall(positional, flags) {
  const [fn, ...args] = positional;
  if (!fn) die("usage: fhe call <fnName> <arg1> [arg2] [arg3]");
  const expanded = await maybeReadStdinForArgs(args);
  const c = await connectFrom(flags);
  printResult(await c.call(fn, expanded), flags);
}

async function cmdBinaryOp(op, positional, flags) {
  const [domain, ...rest] = positional;
  if (!domain || rest.length < 2) die(`usage: fhe ${op} <int|float> <a> <b>`);
  if (domain !== "int" && domain !== "float") die(`${op} requires domain int or float`);
  const fnMap = {
    add:   { int: "AddCipherInt",        float: "AddCipherFloat" },
    sub:   { int: "SubstractCipherInt",  float: "SubstractCipherFloat" },
    mul:   { int: "MultiplyCipherInt",   float: "MultiplyCipherFloat" },
    div:   { int: "DivideCipherInt",     float: "DivideCipherFloat" },
  };
  const fn = fnMap[op][domain];
  const c = await connectFrom(flags);
  printResult(await c.call(fn, rest.slice(0, 2)), flags);
}

async function cmdRawCall(fn, positional, flags, arity) {
  if (positional.length < arity) die(`${fn} needs ${arity} argument(s)`);
  const args = await maybeReadStdinForArgs(positional.slice(0, arity));
  const c = await connectFrom(flags);
  printResult(await c.call(fn, args), flags);
}

async function cmdVerify(positional, flags) {
  const [msg, sig] = positional;
  if (!msg || !sig) die("usage: fhe verify <message> <signature>");
  const c = await connectFrom(flags);
  const r = await c.verifySign(msg, sig);
  printResult(String(r), flags);
}

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (k === "no-autoload") { flags.autoLoad = false; continue; }
      if (k === "insecure")    { flags.insecureTLS = true; continue; }
      if (k === "public")      { flags.public = true; continue; }
      if (k === "force")       { flags.force = true; continue; }
      if (k === "quiet")       { flags.quiet = true; continue; }
      if (k === "help" || k === "h") { flags.help = true; continue; }
      if (next != null && !next.startsWith("--")) { flags[k] = next; i++; continue; }
      flags[k] = true;
    } else if (a === "-h") {
      flags.help = true;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

async function connectFrom(flags) {
  const cfg = await loadConfig();
  const opts = {
    baseUrl: flags.url ?? cfg.baseUrl,
    insecureTLS: flags.insecureTLS ?? cfg.insecureTLS,
    autoLoad: flags.autoLoad ?? cfg.autoLoad ?? true,
    keys: cfg.keys,
    timeoutMs: 600_000,
  };
  // Strip undefined so connect() falls back to its own defaults.
  return await connect(stripUndef(opts));
}

async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveConfig(cfg) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

function stripUndef(o) {
  const out = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

function numberFlag(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) die(`invalid numeric flag value: ${value}`);
  return n;
}

function out(s) { process.stdout.write(`${s}\n`); }
function err(s) { process.stderr.write(`${s}\n`); }
function die(msg) { err(`fhe: ${msg}`); process.exit(2); }

function printResult(s, flags) {
  process.stdout.write(s);
  if (!flags.quiet) process.stdout.write("\n");
}

function assertDomain(d) {
  if (!["int", "float", "string", "binary"].includes(d)) {
    die(`unknown domain "${d}". Use one of: int, float, string, binary.`);
  }
}

async function maybeReadStdinForArgs(args) {
  // Replace "-" with a single read from stdin.
  const idx = args.indexOf("-");
  if (idx < 0) return args;
  const stdin = (await readStdin()).trim();
  const copy = args.slice();
  copy[idx] = stdin;
  return copy;
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

main().catch((e) => {
  if (e instanceof AfheApiError) {
    err(`fhe: HTTP ${e.status}: ${e.message}`);
  } else {
    err(`fhe: ${e?.message ?? e}`);
  }
  process.exit(1);
});
