// app/api/stg-blackboards/route.ts
import mysql from "mysql2/promise";

function env(key: string, fallback?: string) {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
}

export async function GET() {
  // dev限定：本番ビルドでは無効化
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STG !== "1") {
    return new Response("Not Found", { status: 404 });
  }

  const conn = await mysql.createConnection({
    host: env("DB_HOST", "127.0.0.1"),
    port: Number(env("DB_PORT", "13306")),
    user: env("DB_USER", "dandoliworks"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME", "dandolijp"),
  });

  // スキーマ名は実DBに合わせて調整可能
  const [rows] = await conn.execute<any[]>(
    `SELECT id, title, remarks, updated_at
       FROM blackboards
       ORDER BY updated_at DESC
       LIMIT 50`
  );

  await conn.end();
  return Response.json(rows ?? []);
}
