"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCollection } from "../../hooks/useCollection";
import type { DriveFolder, DriveFile } from "../../types";
import {
  Plus, X, RefreshCw, Download, Play,
  ChevronLeft, ChevronRight, ExternalLink, FolderOpen, Loader2
} from "lucide-react";
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

  // Keyboard nav + scroll lock
  useEffect(() => {
    if (!lightbox) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      return;
    }
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox(l => l ? { ...l, index: (l.index - 1 + l.files.length) % l.files.length } : null);
      if (e.key === "ArrowRight") setLightbox(l => l ? { ...l, index: (l.index + 1) % l.files.length } : null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [!!lightbox]);

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
    return file.mimeType?.startsWith("video/");
  }

  // Grid thumbnails: use Drive's thumbnail directly — these work fine in <img> tags
  function thumbnailUrl(file: DriveFile) {
    if (file.thumbnailLink) {
      // Drive returns e.g. =s220 size — bump it up for sharper display
      return file.thumbnailLink.replace(/=s\d+/, "=s400");
    }
    // Fallback: Drive's public thumbnail endpoint (works for shared files)
    return `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
  }

  // Full-size image in lightbox: use our server proxy to bypass CORS
  function viewUrl(file: DriveFile) {
    return `/api/drive-proxy?id=${file.id}&type=view`;
  }

  function downloadUrl(file: DriveFile) {
    return `https://drive.google.com/uc?export=download&id=${file.id}`;
  }

  function openLightbox(folderFiles: DriveFile[], index: number) {
    setLightbox({ files: folderFiles, index });
  }

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
            const mediaFiles = folderFiles.filter(f =>
              f.mimeType?.startsWith("image/") || f.mimeType?.startsWith("video/")
            );

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
                        {/* Thumbnail — direct Drive URL, no proxy needed */}
                        <img
                          src={thumbnailUrl(file)}
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f5ede0' width='100' height='100'/%3E%3C/svg%3E";
                          }}
                        />
                        {isVideo(file) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                              <Play size={18} className="text-white ml-0.5" fill="white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
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
              <input className="input" value={labelInput} onChange={e => setLabelInput(e.target.value)}
                placeholder="e.g. Mehendi Photos, Baraat Video" />
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

      {/* Lightbox via Portal — renders directly into document.body */}
      {lightbox && lbFile && (
        <Lightbox
          files={lightbox.files}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(l => l ? { ...l, index: (l.index - 1 + l.files.length) % l.files.length } : null)}
          onNext={() => setLightbox(l => l ? { ...l, index: (l.index + 1) % l.files.length } : null)}
          onJump={(i) => setLightbox(l => l ? { ...l, index: i } : null)}
          isVideo={isVideo}
          thumbnailUrl={thumbnailUrl}
          viewUrl={viewUrl}
          downloadUrl={downloadUrl}
        />
      )}
    </div>
  );
}

function Lightbox({
  files, index, onClose, onPrev, onNext, onJump,
  isVideo, thumbnailUrl, viewUrl, downloadUrl
}: {
  files: DriveFile[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  isVideo: (f: DriveFile) => boolean;
  thumbnailUrl: (f: DriveFile) => string;
  viewUrl: (f: DriveFile) => string;
  downloadUrl: (f: DriveFile) => string;
}) {
  const file = files[index];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.95)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
          {file.name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{index + 1} / {files.length}</span>
          <a
            href={downloadUrl(file)}
            download
            onClick={e => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}
          >
            <Download size={15} /> Download
          </a>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 4, display: "flex" }}
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, minHeight: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px 72px", overflow: "hidden",
        }}
      >
        {isVideo(file) ? (
          <video
            key={file.id}
            src={viewUrl(file)}
            controls autoPlay
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 10, display: "block" }}
          />
        ) : (
          <LightboxImage
            key={file.id}
            proxyUrl={viewUrl(file)}
            thumbnailUrl={thumbnailUrl(file)}
            alt={file.name}
          />
        )}
      </div>

      {/* Prev button */}
      {files.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "white",
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next button */}
      {files.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "white",
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Thumbnail strip */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flexShrink: 0, display: "flex", gap: 6,
          overflowX: "auto", padding: "12px 16px",
          justifyContent: "center",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {files.map((f, i) => (
          <button
            key={f.id}
            onClick={() => onJump(i)}
            style={{
              flexShrink: 0, width: 52, height: 52, borderRadius: 8,
              overflow: "hidden",
              border: i === index ? "2px solid #fbbf24" : "2px solid transparent",
              opacity: i === index ? 1 : 0.45,
              cursor: "pointer", padding: 0, background: "#222",
              transition: "opacity 0.15s, border-color 0.15s",
            }}
          >
            <img
              src={thumbnailUrl(f)}
              alt={f.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

// Strategy:
// 1. Show thumbnail immediately (already loaded in grid, instant display)
// 2. Simultaneously load full-res via proxy in background
// 3. Swap to full-res when ready; stay on thumbnail if proxy fails
function LightboxImage({ proxyUrl, thumbnailUrl, alt }: { proxyUrl: string; thumbnailUrl: string; alt: string }) {
  const [fullLoaded, setFullLoaded] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);

  // Reset on image change
  useEffect(() => {
    setFullLoaded(false);
    setFullFailed(false);
  }, [proxyUrl]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* Thumbnail shown immediately as placeholder */}
      <img
        src={thumbnailUrl}
        alt={alt}
        style={{
          position: "absolute",
          maxWidth: "100%", maxHeight: "100%",
          objectFit: "contain", borderRadius: 10,
          display: "block",
          // Hide once full-res is ready
          opacity: fullLoaded ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Spinner shown while full-res is loading */}
      {!fullLoaded && !fullFailed && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" }}>
          <Loader2 size={28} style={{ color: "rgba(255,255,255,0.4)" }} className="animate-spin" />
        </div>
      )}

      {/* Full-res image loads in background, fades in when ready */}
      {!fullFailed && (
        <img
          src={proxyUrl}
          alt={alt}
          style={{
            position: "absolute",
            maxWidth: "100%", maxHeight: "100%",
            objectFit: "contain", borderRadius: 10,
            display: "block",
            opacity: fullLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          onLoad={() => setFullLoaded(true)}
          onError={() => setFullFailed(true)}
        />
      )}
    </div>
  );
}