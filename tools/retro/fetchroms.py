#!/usr/bin/env python3
"""fetchroms — machine system ROMs for the tracing emulators, into a project.

**Emulator ROMs do not belong in the library.** The library carries only the
character sets cut from ROMs, which it draws at run time (`SOURCES.md`,
R-038, R-039). KERNAL, BASIC, a disk drive ROM or a whole machine's OS is
needed only by the emulator while tracing; it therefore belongs in
`sources/rom/` of **the project** that traces with it, is out of git, and
fetching it is **the operator's decision** (R-041).

The tool is shared (R-008), the data is not. It fetches nothing on its own:
without `--confirm` it only prints what it would fetch, from where, and whose
rights they are.

    ./fetchroms.py --list                      # what each machine needs
    ./fetchroms.py c64                         # only shows the intent (no download)
    ./fetchroms.py c64 --confirm               # downloads into ./sources/rom/
    ./fetchroms.py --all --confirm             # everything it can download
    ./fetchroms.py c64 --only kernal --confirm # a single item
    ./fetchroms.py c64 --verify                # checks what the project already has
    ./fetchroms.py atari8 --import PATH        # copies and checks a local file

After a download it checks the size and the known checksums, records the
provenance in `sources/rom/roms.json` and prints lines for `sources/FILES.md`
and `SHA256SUMS`. Where the reference hash is **not known**, none is made up:
the file is downloaded from two independent mirrors and compared byte for
byte (the same discipline as three independent images of game media), and
the hash is recorded as measured.
"""
import argparse, hashlib, json, os, shutil, sys, time, zlib
import urllib.request

ZIM = 'http://www.zimmers.net/anonftp/pub/cbm/firmware/computers/c64/'
ZIM2 = 'http://www.zimmers.net/anonftp/pub/cbm/schematics/computers/c64/firmware/'
DRV = 'http://www.zimmers.net/anonftp/pub/cbm/firmware/drives/new/1541/'

MACHINES = {
    'c64': {
        'emulator': 'VICE x64sc (apt, the package has no ROMs)',
        'rights': ('Commodore Business Machines; the rights to the ROMs are held by '
                   'Cloanto (C64 Forever). NOT freely licensed — fetched for study '
                   'of the machine, the operator decides (R-038 point 4, R-041).'),
        'files': [
            {'name': 'kernal.901227-03.bin', 'size': 8192,
             'urls': [ZIM + 'kernal.901227-03.bin', ZIM2 + 'kernal.901227-03.bin'],
             'note': 'KERNAL rev. 3 (1982), the system routines'},
            {'name': 'basic.901226-01.bin', 'size': 8192,
             'urls': [ZIM + 'basic.901226-01.bin', ZIM2 + 'basic.901226-01.bin'],
             'note': 'BASIC V2, READY. and LOAD after power-on'},
            {'name': 'characters.901225-01.bin', 'size': 4096,
             'md5': '12a4202f5331d45af846af6c58fba946',
             'urls': [ZIM + 'characters.901225-01.bin', ZIM2 + 'characters.901225-01.bin'],
             'note': 'Char ROM, the same ROM C64Fonts8x8 in the library comes from'},
            {'name': 'dos1541', 'size': 16384, 'urls': [],
             'parts': [(DRV + '1541-c000.325302-01.bin', 8192),
                       (DRV + '1541-e000.901229-05.bin', 8192)],
             'note': ('the 1541 drive ROM ($C000-$FFFF), assembled from two 8 KB parts; '
                      'without it nothing loads from a .d64 (SEARCHING FOR and that is it)')},
        ],
        'vice': ('-kernal ROM/kernal.901227-03.bin -basic ROM/basic.901226-01.bin '
                 '-chargen ROM/characters.901225-01.bin -dos1541 ROM/dos1541'),
    },
    'atari8': {
        'emulator': 'atari800 5.0 (apt, the package has no ROMs)',
        'rights': ('Atari, Inc.; the rights are held by Atari Interactive. NOT '
                   'freely licensed — for study of the machine (R-039, R-041).'),
        'files': [
            {'name': 'atari-xl-os.rom', 'size': 16384, 'crc32': '1f9cd270', 'urls': [],
             'note': ('OS XL/XE rev. 2 (10 May 1983, CO61598B); there is no direct URL, '
                      'it comes from the RK-DVD collection (http://ftp.pigwa.net/stuff/collections/RK-DVD/, '
                      'System Roms/Atari OS XL.rom) — use --import PATH')},
        ],
        'vice': None,
    },
}


def sums(data):
    return {'sha256': hashlib.sha256(data).hexdigest(),
            'md5': hashlib.md5(data).hexdigest(),
            'crc32': '%08x' % (zlib.crc32(data) & 0xFFFFFFFF),
            'size': len(data)}


def check(spec, data):
    bad, s = [], sums(data)
    if spec.get('size') and s['size'] != spec['size']:
        bad.append('size %d != %d' % (s['size'], spec['size']))
    for k in ('md5', 'sha256', 'crc32'):
        if spec.get(k) and s[k] != spec[k]:
            bad.append('%s %s != %s' % (k, s[k], spec[k]))
    return bad, s


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'fetchroms/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def announce(machine, files, dest):
    m = MACHINES[machine]
    print('machine:   %s' % machine)
    print('emulator:  %s' % m['emulator'])
    print('target:    %s   (out of git)' % dest)
    print('rights:    %s' % m['rights'])
    print()
    for f in files:
        print('  %-26s %6d B  %s' % (f['name'], f['size'], f['note']))
        for u in f['urls']:
            print('  %-26s   %s' % ('', u))
        for u, _ in f.get('parts', []):
            print('  %-26s   %s' % ('', u))
    print()


def record(dest, machine, name, url, s, verified_by):
    path = os.path.join(dest, 'roms.json')
    db = json.load(open(path)) if os.path.exists(path) else {}
    db.setdefault(machine, {})[name] = {
        'url': url, 'fetched': time.strftime('%Y-%m-%d'), 'verified_by': verified_by,
        'size': s['size'], 'sha256': s['sha256'], 'md5': s['md5'], 'crc32': s['crc32'],
        'rights': MACHINES[machine]['rights'],
    }
    with open(path, 'w') as fh:
        json.dump(db, fh, indent=2, ensure_ascii=False, sort_keys=True)
        fh.write('\n')


def report(dest, machine, done):
    if not done:
        return
    notes = {f['name']: f['note'] for f in MACHINES[machine]['files']}
    print('\n--- lines for sources/FILES.md ---')
    for name, url, s in done:
        print('| `rom/%s` | %s | %s | %s | non-free, for study |'
              % (name, url or 'local file (--import)', time.strftime('%Y-%m-%d'),
                 notes.get(name, 'system ROM').split(',')[0].split(';')[0]))
    print('\n--- lines for sources/SHA256SUMS ---')
    for name, _, s in done:
        print('%s  ./rom/%s' % (s['sha256'], name))
    vice = MACHINES[machine].get('vice')
    if vice:
        print('\nthe emulator takes the ROMs from the project, not from the library:')
        print('  ' + vice.replace('ROM/', dest.rstrip('/') + '/'))


def one(machine, a):
    m = MACHINES[machine]
    files = [f for f in m['files'] if not a.only or a.only.lower() in f['name'].lower()]
    if not files:
        print('%s: --only %s selected nothing' % (machine, a.only))
        return 2
    dest = a.dest or os.path.join('sources', 'rom')
    announce(machine, files, dest)

    if a.verify:
        bad_any = False
        for f in files:
            path = os.path.join(dest, f['name'])
            if not os.path.exists(path):
                print('MISSING %s' % path); bad_any = True; continue
            bad, s = check(f, open(path, 'rb').read())
            print('%-7s %s  sha256 %s' % ('ERROR' if bad else 'OK', path, s['sha256']))
            for b in bad:
                print('        %s' % b); bad_any = True
        return 1 if bad_any else 0

    if a.imp:
        f = files[0] if len(files) == 1 else next(
            (x for x in files if x['name'] == os.path.basename(a.imp)), None)
        if f is None:
            print('--import: %s is not a ROM of machine %s' % (os.path.basename(a.imp), machine))
            return 2
        data = open(a.imp, 'rb').read()
        bad, s = check(f, data)
        if bad:
            print('ERROR %s: %s' % (a.imp, '; '.join(bad)))
            return 1
        os.makedirs(dest, exist_ok=True)
        shutil.copyfile(a.imp, os.path.join(dest, f['name']))
        how = 'known crc32' if f.get('crc32') else 'known md5' if f.get('md5') else 'size'
        record(dest, machine, f['name'], None, s, how)
        print('OK      %s → %s' % (a.imp, os.path.join(dest, f['name'])))
        report(dest, machine, [(f['name'], None, s)])
        return 0

    if not a.confirm:
        print("Nothing was downloaded. Fetching system ROMs is the operator's decision (R-041):")
        print('  %s %s --confirm' % (sys.argv[0], machine))
        return 1

    os.makedirs(dest, exist_ok=True)
    done, failed = [], False
    for f in files:
        path = os.path.join(dest, f['name'])
        if os.path.exists(path):
            bad, s = check(f, open(path, 'rb').read())
            print('%-7s %s (already here)' % ('ERROR' if bad else 'OK', path))
            if bad:
                failed = True
                for b in bad:
                    print('        %s' % b)
            else:
                done.append((f['name'], 'already in the project', s))
            continue

        if f.get('parts'):                     # an assembled ROM (1541: $C000 + $E000)
            blob, ok = b'', True
            for url, size in f['parts']:
                try:
                    part = fetch(url)
                except Exception as e:
                    print('        %s: %s' % (url, e)); ok = False; break
                if len(part) != size:
                    print('ERROR %s: %s has %d B, expected %d' % (f['name'], url, len(part), size))
                    ok = False; break
                blob += part
            if not ok:
                failed = True; continue
            bad, s = check(f, blob)
            if bad:
                print('ERROR %s: %s' % (f['name'], '; '.join(bad))); failed = True; continue
            open(path, 'wb').write(blob)
            how = 'assembled from %d parts, sizes match' % len(f['parts'])
            record(dest, machine, f['name'], ' + '.join(u for u, _ in f['parts']), s, how)
            print('OK      %s  (%s)' % (path, how))
            done.append((f['name'], f['parts'][0][0], s))
            continue

        if not f['urls']:
            print('SKIP    %s — no direct URL, use --import' % f['name'])
            failed = True
            continue

        data, src, how = None, None, None
        for url in f['urls']:
            try:
                d = fetch(url)
            except Exception as e:
                print('        %s: %s' % (url, e)); continue
            if data is None:
                data, src = d, url
            else:
                how = 'two mirrors match' if d == data else None
                if how is None:
                    print('ERROR %s: the mirrors differ (%s)' % (f['name'], url)); failed = True
                break
        if data is None:
            print('ERROR %s: not downloaded' % f['name']); failed = True; continue
        bad, s = check(f, data)
        if bad:
            print('ERROR %s: %s' % (f['name'], '; '.join(bad))); failed = True; continue
        if not how:
            how = ('known md5' if f.get('md5') else 'known sha256' if f.get('sha256')
                   else 'size only, the hash is measured, not verified')
        open(path, 'wb').write(data)
        record(dest, machine, f['name'], src, s, how)
        print('OK      %s  (%s)' % (path, how))
        done.append((f['name'], src, s))

    report(dest, machine, done)
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('machine', nargs='?', choices=sorted(MACHINES))
    ap.add_argument('--dest', help='target directory (./sources/rom by default)')
    ap.add_argument('--confirm', action='store_true', help='really download (the operator decides)')
    ap.add_argument('--verify', action='store_true', help='only check what is already in the target')
    ap.add_argument('--import', dest='imp', metavar='PATH', help='copy and check a local file')
    ap.add_argument('--all', action='store_true', help='all machines the tool knows')
    ap.add_argument('--only', metavar='NAME', help='only items whose name contains NAME')
    ap.add_argument('--list', action='store_true', help='print the table of machines')
    a = ap.parse_args()

    if a.all:
        rc = 0
        for name in sorted(MACHINES):
            rc |= one(name, a)
            print()
        return rc
    if a.list or not a.machine:
        for name in sorted(MACHINES):
            announce(name, MACHINES[name]['files'], '<project>/sources/rom')
        return 0
    return one(a.machine, a)


if __name__ == '__main__':
    sys.exit(main())
