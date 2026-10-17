import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const emptyModule = new URL("./empty.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: emptyModule };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      context.parentURL?.startsWith("file:") &&
      (specifier.startsWith("./") || specifier.startsWith("../"))
    ) {
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        const url = new URL(candidate, context.parentURL).href;
        if (existsSync(fileURLToPath(url))) {
          return nextResolve(url, context);
        }
      }
    }
    throw error;
  }
}
