// One long-lived interactive zingo-cli process per wallet.
//
// Starting zingo-cli and syncing is slow, so each wallet keeps a single
// session open. Commands run one at a time through a queue; a command is
// finished when zingo-cli prints a fresh, empty prompt and then goes quiet.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";

const BRIDGE = fileURLToPath(new URL("../pty_bridge.py", import.meta.url));
const PROMPT_AT_END = />> $/;
const QUIET_MS = 250;
// The pty accepts input lines of ~1000 bytes at most; longer ones wedge it.
const MAX_LINE = 950;

export class ZingoSession {
  constructor(name, dataDir, extraArgs = []) {
    this.name = name;
    this.dataDir = dataDir;
    this.extraArgs = extraArgs;
    this.queue = Promise.resolve();
    this.buf = "";
    this.listener = null;
    this.ready = false;
  }

  start() {
    const args = [
      "-I", BRIDGE, config.zingoBin,
      "--chain", config.chain, "--server", config.indexer,
      "--data-dir", this.dataDir, ...this.extraArgs,
    ];
    this.proc = spawn(config.python, args, { stdio: ["pipe", "pipe", "pipe"] });
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

  stop() {
    this.proc?.stdin.end();
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
