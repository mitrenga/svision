import importFromLoaded from './libImportFrom.js';

if (importFromLoaded() == true) {
  document.getElementById('import-from').innerText = 'OK';
  document.getElementById('import-from').classList.add('ok');
}
