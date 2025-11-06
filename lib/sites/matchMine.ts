export type UserKeys = {
  id?: string | number;
  employee_code?: string | number;
  login_id?: string | number;
};

export function buildKeySet(k: UserKeys | null | undefined) {
  const S = new Set<string>();
  if (!k) return S;
  [k.id, k.employee_code, k.login_id].forEach(v => {
    if (v !== null && v !== undefined && `${v}`.trim() !== '') {
      S.add(`${v}`);
    }
  });
  return S;
}

/** DW/STGの多様な構造に"ゆるく"対応して所属判定する */
export function includesUserLoose(site: any, keys: Set<string>): boolean {
  if (!keys || keys.size === 0 || !site) return false;

  const cands: any[] = [];

  // quicklist APIの正規化形式（フラットなmanager_id）
  cands.push(site.manager_id);

  // DW API原型（manager.admin等）
  cands.push(site.manager?.admin, site.manager?.chief, site.manager?.leader);
  [1, 2, 3].forEach(i => cands.push(site.manager?.[`sub_admin${i}`]));

  // 役割担当者（casts）
  if (Array.isArray(site.casts)) {
    cands.push(...site.casts.map((x: any) => x?.user_id ?? x?.id ?? x?.employee_code));
  }
  // 現場参加者（workers）
  if (Array.isArray(site.workers)) {
    cands.push(...site.workers.map((x: any) => x?.user_id ?? x?.id ?? x?.employee_code));
  }
  // フラット形式の参加者リスト
  if (Array.isArray(site.flat)) {
    cands.push(...site.flat.map((x: any) => x?.user_id ?? x?.employee_code ?? x?.id));
  }

  // STG側の別名
  cands.push(site.admin_id, site.owner_id);

  return cands
    .filter(v => v !== null && v !== undefined)
    .some(v => keys.has(String(v)));
}
