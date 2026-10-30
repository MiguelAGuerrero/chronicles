/**
 * The web fallback has no Documents folder, so captured media is kept in
 * IndexedDB as a data: URL alongside the capture row.
 */
export async function keepFile(tempUri: string, _walkId: string, _name: string): Promise<string> {
  if (tempUri.startsWith('data:')) return tempUri;
  const blob = await (await fetch(tempUri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
