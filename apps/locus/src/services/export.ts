import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export async function saveMarkdownFile(
  defaultName: string,
  contents: string,
): Promise<boolean> {
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });

  if (!path || typeof path !== "string") {
    return false;
  }

  await invoke("write_text_file", { path, contents });
  return true;
}
