export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  // iOS Safari ignores the `download` attribute on blob: URLs — instead of
  // saving the file it just navigates to display the raw JSON, so "Export
  // data" looked like it did nothing. Opening it in a new tab there lets
  // the user save it via the share sheet instead.
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Some mobile browsers only fire the click if the anchor is actually
  // attached to the document.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can race the download actually starting on some
  // mobile browsers — give it a beat.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
