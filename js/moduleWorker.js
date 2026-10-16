// begin code

/**
 * A web worker built at run time out of ES modules of the application.
 *
 * The library's sources are ES modules with an import header above
 * `// begin code`; a worker started with `new Worker(url)` is a classic
 * script that can import none of them, and a module worker would need the
 * sources served one by one, which the production bundle does not do. So
 * the game lists the modules its worker is made of, this fetches their text,
 * strips the headers and the `export` keywords — the same transformation
 * `svtool build` applies to make the bundle — glues them in that order into
 * one classic script and starts a worker from a blob of it. Every class and
 * function of the modules is then a global of the worker; the last source is
 * the worker program itself, which wires `onmessage`.
 *
 * The sources have to be reachable by URL, so they belong in the
 * `standalone` list of `config/compile.json`. The same files stay importable
 * as modules by the offline tools, which is the point: the game logic is
 * one code, run in a worker or under Node (R-001, R-007).
 *
 * ```js
 * ModuleWorker.create(this.app, [
 *   'svision/js/platform/canvas2D/vga/vgaVideoRAM.js',
 *   'pop/levelData.js',
 *   'gameWorker.js'
 * ]).then((worker) => { worker.onmessage = ...; });
 * ```
 */
export class ModuleWorker {

  /**
   * The bundle transformation of one module: everything from `// begin code`
   * on, with `export` removed (`export default x;` lines dropped).
   * @param {string} text - The source.
   * @param {string} name - Its name, written into a comment for stack traces.
   * @returns {string} Classic-script code.
   */
  static bundleCode(text, name) {
    var marker = '// begin code';
    var pos = text.indexOf(marker);
    var code = (pos < 0) ? text : text.substring(pos+marker.length);
    code = code.replace(/^[ \t]*export[ \t]+default[ \t]+[^\n;]+;[ \t]*$/gm, '');
    code = code.replace(/^([ \t]*)export[ \t]+/gm, '$1');
    return '// === '+name+' ===\n'+code;
  } // bundleCode

  /**
   * Fetches the sources and glues them into one script.
   * @param {AbstractApp} app - For `importPath`.
   * @param {string[]} sources - Paths relative to `app/`, in dependency order.
   * @returns {Promise<string>} The script.
   */
  static async glue(app, sources) {
    var parts = [];
    for (var i = 0; i < sources.length; i++) {
      var name = sources[i];
      var response = await fetch(app.importPath+'/'+name+'?ver='+window.srcVersion);
      if (!response.ok) {
        throw new Error('ModuleWorker: '+name+' '+response.status);
      }
      parts.push(ModuleWorker.bundleCode(await response.text(), name));
    }
    return parts.join('\n');
  } // glue

  /**
   * Builds and starts the worker.
   * @param {AbstractApp} app - For `importPath`.
   * @param {string[]} sources - Paths relative to `app/`, in dependency order;
   *        the last one is the worker program.
   * @returns {Promise<Worker>} The running worker.
   */
  static async create(app, sources) {
    var script = await ModuleWorker.glue(app, sources);
    var blobURL = URL.createObjectURL(new Blob([script], {type: 'text/javascript'}));
    try {
      return new Worker(blobURL);
    } finally {
      URL.revokeObjectURL(blobURL);
    }
  } // create

} // ModuleWorker
