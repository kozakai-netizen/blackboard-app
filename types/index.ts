// types/index.ts
export interface BlackboardInfo {
  projectName: string;
  workType: string;
  weather: string;
  workContent?: string;
  timestamp: Date;
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
