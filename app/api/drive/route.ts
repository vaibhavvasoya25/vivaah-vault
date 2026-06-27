import { NextRequest, NextResponse } from "next/server";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

const MEDIA_MIMES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "image/heic", "image/heif", "image/bmp", "image/tiff",
  "video/mp4", "video/quicktime", "video/x-msvideo", "video/mpeg",
  "video/webm", "video/3gpp",
]);

function extractFolderId(link: string): string | null {
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function listFiles(folderId: string, apiKey: string): Promise<any[]> {
  const fields = "files(id,name,mimeType,thumbnailLink,webViewLink,modifiedTime,size)";
  const url = `${DRIVE_API}/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=${fields}&pageSize=200&orderBy=modifiedTime+desc`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Drive API error");
  }
  const data = await res.json();
  return data.files || [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link");
  const folderId = searchParams.get("folderId");

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_DRIVE_API_KEY not configured" }, { status: 500 });
  }

  try {
    let resolvedFolderId = folderId;
    if (!resolvedFolderId && link) resolvedFolderId = extractFolderId(link);
    if (!resolvedFolderId) {
      return NextResponse.json({ error: "Invalid Drive folder link" }, { status: 400 });
    }

    const allFiles = await listFiles(resolvedFolderId, apiKey);
    const subFolders = allFiles.filter((f) => f.mimeType === "application/vnd.google-apps.folder");
    const mediaFiles = allFiles.filter((f) => MEDIA_MIMES.has(f.mimeType));

    const subFiles: any[] = [];
    for (const folder of subFolders.slice(0, 10)) {
      const children = await listFiles(folder.id, apiKey);
      subFiles.push(...children.filter((f) => MEDIA_MIMES.has(f.mimeType)).map((f) => ({ ...f, _subfolder: folder.name })));
    }

    const combined = [...mediaFiles, ...subFiles];
    return NextResponse.json({ folderId: resolvedFolderId, files: combined, total: combined.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}