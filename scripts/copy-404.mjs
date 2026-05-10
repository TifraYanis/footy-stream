import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const indexPath = resolve("dist", "index.html");
const fallbackPath = resolve("dist", "404.html");

await mkdir(dirname(fallbackPath), { recursive: true });
await copyFile(indexPath, fallbackPath);
