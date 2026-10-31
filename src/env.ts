import "server-only";
import { accessSync, constants, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DOWNLOAD_DIR: z
    .string({ error: "DOWNLOAD_DIR is required" })
    .refine(isAbsolute, {
      error: "DOWNLOAD_DIR must be an absolute path",
      abort: true,
    })
    .refine(isWritableDirectory, {
      error: "DOWNLOAD_DIR must be an existing, writable directory",
    }),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

function isWritableDirectory(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
