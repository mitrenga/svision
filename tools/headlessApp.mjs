/**
 * A stand-in application for running a model of the vector platform
 * (`headlessVectorApp`) or of the WebGL2/scene3D platform
 * (`headlessSceneApp`) under Node: everything a model, its entities and the
 * layout touch on `app` (`platform`, `stack`, `layout`, `now`, the input
 * manager's maps, a `fetchData` that never answers), and nothing that needs
 * a browser.
 *
 * A tool builds its model on it, resizes and draws, and reads the frame
 * from `app.layout.markup()` (both builders are synchronous):
 *
 *     import '../app/svision/tools/nodeEnv.mjs';
 *     const { headlessVectorApp } = await import('../app/svision/tools/headlessApp.mjs');
 *     const app = headlessVectorApp(new VectorPlatform({...}), 1024, 768, {version: '1'});
 *     const model = new MenuModel(app);
 *     app.model = model;
 *     model.init();
 *     model.resizeModel();          // fits and draws
 *     console.log(app.layout.markup());
 *
 * @module tools/headlessApp
 */
import './nodeEnv.mjs';

const { VectorHeadlessLayout } = await import('../js/platform/vector/vectorHeadlessLayout.js');
const { Scene3DHeadlessLayout } = await import('../js/platform/scene3D/scene3DHeadlessLayout.js');

/**
 * Builds the stand-in.
 * @param {AbstractPlatform} platform - A platform whose constructor does not touch the DOM (VectorPlatform).
 * @param {number} clientWidth - The pretended element width in CSS pixels.
 * @param {number} clientHeight - The pretended element height in CSS pixels.
 * @param {Object} [extra] - Properties the model reads from the app (version, copyright, playerName, globalData, ...).
 * @returns {Object} The application object.
 */
export function headlessVectorApp(platform, clientWidth, clientHeight, extra) {
  const app = {
    id: 'HeadlessApp',
    platform: platform,
    stack: {ctx: null, svg: null, containerType: 'headless'},
    element: {clientWidth: clientWidth, clientHeight: clientHeight},
    now: 0,
    model: false,
    audioManager: false,
    controls: {keyboard: {}, mouse: {enable: false}, gamepads: {supported: false, devices: {}}, touchscreen: {supported: false, type: false}},
    inputEventsManager: {
      keysMap: {},
      touchesMap: {},
      lastEventForAudio: false,
      updateGamepadsStates() {},
      sendEventsActiveKeys() {},
      needEventForAudio() { return true; }
    },
    fetched: [],                       // every fetchData call, for a tool that wants to know
    fetchData(url, storage, data, receiver) {
      this.fetched.push({url: url, receiver: receiver.id});
      return '';
    },
    saveDataToStorage() {},
    setModel() {},
    showErrorMessage(message) { throw new Error(message); },
    text(key) { return key; },
    upgradeApp() {}
  };
  Object.assign(app, extra || {});
  app.layout = new VectorHeadlessLayout(app, clientWidth, clientHeight);
  return app;
} // headlessVectorApp

/**
 * The stand-in for the WebGL2 platform: the same application object with
 * a {@link Scene3DHeadlessLayout}, so a model with SceneEntities (and the
 * HUD of canvas2D entities over them) draws under Node and the frame's
 * `markup()` is its fingerprint — never a pixel from a GPU (R-032).
 * @param {AbstractPlatform} platform - A WebGL2Platform (its constructor does not touch the DOM).
 * @param {number} clientWidth - The pretended element width in CSS pixels.
 * @param {number} clientHeight - The pretended element height in CSS pixels.
 * @param {Object} [extra] - Properties the model reads from the app (version, fonts, playerName, ...).
 * @returns {Object} The application object.
 */
export function headlessSceneApp(platform, clientWidth, clientHeight, extra) {
  const app = headlessVectorApp(platform, clientWidth, clientHeight, extra);
  app.stack = {ctx: null, gl: null, glCanvas: null, overlayCanvas: null, containerType: 'headless'};
  app.layout = new Scene3DHeadlessLayout(app, clientWidth, clientHeight);
  return app;
} // headlessSceneApp
