// lib/db/sshMysql.ts
import { Client } from "ssh2";
import mysql from "mysql2/promise";
import net from "net";
import fs from "fs";
import os from "os";
import path from "path";

type DoWithConn<T> = (conn: mysql.Connection) => Promise<T>;

function readPrivateKey(): Buffer {
  // 優先1: 環境変数にB64格納（.env.localで SSH_PRIVATE_KEY_B64 を設定しても使える）
  const b64 = process.env.SSH_PRIVATE_KEY_B64;
  if (b64) return Buffer.from(b64, "base64");

  // 優先2: ファイルパス（既定は ~/.ssh/dandoli_bastion）
  const keyPath =
    process.env.SSH_KEY_PATH ||
    path.join(os.homedir(), ".ssh", "dandoli_bastion");
  return fs.readFileSync(keyPath);
}

/**
 * ローカルポート13306に実際にクエリが通るかテスト
 */
async function canQueryLocal(): Promise<boolean> {
  const port = Number(process.env.DB_PORT ?? 13306);
  // 1) TCP接続
  const tcpOk = await new Promise<boolean>((res) => {
    const s = net.createConnection({ host: "127.0.0.1", port, timeout: 600 }, () => { s.end(); res(true); });
    s.on("error", () => res(false));
    s.on("timeout", () => { s.destroy(); res(false); });
  });
  if (!tcpOk) return false;

  // 2) 実クエリ
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      port,
      user: process.env.DB_USER ?? "dandoliworks",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? "dandolijp",
      connectTimeout: 1200,
    });
    await conn.query("SELECT 1");
    await conn.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * MySQL接続（自動フォールバック: local → SSH）
 * 環境変数 DB_MODE=local|ssh|auto で強制指定可能
 */
export async function withSshMysql<T>(doWork: DoWithConn<T>): Promise<T> {
  if (!process.env.DB_PASSWORD) throw new Error("DB_PASSWORD missing");

  // 環境で強制指定可: DB_MODE=local|ssh|auto
  const mode = (process.env.DB_MODE ?? "auto").toLowerCase();

  const tryLocal = async () => {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 13306),
      user: process.env.DB_USER ?? "dandoliworks",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? "dandolijp",
      connectTimeout: 1500,
    });
    try { return await doWork(conn); } finally { await conn.end(); }
  };

  const trySsh = async () => {
    const ssh = new Client();
    await new Promise<void>((resolve, reject) => {
      ssh.once("ready", () => resolve()).once("error", reject).connect({
        host: process.env.SSH_HOST ?? "52.196.65.142",
        port: Number(process.env.SSH_PORT ?? 22),
        username: process.env.SSH_USER ?? "dandolijp",
        privateKey: readPrivateKey(),
        keepaliveInterval: 30000,
        keepaliveCountMax: 2,
      });
    });
    try {
      const stream: any = await new Promise((resolve, reject) => {
        ssh.forwardOut("127.0.0.1", 0,
          process.env.DB_REMOTE_HOST ?? "stg-work-db.dandoli.jp",
          Number(process.env.DB_REMOTE_PORT ?? 3306),
          (err, s) => err ? reject(err) : resolve(s));
      });
      const conn = await mysql.createConnection({
        user: process.env.DB_USER ?? "dandoliworks",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME ?? "dandolijp",
        stream,
        connectTimeout: 3000,
      });
      try { return await doWork(conn); } finally { await conn.end(); }
    } finally {
      ssh.end();
    }
  };

  if (mode === "local") return tryLocal();
  if (mode === "ssh") return trySsh();

  // auto: 実接続で選択
  if (await canQueryLocal()) {
    (global as any).__DB_MODE_LAST = "local";
    return tryLocal();
  }
  (global as any).__DB_MODE_LAST = "ssh";
  return trySsh();
}
