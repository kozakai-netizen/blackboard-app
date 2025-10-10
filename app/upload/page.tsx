// app/upload/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
import { getAllTemplates, getDefaultTemplate, updateTemplate, incrementTemplateUsage } from '@/lib/templates';
import { TemplateSelector } from '@/components/TemplateSelector';
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

  // 現場写真カテゴリ
  const [photoCategories, setPhotoCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
    timestamp: new Date()
  });
  const [mode, setMode] = useState<'selection' | 'batch' | 'individual'>('batch');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 会社ロゴをLocalStorageから読み込み
  useEffect(() => {
    const logo = localStorage.getItem('companyLogo');
    if (logo) {
      setCompanyLogo(logo);
    }
  }, []);

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
      console.log('📝 Template selected:', selectedTemplate.name, selectedTemplate);
      const defaultValues = selectedTemplate.defaultValues;
      setPreviewBlackboardInfo(prev => {
        const newInfo: BlackboardInfo = {
          ...prev,
          // projectNameは現在の値を保持（上書きしない）
          projectName: prev.projectName || projectName,
          workType: (defaultValues.工種 as string) || prev.workType,
          weather: (defaultValues.天候 as string) || prev.weather,
          workCategory: (defaultValues.種別 as string) || prev.workCategory,
          workDetail: (defaultValues.細別 as string) || prev.workDetail,
          contractor: (defaultValues.施工者 as string) || prev.contractor,
          location: (defaultValues.撮影場所 as string) || prev.location,
          station: (defaultValues.測点位置 as string) || prev.station,
          witness: (defaultValues.立会者 as string) || prev.witness,
          remarks: (defaultValues.備考 as string) || prev.remarks,
        };
        console.log('📝 Updated blackboardInfo:', newInfo);
        return newInfo;
      });
    }
  }, [selectedTemplate?.id]); // selectedTemplate.idのみ監視

  // 現場写真カテゴリを取得
  useEffect(() => {
    const fetchPhotoCategories = async () => {
      if (!placeCode || !siteCode) return;

      try {
        const response = await fetch(`/api/dandori/photo-categories?place_code=${placeCode}&site_code=${siteCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.result && data.data) {
            setPhotoCategories(data.data);
            // デフォルトで「電子小黒板」カテゴリを選択
            const defaultCat = data.data.find((cat: any) => cat.name === '電子小黒板');
            if (defaultCat) {
              setSelectedCategory(defaultCat.name);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch photo categories:', error);
      }
    };

    fetchPhotoCategories();
  }, [placeCode, siteCode]);

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

  // 初回のみ現場名を工事名に設定
  useEffect(() => {
    if (projectName && !previewBlackboardInfo.projectName) {
      setPreviewBlackboardInfo(prev => ({
        ...prev,
        projectName: projectName
      }));
    }
  }, [projectName]); // previewBlackboardInfo.projectNameは依存配列に含めない

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

  const handleRemovePhoto = (index: number) => {
    // URLをクリーンアップ
    const fileToRemove = files[index];
    if (fileToRemove) {
      const url = URL.createObjectURL(fileToRemove);
      URL.revokeObjectURL(url);
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    // プレビュー表示の調整
    if (newFiles.length === 0) {
      setPreviewFile(null);
      setCurrentPreviewIndex(0);
    } else if (index === currentPreviewIndex) {
      // 削除した写真が現在のプレビュー写真の場合、次の写真を表示
      const newIndex = index >= newFiles.length ? newFiles.length - 1 : index;
      setCurrentPreviewIndex(newIndex);
      setPreviewFile(newFiles[newIndex]);
    } else if (index < currentPreviewIndex) {
      // 削除した写真が現在のプレビュー写真より前の場合、インデックスを調整
      setCurrentPreviewIndex(currentPreviewIndex - 1);
    }
  };

  // フォーム変更ハンドラをメモ化（コールバック再生成を防ぐ）
  const handleFormChange = useCallback((info: BlackboardInfo) => {
    setPreviewBlackboardInfo(prev => ({
      ...prev,
      ...info
    }));
  }, []);

  const handlePositionChange = useRef<NodeJS.Timeout | null>(null);

  const onPositionChange = (position: { x: number; y: number }) => {
    if (!selectedTemplate) return;

    // Update template position immediately for preview
    const updatedTemplate = {
      ...selectedTemplate,
      designSettings: {
        ...selectedTemplate.designSettings,
        position
      }
    };
    setSelectedTemplate(updatedTemplate);

    // Debounce database save (only save after 500ms of no movement)
    if (handlePositionChange.current) {
      clearTimeout(handlePositionChange.current);
    }

    handlePositionChange.current = setTimeout(async () => {
      try {
        await updateTemplate(selectedTemplate.id, {
          designSettings: updatedTemplate.designSettings
        });
        console.log('✅ Template position saved:', position);
      } catch (error) {
        console.error('❌ Failed to save template position:', error);
      }
    }, 500);
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
        const processed = await processImage(file, info, jobId, selectedTemplate || undefined);
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
        selectedCategory || '電子小黒板',
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
        categoryName: selectedCategory || '電子小黒板',
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

      // テンプレート使用回数をカウント
      if (selectedTemplate) {
        await incrementTemplateUsage(selectedTemplate.id);
      }

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
        },
        selectedTemplate || undefined
      );

      const uploadFiles = processed.map(p => ({
        filename: p.filename,
        blob: p.processedBlob
      }));

      await uploadPhotosInChunks(
        placeCode,
        siteCode,
        selectedCategory || '電子小黒板',
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
        categoryName: selectedCategory || '電子小黒板',
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

      // テンプレート使用回数をカウント
      if (selectedTemplate) {
        await incrementTemplateUsage(selectedTemplate.id);
      }

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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - 現場一覧と統一 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {/* 会社ロゴ - クリックでTOP画面へ */}
            {companyLogo && (
              <button
                onClick={() => window.location.href = '/sites'}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                title="現場一覧に戻る"
              >
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  className="h-16 w-16 object-contain"
                />
              </button>
            )}

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {projectName || '現場名'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                現場を選択して写真をアップロードして電子小黒板を設定できます
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="space-y-4">
          {/* Hidden file selector - triggered from preview area */}
          <FileSelector
            ref={fileSelectorRef}
            onFilesSelected={handleFilesSelected}
            maxFiles={50}
            currentFileCount={files.length}
            disabled={isProcessing}
            hideButton={true}
          />

          {/* 写真未選択時の初期表示 */}
          {files.length === 0 && !isProcessing && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">写真を選択してください</h3>
                <p className="text-gray-600 mb-6">
                  写真を選択すると、黒板情報を入力して電子小黒板を設定できます
                </p>
                <button
                  onClick={() => fileSelectorRef.current?.openDialog()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  写真を追加
                </button>
              </div>
            </div>
          )}

          {files.length > 0 && !isProcessing && (
            <div className="space-y-4">
              {mode === 'batch' && (
                <div className="space-y-4">
                  {/* プレビュー＋フォームエリア - コンパクト化 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 左側: プレビューカード（2カラム分） */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="bg-white rounded-lg shadow p-4">
                        <BlackboardPreview
                          imageFile={previewFile}
                          blackboardInfo={previewBlackboardInfo}
                          template={selectedTemplate || undefined}
                          onPreviewClick={() => setShowPreviewModal(true)}
                          onPositionChange={onPositionChange}
                          onAddPhoto={() => fileSelectorRef.current?.openDialog()}
                          onTemplateChange={() => setShowTemplateModal(true)}
                        />
                      </div>

                      {/* サムネイルスライダー - コンパクト化 */}
                      {files.length > 1 && (
                        <div className="bg-white rounded-lg shadow p-3">
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
                                {files.map((file, index) => {
                                  const uniqueKey = `${file.name}-${file.size}-${file.lastModified}-${index}`;
                                  return (
                                    <div
                                      key={uniqueKey}
                                      className="flex-shrink-0 relative group"
                                    >
                                      <button
                                        onClick={() => handleThumbnailClick(index)}
                                        className={`w-20 h-20 rounded transition-all ${
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
                                        <div className={`absolute bottom-0 left-0 right-0 text-xs text-center py-0.5 rounded-b ${
                                          index === currentPreviewIndex
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-black/50 text-white'
                                        }`}>
                                          {index + 1}
                                        </div>
                                      </button>
                                      {/* バツ印ボタン - グループホバー時のみ表示 */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemovePhoto(index);
                                        }}
                                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 text-sm font-bold leading-none"
                                        title="写真を削除"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
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

                    {/* 右側: 黒板情報入力カード（1カラム分） - コンパクト化 */}
                    <div className="lg:col-span-1">
                      <div className="bg-white rounded-lg shadow p-4 sticky top-20">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">
                          黒板情報入力
                        </h3>


                        <div>
                          {selectedTemplate ? (
                            <BlackboardForm
                              key={selectedTemplate.id}
                              projectName={projectName}
                              onSubmit={handleSubmit}
                              onFormChange={handleFormChange}
                              disabled={isProcessing}
                              allowProjectNameEdit={true}
                              template={selectedTemplate}
                              photoCategories={photoCategories}
                              selectedCategory={selectedCategory}
                              onCategoryChange={setSelectedCategory}
                            />
                          ) : (
                            <div className="p-8 text-center text-gray-500">
                              テンプレートを選択してください
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

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

      {/* プログレス表示 */}
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
      {/* テンプレート選択モーダル */}
      {showTemplateModal && templates.length > 0 && selectedTemplate && (
        <TemplateSelector
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={(template) => {
            setSelectedTemplate(template);
            setShowTemplateModal(false);
          }}
        />
      )}

      {showPreviewModal && previewFile && (
        <PreviewModal
          imageFile={previewFile}
          blackboardInfo={previewBlackboardInfo}
          template={selectedTemplate || undefined}
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
