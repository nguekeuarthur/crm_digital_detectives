import { api } from './base';

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string;
  userId?: string;
  createdAt: string;
  deletedAt?: string;
  exifData?: Record<string, unknown>;
  geoLat?: number | null;
  geoLng?: number | null;
}

export interface FileMetadata {
  exif: Record<string, unknown> | null;
  geo: { lat: number | null; lng: number | null };
}

export function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

export function isVideo(mimeType: string) {
  return mimeType.startsWith('video/');
}

export function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export class FileApi {
  static async listInFolder(folderId: string): Promise<FileItem[]> {
    const r = await api.get(`/folders/${folderId}/files`);
    return r.data;
  }

  static async upload(
    folderId: string,
    file: File,
    onProgress: (pct: number) => void
  ): Promise<FileItem> {
    const form = new FormData();
    form.append('file', file);
    const r = await api.post(`/folders/${folderId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e =>
        onProgress(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1))),
    });
    return r.data;
  }

  static async rename(id: string, name: string): Promise<FileItem> {
    const r = await api.patch(`/files/${id}`, { name });
    return r.data;
  }

  static async remove(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  }

  static async getMetadata(id: string): Promise<FileMetadata> {
    const r = await api.get(`/files/${id}/metadata`);
    return r.data;
  }

  /** Returns a revokable blob URL for displaying the file in <img>/<video> */
  static async getBlobUrl(id: string): Promise<string> {
    const r = await api.get(`/files/stream/${id}`, { responseType: 'blob' });
    return URL.createObjectURL(r.data);
  }
}
