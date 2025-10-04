// app/upload/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSelector } from '@/components/FileSelector';
import { BlackboardForm } from '@/components/BlackboardForm';
import { BlackboardPreview } from '@/components/BlackboardPreview';
import { ModeSelector } from '@/components/ModeSelector';
import { IndividualMode } from '@/components/IndividualMode';
import { PreviewModal } from '@/components/PreviewModal';
import { UploadProgressToast, UploadProgressModal } from '@/components/UploadProgress';
import { processImages, processImage } from '@/lib/canvas';
import { uploadPhotosInChunks } from '@/lib/dandori-api';
import { saveManifest } from '@/lib/supabase';
import type { BlackboardInfo, UploadProgress, Manifest } from '@/types';

export default function UploadPage() {
  const searchParams = useSearchParams();
  const siteCode = searchParams.get('site_code') || '';
  const placeCode = searchParams.get('place_code') || '';

  // モックデータ（app/sites/page.tsx と同じデータ）
  const mockSites = [
    {
      site_code: "SITE001",
      site_name: "〇〇マンション新築工事",
      site_type: "建築工事",
      address: "東京都渋谷区〇〇1-2-3",
      updated_at: "2025-10-03T10:30:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE002",
      site_name: "△△ビル改修工事",
      site_type: "土木工事",
      address: "大阪府大阪市〇〇区1-2-3",
      updated_at: "2025-10-02T14:20:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE003",
      site_name: "××橋梁補修工事",
      site_type: "土木工事",
      address: "神奈川県横浜市〇〇区5-6-7",
      updated_at: "2025-10-01T09:15:00Z",
      status: "完了",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE004",
      site_name: "□□駅前再開発工事",
      site_type: "建築工事",
      address: "東京都新宿区〇〇2-3-4",
      updated_at: "2025-09-30T16:45:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE005",
      site_name: "◇◇公園整備工事",
      site_type: "造園工事",
      address: "千葉県千葉市〇〇区8-9-10",
      updated_at: "2025-09-28T11:00:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE006",
      site_name: "☆☆トンネル工事",
      site_type: "土木工事",
      address: "静岡県静岡市〇〇区11-12-13",
      updated_at: "2025-09-25T08:30:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE007",
      site_name: "●●ショッピングモール新築工事",
      site_type: "建築工事",
      address: "愛知県名古屋市〇〇区14-15-16",
      updated_at: "2025-09-20T13:20:00Z",
      status: "完了",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE008",
      site_name: "▲▲上下水道工事",
      site_type: "設備工事",
      address: "福岡県福岡市〇〇区17-18-19",
      updated_at: "2025-09-15T10:10:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE009",
      site_name: "■■学校校舎改修工事",
      site_type: "建築工事",
      address: "北海道札幌市〇〇区20-21-22",
      updated_at: "2025-09-10T15:40:00Z",
      status: "進行中",
      place_code: "TEST_PLACE_001"
    },
    {
      site_code: "SITE010",
      site_name: "◆◆浄水場設備更新工事",
      site_type: "設備工事",
      address: "宮城県仙台市〇〇区23-24-25",
      updated_at: "2025-09-05T09:00:00Z",
      status: "完了",
      place_code: "TEST_PLACE_001"
    }
  ];

  // モックデータから現場情報を取得
  const siteInfo = mockSites.find(s => s.site_code === siteCode);
  const initialProjectName = siteInfo?.site_name || '現場名不明';

  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState(initialProjectName);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewBlackboardInfo, setPreviewBlackboardInfo] = useState<BlackboardInfo>({
    projectName: initialProjectName,
    workType: '基礎工事',
    weather: '晴れ',
    workContent: '',
    timestamp: new Date()
  });
  const [mode, setMode] = useState<'selection' | 'batch' | 'individual'>('selection');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    // fetchSiteInfo(); // 本番環境ではコメント解除
    // モック環境では fetchSiteInfo を使用せず、mockSites から直接取得
  }, [placeCode, siteCode]);

  useEffect(() => {
    setPreviewBlackboardInfo(prev => ({
      ...prev,
      projectName: projectName
    }));
  }, [projectName]);

  async function fetchSiteInfo() {
    try {
      const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`);
      const data = await response.json();
      const site = data.data?.find((s: any) => s.site_code === siteCode);
      if (site) {
        setProjectName(site.site_name);
      }
    } catch (error) {
      console.error('Failed to fetch site info:', error);
      setProjectName('現場名不明');
    }
  }

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (selectedFiles.length > 0) {
      setPreviewFile(selectedFiles[0]);
    }
  };

  const handleIndividualSubmit = async (assignments: Map<number, BlackboardInfo>) => {
    setIsProcessing(true);
    setShowModal(true);
    setProgress({ total: assignments.size, completed: 0, failed: 0 });

    try {
      const jobId = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;
      const processedList = [];

      // 設定済みの写真のみ処理
      for (const [index, info] of assignments.entries()) {
        const file = files[index];
        const processed = await processImage(file, info, jobId);
        processedList.push(processed);
        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      }

      // アップロード処理（一括設定と同じ）
      const uploadFiles = processedList.map(p => ({
        filename: p.filename,
        blob: p.processedBlob
      }));

      await uploadPhotosInChunks(
        placeCode,
        siteCode,
        '施工中',
        '100033',
        uploadFiles,
        (completed, total) => {
          setProgress(prev => ({ ...prev, completed }));
        }
      );

      // manifest保存
      const manifest: Manifest = {
        jobId,
        placeCode,
        siteCode,
        categoryName: '施工中',
        templateVersion: 'v1.0',
        createdAtClient: new Date().toISOString(),
        hashAlgorithm: 'SHA-256',
        blackboardInfo: processedList[0] ? Array.from(assignments.values())[0] : {} as BlackboardInfo,
        files: processedList.map((p, i) => ({
          localId: crypto.randomUUID(),
          originalFilename: p.originalFile.name,
          uploadedFilename: p.filename,
          originalHash: p.originalHash,
          processedHash: p.processedHash,
          width: p.width,
          height: p.height,
          status: 'uploaded',
          attempts: 1,
          completedAt: new Date().toISOString()
        }))
      };

      await saveManifest(manifest);

      if (window.opener) {
        window.opener.postMessage({
          type: 'BLACKBOARD_COMPLETE',
          count: assignments.size,
          jobId
        }, '*');
      }

      setTimeout(() => {
        setShowModal(false);
        if (window.opener) {
          window.close();
        }
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました');
      setProgress(prev => ({ ...prev, failed: prev.total - prev.completed }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (blackboardInfo: BlackboardInfo) => {
    if (files.length === 0) {
      alert('写真を選択してください');
      return;
    }

    setIsProcessing(true);
    setShowModal(true);
    setProgress({ total: files.length, completed: 0, failed: 0 });

    try {
      const jobId = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;

      const processed = await processImages(
        files,
        blackboardInfo,
        jobId,
        (current, total) => {
          setProgress(prev => ({
            ...prev,
            current: files[current - 1]?.name
          }));
        }
      );

      const uploadFiles = processed.map(p => ({
        filename: p.filename,
        blob: p.processedBlob
      }));

      await uploadPhotosInChunks(
        placeCode,
        siteCode,
        '施工中',
        '100033',
        uploadFiles,
        (completed, total) => {
          setProgress(prev => ({ ...prev, completed }));
        }
      );

      const manifest: Manifest = {
        jobId,
        placeCode,
        siteCode,
        categoryName: '施工中',
        templateVersion: 'v1.0',
        createdAtClient: new Date().toISOString(),
        hashAlgorithm: 'SHA-256',
        blackboardInfo,
        files: processed.map((p, i) => ({
          localId: crypto.randomUUID(),
          originalFilename: p.originalFile.name,
          uploadedFilename: p.filename,
          originalHash: p.originalHash,
          processedHash: p.processedHash,
          width: p.width,
          height: p.height,
          status: 'uploaded',
          attempts: 1,
          completedAt: new Date().toISOString()
        }))
      };

      await saveManifest(manifest);

      if (window.opener) {
        window.opener.postMessage({
          type: 'BLACKBOARD_COMPLETE',
          count: files.length,
          jobId
        }, '*');
      }

      setTimeout(() => {
        setShowModal(false);
        if (window.opener) {
          window.close();
        }
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました。もう一度お試しください。');
      setProgress(prev => ({ ...prev, failed: prev.total - prev.completed }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-800 border-b pb-3">
            電子小黒板 - 一括登録
          </h1>

          {files.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 font-medium">
                ✓ {files.length}枚の写真が選択されています
              </p>
            </div>
          )}

          {!isProcessing && (
            <FileSelector
              onFilesSelected={handleFilesSelected}
              maxFiles={50}
              disabled={isProcessing}
            />
          )}

          {files.length > 0 && !isProcessing && (
            <div className="pt-4 border-t">
              {mode === 'selection' && (
                <ModeSelector
                  onSelectMode={(selectedMode) => setMode(selectedMode)}
                  fileCount={files.length}
                />
              )}

              {mode === 'batch' && (
                <div className="space-y-4">
                  {/* 左2:右1の比率に変更 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左側: プレビュー（2カラム分） */}
                    <div className="lg:col-span-2">
                      <BlackboardPreview
                        imageFile={previewFile}
                        blackboardInfo={previewBlackboardInfo}
                        onPreviewClick={() => setShowPreviewModal(true)}
                      />
                    </div>

                    {/* 右側: 黒板情報入力（1カラム分） */}
                    <div className="lg:col-span-1">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        黒板情報を入力（全{files.length}枚に適用）
                      </h2>
                      <BlackboardForm
                        projectName={projectName}
                        onSubmit={handleSubmit}
                        onFormChange={(info) => setPreviewBlackboardInfo(info)}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setMode('selection')}
                    className="text-gray-600 hover:text-gray-800 underline"
                  >
                    ← モード選択に戻る
                  </button>
                </div>
              )}

              {mode === 'individual' && (
                <IndividualMode
                  files={files}
                  projectName={projectName}
                  onSubmit={handleIndividualSubmit}
                  onBack={() => setMode('selection')}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <UploadProgressToast progress={progress} />
      {showModal && <UploadProgressModal progress={progress} />}
      {showPreviewModal && previewFile && (
        <PreviewModal
          imageFile={previewFile}
          blackboardInfo={previewBlackboardInfo}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}
