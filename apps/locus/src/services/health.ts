import { invoke } from "@tauri-apps/api/core";
import type { ServiceHealth } from "@locus/shared";

export async function getServiceStatus(): Promise<ServiceHealth> {
  return invoke<ServiceHealth>("get_service_status");
}
