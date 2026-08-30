/// <reference lib="webworker" />
import { formatSql, type SqlFormatOptions, type SqlFormatResult } from "./format-sql";

export type SqlFormatRequest = { requestId: number; sql: string; options: SqlFormatOptions };
export type SqlFormatResponse = { requestId: number } & SqlFormatResult;

self.onmessage = (event: MessageEvent<SqlFormatRequest>) => {
  const { requestId, sql, options } = event.data;
  const result = formatSql(sql, options);
  self.postMessage({ requestId, ...result } satisfies SqlFormatResponse);
};

export {};
