/**/

/*/

/**/
// begin code

/**
 * Extends the built-in String with additional text-manipulation helpers
 * tailored to the rendering needs of the svision library.
 */
export class RichString extends String{
  /**
   * Splits the string into fixed-length chunks and joins them with newlines,
   * producing a hard-wrapped copy of the string.
   * @param {number} len - Maximum number of characters per line.
   * @returns {RichString} A new RichString wrapped at the given line length.
   */
  wrap(len) {
    const chunks = [];
    for (let i = 0; i < this.length; i += len) {
      chunks.push(this.slice(i, i + len));
    }
    return new RichString(chunks.join('\n'));
  } // wrap
} // RichString

export default RichString;
