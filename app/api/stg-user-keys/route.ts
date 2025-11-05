import { withSshMysql } from "@/lib/db/sshMysql";
import { detectUserColumns } from "@/lib/db/schema/users";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const name = searchParams.get("name");

  if (!id && !name) {
    return new Response(JSON.stringify({ error: "id or name required" }), { status: 400 });
  }

  try {
    const out = await withSshMysql(async (conn) => {
      const map = await detectUserColumns(conn);
      const fields = ["u.`id` AS id"];
      if (map.name) fields.push(`u.\`${map.name}\` AS name`);
      if (map.email) fields.push(`u.\`${map.email}\` AS email`);
      if (map.employee_code) fields.push(`u.\`${map.employee_code}\` AS employee_code`);

      const where: string[] = [];
      const params: any[] = [];
      if (id) { where.push("u.`id` = ?"); params.push(Number(id)); }
      if (name) {
        const cols = map.name ? [map.name] : map.nameCandidates;
        if (cols.length) {
          where.push("(" + cols.map(c => `u.\`${c}\` LIKE ?`).join(" OR ") + ")");
          cols.forEach(() => params.push(`%${name}%`));
        }
      }

      const sql = `SELECT ${fields.join(", ")} FROM users u ${where.length ? "WHERE " + where.join(" AND ") : ""} LIMIT 1`;
      const [rows] = await conn.query<any[]>(sql, params);
      const user = rows?.[0] ?? null;
      return { user, columns: map };
    });

    return Response.json(out);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
