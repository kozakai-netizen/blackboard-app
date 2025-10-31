// lib/db/sshMysql.ts
import { Client } from "ssh2";
import mysql from "mysql2/promise";
import fs from "fs";
import os from "os";
import path from "path";

type DoWithConn<T> = (conn: mysql.Connection) => Promise<T>;

function mustEnv(key: string, fallback?: string) {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
}

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
 * SSH踏み台経由でMySQLに接続して処理を実行。
 * リクエスト毎に確立/終了（開きっぱなしにしない）。
 */
export async function withSshMysql<T>(doWork: DoWithConn<T>): Promise<T> {
  const ssh = new Client();

  const sshConfig = {
    host: process.env.SSH_HOST ?? "52.196.65.142",
    port: Number(process.env.SSH_PORT ?? "22"),
    username: process.env.SSH_USER ?? "dandolijp",
    privateKey: readPrivateKey(),
    // passphrase: process.env.SSH_PASSPHRASE, // 必要なら使用
    keepaliveInterval: 30_000,
    keepaliveCountMax: 2,
  } as const;

  const dbHost = process.env.DB_REMOTE_HOST ?? "stg-work-db.dandoli.jp";
  const dbPort = Number(process.env.DB_REMOTE_PORT ?? 3306);
  const dbUser = process.env.DB_USER ?? "dandoliworks";
  const dbPass = mustEnv("DB_PASSWORD"); // 既に .env.local に設定済み想定
  const dbName = process.env.DB_NAME ?? "dandolijp";

  // 1) SSH接続
  await new Promise<void>((resolve, reject) => {
    ssh.once("ready", () => resolve()).once("error", reject).connect(sshConfig);
  });

  try {
    // 2) 踏み台からDBホスト:ポートへポートフォワードを開く
    const stream: any = await new Promise((resolve, reject) => {
      ssh.forwardOut(
        "127.0.0.1",
        0,
        dbHost,
        dbPort,
        (err, s) => (err ? reject(err) : resolve(s))
      );
    });

    // 3) MySQL接続（sshの転送ストリームを使用）
    const conn = await mysql.createConnection({
      user: dbUser,
      password: dbPass,
      database: dbName,
      stream,
    });

    try {
      return await doWork(conn);
    } finally {
      await conn.end();
    }
  } finally {
    ssh.end();
  }
}
