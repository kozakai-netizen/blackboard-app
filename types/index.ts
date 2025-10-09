// types/index.ts
/**
 * 黒板情報（完全テンプレート駆動版）
 * すべての項目はテンプレートで定義される
 */
export interface BlackboardInfo {
  // 基本情報
  projectName: string;
  timestamp: Date;

  // テンプレートで定義される項目（すべてオプショナル）
  workType?: string;      // 工種
  weather?: string;       // 天候
  workCategory?: string;  // 種別
  workDetail?: string;    // 細別
  contractor?: string;    // 施工者
  location?: string;      // 撮影場所
  station?: string;       // 測点位置
  witness?: string;       // 立会者
  remarks?: string;       // 備考
}

export interface ProcessedImage {
  originalFile: File;
  originalHash: string;
  processedBlob: Blob;
  processedHash: string;
  filename: string;
  width: number;
  height: number;
}

export interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export interface ManifestFile {
  localId: string;
  originalFilename: string;
  uploadedFilename: string;
  originalHash: string;
  processedHash: string;
  width: number;
  height: number;
  status: 'pending' | 'uploaded' | 'failed';
  attempts: number;
  dwUuid?: string;
  errorMessage?: string;
  completedAt?: string;
}

export interface Manifest {
  jobId: string;
  placeCode: string;
  siteCode: string;
  categoryName: string;
  templateVersion: string;
  createdAtClient: string;
  createdAtServer?: string;
  hashAlgorithm: 'SHA-256';
  blackboardInfo: BlackboardInfo;
  files: ManifestFile[];
  summary?: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface DandoriSite {
  site_code: string;
  site_name: string;
  place_code: string;
}

export interface DandoriUploadResponse {
  result: boolean;
  message?: string;
  data?: any;
}

// ========================================
// テンプレート管理機能の型定義
// ========================================

/**
 * 黒板の位置（座標）
 */
export interface BlackboardPosition {
  x: number; // 左端からの位置（%）
  y: number; // 上端からの位置（%）
}

/**
 * 黒板のデザイン設定
 */
export interface BlackboardDesignSettings {
  style: 'black' | 'green'; // 黒板スタイル（黒 or 緑）
  position: BlackboardPosition; // 黒板の位置
  width: number; // 幅（%）固定80
  height: number; // 高さ（%）固定20
  fontSize: 'standard' | 'large'; // フォントサイズ
  bgColor: string; // 背景色（自動計算）
  textColor: string; // 文字色（固定: #FFFFFF）
  opacity: number; // 透明度（固定: 85）
}

/**
 * 黒板データ（記載内容）
 */
export interface BlackboardData {
  工事名: string;
  工種?: string;
  天候?: string;
  種別?: string;
  細別?: string;
  撮影日: string;
  施工者?: string;
  撮影場所?: string;
  測点位置?: string;
  立会者?: string;
  備考?: string;
}

/**
 * テンプレート
 */
export interface Template {
  id: string;
  name: string; // 例: "土工事セット"
  description: string; // 例: "土工事でよく使う設定"

  // 使用する項目
  fields: string[]; // 例: ['工事名', '工種', '種別', ...]

  // デフォルト値
  defaultValues: Partial<BlackboardData>;

  // デザイン設定
  designSettings: BlackboardDesignSettings;

  // メタ情報
  isDefault: boolean; // デフォルトテンプレートか
  usageCount: number; // 使用回数
  lastUsed: string | null; // 最終使用日時
  createdAt: string;
  updatedAt: string;
}

/**
 * 最後に使用した設定（localStorage用）
 */
export interface LastUsedSetting {
  blackboardData: BlackboardData;
  position: BlackboardPosition;
  lastUsed: string;
}

/**
 * 一括登録モードの設定
 */
export interface BatchUploadSettings {
  template: Template;
  blackboardData: BlackboardData;
  position: BlackboardPosition; // 全写真共通の位置
  photos: File[];
}

/**
 * 個別登録モード - 写真ごとの設定
 */
export interface PhotoSettings {
  file: File;
  blackboardData: BlackboardData;
  position: BlackboardPosition; // この写真専用の位置
  isConfigured: boolean; // 設定済みか
}

/**
 * 個別登録モードの設定
 */
export interface IndividualUploadSettings {
  template: Template;
  photos: PhotoSettings[];
}
