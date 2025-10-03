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
  const placeCode = searchParams.get('place_code') || process.env.NEXT_PUBLIC_PLACE_CODE || '';

  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState('現場名取得中...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewBlackboardInfo, setPreviewBlackboardInfo] = useState<BlackboardInfo>({
    projectName: '現場名取得中...',
    workType: '基礎工事',
    weather: '晴れ',
    workContent: '',
    timestamp: new Date()
  });
  const [mode, setMode] = useState<'selection' | 'batch' | 'individual'>('selection');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (placeCode && siteCode) {
      fetchSiteInfo();
    }
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
      <div className="max-w-2xl mx-auto">
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
