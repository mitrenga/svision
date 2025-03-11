import importFromLoaded from './libImportFrom.js';

if (importFromLoaded() == true) {
  document.cookie='libImportMethod=import-from;max-age=31536000;path=/';
  location.reload();
}
