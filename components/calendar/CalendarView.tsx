
'use client';

import { useState, useMemo } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  isValid
} from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

interface MatchingProgram {
  id: string;
  title: string;
  organization: string | null;
  applicationStart: string | null;
  applicationEnd: string | null; // ISO string
  supportField: string | null;
  fundingAmount: string | null;
  targetRegion: string | null;
  companyAge: string | null;
  targetAge: string | null;
  targetIndustry: string | null;
}

interface CalendarViewProps {
  programs: MatchingProgram[];
}

const SUPPORT_FIELD_COLORS: Record<string, string> = {
  '자금': 'bg-blue-500 text-white border-blue-600',
  '기술개발': 'bg-purple-500 text-white border-purple-600',
  '판로': 'bg-green-500 text-white border-green-600',
  '수출': 'bg-teal-500 text-white border-teal-600',
  '인력': 'bg-orange-500 text-white border-orange-600',
  '교육': 'bg-yellow-500 text-yellow-900 border-yellow-600',
  '멘토링': 'bg-pink-500 text-white border-pink-600',
  '시설/공간': 'bg-indigo-500 text-white border-indigo-600',
  '기타': 'bg-zinc-600 text-white border-zinc-700',
};

const DEFAULT_COLOR = 'bg-zinc-600 text-white border-zinc-700';

export default function CalendarView({ programs }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  // 달력 그리드 생성
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // 프로그램 매핑 (날짜별)
  // 여기서는 간단하게 "마감일" 기준으로 보여주거나, 기간이 있으면 기간 바로 보여줌
  // 복잡한 주간/월간 바 렌더링(Row 계산)은 어렵으므로,
  // 1차적으로 "해당 날짜에 걸쳐있는 사업"을 리스트업하는 방식으로 구현 (Dot or Small Bar)
  // Knowhow 레퍼런스처럼 "긴 바"를 구현하려면 주(Week) 단위로 끊어서 렌더링해야 함.

  // 이번 달에 해당하는 프로그램만 필터링하여 미리 계산
  const visiblePrograms = useMemo(() => {
    // 캘린더 표시 범위
    const calendarStart = startOfWeek(startOfMonth(currentDate));
    const calendarEnd = endOfWeek(endOfMonth(currentDate));

    return programs.filter(p => {
      if (!p.applicationEnd) return false;
      const end = parseISO(p.applicationEnd);
      if (!isValid(end)) return false;

      // 시작일이 없으면 마감일 기준으로 판별
      // 시작일이 있으면 기간이 겹치는지 판별
      if (p.applicationStart) {
        const start = parseISO(p.applicationStart);
        if (!isValid(start)) return isWithinInterval(end, { start: calendarStart, end: calendarEnd });

        // 기간 교차 체크: (StartA <= EndB) and (EndA >= StartB)
        return start <= calendarEnd && end >= calendarStart;
      } else {
        return isWithinInterval(end, { start: calendarStart, end: calendarEnd });
      }
    });
  }, [programs, currentDate]);


  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  // 요일 헤더
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">
            {format(currentDate, 'yyyy년 MM월', { locale: ko })}
          </h2>
          <div className="flex items-center bg-zinc-800 rounded-lg p-1 border border-zinc-700">
            <button onClick={prevMonth} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goToday} className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors border-x border-zinc-700 mx-1">
              오늘
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="text-sm text-zinc-400">
          <span className="font-semibold text-blue-400">{visiblePrograms.length}</span>개의 지원사업
        </div>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-800/30">
        {weekDays.map((day, i) => (
          <div key={day} className={`py-3 text-center text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-500'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 auto-rows-fr bg-zinc-900 flex-1 min-h-[600px]">
        {days.map((day, dayIdx) => {
          // 해당 날짜에 표시할 이벤트 필터링
          // 날짜만 비교 (시간은 무시)
          const daysEvents = visiblePrograms.filter(p => {
            if (!p.applicationEnd) return false;

            const endDate = parseISO(p.applicationEnd);
            if (!isValid(endDate)) return false;

            // 시작일이 있으면 기간 체크, 없으면 마감일만 체크
            if (p.applicationStart) {
              const startDate = parseISO(p.applicationStart);
              if (!isValid(startDate)) {
                // 시작일 파싱 실패 시 마감일만 체크
                return isSameDay(day, endDate);
              }

              // 날짜만 비교하기 위해 시작/종료/체크 날짜를 모두 00:00:00으로 정규화
              const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              const programStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
              const programEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

              return checkDay >= programStart && checkDay <= programEnd;
            } else {
              // 시작일 없으면 마감일만 체크
              return isSameDay(day, endDate);
            }
          });

          // 정렬: 마감일 임박순 -> 그 외 ? (일단 ID순)
          // 화면에 너무 많이 표시되면 안되므로 최대 3~4개만 표시하고 더보기 처리 필요

          const isHovered = hoveredDay && isSameDay(hoveredDay, day);
          // 팝오버 위치: 3번째 행(3주차)부터는 위로, 그 전은 아래로
          const showAbove = dayIdx >= 14; // 7x5 그리드에서 3번째 행부터 (0, 7, 14, 21, 28...)
          // 가로 위치: 일요일(0)은 왼쪽, 토요일(6)은 오른쪽, 나머지는 중앙
          const columnIdx = dayIdx % 7;
          const horizontalPosition = columnIdx === 0 ? 'left-0' : columnIdx === 6 ? 'right-0' : 'left-1/2 -translate-x-1/2';

          return (
            <div
              key={day.toString()}
              onMouseEnter={() => daysEvents.length > 0 && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`relative min-h-[120px] border-b border-r border-zinc-800 p-1 flex flex-col gap-1 transition-colors hover:bg-zinc-800/30 ${!isSameMonth(day, currentDate) ? 'bg-zinc-900/50 text-zinc-700' : 'bg-zinc-900 text-zinc-400'
                }`}
            >
              <div className={`text-right px-1 text-xs mb-1 ${isSameDay(day, new Date())
                ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center ml-auto font-bold'
                : ''
                }`}>
                {format(day, 'd')}
              </div>

              {/* 이벤트 바 (축약) */}
              <div className="flex flex-col gap-1 overflow-hidden">
                {daysEvents.slice(0, 4).map(program => {
                  const isStart = program.applicationStart ? isSameDay(parseISO(program.applicationStart), day) : isSameDay(parseISO(program.applicationEnd!), day);
                  const isEnd = program.applicationEnd ? isSameDay(parseISO(program.applicationEnd), day) : false;
                  const colorClass = SUPPORT_FIELD_COLORS[program.supportField || ''] || DEFAULT_COLOR;

                  return (
                    <Link
                      key={program.id}
                      href={`/programs/${program.id}`}
                      className="block text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-100 transition-opacity"
                    >
                      <span className={`${colorClass} px-1.5 py-0.5 rounded ${isStart ? 'rounded-l-md font-medium' : 'rounded-l-none opacity-80'
                        } ${isEnd ? 'rounded-r-md' : 'rounded-r-none'} ${!isStart && !isEnd ? 'rounded-none opacity-60' : ''
                        }`}>
                        {program.title}
                      </span>
                    </Link>
                  );
                })}
                {daysEvents.length > 4 && (
                  <div className="text-[10px] text-zinc-600 px-1">
                    + {daysEvents.length - 4}개 더보기
                  </div>
                )}
              </div>

              {/* 확대 팝오버 (셀 호버 시) */}
              {isHovered && daysEvents.length > 0 && (
                <div
                  className={`absolute ${horizontalPosition} ${showAbove ? 'bottom-full mb-2' : 'top-full mt-2'} w-[550px] max-h-[350px] overflow-y-auto bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl z-50 p-4`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                    <h3 className="text-sm font-bold text-white">
                      {format(day, 'M월 d일 (EEE)', { locale: ko })}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      {daysEvents.length}개 사업
                    </span>
                  </div>

                  {/* 프로그램 리스트 */}
                  <div className="space-y-3">
                    {daysEvents.map(program => {
                      const colorClass = SUPPORT_FIELD_COLORS[program.supportField || ''] || DEFAULT_COLOR;
                      const dday = getDday(program.applicationEnd);

                      return (
                        <Link
                          key={program.id}
                          href={`/programs/${program.id}`}
                          className="block p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-all border border-zinc-700/50 hover:border-zinc-500 group"
                        >
                          {/* 1. 제목 & D-Day */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-bold text-zinc-100 leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">
                              {program.title}
                            </h4>
                            {dday && (
                              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${dday === 'D-Day' || (dday.startsWith('D-') && parseInt(dday.slice(2)) <= 3)
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-zinc-700 text-zinc-400'
                                }`}>
                                {dday}
                              </span>
                            )}
                          </div>

                          {/* 2. 뱃지 (분야, 업종) */}
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${colorClass} bg-opacity-10 border-opacity-20`}>
                              {program.supportField || '기타'}
                            </span>
                            {program.targetIndustry && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">
                                {program.targetIndustry}
                              </span>
                            )}
                          </div>

                          {/* 3. 통합 정보 (지원금 · 지역 · 기관) - 있는 것만 표시 */}
                          <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                            {program.fundingAmount && (
                              <>
                                <span className="font-semibold text-emerald-400">{program.fundingAmount}</span>
                                <span className="w-px h-2.5 bg-zinc-700"></span>
                              </>
                            )}
                            {program.targetRegion && (
                              <>
                                <span>{program.targetRegion}</span>
                                {program.organization && <span className="w-px h-2.5 bg-zinc-700"></span>}
                              </>
                            )}
                            {program.organization && (
                              <span className="truncate">{program.organization}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDday(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(dateStr);
  endDate.setHours(0, 0, 0, 0);

  const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return '마감';
  if (diff === 0) return 'D-Day';
  return `D-${diff}`;
}
