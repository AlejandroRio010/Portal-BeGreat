"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Doc {
  id: string;
  filename: string;
  url: string;
  size: number | null;
  uploaded_by: string;
  created_at: Date | string;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cloudinaryDownloadUrl(url: string, filename: string): string {
  // Add fl_attachment to force download for raw files
  return url.replace("/upload/", `/upload/fl_attachment:${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}/`);
}

// ── Tipos con vista previa en el navegador (PDF e imágenes) ──
const IMG_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];
const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();
const isImage = (name: string) => IMG_EXT.includes(extOf(name));
const isPdf = (name: string) => extOf(name) === "pdf";
const isPreviewable = (name: string) => isPdf(name) || isImage(name);
const iconOf = (name: string) => (isImage(name) ? "🖼️" : isPdf(name) ? "📕" : "📄");

export default function DocumentsSection({ docs, operationId, apiUrl, title = "Documentos", oneDriveFolder, canDelete = false }: { docs: Doc[]; operationId?: string; apiUrl?: string; title?: string; oneDriveFolder?: string; canDelete?: boolean }) {
  const resolvedApiUrl = apiUrl ?? `/api/operations/${operationId}/documents`;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  // Cerrar la vista previa con Escape
  useEffect(() => {
    if (!previewDoc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreviewDoc(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewDoc]);

  const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4MB
  const CHUNK_SIZE = 3_276_800; // 3.125MB (multiple of 320KB)

  async function uploadDirect(file: File): Promise<{ url: string; filename: string; size: number }> {
    // Leer ANTES de crear la sesión: si el archivo no se puede leer (placeholder
    // de iCloud/OneDrive, o a medio descargar) fallamos ya, con mensaje claro.
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      throw new Error("no se pudo leer el archivo. Ábrelo en tu ordenador (que se descargue del todo) y vuelve a subirlo.");
    }
    if (buffer.byteLength === 0 || buffer.byteLength !== file.size) {
      throw new Error("el archivo se leyó vacío o incompleto. Ábrelo en tu ordenador y vuelve a subirlo.");
    }

    const sessionRes = await fetch("/api/upload/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, folder: oneDriveFolder || undefined }),
    });
    if (!sessionRes.ok) {
      const j = await sessionRes.json().catch(() => ({}));
      throw new Error(j.error ?? `Error ${sessionRes.status}`);
    }
    const { uploadUrl } = await sessionRes.json();

    let offset = 0;
    let itemId = "";

    while (offset < buffer.byteLength) {
      const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
      const chunk = buffer.slice(offset, end);
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${offset}-${end - 1}/${buffer.byteLength}`,
        },
        body: chunk,
      });
      if (!res.ok && res.status !== 202) {
        const err = await res.text();
        throw new Error(`Upload chunk failed: ${res.status} ${err}`);
      }
      const data = await res.json();
      if (data.id) itemId = data.id;
      offset = end;
    }

    if (!itemId) throw new Error("OneDrive no confirmó la subida. Vuelve a intentarlo.");
    return { url: `onedrive:${itemId}`, filename: file.name, size: file.size };
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setError(null);
    setSuccess(false);
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`${i + 1} de ${files.length}: ${file.name}`);
      // Archivo vacío = casi siempre un placeholder de iCloud/OneDrive sin
      // descargar en este ordenador. Avisamos YA en vez de subir basura.
      if (file.size === 0) {
        errors.push(`${file.name}: está vacío (0 KB). Ábrelo en tu ordenador para que se descargue del todo y vuelve a subirlo.`);
        continue;
      }
      try {
        let result: { url: string; filename: string; size: number };

        if (file.size > DIRECT_UPLOAD_THRESHOLD) {
          result = await uploadDirect(file);
        } else {
          const formData = new FormData();
          formData.append("file", file);
          if (oneDriveFolder) formData.append("folder", oneDriveFolder);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (!uploadRes.ok) {
            const j = await uploadRes.json().catch(() => ({}));
            errors.push(`${file.name}: ${j.error ?? `Error ${uploadRes.status}`}`);
            continue;
          }
          result = await uploadRes.json();
        }

        const res = await fetch(`${resolvedApiUrl}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          errors.push(`${file.name}: ${j.error ?? `Error ${res.status}`}`);
        }
      } catch (e: any) {
        errors.push(`${file.name}: ${e.message ?? "Error de red"}`);
      }
    }

    setUploading(false);
    setUploadProgress("");
    if (errors.length > 0) {
      setError(errors.join("\n"));
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    router.refresh();
  }

  function checkDuplicatesAndUpload(files: File[]) {
    const existingNames = new Set(docs.map(d => d.filename.toLowerCase()));
    const dupes = files.filter(f => existingNames.has(f.name.toLowerCase()));
    if (dupes.length > 0) {
      setDuplicates(dupes.map(f => f.name));
      setPendingFiles(files);
    } else {
      uploadFiles(files);
    }
  }

  function confirmUpload() {
    const files = pendingFiles;
    setDuplicates([]);
    setPendingFiles([]);
    uploadFiles(files);
  }

  function uploadOnlyNew() {
    const dupSet = new Set(duplicates.map(n => n.toLowerCase()));
    const files = pendingFiles.filter(f => !dupSet.has(f.name.toLowerCase()));
    setDuplicates([]);
    setPendingFiles([]);
    if (files.length > 0) uploadFiles(files);
  }

  function cancelUpload() {
    setDuplicates([]);
    setPendingFiles([]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) checkDuplicatesAndUpload(files);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) checkDuplicatesAndUpload(files);
    e.target.value = "";
  }

  async function handleDelete(docId: string) {
    await fetch(`${resolvedApiUrl}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 p-5">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between text-left group/header ${open ? "mb-4 pb-3 border-b border-gray-100" : ""}`}>
        <span className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">
          {title} ({docs.length})
        </span>
        <span className="flex items-center gap-2">
          {!open && docs.length > 0 && (
            <span className="text-[10px] text-gray-400 group-hover/header:text-gray-500">Ver documentos</span>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (<>
      {/* Files list */}
      {docs.length > 0 && (() => {
        const nameCounts = new Map<string, number>();
        docs.forEach(d => {
          const key = d.filename.toLowerCase();
          nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
        });
        return (
          <div className="space-y-2 mb-4">
            {docs.map(d => {
              const isDupe = (nameCounts.get(d.filename.toLowerCase()) ?? 0) > 1;
              return (
                <div key={d.id} className={`flex items-center justify-between px-4 py-3 group ${isDupe ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-100"}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{iconOf(d.filename)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isPreviewable(d.filename) ? (
                          <button type="button" onClick={() => setPreviewDoc(d)} title="Vista previa"
                            className="text-sm font-semibold text-gray-800 hover:text-[#2E1A47] hover:underline truncate text-left">
                            {d.filename}
                          </button>
                        ) : (
                          <a href={`/api/download?docId=${d.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-800 hover:text-[#2E1A47] hover:underline truncate">
                            {d.filename}
                          </a>
                        )}
                        {isDupe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 flex-shrink-0">
                            DUPLICADO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {d.size && <span className="text-[10px] text-gray-400">{fmtSize(d.size)}</span>}
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">{d.uploaded_by}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(d.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                    {isPreviewable(d.filename) && (
                      <button onClick={() => setPreviewDoc(d)} title="Vista previa"
                        className="text-gray-300 hover:text-[#2E1A47] opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    )}
                    <a href={`/api/download?docId=${d.id}`} target="_blank" rel="noopener noreferrer" title="Descargar"
                      className="text-gray-300 hover:text-[#2E1A47] opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                    {canDelete && (
                      <button onClick={() => handleDelete(d.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-300 px-4 py-3">
          <p className="text-xs font-bold text-amber-800 mb-2">
            ⚠ {duplicates.length === 1 ? "Este archivo ya existe" : `${duplicates.length} archivos ya existen`}:
          </p>
          <ul className="space-y-1 mb-3">
            {duplicates.map(name => (
              <li key={name} className="text-xs text-amber-700 flex items-center gap-1.5">
                <span className="text-amber-500">•</span> {name}
              </li>
            ))}
          </ul>
          {pendingFiles.length > duplicates.length && (
            <p className="text-[11px] text-amber-700 mb-2">
              Los otros {pendingFiles.length - duplicates.length} archivo{pendingFiles.length - duplicates.length !== 1 ? "s" : ""} del lote no está{pendingFiles.length - duplicates.length !== 1 ? "n" : ""} duplicado{pendingFiles.length - duplicates.length !== 1 ? "s" : ""}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={confirmUpload}
              className="text-xs font-bold px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              Subir todo ({pendingFiles.length})
            </button>
            {pendingFiles.length > duplicates.length && (
              <button onClick={uploadOnlyNew}
                className="text-xs font-bold px-3 py-1.5 bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 transition-colors">
                Subir solo los nuevos ({pendingFiles.length - duplicates.length})
              </button>
            )}
            <button onClick={cancelUpload}
              className="text-xs font-semibold px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors">
              No subir nada
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-[#2E1A47] bg-[#EEEBF3]/50" :
          uploading ? "border-gray-200 bg-gray-50 pointer-events-none" :
          "border-gray-200 hover:border-[#2E1A47]/40 hover:bg-gray-50"
        }`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleSelect} />
        {uploading ? (
          <p className="text-sm text-gray-400">Subiendo {uploadProgress}...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-medium">Arrastra archivos aquí o haz clic para subir</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes... (varios a la vez)</p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 px-4 py-2">
          <p className="text-xs text-red-600 font-semibold">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-2 bg-emerald-50 border border-emerald-200 px-4 py-2">
          <p className="text-xs text-emerald-600 font-semibold">Documento subido correctamente ✓</p>
        </div>
      )}
      </>)}

      {/* Vista previa (PDF / imágenes) sin descargar */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex flex-col" onClick={() => setPreviewDoc(null)}>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#2E1A47] text-white" onClick={e => e.stopPropagation()}>
            <span className="text-sm font-semibold truncate flex items-center gap-2"><span>{iconOf(previewDoc.filename)}</span>{previewDoc.filename}</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              <a href={`/api/download?docId=${previewDoc.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline whitespace-nowrap">⤓ Descargar</a>
              <button onClick={() => setPreviewDoc(null)} title="Cerrar (Esc)" className="text-2xl leading-none hover:text-white/60">×</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-3 sm:p-6 flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}>
            {isImage(previewDoc.filename) ? (
              <img src={`/api/download?docId=${previewDoc.id}&inline=1`} alt={previewDoc.filename} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            ) : (
              <iframe src={`/api/download?docId=${previewDoc.id}&inline=1`} title={previewDoc.filename} className="w-full h-full bg-white rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
