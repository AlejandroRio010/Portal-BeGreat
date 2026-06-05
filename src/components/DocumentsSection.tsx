"use client";

import { useState, useRef } from "react";
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

export default function DocumentsSection({ docs, operationId }: { docs: Doc[]; operationId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      // 1. Upload directly to Cloudinary from the browser
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", "begreat_docs");
      cloudForm.append("folder", `begreat/ops/${operationId}`);
      cloudForm.append("resource_type", "auto");
      cloudForm.append("public_id", file.name);

      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/dgcbkeqw0/auto/upload",
        { method: "POST", body: cloudForm }
      );
      if (!cloudRes.ok) {
        const err = await cloudRes.json();
        setError("Error Cloudinary: " + (err?.error?.message ?? cloudRes.status));
        return;
      }
      const cloud = await cloudRes.json();

      // 2. Save URL + metadata to our database
      const res = await fetch(`/api/operations/${operationId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cloud.secure_url, filename: file.name, size: file.size }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Error ${res.status}`);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        router.refresh();
      }
    } catch (e) {
      setError("Error de red al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/operations/${operationId}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Documentos ({docs.length})
      </p>

      {/* Files list */}
      {docs.length > 0 && (
        <div className="space-y-2 mb-4">
          {docs.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 px-4 py-3 group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0">📄</span>
                <div className="min-w-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-800 hover:text-[#2E1A47] hover:underline truncate block">
                    {d.filename}
                  </a>
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
              <button onClick={() => handleDelete(d.id)}
                className="text-[10px] text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                Eliminar
              </button>
            </div>
          ))}
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
        <input ref={inputRef} type="file" className="hidden" onChange={handleSelect} />
        {uploading ? (
          <p className="text-sm text-gray-400">Subiendo documento...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-medium">Arrastra un archivo aquí o haz clic para subir</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes...</p>
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
    </div>
  );
}
