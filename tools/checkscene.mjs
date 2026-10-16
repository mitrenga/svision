#!/usr/bin/env node
/**
 * Self-check of the 3D platform under Node — the DOM-free half (R-032):
 * the matrices (identities, the perspective of the first WebGL2 layout,
 * lookAt against hand-computed numbers), the quaternions (Quat), the mesh
 * generators (counts, unit normals, outward winding, feature edges), the
 * scene (defaults, markup, differences, bounds, translation, the fog and
 * its resolved colour), its projection into a display
 * list against hand-computed points, and the headless layout drawn through
 * a stand-in application — a SceneEntity, a HUD text and the bridge of a
 * SceneEntity on the vector layout.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkscene.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { Vec3 } = await import('../js/platform/scene3D/vec3.js');
const { Mat4 } = await import('../js/platform/scene3D/mat4.js');
const { Quat } = await import('../js/platform/scene3D/quat.js');
const { Mesh } = await import('../js/platform/scene3D/mesh.js');
const { Scene3D } = await import('../js/platform/scene3D/scene3D.js');
const { SceneEntity } = await import('../js/platform/scene3D/sceneEntity.js');
const { WebGL2Platform } = await import('../js/platform/webGL2/webGL2Platform.js');
const { VectorPlatform } = await import('../js/platform/vector/vectorPlatform.js');
const { TextEntity } = await import('../js/platform/canvas2D/textEntity.js');
const { Fonts5x5 } = await import('../js/platform/canvas2D/fonts5x5.js');
const { AbstractModel } = await import('../js/abstractModel.js');
const { headlessSceneApp, headlessVectorApp } = await import('./headlessApp.mjs');

const verbose = process.argv.includes('-v');
let checks = 0;
let differences = 0;

function check(name, actual, expected) {
  checks++;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    differences++;
    console.log(`  DIFF ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else if (verbose) {
    console.log(`  ok   ${name}`);
  }
} // check

const r = (v, d) => Array.isArray(v) || ArrayBuffer.isView(v) ? Array.prototype.map.call(v, (e) => r(e, d)) : Math.round(v*(d || 1000))/(d || 1000)+0;

// ------------------------------------------------------------------- Vec3

{
  check('add', Vec3.add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  check('sub', Vec3.sub([1, 2, 3], [4, 5, 6]), [-3, -3, -3]);
  check('scale', Vec3.scale([1, 2, 3], 2), [2, 4, 6]);
  check('dot', Vec3.dot([1, 2, 3], [4, 5, 6]), 32);
  check('cross x × y = z', Vec3.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  check('length', Vec3.length([3, 4, 0]), 5);
  check('normalize', Vec3.normalize([3, 4, 0]), [0.6, 0.8, 0]);
  check('normalize zero', Vec3.normalize([0, 0, 0]), [0, 0, 0]);
}

// ------------------------------------------------------------------- Mat4

{
  const I = Mat4.identity();
  const T = Mat4.translate(I, 1, 2, 3);
  check('identity · T = T', Mat4.multiply(I, T), T);
  check('translate puts the offset in column 3', T.slice(12, 15), [1, 2, 3]);
  check('transformPoint through a translation', Mat4.transformPoint(T, [1, 1, 1]), [2, 3, 4]);
  check('transformDirection ignores it', Mat4.transformDirection(T, [1, 1, 1]), [1, 1, 1]);
  const Rz = Mat4.axisRotate(I, [0, 0, 1], Math.PI/2);
  check('rotation about Z by 90°: x → y', r(Mat4.transformPoint(Rz, [1, 0, 0])), [0, 1, 0]);
  const Ry = Mat4.rotation([0, 1, 0], Math.PI/2);
  check('rotation about Y by 90°: x → -z', r(Mat4.transformPoint(Ry, [1, 0, 0])), [0, 0, -1]);
  check('rotation axis is normalised', r(Mat4.rotation([0, 0, 7], Math.PI/2)), r(Rz));
  check('m · T · R applies R first', r(Mat4.transformPoint(Mat4.axisRotate(T, [0, 0, 1], Math.PI/2), [1, 0, 0])), [1, 3, 3]);
  check('scale', Mat4.transformPoint(Mat4.scale(I, 2, 3, 4), [1, 1, 1]), [2, 3, 4]);
  check('scale by one number', Mat4.transformPoint(Mat4.scale(I, 2), [1, 1, 1]), [2, 2, 2]);
  check('transpose', Mat4.transpose(T)[3], 1);
  check('transpose twice', Mat4.transpose(Mat4.transpose(T)), T);

  // the perspective of the first WebGL2 layout: fov 32°, 4:3, 0.1..20
  const P = Mat4.perspective(32*Math.PI/180, 4/3, 0.1, 20);
  check('perspective (numbers of the old layout)', r([P[0], P[5], P[10], P[11], P[14], P[15]], 10000), [2.6156, 3.4874, -1.0101, -1, -0.201, 0]);
  check('perspective: a point at -near lands on z = -1', r(Mat4.transformPoint(P, [0, 0, -0.1])[2]), -1);
  check('perspective: a point at -far lands on z = 1', r(Mat4.transformPoint(P, [0, 0, -20])[2]), 1);
  const O = Mat4.orthographic(-2, 2, -1, 1, 0.1, 10);
  check('orthographic: corners to ±1', [r(Mat4.transformPoint(O, [2, 1, -0.1])), r(Mat4.transformPoint(O, [-2, -1, -10]))], [[1, 1, -1], [-1, -1, 1]]);

  const A = Mat4.compose([1, 2, 3], [30, 40, 50], [2, 1, 0.5]);
  check('A · A⁻¹ = I', r(Mat4.multiply(A, Mat4.invert(A)), 1000000), I);
  check('singular matrix inverts to the identity', Mat4.invert(new Array(16).fill(0)), I);

  check('lookAt from +z is a translation', Mat4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 5, 1]);
  check('lookAt from +x (hand computed)', r(Mat4.lookAt([5, 0, 0], [0, 0, 0], [0, 1, 0])), [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 5, 0, 0, 1]);
  const V = Mat4.invert(Mat4.lookAt([5, 0, 0], [0, 0, 0], [0, 1, 0]));
  check('view from +x: the origin is 5 in front', r(Mat4.transformPoint(V, [0, 0, 0])), [0, 0, -5]);
  check('view from +x: +z of the world is to the left', r(Mat4.transformPoint(V, [0, 0, 1])), [-1, 0, -5]);
  check('lookAt along up does not blow up', Number.isFinite(Mat4.lookAt([0, 5, 0], [0, 0, 0], [0, 1, 0])[0]), true);

  check('compose: position', Mat4.compose([1, 2, 3]).slice(12, 15), [1, 2, 3]);
  check('compose: rotation in degrees about Y', r(Mat4.transformPoint(Mat4.compose(null, [0, 90, 0]), [1, 0, 0])), [0, 0, -1]);
  check('compose: X first (y → z), then Y (z → x)', r(Mat4.transformPoint(Mat4.compose(null, [90, 90, 0]), [0, 1, 0])), [1, 0, 0]);
  check('compose: scale then move', Mat4.transformPoint(Mat4.compose([1, 0, 0], null, 2), [1, 1, 1]), [3, 2, 2]);
  check('transformVec4 keeps w', Mat4.transformVec4(P, [0, 0, -2])[3], 2);
}

// ------------------------------------------------------------------- Quat

{
  const I = Quat.identity();
  const Rz = Quat.axisAngle([0, 0, 1], 90);
  check('quat identity · q = q', r(Quat.multiply(I, Rz)), r(Rz));
  check('quat axisAngle z 90°: x → y', r(Quat.rotate(Rz, [1, 0, 0])), [0, 1, 0]);
  check('quat axis is normalised', r(Quat.axisAngle([0, 0, 7], 90)), r(Rz));
  check('quat multiply applies the right one first', r(Quat.rotate(Quat.multiply(Quat.axisAngle([0, 1, 0], 90), Rz), [1, 0, 0])), [0, 1, 0]);
  check('quat toMat4 = Mat4.rotation', r(Quat.toMat4(Quat.axisAngle([0, 1, 0], 90))), r(Mat4.rotation([0, 1, 0], Math.PI/2)));
  check('quat fromEuler xyz = Mat4.compose', r(Quat.rotate(Quat.fromEuler(10, 20, 30), [1, 2, 3])), r(Mat4.transformPoint(Mat4.compose(null, [10, 20, 30]), [1, 2, 3])));
  check('quat euler round trip xyz', r(Quat.toEuler(Quat.fromEuler(10, 20, 30))), [10, 20, 30]);
  check('quat euler round trip zxy', r(Quat.toEuler(Quat.fromEuler(10, 20, 30, 'zxy'), 'zxy')), [10, 20, 30]);
  check('quat euler zxy applies z first', r(Quat.rotate(Quat.fromEuler(0, 90, 90, 'zxy'), [1, 0, 0])), [0, 1, 0]);
  check('quat euler in 0..360', r(Quat.toEuler(Quat.fromEuler(-10, 0, 0))), [350, 0, 0]);
  check('quat normalize', r(Quat.normalize([0, 0, 0, 2])), [0, 0, 0, 1]);
  check('quat normalize zero', Quat.normalize([0, 0, 0, 0]), [0, 0, 0, 1]);
  check('quat conjugate undoes', r(Quat.rotate(Quat.multiply(Quat.conjugate(Rz), Rz), [1, 2, 3])), [1, 2, 3]);
  check('quat lerp halfway = 45°', r(Quat.toEuler(Quat.lerp(I, Rz, 0.5))), [0, 0, 45]);
  check('quat lerp takes the shorter arc', r(Quat.toEuler(Quat.lerp(I, Rz.map((v) => -v), 0.5))), [0, 0, 45]);
  check('quat lerp clamps t', r(Quat.lerp(I, Rz, 2)), r(Rz));
  check('quat slerp halfway = 45°', r(Quat.toEuler(Quat.slerp(I, Rz, 0.5))), [0, 0, 45]);
  check('quat slerp at 0 and 1', [r(Quat.slerp(I, Rz, 0)), r(Quat.slerp(I, Rz, 1))], [r(I), r(Rz)]);
  check('quat lookRotation along x = yaw 90°', r(Quat.toEuler(Quat.lookRotation([1, 0, 0]), 'zxy')), [0, 90, 0]);
  check('quat lookRotation up: pitch', r(Quat.toEuler(Quat.lookRotation([0, 1, 1]), 'zxy')), [315, 0, 0]);
  check('quat rotateAround a pivot', r(Quat.rotateAround([2, 0, 0], I, [1, 0, 0], [0, 0, 1], 90).position), [1, 1, 0]);
  check('quat rotateAround turns the rotation too', r(Quat.toEuler(Quat.rotateAround([2, 0, 0], I, [1, 0, 0], [0, 0, 1], 90).rotation)), [0, 0, 90]);
  check('quat compose = T · R · S', r(Mat4.transformPoint(Quat.compose([1, 2, 3], Rz, 2), [1, 0, 0])), [1, 4, 3]);
}

// ------------------------------------------------------------------- Mesh

{
  Mesh.counter = 0;
  const unit = (m) => { for (let i = 0; i < m.normals.length; i += 3) { const l = Math.hypot(m.normals[i], m.normals[i+1], m.normals[i+2]); if (Math.abs(l-1) > 1e-5) return false; } return true; };
  const outward = (m) => {
    // every triangle's winding normal points the way its vertices' normals do
    for (let t = 0; t < m.indices.length; t += 3) {
      const n = Mesh.faceNormal(m.positions, m.indices[t], m.indices[t+1], m.indices[t+2]);
      let ok = false;
      for (let k = 0; k < 3; k++) {
        const v = m.indices[t+k]*3;
        if (n[0]*m.normals[v]+n[1]*m.normals[v+1]+n[2]*m.normals[v+2] > 0) ok = true;
      }
      if (!ok) return t/3;
    }
    return true;
  };

  const box = Mesh.box(2, 4, 6, {id: 'box'});
  check('box: 24 vertices, 12 triangles, 36 indices', [box.vertexCount, box.triangleCount, box.indices.length], [24, 12, 36]);
  check('box: id given', box.id, 'box');
  check('box: bounds', box.bounds(), {x: -1, y: -2, z: -3, width: 2, height: 4, depth: 6});
  check('box: unit normals', unit(box), true);
  check('box: outward winding', outward(box), true);
  check('box: twelve wireframe edges', box.wireframeEdges().length/6, 12);
  check('box: edges cached by version', box.wireframeEdges() === box.wireframeEdges(), true);
  box.touch();
  check('box: touch bumps version and remakes edges', [box.version, box.wireframeEdges().length/6], [1, 12]);
  check('box: Uint16 indices', box.indices instanceof Uint16Array, true);
  const coloured = Mesh.box(1, 1, 1, {faceColors: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1]]});
  check('box: a colour per face vertex', [coloured.colors.length, Array.from(coloured.colors.slice(12, 15))], [72, [0, 1, 0]]);
  check('box: made id counts', coloured.id, 'mesh1');

  const plane = Mesh.plane(4, 4, {segmentsX: 2, segmentsZ: 2, color: [0.5, 0.5, 0.5]});
  check('plane: 9 vertices, 8 triangles', [plane.vertexCount, plane.triangleCount], [9, 8]);
  check('plane: faces +Y', Array.from(plane.normals.slice(0, 3)), [0, 1, 0]);
  check('plane: outward winding', outward(plane), true);
  check('plane: only its outline is a feature edge (2 segments a side)', plane.wireframeEdges().length/6, 8);
  check('plane: colours', plane.colors.length, 27);

  const sphere = Mesh.sphere(1, {segments: 16, rings: 8});
  check('sphere: 153 vertices, 224 triangles', [sphere.vertexCount, sphere.triangleCount], [153, 224]);
  check('sphere: unit normals', unit(sphere), true);
  check('sphere: outward winding', outward(sphere), true);
  check('sphere: radius', r(Math.hypot(sphere.positions[300], sphere.positions[301], sphere.positions[302])), 1);

  const cylinder = Mesh.cylinder(1, 2, {segments: 16});
  check('cylinder: 70 vertices, 64 triangles', [cylinder.vertexCount, cylinder.triangleCount], [70, 64]);
  check('cylinder: unit normals', unit(cylinder), true);
  check('cylinder: outward winding', outward(cylinder), true);
  check('cylinder: 16 verticals and two rims', cylinder.wireframeEdges().length/6, 48);
  check('cylinder: bounds', cylinder.bounds(), {x: -1, y: -1, z: -1, width: 2, height: 2, depth: 2});

  const json = box.toJSON();
  check('toJSON: keys', Object.keys(json), ['id', 'positions', 'normals', 'colors', 'indices']);
  check('toJSON: plain arrays', [Array.isArray(json.positions), json.colors], [true, null]);
  const back = Mesh.fromJSON(json);
  check('fromJSON: round trip', [back.id, back.vertexCount, back.triangleCount, Array.from(back.positions).join() === Array.from(box.positions).join()], ['box', 24, 12, true]);
  check('fromJSON: colours round trip', Mesh.fromJSON(coloured.toJSON()).colors.length, 72);
  check('big mesh takes Uint32 indices', new Mesh(new Float32Array(3*70000), new Float32Array(3*70000), [0, 1, 2]).indices instanceof Uint32Array, true);
}

// ---------------------------------------------------------------- Scene3D

{
  Mesh.counter = 0;
  const s = new Scene3D();
  check('empty scene', [s.items.length, s.version, s.bounds()], [0, 0, false]);
  check('default camera', s.camera, {type: 'perspective', fov: 60, near: 0.1, far: 100, position: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0]});
  check('default lights: directional and ambient, intensity 0-15', s.lights.map((l) => [l.type, l.intensity]), [['directional', 12], ['ambient', 4]]);
  s.line(0, 0, 0, 1, 2, 3);
  check('line defaults', s.items[0], {color: '#ffffff', fill: 'none', strokeWidth: 1, intensity: 15, opacity: 1, type: 'line', x1: 0, y1: 0, z1: 0, x2: 1, y2: 2, z2: 3});
  check('version after line', s.version, 1);
  const cube = Mesh.box(2, 2, 2, {id: 'cube'});
  s.mesh(cube, {transform: {position: [0, 0, -3], rotation: [0, 45, 0]}, fill: '#ff0000'});
  check('mesh item', [s.items[1].type, s.items[1].mesh === cube, s.items[1].shading, s.items[1].wireframe, s.items[1].fill], ['mesh', true, 'flat', false, '#ff0000']);
  const pts = [0, 0, 0, 1, 1, 1];
  s.polyline(pts, {close: true, intensity: 7});
  pts[0] = 99;
  check('polyline copies points', s.items[2].points[0], 0);
  check('three items', s.items.length, 3);

  check('line markup', Scene3D.element(s.items[0]), '{"type":"line","x1":0,"y1":0,"z1":0,"x2":1,"y2":2,"z2":3,"color":"#ffffff","fill":"none","strokeWidth":1,"intensity":15,"opacity":1}');
  check('mesh markup names the mesh and its transform', Scene3D.element(s.items[1]), '{"type":"mesh","mesh":"cube","vertices":24,"triangles":12,"shading":"flat","wireframe":false,"transform":{"position":[0,0,-3],"rotation":[0,45,0]},"color":"#ffffff","fill":"#ff0000","strokeWidth":1,"intensity":15,"opacity":1}');
  check('pattern markup: the checker and its size after the style', Scene3D.element(Object.assign({}, s.items[1], {pattern: {checker: '#d2d2d2', size: 25}})), '{"type":"mesh","mesh":"cube","vertices":24,"triangles":12,"shading":"flat","wireframe":false,"transform":{"position":[0,0,-3],"rotation":[0,45,0]},"color":"#ffffff","fill":"#ff0000","strokeWidth":1,"intensity":15,"opacity":1,"pattern":{"checker":"#d2d2d2","size":25}}');
  check('blend markup: only when additive, after the style', [Scene3D.element(Object.assign({}, s.items[1], {blend: 'normal'})).indexOf('blend'), Scene3D.element(Object.assign({}, s.items[1], {blend: 'add'})).slice(-14)], [-1, '"blend":"add"}']);
  check('polyline markup', Scene3D.element(s.items[2]), '{"type":"polyline","points":[0,0,0,1,1,1],"close":true,"color":"#ffffff","fill":"none","strokeWidth":1,"intensity":7,"opacity":1}');
  check('matrix transform in markup: 16 numbers to 3 decimals', JSON.parse(Scene3D.element(Object.assign({}, s.items[0], {transform: Mat4.translate(Mat4.identity(), 1.23456, 0, 0)}))).transform, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1.235, 0, 0, 1]);
  const lines = s.lines();
  check('markup: camera, lights, background, then the items', [lines.length, lines[0], lines[1], lines[2], lines[3]], [7,
    '{"camera":{"type":"perspective","fov":60,"near":0.1,"far":100,"position":[0,0,10],"target":[0,0,0],"up":[0,1,0]}}',
    '{"light":{"type":"directional","direction":[-0.5,-1,-0.7],"color":"#ffffff","intensity":12}}',
    '{"light":{"type":"ambient","color":"#ffffff","intensity":4}}',
    '{"background":"#000000"}']);
  check('markup joins with newlines', s.markup().split('\n').length, 7);

  check('bounds: line, cube moved and turned, polyline', r(s.bounds()), r({x: -1.414, y: -1, z: -4.414, width: 2.414, height: 3, depth: 7.414}));

  const t = new Scene3D();
  t.append(s, 10, 20, 30);
  check('append count', t.items.length, 3);
  check('translate line', [t.items[0].x1, t.items[0].y1, t.items[0].z1, t.items[0].x2], [10, 20, 30, 11]);
  check('translate mesh with an object transform', t.items[1].transform, {position: [10, 20, 27], rotation: [0, 45, 0]});
  check('translate polyline', t.items[2].points, [10, 20, 30, 11, 21, 31]);
  check('append leaves source', s.items[0].x1, 0);
  const m = Scene3D.translate({type: 'mesh', mesh: cube, transform: Mat4.identity()}, 1, 2, 3);
  check('translate mesh with a matrix transform', m.transform.slice(12, 15), [1, 2, 3]);
  check('no transform is the identity', Scene3D.transformMatrix(undefined), Mat4.identity());

  // the fog (phase 1, GR-M5): a scene without it reads as before; with it
  // the markup gets one line after the background, the colour defaults to
  // the background's
  const f = new Scene3D();
  check('no fog by default', [f.fog, f.fogSettings(), f.lines().length], [null, null, 4]);
  const v0 = f.version;
  f.setFog({start: 400, end: 1000});
  check('setFog bumps the version', f.version, v0+1);
  check('fog colour defaults to the background', f.fogSettings(), {start: 400, end: 1000, color: '#000000'});
  f.setBackground('#0c1f3a');
  check('fog follows the background', f.fogSettings().color, '#0c1f3a');
  check('fog line after the background', [f.lines().length, f.lines()[3], f.lines()[4]], [5, '{"background":"#0c1f3a"}', '{"fog":{"start":400,"end":1000,"color":"#0c1f3a"}}']);
  f.setFog({start: 10, end: 20, color: '#ff0000'});
  check('fog with its own colour', f.fogSettings(), {start: 10, end: 20, color: '#ff0000'});
  check('fog in toJSON', f.toJSON().fog, {start: 10, end: 20, color: '#ff0000'});
  f.setFog(null);
  check('fog removed', [f.fog, f.lines().length, f.toJSON().fog], [null, 4, null]);

  const u = new Scene3D();
  u.append(s);
  check('same scenes: 0', s.differences(u), 0);
  u.items[0].x2 = 5;
  check('one item changed: 1', s.differences(u), 1);
  u.setCamera({fov: 45});
  check('camera changed too: 2', [s.differences(u), u.version], [2, 4]);
  u.line(0, 0, 0, 0, 0, 0);
  check('one extra: 3', [s.differences(u), u.differences(s)], [3, 3]);
  u.setLights([{type: 'ambient', color: '#ffffff', intensity: 15}]);
  check('fewer lights shift the lines', s.differences(u) > 3, true);
  check('setBackground bumps version', (() => { const v = u.version; u.setBackground('#123456'); return u.version-v; })(), 1);

  const json = s.toJSON();
  check('toJSON: meshes by id, items name them', [Object.keys(json.meshes), json.items[1].mesh, json.items.length, json.camera.fov], [['cube'], 'cube', 3, 60]);
  check('toJSON: a matrix transform becomes an array', Array.isArray(new Scene3D().mesh(cube, {transform: new Float32Array(16)}).toJSON().items[0].transform), true);

  const before = s.version;
  s.clear();
  check('clear empties and bumps', [s.items.length, s.version], [0, before+1]);
  s.clear();
  check('clear of empty keeps version', s.version, before+1);
}

// ---------------------------------------------------------------- project

{
  const s = new Scene3D();
  s.setCamera({position: [0, 0, 5], target: [0, 0, 0], fov: 90, near: 0.1, far: 100});
  s.mesh(Mesh.box(2, 2, 2, {id: 'cube'}));
  const list = s.project(200, 200);
  check('cube projects to 12 lines', [list.items.length, list.items[0].type], [12, 'line']);
  // the first edge: the +X face's first triangle, (1,-1,-1)-(1,1,-1), on the back face 6 in front of the camera
  check('first edge (hand computed)', r([list.items[0].x1, list.items[0].y1, list.items[0].x2, list.items[0].y2]), [116.667, 116.667, 116.667, 83.333]);
  const corners = new Set();
  list.items.forEach((l) => { corners.add(r(l.x1)+','+r(l.y1)); corners.add(r(l.x2)+','+r(l.y2)); });
  check('eight corners: front face at 75/125, back face at 83.333/116.667', Array.from(corners).sort(), ['116.667,116.667', '116.667,83.333', '125,125', '125,75', '75,125', '75,75', '83.333,116.667', '83.333,83.333']);
  const byDepth = {};
  list.items.forEach((l) => { const d = (l.x1 == 75 || l.x1 == 125) && (l.x2 == 75 || l.x2 == 125) ? 'front' : ((r(l.x1) == 116.667 || r(l.x1) == 83.333) && (r(l.x2) == 116.667 || r(l.x2) == 83.333) ? 'back' : 'side'); byDepth[d] = l.intensity; });
  check('nearer edges are brighter: front 15, side 11, back 8', [byDepth.front, byDepth.side, byDepth.back], [15, 11, 8]);
  check('style comes from the item', [list.items[0].color, list.items[0].strokeWidth, list.items[0].opacity], ['#ffffff', 1, 1]);
  check('same projection twice: 0 differences', s.project(200, 200).differences(list), 0);
  check('projected markup is SVG', list.markup().split('\n')[0].startsWith('<line x1="116.667"'), true);

  const behind = new Scene3D();
  behind.setCamera({position: [0, 0, 5], target: [0, 0, 0], fov: 90});
  behind.line(0, 0, 0, 0, 0, 10);
  behind.line(-1, 0, 0, 1, 0, 0, {intensity: 10});
  const bl = behind.project(100, 100);
  check('an edge through the camera is dropped, one in front stays', [bl.items.length, r([bl.items[0].x1, bl.items[0].y1, bl.items[0].x2, bl.items[0].y2])], [1, [40, 50, 60, 50]]);
  check('a single depth keeps the item intensity', bl.items[0].intensity, 10);

  const ortho = new Scene3D();
  ortho.setCamera({type: 'orthographic', height: 4, position: [0, 0, 5], target: [0, 0, 0], near: 0.1, far: 100});
  ortho.mesh(Mesh.box(2, 2, 2));
  const ol = ortho.project(100, 100);
  const oc = new Set();
  ol.items.forEach((l) => { oc.add(r(l.x1)+','+r(l.y1)); oc.add(r(l.x2)+','+r(l.y2)); });
  check('orthographic: four screen corners at 25/75', Array.from(oc).sort(), ['25,25', '25,75', '75,25', '75,75']);
  check('orthographic: depth still grades the intensity', ol.items.map((l) => l.intensity).sort().join(','), '11,11,11,11,15,15,15,15,8,8,8,8');

  const poly = new Scene3D();
  poly.setCamera({position: [0, 0, 5], target: [0, 0, 0], fov: 90});
  poly.polyline([-1, -1, 0, 1, -1, 0, 1, 1, 0], {close: true});
  check('a closed polyline of three points is three edges', poly.project(100, 100).items.length, 3);
  poly.items[0].close = false;
  check('open: two', poly.project(100, 100).items.length, 2);
  check('depthRange option pins the ramp', poly.project(100, 100, {depthRange: [0, 10]}).items[0].intensity, 11);
}

// ------------------------------------------- headless layout and entities

{
  Mesh.counter = 0;
  class Model extends AbstractModel {
    constructor(app) { super(app); this.id = 'CheckModel'; }
    init() {
      super.init();
      this.desktopEntity.bkColor = false;
      this.view = new SceneEntity(this.desktopEntity, 40, 20, 560, 320, '#40ff40', false);
      this.view.scene.setCamera({position: [0, 0, 5], target: [0, 0, 0], fov: 90});
      this.view.scene.mesh(Mesh.box(2, 2, 2, {id: 'cube'}));
      this.desktopEntity.addEntity(this.view);
      this.hud = new TextEntity(this.desktopEntity, this.app.fonts.fonts5x5, 8, 4, 200, 10, 'HUD 1', '#ffffff', false, {scale: 2});
      this.desktopEntity.addEntity(this.hud);
    }
  }
  const platform = new WebGL2Platform({width: 640, height: 360, border: {minimal: 0, defaultColor: '#101010'}, background: '#000000'});
  check('platform options', [platform.options.width, platform.options.height, platform.options.pixelRatio, platform.options.antialias], [640, 360, false, true]);
  check('platform desktop and border without a DOM', [platform.desktop(null), platform.border(null)], [{width: 640, height: 360, defaultColor: false}, {minimal: 0, defaultColor: '#101010'}]);

  const app = headlessSceneApp(platform, 1920, 1080, {});
  app.fonts = {fonts5x5: new Fonts5x5(app)};
  const model = new Model(app);
  app.model = model;
  model.init();
  check('scene entity takes the pen colour as the default edge colour', model.view.scene.defaults.color, '#40ff40');
  check('scene entity clips and sits on the content layer', [model.view.clipsScene, model.view.layer], [true, 'content']);
  model.resizeModel();
  check('fit 1920x1080: ratio 3, no border', [app.layout.ratio, model.borderWidth, model.borderHeight], [3, 0, 0]);
  check('desktop placed', [model.desktopEntity.x, model.desktopEntity.y, model.desktopEntity.width, model.desktopEntity.height], [0, 0, 640, 360]);
  check('pointer to model units', [app.layout.convertClientCoordinateX(300), app.layout.convertClientCoordinateY(90)], [100, 30]);

  const lines = app.layout.markup().split('\n');
  check('frame: no border strip without a border, the scene with its rectangle, the scene markup, the HUD raster', [lines[0], lines[1].slice(0, 10), lines[lines.length-1]], [
    '{"kind":"scene","id":"SceneEntity","x":40,"y":20,"width":560,"height":320}',
    '{"camera":',
    '{"kind":"raster","id":"TextEntity","text":"HUD 1","x":8,"y":4,"width":200,"height":10}'
  ]);
  check('the scene\'s mesh line is in the frame', lines.includes('{"type":"mesh","mesh":"cube","vertices":24,"triangles":12,"shading":"flat","wireframe":false,"color":"#40ff40","fill":"none","strokeWidth":1,"intensity":15,"opacity":1}'), true);
  check('HUD text painted its glyphs without a DOM', model.hud.pixels.some((p) => p !== 0), true);
  const a = app.layout.markup();
  model.drawModel();
  check('same frame twice: same markup', app.layout.markup() === a, true);
  model.hud.setText('HUD 2');
  model.drawModel();
  check('setText changes the frame', app.layout.markup().split('\n').pop().includes('"HUD 2"'), true);

  const svg = app.layout.toSVG();
  check('headless SVG document of the model size', svg.split('\n').slice(0, 2), ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">', '<rect width="100%" height="100%" fill="#000000"/>']);
  check('SVG: the scene is projected into its viewport', (svg.match(/<line /g) || []).length, 12);
  check('SVG: the HUD text is there', svg.includes('>HUD 2</text>'), true);

  const small = headlessSceneApp(platform, 800, 600, {});
  small.fonts = app.fonts;
  const smallModel = new Model(small);
  small.model = smallModel;
  smallModel.init();
  smallModel.resizeModel();
  check('fit 800x600: fractional ratio 1.25, border above and below', [small.layout.ratio, smallModel.borderWidth, smallModel.borderHeight], [1.25, 0, 60]);
  smallModel.drawModel();
  check('the border paints only its strips, not over the desktop', small.layout.markup().split('\n').slice(0, 3), [
    '{"kind":"rect","x":0,"y":0,"width":640,"height":60,"color":"#101010"}',
    '{"kind":"rect","x":0,"y":420,"width":640,"height":60,"color":"#101010"}',
    '{"kind":"scene","id":"SceneEntity","x":40,"y":80,"width":560,"height":320}'
  ]);
  const coverPlatform = new WebGL2Platform({width: 640, height: 360, border: {minimal: 0, defaultColor: '#101010'}, fit: 'cover'});
  const cover = headlessSceneApp(coverPlatform, 1920, 1200, {});
  cover.fonts = app.fonts;
  const coverModel = new Model(cover);
  cover.model = coverModel;
  coverModel.init();
  coverModel.resizeModel();
  check('fit cover 1920x1200: ratio 3, desktop grows to 640x400, no border', [cover.layout.ratio, coverModel.desktopWidth, coverModel.desktopHeight, coverModel.borderWidth, coverModel.borderHeight], [3, 640, 400, 0, 0]);
  check('fit cover: desktop entity fills the model', [coverModel.desktopEntity.x, coverModel.desktopEntity.y, coverModel.desktopEntity.width, coverModel.desktopEntity.height, coverModel.desktopEntity.parentWidth], [0, 0, 640, 400, 640]);
  coverModel.drawModel();
  check('fit cover: no border strip in the frame', cover.layout.markup().split('\n')[0].startsWith('{"kind":"scene"'), true);
  const cover2 = headlessSceneApp(coverPlatform, 1000, 700, {});
  cover2.fonts = app.fonts;
  const coverModel2 = new Model(cover2);
  cover2.model = coverModel2;
  coverModel2.init();
  coverModel2.resizeModel();
  check('fit cover 1000x700: fractional ratio, desktop rounded up', [cover2.layout.ratio, coverModel2.desktopWidth, coverModel2.desktopHeight], [1000/640, 640, 448]);
  check('fit cover: toSVG has the grown size', cover2.layout.toSVG().split('\n')[0], '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 448">');

  const tiny = headlessSceneApp(platform, 320, 200, {});
  tiny.fonts = app.fonts;
  const tinyModel = new Model(tiny);
  tiny.model = tinyModel;
  tinyModel.init();
  tinyModel.resizeModel();
  check('fit 320x200: ratio never below 1, no negative border', [tiny.layout.ratio, tinyModel.borderWidth, tinyModel.borderHeight], [1, 0, 0]);

  // the bridge: a SceneEntity on a layout without paintScene draws its projection
  class BridgeModel extends AbstractModel {
    constructor(app) { super(app); this.id = 'BridgeModel'; }
    init() {
      super.init();
      this.desktopEntity.bkColor = false;
      this.view = new SceneEntity(this.desktopEntity, 0, 0, 200, 200, '#ffffff', false);
      this.view.scene.setCamera({position: [0, 0, 5], target: [0, 0, 0], fov: 90});
      this.view.scene.mesh(Mesh.box(2, 2, 2, {id: 'cube'}));
      this.desktopEntity.addEntity(this.view);
    }
  }
  const vapp = headlessVectorApp(new VectorPlatform({width: 200, height: 200, border: {minimal: 0, defaultColor: '#000000'}}), 400, 400, {});
  const vmodel = new BridgeModel(vapp);
  vapp.model = vmodel;
  vmodel.init();
  vmodel.resizeModel();
  const vlines = vapp.layout.markup().split('\n');
  check('bridge: 12 projected lines after the border on the vector layout', [vlines.length, vlines[1].startsWith('<line x1="116.667"')], [13, true]);
  check('bridge: the projection is cached while the scene stands still', vmodel.view.projectedList() === vmodel.view.projectedList(), true);
  vmodel.view.scene.setCamera({fov: 60});
  check('bridge: a camera change projects again', vmodel.view.projectedList().items[0].x1 !== 116.667, true);
}

console.log(`checkscene: ${checks} checks, ${differences} differences`);
process.exit(differences);
