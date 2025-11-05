export type UserKeys = { id?: number; employee_code?: string | number; login_id?: string | number };
export type MatchInfo = { matched: boolean; reason?: string };

function eq(a: any, b: any) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

/** 現場レコード s が user に属するか判定。manager/casts/workers のどれでも一致したらOK。 */
export function siteIncludesUserDetailed(s: any, user: UserKeys): MatchInfo {
  const uid = user?.id;
  const emp = user?.employee_code;
  const lid = user?.login_id;

  // 1) manager オブジェクト（admin/sub/chief/leader）
  if (s?.manager && typeof s.manager === "object") {
    for (const k of ["admin","sub_admin1","sub_admin2","sub_admin3","chief","leader"]) {
      const v = s.manager[k];
      if (eq(v, uid) || eq(v, emp) || eq(v, lid)) return { matched: true, reason: `manager.${k}==${v}` };
    }
  }

  // 2) casts 配列
  if (Array.isArray(s?.casts)) {
    for (const c of s.casts) {
      if (eq(c?.user_id, uid) || eq(c?.id, uid) || eq(c?.employee_code, emp)) {
        return { matched: true, reason: "casts" };
      }
    }
  }

  // 3) workers 配列
  if (Array.isArray(s?.workers)) {
    for (const w of s.workers) {
      if (eq(w?.user_id, uid) || eq(w?.id, uid) || eq(w?.employee_code, emp)) {
        return { matched: true, reason: "workers" };
      }
    }
  }

  // 4) それ以外の保険（flatな user_id / employee_code が直下にあるケース）
  if (eq(s?.user_id, uid) || eq(s?.employee_code, emp)) return { matched: true, reason: "flat" };

  return { matched: false };
}
