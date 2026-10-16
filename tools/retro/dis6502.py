#!/usr/bin/env python3
"""dis6502 — a tracing 6502 disassembler over a memory image (64 KB).

It walks recursively from the entry points along JSR/JMP/branches; what it
reaches is code, the rest of the range is data. Indirect jumps (JMP (abs))
are resolved from the memory image plus the hints. Output: a listing with
address, bytes, labels and OS / hardware symbols; coverage; a list of the
places left unresolved.

    dis6502.py MEM.bin --lo 0900 --hi 4CC0 --entry 2A02 --entry 2629 \
        [--machine atari8|c64] [--hints hints.json] [--coverage samples.txt] -o main.asm

A shared tool (R-008): its first consumer was `boulderdash` (Atari 8-bit),
the second `impossiblemission` (C64) — which is why it moved here. The
symbol table is **per machine** (`--machine`, `atari8` by default).

hints.json: {"entries": ["1BB0"], "labels": {"0876": "mode"},
             "data": [["4000","4800","charset"]], "vectors": {"0088": ["1234"]}}
coverage: lines with hex PC addresses from a run — added as entry points.
"""
import sys, json, argparse

# opcode table: (mnemonic, mode). modes: imp, acc, imm, zp, zpx, zpy, abs, abx, aby, ind, izx, izy, rel
OPS = {}
def _t(code, mn, mode): OPS[code] = (mn, mode)
_std = {  # mnemonic: {mode: opcode}
 'ADC':{'imm':0x69,'zp':0x65,'zpx':0x75,'abs':0x6D,'abx':0x7D,'aby':0x79,'izx':0x61,'izy':0x71},
 'AND':{'imm':0x29,'zp':0x25,'zpx':0x35,'abs':0x2D,'abx':0x3D,'aby':0x39,'izx':0x21,'izy':0x31},
 'ASL':{'acc':0x0A,'zp':0x06,'zpx':0x16,'abs':0x0E,'abx':0x1E},
 'BIT':{'zp':0x24,'abs':0x2C},
 'CMP':{'imm':0xC9,'zp':0xC5,'zpx':0xD5,'abs':0xCD,'abx':0xDD,'aby':0xD9,'izx':0xC1,'izy':0xD1},
 'CPX':{'imm':0xE0,'zp':0xE4,'abs':0xEC}, 'CPY':{'imm':0xC0,'zp':0xC4,'abs':0xCC},
 'DEC':{'zp':0xC6,'zpx':0xD6,'abs':0xCE,'abx':0xDE},
 'EOR':{'imm':0x49,'zp':0x45,'zpx':0x55,'abs':0x4D,'abx':0x5D,'aby':0x59,'izx':0x41,'izy':0x51},
 'INC':{'zp':0xE6,'zpx':0xF6,'abs':0xEE,'abx':0xFE},
 'JMP':{'abs':0x4C,'ind':0x6C}, 'JSR':{'abs':0x20},
 'LDA':{'imm':0xA9,'zp':0xA5,'zpx':0xB5,'abs':0xAD,'abx':0xBD,'aby':0xB9,'izx':0xA1,'izy':0xB1},
 'LDX':{'imm':0xA2,'zp':0xA6,'zpy':0xB6,'abs':0xAE,'aby':0xBE},
 'LDY':{'imm':0xA0,'zp':0xA4,'zpx':0xB4,'abs':0xAC,'abx':0xBC},
 'LSR':{'acc':0x4A,'zp':0x46,'zpx':0x56,'abs':0x4E,'abx':0x5E},
 'ORA':{'imm':0x09,'zp':0x05,'zpx':0x15,'abs':0x0D,'abx':0x1D,'aby':0x19,'izx':0x01,'izy':0x11},
 'ROL':{'acc':0x2A,'zp':0x26,'zpx':0x36,'abs':0x2E,'abx':0x3E},
 'ROR':{'acc':0x6A,'zp':0x66,'zpx':0x76,'abs':0x6E,'abx':0x7E},
 'SBC':{'imm':0xE9,'zp':0xE5,'zpx':0xF5,'abs':0xED,'abx':0xFD,'aby':0xF9,'izx':0xE1,'izy':0xF1},
 'STA':{'zp':0x85,'zpx':0x95,'abs':0x8D,'abx':0x9D,'aby':0x99,'izx':0x81,'izy':0x91},
 'STX':{'zp':0x86,'zpy':0x96,'abs':0x8E}, 'STY':{'zp':0x84,'zpx':0x94,'abs':0x8C},
}
for mn, modes in _std.items():
    for mode, code in modes.items(): _t(code, mn, mode)
for code, mn in {0x00:'BRK',0x08:'PHP',0x18:'CLC',0x28:'PLP',0x38:'SEC',0x40:'RTI',0x48:'PHA',0x58:'CLI',0x60:'RTS',
                 0x68:'PLA',0x78:'SEI',0x88:'DEY',0x8A:'TXA',0x98:'TYA',0x9A:'TXS',0xA8:'TAY',0xAA:'TAX',0xB8:'CLV',
                 0xBA:'TSX',0xC8:'INY',0xCA:'DEX',0xD8:'CLD',0xE8:'INX',0xEA:'NOP',0xF8:'SED'}.items(): _t(code, mn, 'imp')
for code, mn in {0x10:'BPL',0x30:'BMI',0x50:'BVC',0x70:'BVS',0x90:'BCC',0xB0:'BCS',0xD0:'BNE',0xF0:'BEQ'}.items(): _t(code, mn, 'rel')
LEN = {'imp':1,'acc':1,'imm':2,'zp':2,'zpx':2,'zpy':2,'abs':3,'abx':3,'aby':3,'ind':3,'izx':2,'izy':2,'rel':2}

# Atari symbols (OS shadows, hardware) — only those useful in a disassembly
SYMS_ATARI8 = {0x0A:'DOSVEC',0x0C:'DOSINI',0x12:'RTCLOK',0x13:'RTCLOK+1',0x14:'RTCLOK+2',0x42:'CRITIC',0x4D:'ATRACT',
 0x200:'VDSLST',0x222:'VVBLKI',0x224:'VVBLKD',0x22F:'SDMCTL',0x230:'SDLSTL',0x231:'SDLSTH',0x244:'COLDST',
 0x26F:'GPRIOR',0x278:'STICK0',0x279:'STICK1',0x284:'STRIG0',0x285:'STRIG1',0x2C4:'COLOR0',0x2C5:'COLOR1',
 0x2C6:'COLOR2',0x2C7:'COLOR3',0x2C8:'COLOR4',0x2F0:'CRSINH',0x2F4:'CHBAS',0x2FC:'CH',
 0xD000:'HPOSP0',0xD001:'HPOSP1',0xD002:'HPOSP2',0xD003:'HPOSP3',0xD012:'COLPM0',0xD014:'PAL',0xD016:'COLPF0',
 0xD017:'COLPF1',0xD018:'COLPF2',0xD019:'COLPF3',0xD01A:'COLBK',0xD01B:'PRIOR',0xD01D:'GRACTL',0xD01F:'CONSOL',
 0xD200:'AUDF1',0xD201:'AUDC1',0xD202:'AUDF2',0xD203:'AUDC2',0xD204:'AUDF3',0xD205:'AUDC3',0xD206:'AUDF4',
 0xD207:'AUDC4',0xD208:'AUDCTL',0xD209:'KBCODE',0xD20A:'RANDOM',0xD20E:'IRQEN',0xD20F:'SKCTL',0xD300:'PORTA',
 0xD400:'DMACTL',0xD401:'CHACTL',0xD402:'DLISTL',0xD403:'DLISTH',0xD404:'HSCROL',0xD405:'VSCROL',0xD407:'PMBASE',
 0xD409:'CHBASE',0xD40A:'WSYNC',0xD40B:'VCOUNT',0xD40E:'NMIEN',0xD40F:'NMIRES',
 0xE45C:'SETVBV',0xE45F:'SYSVBV',0xE462:'XITVBV',0xE474:'WARMSV',0xE477:'COLDSV'}

# Commodore 64 symbols: zero page, VIC-II, SID, CIA, KERNAL vectors
SYMS_C64 = {
 0x00:'D6510', 0x01:'R6510', 0x02A6:'PALNTSC', 0x0314:'CINV', 0x0315:'CINV+1',
 0x0316:'CBINV', 0x0318:'NMINV', 0x0319:'NMINV+1', 0x0288:'HIBASE',
 0xD000:'SP0X',0xD001:'SP0Y',0xD002:'SP1X',0xD003:'SP1Y',0xD004:'SP2X',0xD005:'SP2Y',
 0xD006:'SP3X',0xD007:'SP3Y',0xD008:'SP4X',0xD009:'SP4Y',0xD00A:'SP5X',0xD00B:'SP5Y',
 0xD00C:'SP6X',0xD00D:'SP6Y',0xD00E:'SP7X',0xD00F:'SP7Y',0xD010:'MSIGX',
 0xD011:'SCROLY',0xD012:'RASTER',0xD013:'LPENX',0xD014:'LPENY',0xD015:'SPENA',
 0xD016:'SCROLX',0xD017:'YXPAND',0xD018:'VMCSB',0xD019:'VICIRQ',0xD01A:'IRQMASK',
 0xD01B:'SPBGPR',0xD01C:'SPMC',0xD01D:'XXPAND',0xD01E:'SPSPCL',0xD01F:'SPBGCL',
 0xD020:'EXTCOL',0xD021:'BGCOL0',0xD022:'BGCOL1',0xD023:'BGCOL2',0xD024:'BGCOL3',
 0xD025:'SPMC0',0xD026:'SPMC1',0xD027:'SP0COL',0xD028:'SP1COL',0xD029:'SP2COL',
 0xD02A:'SP3COL',0xD02B:'SP4COL',0xD02C:'SP5COL',0xD02D:'SP6COL',0xD02E:'SP7COL',
 0xD400:'FRELO1',0xD401:'FREHI1',0xD402:'PWLO1',0xD403:'PWHI1',0xD404:'VCREG1',
 0xD405:'ATDCY1',0xD406:'SUREL1',0xD407:'FRELO2',0xD408:'FREHI2',0xD409:'PWLO2',
 0xD40A:'PWHI2',0xD40B:'VCREG2',0xD40C:'ATDCY2',0xD40D:'SUREL2',0xD40E:'FRELO3',
 0xD40F:'FREHI3',0xD410:'PWLO3',0xD411:'PWHI3',0xD412:'VCREG3',0xD413:'ATDCY3',
 0xD414:'SUREL3',0xD415:'CUTLO',0xD416:'CUTHI',0xD417:'RESON',0xD418:'SIGVOL',
 0xD419:'POTX',0xD41A:'POTY',0xD41B:'RANDOM',0xD41C:'ENV3',
 0xDC00:'CIAPRA',0xDC01:'CIAPRB',0xDC02:'CIDDRA',0xDC03:'CIDDRB',0xDC04:'TIMALO',
 0xDC05:'TIMAHI',0xDC06:'TIMBLO',0xDC07:'TIMBHI',0xDC0D:'CIAICR',0xDC0E:'CIACRA',
 0xDC0F:'CIACRB',0xDD00:'CI2PRA',0xDD01:'CI2PRB',0xDD0D:'CI2ICR',0xDD0E:'C2CRA',
 0xFFFA:'NMIVEC',0xFFFC:'RESVEC',0xFFFE:'IRQVEC',
 0xEA31:'KERNIRQ',0xFF81:'CINT',0xFFD2:'CHROUT',0xFFE4:'GETIN',0xFFEA:'UDTIM',
}

MACHINES = {'atari8': SYMS_ATARI8, 'c64': SYMS_C64}
SYMS = SYMS_ATARI8          # the default; --machine overrides it


class Dis:
    def __init__(self, mem, lo, hi, hints):
        self.mem, self.lo, self.hi = mem, lo, hi
        self.kind = {}          # addr → 'code' (start), 'in' (inside an instruction), 'data'
        self.labels = {int(k, 16): v for k, v in hints.get('labels', {}).items()}
        self.vectors = {int(k, 16): [int(x, 16) for x in v] for k, v in hints.get('vectors', {}).items()}
        self.data_ranges = [(int(a, 16), int(b, 16), t) for a, b, t in hints.get('data', [])]
        self.refs = {}          # target → set of sources
        self.unresolved = []    # (addr, description)
        self.queue = []
        for a, b, t in self.data_ranges:
            for x in range(a, b): self.kind[x] = 'data'

    def label(self, a):
        if a in self.labels: return self.labels[a]
        if a in SYMS: return SYMS[a]
        return None

    def ref(self, target, src):
        self.refs.setdefault(target, set()).add(src)

    def trace(self, start):
        self.queue.append(start)
        while self.queue:
            pc = self.queue.pop()
            while self.lo <= pc < self.hi and self.kind.get(pc) is None:
                op = self.mem[pc]
                if op not in OPS: self.unresolved.append((pc, f'unknown opcode ${op:02X}')); self.kind[pc] = 'data'; break
                mn, mode = OPS[op]; n = LEN[mode]
                if any(self.kind.get(pc + i) == 'data' for i in range(1, n)): self.kind[pc] = 'data'; break
                self.kind[pc] = 'code'
                for i in range(1, n): self.kind[pc + i] = 'in'
                if mode == 'rel':
                    t = pc + 2 + ((self.mem[pc + 1] ^ 0x80) - 0x80); self.ref(t, pc); self.queue.append(t)
                elif mn == 'JSR':
                    t = self.mem[pc + 1] | self.mem[pc + 2] << 8; self.ref(t, pc); self.queue.append(t)
                elif mn == 'JMP':
                    if mode == 'abs':
                        t = self.mem[pc + 1] | self.mem[pc + 2] << 8; self.ref(t, pc); self.queue.append(t)
                    else:
                        v = self.mem[pc + 1] | self.mem[pc + 2] << 8
                        targets = set(self.vectors.get(v, []))
                        tv = self.mem[v] | self.mem[v + 1] << 8
                        if self.lo <= tv < self.hi: targets.add(tv)
                        if not targets: self.unresolved.append((pc, f'JMP (${v:04X}) without a target'))
                        for t in targets: self.ref(t, pc); self.queue.append(t)
                    break
                elif mn in ('RTS', 'RTI', 'BRK'): break
                pc += n

    def fmt_operand(self, pc, mode):
        m = self.mem
        if mode in ('imp',): return ''
        if mode == 'acc': return 'A'
        if mode == 'imm': return f'#${m[pc+1]:02X}'
        if mode == 'rel':
            t = pc + 2 + ((m[pc + 1] ^ 0x80) - 0x80); return self.name(t)
        if mode in ('zp', 'zpx', 'zpy', 'izx', 'izy'):
            a = m[pc + 1]; s = self.name(a, zp=True)
            return {'zp': s, 'zpx': s + ',X', 'zpy': s + ',Y', 'izx': f'({s},X)', 'izy': f'({s}),Y'}[mode]
        a = m[pc + 1] | m[pc + 2] << 8; s = self.name(a)
        return {'abs': s, 'abx': s + ',X', 'aby': s + ',Y', 'ind': f'({s})'}[mode]

    def name(self, a, zp=False):
        l = self.label(a)
        if l: return l
        if self.lo <= a < self.hi or a in self.refs: return f'L{a:04X}'
        return f'${a:02X}' if zp else f'${a:04X}'

    def output(self, out, title=''):
        w = out.write; m = self.mem
        w(f'; {title}\n; dis6502.py — tracing disassembly, range ${self.lo:04X}-${self.hi-1:04X}\n\n')
        pc = self.lo
        while pc < self.hi:
            k = self.kind.get(pc)
            lab = self.label(pc) or (f'L{pc:04X}' if pc in self.refs else '')
            if k == 'code':
                mn, mode = OPS[m[pc]]; n = LEN[mode]
                b = ' '.join(f'{m[pc+i]:02X}' for i in range(n))
                cmt = ''
                if mode in ('abs', 'abx', 'aby', 'ind'):
                    a = m[pc + 1] | m[pc + 2] << 8
                    if a in SYMS and a >= 0xD000: cmt = ''
                w(f'{pc:04X}: {b:9} {lab+":" if lab else "":12} {mn} {self.fmt_operand(pc, mode)}\n'.rstrip() + '\n')
                pc += n
            else:
                # data: up to the next code/label, 16 bytes a line
                start = pc; end = pc
                while end < self.hi and self.kind.get(end) not in ('code',) and (end == start or not (self.label(end) or end in self.refs)): end += 1
                typ = next((t for a, b, t in self.data_ranges if a <= start < b), 'data')
                if lab or typ != 'data': w(f'\n{lab or f"D{start:04X}"}:  ; {typ}, {end-start} B\n')
                for i in range(start, end, 16):
                    chunk = m[i:min(i + 16, end)]
                    asc = ''.join(chr((c & 0x7f) + 32) if (c & 0x7f) < 64 else (chr(c & 0x7f) if (c & 0x7f) < 96 else '.') for c in chunk)
                    w(f'{i:04X}: .byte ' + ','.join(f'${c:02X}' for c in chunk) + f'   ; {asc}\n')
                pc = end

    def coverage(self):
        code = sum(1 for a in range(self.lo, self.hi) if self.kind.get(a) in ('code', 'in'))
        data = sum(1 for a in range(self.lo, self.hi) if self.kind.get(a) == 'data')
        return code, data, self.hi - self.lo - code - data

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('mem'); ap.add_argument('--lo', required=True); ap.add_argument('--hi', required=True)
    ap.add_argument('--entry', action='append', default=[]); ap.add_argument('--hints'); ap.add_argument('--coverage')
    ap.add_argument('-o', default='-'); ap.add_argument('--title', default='')
    ap.add_argument('--machine', choices=sorted(MACHINES), default='atari8',
                    help='the machine symbol table (atari8 by default)')
    a = ap.parse_args()
    global SYMS
    SYMS = MACHINES[a.machine]
    mem = open(a.mem, 'rb').read(); hints = json.load(open(a.hints)) if a.hints else {}
    d = Dis(mem, int(a.lo, 16), int(a.hi, 16), hints)
    entries = [int(x, 16) for x in a.entry] + [int(x, 16) for x in hints.get('entries', [])]
    if a.coverage:
        for line in open(a.coverage):
            line = line.split('#')[0].strip()
            if line: entries.append(int(line, 16))
    for e in entries: d.ref(e, -1); d.trace(e)
    out = sys.stdout if a.o == '-' else open(a.o, 'w'); d.output(out, a.title)
    code, data, unk = d.coverage(); tot = d.hi - d.lo
    sys.stderr.write(f'dis6502: code {code} B ({100*code/tot:.1f} %), data {data} B, unclassified {unk} B; unresolved {len(d.unresolved)}\n')
    for pc, why in d.unresolved[:40]: sys.stderr.write(f'  ${pc:04X}: {why}\n')

if __name__ == '__main__':
    main()
