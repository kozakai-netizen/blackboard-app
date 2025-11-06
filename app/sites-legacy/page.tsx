"use client";
import { useEffect, useState } from "react";
import { SiteTable } from "@/components/SiteTable";

export default function SitesLegacyPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const placeCode = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1"
    : "dandoli-sample1";

  useEffect(() => {
    const fetchSites = async () => {
      try {
        // quicklist APIを使用（DWから現場一覧取得）
        const res = await fetch(`/api/sites/quicklist?status=progress&per=100`);
        const data = await res.json();
        setSites(data.items || []);
      } catch (error) {
        console.error("Failed to fetch sites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">現場一覧（テーブル表示）</h1>
          <a href="/sites" className="text-sm text-blue-600 underline hover:text-blue-800">
            ← カード表示に戻る
          </a>
        </div>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">読み込み中...</p>
          </div>
        )}

        {/* テーブル表示 */}
        {!loading && <SiteTable sites={sites} placeCode={placeCode} />}
      </div>
    </div>
  );
}
