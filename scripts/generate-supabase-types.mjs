import { spawnSync } from "node:child_process";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(scriptDirectory, "..");
const environmentPath = resolve(rootDirectory, ".env.local");
const targetPath = resolve(rootDirectory, "lib", "database.types.ts");
const temporaryPath = `${targetPath}.tmp`;
const checkOnly = process.argv.includes("--check");

function parseEnvironment(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");

        return [key, value];
      }),
  );
}

function getProjectReference(environment) {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return null;

  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function normalizeSource(source) {
  return source.replace(/\r\n/g, "\n").trimEnd();
}

const localEnvironment = parseEnvironment(
  await readFile(environmentPath, "utf8").catch(() => ""),
);
const projectReference = getProjectReference(localEnvironment);

if (!projectReference || !/^[a-z0-9-]+$/i.test(projectReference)) {
  throw new Error(
    "Projeto Supabase não identificado. Defina SUPABASE_PROJECT_REF ou NEXT_PUBLIC_SUPABASE_URL.",
  );
}

const cliPath = resolve(
  rootDirectory,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const result = spawnSync(
  process.execPath,
  [
    cliPath,
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectReference,
    "--schema",
    "public",
  ],
  {
    cwd: rootDirectory,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  },
);

if (result.error) throw result.error;

if (result.status !== 0) {
  const details =
    result.stderr?.trim() ||
    result.stdout?.trim() ||
    "Falha desconhecida da Supabase CLI.";
  throw new Error(
    `${details}\nExecute \"npm run supabase:login\" e tente novamente.`,
  );
}

const generatedSource = normalizeSource(result.stdout || "");

if (
  !generatedSource.includes("export type Database") ||
  !generatedSource.includes("public:")
) {
  throw new Error(
    "A Supabase CLI retornou uma tipagem inválida. O arquivo atual foi preservado.",
  );
}

if (checkOnly) {
  const currentSource = normalizeSource(await readFile(targetPath, "utf8"));

  if (currentSource !== generatedSource) {
    console.error(
      "lib/database.types.ts está diferente do schema remoto. Execute npm run db:types.",
    );
    process.exitCode = 1;
  } else {
    console.log("Tipagens Supabase sincronizadas com o schema remoto.");
  }
} else {
  try {
    await writeFile(temporaryPath, `${generatedSource}\n`, "utf8");
    await rename(temporaryPath, targetPath);
    console.log("lib/database.types.ts atualizado pelo schema remoto.");
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
