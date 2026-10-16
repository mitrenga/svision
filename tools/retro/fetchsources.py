#!/usr/bin/env python3
"""fetchsources — fills svision's sources/ in a fresh clone.

`sources/` is out of git (R-041, see SOURCES.md): it holds what the library's offline tools
need but the library itself does not carry. A fresh clone has none of it, and
this tool puts back what can be fetched and says how to get the rest.

    tools/retro/fetchsources.py            # fetch what is missing
    tools/retro/fetchsources.py --list     # what belongs in sources/ and its state
    tools/retro/fetchsources.py --verify   # check what is there

What it knows:

- **SkoolKit 10.1** (`sources/skoolkit/`) — the Z80 simulator, snapshots,
  tap2sna and the disassembler, shared by the tools of the ZX projects
  (R-008) and `tools/retro/romdrawref.py`. The official wheel for this
  Python from PyPI, its sha256 checked against PyPI's, unpacked as it is:
  no pip, no compiler. GPLv3, by Richard Dymond (https://skoolkit.ca).
- **Atari XL OS ROM** (`sources/rom/atari-xl-os.rom`) — has no direct URL;
  it is only reported, `fetchroms.py atari8 --import PATH --dest sources/rom`
  puts it back.

Run it from anywhere; the paths are relative to the svision checkout.
"""
import argparse, hashlib, io, json, os, sys, zipfile
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SOURCES = os.path.join(ROOT, 'sources')

SKOOLKIT_VERSION = '10.1'
SKOOLKIT_DIR = os.path.join(SOURCES, 'skoolkit')


def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'fetchsources/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def wheel_tags():
    """The (python, platform) parts of a wheel name this interpreter can load."""
    py = 'cp%d%d' % sys.version_info[:2]
    plat = sys.platform
    machine = os.uname().machine if hasattr(os, 'uname') else ''
    if plat.startswith('linux'):
        libc = 'musllinux' if os.path.exists('/lib/ld-musl-x86_64.so.1') else 'manylinux'
        return py, (libc, machine or 'x86_64')
    if plat == 'darwin':
        return py, ('macosx', machine or 'arm64')
    if plat == 'win32':
        return py, ('win', 'amd64' if sys.maxsize > 2**32 else 'win32')
    return py, (plat, machine)


def pick_wheel(files):
    py, (system, machine) = wheel_tags()
    for f in files:
        name = f['filename']
        if (name.endswith('.whl') and '-%s-%s-' % (py, py) in name
                and system in name and machine in name):
            return f
    return None


def skoolkit_state():
    marker = os.path.join(SKOOLKIT_DIR, 'skoolkit', '__init__.py')
    scripts = os.path.join(SKOOLKIT_DIR, 'skoolkit-%s.data' % SKOOLKIT_VERSION, 'scripts')
    if not os.path.exists(marker):
        return 'MISSING'
    if not os.path.isdir(scripts):
        return 'BROKEN (no %s)' % os.path.relpath(scripts, ROOT)
    return 'OK'


def fetch_skoolkit():
    meta = json.loads(fetch('https://pypi.org/pypi/skoolkit/%s/json' % SKOOLKIT_VERSION))
    wheel = pick_wheel(meta['urls'])
    if wheel is None:
        py, plat = wheel_tags()
        print('ERROR  no SkoolKit %s wheel on PyPI for %s %s' % (SKOOLKIT_VERSION, py, '/'.join(plat)))
        return 1
    print('       %s' % wheel['url'])
    data = fetch(wheel['url'])
    digest = hashlib.sha256(data).hexdigest()
    if digest != wheel['digests']['sha256']:
        print('ERROR  sha256 %s != PyPI %s' % (digest, wheel['digests']['sha256']))
        return 1
    os.makedirs(SKOOLKIT_DIR, exist_ok=True)
    # the wheel stays next to what it unpacks into, as the record of the version
    open(os.path.join(SKOOLKIT_DIR, wheel['filename']), 'wb').write(data)
    zipfile.ZipFile(io.BytesIO(data)).extractall(SKOOLKIT_DIR)
    print('OK     %s  (sha256 %s, as on PyPI)' % (os.path.relpath(SKOOLKIT_DIR, ROOT), digest))
    return 0


def atari_state():
    return 'OK' if os.path.exists(os.path.join(SOURCES, 'rom', 'atari-xl-os.rom')) else 'MISSING'


ITEMS = [
    {'name': 'skoolkit', 'path': 'sources/skoolkit/', 'state': skoolkit_state, 'fetch': fetch_skoolkit,
     'note': 'SkoolKit %s from PyPI (GPLv3) — Z80 simulator for the ZX tools' % SKOOLKIT_VERSION},
    {'name': 'atari-xl-os', 'path': 'sources/rom/atari-xl-os.rom', 'state': atari_state, 'fetch': None,
     'note': 'Atari XL OS ROM, no direct URL — '
             'tools/retro/fetchroms.py atari8 --import PATH --dest sources/rom'},
]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--list', action='store_true', help='what belongs in sources/ and its state')
    ap.add_argument('--verify', action='store_true', help='only check what is there')
    a = ap.parse_args()

    rc = 0
    for item in ITEMS:
        state = item['state']()
        print('%-8s %-28s %s' % (state.split()[0], item['path'], item['note']))
        if a.list:
            continue
        if state != 'OK':
            if a.verify or item['fetch'] is None:
                rc = 1
                continue
            try:
                rc |= item['fetch']()
            except Exception as e:
                print('ERROR  %s: %s' % (item['name'], e))
                rc = 1
    return rc


if __name__ == '__main__':
    sys.exit(main())
