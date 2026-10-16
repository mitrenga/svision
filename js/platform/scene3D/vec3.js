// begin code

/**
 * Three-component vectors as plain arrays `[x, y, z]` — the little the
 * camera, the lights and the projection of a {@link Scene3D} need. Static
 * functions, no instances, no DOM: the same code runs in the browser and
 * under Node, and the results are plain numbers a tool can print.
 */
export class Vec3 {

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]} a + b
   */
  static add(a, b) {
    return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  } // add

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]} a - b
   */
  static sub(a, b) {
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  } // sub

  /**
   * @param {number[]} a
   * @param {number} s
   * @returns {number[]} a * s
   */
  static scale(a, s) {
    return [a[0]*s, a[1]*s, a[2]*s];
  } // scale

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number} The dot product.
   */
  static dot(a, b) {
    return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  } // dot

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]} a × b (right-handed).
   */
  static cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  } // cross

  /**
   * @param {number[]} a
   * @returns {number} |a|
   */
  static length(a) {
    return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
  } // length

  /**
   * @param {number[]} a
   * @returns {number[]} a / |a|, or the zero vector for a zero vector.
   */
  static normalize(a) {
    var l = Vec3.length(a);
    if (l == 0) {
      return [0, 0, 0];
    }
    return [a[0]/l, a[1]/l, a[2]/l];
  } // normalize

} // Vec3
