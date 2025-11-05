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
import { UploadProgressToast, DetailedUploadProgressModal, type DetailedProgress, type UploadStep } from '@/components/UploadProgress';
import { processImages, processImage } from '@/lib/canvas';
import { uploadPhotosInChunks } from '@/lib/dandori-api';
import { saveManifest } from '@/lib/supabase';
import { getAllTemplates, getDefaultTemplate, updateTemplate, incrementTemplateUsage } from '@/lib/templates';
import { TemplateSelector } from '@/components/TemplateSelector';
import type { BlackboardInfo, UploadProgress, Manifest, Template } from '@/types';
import { parseUploadParams, type UploadParams } from '@/lib/url/uploadParams';

function UploadPageContent() {
  const searchParams = useSearchParams();
  const siteCode = searchParams.get('site_code') || '';
  const placeCode = searchParams.get('place_code') || '';

  // URLパラメータを厳密に解析
  const [params, setParams] = useState<UploadParams>({
    source: undefined,
    siteCode: undefined,
    placeCode: undefined,
    categoryId: null,
    photoIds: [],
    debug: false
  });

  const fileSelectorRef = useRef<FileSelectorRef>(null);

  const [siteName, setSiteName] = useState<string>('');
  const [isLoadingSite, setIsLoadingSite] = useState(true);
  const [isLoadingStgPhotos, setIsLoadingStgPhotos] = useState(false);

  // テンプレート関連
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // 現場写真カテゴリ（IDベース状態管理）
  const [photoCategories, setPhotoCategories] = useState<{ id: number; name: string; setting_id?: number }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  // 後方互換性のため残す（徐々に置換）
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DetailedProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    step: 'processing',
    successFiles: [],
    failedFiles: []
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingBlackboardInfo, setPendingBlackboardInfo] = useState<BlackboardInfo | null>(null);

  // URLパラメータを解析
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parsed = parseUploadParams(window.location.search);
      setParams(parsed);

      // デバッグログ
      console.groupCollapsed('[UPLOAD DEBUG]');
      console.log('params', parsed);
      console.log('selectedCategoryId', selectedCategoryId);
      console.log('selectedCategoryName', selectedCategoryName);
      console.groupEnd();
    }
  }, [selectedCategoryId, selectedCategoryName]);

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

  // STG写真を自動読み込み + カテゴリ自動選択（IDベース）
  useEffect(() => {
    let alive = true;

    if (params.source === 'stg' && params.photoIds.length > 0) {
      const loadStgPhotos = async () => {
        setIsLoadingStgPhotos(true);
        try {
          console.log('📸 Loading STG photos:', params.photoIds);

          // 各photo_idからreal_pathを取得
          const photoPromises = params.photoIds.map(async (id) => {
            const res = await fetch(`/api/stg-photo/${id}`);
            if (!res.ok) throw new Error(`Failed to fetch photo ${id}`);
            return await res.json();
          });

          const photoDataList = await Promise.all(photoPromises);
          console.log('✅ STG photo data:', photoDataList);

          // site_code/place_codeフィルタリング（別現場写真の混入防止）
          const filtered = photoDataList.filter(data => {
            const photo = data?.photo;
            if (!photo) return false;

            // site_codeチェック（存在する場合のみ）
            if (params.siteCode && photo.site_code && String(photo.site_code) !== String(params.siteCode)) {
              console.warn(`⚠️ Photo ${photo.id} site_code mismatch: ${photo.site_code} !== ${params.siteCode}`);
              return false;
            }

            // place_codeチェック（STGには存在しない可能性があるのでスキップ）
            // if (params.placeCode && photo.place_code && String(photo.place_code) !== String(params.placeCode)) {
            //   console.warn(`⚠️ Photo ${photo.id} place_code mismatch: ${photo.place_code} !== ${params.placeCode}`);
            //   return false;
            // }

            return true;
          });

          console.log(`✅ Filtered photos: ${filtered.length}/${photoDataList.length}`);

          // real_pathから画像をBlob取得してFileオブジェクト化
          const filePromises = filtered.map(async (data) => {
            const { photo } = data;
            const proxyUrl = `/api/stg-image-proxy?real_path=${encodeURIComponent(photo.real_path)}`;
            const imageRes = await fetch(proxyUrl);
            if (!imageRes.ok) throw new Error(`Failed to fetch image: ${photo.real_path}`);

            const blob = await imageRes.blob();
            const file = new File([blob], photo.org_path || photo.real_path, { type: blob.type });
            return file;
          });

          const stgFiles = await Promise.all(filePromises);
          if (alive) {
            console.log('✅ STG files loaded:', stgFiles.length);
            setFiles(stgFiles);
            setMode('batch');
          }

          // STGカテゴリIDをダンドリワークカテゴリIDに変換して自動選択
          if (params.categoryId && params.placeCode && params.siteCode && alive) {
            const stgCategoryId = params.categoryId;

            try {
              // 1. STGカテゴリマスタからカテゴリ名を取得
              const categoryResponse = await fetch('/api/stg-categories');
              if (!categoryResponse.ok) {
                console.error('❌ [AUTO-CAT] Failed to fetch STG categories:', categoryResponse.status);
                return;
              }

              const { categoryMap } = await categoryResponse.json();
              const stgCategoryName = categoryMap[stgCategoryId];

              if (!stgCategoryName) {
                console.warn(`⚠️ [AUTO-CAT] No category name found for STG category_id ${stgCategoryId}`);
                return;
              }

              console.log(`📋 STG category ${stgCategoryId} → "${stgCategoryName}"`);

              // 2. STGカテゴリのdefault_nameを特定（施工前, 施工中, 施工後など）
              const stgCategoryDefaultName: Record<number, string> = {
                100: '施工前',
                200: '施工中',
                300: '施工後',
                410: '現場コメント写真',
                500: 'その他',
                600: '未分類'
              };

              const defaultName = stgCategoryDefaultName[stgCategoryId];

              if (!defaultName) {
                console.warn(`⚠️ [AUTO-CAT] No default_name mapping for STG category_id ${stgCategoryId}`);
                return;
              }

              console.log(`📋 STG default_name: "${defaultName}"`);

              // 3. 現場種類別のカテゴリ設定を取得
              const siteTypeCategoriesResponse = await fetch(
                `/api/stg-site-type-categories?site_code=${params.siteCode}`
              );

              if (!siteTypeCategoriesResponse.ok) {
                console.error('❌ [AUTO-CAT] Failed to fetch site-type categories:', siteTypeCategoriesResponse.status);
                return;
              }

              const { categories } = await siteTypeCategoriesResponse.json();

              console.log(`📋 Site-type categories:`, categories);

              // 4. default_nameで一致するカテゴリを検索
              const matchedCategory = categories.find(
                (cat: any) => cat.default_name === defaultName
              );

              if (!matchedCategory) {
                console.warn(`⚠️ [AUTO-CAT] No matching category for default_name "${defaultName}"`, categories);
                return;
              }

              console.log(`📋 Matched category:`, matchedCategory);

              if (alive) {
                // setting_idとcategory_nameを設定
                setSelectedCategoryId(Number(matchedCategory.setting_id));
                setSelectedCategoryName(matchedCategory.category_name);
                setSelectedCategory(matchedCategory.category_name);

                console.log(`[AUTO-CAT] ✅ selected by site-type mapping`, {
                  stgCategoryId,
                  defaultName,
                  settingId: matchedCategory.setting_id,
                  categoryName: matchedCategory.category_name
                });
              }
            } catch (catError) {
              console.error('❌ [AUTO-CAT] Failed to fetch category:', catError);
            }
          }
        } catch (error) {
          console.error('❌ Failed to load STG photos:', error);
          if (alive) {
            alert('STG写真の読み込みに失敗しました');
          }
        } finally {
          if (alive) {
            setIsLoadingStgPhotos(false);
          }
        }
      };

      loadStgPhotos();
    }

    return () => {
      alive = false;
    };
  }, [params.source, params.photoIds, params.categoryId, params.siteCode, params.placeCode]);

  // 現場写真カテゴリを取得（STG写真の場合はスキップ）
  useEffect(() => {
    // STG写真の場合、カテゴリは既に自動選択されているのでスキップ
    if (params.source === 'stg') {
      console.log('⏭️ Skipping photo categories fetch for STG photos');
      return;
    }

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
              setSelectedCategoryId(defaultCat.id);
              setSelectedCategoryName(defaultCat.name);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch photo categories:', error);
      }
    };

    fetchPhotoCategories();
  }, [placeCode, siteCode, params.source]);

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
      setPreviewFile(storedFiles[0]);
      setCurrentPreviewIndex(0);
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
    setProgress({
      total: assignments.size,
      completed: 0,
      failed: 0,
      step: 'processing',
      successFiles: [],
      failedFiles: []
    });

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

  // フォーム送信時はモーダルを表示するだけ（IDベース判定）
  const handleFormSubmit = (blackboardInfo: BlackboardInfo) => {
    if (files.length === 0) {
      alert('写真を選択してください');
      return;
    }

    // STG写真の場合はカテゴリが既に自動選択されているのでモーダルをスキップ
    if (params.source === 'stg' && selectedCategoryId) {
      console.log('⏭️ Skipping category modal for STG photos', {
        selectedCategoryId,
        selectedCategoryName
      });
      // カテゴリIDを含めて送信
      const payload = { ...blackboardInfo, category_id: selectedCategoryId };
      handleSubmit(payload);
      return;
    }

    // 黒板情報を一時保存してカテゴリ選択モーダルを表示
    setPendingBlackboardInfo(blackboardInfo);
    setShowCategoryModal(true);
  };

  // カテゴリ選択後に実際のアップロード処理を開始
  const handleSubmit = async (blackboardInfo: BlackboardInfo) => {
    setIsProcessing(true);
    setShowModal(true);
    setProgress({
      total: files.length,
      completed: 0,
      failed: 0,
      step: 'processing',
      successFiles: [],
      failedFiles: []
    });

    try {
      const jobId = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;

      // ステップ1: 画像処理（黒板合成）
      setProgress(prev => ({ ...prev, step: 'processing' }));
      const processed = await processImages(
        files,
        blackboardInfo,
        jobId,
        (current, total) => {
          setProgress(prev => ({
            ...prev,
            currentFile: files[current - 1]?.name
          }));
        },
        selectedTemplate || undefined
      );

      const uploadFiles = processed.map(p => ({
        filename: p.filename,
        blob: p.processedBlob
      }));

      // ステップ2: ダンドリワークAPIへアップロード
      // TODO: 現場写真APIの実装待ち
      // - エンジニアから詳細情報を受領後、正式なAPI実装に置き換える
      // - 現在はモック実装（実際にはダンドリワークAPIに保存されない）
      // - 必要な情報: エンドポイントURL、認証方式、リクエストパラメータ、レスポンス形式
      setProgress(prev => ({
        ...prev,
        step: 'uploading',
        apiEndpoint: `/co/places/${placeCode}/sites/${siteCode}/site_photos`,
        apiParams: {
          place_code: placeCode,
          site_code: siteCode,
          category: selectedCategory || '電子小黒板',
          update_crew: '100033',
          files_count: uploadFiles.length
        }
      }));

      // TODO: 実際のAPI呼び出しに置き換える
      // 現在はモック実装（進捗表示のみ）
      await uploadPhotosInChunks(
        placeCode,
        siteCode,
        selectedCategory || '電子小黒板',
        '100033',
        uploadFiles,
        (completed) => {
          setProgress(prev => ({
            ...prev,
            completed,
            successFiles: processed.slice(0, completed).map(p => p.filename)
          }));
        }
      );

      // ステップ3: manifest保存
      // TODO: マニフェストの自動アップロード機能（API実装待ち）
      // - 現在はSupabaseに保存のみ
      // - 将来実装: ダンドリワークAPI経由で「電子小黒板マニフェスト」カテゴリへ自動格納
      // - エンドポイント: /co/places/{place_code}/sites/{site_code}/documents
      // - file_type: "電子小黒板マニフェスト"（事前にカテゴリ作成が必要）
      setProgress(prev => ({ ...prev, step: 'saving' }));
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

      // TODO: Supabase保存後、ダンドリワークAPIへマニフェストファイルを自動アップロード
      await saveManifest(manifest);

      // テンプレート使用回数をカウント
      if (selectedTemplate) {
        await incrementTemplateUsage(selectedTemplate.id);
      }

      // ステップ4: 完了
      setProgress(prev => ({ ...prev, step: 'complete' }));

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
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';

      setProgress(prev => ({
        ...prev,
        failed: prev.total - prev.completed,
        failedFiles: files.slice(prev.completed).map(f => ({
          filename: f.name,
          error: errorMessage
        }))
      }));

      alert('アップロードに失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* デバッグバナー */}
      {params.debug && (
        <div style={{background:"#fff3cd", border:"1px solid #ffeeba", padding:8, margin:"8px", fontSize:12, fontFamily:"monospace"}}>
          <strong>DEBUG</strong> source={params.source} / site={params.siteCode} / place={params.placeCode} /
          category_id(stg)={String(params.categoryId)} / photo_ids=[{params.photoIds.join(",")}]
          <br/>
          selectedCategoryId={String(selectedCategoryId)} / selectedCategoryName={selectedCategoryName}
        </div>
      )}

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

          {/* STG写真読み込み中 */}
          {isLoadingStgPhotos && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">STG写真を読み込み中...</h3>
                <p className="text-gray-600">選択した写真を取得しています</p>
              </div>
            </div>
          )}

          {/* 写真未選択時の初期表示（STG写真でない場合のみ） */}
          {files.length === 0 && !isProcessing && !isLoadingStgPhotos && params.source !== 'stg' && (
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
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => fileSelectorRef.current?.openDialog()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    写真を追加
                  </button>
                  <button
                    onClick={() => window.location.href = '/sites'}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    現場一覧に戻る
                  </button>
                </div>
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
                              onSubmit={handleFormSubmit}
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
        <DetailedUploadProgressModal
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

      {/* カテゴリ選択モーダル */}
      {showCategoryModal && pendingBlackboardInfo && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowCategoryModal(false)}
          />

          {/* モーダル本体 */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white shadow-2xl z-50 overflow-y-auto rounded-xl">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📸 現場写真カテゴリを選択
                </h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-2">
                {files.length}枚の写真をアップロードします
              </p>
            </div>

            {/* コンテンツエリア */}
            <div className="p-6">
              <div className="space-y-3">
                {photoCategories.length > 0 ? (
                  photoCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setShowCategoryModal(false);
                        // カテゴリ選択後にアップロード開始
                        handleSubmit(pendingBlackboardInfo);
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg hover:scale-102 text-left ${
                        selectedCategory === category.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{category.name}</div>
                          {category.name === '電子小黒板' && (
                            <div className="text-xs text-gray-500 mt-1">推奨カテゴリ</div>
                          )}
                        </div>
                        {selectedCategory === category.name && (
                          <div className="flex-shrink-0 text-blue-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>現場写真カテゴリを読み込んでいます...</p>
                    <p className="text-sm mt-2">※ API実装待ち</p>
                  </div>
                )}
              </div>

              {photoCategories.length === 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-medium text-yellow-800">カテゴリ未設定</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        現場写真カテゴリAPIの実装が必要です。<br />
                        実装後、カテゴリ一覧が表示されます。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="border-t bg-gray-50 p-4">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </>
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
