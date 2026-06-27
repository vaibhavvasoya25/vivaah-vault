"use client";

import { useState, useCallback, useEffect } from "react";
import { useCollection } from "../../hooks/useCollection";
import type { DriveFolder, DriveFile } from "../../types";
import {
  Plus, X, RefreshCw, Download, Play, Image as ImageIcon,
  ChevronLeft, ChevronRight, ExternalLink, FolderOpen, Loader2
} from "lucide-react";
import { createPortal } from "react-dom";
import { Modal } from "../../components/Modal";

export default function GalleryPage() {
  const { data: folders, add: addFolder, remove: removeFolder } = useCollection<DriveFolder>("driveFolders");

  const [linkInput, setLinkInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [files, setFiles] = useState<Record<string, DriveFile[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lightbox, setLightbox] = useState<{ files: DriveFile[]; index: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function extractFolderId(link: string) {
    const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async function handleAddFolder() {
    if (!linkInput.trim()) return;
    const folderId = extractFolderId(linkInput.trim());
    if (!folderId) { alert("Invalid Google Drive folder link. Make sure it contains /folders/"); return; }
    setSaving(true);
    try {
      await addFolder({ shareLink: linkInput.trim(), folderId, label: labelInput.trim() || "Photo Album", addedAt: Date.now() } as any);
      setLinkInput(""); setLabelInput(""); setAddModal(false);
    } finally { setSaving(false); }
  }

  const fetchFiles = useCallback(async (folder: DriveFolder) => {
    setLoading(l => ({ ...l, [folder.id]: true }));
    setErrors(e => ({ ...e, [folder.id]: "" }));
    try {
      const res = await fetch(`/api/drive?folderId=${folder.folderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setFiles(f => ({ ...f, [folder.id]: data.files }));
    } catch (e: any) {
      setErrors(err => ({ ...err, [folder.id]: e.message }));
    } finally {
      setLoading(l => ({ ...l, [folder.id]: false }));
    }
  }, []);

  function isVideo(file: DriveFile) {
    return file.mimeType.startsWith("video/");
  }

  function thumbnailUrl(file: DriveFile) {
    return file.thumbnailLink?.replace("=s220", "=s400") ||
      `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
  }

  // ── FIXED: use server-side proxy to bypass CORS on full-size images ──
  function viewUrl(file: DriveFile) {
    return `/api/drive-proxy?id=${file.id}&type=view`;
  }

  function downloadUrl(file: DriveFile) {
    return `https://drive.google.com/uc?export=download&id=${file.id}`;
  }

  // Lightbox
  function openLightbox(folderFiles: DriveFile[], index: number) {
    setLightbox({ files: folderFiles, index });
  }
  function lbPrev() { setLightbox(l => l ? { ...l, index: (l.index - 1 + l.files.length) % l.files.length } : null); }
  function lbNext() { setLightbox(l => l ? { ...l, index: (l.index + 1) % l.files.length } : null); }

  const lbFile = lightbox ? lightbox.files[lightbox.index] : null;

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Gallery</h1>
          <p className="text-gray-400 text-sm mt-0.5">Photos & videos from your Drive folders</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Folder
        </button>
      </div>

      {folders.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen size={40} className="text-ivory-400 mx-auto mb-4" />
          <p className="text-gray-500 font-medium font-serif text-lg">No albums connected yet</p>
          <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
            Share a Google Drive folder link and we'll display all your photos and videos here.
          </p>
          <button onClick={() => setAddModal(true)} className="btn-primary mt-4">
            + Connect a Drive Folder
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {folders.map((folder) => {
            const folderFiles = files[folder.id] || [];
            const isLoading = loading[folder.id];
            const error = errors[folder.id];
            const mediaFiles = folderFiles.filter(f => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/"));

            return (
              <div key={folder.id}>
                {/* Folder header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-maroon-900">{folder.label}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {mediaFiles.length > 0 ? `${mediaFiles.length} files` : "Not loaded yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchFiles(folder)}
                      disabled={isLoading}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-2"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isLoading ? "Loading…" : folderFiles.length > 0 ? "Refresh" : "Load Photos"}
                    </button>
                    <a href={folder.shareLink} target="_blank" rel="noopener noreferrer"
                      className="btn-ghost text-xs py-2 flex items-center gap-1.5">
                      <ExternalLink size={13} /> Drive
                    </a>
                    <button
                      onClick={() => { if (confirm(`Remove "${folder.label}" folder?`)) removeFolder(folder.id); }}
                      className="btn-ghost text-xs py-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-3">
                    Error: {error}. Make sure the folder is shared as "Anyone with the link".
                  </div>
                )}

                {!isLoading && folderFiles.length === 0 && !error && (
                  <div className="bg-ivory-100 rounded-xl py-8 text-center text-gray-400 text-sm">
                    Click "Load Photos" to fetch files from this Drive folder
                  </div>
                )}

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {mediaFiles.map((file, idx) => (
                      <div
                        key={file.id}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-ivory-200 cursor-pointer"
                        onClick={() => openLightbox(mediaFiles, idx)}
                      >
                        {/* Thumbnail */}
                        <img
                          src={thumbnailUrl(file)}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f5ede0' width='100' height='100'/%3E%3C/svg%3E"; }}
                        />

                        {/* Video indicator */}
                        {isVideo(file) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                              <Play size={18} className="text-white ml-0.5" fill="white" />
                            </div>
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

                        {/* Download btn */}
                        <a
                          href={downloadUrl(file)}
                          download
                          onClick={e => e.stopPropagation()}
                          className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/80"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Folder Modal */}
      {addModal && (
        <Modal title="Connect Drive Folder" onClose={() => setAddModal(false)}>
          <div className="space-y-3">
            <div className="bg-ivory-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">How to share a Drive folder:</p>
              <p>1. Open your folder in Google Drive</p>
              <p>2. Right-click → Share → General access → Anyone with the link → Viewer</p>
              <p>3. Copy link and paste below</p>
            </div>
            <div>
              <label className="label">Album Label</label>
              <input className="input" value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="e.g. Mehendi Photos, Baraat Video" />
            </div>
            <div>
              <label className="label">Google Drive Folder Link *</label>
              <input className="input" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAddModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddFolder} disabled={saving || !linkInput.trim()} className="btn-primary flex-1">
                {saving ? "Adding…" : "Connect Folder"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lightbox */}
      {lightbox && lbFile && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
            <p className="text-white/70 text-sm truncate max-w-xs">{lbFile.name}</p>
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm">{lightbox.index + 1} / {lightbox.files.length}</span>
              <a href={downloadUrl(lbFile)} download onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
                <Download size={16} /> Download
              </a>
              <button onClick={() => setLightbox(null)} className="text-white/70 hover:text-white p-1">
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center px-12 overflow-hidden" onClick={e => e.stopPropagation()}>
            {isVideo(lbFile) ? (
              <video
                src={viewUrl(lbFile)}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl"
                style={{ maxHeight: "calc(100vh - 140px)" }}
              />
            ) : (
              // ── FIXED: LightboxImage with loading spinner and thumbnail fallback ──
              <LightboxImage
                key={lbFile.id}
                src={viewUrl(lbFile)}
                fallbackSrc={thumbnailUrl(lbFile)}
                alt={lbFile.name}
              />
            )}
          </div>

          {/* Prev / Next */}
          {lightbox.files.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); lbPrev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <ChevronLeft size={22} />
              </button>
              <button onClick={e => { e.stopPropagation(); lbNext(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          <div className="flex gap-1.5 overflow-x-auto py-3 px-4 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
            {lightbox.files.map((f, i) => (
              <button key={f.id} onClick={() => setLightbox(l => l ? { ...l, index: i } : null)}
                className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === lightbox.index ? "border-gold-400" : "border-transparent opacity-60 hover:opacity-100"
                }`}>
                <img src={thumbnailUrl(f)} alt={f.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NEW: Lightbox image component with spinner + thumbnail fallback ──
function LightboxImage({ src, fallbackSrc, alt }: { src: string; fallbackSrc: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Spinner shown until image loads */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={36} className="text-white/30 animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`max-w-full max-h-full object-contain rounded-xl transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ maxHeight: "calc(100vh - 140px)" }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          // If proxy fails, fall back to the thumbnail URL
          if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
          }
        }}
      />
    </div>
  );
}