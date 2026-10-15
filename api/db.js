// DB layer: MySQL-compatible (TiDB Cloud free tier) in production,
// node:sqlite only for local testing (LOCAL_DB=1).
let pool, ready;
async function raw() {
  if (process.env.LOCAL_DB) {
    if (!pool) {
      const { DatabaseSync } = require('node:sqlite');
      const d = new DatabaseSync(process.env.LOCAL_DB === '1' ? ':memory:' : process.env.LOCAL_DB);
      pool = { query: async (sql, p = []) => {
        const s = sql.trim();
        if (/^select/i.test(s)) return [d.prepare(s).all(...p)];
        d.prepare(s).run(...p); return [[]];
      } };
    }
    return pool;
  }
  if (!pool) {
    const mysql = require('mysql2/promise');
    const e = process.env;
    const url = e.DB_URL ? new URL(e.DB_URL) : null;
    pool = mysql.createPool({
      host: url ? url.hostname : e.DB_HOST, port: Number(url ? url.port || 4000 : e.DB_PORT || 4000),
      user: url ? decodeURIComponent(url.username) : e.DB_USER, password: url ? decodeURIComponent(url.password) : e.DB_PASSWORD,
      database: (url ? url.pathname.slice(1) : e.DB_NAME) || 'test',
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionLimit: 3, waitForConnections: true, charset: 'utf8mb4',
    });
  }
  return pool;
}
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS diary_entries (id VARCHAR(24) PRIMARY KEY, title VARCHAR(200) NOT NULL, body MEDIUMTEXT NOT NULL, mood VARCHAR(20) NOT NULL, font VARCHAR(12) NOT NULL, shared INT NOT NULL, entry_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS diary_links (id VARCHAR(24) PRIMARY KEY, label VARCHAR(80) NOT NULL, token VARCHAR(64) NOT NULL, salt VARCHAR(32) NOT NULL, hash VARCHAR(128) NOT NULL, ver INT NOT NULL, revoked INT NOT NULL, created_at BIGINT NOT NULL, last_opened BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS diary_settings (k VARCHAR(40) PRIMARY KEY, v VARCHAR(200) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS diary_attempts (k VARCHAR(120) PRIMARY KEY, n INT NOT NULL, until_at BIGINT NOT NULL)`,
];
async function q(sql, params = []) {
  const p = await raw();
  if (!ready) { ready = (async () => { for (const s of SCHEMA) await p.query(s); })(); }
  await ready;
  const [rows] = await p.query(sql, params);
  return rows;
}
module.exports = { q };
