/**/

/*/

/**/
// begin code

export class RichString extends String{
  wrap(len) {
    const chunks = [];
    for (let i = 0; i < this.length; i += len) {
      chunks.push(this.slice(i, i + len));
    }
    return new RichString(chunks.join('\n'));
  } // wrap
} // RichString

export default RichString;
