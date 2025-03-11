const { awaitImportLoaded } = await import('./libAwaitImport.js?ver='+window.srcVersion);

if (awaitImportLoaded() == true) {
  document.getElementById('await-import').innerText = 'OK';
  document.getElementById('await-import').classList.add('ok');
}
