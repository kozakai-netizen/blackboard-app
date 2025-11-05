"use client";
import { useEffect, useState } from "react";

type State = "idle" | "loading" | "ok" | "empty" | "error";

export default function SitesSearchPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("progress");
  const [onlyMine, setOnlyMine] = useState(true);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<any>(null);
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const uid = typeof window !== "undefined"
    ? Number(sessionStorage.getItem("userId") ?? process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? 40824)
    : 40824;

  const debug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

  // 検索実行（デバウンス）
  useEffect(() => {
    setState("loading");
    setErrMsg("");

    const t = setTimeout(async () => {
      try {
        const url = `/api/search/sites?q=${encodeURIComponent(q)}&page=${page}&per=20&status=${encodeURIComponent(status)}&user_id=${onlyMine ? uid : ""}`;
        const r = await fetch(url, {
          cache: "no-store"
        });
        const j = await r.json();
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
        setRes({ ok: false, provider: "error", items: [], total: 0, timings: {} });
      }
    }, 300);

    return () => {
      clearTimeout(t);
    };
  }, [q, page, status, onlyMine, uid]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">現場検索</h1>
          <a href="/sites-legacy" className="text-sm text-blue-600 underline hover:text-blue-800">
            旧UI（一覧表示）
          </a>
        </div>

        {/* 検索フォーム */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <input
              data-testid="sites-q"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              placeholder="現場名 / コード / 住所 / 管理者名…（/ キーでフォーカス）"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <select
              data-testid="sites-status"
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="progress">進行中</option>
              <option value="all">すべて</option>
              <option value="done">完工</option>
              <option value="after">アフター</option>
              <option value="canceled">中止・他決</option>
            </select>
          </div>

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
            <span className="font-medium">自分の現場のみ（user_id: {uid}）</span>
          </label>
        </div>

        {/* デバッグバナー */}
        {debug && (
          <div
            className="text-xs p-2 rounded bg-yellow-50 border border-yellow-200"
            data-testid="debug-banner"
          >
            <div>
              <span className="font-semibold">DEBUG:</span> uid: {uid} / provider:{" "}
              {res?.provider ?? "-"} / total: {res?.total ?? 0} / page: {page}
            </div>
            {res?.timings && (
              <div className="mt-1 text-gray-600">
                Timings: DW({res.timings.dwMs}ms), STG({res.timings.stgMs}ms)
              </div>
            )}
          </div>
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
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              {res?.total || 0}件中 {(page - 1) * 20 + 1}～
              {Math.min(page * 20, res?.total || 0)}件を表示
            </div>
            <div
              className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3"
              data-testid="sites-results"
            >
              {res.items.map((s: any) => (
                <div
                  key={s.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="font-medium text-gray-900 mb-2">
                    {s.name || "(名称未設定)"}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <div>コード: {s.code ?? "-"}</div>
                    <div>状態: {s.status ?? "-"}</div>
                    <div>更新: {s.updated_at ?? "-"}</div>
                  </div>
                  <a
                    href={`/upload?site_code=${s.code}`}
                    className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    📸 この現場でアップロード
                  </a>
                </div>
              ))}
            </div>

            {/* ページネーション */}
            {(res?.total || 0) > 20 && (
              <div className="flex gap-3 items-center justify-center py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← 前へ
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} / {Math.ceil((res?.total || 0) / 20)}
                </span>
                <button
                  disabled={page * 20 >= (res?.total || 0)}
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
