"""Run a command inside a pseudo-terminal, forwarding our stdin to it and its
output to our stdout.

zingo-cli's interactive prompt needs a terminal, so the Node service talks to
it through this bridge. Anything resembling a seed phrase (12+ consecutive
lowercase words) is masked before it leaves this process.

Usage: python3 -I pty_bridge.py <command> [args...]
"""
import fcntl
import os
import pty
import re
import select
import struct
import sys
import termios

SEED = re.compile(rb"\b([a-z]{3,8}\s+){11,}[a-z]{3,8}\b")
ANSI = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]|\r")

argv = sys.argv[1:]
pid, master = pty.fork()
if pid == 0:
    os.execv(argv[0], argv)

# A very wide terminal stops the line editor from wrapping and redrawing
# long commands (addresses are ~200 characters).
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 4000, 0, 0))

stdin_fd = sys.stdin.fileno()
out = sys.stdout.buffer
while True:
    ready, _, _ = select.select([master] + ([stdin_fd] if stdin_fd >= 0 else []), [], [])
    if master in ready:
        try:
            data = os.read(master, 65536)
        except OSError:
            break  # child exited
        if not data:
            break
        out.write(SEED.sub(b"[SEED REDACTED]", ANSI.sub(b"", data)))
        out.flush()
    if stdin_fd in ready:
        data = os.read(stdin_fd, 65536)
        if not data:
            # Service went away: ask zingo-cli to save and exit cleanly.
            os.write(master, b"quit\r")
            stdin_fd = -1
            continue
        os.write(master, data.replace(b"\n", b"\r"))
os.waitpid(pid, 0)
