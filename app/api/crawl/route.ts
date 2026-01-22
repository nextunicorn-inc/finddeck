import { NextRequest, NextResponse } from 'next/server';
import { crawlKStartup, crawlBizinfo, CrawlResult } from '@/lib/crawlers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5분 타임아웃

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get('source');
  const maxPages = parseInt(searchParams.get('maxPages') || '3');
  const fetchDetails = searchParams.get('fetchDetails') !== 'false';

  const results: { [key: string]: CrawlResult } = {};

  try {
    if (!source || source === 'k-startup') {
      console.log('k-startup 크롤링 시작...');
      results['k-startup'] = await crawlKStartup({ maxPages, fetchDetails });
    }

    if (!source || source === 'bizinfo') {
      console.log('기업마당 크롤링 시작...');
      results['bizinfo'] = await crawlBizinfo({ maxPages, fetchDetails });
    }

    const totalCount = Object.values(results).reduce((sum, r) => sum + r.count, 0);
    const hasErrors = Object.values(results).some(r => !r.success);

    return NextResponse.json({
      success: !hasErrors,
      totalCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('크롤링 API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
