import type { SqlDialect } from "./format-sql";

export const SQL_EXAMPLES: Record<SqlDialect, string> = {
  sql: "SELECT a, b, c FROM users WHERE a = 1 AND b = 2 ORDER BY a;",
  mysql: "SELECT `id`, `name` FROM `users` WHERE `id` = 1 LIMIT 10;",
  postgresql: "SELECT DISTINCT ON (user_id) user_id, created_at FROM logs ORDER BY user_id, created_at DESC;",
  tsql: "SELECT TOP 10 id, name FROM users WITH (NOLOCK) ORDER BY id DESC;",
  plsql: "SELECT * FROM users WHERE ROWNUM <= 10;",
  sqlite: "INSERT INTO users (name) VALUES ('Kim') ON CONFLICT(name) DO NOTHING;",
};
