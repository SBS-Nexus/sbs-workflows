/**
 * Erzeugt eine Datei im Browser und bietet sie zum Speichern an. Es wird
 * nichts übertragen: Die Datei entsteht lokal aus einem Blob.
 */
export function downloadText(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Erst nach dem Start des Downloads freigeben.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
