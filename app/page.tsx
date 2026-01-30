
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기값 로드
  const [foundingYear, setFoundingYear] = useState(searchParams.get('foundingYear') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');

  // 생년월 파싱 (YYYY-MM -> YYYY, MM)
  const initialBirthMonth = searchParams.get('birthMonth') || '';
  const [initialBirthYear, initialBirthMonthVal] = initialBirthMonth.split('-');
  const [birthYearInput, setBirthYearInput] = useState(initialBirthYear || '');
  const [birthMonthSelect, setBirthMonthSelect] = useState(initialBirthMonthVal ? parseInt(initialBirthMonthVal).toString() : '');

  const [industry, setIndustry] = useState(searchParams.get('industry') || '');

  // 결과 상태
  const [results, setResults] = useState<MatchingProgram[]>([]);
  const [loading, setLoading] = useState(false);

  // 크롤링 상태
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string | null>(null);

  const monthRef = useRef<HTMLSelectElement>(null);

  // Debounce 타이머 Ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 데이터 조회 함수
  const fetchResults = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    try {
      // 파라미터가 없어도 호출 (전체 리스트 반환)
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

  // 초기 로드 및 URL 변경 감지
  useEffect(() => {
    fetchResults(searchParams);
  }, [searchParams, fetchResults]);

  // 입력 변경 핸들러 (Debounce 적용)
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
        // 연도만 있으면 1월로 가정하거나 처리 (여기서는 일단 보냄)
        params.set('birthMonth', `${birthYearInput}-01`);
      }

      if (industry) params.set('industry', industry);

      // URL 업데이트 (히스토리 스택 유지하지 않으려면 replace)
      router.replace(`/?${params.toString()}`);
    }, 500); // 0.5초 지연
  }, [foundingYear, region, birthYearInput, birthMonthSelect, industry, router]);

  // 입력값 변경 시 URL 업데이트 트리거
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    // 날짜 포맷 간단히
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
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

  // 크롤링 실행 핸들러
  const handleCrawl = async () => {
    if (!confirm('최신 데이터를 수집하시겠습니까? (시간이 소요될 수 있습니다)')) return;

    setCrawling(true);
    setCrawlStatus('크롤링 중...');

    try {
      const params = new URLSearchParams();
      params.set('maxPages', '5'); // 성능을 위해 5페이지로 제한
      params.set('fetchDetails', 'true');

      const response = await fetch(`/api/crawl?${params}`);
      const data = await response.json();

      if (data.success) {
        setCrawlStatus('✅ 완료!');
        // 현재 검색 조건으로 데이터 새로고침
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-zinc-100">
      {/* 헤더 */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white cursor-pointer" onClick={() => router.push('/')}>
              파인드덱 <span className="text-blue-400 font-normal text-sm ml-1">Beta</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {crawlStatus && (
              <span className="text-xs text-zinc-400 animate-pulse">{crawlStatus}</span>
            )}
            <button
              onClick={handleCrawl}
              disabled={crawling}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
              title="최신 데이터 수집 (관리자용)"
            >
              {crawling ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              데이터 업데이트
            </button>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 입력 폼 */}
        <div className="bg-zinc-800/50 rounded-2xl p-6 mb-8 border border-zinc-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">맞춤 검색 조건</h2>
            {/* 리셋 버튼 (선택 사항) */}
            <button
              onClick={() => {
                setFoundingYear('');
                setRegion('');
                setBirthYearInput('');
                setBirthMonthSelect('');
                setIndustry('');
                router.replace('/'); // URL 리셋
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              초기화
            </button>
          </div>

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
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                  className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <select
                  ref={monthRef}
                  value={birthMonthSelect}
                  onChange={(e) => setBirthMonthSelect(e.target.value)}
                  className="w-24 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
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
        </div>

        {/* 결과 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              지원사업 목록 <span className="text-blue-400 font-normal">({results.length}건)</span>
            </h2>
            {loading && <span className="text-sm text-zinc-500">업데이트 중...</span>}
          </div>

          {loading && results.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              데이터를 불러오는 중입니다...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
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
      </main>

      {/* 푸터 */}
      <footer className="border-t border-zinc-800/50 mt-12 mb-8">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-sm text-zinc-600">
          FindDeck Beta © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-zinc-500">
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
