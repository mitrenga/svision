const { Vec3 } = await import('./vec3.js?ver='+window.srcVersion);
// begin code

/**
 * 4×4 matrices as plain arrays of 16 numbers in **column-major** order (the
 * order WebGL's `uniformMatrix4fv` takes without transposing): element
 * `m[col*4+row]`, the translation in `m[12..14]`. The functions are the ones
 * the first WebGL2 layout of the library carried as methods (`translate`,
 * `axisRotate`, `perspective`, `multiply` — same formulas, same numbers,
 * the `Matrix` suffix dropped) plus what a camera needs: `lookAt`,
 * `invert`, `transformPoint`. Static, no DOM, no GL: a tool under Node
 * projects a scene with them exactly as the renderer does.
 *
 * Every function returns a new array; `dst` is never written in place.
 */
export class Mat4 {

  /**
   * @returns {number[]} The identity matrix.
   */
  static identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  } // identity

  /**
   * a · b — applying b first, then a (as for column vectors).
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]}
   */
  static multiply(a, b) {
    var dst = new Array(16);
    for (var col = 0; col < 4; col++) {
      var b0 = b[col*4], b1 = b[col*4+1], b2 = b[col*4+2], b3 = b[col*4+3];
      for (var row = 0; row < 4; row++) {
        dst[col*4+row] = a[row]*b0+a[4+row]*b1+a[8+row]*b2+a[12+row]*b3;
      }
    }
    return dst;
  } // multiply

  /**
   * m · T(tx, ty, tz): the translation is applied to a point before m.
   * @param {number[]} m
   * @param {number} tx
   * @param {number} ty
   * @param {number} tz
   * @returns {number[]}
   */
  static translate(m, tx, ty, tz) {
    var dst = m.slice();
    dst[12] = m[0]*tx+m[4]*ty+m[8]*tz+m[12];
    dst[13] = m[1]*tx+m[5]*ty+m[9]*tz+m[13];
    dst[14] = m[2]*tx+m[6]*ty+m[10]*tz+m[14];
    dst[15] = m[3]*tx+m[7]*ty+m[11]*tz+m[15];
    return dst;
  } // translate

  /**
   * @param {number} tx
   * @param {number} ty
   * @param {number} tz
   * @returns {number[]} A translation matrix.
   */
  static translation(tx, ty, tz) {
    return Mat4.translate(Mat4.identity(), tx, ty, tz);
  } // translation

  /**
   * m · R(axis, angle): a rotation about an axis (normalised here), in
   * radians, right-handed, applied to a point before m.
   * @param {number[]} m
   * @param {number[]} axis
   * @param {number} angle - In radians.
   * @returns {number[]}
   */
  static axisRotate(m, axis, angle) {
    var n = Vec3.normalize(axis);
    var x = n[0], y = n[1], z = n[2];
    var c = Math.cos(angle), s = Math.sin(angle), t = 1-c;
    var r = [
      x*x*t+c,   x*y*t+z*s, x*z*t-y*s, 0,
      x*y*t-z*s, y*y*t+c,   y*z*t+x*s, 0,
      x*z*t+y*s, y*z*t-x*s, z*z*t+c,   0,
      0, 0, 0, 1
    ];
    return Mat4.multiply(m, r);
  } // axisRotate

  /**
   * @param {number[]} axis
   * @param {number} angle - In radians.
   * @returns {number[]} A rotation matrix.
   */
  static rotation(axis, angle) {
    return Mat4.axisRotate(Mat4.identity(), axis, angle);
  } // rotation

  /**
   * m · S(sx, sy, sz).
   * @param {number[]} m
   * @param {number} sx
   * @param {number} [sy] - Defaults to sx.
   * @param {number} [sz] - Defaults to sx.
   * @returns {number[]}
   */
  static scale(m, sx, sy, sz) {
    if (sy === undefined) sy = sx;
    if (sz === undefined) sz = sx;
    var dst = m.slice();
    for (var i = 0; i < 4; i++) {
      dst[i] = m[i]*sx;
      dst[4+i] = m[4+i]*sy;
      dst[8+i] = m[8+i]*sz;
    }
    return dst;
  } // scale

  /**
   * @param {number[]} m
   * @returns {number[]} The transposed matrix.
   */
  static transpose(m) {
    var dst = new Array(16);
    for (var col = 0; col < 4; col++) {
      for (var row = 0; row < 4; row++) {
        dst[col*4+row] = m[row*4+col];
      }
    }
    return dst;
  } // transpose

  /**
   * The inverse; the identity for a singular matrix.
   * @param {number[]} m
   * @returns {number[]}
   */
  static invert(m) {
    var m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
    var m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
    var m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
    var m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];
    var t0 = m22*m33, t1 = m32*m23, t2 = m12*m33, t3 = m32*m13;
    var t4 = m12*m23, t5 = m22*m13, t6 = m02*m33, t7 = m32*m03;
    var t8 = m02*m23, t9 = m22*m03, t10 = m02*m13, t11 = m12*m03;
    var t12 = m20*m31, t13 = m30*m21, t14 = m10*m31, t15 = m30*m11;
    var t16 = m10*m21, t17 = m20*m11, t18 = m00*m31, t19 = m30*m01;
    var t20 = m00*m21, t21 = m20*m01, t22 = m00*m11, t23 = m10*m01;
    var d0 = (t0*m11+t3*m21+t4*m31)-(t1*m11+t2*m21+t5*m31);
    var d1 = (t1*m01+t6*m21+t9*m31)-(t0*m01+t7*m21+t8*m31);
    var d2 = (t2*m01+t7*m11+t10*m31)-(t3*m01+t6*m11+t11*m31);
    var d3 = (t5*m01+t8*m11+t11*m21)-(t4*m01+t9*m11+t10*m21);
    var det = m00*d0+m10*d1+m20*d2+m30*d3;
    if (det == 0) {
      return Mat4.identity();
    }
    var d = 1/det;
    return [
      d*d0, d*d1, d*d2, d*d3,
      d*((t1*m10+t2*m20+t5*m30)-(t0*m10+t3*m20+t4*m30)),
      d*((t0*m00+t7*m20+t8*m30)-(t1*m00+t6*m20+t9*m30)),
      d*((t3*m00+t6*m10+t11*m30)-(t2*m00+t7*m10+t10*m30)),
      d*((t4*m00+t9*m10+t10*m20)-(t5*m00+t8*m10+t11*m20)),
      d*((t12*m13+t15*m23+t16*m33)-(t13*m13+t14*m23+t17*m33)),
      d*((t13*m03+t18*m23+t21*m33)-(t12*m03+t19*m23+t20*m33)),
      d*((t14*m03+t19*m13+t22*m33)-(t15*m03+t18*m13+t23*m33)),
      d*((t17*m03+t20*m13+t23*m23)-(t16*m03+t21*m13+t22*m23)),
      d*((t14*m22+t17*m32+t13*m12)-(t16*m32+t12*m12+t15*m22)),
      d*((t20*m32+t12*m02+t19*m22)-(t18*m22+t21*m32+t13*m02)),
      d*((t18*m12+t23*m32+t15*m02)-(t22*m32+t14*m02+t19*m12)),
      d*((t22*m22+t16*m02+t21*m12)-(t20*m12+t23*m22+t17*m02))
    ];
  } // invert

  /**
   * A perspective projection — the formula of the library's first WebGL2
   * layout (`perspectiveMatrix`), so a scene projects to the same numbers.
   * @param {number} fov - The vertical field of view in **radians**.
   * @param {number} aspect - width / height of the viewport.
   * @param {number} near
   * @param {number} far
   * @returns {number[]}
   */
  static perspective(fov, aspect, near, far) {
    var f = Math.tan(Math.PI*0.5-0.5*fov);
    var rangeInv = 1/(near-far);
    return [
      f/aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near+far)*rangeInv, -1,
      0, 0, near*far*rangeInv*2, 0
    ];
  } // perspective

  /**
   * An orthographic projection of the box [left, right] × [bottom, top] ×
   * [near, far] (distances in front of the camera) onto clip space.
   * @param {number} left
   * @param {number} right
   * @param {number} bottom
   * @param {number} top
   * @param {number} near
   * @param {number} far
   * @returns {number[]}
   */
  static orthographic(left, right, bottom, top, near, far) {
    return [
      2/(right-left), 0, 0, 0,
      0, 2/(top-bottom), 0, 0,
      0, 0, 2/(near-far), 0,
      (left+right)/(left-right), (bottom+top)/(bottom-top), (near+far)/(near-far), 1
    ];
  } // orthographic

  /**
   * The **camera** matrix: the camera at `eye` looking at `target`, its top
   * along `up` — the transform of the camera into the world. The view matrix
   * of the scene is its inverse (`Mat4.invert(Mat4.lookAt(...))`), which
   * {@link Scene3D#viewMatrix} does.
   * @param {number[]} eye
   * @param {number[]} target
   * @param {number[]} up
   * @returns {number[]}
   */
  static lookAt(eye, target, up) {
    var z = Vec3.normalize(Vec3.sub(eye, target));
    if (Vec3.length(z) == 0) {
      z = [0, 0, 1];
    }
    var x = Vec3.normalize(Vec3.cross(up, z));
    if (Vec3.length(x) == 0) {
      x = [1, 0, 0];
    }
    var y = Vec3.normalize(Vec3.cross(z, x));
    return [
      x[0], x[1], x[2], 0,
      y[0], y[1], y[2], 0,
      z[0], z[1], z[2], 0,
      eye[0], eye[1], eye[2], 1
    ];
  } // lookAt

  /**
   * m · [x, y, z, 1], divided by w — a point through a transform (or a
   * projection; the w before the division is what {@link Mat4.transformVec4}
   * gives).
   * @param {number[]} m
   * @param {number[]} p
   * @returns {number[]} [x, y, z]
   */
  static transformPoint(m, p) {
    var v = Mat4.transformVec4(m, p);
    var w = v[3] == 0 ? 1 : v[3];
    return [v[0]/w, v[1]/w, v[2]/w];
  } // transformPoint

  /**
   * m · [x, y, z, 1] without the division: clip coordinates with their w.
   * @param {number[]} m
   * @param {number[]} p
   * @returns {number[]} [x, y, z, w]
   */
  static transformVec4(m, p) {
    var x = p[0], y = p[1], z = p[2];
    return [
      m[0]*x+m[4]*y+m[8]*z+m[12],
      m[1]*x+m[5]*y+m[9]*z+m[13],
      m[2]*x+m[6]*y+m[10]*z+m[14],
      m[3]*x+m[7]*y+m[11]*z+m[15]
    ];
  } // transformVec4

  /**
   * m · [x, y, z, 0]: a direction (a normal) through the rotation and scale
   * of a transform, without its translation.
   * @param {number[]} m
   * @param {number[]} d
   * @returns {number[]}
   */
  static transformDirection(m, d) {
    var x = d[0], y = d[1], z = d[2];
    return [
      m[0]*x+m[4]*y+m[8]*z,
      m[1]*x+m[5]*y+m[9]*z,
      m[2]*x+m[6]*y+m[10]*z
    ];
  } // transformDirection

  /**
   * T · Rz · Ry · Rx · S — a point is scaled, turned about X, then Y, then Z
   * (angles in **degrees**, right-handed) and moved; the transform an item
   * of a scene gives as `{position, rotation, scale}` instead of a matrix.
   * @param {number[]} [position] - [x, y, z], default the origin.
   * @param {number[]} [rotation] - [rx, ry, rz] in degrees, default none.
   * @param {number[]|number} [scale] - [sx, sy, sz] or one number, default 1.
   * @returns {number[]}
   */
  static compose(position, rotation, scale) {
    var m = Mat4.identity();
    if (position) {
      m = Mat4.translate(m, position[0], position[1], position[2]);
    }
    if (rotation) {
      var rad = Math.PI/180;
      if (rotation[2]) m = Mat4.axisRotate(m, [0, 0, 1], rotation[2]*rad);
      if (rotation[1]) m = Mat4.axisRotate(m, [0, 1, 0], rotation[1]*rad);
      if (rotation[0]) m = Mat4.axisRotate(m, [1, 0, 0], rotation[0]*rad);
    }
    if (scale !== undefined && scale !== null) {
      if (typeof scale == 'number') {
        m = Mat4.scale(m, scale, scale, scale);
      } else {
        m = Mat4.scale(m, scale[0], scale[1], scale[2]);
      }
    }
    return m;
  } // compose

} // Mat4
