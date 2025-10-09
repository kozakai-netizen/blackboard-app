// lib/blackboard-utils.ts
import type { BlackboardInfo, BlackboardData, Template } from '@/types';

/**
 * BlackboardInfoをBlackboardDataに変換
 */
export function blackboardInfoToData(info: BlackboardInfo): Partial<BlackboardData> {
  return {
    工事名: info.projectName,
    工種: info.workType,
    天候: info.weather,
    種別: info.workCategory,
    細別: info.workDetail,
    撮影日: info.timestamp.toLocaleDateString('ja-JP'),
    施工者: info.contractor || '',
    撮影場所: info.location,
    測点位置: info.station,
    立会者: info.witness,
    備考: info.remarks,
  };
}

/**
 * BlackboardDataをBlackboardInfoに変換
 */
export function blackboardDataToInfo(
  data: Partial<BlackboardData>,
  timestamp?: Date
): Partial<BlackboardInfo> {
  return {
    projectName: data.工事名 || '',
    workType: data.工種 || '',
    weather: data.天候 || '',
    workCategory: data.種別,
    workDetail: data.細別,
    timestamp: timestamp || new Date(),
    contractor: data.施工者,
    location: data.撮影場所,
    station: data.測点位置,
    witness: data.立会者,
    remarks: data.備考,
  };
}

/**
 * フィールドIDから表示ラベルを取得
 */
export function getFieldLabel(fieldId: string): string {
  const labelMap: Record<string, string> = {
    工事名: '工事名',
    工種: '工種',
    天候: '天候',
    種別: '種別',
    細別: '細別',
    撮影日: '撮影日',
    施工者: '施工者',
    撮影場所: '撮影場所',
    測点位置: '測点位置',
    立会者: '立会者',
    備考: '備考',
  };
  return labelMap[fieldId] || fieldId;
}

/**
 * BlackboardInfoから指定したフィールドの値を取得
 */
export function getFieldValue(info: BlackboardInfo, fieldId: string): string {
  const data = blackboardInfoToData(info);
  return (data[fieldId as keyof BlackboardData] as string) || '';
}
