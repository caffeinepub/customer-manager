import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useEffect, useRef } from "react";
import type { ExternalBlob } from "../backend";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export interface BlobStorageClient {
  /**
   * Upload an ExternalBlob created via ExternalBlob.fromBytes().
   * Returns the direct URL string that can be stored as a blobId and later
   * passed back to ExternalBlob.fromURL(url).getDirectURL().
   */
  store(blob: ExternalBlob): Promise<string>;
}

/**
 * Returns a storage client that can upload blobs and return direct URLs.
 * The returned URL can be stored in the backend as a `blobId` / `receiptBlobId`.
 */
export function useStorageClient(): BlobStorageClient {
  const { identity } = useInternetIdentity();
  const clientRef = useRef<StorageClient | null>(null);
  const configRef = useRef<{
    bucket_name: string;
    storage_gateway_url: string;
    backend_canister_id: string;
    project_id: string;
  } | null>(null);

  // Eagerly load config once
  useEffect(() => {
    loadConfig().then((cfg) => {
      configRef.current = {
        bucket_name: cfg.bucket_name,
        storage_gateway_url: cfg.storage_gateway_url,
        backend_canister_id: cfg.backend_canister_id,
        project_id: cfg.project_id,
      };
      clientRef.current = null; // invalidate on config change
    });
  }, []);

  const getClient = useCallback(async (): Promise<StorageClient> => {
    const cfg = configRef.current ?? (await loadConfig());

    if (!configRef.current) {
      configRef.current = {
        bucket_name: cfg.bucket_name,
        storage_gateway_url: cfg.storage_gateway_url,
        backend_canister_id: cfg.backend_canister_id,
        project_id: cfg.project_id,
      };
    }

    if (!clientRef.current) {
      const agentOptions = identity ? { identity } : {};
      const backendHost = (cfg as { backend_host?: string }).backend_host;
      const agent = new HttpAgent({
        ...agentOptions,
        host: backendHost,
      });
      if (backendHost?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }
      clientRef.current = new StorageClient(
        cfg.bucket_name,
        cfg.storage_gateway_url,
        cfg.backend_canister_id,
        cfg.project_id,
        agent,
      );
    }
    return clientRef.current;
  }, [identity]);

  const store = useCallback(
    async (blob: ExternalBlob): Promise<string> => {
      const client = await getClient();
      const bytes = await blob.getBytes();
      const { hash } = await client.putFile(bytes, blob.onProgress);
      // Return the direct URL so it can be used with ExternalBlob.fromURL()
      return client.getDirectURL(hash);
    },
    [getClient],
  );

  return { store };
}
