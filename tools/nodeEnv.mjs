/**
 * Browser globals the application sources need at module-load time, so that an
 * offline tool can import them under Node.
 *
 * Every source declares its dependencies in its header as
 * `await import('./x.js?ver=' + window.srcVersion)`. The specifier is built
 * when the module is evaluated, so `window.srcVersion` has to exist before the
 * first application module is loaded — under Node it does not exist at all.
 *
 * Import this module **first**, before any application module: ES modules are
 * evaluated in the order they are imported, depth first, so this file's body
 * runs before anything it precedes.
 *
 *     import '../app/svision/tools/nodeEnv.mjs';   // must come first
 *     import { AbstractApp } from '../app/svision/js/abstractApp.js';
 *
 * The second half of the story is `"type": "module"` in the project's
 * package.json and in svision's own — `app/svision` is a symlink, and Node
 * resolves the real path, so it reads svision's package.json for those files.
 *
 * Nothing here fakes a DOM. A tool that reaches code touching `document` or
 * `canvas` provides what that code needs itself; this only covers the import
 * header, which every source has.
 *
 * @module tools/nodeEnv
 */

globalThis.window = globalThis.window || {};

/**
 * Cache-busting token the headers append to their import specifiers. Under
 * Node it only has to be present and stable — the value never reaches a
 * network request, `file://` ignores the query.
 */
globalThis.window.srcVersion = globalThis.window.srcVersion || 'node';
