class Config_LibClassSyntax {

    constructor() {
      this.libLoaded = true;
    } // constructor
  
} // class Config_LibClassSyntax
  
var config_libClassSyntax = new Config_LibClassSyntax();

if (config_libClassSyntax.libLoaded === true) {
  document.getElementById('class-syntax').innerText = 'OK';
  document.getElementById('class-syntax').classList.add('ok');
}
