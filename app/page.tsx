'use client';

import { useState, FormEvent, useRef } from 'react';
import Link from 'next/link';

interface MatchingProgram {
  id: string;
  title: string;
  organization: string | null;
  applicationEnd: string | null;
  url: string;
  companyAge: string | null;
  targetRegion: string | null;
  targetAge: string | null;
  targetIndustry: string | null;
  supportField: string | null;
  fundingAmount: string | null;
}

interface MatchResult {
  success: boolean;
  data: MatchingProgram[];
  total: number;
}

export default function Home() {
  const [foundingYear, setFoundingYear] = useState('');
  const [region, setRegion] = useState('');
  const [birthYearInput, setBirthYearInput] = useState('');
  const [birthMonthSelect, setBirthMonthSelect] = useState('');
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState<MatchingProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const monthRef = useRef<HTMLSelectElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (foundingYear) params.set('foundingYear', foundingYear);
      if (region) params.set('region', region);

      if (birthYearInput && birthMonthSelect) {
        // YYYY-MM 형식 조합
        params.set('birthMonth', `${birthYearInput}-${birthMonthSelect.padStart(2, '0')}`);
      } else if (birthYearInput) {
        // 연도만 있는 경우 1월로 기본값 처리하거나 API에서 처리 (여기선 일단 보냄)
        params.set('birthMonth', `${birthYearInput}-01`);
      }

      if (industry) params.set('industry', industry);

      const response = await fetch(`/api/match?${params}`);
      const data: MatchResult = await response.json();

      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('매칭 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 4); // 4자리 제한
    setBirthYearInput(val);

    if (val.length === 4 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDday = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(dateStr);
    endDate.setHours(0, 0, 0, 0);

    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return '마감';
    if (diff === 0) return 'D-Day';
    return `D-${diff}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-zinc-100">
      {/* 헤더 */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <h1 className="text-2xl font-bold text-white">
            파인드덱 <span className="text-blue-400 font-normal text-base ml-2">지원사업 매칭</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">회사 정보를 입력하면 맞춤형 지원사업을 찾아드립니다</p>
        </div>
      </header>

      {/* 메인 */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="bg-zinc-800/50 rounded-2xl p-6 mb-8 border border-zinc-700/50">
          <h2 className="text-lg font-semibold text-white mb-6">회사 정보 입력</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 설립연도 */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                회사 설립연도
              </label>
              <input
                type="number"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                placeholder="예: 2022"
                min="1900"
                max={new Date().getFullYear()}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 회사 지역 */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                회사 소재지
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">전국 (전체)</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
                <option value="인천">인천</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="광주">광주</option>
                <option value="대전">대전</option>
                <option value="울산">울산</option>
                <option value="세종">세종</option>
                <option value="강원">강원</option>
                <option value="충북">충북</option>
                <option value="충남">충남</option>
                <option value="전북">전북</option>
                <option value="전남">전남</option>
                <option value="경북">경북</option>
                <option value="경남">경남</option>
                <option value="제주">제주</option>
              </select>
            </div>

            {/* 대표자 생년월 */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                대표자 생년월
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={birthYearInput}
                  onChange={handleBirthYearChange}
                  placeholder="년도 (4자리)"
                  className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  ref={monthRef}
                  value={birthMonthSelect}
                  onChange={(e) => setBirthMonthSelect(e.target.value)}
                  className="w-24 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m.toString()}>
                      {m}월
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 업종 */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                회사 업종
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">전분야 (전체)</option>
                <option value="SW">SW / IT</option>
                <option value="제조">제조업</option>
                <option value="바이오">바이오 / 헬스케어</option>
                <option value="콘텐츠">콘텐츠 / 미디어</option>
                <option value="유통">유통 / 물류</option>
                <option value="관광">관광 / 서비스</option>
                <option value="에너지">에너지 / 환경</option>
                <option value="농업">농업 / 식품</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '매칭 중...' : '🔍 맞춤 지원사업 찾기'}
          </button>
        </form>

        {/* 결과 */}
        {searched && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                매칭 결과 <span className="text-blue-400 font-normal">({results.length}건)</span>
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                매칭 중...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                조건에 맞는 지원사업이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((program) => {
                  const dday = getDday(program.applicationEnd);
                  return (
                    <Link
                      key={program.id}
                      href={`/programs/${program.id}`}
                      className="block bg-zinc-800/50 rounded-xl p-5 border border-zinc-700/50 hover:border-blue-500/50 hover:bg-zinc-800 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {program.title}
                          </h3>
                          <p className="text-sm text-zinc-400 mt-1">
                            {program.organization || '기관 정보 없음'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {program.companyAge && (
                              <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2.5 py-1 text-xs text-purple-300">
                                업력: {program.companyAge}
                              </span>
                            )}
                            {program.targetRegion && (
                              <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-1 text-xs text-green-300">
                                지역: {program.targetRegion}
                              </span>
                            )}
                            {program.targetAge && (
                              <span className="inline-flex items-center rounded-full bg-orange-500/20 px-2.5 py-1 text-xs text-orange-300">
                                연령: {program.targetAge}
                              </span>
                            )}
                            {program.supportField && (
                              <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-300">
                                분야: {program.supportField}
                              </span>
                            )}
                            {program.fundingAmount && (
                              <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-300">
                                금액: {program.fundingAmount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {dday && (
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${dday === 'D-Day' || parseInt(dday.replace('D-', '')) <= 7
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                              }`}>
                              {dday}
                            </span>
                          )}
                          <p className="text-xs text-zinc-500 mt-2">
                            마감: {formatDate(program.applicationEnd)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-zinc-800/50 mt-12">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-sm text-zinc-500">
          <a href="/admin" className="hover:text-zinc-300 transition-colors">관리자</a>
        </div>
      </footer>
    </div>
  );
}
