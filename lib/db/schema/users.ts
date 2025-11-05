import type { Connection } from "mysql2/promise";

export type UserColumnMap = {
  id: "id";
  name?: string;
  email?: string;
  employee_code?: string;
  nameCandidates: string[];
  emailCandidates: string[];
  empCandidates: string[];
};

const NAME_CANDIDATES = ["name","login_name","user_name","username","display_name","full_name"];
const EMAIL_CANDIDATES = ["email","mail","mail_address","email_address"];
const EMP_CANDIDATES = ["employee_code","employee_number","employee_no","employeeNo"];

export async function detectUserColumns(conn: Connection): Promise<UserColumnMap> {
  const [rows] = await conn.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'users'`
  );
  const cols = new Set((rows ?? []).map(r => String(r.COLUMN_NAME)));

  const pick = (cands: string[]) => cands.find(c => cols.has(c));

  const name = pick(NAME_CANDIDATES);
  const email = pick(EMAIL_CANDIDATES);
  const employee_code = pick(EMP_CANDIDATES);

  return {
    id: "id",
    name,
    email,
    employee_code,
    nameCandidates: NAME_CANDIDATES.filter(c => cols.has(c)),
    emailCandidates: EMAIL_CANDIDATES.filter(c => cols.has(c)),
    empCandidates: EMP_CANDIDATES.filter(c => cols.has(c)),
  };
}
