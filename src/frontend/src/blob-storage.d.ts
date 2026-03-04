// Ambient type declarations for Caffeine blob-storage platform modules

declare module "blob-storage/ExternalBlob" {
  export class ExternalBlob {
    static fromBytes(bytes: Uint8Array): ExternalBlob;
    static fromURL(blobId: string): ExternalBlob;
    withUploadProgress(callback: (progress: number) => void): ExternalBlob;
    getDirectURL(): string;
  }
}

declare module "blob-storage/react" {
  import type { ExternalBlob } from "blob-storage/ExternalBlob";

  export interface StorageClient {
    store(blob: ExternalBlob): Promise<string>;
    getDirectURL(blobId: string): string;
  }

  export function useStorageClient(): StorageClient;
}
