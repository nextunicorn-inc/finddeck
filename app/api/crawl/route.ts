import { NextRequest, NextResponse } from 'next/server';
import { crawlKStartup, crawlBizinfo, CrawlResult } from '@/lib/crawlers';
import puppeteer, { Browser } from 'puppeteer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5분 타임아웃

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get('source');
  const maxPages = parseInt(searchParams.get('maxPages') || '3');
  const fetchDetails = searchParams.get('fetchDetails') !== 'false';
  const targetId = searchParams.get('targetId');

  // 기업마당(bizinfo)은 이미지가 필수이므로 기본적으로 Puppeteer 사용
  let usePuppeteer = searchParams.get('usePuppeteer') === 'true';
  if (source === 'bizinfo' && !searchParams.has('usePuppeteer')) {
    usePuppeteer = true;
  }

  // 개발 환경에서는 5개 제한, 프로덕션은 무제한
  const isDev = process.env.NODE_ENV === 'development';
  const limit: number | undefined = isDev ? 5 : undefined;

  const results: { [key: string]: CrawlResult } = {};

  try {
    let browser: Browser | undefined;
    if (usePuppeteer) {
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      } catch (e) {
        console.error('Puppeteer Launch Failed:', e);
      }
    }

    try {
      if (!source || source === 'k-startup') {
        console.log('k-startup 크롤링 시작...');
        results['k-startup'] = await crawlKStartup({ maxPages, fetchDetails, limit, usePuppeteer }, browser);
      }

      if (!source || source === 'bizinfo') {
        console.log('기업마당 크롤링 시작...');
        results['bizinfo'] = await crawlBizinfo({ maxPages, fetchDetails, usePuppeteer, targetId: targetId || undefined, limit }, browser);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
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
