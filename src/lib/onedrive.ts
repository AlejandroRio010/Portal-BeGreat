export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

export function clientFolderPath(clientName: string): string {
  const sanitized = sanitizeFolderName(clientName);
  const letter = sanitized.charAt(0).toUpperCase();
  return `${letter}/${sanitized}`;
}

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const DRIVE_USER_ID = "266c3e3b-a7d8-47c2-ba6a-67091899a11d";

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${env("AZURE_TENANT_ID")}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env("AZURE_CLIENT_ID"),
        scope: "https://graph.microsoft.com/.default",
        client_secret: env("AZURE_CLIENT_SECRET"),
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`Failed to get Graph token: ${data.error_description ?? data.error ?? "unknown"}`);
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function driveUrl(path: string) {
  const base = process.env.ONEDRIVE_BASE_FOLDER ?? `Clientes ${new Date().getFullYear()}`;
  return `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/root:/${encodeURIComponent(base).replace(/%2F/g, "/")}/${path}`;
}

export async function ensureFolder(folderPath: string): Promise<void> {
  const token = await getToken();
  const parts = folderPath.split("/");
  let currentPath = "";
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const url = `${driveUrl(currentPath)}`;
    const check = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (check.ok) continue;
    const parentUrl = currentPath === part
      ? `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/root:/${encodeURIComponent(process.env.ONEDRIVE_BASE_FOLDER ?? `Clientes ${new Date().getFullYear()}`).replace(/%2F/g, "/")}:/children`
      : `${driveUrl(currentPath.substring(0, currentPath.lastIndexOf("/")))}:/children`;
    await fetch(parentUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: part, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    });
  }
}

const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB

export async function uploadFile(folderPath: string, filename: string, buffer: Buffer): Promise<string> {
  const token = await getToken();
  await ensureFolder(folderPath);

  const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");

  if (buffer.length <= SIMPLE_UPLOAD_LIMIT) {
    const uploadUrl = `${driveUrl(`${folderPath}/${safeName}`)}:/content`;
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneDrive upload failed: ${res.status} ${err}`);
    }
    const item = await res.json();
    // Verificar que OneDrive guardó exactamente lo que enviamos (una subida
    // corrupta/vacía no debe registrarse jamás como si hubiera ido bien).
    if (typeof item.size === "number" && item.size !== buffer.length) {
      await deleteFile(item.id).catch(() => {});
      throw new Error(`La subida quedó corrupta (OneDrive guardó ${item.size} de ${buffer.length} bytes). Vuelve a subir el archivo.`);
    }
    return item.id as string;
  }

  const sessionUrl = `${driveUrl(`${folderPath}/${safeName}`)}:/createUploadSession`;
  const sessionRes = await fetch(sessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
  });
  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    throw new Error(`OneDrive upload session failed: ${sessionRes.status} ${err}`);
  }
  const { uploadUrl } = await sessionRes.json();

  const CHUNK_SIZE = 3_276_800; // 3.125MB (must be multiple of 320KB)
  let offset = 0;
  let itemId = "";
  let itemSize: number | null = null;

  while (offset < buffer.length) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.length);
    const chunk = buffer.subarray(offset, end);
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${offset}-${end - 1}/${buffer.length}`,
      },
      body: new Uint8Array(chunk),
    });
    if (!res.ok && res.status !== 202) {
      const err = await res.text();
      throw new Error(`OneDrive chunk upload failed: ${res.status} ${err}`);
    }
    const data = await res.json();
    if (data.id) itemId = data.id;
    if (typeof data.size === "number") itemSize = data.size;
    offset = end;
  }

  // Sin id no hay confirmación real; y si el tamaño no cuadra, la subida quedó mal.
  if (!itemId) throw new Error("OneDrive no confirmó la subida. Vuelve a subir el archivo.");
  if (itemSize != null && itemSize !== buffer.length) {
    await deleteFile(itemId).catch(() => {});
    throw new Error(`La subida quedó corrupta (OneDrive guardó ${itemSize} de ${buffer.length} bytes). Vuelve a subir el archivo.`);
  }
  return itemId;
}

/** Tamaño real de un archivo en OneDrive. null = no existe (404); lanza en otros errores. */
export async function getItemSize(itemId: string): Promise<number | null> {
  const token = await getToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/items/${itemId}?$select=size`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OneDrive item check failed: ${res.status}`);
  const item = await res.json();
  return typeof item.size === "number" ? item.size : null;
}

/** Última barrera antes de registrar un documento: comprueba que el archivo
 *  existe en OneDrive y NO está vacío. Devuelve el mensaje de error o null si
 *  todo bien. Si Graph no responde (red caída), no bloquea el registro. */
export async function verificarSubida(url: string, declaredSize?: number | null): Promise<string | null> {
  if (typeof declaredSize === "number" && declaredSize <= 0)
    return "El archivo está vacío (0 KB). Suele pasar con archivos de iCloud/OneDrive sin descargar al ordenador: ábrelo primero y vuelve a subirlo.";
  if (!url.startsWith("onedrive:")) return null;
  const itemId = url.slice("onedrive:".length);
  if (!itemId) return "La subida no se completó. Vuelve a subir el archivo.";
  let size: number | null;
  try { size = await getItemSize(itemId); } catch { return null; }
  if (size === null) return "El archivo no llegó a OneDrive. Vuelve a subirlo.";
  if (size === 0) {
    await deleteFile(itemId).catch(() => {});
    return "El archivo se subió vacío (0 KB). Suele pasar con archivos de iCloud/OneDrive sin descargar: ábrelo primero y vuelve a subirlo.";
  }
  if (typeof declaredSize === "number" && declaredSize > 0 && size !== declaredSize)
    return `La subida quedó incompleta (${size} de ${declaredSize} bytes). Vuelve a subir el archivo.`;
  return null;
}

export async function createUploadSession(folderPath: string, filename: string): Promise<{ uploadUrl: string }> {
  const token = await getToken();
  await ensureFolder(folderPath);
  const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
  const sessionUrl = `${driveUrl(`${folderPath}/${safeName}`)}:/createUploadSession`;
  const res = await fetch(sessionUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OneDrive session failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { uploadUrl: data.uploadUrl };
}

export async function downloadFile(itemId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = await getToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" }
  );
  if (!res.ok) throw new Error(`OneDrive download failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), contentType };
}

export async function deleteFile(itemId: string): Promise<void> {
  const token = await getToken();
  await fetch(
    `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/items/${itemId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
}
