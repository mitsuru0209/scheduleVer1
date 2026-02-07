
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { YearLevel, SubjectCategory, Subject, Teacher, DailySchedule, AdminItem, AdminItemType, TeacherType, MasterTemplate } from './types';
import { CATEGORY_COLORS, PERIODS_PER_DAY, PERIOD_TIME_LABELS, INITIAL_SUBJECTS, INITIAL_TEACHERS, createInitialSchedules, formatDateJapanese } from './constants';
import WordPressExport from './WordPressExport.tsx';

// --- Utils ---
const safeParseDate = (dateStr: string) => new Date(dateStr.replace(/-/g, '/'));
const toISODateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const HOUR_HEIGHT = 85;
const START_HOUR = 8;
const END_HOUR = 19;

const PERIOD_TIME_MAP = [
  { start: 65, end: 155 },
  { start: 165, end: 255 },
  { start: 305, end: 395 },
  { start: 405, end: 495 },
  { start: 505, end: 545 },
];

const timeToMinutes = (timeStr: string | undefined): number | null => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60 + m) - (START_HOUR * 60);
};

const App: React.FC = () => {
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem('med_v8_' + key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [subjects, setSubjects] = useState<Subject[]>(() => loadState('subjects', INITIAL_SUBJECTS));
  const [teachers, setTeachers] = useState<Teacher[]>(() => loadState('teachers', INITIAL_TEACHERS));
  const [schedules, setSchedules] = useState<Record<string, Record<string, DailySchedule>>>(() => loadState('schedules', createInitialSchedules()));
  const [adminSchedules, setAdminSchedules] = useState<Record<string, AdminItem[]>>(() => loadState('admin_schedules', {}));
  const [masterTemplates, setMasterTemplates] = useState<MasterTemplate[]>(() => loadState('master_templates', []));

  const [activeYear, setActiveYear] = useState<YearLevel>(YearLevel.YEAR_1);
  const [currentView, setCurrentView] = useState<'schedule' | 'teacher' | 'master_list' | 'db'>('schedule');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; mode: 'empty' | 'current'; name: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('med_v8_subjects', JSON.stringify(subjects));
    localStorage.setItem('med_v8_teachers', JSON.stringify(teachers));
    localStorage.setItem('med_v8_schedules', JSON.stringify(schedules));
    localStorage.setItem('med_v8_admin_schedules', JSON.stringify(adminSchedules));
    localStorage.setItem('med_v8_master_templates', JSON.stringify(masterTemplates));
  }, [subjects, teachers, schedules, adminSchedules, masterTemplates]);

  // 全スケジュールの実施回数集計
  const subjectStats = useMemo(() => {
    const stats: Record<string, number> = {};
    Object.values(YearLevel).forEach(year => {
      const yearSched = schedules[year] || {};
      Object.values(yearSched).forEach(daySched => {
        daySched.forEach(sid => {
          if (sid) {
            stats[sid] = (stats[sid] || 0) + 1;
          }
        });
      });
    });
    return stats;
  }, [schedules]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => toISODateString(getMonday(new Date())));

  const weekDates = useMemo(() => {
    const dates = [];
    const start = safeParseDate(currentWeekStart);
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(toISODateString(d));
    }
    return dates;
  }, [currentWeekStart]);

  const sortedTeachers = useMemo(() => [...teachers].sort((a,b) => a.name.localeCompare(b.name, 'ja')), [teachers]);
  const fullTimeTeachers = useMemo(() => teachers.filter(t => t.type === TeacherType.FULL_TIME), [teachers]);

  const teacherWeeklyData = useMemo(() => {
    if (!selectedTeacherId) return {};
    const data: Record<string, any[]> = {};
    weekDates.forEach(date => {
      const items: any[] = [];
      Object.values(YearLevel).forEach(year => {
        const yearSched = schedules[year]?.[date] || [];
        const dayAdmin = adminSchedules[date] || [];
        yearSched.forEach((sid, pIdx) => {
          if (!sid) return;
          const subject = subjects.find(s => s.id === sid);
          if (!subject) return;
          const isPrimary = subject.teacherIds.includes(selectedTeacherId);
          const isAssistant = dayAdmin.some(a => a.type === AdminItemType.ASSISTANT && a.periodIndex === pIdx && a.teacherId === selectedTeacherId && a.yearLevel === year);
          if (isPrimary || isAssistant) {
            const timeInfo = PERIOD_TIME_MAP[pIdx];
            items.push({
              label: subject.name,
              subLabel: `${year}${isAssistant ? ' (補助)' : ''}`,
              color: isAssistant ? 'bg-violet-100 border-violet-200 text-violet-800' : subject.color,
              top: (timeInfo.start / 60) * HOUR_HEIGHT,
              height: ((timeInfo.end - timeInfo.start) / 60) * HOUR_HEIGHT
            });
          }
        });
      });
      const dayAdmin = adminSchedules[date] || [];
      dayAdmin.filter(it => it.teacherId === selectedTeacherId && it.type !== AdminItemType.ASSISTANT).forEach(it => {
        const startMin = timeToMinutes(it.startTime);
        const endMin = timeToMinutes(it.endTime);
        if (startMin !== null && endMin !== null) {
          items.push({
            label: it.type,
            subLabel: it.location || `${it.startTime}-${it.endTime}`,
            color: it.type === AdminItemType.DELAYED_START ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-rose-100 border-rose-200 text-rose-800',
            top: (startMin / 60) * HOUR_HEIGHT,
            height: ((endMin - startMin) / 60) * HOUR_HEIGHT
          });
        }
      });
      data[date] = items;
    });
    return data;
  }, [selectedTeacherId, weekDates, schedules, adminSchedules, subjects]);

  const handleSubjectChange = (date: string, periodIndex: number, subjectId: string | null) => {
    setSchedules(prev => {
      const yearKey = activeYear as string;
      const currentYearSched = prev[yearKey] || {};
      const currentDaySched = currentYearSched[date] ? [...currentYearSched[date]] : Array(PERIODS_PER_DAY).fill(null);
      currentDaySched[periodIndex] = subjectId === "" ? null : subjectId;
      return { ...prev, [yearKey]: { ...currentYearSched, [date]: currentDaySched } };
    });
  };

  const applyMaster = (template: MasterTemplate) => {
    setSchedules(prev => {
      const yearKey = template.yearLevel as string;
      const nextSchedules = { ...prev };
      const nextYearSched = { ...(nextSchedules[yearKey] || {}) };
      weekDates.forEach((date, dIdx) => {
        if (template.rows[dIdx]) nextYearSched[date] = [...template.rows[dIdx]];
      });
      nextSchedules[yearKey] = nextYearSched;
      return nextSchedules;
    });
    setAdminSchedules(prev => {
      const nextAdminSchedules = { ...prev };
      weekDates.forEach((date, dIdx) => {
        const currentItems = prev[date] || [];
        const filteredItems = currentItems.filter(item => item.type === AdminItemType.ASSISTANT && item.yearLevel !== template.yearLevel);
        const templateItems = (template.adminRows[dIdx] || []).map(item => ({ ...item, id: 'adm-' + Math.random().toString(36).substr(2, 9) }));
        nextAdminSchedules[date] = [...filteredItems, ...templateItems];
      });
      return nextAdminSchedules;
    });
    setShowApplyModal(false);
    showToast(`マスタ「${template.name}」を適用しました`);
  };

  const handleCreateMaster = () => {
    if (!createModal) return;
    const finalName = createModal.name.trim() || `${activeYear} マスタ (${new Date().toLocaleDateString()})`;
    let finalRows: DailySchedule[];
    let finalAdminRows: AdminItem[][];
    if (createModal.mode === 'current') {
      const yearKey = activeYear as string;
      finalRows = weekDates.map(date => schedules[yearKey]?.[date] ? [...schedules[yearKey][date]] : Array(5).fill(null));
      finalAdminRows = weekDates.map(date => (adminSchedules[date] || []).filter(item => item.type !== AdminItemType.ASSISTANT || item.yearLevel === activeYear).map(item => ({ ...item })));
    } else {
      finalRows = Array(5).fill(null).map(() => Array(5).fill(null));
      finalAdminRows = Array(5).fill(null).map(() => []);
    }
    const newTemplate: MasterTemplate = { id: 'mt-' + Date.now(), name: finalName, yearLevel: activeYear, rows: finalRows, adminRows: finalAdminRows };
    setMasterTemplates(prev => [...prev, newTemplate]);
    setCreateModal(null);
    setCurrentView('master_list');
  };

  const addAdminItem = (date: string, type: AdminItemType, options: Partial<AdminItem> = {}) => {
    const list = type === AdminItemType.ASSISTANT ? sortedTeachers : fullTimeTeachers;
    if (list.length === 0) return;
    const newItem: AdminItem = { id: 'adm-' + Math.random().toString(36).substr(2, 9), type, teacherId: list[0].id, startTime: "09:00", endTime: "17:00", ...options };
    setAdminSchedules(prev => ({ ...prev, [date]: [...(prev[date] || []), newItem] }));
  };

  const removeAdminItem = (date: string, itemId: string) => {
    setAdminSchedules(prev => ({ ...prev, [date]: (prev[date] || []).filter(item => item.id !== itemId) }));
  };

  const updateAdminItem = (date: string, itemId: string, updates: Partial<AdminItem>) => {
    setAdminSchedules(prev => ({ ...prev, [date]: (prev[date] || []).map(item => item.id === itemId ? { ...item, ...updates } : item) }));
  };

  const addMasterAdminItem = (masterId: string, dayIdx: number, type: AdminItemType, options: Partial<AdminItem> = {}) => {
    setMasterTemplates(prev => prev.map(mt => {
      if (mt.id !== masterId) return mt;
      const list = type === AdminItemType.ASSISTANT ? sortedTeachers : fullTimeTeachers;
      const newItem: AdminItem = { id: 'mt-adm-' + Math.random().toString(36).substr(2, 9), type, teacherId: list[0]?.id || '', startTime: "09:00", endTime: "17:00", yearLevel: mt.yearLevel, ...options };
      const nextAdminRows = [...mt.adminRows];
      nextAdminRows[dayIdx] = [...(nextAdminRows[dayIdx] || []), newItem];
      return { ...mt, adminRows: nextAdminRows };
    }));
  };

  const removeMasterAdminItem = (masterId: string, dayIdx: number, itemId: string) => {
    setMasterTemplates(prev => prev.map(mt => {
      if (mt.id !== masterId) return mt;
      const nextAdminRows = [...mt.adminRows];
      nextAdminRows[dayIdx] = nextAdminRows[dayIdx].filter(item => item.id !== itemId);
      return { ...mt, adminRows: nextAdminRows };
    }));
  };

  const updateMasterAdminItem = (masterId: string, dayIdx: number, itemId: string, updates: Partial<AdminItem>) => {
    setMasterTemplates(prev => prev.map(mt => {
      if (mt.id !== masterId) return mt;
      const nextAdminRows = [...mt.adminRows];
      nextAdminRows[dayIdx] = nextAdminRows[dayIdx].map(item => item.id === itemId ? { ...item, ...updates } : item);
      return { ...mt, adminRows: nextAdminRows };
    }));
  };

  const navigateWeek = (weeks: number) => {
    const d = safeParseDate(currentWeekStart);
    d.setDate(d.getDate() + (weeks * 7));
    setCurrentWeekStart(toISODateString(d));
  };

  const toggleTeacherForSubject = (subjectId: string, teacherId: string) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      const newIds = s.teacherIds.includes(teacherId)
        ? s.teacherIds.filter(id => id !== teacherId)
        : [...s.teacherIds, teacherId];
      return { ...s, teacherIds: newIds };
    }));
  };

  const yearSubjects = subjects.filter(s => s.targetYear === activeYear);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] px-8 py-3 rounded-2xl shadow-2xl font-black text-white bg-indigo-600 animate-in fade-in slide-in-from-top-4 duration-300">
          {toast.message}
        </div>
      )}

      {/* マスタ詳細編集モーダル (以前のコードと同様) */}
      {editingMasterId && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-2 overflow-y-auto">
          <div className="bg-white w-full max-w-[1550px] rounded-[1.5rem] shadow-2xl my-auto animate-in zoom-in duration-300 overflow-hidden">
            {masterTemplates.filter(mt => mt.id === editingMasterId).map(mt => (
              <div key={mt.id} className="flex flex-col h-full max-h-[98vh]">
                <div className="p-4 bg-indigo-950 text-white flex justify-between items-center shrink-0">
                  <div>
                    <span className="bg-indigo-500 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest mb-1 inline-block">{mt.yearLevel} マスタ編集</span>
                    <h3 className="text-xl font-black">{mt.name}</h3>
                  </div>
                  <button onClick={() => setEditingMasterId(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all text-xl w-10 h-10 flex items-center justify-center">×</button>
                </div>
                <div className="p-2 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-8 divide-x divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 flex items-center justify-center font-black text-sm text-slate-400">曜日</div>
                    {['1限','2限','3限','4限','5限'].map((label, i) => (
                      <div key={i} className="p-2 text-center font-black text-slate-400 bg-slate-50 border-b border-slate-200">
                        <div className="text-base">{label}</div>
                        <div className="text-[11px] opacity-60 font-bold">{PERIOD_TIME_LABELS[i]}</div>
                      </div>
                    ))}
                    <div className="col-span-2 bg-slate-50 p-2 text-center font-black text-rose-400 text-sm border-b border-slate-200">勤怠/補助</div>
                    
                    {['月','火','水','木','金'].map((day, dIdx) => {
                      const dayAdmin = mt.adminRows[dIdx] || [];
                      return (
                        <React.Fragment key={dIdx}>
                          <div className="p-2 flex flex-col items-center justify-center font-black text-indigo-500 bg-slate-50/50 border-b border-slate-200">
                            <span className="text-lg">{day}</span>
                          </div>
                          {Array.from({length: 5}).map((_, pIdx) => {
                            const sid = mt.rows[dIdx][pIdx] || "";
                            const subject = subjects.find(s => s.id === sid);
                            const assistants = dayAdmin.filter(a => a.type === AdminItemType.ASSISTANT && a.periodIndex === pIdx);
                            const primaryTeacher = subject ? teachers.find(t => t.id === subject.teacherIds[0])?.name : null;
                            const count = sid ? subjectStats[sid] || 0 : 0;

                            return (
                              <div key={pIdx} className="p-1 min-h-[120px] border-b border-slate-200">
                                <div className={`h-full rounded-xl p-2 border-2 flex flex-col justify-between transition-all ${subject ? `${subject.color} border-transparent shadow-sm` : 'border-dashed border-slate-100 opacity-60'}`}>
                                  <div className="flex flex-col gap-1 items-center">
                                    <select className="w-full bg-transparent border-none text-[16px] font-black p-0 appearance-none outline-none text-center cursor-pointer" value={sid} onChange={(e) => {
                                        const nextRows = [...mt.rows];
                                        nextRows[dIdx] = [...nextRows[dIdx]];
                                        nextRows[dIdx][pIdx] = e.target.value || null;
                                        setMasterTemplates(prev => prev.map(it => it.id === mt.id ? { ...it, rows: nextRows } : it));
                                    }}>
                                      <option value="">-- 空き --</option>
                                      {subjects.filter(s => s.targetYear === mt.yearLevel).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {subject && <div className="text-[11px] font-bold text-slate-500">{primaryTeacher}</div>}
                                  </div>
                                  <div className="mt-1 space-y-1">
                                    {assistants.map(a => (
                                      <div key={a.id} className="bg-violet-50 text-violet-700 border-violet-100 text-[11px] p-1 rounded-lg flex items-center justify-between border">
                                        <select className="bg-transparent border-none p-0 font-black flex-1 outline-none text-center" value={a.teacherId} onChange={(e) => updateMasterAdminItem(mt.id, dIdx, a.id, { teacherId: e.target.value })}>
                                          {sortedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <button onClick={() => removeMasterAdminItem(mt.id, dIdx, a.id)} className="px-1 text-xs">×</button>
                                      </div>
                                    ))}
                                    {subject && (
                                      <div className="text-[10px] font-black bg-white/40 px-2 py-0.5 rounded-full text-center">
                                        {count} / {subject.requiredCount} 回
                                      </div>
                                    )}
                                    <button onClick={() => addMasterAdminItem(mt.id, dIdx, AdminItemType.ASSISTANT, { periodIndex: pIdx })} className="text-[10px] text-indigo-400 font-black hover:underline">+ 補助</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="col-span-2 p-1.5 border-b border-slate-200 bg-slate-50/20 space-y-2">
                             {/* 勤怠管理 (マスタ編集内) */}
                             <div>
                                <div className="flex justify-between items-center mb-0.5"><span className="text-[11px] font-black text-blue-500">遅出</span><button onClick={() => addMasterAdminItem(mt.id, dIdx, AdminItemType.DELAYED_START)} className="text-blue-500 font-black text-xl">+</button></div>
                                <div className="flex flex-wrap gap-1">
                                  {dayAdmin.filter(i => i.type === AdminItemType.DELAYED_START).map(item => (
                                      <div key={item.id} className="flex gap-1 bg-blue-50 px-1.5 py-0.5 rounded-full text-[11px] border border-blue-100 font-black items-center">
                                          <select className="bg-transparent border-none p-0 outline-none text-center" value={item.teacherId} onChange={(e) => updateMasterAdminItem(mt.id, dIdx, item.id, { teacherId: e.target.value })}>{fullTimeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                          <button onClick={() => removeMasterAdminItem(mt.id, dIdx, item.id)} className="text-blue-300">×</button>
                                      </div>
                                  ))}
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-1">
                                <div className="flex justify-between items-center mb-0.5"><span className="text-[11px] font-black text-rose-500">出張/休暇/職免</span><button onClick={() => addMasterAdminItem(mt.id, dIdx, AdminItemType.BUSINESS_TRIP)} className="text-rose-500 font-black text-xl">+</button></div>
                                <div className="grid grid-cols-2 gap-1">
                                  {dayAdmin.filter(i => [AdminItemType.BUSINESS_TRIP, AdminItemType.LEAVE, AdminItemType.EXEMPTION].includes(i.type)).map(item => (
                                      <div key={item.id} className="bg-rose-50 border-rose-100 p-1.5 rounded-lg text-[10px] border space-y-0.5 shadow-sm">
                                          <div className="flex justify-between items-center border-b border-rose-100 pb-0.5 mb-0.5">
                                              <div className="flex items-center gap-1">
                                                <select className="font-black bg-rose-200 px-1 rounded text-rose-900 text-[9px]" value={item.type} onChange={(e) => updateMasterAdminItem(mt.id, dIdx, item.id, { type: e.target.value as AdminItemType })}>
                                                    <option value={AdminItemType.BUSINESS_TRIP}>出張</option>
                                                    <option value={AdminItemType.LEAVE}>休暇</option>
                                                    <option value={AdminItemType.EXEMPTION}>職免</option>
                                                </select>
                                                <select className="font-black bg-transparent border-none p-0 outline-none text-[10px]" value={item.teacherId} onChange={(e) => updateMasterAdminItem(mt.id, dIdx, item.id, { teacherId: e.target.value })}>{fullTimeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                              </div>
                                              <button onClick={() => removeMasterAdminItem(mt.id, dIdx, item.id)} className="text-rose-300">×</button>
                                          </div>
                                          <div className="text-slate-500 font-bold">{item.startTime} 〜 {item.endTime}</div>
                                          {(item.type === AdminItemType.BUSINESS_TRIP || item.type === AdminItemType.EXEMPTION) && item.location && (
                                              <div className="font-black text-slate-700 truncate">{item.location}</div>
                                          )}
                                      </div>
                                  ))}
                                </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <header className="bg-indigo-950 text-white px-6 h-14 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3"><h1 className="text-lg font-black tracking-tighter">徳島医療福祉専門学校</h1></div>
          <nav className="flex space-x-1 ml-4">{[{id: 'schedule', label: '週間スケジュール'},{id: 'teacher', label: '教員別照会'},{id: 'master_list', label: 'マスタ管理'},{id: 'db', label: 'データ管理'}].map(v => (<button key={v.id} onClick={() => setCurrentView(v.id as any)} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${currentView === v.id ? 'bg-indigo-600 shadow-lg' : 'text-indigo-300 hover:bg-white/10'}`}>{v.label}</button>))}</nav>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-2">
        {currentView === 'schedule' && (
          <div className="flex gap-4">
            {/* メインスケジュール */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-4">
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                  {Object.values(YearLevel).map(year => (<button key={year} onClick={() => setActiveYear(year)} className={`px-5 py-1 rounded-md text-base font-black transition-all ${activeYear === year ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{year}</button>))}
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => navigateWeek(-1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg></button>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{formatDateJapanese(currentWeekStart)}の週</h2>
                  <button onClick={() => navigateWeek(1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowApplyModal(true)} className="px-5 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-black shadow-lg hover:bg-indigo-700 transition-all">マスタ貼付</button>
                  <button onClick={() => setCreateModal({isOpen: true, mode: 'current', name: ''})} className="px-5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-black hover:bg-slate-50 transition-all">マスタ保存</button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                <div className="min-w-[1200px] grid grid-cols-8 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
                  <div className="p-3"></div>
                  {['1限', '2限', '3限', '4限', '5限'].map((label, i) => (<div key={i} className="p-2 text-center bg-slate-50/80"><span className="font-black text-indigo-500 text-xl">{label}</span><div className="text-[12px] text-slate-400 font-bold">{PERIOD_TIME_LABELS[i]}</div></div>))}
                  <div className="col-span-2 p-2 text-center font-black text-rose-400 text-sm uppercase tracking-widest">勤怠 / 補助管理</div>
                </div>
                {weekDates.map(date => {
                  const yearSched = schedules[activeYear]?.[date] || Array(5).fill(null);
                  const dayAdmin = adminSchedules[date] || [];
                  const delayedStarts = dayAdmin.filter(it => it.type === AdminItemType.DELAYED_START);
                  
                  return (
                    <div key={date} className="min-w-[1200px] grid grid-cols-8 divide-x divide-slate-100 border-b border-slate-100">
                      <div className="p-2 flex flex-col items-center justify-center font-black text-slate-800 bg-slate-50/30">
                        <span className="text-2xl">{formatDateJapanese(date)}</span>
                        {delayedStarts.length > 0 && (<span className="mt-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200 font-black">遅出あり</span>)}
                      </div>
                      {yearSched.map((sid, pIdx) => {
                        const subject = subjects.find(s => s.id === sid);
                        const assistants = dayAdmin.filter(a => a.type === AdminItemType.ASSISTANT && a.periodIndex === pIdx && a.yearLevel === activeYear);
                        const primaryTeacher = subject ? teachers.find(t => t.id === subject.teacherIds[0])?.name : null;
                        const count = sid ? subjectStats[sid] || 0 : 0;

                        return (
                          <div key={pIdx} className="p-1 min-h-[140px]">
                            <div className={`h-full rounded-xl p-3 border-2 flex flex-col justify-between transition-all duration-300 ${subject ? `${subject.color} border-transparent shadow-sm` : 'border-dashed border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
                              <div className="flex flex-col flex-1 justify-center gap-1">
                                <select className="w-full bg-transparent border-none text-xl font-black p-0 appearance-none text-slate-800 cursor-pointer outline-none text-center" value={sid || ""} onChange={(e) => handleSubjectChange(date, pIdx, e.target.value)}>
                                  <option value="">-- 未設定 --</option>
                                  {yearSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {subject && <div className="text-[14px] font-black text-slate-500 text-center opacity-80">{primaryTeacher}</div>}
                              </div>
                              {subject && (
                                <div className="mt-1 space-y-1">
                                  {assistants.map(a => (
                                    <div key={a.id} className="bg-violet-100/50 text-violet-800 border-violet-200 text-[12px] p-1 rounded flex items-center justify-between border shadow-sm font-black">
                                      <select className="bg-transparent border-none p-0 outline-none text-center flex-1" value={a.teacherId} onChange={(e) => updateAdminItem(date, a.id, { teacherId: e.target.value })}>
                                        {sortedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                      <button onClick={() => removeAdminItem(date, a.id)} className="px-1 text-xs">×</button>
                                    </div>
                                  ))}
                                  <div className={`text-[11px] font-black px-2 py-0.5 rounded-full text-center ${count >= subject.requiredCount ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white opacity-40'}`}>
                                    {count} / {subject.requiredCount} 回
                                  </div>
                                  <button onClick={() => addAdminItem(date, AdminItemType.ASSISTANT, { periodIndex: pIdx, yearLevel: activeYear })} className="text-[11px] text-indigo-500 font-black hover:underline">+ 補助教員</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="col-span-2 p-2 space-y-3">
                        {/* 遅出 - 横並び表示 */}
                        <div>
                          <div className="flex justify-between items-center mb-1"><span className="text-[11px] font-black text-blue-500 uppercase">遅出</span><button onClick={() => addAdminItem(date, AdminItemType.DELAYED_START)} className="text-blue-500 font-black text-2xl leading-none">+</button></div>
                          <div className="flex flex-wrap gap-1">
                            {delayedStarts.map(item => (
                              <div key={item.id} className="flex gap-1 bg-blue-50 px-2 py-1 rounded-full text-[12px] border border-blue-100 shadow-sm font-black items-center">
                                <select className="bg-transparent border-none p-0 outline-none text-center appearance-none" value={item.teacherId} onChange={(e) => updateAdminItem(date, item.id, { teacherId: e.target.value })}>{fullTimeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                <button onClick={() => removeAdminItem(date, item.id)} className="text-blue-300 hover:text-blue-500 transition-colors">×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* 出張・休暇等 - 3行表示 */}
                        <div className="border-t border-slate-100 pt-2">
                          <div className="flex justify-between items-center mb-1"><span className="text-[11px] font-black text-rose-500 uppercase">出張/休暇/職免</span><button onClick={() => addAdminItem(date, AdminItemType.BUSINESS_TRIP)} className="text-rose-500 font-black text-2xl leading-none">+</button></div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {dayAdmin.filter(i => [AdminItemType.BUSINESS_TRIP, AdminItemType.LEAVE, AdminItemType.EXEMPTION].includes(i.type)).map(item => {
                              const tr = teachers.find(tt => tt.id === item.teacherId);
                              return (
                                <div key={item.id} className="bg-rose-50 border-rose-100 p-2 rounded-xl border space-y-1 shadow-sm transition-all hover:shadow-md">
                                  {/* 1行目: 種別と氏名 */}
                                  <div className="flex justify-between items-center border-b border-rose-100/50 pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <select className="font-black bg-rose-200 px-1.5 py-0.5 rounded text-rose-900 border-none outline-none text-[10px]" value={item.type} onChange={(e) => updateAdminItem(date, item.id, { type: e.target.value as AdminItemType })}>
                                          <option value={AdminItemType.BUSINESS_TRIP}>出張</option>
                                          <option value={AdminItemType.LEAVE}>休暇</option>
                                          <option value={AdminItemType.EXEMPTION}>職免</option>
                                      </select>
                                      <select className="font-black bg-transparent border-none p-0 outline-none text-slate-800 text-[13px]" value={item.teacherId} onChange={(e) => updateAdminItem(date, item.id, { teacherId: e.target.value })}>{fullTimeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                    </div>
                                    <button onClick={() => removeAdminItem(date, item.id)} className="text-rose-400">×</button>
                                  </div>
                                  {/* 2行目: 時間 */}
                                  <div className="flex gap-1 items-center font-bold text-slate-500 text-[11px] px-1">
                                    <input type="time" className="bg-transparent border-none outline-none" value={item.startTime} onChange={(e) => updateAdminItem(date, item.id, { startTime: e.target.value })} />
                                    <span>〜</span>
                                    <input type="time" className="bg-transparent border-none outline-none" value={item.endTime} onChange={(e) => updateAdminItem(date, item.id, { endTime: e.target.value })} />
                                  </div>
                                  {/* 3行目: 訪問先 */}
                                  {(item.type === AdminItemType.BUSINESS_TRIP || item.type === AdminItemType.EXEMPTION) && (
                                    <div className="px-1 pt-0.5 border-t border-rose-100/30">
                                      <input className="w-full bg-white/50 border-none rounded px-1.5 py-0.5 outline-none text-[12px] font-black text-slate-700 placeholder:text-rose-300" placeholder="訪問先を入力" value={item.location || ''} onChange={(e) => updateAdminItem(date, item.id, { location: e.target.value })} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 科目進捗ウィジェット (サイドバー) */}
            <div className="w-[300px] bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit sticky top-16">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="font-black text-slate-800">{activeYear} 科目進捗</h3>
              </div>
              <div className="space-y-2.5 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
                {yearSubjects.length > 0 ? (
                  yearSubjects.map(s => {
                    const count = subjectStats[s.id] || 0;
                    const progress = Math.min(100, (count / s.requiredCount) * 100);
                    const isCompleted = count >= s.requiredCount;
                    return (
                      <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-black text-slate-700 text-[13px] leading-tight flex-1 pr-2">{s.name}</span>
                          {isCompleted && <span className="text-emerald-500 text-sm">✓</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className={`text-[11px] font-black min-w-[50px] text-right ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {count} / {s.requiredCount}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm font-bold">科目が登録されていません</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 他のビュー (教員、マスタ管理) 以前のコードと同様 */}
        {currentView === 'teacher' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-black text-slate-400 px-2 uppercase tracking-widest">教員を選択</label>
                <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-800 min-w-[350px] outline-none text-xl" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                  <option value="">-- 教員を選択 --</option>
                  {sortedTeachers.map(t => <option key={t.id} value={t.id}>[{t.type === TeacherType.FULL_TIME ? '専任' : '外来'}] {t.name}</option>)}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-100 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg></button>
                <span className="font-black px-4 text-2xl">{formatDateJapanese(currentWeekStart)}の週</span>
                <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-100 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg></button>
              </div>
            </div>
            {selectedTeacherId ? (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative custom-scrollbar">
                <div className="grid grid-cols-6 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
                    <div className="p-6 flex items-center justify-center font-black text-slate-400 text-sm">時間軸</div>
                    {weekDates.map(date => {
                      const teacherDelayed = (adminSchedules[date] || []).some(it => it.teacherId === selectedTeacherId && it.type === AdminItemType.DELAYED_START);
                      return (
                        <div key={date} className="p-6 text-center flex flex-col items-center relative">
                          <span className="text-sm font-black text-slate-400">{safeParseDate(date).toLocaleDateString('ja-JP', { weekday: 'short' })}曜日</span>
                          <span className="text-3xl font-black text-slate-800">{formatDateJapanese(date).split('(')[0]}</span>
                          {teacherDelayed && (<div className="mt-1 px-4 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-full border border-blue-200">遅出</div>)}
                        </div>
                      );
                    })}
                </div>
                <div className="flex divide-x divide-slate-100 relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT + 'px' }}>
                    <div className="w-[16.666%] bg-slate-50/30 relative">
                      {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                        <div key={i} className="absolute w-full border-t border-slate-100" style={{ top: i * HOUR_HEIGHT + 'px' }}><span className="text-sm font-black text-slate-400 px-2">{START_HOUR + i}:00</span></div>
                      ))}
                    </div>
                    {weekDates.map(date => (
                      <div key={date} className="w-[16.666%] relative">
                        {teacherWeeklyData?.[date]?.map((item, idx) => (
                          <div key={idx} className={`absolute inset-x-2 rounded-xl p-4 border shadow-sm flex flex-col justify-center ${item.color}`} style={{ top: item.top + 'px', height: item.height + 'px' }}>
                            <div className="text-lg font-black leading-tight text-center">{item.label}</div>
                            <div className="text-sm font-bold opacity-70 truncate text-center mt-1">{item.subLabel}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            ) : (<div className="bg-white py-32 rounded-2xl border-2 border-dashed border-slate-100 text-center"><p className="text-slate-400 font-black text-xl">教員を選択してください。</p></div>)}
          </div>
        )}

        {currentView === 'master_list' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-2xl shadow-lg border border-slate-200 gap-6">
              <div><h2 className="text-2xl font-black text-slate-800">マスタテンプレート管理</h2><p className="text-base text-slate-400 font-bold">保存済みの時間割パターンを編集・削除できます。</p></div>
              <div className="flex gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {Object.values(YearLevel).map(y => <button key={y} onClick={() => setActiveYear(y)} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeYear === y ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>{y}</button>)}
                </div>
                <button onClick={() => setCreateModal({isOpen: true, mode: 'empty', name: ''})} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-black shadow hover:bg-indigo-700 flex items-center gap-2 transition-all">新規作成</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masterTemplates.filter(mt => mt.yearLevel === activeYear).map(mt => (
                <div key={mt.id} onClick={() => setEditingMasterId(mt.id)} className="bg-white p-8 rounded-2xl border border-slate-200 shadow hover:shadow-2xl transition-all group cursor-pointer h-[240px] flex flex-col justify-between">
                  <div>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-black uppercase tracking-widest">{mt.yearLevel}</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-2 group-hover:text-indigo-600">{mt.name}</h3>
                  </div>
                  <div className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-xl text-sm font-black text-center group-hover:bg-indigo-600 group-hover:text-white transition-all">詳細を編集</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'db' && (
          <div className="grid grid-cols-12 gap-6 pb-20">
            {/* 教員管理 */}
            <section className="col-span-12 lg:col-span-4 space-y-4">
              <h2 className="text-xl font-black text-slate-800">教員データベース</h2>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="space-y-3 mb-6">
                  {teachers.map(t => (
                    <div key={t.id} className="bg-slate-50 p-2.5 rounded-xl border border-transparent hover:border-indigo-100 transition-all">
                      <input className="bg-white border border-slate-200 rounded-lg w-full font-black text-lg px-4 py-2 shadow-sm outline-none" value={t.name} onChange={(e) => setTeachers(prev => prev.map(it => it.id === t.id ? {...it, name: e.target.value} : it))} />
                      <div className="flex gap-1 mt-2 p-0.5 bg-white rounded shadow-inner">
                        <button onClick={() => setTeachers(prev => prev.map(it => it.id === t.id ? {...it, type: TeacherType.FULL_TIME} : it))} className={`flex-1 py-1.5 rounded text-sm font-black ${t.type === TeacherType.FULL_TIME ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'}`}>専任</button>
                        <button onClick={() => setTeachers(prev => prev.map(it => it.id === t.id ? {...it, type: TeacherType.GUEST} : it))} className={`flex-1 py-1.5 rounded text-sm font-black ${t.type === TeacherType.GUEST ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'}`}>外来</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setTeachers(prev => [...prev, { id: 't-'+Date.now(), name: '新教員', type: TeacherType.FULL_TIME }])} className="w-full bg-indigo-600 text-white py-4 rounded-xl text-sm font-black shadow hover:bg-indigo-700 transition-all">+ 教員追加</button>
              </div>
            </section>
            {/* 科目管理 */}
            <section className="col-span-12 lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-800">科目データベース</h2><div className="flex bg-slate-200/50 p-1 rounded-lg">{Object.values(YearLevel).map(year => <button key={year} onClick={() => setActiveYear(year)} className={`px-5 py-1.5 rounded-md text-sm font-black transition-all ${activeYear === year ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>{year}</button>)}</div></div>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="p-4 text-sm font-black text-slate-400 w-1/4">科目名</th><th className="p-4 text-sm font-black text-slate-400 w-32 text-center">回数 (実/規)</th><th className="p-4 text-sm font-black text-slate-400">担当教員設定</th><th className="p-4 text-sm font-black text-slate-400 text-right w-20">操作</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {yearSubjects.map(s => {
                      const currentCount = subjectStats[s.id] || 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-4"><input className="font-black border-none w-full bg-transparent outline-none text-xl" value={s.name} onChange={(e) => setSubjects(prev => prev.map(it => it.id === s.id ? {...it, name: e.target.value} : it))} /></td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-1 border border-slate-100">
                              <span className="font-black text-indigo-600 text-lg w-8 text-center">{currentCount}</span>
                              <span className="text-slate-300 font-bold">/</span>
                              <input type="number" className="font-black bg-white border border-slate-200 rounded px-2 py-1 w-16 text-center text-lg shadow-sm focus:border-indigo-500 outline-none" value={s.requiredCount} onChange={(e) => setSubjects(prev => prev.map(it => it.id === s.id ? {...it, requiredCount: parseInt(e.target.value) || 0} : it))} />
                            </div>
                          </td>
                          <td className="p-4">
                            {/* 教員選択ドロップダウン (主教員設定) */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">主教員:</span>
                                <select 
                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 font-black text-sm shadow-sm outline-none focus:border-indigo-500"
                                  value={s.teacherIds[0] || ""}
                                  onChange={(e) => {
                                    const nextId = e.target.value;
                                    setSubjects(prev => prev.map(it => {
                                      if (it.id !== s.id) return it;
                                      const otherIds = it.teacherIds.slice(1);
                                      return { ...it, teacherIds: nextId ? [nextId, ...otherIds] : otherIds };
                                    }));
                                  }}
                                >
                                  <option value="">-- 未選択 --</option>
                                  {sortedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                              </div>
                              {/* 複数教員の場合の管理エリア (任意) */}
                              <div className="flex flex-wrap gap-1">
                                {s.teacherIds.slice(1).map(tid => (
                                  <div key={tid} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[11px] font-black flex items-center gap-1 border border-indigo-100">
                                    {teachers.find(t => t.id === tid)?.name}
                                    <button onClick={() => toggleTeacherForSubject(s.id, tid)} className="hover:text-rose-500">×</button>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => {
                                    const tid = prompt("教員名で追加する場合は一覧から選んでください (本実装ではリスト追加を簡略化)");
                                    // 実際のUIではここに追加用ドロップダウンなどを置く
                                  }}
                                  className="text-[10px] font-black text-indigo-400 hover:underline"
                                >
                                  + 複数担当
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right"><button onClick={() => setSubjects(prev => prev.filter(it => it.id !== s.id))} className="text-rose-500 font-black text-sm hover:underline">削除</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setSubjects(prev => [...prev, { id: 's-'+Date.now(), name: '新科目', category: SubjectCategory.PROF, requiredHours: 30, requiredCount: 15, targetYear: activeYear, color: CATEGORY_COLORS[SubjectCategory.PROF], teacherIds: [] }])} className="w-full bg-white border-2 border-dashed border-slate-200 text-slate-400 py-4 rounded-xl text-lg font-black hover:border-indigo-300 hover:text-indigo-400 transition-all">+ 新規科目追加</button>
            </section>
          </div>
        )}

        {/* モーダル類 */}
        {createModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 bg-indigo-950 text-white"><h3 className="text-xl font-black">マスタ保存</h3></div>
              <div className="p-6 space-y-4">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-lg" placeholder="マスタ名を入力" value={createModal.name} onChange={(e) => setCreateModal({...createModal, name: e.target.value})} />
                <div className="flex gap-2">
                  <button onClick={() => setCreateModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black">戻る</button>
                  <button onClick={handleCreateMaster} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black">保存する</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showApplyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="p-6 bg-indigo-950 text-white flex justify-between items-center"><h3 className="text-xl font-black">マスタ適用</h3><button onClick={() => setShowApplyModal(false)} className="text-2xl">×</button></div>
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {masterTemplates.filter(mt => mt.yearLevel === activeYear).map(mt => (
                  <button key={mt.id} onClick={() => applyMaster(mt)} className="w-full p-6 rounded-2xl bg-slate-50 border border-transparent hover:border-indigo-600 hover:bg-white text-left font-black transition-all flex justify-between items-center">
                    <span className="text-lg">{mt.name}</span><div className="bg-indigo-600 text-white px-4 py-1 rounded text-xs">適用</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8"><WordPressExport subjects={subjects} stats={subjectStats} teachers={teachers} schedules={schedules as any} adminSchedules={adminSchedules} /></div>
      </main>
    </div>
  );
};

export default App;
