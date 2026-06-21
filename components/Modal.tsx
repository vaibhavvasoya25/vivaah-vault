"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // document.body doesn't exist during SSR — wait for client mount
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-full flex items-end sm:items-center justify-center p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[calc(100dvh_-_2rem)] flex flex-col animate-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200 shrink-0">
            <h2 className="font-serif text-xl font-semibold text-maroon-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ivory-100"><X size={18} /></button>
          </div>
          <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}