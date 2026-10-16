const { Mat4 } = await import('./mat4.js?ver='+window.srcVersion);
// begin code

/**
 * Quaternions as plain arrays `[x, y, z, w]` — a rotation without the
 * gimbal lock of Euler angles: the camera of a game that eases its look
 * direction, an obstacle rolling about an edge, a ship's roll, yaw and
 * pitch composed in a fixed order. Static functions like {@link Vec3} and
 * {@link Mat4}, no instances, no DOM: the same numbers in the browser and
 * under Node.
 *
 * Conventions: unit quaternions; angles in **degrees**; a rotation by a
 * positive angle about an axis is counter-clockwise seen from the axis'
 * tip (the standard formula — the same in a left- and a right-handed
 * frame, only the picture is mirrored). Euler angles take an `order`
 * string: `'xyz'` applies X first, then Y, then Z (what {@link Mat4.compose}
 * does), `'zxy'` applies Z first, then X, then Y (Unity's order). `lerp` is
 * the normalised linear interpolation along the shorter arc (Unity's
 * `Quaternion.Lerp`); `slerp` the spherical one.
 */
export class Quat {

  /**
   * @returns {number[]} No rotation.
   */
  static identity() {
    return [0, 0, 0, 1];
  } // identity

  /**
   * The Hamilton product a · b: b is applied first, then a.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]}
   */
  static multiply(a, b) {
    return [
      a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
      a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
      a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
      a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
    ];
  } // multiply

  /**
   * A rotation about an axis (normalised here).
   * @param {number[]} axis - [x, y, z]
   * @param {number} degrees
   * @returns {number[]}
   */
  static axisAngle(axis, degrees) {
    var l = Math.sqrt(axis[0]*axis[0]+axis[1]*axis[1]+axis[2]*axis[2]) || 1;
    var h = degrees*Math.PI/360, s = Math.sin(h)/l;
    return [axis[0]*s, axis[1]*s, axis[2]*s, Math.cos(h)];
  } // axisAngle

  /**
   * Euler angles into a quaternion.
   * @param {number} x - Degrees about X.
   * @param {number} y - Degrees about Y.
   * @param {number} z - Degrees about Z.
   * @param {string} [order] - `'xyz'` (default: X first, as Mat4.compose) or `'zxy'` (Unity).
   * @returns {number[]}
   */
  static fromEuler(x, y, z, order) {
    var qx = Quat.axisAngle([1, 0, 0], x), qy = Quat.axisAngle([0, 1, 0], y), qz = Quat.axisAngle([0, 0, 1], z);
    if (order == 'zxy') {
      return Quat.multiply(qy, Quat.multiply(qx, qz));
    }
    if (order && order != 'xyz') {
      throw new Error('Quat.fromEuler: unknown order '+order);
    }
    return Quat.multiply(qz, Quat.multiply(qy, qx));
  } // fromEuler

  /**
   * The Euler angles of a quaternion, each in 0..360 (Unity's
   * `eulerAngles` for the `'zxy'` order).
   * @param {number[]} q
   * @param {string} [order] - `'xyz'` (default) or `'zxy'`.
   * @returns {number[]} [x, y, z] in degrees.
   */
  static toEuler(q, order) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var m00 = 1-2*(y*y+z*z), m01 = 2*(x*y-w*z), m02 = 2*(x*z+w*y);
    var m10 = 2*(x*y+w*z), m11 = 1-2*(x*x+z*z), m12 = 2*(y*z-w*x);
    var m20 = 2*(x*z-w*y), m21 = 2*(y*z+w*x), m22 = 1-2*(x*x+y*y);
    var d = 180/Math.PI, ex, ey, ez;
    var wrap = (a) => (a%360+360)%360;
    if (order == 'zxy') {
      if (m12 < 0.999999 && m12 > -0.999999) {
        ex = Math.asin(-m12)*d;
        ey = Math.atan2(m02, m22)*d;
        ez = Math.atan2(m10, m11)*d;
      } else {
        ex = (m12 < 0 ? 90 : -90);
        ey = Math.atan2(-m01, m00)*d;
        ez = 0;
      }
      return [wrap(ex), wrap(ey), wrap(ez)];
    }
    if (order && order != 'xyz') {
      throw new Error('Quat.toEuler: unknown order '+order);
    }
    // R = Rz · Ry · Rx
    if (m20 < 0.999999 && m20 > -0.999999) {
      ey = Math.asin(-m20)*d;
      ex = Math.atan2(m21, m22)*d;
      ez = Math.atan2(m10, m00)*d;
    } else {
      ey = (m20 < 0 ? 90 : -90);
      ex = Math.atan2(-m12, m11)*d;
      ez = 0;
    }
    return [wrap(ex), wrap(ey), wrap(ez)];
  } // toEuler

  /**
   * @param {number[]} q
   * @returns {number[]} q / |q|, the identity for a zero quaternion.
   */
  static normalize(q) {
    var l = Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);
    if (l == 0) {
      return [0, 0, 0, 1];
    }
    return [q[0]/l, q[1]/l, q[2]/l, q[3]/l];
  } // normalize

  /**
   * @param {number[]} q
   * @returns {number[]} The inverse rotation (the conjugate of a unit quaternion).
   */
  static conjugate(q) {
    return [-q[0], -q[1], -q[2], q[3]];
  } // conjugate

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  static dot(a, b) {
    return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
  } // dot

  /**
   * Normalised linear interpolation along the shorter arc, t clamped to
   * 0..1 (Unity's `Quaternion.Lerp`).
   * @param {number[]} a
   * @param {number[]} b
   * @param {number} t
   * @returns {number[]}
   */
  static lerp(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var sign = Quat.dot(a, b) < 0 ? -1 : 1;
    var q = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      q[i] = a[i]+(sign*b[i]-a[i])*t;
    }
    return Quat.normalize(q);
  } // lerp

  /**
   * Spherical interpolation along the shorter arc, t clamped to 0..1.
   * @param {number[]} a
   * @param {number[]} b
   * @param {number} t
   * @returns {number[]}
   */
  static slerp(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var cos = Quat.dot(a, b);
    var sign = 1;
    if (cos < 0) {
      cos = -cos;
      sign = -1;
    }
    if (cos > 0.9995) {
      return Quat.lerp(a, b, t);
    }
    var theta = Math.acos(cos), s = Math.sin(theta);
    var wa = Math.sin((1-t)*theta)/s, wb = sign*Math.sin(t*theta)/s;
    return [a[0]*wa+b[0]*wb, a[1]*wa+b[1]*wb, a[2]*wa+b[2]*wb, a[3]*wa+b[3]*wb];
  } // slerp

  /**
   * A vector rotated by a quaternion.
   * @param {number[]} q
   * @param {number[]} v - [x, y, z]
   * @returns {number[]}
   */
  static rotate(q, v) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    // t = 2 q × v; v' = v + w t + q × t
    var tx = 2*(y*v[2]-z*v[1]), ty = 2*(z*v[0]-x*v[2]), tz = 2*(x*v[1]-y*v[0]);
    return [
      v[0]+w*tx+(y*tz-z*ty),
      v[1]+w*ty+(z*tx-x*tz),
      v[2]+w*tz+(x*ty-y*tx)
    ];
  } // rotate

  /**
   * The rotation matrix of a unit quaternion (column-major, as Mat4).
   * @param {number[]} q
   * @returns {number[]}
   */
  static toMat4(q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    return [
      1-2*(y*y+z*z), 2*(x*y+w*z), 2*(x*z-w*y), 0,
      2*(x*y-w*z), 1-2*(x*x+z*z), 2*(y*z+w*x), 0,
      2*(x*z+w*y), 2*(y*z-w*x), 1-2*(x*x+y*y), 0,
      0, 0, 0, 1
    ];
  } // toMat4

  /**
   * The rotation that turns +Z along `forward` with +Y as near `up` as it
   * can (Unity's `Quaternion.LookRotation`).
   * @param {number[]} forward
   * @param {number[]} [up] - [0, 1, 0] by default.
   * @returns {number[]}
   */
  static lookRotation(forward, up) {
    up = up || [0, 1, 0];
    var fl = Math.sqrt(forward[0]*forward[0]+forward[1]*forward[1]+forward[2]*forward[2]) || 1;
    var f = [forward[0]/fl, forward[1]/fl, forward[2]/fl];
    // right = up × forward, then up = forward × right (Unity's left-handed basis: right, up, forward as columns)
    var r = [up[1]*f[2]-up[2]*f[1], up[2]*f[0]-up[0]*f[2], up[0]*f[1]-up[1]*f[0]];
    var rl = Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]) || 1;
    r = [r[0]/rl, r[1]/rl, r[2]/rl];
    var u = [f[1]*r[2]-f[2]*r[1], f[2]*r[0]-f[0]*r[2], f[0]*r[1]-f[1]*r[0]];
    // the matrix with columns r, u, f into a quaternion
    var m00 = r[0], m01 = u[0], m02 = f[0], m10 = r[1], m11 = u[1], m12 = f[1], m20 = r[2], m21 = u[2], m22 = f[2];
    var trace = m00+m11+m22, q;
    if (trace > 0) {
      var s = Math.sqrt(trace+1)*2;
      q = [(m21-m12)/s, (m02-m20)/s, (m10-m01)/s, 0.25*s];
    } else if (m00 > m11 && m00 > m22) {
      var s0 = Math.sqrt(1+m00-m11-m22)*2;
      q = [0.25*s0, (m01+m10)/s0, (m02+m20)/s0, (m21-m12)/s0];
    } else if (m11 > m22) {
      var s1 = Math.sqrt(1+m11-m00-m22)*2;
      q = [(m01+m10)/s1, 0.25*s1, (m12+m21)/s1, (m02-m20)/s1];
    } else {
      var s2 = Math.sqrt(1+m22-m00-m11)*2;
      q = [(m02+m20)/s2, (m12+m21)/s2, 0.25*s2, (m10-m01)/s2];
    }
    return Quat.normalize(q);
  } // lookRotation

  /**
   * A point rotated about a pivot (Unity's `Transform.RotateAround` on a
   * position and a rotation).
   * @param {number[]} position
   * @param {number[]} rotation - The quaternion of the thing.
   * @param {number[]} pivot
   * @param {number[]} axis
   * @param {number} degrees
   * @returns {{position: number[], rotation: number[]}}
   */
  static rotateAround(position, rotation, pivot, axis, degrees) {
    var q = Quat.axisAngle(axis, degrees);
    var d = Quat.rotate(q, [position[0]-pivot[0], position[1]-pivot[1], position[2]-pivot[2]]);
    return {
      position: [pivot[0]+d[0], pivot[1]+d[1], pivot[2]+d[2]],
      rotation: Quat.normalize(Quat.multiply(q, rotation))
    };
  } // rotateAround

  /**
   * T(position) · R(q) · S(scale): the matrix of a placed, turned and
   * scaled thing (the `transform` of a scene item as a matrix).
   * @param {number[]} position
   * @param {number[]} q
   * @param {number[]|number} [scale]
   * @returns {number[]}
   */
  static compose(position, q, scale) {
    var m = Mat4.multiply(Mat4.translation(position[0], position[1], position[2]), Quat.toMat4(q));
    if (scale !== undefined && scale !== null) {
      m = typeof scale == 'number' ? Mat4.scale(m, scale, scale, scale) : Mat4.scale(m, scale[0], scale[1], scale[2]);
    }
    return m;
  } // compose

} // Quat
