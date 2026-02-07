
import { YearLevel, SubjectCategory, Subject, Teacher, TeacherType } from './types';

export const PERIODS_PER_DAY = 5;

export const PERIOD_TIME_LABELS = [
  "9:05〜10:35",
  "10:45〜12:15",
  "13:05〜14:35",
  "14:45〜16:15",
  "16:25〜17:05"
];

export const CATEGORY_COLORS: Record<SubjectCategory, string> = {
  [SubjectCategory.BASIC]: 'bg-slate-100 text-slate-800 border-slate-200',
  [SubjectCategory.PROF_BASIC]: 'bg-blue-100 text-blue-800 border-blue-200',
  [SubjectCategory.PROF]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [SubjectCategory.PRACTICE]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't1', name: '山田 太郎', type: TeacherType.FULL_TIME },
  { id: 't2', name: '佐藤 花子', type: TeacherType.FULL_TIME },
  { id: 't3', name: '鈴木 一郎', type: TeacherType.GUEST },
  { id: 't4', name: '高橋 直樹', type: TeacherType.GUEST },
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: '1', name: '解剖学', category: SubjectCategory.PROF_BASIC, requiredHours: 90, requiredCount: 60, targetYear: YearLevel.YEAR_1, color: CATEGORY_COLORS[SubjectCategory.PROF_BASIC], teacherIds: ['t1'] },
  { id: '2', name: '生理学', category: SubjectCategory.PROF_BASIC, requiredHours: 90, requiredCount: 60, targetYear: YearLevel.YEAR_1, color: CATEGORY_COLORS[SubjectCategory.PROF_BASIC], teacherIds: ['t2'] },
  { id: '3', name: '情報科学', category: SubjectCategory.BASIC, requiredHours: 30, requiredCount: 20, targetYear: YearLevel.YEAR_1, color: CATEGORY_COLORS[SubjectCategory.BASIC], teacherIds: ['t3'] },
  { id: '4', name: '臨床実習Ⅰ', category: SubjectCategory.PRACTICE, requiredHours: 180, requiredCount: 120, targetYear: YearLevel.YEAR_2, color: CATEGORY_COLORS[SubjectCategory.PRACTICE], teacherIds: ['t4'] },
];

export const formatDateJapanese = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
};

export const createInitialSchedules = () => {
  const schedules: any = {};
  Object.values(YearLevel).forEach(year => {
    schedules[year] = {};
  });
  return schedules;
};
