/**
 * 現場一覧画面
 *
 * - 開発モード（DEV MODE）: ?role=prime/sub でログインスキップ
 * - 協力業者の二重フィルタ回避: isSubUser判定でincludesUserLooseをスキップ
 * - 元請けのみ「自分の現場のみ」トグル表示
 *
 * 詳細仕様: docs/dw-integration-spec.md を参照
 */
"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SiteCard } from "@/components/SiteCard";
import { useViewMode } from "@/lib/ui/useViewMode";
import { GridView } from "@/components/sites/views/GridView";
import { GalleryView } from "@/components/sites/views/GalleryView";
import { KanbanView } from "@/components/sites/views/KanbanView";
import { ListView } from "@/components/sites/views/ListView";
import { buildKeySet, includesUserLoose, UserKeys } from "@/lib/sites/matchMine";
import Toolbar from "@/components/sites/Toolbar";

type State = "idle" | "loading" | "ok" | "empty" | "error";

// URL & localStorage 同期用フック
function useQueryBool(key: string, defaultVal: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // SSR対応: initialをstateの初期値ではなく、useEffect内で設定
  const [val, setVal] = useState<boolean>(defaultVal);
  const [initialized, setInitialized] = useState(false);

  // クライアントサイドで初期値を設定
  useEffect(() => {
    if (initialized) return;

    const v = sp.get(key);
    if (v === '1' || v === 'true') {
      setVal(true);
    } else if (v === '0' || v === 'false') {
      setVal(false);
    } else if (typeof window !== 'undefined') {
      const ls = localStorage.getItem(`sites.${key}`);
      if (ls === '1' || ls === 'true') {
        setVal(true);
      } else if (ls === '0' || ls === 'false') {
        setVal(false);
      }
    }
    setInitialized(true);
  }, [sp, key, initialized]);

  // URL & localStorage同期
  useEffect(() => {
    if (!initialized || typeof window === 'undefined') return;

    localStorage.setItem(`sites.${key}`, val ? '1' : '0');
    const u = new URL(window.location.href);
    u.searchParams.set(key, val ? '1' : '0');
    router.replace(`${pathname}?${u.searchParams.toString()}`, { scroll: false });
  }, [val, key, router, pathname, initialized]);

  return [val, setVal] as const;
}

export default function SitesSearchPage() {
  const router = useRouter();
  const { viewMode, setViewMode } = useViewMode();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [onlyMine, setOnlyMine] = useQueryBool('only', false); // URL & localStorage 同期
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<any>(null);
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // セッション情報（ログイン状態）
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ユーザーキー情報を取得
  const [userKeys, setUserKeys] = useState<UserKeys | null>(null);

  // 詳細検索フィルター
  const [searchQuery, setSearchQuery] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [selectedSiteType, setSelectedSiteType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [selectedRoleManager, setSelectedRoleManager] = useState("");

  // セッションからuserIdを取得（優先）、なければデフォルト値
  const uid = sessionUser?.userId || (typeof window !== "undefined"
    ? Number(sessionStorage.getItem("userId") ?? process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? 40824)
    : 40824);

  const placeCode = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1"
    : "dandoli-sample1";

  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const quick = search?.get("quick") === "1";
  const debug = search?.get("debug") === "1";

  // 🔧 開発環境専用: ?role=prime or ?role=sub でユーザー切り替え
  const devRole = search?.get("role"); // "prime" or "sub"
  const isDev = process.env.NODE_ENV === 'development';

  // セッション情報を取得
  useEffect(() => {
    (async () => {
      try {
        // 🔧 開発モードで ?role が指定されている場合、固定ユーザーをセット
        if (isDev && devRole && (devRole === 'prime' || devRole === 'sub')) {
          const debugUserId = devRole === 'prime'
            ? Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME || 40824)
            : Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_USER_ID_SUB || 40364);
          const debugPlaceId = Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_PLACE_ID || 170);

          console.log(`🔧 [DEV MODE] ログインスキップ: role=${devRole}, userId=${debugUserId}, placeId=${debugPlaceId}`);

          const user = {
            userId: debugUserId,
            placeId: debugPlaceId,
            userRole: devRole,
            isDebugMode: true
          };

          console.log(`📊 [Session User Set]`, user);
          setSessionUser(user);
          setSessionLoading(false);
          return;
        }

        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();

        if (data.ok && data.isLoggedIn) {
          setSessionUser(data.user);
          console.log('[sites] セッション取得成功:', data.user);
        } else {
          console.log('[sites] 未ログイン状態');
          // 🔧 開発モードではログイン画面にリダイレクトしない
          if (!isDev || !devRole) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('[sites] セッション取得エラー:', error);
      } finally {
        setSessionLoading(false);
      }
    })();
  }, [router, isDev, devRole]);

  // 検索実行（デバウンス）
  useEffect(() => {
    if (sessionLoading) return; // セッション読み込み中はスキップ

    // 🔍 デバッグログ: API呼び出し前の状態確認
    console.log('[sites] API呼び出し前の状態:', {
      sessionLoading,
      sessionUser,
      uid,
      placeCode,
      onlyMine,
      devRole
    });

    setState("loading");
    setErrMsg("");

    const t = setTimeout(async () => {
      try {
        // quicklist APIを使用（userRole判定 + ステータス配列対応）
        // デフォルトは status未指定 → [1,2,3] が適用される
        const url = `/api/sites/quicklist?q=${encodeURIComponent(q)}&per=100&user_id=${uid}&place=${encodeURIComponent(placeCode)}&only=${onlyMine ? 1 : 0}`;
        console.log('[sites] API URL:', url);
        const r = await fetch(url, {
          cache: "no-store"
        });
        const j = await r.json();
        console.log('[sites] API レスポンス:', {
          ok: j.ok,
          userRole: j.userRole,
          itemsLength: j.items?.length,
          total: j.total
        });

        // userRole が unknown の場合はエラー状態として扱う
        if (j?.userRole === 'unknown') {
          setState("error");
          setErrMsg(j?.message || "ユーザーロールの判定に失敗しました。データベース接続を確認してください。");
          setRes(j);
          return;
        }

        setRes(j);

        if (!Array.isArray(j?.items)) {
          setState("error");
          setErrMsg("不正なレスポンス");
          return;
        }

        if (j.items.length > 0) {
          setState("ok");
        } else {
          setState("empty");
        }
      } catch (e: any) {
        setState("error");
        setErrMsg(e?.message || "通信エラー");
        setRes({ ok: false, provider: "error", items: [], total: 0, timings: {}, userRole: 'unknown' });
      }
    }, 300);

    return () => {
      clearTimeout(t);
    };
  }, [q, status, page, onlyMine, uid, placeCode, quick, sessionLoading]);

  // / キーでフォーカス
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT") {
        (document.querySelector('[data-testid="sites-q"]') as HTMLInputElement)?.focus();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // LocalStorageからロゴ読み込み
  useEffect(() => {
    const savedLogo = localStorage.getItem("companyLogo");
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
  }, []);

  // ユーザーキー情報をロード
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/stg-user-keys?id=${encodeURIComponent(String(uid))}`, { cache: 'no-store' });
        const j = await r.json();
        setUserKeys(j?.user ? {
          id: j.user.id,
          employee_code: j.user.employee_code,
          login_id: j.user.login_id
        } : null);
      } catch (e) {
        console.error('[sites] Failed to load user keys:', e);
      }
    })();
  }, [uid]);

  // ロゴアップロード処理
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選択してください");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("ファイルサイズは2MB以下にしてください");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCompanyLogo(dataUrl);
        localStorage.setItem("companyLogo", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // ロゴ削除
  const handleLogoRemove = () => {
    setCompanyLogo(null);
    localStorage.removeItem("companyLogo");
  };

  // keySetを構築（useMemoで最適化）
  const keySet = useMemo(() => buildKeySet(userKeys), [userKeys]);

  // 協力業者判定
  const isSubUser = sessionUser?.userRole === 'sub';

  // フィルター処理（useMemoで最適化）
  const filteredItems = useMemo(() => {
    const raw: any[] = Array.isArray(res?.items) ? res.items : [];

    const filtered = raw.filter((site: any) => {
      if (debug) {
        console.log('[Filter] Checking site:', {
          site_name: site.site_name,
          status: site.status,
          manager_id: site.manager_id,
          filters: { onlyMine, statusFilter: status, selectedStatus, isSubUser }
        });
      }

      // 協力業者の場合：API がすでに「自分の現場のみ」に絞っているので
      // includesUserLoose での再フィルタリングは行わない
      if (!isSubUser && onlyMine) {
        if (keySet.size === 0) {
          if (debug) console.log('[Filter] ❌ No user keys loaded');
          return false;
        }
        if (!includesUserLoose(site, keySet)) {
          if (debug) console.log('[Filter] ❌ Failed onlyMine check (keySet matching)');
          return false;
        }
      }

    // 詳細検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const siteName = (site.site_name || "").toLowerCase();
      const siteCode = (site.site_code || "").toLowerCase();
      const address = (site.address || "").toLowerCase();
      const managerName = (site.manager_name || "").toLowerCase();

      if (!siteName.includes(query) && !siteCode.includes(query) &&
          !address.includes(query) && !managerName.includes(query)) {
        return false;
      }
    }

    if (selectedSiteType && site.site_type !== selectedSiteType) {
      return false;
    }

    // トップ画面のステータスフィルター
    if (status && site.status !== status) {
      if (debug) console.log('[Filter] ❌ Failed status check:', { siteStatus: site.status, filterStatus: status });
      return false;
    }

    // 詳細検索のステータスフィルター
    if (selectedStatus && site.status !== selectedStatus) {
      if (debug) console.log('[Filter] ❌ Failed selectedStatus check:', { siteStatus: site.status, filterStatus: selectedStatus });
      return false;
    }

    if (selectedManager && site.manager_name !== selectedManager) {
      return false;
    }

    if (selectedRoleManager && site.role_manager_name !== selectedRoleManager) {
      return false;
    }

    // 日付フィルター
    if (createdFrom && site.created_at && new Date(site.created_at) < new Date(createdFrom)) {
      return false;
    }
    if (createdTo && site.created_at && new Date(site.created_at) > new Date(createdTo)) {
      return false;
    }
    if (updatedFrom && site.updated_at && new Date(site.updated_at) < new Date(updatedFrom)) {
      return false;
    }
    if (updatedTo && site.updated_at && new Date(site.updated_at) > new Date(updatedTo)) {
      return false;
    }

      if (debug) console.log('[Filter] ✅ Passed all filters');
      return true;
    });

    // 協力業者モードのデバッグログ
    if (isSubUser) {
      console.log('[sites] SUB FILTER', 'raw:', raw.length, 'after:', filtered.length);
    }

    return filtered;
  }, [res?.items, onlyMine, keySet, searchQuery, selectedSiteType, status, selectedStatus, selectedManager, selectedRoleManager, createdFrom, createdTo, updatedFrom, updatedTo, debug, isSubUser, sessionUser]);

  // デバッグ情報
  if (debug) {
    console.log('[Filter] Summary:', {
      totalItems: res?.items?.length || 0,
      filteredItems: filteredItems.length,
      keySetSize: keySet.size,
      userKeys,
      activeFilters: {
        onlyMine,
        status,
        selectedStatus,
        searchQuery,
        selectedSiteType,
        selectedManager,
        selectedRoleManager
      }
    });
  }

  // フィルタ後の件数
  const totalFiltered = filteredItems.length;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 隠しファイル入力（ロゴアップロード用） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* 新しいツールバー */}
      <Toolbar
        mode={viewMode}
        onChangeMode={setViewMode}
        onlyMine={onlyMine}
        onToggleMine={(checked) => {
          setPage(1);
          setOnlyMine(checked);
        }}
        q={q}
        onChangeQ={(value) => {
          setPage(1);
          setQ(value);
        }}
        showOnlyMineToggle={res?.userRole === 'prime'} // 元請けのみトグル表示
        sessionUser={sessionUser}
      />

      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 space-y-4">

        {/* デバッグバナー（debug=1の時のみ） */}
        {debug && (
          <div
            className="text-xs p-2 rounded bg-yellow-50 border border-yellow-200"
            data-testid="debug-banner"
          >
            <div>
              <span className="font-semibold">DEBUG:</span> uid: {uid} / provider:{" "}
              {res?.provider ?? "-"} / total(raw): {res?.items?.length ?? 0} / filtered: {totalFiltered} / only: {onlyMine ? 1 : 0} / page: {page}
            </div>
            <div className="mt-1 text-gray-600">
              keySetSize: {keySet.size} / userKeys: {userKeys ? `id=${userKeys.id}, emp=${userKeys.employee_code}, login=${userKeys.login_id}` : 'null'}
            </div>
            {res?.timings && (
              <div className="mt-1 text-gray-600">
                Timings: DW({res.timings.dwMs}ms), STG({res.timings.stgMs}ms)
              </div>
            )}
          </div>
        )}

        {/* 詳細検索モーダル */}
        {showAdvancedSearch && (
          <>
            {/* 背景オーバーレイ */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowAdvancedSearch(false)}
            />

            {/* モーダル本体 */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white shadow-2xl z-50 overflow-y-auto rounded-xl">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="text-xl font-bold text-gray-900">詳細検索</h2>
                  <button
                    onClick={() => setShowAdvancedSearch(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* 自分の現場のみ */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={onlyMine}
                      onChange={(e) => {
                        setPage(1);
                        setOnlyMine(e.target.checked);
                      }}
                    />
                    <span className="font-medium">自分の現場のみ</span>
                  </label>
                </div>

                {/* キーワード検索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    キーワード
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="現場名、コード、住所、担当者名で検索"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* 作成日 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作成日
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始日</label>
                      <input
                        type="date"
                        value={createdFrom}
                        onChange={(e) => setCreatedFrom(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了日</label>
                      <input
                        type="date"
                        value={createdTo}
                        onChange={(e) => setCreatedTo(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 更新日 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    更新日
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始日</label>
                      <input
                        type="date"
                        value={updatedFrom}
                        onChange={(e) => setUpdatedFrom(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了日</label>
                      <input
                        type="date"
                        value={updatedTo}
                        onChange={(e) => setUpdatedTo(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 現場種類 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    現場種類
                  </label>
                  <select
                    value={selectedSiteType}
                    onChange={(e) => setSelectedSiteType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">すべて</option>
                    <option value="新築">新築</option>
                    <option value="リフォーム">リフォーム</option>
                    <option value="修繕">修繕</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                {/* ステータス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">すべて</option>
                    <option value="現調中（見積未提出）">現調中（見積未提出）</option>
                    <option value="現調中（見積提出済み）">現調中（見積提出済み）</option>
                    <option value="工事中">工事中</option>
                    <option value="完工">完工</option>
                    <option value="アフター">アフター</option>
                    <option value="中止・他決">中止・他決</option>
                  </select>
                </div>

                {/* 現場担当者 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    現場担当者
                  </label>
                  <input
                    type="text"
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    placeholder="担当者名を入力"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* 役割担当者 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    役割担当者
                  </label>
                  <input
                    type="text"
                    value={selectedRoleManager}
                    onChange={(e) => setSelectedRoleManager(e.target.value)}
                    placeholder="役割担当者名を入力"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* ボタン */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setOnlyMine(false);
                      setSearchQuery("");
                      setCreatedFrom("");
                      setCreatedTo("");
                      setUpdatedFrom("");
                      setUpdatedTo("");
                      setSelectedSiteType("");
                      setSelectedStatus("");
                      setSelectedManager("");
                      setSelectedRoleManager("");
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    クリア
                  </button>
                  <button
                    onClick={() => setShowAdvancedSearch(false)}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    検索
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ローディング（スケルトン） */}
        {state === "loading" && (
          <div className="grid grid-cols-2 gap-3" data-testid="sites-skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-24 rounded bg-gray-100" />
            ))}
          </div>
        )}

        {/* エラー */}
        {state === "error" && (
          <div
            data-testid="sites-error"
            className="p-3 rounded border border-red-200 bg-red-50 text-sm space-y-2"
          >
            <div>
              <span className="text-red-700 font-medium">通信エラー：</span>
              <span className="text-red-600">{errMsg}</span>
            </div>
            {res?.timings?.dwError && (
              <div className="text-xs text-red-500">DW: {res.timings.dwError}</div>
            )}
            {res?.timings?.stgError && (
              <div className="text-xs text-red-500">STG: {res.timings.stgError}</div>
            )}
            <button
              className="text-blue-600 underline hover:text-blue-800"
              onClick={() => setPage((p) => p)}
            >
              再試行
            </button>
          </div>
        )}

        {/* 空の結果 */}
        {state === "empty" && (
          <div
            data-testid="sites-empty"
            className="text-center py-12 bg-white rounded-lg shadow-sm"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-4 text-lg text-gray-500">該当する現場がありません</p>
            <p className="mt-2 text-sm text-gray-400">
              キーワード・ステータスを変更して再検索してください。
            </p>
          </div>
        )}

        {/* 検索結果 */}
        {state === "ok" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {totalFiltered}件を表示{onlyMine && ' (自分の現場のみ)'}
              </div>
            </div>

            {/* 表示モード別レンダリング */}
            {viewMode === 'grid' && (
              <GridView
                sites={filteredItems}
                placeCode={placeCode}
                onCardClick={(site) => {
                  router.push(`/upload?site_code=${site.site_code}&place_code=${site.place_code || placeCode}`)
                }}
              />
            )}

            {viewMode === 'gallery' && (
              <GalleryView
                sites={filteredItems}
                placeCode={placeCode}
              />
            )}

            {viewMode === 'kanban' && (
              <KanbanView
                sites={filteredItems}
                placeCode={placeCode}
              />
            )}

            {viewMode === 'list' && (
              <ListView
                sites={filteredItems}
                placeCode={placeCode}
              />
            )}

            {viewMode === 'legacy' && (
              <div
                className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3"
                data-testid="sites-results"
              >
                {filteredItems.map((s: any) => (
                  <SiteCard
                    key={s.site_code}
                    site={s}
                    placeCode={s.place_code || placeCode}
                    onCardClick={(site) => {
                      router.push(`/upload?site_code=${site.site_code}&place_code=${site.place_code || placeCode}`)
                    }}
                  />
                ))}
              </div>
            )}

            {/* ページネーション */}
            {totalFiltered > pageSize && (
              <div className="flex gap-3 items-center justify-center py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← 前へ
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  次へ →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
