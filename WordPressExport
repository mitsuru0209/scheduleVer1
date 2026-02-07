
import React, { useState } from 'react';
import { Subject, YearLevel, Teacher, DailySchedule, AdminItem, AdminItemType } from '../types';

interface WordPressExportProps {
  subjects: Subject[];
  stats: Record<string, number>;
  teachers: Teacher[];
  schedules: Record<YearLevel, Record<string, DailySchedule>>;
  adminSchedules: Record<string, AdminItem[]>;
}

type ExportMode = 'weekly' | 'curriculum';

const WordPressExport: React.FC<WordPressExportProps> = ({ subjects, stats, teachers, schedules, adminSchedules }) => {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<ExportMode>('weekly');

  const styles = {
    container: "font-family: 'Noto Sans JP', sans-serif; color: #334155; max-width: 100%; margin: 20px auto; padding: 10px;",
    h2: "color: #1e1b4b; border-left: 8px solid #4f46e5; padding: 10px 0 10px 20px; margin: 30px 0 20px; font-size: 28px; font-weight: 900;",
    h3: "background: #1e1b4b; color: #ffffff; padding: 12px 20px; border-radius: 8px; margin: 25px 0 15px; font-size: 22px; font-weight: 800;",
    h4: "color: #475569; font-size: 19px; margin: 20px 0 10px; font-weight: 800; display: flex; align-items: center;",
    badge: "background: #4f46e5; color: #fff; padding: 2px 8px; border-radius: 4px; margin-right: 10px; font-size: 11px; font-weight: 900;",
    table: "width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 2px solid #cbd5e1; table-layout: fixed; font-size: 14px;",
    th: "background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 12px 5px; text-align: center; font-weight: 800; font-size: 16px;",
    td: "border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle;",
    subject: "font-weight: 900; color: #0f172a; font-size: 20px; margin: 5px 0; line-height: 1.2; text-align: center;",
    cat: "font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 2px; text-align: center;",
    teacher: "font-size: 12px; color: #64748b; font-weight: 700; text-align: center;",
    assistants: "font-size: 11px; color: #7c3aed; font-weight: 800; margin-top: 5px; border-top: 1px dashed #ddd6fe; padding-top: 3px; text-align: center;",
    counter: "font-size: 10px; font-weight: 900; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 10px; margin-top: 4px; display: inline-block;",
    adminWrapper: "margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;",
    adminTag: "display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 900; margin-right: 4px; border: 1px solid;",
    adminMeta: "display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-top: 2px; text-align: center;",
    adminTitle: "display: block; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 5px 0; border-bottom: 1px solid #f1f5f9; text-align: left;"
  };

  const generateWeeklyHtml = () => {
    let html = `<div style="${styles.container}">\n`;
    html += `<h2 style="${styles.h2}">週間スケジュール</h2>\n`;

    Object.values(YearLevel).forEach(year => {
      const yearSched = schedules[year] || {};
      const dates = Object.keys(yearSched).filter(d => yearSched[d].some(s => s !== null)).sort();
      if (dates.length === 0) return;

      html += `<h3 style="${styles.h3}">${year}</h3>\n`;

      const weeksSet = new Set<string>();
      dates.forEach(dStr => {
        const d = new Date(dStr);
        const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
        const mon = new Date(d); mon.setDate(d.getDate() + diff);
        weeksSet.add(mon.toISOString().split('T')[0]);
      });

      Array.from(weeksSet).sort().forEach(monStr => {
        const monday = new Date(monStr);
        html += `<h4 style="${styles.h4}"><span style="${styles.badge}">WEEK</span>${monday.getFullYear()}年 ${monday.getMonth()+1}月 ${monday.getDate()}日の週</h4>\n`;
        html += `<table style="${styles.table}">\n<thead><tr><th style="${styles.th}; width:80px;">日付</th>`;
        for(let i=1; i<=5; i++) html += `<th style="${styles.th}">${i}限</th>`;
        html += `<th style="${styles.th}; width:160px;">勤怠管理</th></tr></thead><tbody>\n`;

        for(let i=0; i<5; i++) {
          const target = new Date(monday); target.setDate(monday.getDate() + i);
          const tStr = target.toISOString().split('T')[0];
          const days = ['日','月','火','水','木','金','土'];
          html += `<tr><td style="${styles.td}; background:#f8fafc; font-weight:900; font-size:16px;">${target.getMonth()+1}/${target.getDate()}<br>(${days[target.getDay()]})</td>`;
          
          const daySched = yearSched[tStr] || Array(5).fill(null);
          const allDayAdmin = adminSchedules[tStr] || [];

          daySched.forEach((sid, pIdx) => {
            const s = subjects.find(it => it.id === sid);
            const assignedTeachers = s?.teacherIds.map(tid => teachers.find(it => it.id === tid)?.name || '不明') || [];
            const periodAssistants = allDayAdmin.filter(a => a.type === AdminItemType.ASSISTANT && a.periodIndex === pIdx && a.yearLevel === year);
            if(s) {
              const count = stats[s.id] || 0;
              const color = s.category === '実習' ? '#10b981' : s.category === '専門分野' ? '#4f46e5' : '#64748b';
              html += `<td style="${styles.td}; border-top: 4px solid ${color}; background:#fafafa;">`;
              html += `<div style="${styles.cat}">${s.category}</div>`;
              html += `<div style="${styles.subject}">${s.name}</div>`;
              html += `<div style="${styles.teacher}">${assignedTeachers[0] || '-'}</div>`;
              if (periodAssistants.length > 0) {
                html += `<div style="${styles.assistants}">補: ${periodAssistants.map(a => teachers.find(tt => tt.id === a.teacherId)?.name || '不明').join(', ')}</div>`;
              }
              html += `<div style="${styles.counter}">${count} / ${s.requiredCount}回</div>`;
              html += `</td>`;
            } else { html += `<td style="${styles.td}">-</td>`; }
          });
          // 勤怠部分は変更なし
          const del = allDayAdmin.filter(it => it.type === AdminItemType.DELAYED_START);
          const oth = allDayAdmin.filter(it => ![AdminItemType.DELAYED_START, AdminItemType.ASSISTANT].includes(it.type));
          html += `<td style="${styles.td}; background:#fff; text-align:left; vertical-align:top;">`;
          if(del.length > 0) {
            html += `<span style="${styles.adminTitle}">遅出</span>`;
            del.forEach(it => {
              const tr = teachers.find(tt => tt.id === it.teacherId);
              html += `<div style="${styles.adminTag}; background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">${tr?.name || '-'}</div>`;
            });
          }
          if(oth.length > 0) {
            html += `<span style="${styles.adminTitle}">出張/休暇</span>`;
            oth.forEach(it => {
              const tr = teachers.find(tt => tt.id === it.teacherId);
              const timeStr = it.startTime ? `${it.startTime}-${it.endTime}` : (it.periodIndex !== undefined ? `${it.periodIndex + 1}限` : '終日');
              const locationStr = it.location ? ` @ ${it.location}` : '';
              html += `<div style="${styles.adminWrapper}">`;
              html += `<div style="text-align:center;"><span style="${styles.adminTag}; background:#fff1f2; border-color:#fecdd3; color:#9f1239;">${it.type}</span><span style="font-weight:900;">${tr?.name || '-'}</span></div>`;
              html += `<div style="${styles.adminMeta}">${timeStr}${locationStr}</div>`;
              html += `</div>`;
            });
          }
          html += `</td></tr>\n`;
        }
        html += `</tbody></table>\n`;
      });
    });
    html += `</div>`;
    return html;
  };

  const generateCurriculumHtml = () => {
    let html = `<div style="${styles.container}">\n<h2 style="${styles.h2}">カリキュラム進捗一覧</h2>\n`;
    Object.values(YearLevel).forEach(year => {
      const yearSubjects = subjects.filter(s => s.targetYear === year);
      if (yearSubjects.length === 0) return;
      html += `<h3 style="${styles.h3}">${year}</h3>\n<table style="${styles.table}">\n`;
      html += `<thead><tr><th style="${styles.th}">科目名</th><th style="${styles.th}">主教員</th><th style="${styles.th}">進捗</th><th style="${styles.th}">充足率</th></tr></thead><tbody>\n`;
      yearSubjects.forEach(s => {
        const assignedTeachers = s.teacherIds.map(tid => teachers.find(it => it.id === tid)?.name || '不明');
        const count = stats[s.id] || 0;
        const rate = Math.round((count / s.requiredCount) * 100);
        html += `<tr><td style="${styles.td}; font-weight:800; text-align:left; font-size:18px;">${s.name}</td><td style="${styles.td}">${assignedTeachers[0]}</td><td style="${styles.td}">${count} / ${s.requiredCount} 回</td><td style="${styles.td}">${rate}%</td></tr>\n`;
      });
      html += `</tbody></table>\n`;
    });
    html += `</div>`;
    return html;
  };

  const generateHtml = () => (mode === 'weekly' ? generateWeeklyHtml() : generateCurriculumHtml());

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl mt-6 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">WordPress 出力</h3>
            <p className="text-sm text-slate-500 font-bold">HTMLをカスタムHTMLブロックに貼り付けてください。</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setMode('weekly')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${mode === 'weekly' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>週間表</button>
            <button onClick={() => setMode('curriculum')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${mode === 'curriculum' ? 'bg-white text-indigo-600 shadow' : 'text-slate-50'}`}>進捗表</button>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">HTMLソースコード</span>
            <button onClick={copyToClipboard} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
              {copied ? 'コピー完了' : 'HTMLをコピー'}
            </button>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 overflow-hidden">
            <pre className="text-[12px] text-indigo-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">{generateHtml()}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordPressExport;
