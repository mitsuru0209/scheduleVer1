
export enum YearLevel {
  YEAR_1 = '1年次',
  YEAR_2 = '2年次',
  YEAR_3 = '3年次'
}

export enum SubjectCategory {
  BASIC = '基礎分野',
  PROF_BASIC = '専門基礎分野',
  PROF = '専門分野',
  PRACTICE = '実習'
}

export enum AdminItemType {
  DELAYED_START = '遅出',
  BUSINESS_TRIP = '出張',
  EXEMPTION = '職免',
  LEAVE = '休暇',
  ASSISTANT = '補助教員'
}

export enum TeacherType {
  FULL_TIME = '専任教員',
  GUEST = '外来講師'
}

export interface AdminItem {
  id: string;
  type: AdminItemType;
  teacherId: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  periodIndex?: number;
  yearLevel?: YearLevel;
}

export interface Teacher {
  id: string;
  name: string;
  type: TeacherType;
}

export interface Subject {
  id: string;
  name: string;
  category: SubjectCategory;
  requiredHours: number;
  requiredCount: number; // 規定コマ数
  targetYear: YearLevel;
  color: string;
  teacherIds: string[];
}

export type DailySchedule = (string | null)[];

export interface MasterTemplate {
  id: string;
  name: string;
  yearLevel: YearLevel;
  // 5日間 (月-金) × 5時限 の配列
  rows: DailySchedule[];
  // 5日間 (月-金) ごとの勤怠・補助アイテム配列
  adminRows: AdminItem[][];
}

export interface AppState {
  subjects: Subject[];
  teachers: Teacher[];
  schedules: Record<YearLevel, Record<string, DailySchedule>>;
  adminSchedules: Record<string, AdminItem[]>;
  masterTemplates: MasterTemplate[];
}
