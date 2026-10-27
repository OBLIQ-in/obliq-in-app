import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const emptyModule = new URL("./empty.mjs", import.meta.url).href;
const srcDirectory = fileURLToPath(new URL("../../../src/", import.meta.url));

function findTypeScriptModule(path) {
  for (const candidate of [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}/index.ts`,
  ]) {
    if (existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: emptyModule };
  }

  if (specifier.startsWith("@/")) {
    const url = findTypeScriptModule(
      resolvePath(srcDirectory, specifier.slice(2)),
    );
    if (url) {
      return nextResolve(url, context);
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      context.parentURL?.startsWith("file:") &&
      (specifier.startsWith("./") || specifier.startsWith("../"))
    ) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      const url = findTypeScriptModule(path);
      if (url) {
        return nextResolve(url, context);
      }
    }
    throw error;
  }
}
