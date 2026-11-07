'use client';

export interface CommunityDisasterReport {
  id: string;
  villageName: string;
  incidentType: 'FLOOD' | 'LANDSLIDE' | 'FOREST_FIRE' | 'CAGE_VIOLATION';
  incidentLabel: string;
  description: string;
  senderName: string;
  senderEmail?: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
  createdAt: string;
  timestamp: string;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED';
  isRead?: boolean;
}

const STORAGE_KEY = 'easup_community_reports_v3';
export const COMMUNITY_REPORTS_CHANGED_EVENT = 'easup-community-reports-changed';

export const INITIAL_REPORTS: CommunityDisasterReport[] = [
  {
    id: 'SOS-84920',
    villageName: 'Thôn Đoàn Kết',
    incidentType: 'FLOOD',
    incidentLabel: '🌊 Ngập lụt / Nước dâng',
    description:
      'Tổ xung kích PCTT Thôn Đoàn Kết báo cáo: Mực nước khu vực trũng ven kênh chính và Hồ Trung Chuyển dâng nhanh +15cm trong 1 giờ qua, đã cắm cọc tiêu cảnh báo ngập.',
    senderName: 'Tổ xung kích Thôn Đoàn Kết',
    senderEmail: 'doanket@easupso.com',
    lat: 13.069298,
    lng: 107.881527,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    timestamp: '15 phút trước',
    status: 'PENDING',
    isRead: false,
  },
  {
    id: 'SOS-84919',
    villageName: 'Thôn 6',
    incidentType: 'LANDSLIDE',
    incidentLabel: '⛰️ Sạt lở bờ suối / Kênh',
    description:
      'Người dân phản ánh: Xuất hiện vết rạn nứt bờ suối dài 20m giáp ranh khu sản xuất nương rẫy, nguy cơ sạt lở nếu có mưa to đêm nay.',
    senderName: 'Trưởng thôn 6 (Y Blô Niê)',
    senderEmail: 'thon6@easupso.com',
    lat: 13.052115,
    lng: 107.899842,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    timestamp: '45 phút trước',
    status: 'INVESTIGATING',
    isRead: false,
  },
];

export function getStoredCommunityReports(): CommunityDisasterReport[] {
  if (typeof window === 'undefined') return INITIAL_REPORTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_REPORTS;
  } catch {
    return INITIAL_REPORTS;
  }
}

function saveReportsLocally(reports: CommunityDisasterReport[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    window.dispatchEvent(
      new CustomEvent(COMMUNITY_REPORTS_CHANGED_EVENT, { detail: reports })
    );
  } catch {
    // ignore
  }
}

export function addCommunityReport(
  report: Omit<CommunityDisasterReport, 'id' | 'createdAt' | 'status' | 'isRead'> & {
    id?: string;
    createdAt?: string;
    status?: 'PENDING' | 'INVESTIGATING' | 'RESOLVED';
  }
): CommunityDisasterReport {
  const reports = getStoredCommunityReports();
  const newReport: CommunityDisasterReport = {
    id: report.id || `SOS-${Date.now().toString().slice(-5)}`,
    villageName: report.villageName,
    incidentType: report.incidentType,
    incidentLabel: report.incidentLabel,
    description: report.description,
    senderName: report.senderName || 'Người dân phản ánh',
    senderEmail: report.senderEmail,
    lat: report.lat,
    lng: report.lng,
    imageUrl: report.imageUrl || null,
    createdAt: report.createdAt || new Date().toISOString(),
    timestamp:
      report.timestamp ||
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    status: report.status || 'PENDING',
    isRead: false,
  };

  const updated = [newReport, ...reports];
  saveReportsLocally(updated);

  // Phát broadcast tới các tab / thiết bị khác qua BroadcastChannel hoặc Storage
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('easup_community_reports_channel');
      bc.postMessage({ type: 'NEW_REPORT', report: newReport });
      bc.close();
    }
  } catch {}

  return newReport;
}

export function updateReportStatus(
  id: string,
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
): CommunityDisasterReport[] {
  const reports = getStoredCommunityReports();
  const updated = reports.map((r) => (r.id === id ? { ...r, status } : r));
  saveReportsLocally(updated);
  return updated;
}

export function markReportAsRead(id: string): CommunityDisasterReport[] {
  const reports = getStoredCommunityReports();
  const updated = reports.map((r) => (r.id === id ? { ...r, isRead: true } : r));
  saveReportsLocally(updated);
  return updated;
}

export function markAllReportsAsRead(): CommunityDisasterReport[] {
  const reports = getStoredCommunityReports();
  const updated = reports.map((r) => ({ ...r, isRead: true }));
  saveReportsLocally(updated);
  return updated;
}

export function deleteCommunityReport(id: string): CommunityDisasterReport[] {
  const reports = getStoredCommunityReports();
  const updated = reports.filter((r) => r.id !== id);
  saveReportsLocally(updated);
  return updated;
}
