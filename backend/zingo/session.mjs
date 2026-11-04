// One long-lived interactive zingo-cli process per wallet.
//
// Starting zingo-cli and syncing is slow, so each wallet keeps a single
// session open. Commands run one at a time through a queue; a command is
// finished when zingo-cli prints a fresh, empty prompt and then goes quiet.
// See README.md in this folder.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const BRIDGE = fileURLToPath(new URL("./pty_bridge.py", import.meta.url));
const PROMPT_AT_END = />> $/;
const QUIET_MS = 250;
// The pty accepts input lines of ~1000 bytes at most; longer ones wedge it.
const MAX_LINE = 950;
// One command per line: a command word, then plain tokens (addresses,
// numbers, subcommands), then at most one double-quoted memo that contains
// no quote, backslash or control character. Anything else is refused, so
// user input can never become a second command or a different argument.
const GRAMMAR = /^([a-z_]+)((?: [A-Za-z0-9_]+)*)(?: "[^"\\\u0000-\u001f\u007f]*")?$/;

export class ZingoSession {
  /**
   * @param {object} opts
   * @param {string} opts.name       label used in errors and logs
   * @param {string} opts.dataDir    zingo-cli wallet directory
   * @param {string} opts.zingoBin   path to the zingo-cli binary
   * @param {string} [opts.server]   light-wallet server (default testnet.zec.rocks)
   * @param {string} [opts.chain]    "testnet" (default), "mainnet" or "regtest"
   * @param {string} [opts.python]   Python 3 interpreter for the pty bridge
   * @param {string[]} [opts.extraArgs] extra zingo-cli arguments
   * @param {string[]} [opts.allow]  command words this session may run (default: any)
   */
  constructor({ name, dataDir, zingoBin, server = "https://testnet.zec.rocks:443", chain = "testnet", python = "python3", extraArgs = [], allow = null }) {
    Object.assign(this, { name, dataDir, zingoBin, server, chain, python, extraArgs });
    this.allow = allow ? new Set(allow) : null;
    this.queue = Promise.resolve();
    this.buf = "";
    this.listener = null;
    this.ready = false;
  }

  /** Spawn zingo-cli and resolve once its first prompt appears. */
  start() {
    const args = [
      "-I", BRIDGE, this.zingoBin,
      "--chain", this.chain, "--server", this.server,
      "--data-dir", this.dataDir, ...this.extraArgs,
    ];
    this.proc = spawn(this.python, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk) => {
      this.buf += chunk;
      this.listener?.();
    });
    this.proc.stderr.on("data", () => {});
    this.proc.on("exit", (code) => {
      this.ready = false;
      console.error(`[${this.name}] zingo-cli exited (${code})`);
    });
    // Wait for the first prompt: the wallet is loaded and accepting commands.
    return new Promise((resolve, reject) => {
      let quiet = null;
      const deadline = setTimeout(() => reject(new Error(`${this.name}: no prompt`)), 120_000);
      this.listener = () => {
        clearTimeout(quiet);
        if (!PROMPT_AT_END.test(this.buf)) return;
        quiet = setTimeout(() => {
          clearTimeout(deadline);
          this.listener = null;
          this.ready = true;
          resolve();
        }, 1000);
      };
    });
  }

  /** Run one command; resolves with the text it printed (prompt stripped). */
  run(command, timeoutMs = 60_000) {
    if (Buffer.byteLength(command) > MAX_LINE) {
      return Promise.reject(new Error("command too long for the zingo-cli prompt"));
    }
    const word = command.match(GRAMMAR)?.[1];
    if (!word) return Promise.reject(new Error(`${this.name}: refused a malformed command`));
    if (this.allow && !this.allow.has(word)) {
      return Promise.reject(new Error(`${this.name}: command "${word}" is not allowed`));
    }
    const job = this.queue.then(() => this.#exec(command, timeoutMs));
    this.queue = job.catch(() => {});
    return job;
  }

  #exec(command, timeoutMs) {
    return new Promise((resolve, reject) => {
      this.buf = "";
      let quietTimer = null;
      const finish = (err) => {
        clearTimeout(quietTimer);
        clearTimeout(deadline);
        this.listener = null;
        if (err) return reject(err);
        resolve(cleanOutput(this.buf, command));
      };
      const deadline = setTimeout(
        () => finish(new Error(`${this.name}: "${command.split(" ")[0]}" timed out`)),
        timeoutMs,
      );
      this.listener = () => {
        clearTimeout(quietTimer);
        // A newline means our command was entered; a trailing prompt means
        // zingo-cli is waiting for the next one.
        if (this.buf.includes("\n") && PROMPT_AT_END.test(this.buf)) {
          quietTimer = setTimeout(() => finish(), QUIET_MS);
        }
      };
      this.proc.stdin.write(command + "\n");
    });
  }

  /** Ask zingo-cli to save and quit; resolves once the process has exited. */
  stop() {
    if (!this.proc || this.proc.exitCode !== null) return Promise.resolve();
    const exited = new Promise((resolve) => this.proc.once("exit", resolve));
    this.ready = false;
    this.proc.stdin.end();
    return exited;
  }
}

// Drop the echoed command line and the trailing prompt, keep what it printed.
function cleanOutput(buf, command) {
  let text = buf;
  // The echo comes first; output can repeat the command's words (e.g. "balance").
  const at = text.indexOf(command.slice(-24));
  if (at >= 0) {
    const eol = text.indexOf("\n", at);
    text = eol >= 0 ? text.slice(eol + 1) : "";
  }
  const lastPrompt = text.lastIndexOf("\n");
  if (lastPrompt >= 0 && PROMPT_AT_END.test(text)) text = text.slice(0, lastPrompt);
  return text.trim();
}
