export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

const TENANT_ID = process.env.AZURE_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const DRIVE_USER_ID = "266c3e3b-a7d8-47c2-ba6a-67091899a11d";
const BASE_FOLDER = process.env.ONEDRIVE_BASE_FOLDER ?? "Clientes 2026/Portal BeGreat";

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scope: "https://graph.microsoft.com/.default",
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Graph token");
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function driveUrl(path: string) {
  return `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/root:/${encodeURIComponent(BASE_FOLDER).replace(/%2F/g, "/")}/${path}`;
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
      ? `https://graph.microsoft.com/v1.0/users/${DRIVE_USER_ID}/drive/root:/${encodeURIComponent(BASE_FOLDER).replace(/%2F/g, "/")}:/children`
      : `${driveUrl(currentPath.substring(0, currentPath.lastIndexOf("/")))}:/children`;
    await fetch(parentUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: part, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    });
  }
}

export async function uploadFile(folderPath: string, filename: string, buffer: Buffer): Promise<string> {
  const token = await getToken();
  await ensureFolder(folderPath);

  const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
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
  return item.id as string;
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
