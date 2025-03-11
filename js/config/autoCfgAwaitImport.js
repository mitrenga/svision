const { awaitImportLoaded } = await import('./libAwaitImport.js?ver='+window.srcVersion);

if (awaitImportLoaded() == true) {
  document.cookie='libImportMethod=await-import;max-age=31536000;path=/';
  location.reload();
}
