import { NextRequest, NextResponse } from "next/server";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

function extractFolderId(link: string): string | null {
  // Handles: https://drive.google.com/drive/folders/FOLDER_ID
  // and: https://drive.google.com/drive/u/0/folders/FOLDER_ID?usp=sharing
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function listFiles(folderId: string, apiKey: string): Promise<any[]> {
  const fields = "files(id,name,mimeType,thumbnailLink,webViewLink,modifiedTime,size)";
  const url = `${DRIVE_API}/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=${fields}&pageSize=100&orderBy=modifiedTime+desc`;

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

    if (!resolvedFolderId && link) {
      resolvedFolderId = extractFolderId(link);
    }

    if (!resolvedFolderId) {
      return NextResponse.json({ error: "Invalid Drive folder link" }, { status: 400 });
    }

    const files = await listFiles(resolvedFolderId, apiKey);

    // Separate folders and files
    const folders = files.filter((f) => f.mimeType === "application/vnd.google-apps.folder");
    const mediaFiles = files.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");

    // Optionally recurse into subfolders (one level deep)
    const subFiles: any[] = [];
    for (const folder of folders.slice(0, 5)) {
      const children = await listFiles(folder.id, apiKey);
      subFiles.push(
        ...children
          .filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
          .map((f) => ({ ...f, _subfolder: folder.name }))
      );
    }

    return NextResponse.json({
      folderId: resolvedFolderId,
      files: [...mediaFiles, ...subFiles],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}