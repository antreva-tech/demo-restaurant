"use client";

import { useRef, useState } from "react";

/** Max size for upload (4 MB). Shown in UI. */
const MAX_SIZE_MB = 4;

export interface ImageUploadFieldProps {
  /** Current image URL (e.g. from editing item). */
  currentImageUrl?: string | null;
  /** Form field name for the image URL (default "imageUrl"). */
  name?: string;
  /** Label text. */
  label?: string;
  /** Label class name. */
  labelClassName?: string;
}

/**
 * Admin image field: file upload to Vercel Blob + optional URL fallback.
 * Uploaded or pasted URL is written to the named input for form submit.
 */
export function ImageUploadField({
  currentImageUrl,
  name = "imageUrl",
  label = "Imagen del producto",
  labelClassName = "text-antreva-navy",
}: ImageUploadFieldProps) {
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const displayUrl = uploadedUrl ?? currentImageUrl ?? "";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setUploadError(null);
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Máximo ${MAX_SIZE_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data?.error ?? "Error al subir");
        return;
      }
      const url = data?.url as string | undefined;
      if (url) {
        setUploadedUrl(url);
        if (urlInputRef.current) urlInputRef.current.value = url;
      }
    } catch {
      setUploadError("Error de conexión");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className="space-y-2">
        {displayUrl ? (
          <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Vista previa"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
            />
            <span className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-antreva-navy hover:bg-gray-50 disabled:opacity-50">
              {uploading ? "Subiendo…" : "Subir imagen"}
            </span>
          </label>
          <span className="text-sm text-gray-500">o pegar URL:</span>
        </div>
        <input
          ref={urlInputRef}
          type="url"
          name={name}
          defaultValue={currentImageUrl ?? ""}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-antreva-navy"
          aria-label="URL de imagen"
        />
        {uploadError && (
          <p className="text-sm text-red-600">{uploadError}</p>
        )}
      </div>
    </div>
  );
}
