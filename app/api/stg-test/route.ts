import mysql from "mysql2/promise";

export async function GET() {
  // DB接続
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // 疎通確認用の簡単なクエリ
  const [rows] = await conn.query("SELECT 1 AS ok");

  await conn.end();

  return Response.json(rows);
}
