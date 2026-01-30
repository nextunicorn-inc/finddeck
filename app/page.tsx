
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CalendarView from '../components/calendar/CalendarView';

interface MatchingProgram {
  id: string;
  title: string;
  organization: string | null;
  applicationStart: string | null;
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

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기값 로드
  const [foundingYear, setFoundingYear] = useState(searchParams.get('foundingYear') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');

  const initialBirthMonth = searchParams.get('birthMonth') || '';
  const [initialBirthYear, initialBirthMonthVal] = initialBirthMonth.split('-');
  const [birthYearInput, setBirthYearInput] = useState(initialBirthYear || '');
  const [birthMonthSelect, setBirthMonthSelect] = useState(initialBirthMonthVal ? parseInt(initialBirthMonthVal).toString() : '');

  const [industry, setIndustry] = useState(searchParams.get('industry') || '');

  const [results, setResults] = useState<MatchingProgram[]>([]);
  const [loading, setLoading] = useState(false);

  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string | null>(null);

  const monthRef = useRef<HTMLSelectElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/match?${params.toString()}`);
      const data: MatchResult = await response.json();

      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('매칭 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(searchParams);
  }, [searchParams, fetchResults]);

  const updateUrlParams = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (foundingYear) params.set('foundingYear', foundingYear);
      if (region) params.set('region', region);

      if (birthYearInput && birthMonthSelect) {
        params.set('birthMonth', `${birthYearInput}-${birthMonthSelect.padStart(2, '0')}`);
      } else if (birthYearInput) {
        params.set('birthMonth', `${birthYearInput}-01`);
      }

      if (industry) params.set('industry', industry);

      router.replace(`/?${params.toString()}`);
    }, 500);
  }, [foundingYear, region, birthYearInput, birthMonthSelect, industry, router]);

  useEffect(() => {
    updateUrlParams();
  }, [foundingYear, region, birthYearInput, birthMonthSelect, industry, updateUrlParams]);

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 4);
    setBirthYearInput(val);
    if (val.length === 4 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleCrawl = async () => {
    if (!confirm('최신 데이터를 수집하시겠습니까? (시간이 소요될 수 있습니다)')) return;

    setCrawling(true);
    setCrawlStatus('크롤링 중...');

    try {
      const params = new URLSearchParams();
      params.set('maxPages', '3'); // 가볍게 3페이지만
      params.set('fetchDetails', 'true');

      const response = await fetch(`/api/crawl?${params}`);
      const data = await response.json();

      if (data.success) {
        setCrawlStatus('✅ 완료!');
        fetchResults(searchParams);
      } else {
        setCrawlStatus('❌ 실패');
      }
    } catch (error) {
      console.error('크롤링 실패:', error);
      setCrawlStatus('❌ 오류');
    } finally {
      setCrawling(false);
      setTimeout(() => setCrawlStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* 헤더 & 필터 바 (Sticky) */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="mx-auto max-w-[1400px] px-6">
          {/* Top Row: Logo & Actions */}
          <div className="h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white cursor-pointer select-none" onClick={() => router.push('/')}>
              FindDeck <span className="text-blue-400 font-normal text-sm ml-1">Beta</span>
            </h1>

            <div className="flex items-center gap-4">
              {crawlStatus && (
                <span className="text-xs text-zinc-400 animate-pulse">{crawlStatus}</span>
              )}
              <button
                onClick={handleCrawl}
                disabled={crawling}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
              >
                {crawling ? (
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                업데이트
              </button>
            </div>
          </div>

          {/* Bottom Row: Compact Filter Toolbar */}
          <div className="h-14 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* 설립연도 */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 shrink-0">
              <span className="text-xs text-zinc-500 font-medium">설립</span>
              <input
                type="number"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                placeholder="연도(YYYY)"
                className="w-20 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>

            {/* 지역 */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 shrink-0">
              <span className="text-xs text-zinc-500 font-medium">지역</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none appearance-none pr-4 cursor-pointer"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">전국</option>
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

            {/* 대표자 나이 */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 shrink-0">
              <span className="text-xs text-zinc-500 font-medium">대표자</span>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={birthYearInput}
                  onChange={handleBirthYearChange}
                  placeholder="YYYY"
                  className="w-10 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none text-center"
                />
                <span className="text-zinc-600">.</span>
                <select
                  ref={monthRef}
                  value={birthMonthSelect}
                  onChange={(e) => setBirthMonthSelect(e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none appearance-none cursor-pointer w-8"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m.toString()}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 업종 */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 shrink-0">
              <span className="text-xs text-zinc-500 font-medium">업종</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none appearance-none pr-4 cursor-pointer min-w-[80px]"
              >
                <option value="">전체 (All)</option>
                <option value="SW">SW / IT</option>
                <option value="제조">제조업</option>
                <option value="바이오">바이오 / 헬스</option>
                <option value="콘텐츠">콘텐츠 / 미디어</option>
                <option value="유통">유통 / 물류</option>
                <option value="관광">관광 / 서비스</option>
                <option value="에너지">에너지 / 환경</option>
                <option value="농업">농업 / 식품</option>
              </select>
            </div>

            {/* 초기화 버튼 */}
            {(foundingYear || region || birthYearInput || industry) && (
              <button
                onClick={() => {
                  setFoundingYear('');
                  setRegion('');
                  setBirthYearInput('');
                  setBirthMonthSelect('');
                  setIndustry('');
                  router.replace('/');
                }}
                className="text-xs text-zinc-500 hover:text-red-400 px-2 transition-colors ml-auto"
              >
                초기화
              </button>
            )}

            <div className="ml-auto text-xs text-zinc-500 hidden md:block">
              {loading ? '검색중...' : `${results.length}건 검색됨`}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 캘린더 영역 */}
      <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 py-6 overflow-hidden flex flex-col">
        {loading && results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            Loading Calendar...
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <CalendarView programs={results} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div>로딩 중...</div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
