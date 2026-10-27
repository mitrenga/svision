#!/usr/bin/env python3
"""disPDP11 — a tracing PDP-11 disassembler over a memory image (64 KB).

It walks recursively from the entry points along branches, JMP and JSR;
what it reaches is code, the rest of the range is data. Output is a
MACRO-11 style listing in octal: address, instruction words, label,
mnemonic and operands, with RT-11 programmed requests (EMT) and device
registers named. Coverage and the places left unresolved go to stderr.

    disPDP11.py PROGRAM.SAV [--lo 1000] [--hi TOP] [--entry 17272]
        [--hints hints.json] [--coverage pcs.txt] [--title T] -o main.asm

An RT-11 ``.SAV`` file is a memory image from address 0, so it is read as
is. Without ``--entry`` the start address from location 40 is used, without
``--hi`` the program top from location 50. Addresses on the command line,
in hints and in coverage files are octal.

hints.json: {"entries": ["17272"], "labels": {"17272": "start"},
             "data": [["13416", "13460", "title"]], "text": [["16230", "16540", "field"]],
             "jsrArgs": {"20000": 2}, "jsrInline": {"23632": ["w", "w", "t"]},
             "comments": {"17272": "..."}}

- ``data``: ranges (start inclusive, end exclusive) that are never code.
- ``tables``: jump tables ``[address, entries, name]``; every entry is an
  address of code. A computed jump through a table (``JMP @table(Rn)``) is
  then resolved.
- ``text``: like data, shown as KOI-7 text (lower-case Latin = Cyrillic).
- ``jsrArgs``: routines called ``JSR Rn,routine`` (n other than PC) that
  take N inline words after the call; the tracer skips them and lists them
  as arguments.
- ``jsrInline``: the same with a layout: ``w`` is a word, ``t`` is text
  whose length in bytes is the previous word, padded to a word.
- A ``JSR Rn`` (n other than PC) without a hint is reported as unresolved.

coverage: lines with octal PC addresses from a run (first token on a line),
added as entry points. A shared tool (R-008), first consumer `tetris`
(Elektronika 60, RT-11).
"""
import argparse, json, sys

# RT-11 programmed requests. EMT 340-357 take arguments in registers or on
# the stack; EMT 374/375 take a function code in the high byte of R0.
EMT_NAMES = {
    0o340: '.TTYIN', 0o341: '.TTYOUT', 0o342: '.DSTATUS', 0o343: '.FETCH/.RELEAS',
    0o344: '.CSIGEN', 0o345: '.CSISPC', 0o346: '.LOCK', 0o347: '.UNLOCK',
    0o350: '.EXIT', 0o351: '.PRINT', 0o352: '.SRESET', 0o353: '.QSET',
    0o354: '.SETTOP', 0o355: '.RCTRLO', 0o357: '.HRESET',
    0o374: 'EMT374 (R0: .WAIT .SPND .RSUM .PURGE .SERR .HERR .CLOSE .TLOCK .CHAIN .MWAIT .DATE .ABTIO)',
    0o375: 'EMT375 (R0 high byte = request code)',
}

# memory-mapped registers and fixed locations of an LSI-11 under RT-11
SYMBOLS = {
    0o40: 'USERPC', 0o42: 'USERSP', 0o44: 'JSW', 0o46: 'USRSWP', 0o50: 'USERTOP',
    0o52: 'ERRBYT', 0o53: 'USERRB', 0o54: 'SYSPTR', 0o56: 'TTFILL',
    0o177546: 'LKS', 0o177560: 'TKS', 0o177562: 'TKB', 0o177564: 'TPS', 0o177566: 'TPB',
    0o177776: 'PSW',
}

REG = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'SP', 'PC']

DOUBLE = {0o01: 'MOV', 0o02: 'CMP', 0o03: 'BIT', 0o04: 'BIC', 0o05: 'BIS', 0o06: 'ADD',
          0o11: 'MOVB', 0o12: 'CMPB', 0o13: 'BITB', 0o14: 'BICB', 0o15: 'BISB', 0o16: 'SUB'}
SINGLE = {0o0050: 'CLR', 0o0051: 'COM', 0o0052: 'INC', 0o0053: 'DEC', 0o0054: 'NEG',
          0o0055: 'ADC', 0o0056: 'SBC', 0o0057: 'TST', 0o0060: 'ROR', 0o0061: 'ROL',
          0o0062: 'ASR', 0o0063: 'ASL', 0o0065: 'MFPI', 0o0066: 'MTPI', 0o0067: 'SXT',
          0o1050: 'CLRB', 0o1051: 'COMB', 0o1052: 'INCB', 0o1053: 'DECB', 0o1054: 'NEGB',
          0o1055: 'ADCB', 0o1056: 'SBCB', 0o1057: 'TSTB', 0o1060: 'RORB', 0o1061: 'ROLB',
          0o1062: 'ASRB', 0o1063: 'ASLB', 0o1064: 'MTPS', 0o1065: 'MFPD', 0o1066: 'MTPD',
          0o1067: 'MFPS', 0o0001: 'JMP', 0o0003: 'SWAB'}
BRANCH = {0o0004: 'BR', 0o0010: 'BNE', 0o0014: 'BEQ', 0o0020: 'BGE', 0o0024: 'BLT',
          0o0030: 'BGT', 0o0034: 'BLE', 0o1000: 'BPL', 0o1004: 'BMI', 0o1010: 'BHI',
          0o1014: 'BLOS', 0o1020: 'BVC', 0o1024: 'BVS', 0o1030: 'BCC', 0o1034: 'BCS'}
EIS = {0o070: 'MUL', 0o071: 'DIV', 0o072: 'ASH', 0o073: 'ASHC', 0o074: 'XOR'}
FIS = {0o07500: 'FADD', 0o07501: 'FSUB', 0o07502: 'FMUL', 0o07503: 'FDIV'}
ZERO = {0: 'HALT', 1: 'WAIT', 2: 'RTI', 3: 'BPT', 4: 'IOT', 5: 'RESET', 6: 'RTT', 7: 'MFPT'}
CC = 'CVZN'

CYRILLIC = 'ЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧ'


def koi7(b):
    b &= 0x7f
    if 0x60 <= b <= 0x7e:
        return CYRILLIC[b - 0x60]
    if 0x20 <= b < 0x7f:
        return chr(b)
    return '.'


def octal(text):
    return int(text, 8)


class Instruction:
    """One decoded instruction: mnemonic, operand fields and control flow."""

    def __init__(self, pc, words, mnemonic, operands, flow, targets):
        self.pc = pc
        self.words = words          # number of words incl. extension words
        self.mnemonic = mnemonic
        self.operands = operands    # list of (mode, reg, extension word or None)
        self.flow = flow            # 'next', 'jump', 'call', 'branch', 'stop'
        self.targets = targets      # resolved addresses of jumps, calls, branches


class Dis:
    def __init__(self, mem, lo, hi, hints):
        self.mem, self.lo, self.hi = mem, lo, hi
        self.kind = {}          # word address → 'code', 'in', 'data', 'text', 'arg'
        self.insn = {}
        self.labels = {octal(k): v for k, v in hints.get('labels', {}).items()}
        self.comments = {octal(k): v for k, v in hints.get('comments', {}).items()}
        self.jsr_args = {octal(k): ['w'] * v for k, v in hints.get('jsrArgs', {}).items()}
        self.jsr_args.update({octal(k): v for k, v in hints.get('jsrInline', {}).items()})
        self.data_ranges = [(octal(a), octal(b), t, 'data') for a, b, t in hints.get('data', [])]
        self.data_ranges += [(octal(a), octal(b), t, 'text') for a, b, t in hints.get('text', [])]
        self.refs = {}
        self.unresolved = []
        self.tables = {octal(a): (n, name) for a, n, name in hints.get('tables', [])}
        for a, (n, name) in self.tables.items():
            self.labels.setdefault(a, name)
            for i in range(n):
                self.kind[a + 2 * i] = 'table'
        self.plain = False      # numbers instead of labels (for --check-simh)
        for a, b, _, kind in self.data_ranges:
            for x in range(a & ~1, b, 2):
                self.kind[x] = kind

    def word(self, a):
        return self.mem[a] | self.mem[a + 1] << 8 if a + 1 < len(self.mem) else 0

    def ref(self, target, src):
        self.refs.setdefault(target, set()).add(src)

    # decoding

    def operand(self, pc, field, ext_at):
        """Decodes a 6-bit operand; returns (mode, reg, ext, words used, address)."""
        mode, reg = field >> 3, field & 7
        if mode >= 6 or (reg == 7 and mode in (2, 3)):
            ext = self.word(ext_at)
            address = None
            if reg == 7 and mode in (6, 7):
                address = (ext_at + 2 + ext) & 0xffff
            elif reg == 7 and mode == 3:
                address = ext
            return mode, reg, ext, 1, address
        return mode, reg, None, 0, None

    def decode(self, pc):
        w = self.word(pc)
        top = w >> 12
        ops = []
        n = 1
        flow = 'next'
        targets = []

        def take(field):
            nonlocal n
            mode, reg, ext, used, address = self.operand(pc, field, pc + 2 * n)
            n += used
            ops.append((mode, reg, ext, address))
            return mode, reg, address

        name = DOUBLE.get(top)
        if name:
            take((w >> 6) & 0o77)
            mode, reg, _ = take(w & 0o77)
            if reg == 7 and mode == 0 and name in ('MOV', 'ADD', 'SUB', 'BIC', 'BIS'):
                flow = 'jump'   # computed jump through PC
            return Instruction(pc, n, name, ops, flow, targets)
        if top == 0o07:
            sub = (w >> 9) & 7
            if (w >> 9) in EIS:
                ops.append((0, (w >> 6) & 7, None, None))
                take(w & 0o77)
                if EIS[w >> 9] != 'XOR':
                    ops.reverse()   # MUL src,R; XOR R,dst
                return Instruction(pc, n, EIS[w >> 9], ops, flow, targets)
            if sub == 7:    # SOB
                t = pc + 2 - 2 * (w & 0o77)
                targets.append(t)
                ops.append((0, (w >> 6) & 7, None, None))
                ops.append(('addr', t))
                return Instruction(pc, 1, 'SOB', ops, 'branch', targets)
            if (w >> 3) in FIS:
                ops.append((0, w & 7, None, None))
                return Instruction(pc, 1, FIS[w >> 3], ops, flow, targets)
            return None
        hi8 = w >> 8
        hi10 = w >> 6
        if hi8 in (0o001, 0o002, 0o003, 0o004, 0o005, 0o006, 0o007) or (0o200 <= hi8 <= 0o207):
            name = BRANCH.get((w & 0o177400) >> 6)
            if name:
                off = w & 0o377
                if off & 0o200:
                    off -= 0o400
                t = (pc + 2 + 2 * off) & 0xffff
                targets.append(t)
                ops.append(('addr', t))
                return Instruction(pc, 1, name, ops, 'jump' if name == 'BR' else 'branch', targets)
        if 0o104000 <= w <= 0o104377:
            code = w & 0o377
            return Instruction(pc, 1, 'EMT', [('num', code)], 'next', targets)
        if 0o104400 <= w <= 0o104777:
            return Instruction(pc, 1, 'TRAP', [('num', w & 0o377)], 'next', targets)
        if w >> 9 == 0o004:     # JSR
            reg = (w >> 6) & 7
            ops.append((0, reg, None, None))
            mode, r, address = take(w & 0o77)
            if mode == 0:
                return None
            if address is not None and mode in (6, 3):
                targets.append(address)
            return Instruction(pc, n, 'JSR', ops, 'call', targets)
        if w & 0o177770 == 0o000200:
            ops.append((0, w & 7, None, None))
            return Instruction(pc, 1, 'RTS', ops, 'stop', targets)
        if w & 0o177770 == 0o000230:
            return Instruction(pc, 1, 'SPL', [('num', w & 7)], 'next', targets)
        if 0o000240 <= w <= 0o000277:
            if w == 0o240:
                return Instruction(pc, 1, 'NOP', [], 'next', targets)
            bits = w & 0o17
            prefix = 'SE' if w & 0o20 else 'CL'
            if bits == 0o17:
                return Instruction(pc, 1, 'SCC' if w & 0o20 else 'CCC', [], 'next', targets)
            names = [prefix + CC[i] for i in range(4) if bits & (1 << i)]
            return Instruction(pc, 1, '!'.join(names), [], 'next', targets)
        if w & 0o177700 == 0o006400:    # MARK
            return Instruction(pc, 1, 'MARK', [('num', w & 0o77)], 'stop', targets)
        if w in ZERO:
            name = ZERO[w]
            return Instruction(pc, 1, name, [], 'stop' if name in ('HALT', 'RTI', 'RTT') else 'next', targets)
        name = SINGLE.get(hi10)
        if name:
            mode, reg, address = take(w & 0o77)
            if name == 'JMP':
                if mode == 0:
                    return None
                if address is not None and mode in (6, 3):
                    targets.append(address)
                return Instruction(pc, n, name, ops, 'jump', targets)
            return Instruction(pc, n, name, ops, flow, targets)
        return None

    # tracing

    def trace(self, start):
        queue = [start]
        while queue:
            pc = queue.pop()
            while self.lo <= pc < self.hi and pc not in self.kind:
                if pc & 1:
                    self.unresolved.append((pc, 'odd address'))
                    break
                ins = self.decode(pc)
                if ins is None:
                    self.unresolved.append((pc, 'not an instruction %06o' % self.word(pc)))
                    self.kind[pc] = 'data'
                    break
                if any(self.kind.get(pc + 2 * i) for i in range(1, ins.words)):
                    self.unresolved.append((pc, 'instruction overlaps known words'))
                    break
                self.kind[pc] = 'code'
                self.insn[pc] = ins
                for i in range(1, ins.words):
                    self.kind[pc + 2 * i] = 'in'
                for t in ins.targets:
                    self.ref(t, pc)
                    queue.append(t)
                nxt = pc + 2 * ins.words
                if ins.flow == 'call' and ins.targets and ins.operands[0][1] != 7:
                    spec = self.jsr_args.get(ins.targets[0])
                    if spec is None:
                        self.unresolved.append((pc, 'JSR %s to %06o: inline arguments unknown'
                                                % (REG[ins.operands[0][1]], ins.targets[0])))
                        spec = []
                    last = 0
                    for item in spec:
                        if item == 'w':
                            last = self.word(nxt)
                            self.kind[nxt] = 'arg'
                            nxt += 2
                        else:
                            for i in range(0, last + 1 & ~1, 2):
                                self.kind[nxt + i] = 'text'
                            nxt += last + 1 & ~1
                through = [o[2] for o in ins.operands if isinstance(o[0], int) and o[0] in (6, 7) and o[2] in self.tables]
                if ins.flow == 'call' and not ins.targets and not through:
                    self.unresolved.append((pc, 'computed call'))
                if ins.flow == 'jump' and not ins.targets and not through:
                    self.unresolved.append((pc, 'computed jump'))
                if ins.flow in ('jump', 'stop'):
                    break
                pc = nxt

    # output

    def label(self, a):
        if a in self.labels:
            return self.labels[a]
        if a in SYMBOLS:
            return SYMBOLS[a]
        return None

    def name(self, a):
        if self.plain:
            return '%o' % a
        l = self.label(a)
        if l:
            return l
        if self.lo <= a < self.hi or a in self.refs:
            return 'L%06o' % a
        return '%o' % a

    def fmt_operand(self, op, pc):
        if op[0] == 'addr':
            return self.name(op[1])
        if op[0] == 'num':
            return '%o' % op[1]
        mode, reg, ext, address = op
        r = REG[reg]
        if reg == 7:
            if mode == 2:
                return '#%o' % ext
            if mode == 3:
                return '@#' + self.name(ext)
            if mode == 6:
                return self.name(address)
            if mode == 7:
                return '@' + self.name(address)
        if mode == 6:
            return '%o(%s)' % (ext, r)
        if mode == 7:
            return '@%o(%s)' % (ext, r)
        return {0: r, 1: '(%s)' % r, 2: '(%s)+' % r, 3: '@(%s)+' % r, 4: '-(%s)' % r,
                5: '@-(%s)' % r}[mode]

    def output(self, out, title=''):
        w = out.write
        w('; %s\n; disPDP11.py: tracing disassembly, range %06o-%06o (octal)\n\n' % (title, self.lo, self.hi - 1))
        pc = self.lo & ~1
        while pc < self.hi:
            k = self.kind.get(pc)
            lab = self.label(pc) or ('L%06o' % pc if pc in self.refs else '')
            if pc in self.comments:
                w('\n; %s\n' % self.comments[pc])
            if k == 'code':
                ins = self.insn[pc]
                words = ' '.join('%06o' % self.word(pc + 2 * i) for i in range(ins.words))
                text = ins.mnemonic
                if ins.operands:
                    text += ' ' + ','.join(self.fmt_operand(o, pc) for o in ins.operands)
                note = ''
                if ins.mnemonic == 'EMT':
                    note = EMT_NAMES.get(ins.operands[0][1], '')
                w(('%06o: %-20s %-10s %s' % (pc, words, lab + ':' if lab else '', text)).rstrip()
                  + ('    ; ' + note if note else '') + '\n')
                pc += 2 * ins.words
            elif k == 'table':
                w(('%06o: %-20s %-10s .WORD %s' % (pc, '%06o' % self.word(pc), lab + ':' if lab else '',
                                                  self.name(self.word(pc)))).rstrip() + '\n')
                pc += 2
            elif k == 'arg':
                w(('%06o: %-20s %-10s .WORD %s' % (pc, '%06o' % self.word(pc), lab + ':' if lab else '',
                                                  self.name(self.word(pc)))).rstrip() + '    ; inline argument\n')
                pc += 2
            else:
                start = pc
                end = pc + 2
                while end < self.hi and self.kind.get(end) == k and not (self.label(end) or end in self.refs or end in self.comments):
                    end += 2
                typ = next((t for a, b, t, _ in self.data_ranges if a <= start < b), 'data' if k else 'unclassified')
                if lab or k in ('data', 'text'):
                    w('\n%s  ; %s, %d B\n' % ((lab or 'D%06o' % start) + ':', typ, end - start))
                for i in range(start, end, 16 if k != 'text' else 32):
                    stop = min(i + (16 if k != 'text' else 32), end)
                    chunk = self.mem[i:stop]
                    if k == 'text':
                        w('%06o: .ASCII /%s/\n' % (i, ''.join(koi7(c) for c in chunk)))
                    else:
                        words = ','.join('%06o' % self.word(a) for a in range(i, stop, 2))
                        w('%06o: .WORD %s   ; %s\n' % (i, words, ''.join(koi7(c) for c in chunk)))
                pc = end

    def text(self, pc):
        ins = self.insn[pc]
        if not ins.operands:
            return ins.mnemonic
        return ins.mnemonic + ' ' + ','.join(self.fmt_operand(o, pc) for o in ins.operands)

    def check_simh(self):
        """Compares every decoded instruction with SIMH's own disassembler.

        Loads the range into a fresh SIMH PDP-11 and runs 'examine -m' on each
        code address. Returns (checked, differences).
        """
        import pexpect
        sim = pexpect.spawn('pdp11', timeout=30)
        sim.delaybeforesend = None

        def command(line):
            sim.sendline(line.encode())
            sim.expect(b'sim> ')
            return sim.before.decode('latin-1').split('\r\n', 1)[-1]

        sim.expect(b'sim> ')
        command('set cpu 11/03')
        command('set cpu 64k')
        for a in range(self.lo & ~1, self.hi, 2):
            command('deposit %o %o' % (a, self.word(a)))
        self.plain = True
        diffs = []
        for pc in sorted(self.insn):
            got = command('examine -m %o' % pc).strip()
            theirs = got.split('\t', 1)[1].strip() if '\t' in got else got
            ours = self.text(pc)
            if ours != theirs:
                diffs.append((pc, ours, theirs))
        self.plain = False
        sim.sendline(b'exit')
        sim.expect(pexpect.EOF)
        return len(self.insn), diffs

    def coverage(self):
        code = sum(2 for a in range(self.lo & ~1, self.hi, 2) if self.kind.get(a) in ('code', 'in', 'arg'))
        data = sum(2 for a in range(self.lo & ~1, self.hi, 2) if self.kind.get(a) in ('data', 'text', 'table'))
        return code, data, self.hi - (self.lo & ~1) - code - data


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('mem')
    ap.add_argument('--lo', default='1000')
    ap.add_argument('--hi')
    ap.add_argument('--entry', action='append', default=[])
    ap.add_argument('--hints')
    ap.add_argument('--coverage')
    ap.add_argument('--title', default='')
    ap.add_argument('-o', default='-')
    ap.add_argument('--check-simh', action='store_true', help='compare each instruction with SIMH examine -m')
    a = ap.parse_args()
    mem = bytearray(open(a.mem, 'rb').read())
    mem += bytes(0x10000 - len(mem)) if len(mem) < 0x10000 else b''
    hints = json.load(open(a.hints)) if a.hints else {}
    d0 = mem[0o40] | mem[0o41] << 8
    top = mem[0o50] | mem[0o51] << 8
    hi = octal(a.hi) if a.hi else top + 2
    d = Dis(mem, octal(a.lo), hi, hints)
    entries = [octal(x) for x in a.entry] + [octal(x) for x in hints.get('entries', [])]
    if not entries:
        entries = [d0]
    for a_, (n, _) in d.tables.items():
        for i in range(n):
            entries.append(d.word(a_ + 2 * i))
    for e in entries:
        d.ref(e, -1)
        d.trace(e)
    executed = []
    if a.coverage:
        for line in open(a.coverage):
            line = line.split('#')[0].split()
            if line and d.lo <= octal(line[0]) < d.hi:
                executed.append(octal(line[0]))
        # executed PCs are code, but not labels of their own
        for pc in executed:
            d.trace(pc)
    out = sys.stdout if a.o == '-' else open(a.o, 'w')
    d.output(out, a.title)
    code, data, unk = d.coverage()
    total = d.hi - (d.lo & ~1)
    sys.stderr.write('disPDP11: code %d B (%.1f %%), data %d B, unclassified %d B; unresolved %d\n'
                     % (code, 100 * code / total, data, unk, len(d.unresolved)))
    for pc, why in d.unresolved[:60]:
        sys.stderr.write('  %06o: %s\n' % (pc, why))
    if executed:
        stray = [pc for pc in executed if d.kind.get(pc) != 'code']
        sys.stderr.write('coverage: %d executed PCs in range, %d not at an instruction start\n'
                         % (len(executed), len(stray)))
        for pc in stray[:20]:
            sys.stderr.write('  %06o: executed, but %s\n' % (pc, d.kind.get(pc, 'unclassified')))
    if a.check_simh:
        checked, diffs = d.check_simh()
        sys.stderr.write('check against SIMH: %d instructions, %d differences\n' % (checked, len(diffs)))
        for pc, ours, theirs in diffs[:40]:
            sys.stderr.write('  %06o: ours %-30s SIMH %s\n' % (pc, ours, theirs))


if __name__ == '__main__':
    main()
