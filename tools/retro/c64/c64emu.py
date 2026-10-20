#!/usr/bin/env python3
"""c64emu — headless VICE x64sc driven by a monitor script, shared by C64 projects.

The shared counterpart of `boulderdash/tools/a8emu.py` for the Commodore 64
(R-008). It started in `impossiblemission/tools/c64emu.py`; the second
consumer (`r-type`) moved it here and made the two project-specific things
parameters: **where the ROMs are** and **which interrupt handler is a frame**.

The VICE package from apt is a GTK build (without an X display it dies) and
**has neither the remote nor the binary monitor**, so it is not driven
interactively but in batch: the tool composes a script of monitor commands,
runs the emulator under `xvfb-run` for a fixed number of cycles and collects
what the script saved. With a fixed `-seed` it is deterministic, and thus
usable for `trace*` and `match*`.

    import sys; sys.path.insert(0, '../svision/tools/retro/c64')
    from c64emu import C64Emu
    e = C64Emu('sources/tape/game.tap')          # .tap / .d64 / .g64 / .prg
    e.brk(0x0810)                                # stop at an address
    e.bsave('build/mem.bin', 0x0800, 0xffff)
    r = e.run(cycles=300_000_000, screenshot='build/boot.png')
    r.log                                        # monitor output
    r.mem('build/mem.bin')                       # bytes

ROMs are taken from `sources/rom/` **of the project** (R-041), never from the
library: KERNAL, BASIC, Char ROM and `dos1541`. The project is the current
directory unless `project=` / `--project` says otherwise. They are fetched by
`svision/tools/retro/fetchroms.py c64`.

Tapes: an image passed as `image` is autostarted; a multiload game asks for
the other side later, which is `attach_tape()` — a monitor command placed at
the moment the game waits for it.

CLI:
    c64emu.py IMAGE --cycles 300000000 --screenshot build/boot.png
    c64emu.py IMAGE --break 0810 --dump 0800:ffff:build/mem.bin
    c64emu.py IMAGE --watch-store 0314 --cycles 20000000   # who takes the IRQ
    c64emu.py IMAGE --irq 82e8 --per-frame 2 --frames 50  # step by game frames
"""
import argparse, os, signal, subprocess, sys

ROMS = {'-kernal': 'kernal.901227-03.bin', '-basic': 'basic.901226-01.bin',
        '-chargen': 'characters.901225-01.bin', '-dos1541': 'dos1541'}
CYCLES_PER_FRAME_PAL = 19656          # 63 cycles * 312 lines
CYCLES_PER_FRAME_NTSC = 17095
# ★ measured 2026-09-19 (impossiblemission): `x64sc` with an emulated drive
# gives about 1 million cycles per second in `-warp`. Whoever only traces
# should use `fast=True` (x64 instead of x64sc).


class Result:
    def __init__(self, log, rc, cmds):
        self.log, self.rc, self.cmds = log, rc, cmds

    def mem(self, path):
        return open(path, 'rb').read()

    def hit(self):
        """True if the script reached a breakpoint (not just ran out of cycles)."""
        return 'BREAK:' in self.log


class C64Emu:
    def __init__(self, image=None, project=None, seed=12345, pal=True, warp=True,
                 basicload=True, drive_type=1541, true_drive=None, xvfb=True,
                 verbose=False, fast=False):
        self.image, self.seed, self.pal, self.warp = image, seed, pal, warp
        self.basicload, self.drive_type = basicload, drive_type
        # a .g64 with copy protection needs true drive emulation and no traps
        self.true_drive = (image or '').lower().endswith('.g64') if true_drive is None else true_drive
        self.xvfb, self.verbose, self.fast = xvfb, verbose, fast
        self.rom = os.path.join(os.path.abspath(project or os.getcwd()), 'sources', 'rom')
        self.cmds = []
        missing = [n for n in ROMS.values() if not os.path.exists(os.path.join(self.rom, n))]
        if missing:
            raise SystemExit('ROMs missing in %s: %s\n  '
                             'svision/tools/retro/fetchroms.py c64 --confirm   (R-041)'
                             % (self.rom, ', '.join(missing)))

    # --- monitor script --------------------------------------------------
    def cmd(self, text):
        self.cmds.append(text); return self

    def brk(self, addr, kind='exec', cond=None):
        c = 'break %s $%04x' % (kind, addr)
        if cond: c += ' if %s' % cond
        return self.cmd(c)

    def watch(self, addr, kind='store'):
        return self.cmd('watch %s $%04x' % (kind, addr))

    def go(self):
        return self.cmd('g')

    def until(self, addr):
        return self.cmd('until $%04x' % addr)

    def bsave(self, path, start, end, bank=None):
        """Save memory. ★ The monitor reads through the CPU's current banking,
        so `$A000`-`$BFFF` and `$E000`-`$FFFF` come out as ROM when the game
        has them mapped in — `bank='ram'` saves the RAM underneath (and leaves
        the monitor on `cpu` again afterwards)."""
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        if bank:
            self.cmd('bank %s' % bank)
        self.cmd('bsave "%s" 0 %04x %04x' % (path, start, end))
        return self.cmd('bank cpu') if bank else self

    def regs(self):
        return self.cmd('registers')

    def history(self, count=128):
        return self.cmd('cpuhistory %d' % count)

    def attach_tape(self, path, play=True):
        """Put another tape (or side) into the datasette — multiload.
        ★ VICE stops the datasette at the end of a tape and a new one comes
        in stopped, so `play` presses PLAY again (`tapectrl 1`)."""
        self.cmd('attach "%s" 1' % os.path.abspath(path))
        return self.cmd('tapectrl 1') if play else self

    def on_break(self, num, command):
        """A command executed on every hit of checkpoint `num`."""
        return self.cmd('command %d "%s"' % (num, command))

    def ignore(self, num, count):
        """Checkpoint `num` triggers only after `count` hits — stepping by frames.

        ★ **The VICE monitor reads numbers in hex**, so the count is sent
        with `$`: `ignore 1 50` would mean 80 hits, not 50."""
        return self.cmd('ignore %d $%x' % (num, count))

    def frames_after(self, irq_addr, frames, per_frame, checknum=1):
        """Stop after `frames` game frames, the handler at `irq_addr` running
        `per_frame` times a frame (a split raster interrupt runs more than
        once — impossiblemission `$82E8` twice). It is a per-game number,
        measured, not assumed."""
        self.brk(irq_addr)
        hits = max(1, frames*per_frame)
        if hits > 1:
            self.ignore(checknum, hits - 1)
        return self.go()

    # --- run -------------------------------------------------------------
    def run(self, cycles=None, frames=None, screenshot=None, initbreak='ready',
            monlog='build/run/monitor.log', moncmds='build/run/moncmds.txt', timeout=3600):
        if frames is not None:
            cycles = frames * (CYCLES_PER_FRAME_PAL if self.pal else CYCLES_PER_FRAME_NTSC)
        if cycles is None:
            cycles = 90_000_000
        for p in (monlog, moncmds):
            os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        # ★ `-monlog` **appends**, so without this the log would keep errors
        # from the previous run and one would look for them in today's
        open(monlog, 'w').close()
        script = list(self.cmds) + ['quit']
        open(moncmds, 'w').write('\n'.join(script) + '\n')

        args = ['x64' if self.fast else 'x64sc']
        for opt, name in ROMS.items():
            args += [opt, os.path.join(self.rom, name)]
        # clean palette and no CRT filter: otherwise a screenshot is not 16 colours
        args += ['-VICIIextpal', '-VICIIpalette', 'pepto-pal', '-VICIIfilter', '0']
        args += ['-drive8type', str(self.drive_type), '-sounddev', 'dummy',
                 '-pal' if self.pal else '-ntsc', '-seed', str(self.seed),
                 '-initbreak', initbreak, '-moncommands', moncmds,
                 '-monlog', '-monlogname', monlog, '-limitcycles', str(cycles)]
        if self.true_drive:
            args += ['-drive8truedrive', '+virtualdev8']
        if self.warp: args.append('-warp')
        if self.basicload: args.append('-basicload')
        if screenshot:
            os.makedirs(os.path.dirname(os.path.abspath(screenshot)), exist_ok=True)
            args += ['-exitscreenshot', screenshot]
        if self.image:
            args += ['-autostart', self.image]
        if self.xvfb:
            args = ['xvfb-run', '-a'] + args
        if self.verbose:
            print(' '.join(args), file=sys.stderr)
        # own process group: `xvfb-run` is a script and on timeout `x64sc`
        # would be left running orphaned (happened 2026-09-19)
        p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             start_new_session=True)
        try:
            rc = p.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(p.pid), signal.SIGKILL)
            p.wait()
            rc = -1
            print('c64emu: %d s was not enough, emulator killed (cycles %d)' % (timeout, cycles),
                  file=sys.stderr)
        log = open(monlog).read() if os.path.exists(monlog) else ''
        return Result(log, rc, script)


def main(emu=None, default_irq=None, default_per_frame=1, default_project=None):
    """The CLI. A project wrapper passes its own `emu` class and defaults
    (`impossiblemission/tools/c64emu.py` steps by `$82E8` twice a frame)."""
    emu = emu or C64Emu
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('image', nargs='?')
    ap.add_argument('--project', default=default_project,
                    help='project directory with sources/rom (default: cwd)')
    ap.add_argument('--cycles', type=int)
    ap.add_argument('--frames', type=int)
    ap.add_argument('--seed', type=int, default=12345)
    ap.add_argument('--fast', action='store_true', help='x64 instead of x64sc')
    ap.add_argument('--break', dest='brk', action='append', default=[], metavar='ADDR')
    ap.add_argument('--watch-store', action='append', default=[], metavar='ADDR')
    ap.add_argument('--dump', action='append', default=[], metavar='START:END:FILE')
    ap.add_argument('--screenshot')
    ap.add_argument('--history', type=int)
    ap.add_argument('--irq', metavar='ADDR', default='%04x' % default_irq if default_irq else None,
                    help="the game's frame interrupt handler (step = frame); empty = none")
    ap.add_argument('--per-frame', type=int, default=default_per_frame,
                    help='how many times --irq runs per frame')
    ap.add_argument('--verbose', action='store_true')
    a = ap.parse_args()

    e = emu(a.image, project=a.project, seed=a.seed, verbose=a.verbose, fast=a.fast)
    if a.irq:
        C64Emu.frames_after(e, int(a.irq, 16), a.frames or 1, a.per_frame)
    else:
        for x in a.brk:
            e.brk(int(x, 16))
        for x in a.watch_store:
            e.watch(int(x, 16))
        if a.brk or a.watch_store:
            e.go()
        elif a.image and a.dump:
            # without a checkpoint the monitor does not open again after `g`
            # and nothing else runs — the dump would be from READY, not the game
            print('warning: without --break/--watch-store/--irq the dump is the state '
                  'at the READY prompt, not after the game loaded', file=sys.stderr)
        elif a.image:
            # nothing to stop at: just run until the cycle limit (a screenshot run)
            e.go()
    e.regs()
    if a.history:
        e.history(a.history)
    for d in a.dump:
        start, end, path = d.split(':')
        e.bsave(path, int(start, 16), int(end, 16))
    r = e.run(cycles=a.cycles, frames=None if a.irq else a.frames, screenshot=a.screenshot)
    print(r.log.rstrip())
    print('\n[exit %d, %s]' % (r.rc, 'stopped at a checkpoint' if r.hit() else 'ran out of cycles'))


if __name__ == '__main__':
    main()
