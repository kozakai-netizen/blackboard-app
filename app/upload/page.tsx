// app/upload/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FileSelector, FileSelectorRef } from '@/components/FileSelector';
import { fileStore } from '@/lib/fileStore';
import { BlackboardForm } from '@/components/BlackboardForm';
import { BlackboardPreview } from '@/components/BlackboardPreview';
import { ModeSelector } from '@/components/ModeSelector';
import { IndividualMode } from '@/components/IndividualMode';
import { PreviewModal } from '@/components/PreviewModal';
import { UploadProgressToast, UploadProgressModal } from '@/components/UploadProgress';
import { processImages, processImage } from '@/lib/canvas';
import { uploadPhotosInChunks } from '@/lib/dandori-api';
import { saveManifest } from '@/lib/supabase';
import { getAllTemplates, getDefaultTemplate } from '@/lib/templates';
import type { BlackboardInfo, UploadProgress, Manifest, Template } from '@/types';

function UploadPageContent() {
  const searchParams = useSearchParams();
  const siteCode = searchParams.get('site_code') || '';
  const placeCode = searchParams.get('place_code') || '';
  const fileSelectorRef = useRef<FileSelectorRef>(null);

  const [siteName, setSiteName] = useState<string>('');
  const [isLoadingSite, setIsLoadingSite] = useState(true);

  // テンプレート関連
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewBlackboardInfo, setPreviewBlackboardInfo] = useState<BlackboardInfo>({
    projectName: '',
    workType: '基礎工事',
    weather: '晴れ',
    workContent: '',
    timestamp: new Date()
  });
  const [mode, setMode] = useState<'selection' | 'batch' | 'individual'>('selection');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // テンプレートを取得
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const allTemplates = await getAllTemplates();
        setTemplates(allTemplates);

        // デフォルトテンプレートを選択
        const defaultTemplate = await getDefaultTemplate();
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
        } else if (allTemplates.length > 0) {
          setSelectedTemplate(allTemplates[0]);
        }
      } catch (error) {
        console.error('❌ Failed to load templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  // テンプレート選択時にデフォルト値を適用
  useEffect(() => {
    if (selectedTemplate) {
      const defaultValues = selectedTemplate.defaultValues;
      setPreviewBlackboardInfo(prev => ({
        ...prev,
        projectName: projectName || prev.projectName,
        workType: (defaultValues.工種 as string) || prev.workType,
        workCategory: (defaultValues.種別 as string) || prev.workCategory,
        workDetail: (defaultValues.細別 as string) || prev.workDetail,
        contractor: (defaultValues.施工者 as string) || prev.contractor,
        location: (defaultValues.撮影場所 as string) || prev.location,
        station: (defaultValues.測点位置 as string) || prev.station,
        witness: (defaultValues.立会者 as string) || prev.witness,
        remarks: (defaultValues.備考 as string) || prev.remarks,
      }));
    }
  }, [selectedTemplate, projectName]);

  // APIから現場情報を取得
  useEffect(() => {
    const fetchSiteInfo = async () => {
      if (!placeCode || !siteCode) {
        setIsLoadingSite(false);
        return;
      }

      try {
        console.log('🔵 Fetching site info...', { placeCode, siteCode });
        const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('🔵 Sites API response:', data);

        if (data.result && data.data && Array.isArray(data.data)) {
          // URLから現場IDを抽出して比較
          const site = data.data.find((s: any) => {
            // まずsite_codeで比較
            if (s.site_code === siteCode) {
              return true;
            }
            // site_codeが空の場合、URLから抽出
            if (s.url) {
              const match = s.url.match(/\/sites\/(\d+)/);
              if (match && match[1] === siteCode) {
                return true;
              }
            }
            return false;
          });

          if (site) {
            const name = site.name || site.site_name || '現場名不明';
            console.log('🔵 Found site:', { site_code: siteCode, name });
            setSiteName(name);
            setProjectName(name);
            setPreviewBlackboardInfo(prev => ({
              ...prev,
              projectName: name
            }));
          } else {
            console.log('⚠️ Site not found:', siteCode);
            setSiteName('現場名不明');
            setProjectName('現場名不明');
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch site info:', error);
        setSiteName('現場名不明');
        setProjectName('現場名不明');
      } finally {
        setIsLoadingSite(false);
      }
    };

    fetchSiteInfo();
  }, [placeCode, siteCode]);

  useEffect(() => {
    if (projectName) {
      setPreviewBlackboardInfo(prev => ({
        ...prev,
        projectName: projectName
      }));
    }
  }, [projectName]);

  // グローバルストアからファイルを復元
  useEffect(() => {
    const storedFiles = fileStore.getFiles();
    if (storedFiles.length > 0) {
      setFiles(storedFiles);
      if (storedFiles.length > 0) {
        setPreviewFile(storedFiles[0]);
      }
      // 使用後はクリア
      fileStore.clear();
    }
  }, []);

  const handleFilesSelected = (selectedFiles: File[]) => {
    // 既存の写真に新しい写真を追加
    setFiles(prev => [...prev, ...selectedFiles]);
    if (selectedFiles.length > 0 && files.length === 0) {
      setPreviewFile(selectedFiles[0]);
      setCurrentPreviewIndex(0);
    }
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentPreviewIndex(index);
    setPreviewFile(files[index]);
  };

  const handlePrevPhoto = () => {
    const newIndex = currentPreviewIndex > 0 ? currentPreviewIndex - 1 : files.length - 1;
    setCurrentPreviewIndex(newIndex);
    setPreviewFile(files[newIndex]);
  };

  const handleNextPhoto = () => {
    const newIndex = currentPreviewIndex < files.length - 1 ? currentPreviewIndex + 1 : 0;
    setCurrentPreviewIndex(newIndex);
    setPreviewFile(files[newIndex]);
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
        (completed) => {
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
        files: processedList.map((p) => ({
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

      // モーダルは表示したまま、ユーザーが「閉じる」ボタンをクリックするまで待つ

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
        (completed) => {
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
        files: processed.map((p) => ({
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

      // モーダルは表示したまま、ユーザーが「閉じる」ボタンをクリックするまで待つ

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
          {/* ヘッダー */}
          <div className="flex items-start justify-between border-b pb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {projectName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {mode === 'individual' ? '個別設定' : '一括登録'}
              </p>
            </div>
            {!isProcessing && (
              <FileSelector
                ref={fileSelectorRef}
                onFilesSelected={handleFilesSelected}
                maxFiles={50}
                currentFileCount={files.length}
                disabled={isProcessing}
              />
            )}
          </div>

          {files.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 font-medium">
                ✓ {files.length}枚の写真が選択されています
              </p>
            </div>
          )}

          {files.length > 0 && !isProcessing && (
            <div className="pt-4 border-t space-y-6">
              {/* テンプレート選択 */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">📝 黒板テンプレート選択</h2>
                {isLoadingTemplates ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">読み込み中...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">テンプレートが登録されていません</p>
                    <button
                      onClick={() => window.open('/admin/templates/new', '_blank')}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      テンプレートを作成する
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-sm">{template.name}</h3>
                          {template.isDefault && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              デフォルト
                            </span>
                          )}
                          {selectedTemplate?.id === template.id && (
                            <span className="text-blue-600">✓</span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500">
                          {template.fields.length}個の項目
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                    <div className="lg:col-span-2 space-y-3">
                      <BlackboardPreview
                        imageFile={previewFile}
                        blackboardInfo={previewBlackboardInfo}
                        onPreviewClick={() => setShowPreviewModal(true)}
                      />

                      {/* サムネイルスライダー */}
                      {files.length > 1 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            {/* 前へボタン */}
                            <button
                              onClick={handlePrevPhoto}
                              className="flex-shrink-0 p-2 bg-white border rounded-lg hover:bg-gray-100 transition-colors"
                              title="前の写真"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>

                            {/* サムネイル一覧（横スクロール） */}
                            <div className="flex-1 overflow-x-auto">
                              <div className="flex gap-2 pb-2">
                                {files.map((file, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleThumbnailClick(index)}
                                    className={`flex-shrink-0 relative transition-all ${
                                      index === currentPreviewIndex
                                        ? 'ring-2 ring-blue-500 scale-105'
                                        : 'hover:ring-2 hover:ring-gray-300'
                                    }`}
                                  >
                                    <Image
                                      src={URL.createObjectURL(file)}
                                      alt={`写真 ${index + 1}`}
                                      width={80}
                                      height={80}
                                      className="w-20 h-20 object-cover rounded"
                                    />
                                    <div className={`absolute bottom-0 left-0 right-0 text-xs text-center py-0.5 ${
                                      index === currentPreviewIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-black/50 text-white'
                                    }`}>
                                      {index + 1}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 次へボタン */}
                            <button
                              onClick={handleNextPhoto}
                              className="flex-shrink-0 p-2 bg-white border rounded-lg hover:bg-gray-100 transition-colors"
                              title="次の写真"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* ページネーション情報 */}
                          <div className="text-center text-sm text-gray-600 mt-2">
                            {currentPreviewIndex + 1} / {files.length}
                          </div>
                        </div>
                      )}
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
                        allowProjectNameEdit={true}
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
      {showModal && (
        <UploadProgressModal
          progress={progress}
          onClose={() => {
            setShowModal(false);
            // 完了後にウィンドウを閉じる
            if (window.opener) {
              window.close();
            }
          }}
        />
      )}
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

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <UploadPageContent />
    </Suspense>
  );
}
