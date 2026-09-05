/**
 * Loads a classic script — one of the sources a worker pulls in with
 * importScripts() — and hands back what it exports to Node.
 *
 * Those files are deliberately **not** ES modules. A classic worker cannot
 * take `import`, `export` or top-level `await`, so the physics and world
 * sources a game worker loads carry no export syntax at all; they declare
 * their class and close with the two lines that publish it:
 *
 *     if (typeof self !== 'undefined') { self.CharliePhysics = CharliePhysics; }
 *     if (typeof module !== 'undefined' && module.exports) { module.exports = CharliePhysics; }
 *
 * In the worker the first line applies, under Node the second — the same file,
 * handed over differently. That is what lets a match* tool run the game's own
 * code rather than a copy of it.
 *
 * `require()` cannot read them: the project's package.json declares
 * `"type": "module"` for R-001, so Node treats every .js under it as an ES
 * module and refuses (ERR_REQUIRE_ESM). Directory typing is per directory, and
 * these files sit in app/ next to real modules. This loader steps around that
 * by evaluating the source the way Node itself evaluates a CommonJS file —
 * wrapped in a function that is handed a `module` object — so the typing never
 * comes into it.
 *
 * Free variables resolve against the real global, so a script that expects an
 * earlier one to have published itself (`globalThis.VortonPhysics = ...`)
 * behaves as it does in the worker.
 *
 * @param {string} file - Absolute path of the classic script.
 * @returns {*} Whatever the script assigned to module.exports.
 */
function loadClassicScript(file) {
  const fs = require('fs');
  const vm = require('vm');

  const source = fs.readFileSync(file, 'utf8');
  const wrapper = vm.runInThisContext('(function (module, exports) {' + source + '\n})',
                                      {filename: file});
  const box = {exports: {}};
  wrapper(box, box.exports);
  return box.exports;
} // loadClassicScript

module.exports = loadClassicScript;
module.exports.loadClassicScript = loadClassicScript;
