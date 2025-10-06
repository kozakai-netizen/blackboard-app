// lib/fileStore.ts
// グローバルなファイル保持用ストア

let pendingFiles: File[] = [];
let pendingSiteInfo: { siteCode: string; placeCode: string } | null = null;

export const fileStore = {
  setFiles: (files: File[], siteCode: string, placeCode: string) => {
    pendingFiles = files;
    pendingSiteInfo = { siteCode, placeCode };
  },

  getFiles: () => {
    return pendingFiles;
  },

  getSiteInfo: () => {
    return pendingSiteInfo;
  },

  clear: () => {
    pendingFiles = [];
    pendingSiteInfo = null;
  }
};
