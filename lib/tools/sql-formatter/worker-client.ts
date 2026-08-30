export function createSqlFormatWorker() {
  return new Worker(new URL("./sql-format-worker.ts", import.meta.url), { type: "module", name: "sql-formatter" });
}
