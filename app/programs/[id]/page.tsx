import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface Props {
  params: {
    id: string;
  };
}

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params;

  const program = await prisma.supportProgram.findUnique({
    where: { id },
  });

  if (!program) {
    notFound();
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '미정 / 상시';
    return format(date, 'yyyy-MM-dd HH:mm');
  };

  const InfoRow = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={`grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4 ${className}`}>
      <dt className="font-medium text-zinc-400">{label}</dt>
      <dd className="text-zinc-100 sm:col-span-2">{value ?? '-'}</dd>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        {/* 네비게이션 */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        {/* 헤더 */}
        <div className="mb-8 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${program.source === 'k-startup'
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-green-500/20 text-green-400'
              }`}>
              {program.source === 'k-startup' ? 'K-Startup' : '기업마당'}
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
              {program.category}
            </span>
            {program.viewCount !== null && (
              <span className="text-xs text-zinc-500">
                조회 {program.viewCount.toLocaleString()}
              </span>
            )}
            {program.llmProcessed && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                AI 분석 완료
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
            {program.title}
          </h1>
          <div className="flex flex-wrap gap-4">
            <a
              href={program.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              원본 공고 보기 ↗
            </a>
          </div>
        </div>

        {/* 기본 정보 그리드 (작게) */}
        <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-zinc-500 mb-1">기관</dt>
              <dd className="text-sm text-zinc-200">{program.organization || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 mb-1">지역</dt>
              <dd className="text-sm text-zinc-200">{program.region || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 mb-1">분야</dt>
              <dd className="text-sm text-zinc-200">{program.supportField || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 mb-1">마감일</dt>
              <dd className="text-sm text-red-400 font-medium">{formatDate(program.applicationEnd)}</dd>
            </div>
          </dl>
        </div>

        {/* 메인 2단 그리드: 신청 자격 vs 제외 대상 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 신청 자격 */}
          <section className="flex flex-col h-full rounded-xl border border-blue-900/30 bg-blue-950/10">
            <div className="px-6 py-4 border-b border-blue-900/30 bg-blue-900/20 rounded-t-xl">
              <h2 className="text-lg font-bold text-blue-100 flex items-center gap-2">
                ✅ 신청 자격 및 요건
              </h2>
            </div>
            <div className="p-6 flex-1">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-blue-50 leading-relaxed">
                {program.targetDetail || program.eligibility || '상세 자격 요건 분석 중...'}
              </div>
            </div>
          </section>

          {/* 제외 대상 */}
          <section className="flex flex-col h-full rounded-xl border border-red-900/30 bg-red-950/10">
            <div className="px-6 py-4 border-b border-red-900/30 bg-red-900/20 rounded-t-xl">
              <h2 className="text-lg font-bold text-red-100 flex items-center gap-2">
                ⛔ 제외 대상 및 제한
              </h2>
            </div>
            <div className="p-6 flex-1">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-red-50 leading-relaxed">
                {program.exclusionDetail || '별도의 제외 조건/특이사항 없음 (또는 분석 중)'}
              </div>
            </div>
          </section>
        </div>

        {/* 하단: AI 요약 리포트 */}
        <section className="mb-12 rounded-xl border border-emerald-900/30 bg-emerald-950/5 p-6 md:p-8">
          <h2 className="text-xl font-bold text-emerald-100 mb-6 flex items-center gap-2">
            ✨ AI 공고 요약 리포트
          </h2>
          <div className="prose prose-invert prose-lg max-w-none text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {program.aiSummary || program.description || '요약 정보 준비 중...'}
          </div>
        </section>

      </div>
    </div>
  );
}
