export async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const textarea = document.createElement("textarea"); textarea.value = value; textarea.style.position = "fixed"; textarea.style.opacity = "0"; document.body.appendChild(textarea); textarea.select();
  if (!document.execCommand("copy")) throw new Error("CLIPBOARD_UNAVAILABLE"); textarea.remove();
}
