
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 문제의 공고 ID: PBLN_000000000117782
  const url = 'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=PBLN_000000000117782';
  const artifactDir = '/Users/halfz/.gemini/antigravity/brain/0143c2b0-c8a4-44c5-bb53-5245ca4fcaa8';
  const logPath = path.join(artifactDir, 'debug_capture_log.txt');

  let browser = null;
  const chunkPaths: string[] = [];
  let debugInfo: any = {};

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
      await page.waitForSelector('.view_cont', { timeout: 10000 });
    } catch {
      console.log('view_cont not found');
    }

    // 1. Frame URL 검색으로 뷰어 찾기
    let viewerFrame = null;
    const maxWaitTime = 15000;
    const checkInterval = 500;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const frames = page.frames();
      viewerFrame = frames.find(f => f.url().includes('dxviewer') || f.url().includes('synap') || f.url().includes('pdf') || f.url().includes('hwp'));
      if (viewerFrame) break;
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    const frames = page.frames();
    const frameInfo = frames.map(f => ({ url: f.url(), name: f.name() }));
    fs.writeFileSync(logPath, JSON.stringify(frameInfo, null, 2));

    if (viewerFrame) {
      console.log('Viewer frame found:', viewerFrame.url());

      try {
        await viewerFrame.waitForSelector('body', { timeout: 10000 });

        // 뷰어 콘텐츠 로딩 체크
        try {
          await viewerFrame.waitForFunction(() => {
            const images = document.querySelectorAll('img');
            const allImagesLoaded = Array.from(images).every(img => img.complete && img.naturalHeight > 0);
            const hasContent = document.body.innerText.length > 50;
            return allImagesLoaded || hasContent;
          }, { timeout: 20000 });
        } catch {
          console.log('Content loading timeout, proceeding');
        }

        // 스크롤 가능한 최대 요소 찾기
        debugInfo = await viewerFrame.evaluate(() => {
          let maxH = document.body.scrollHeight;
          let maxElSelector = 'body';

          const allElements = document.querySelectorAll('*');
          // @ts-ignore
          for (const el of allElements) {
            if (el.scrollHeight > maxH) {
              maxH = el.scrollHeight;
              maxElSelector = (el.tagName + '.' + el.className + '#' + el.id).replace('null', '');
            }
          }
          return { maxH, maxElSelector, bodyH: document.body.scrollHeight };
        });
        console.log('Scroll Debug:', debugInfo);

        const finalHeight = Math.max(debugInfo.maxH, 2000);
        console.log(`Viewer calculated size: 1920x${finalHeight}`);

        await page.setViewport({ width: 1920, height: finalHeight + 200 });

        // 캡처는 body 기준으로 하되, 높이를 finalHeight만큼
        const bodyEl = await viewerFrame.$('body');

        if (bodyEl) {
          const CHUNK_HEIGHT = 3000;
          let capturedHeight = 0;
          let chunkIndex = 0;

          while (capturedHeight < finalHeight) {
            const height = Math.min(CHUNK_HEIGHT, finalHeight - capturedHeight);
            if (height < 100 && chunkIndex > 0) break;

            const buffer = await bodyEl.screenshot({
              type: 'jpeg',
              quality: 80,
              clip: {
                x: 0,
                y: capturedHeight,
                width: 1920, // bodyWidth 대신 고정값 사용 (안전하게)
                height: height
              }
            });

            const chunkName = `debug_chunk_${chunkIndex}.jpg`;
            const chunkPath = path.join(artifactDir, chunkName);
            fs.writeFileSync(chunkPath, Buffer.from(buffer));
            chunkPaths.push(chunkName);
            console.log(`Saved chunk ${chunkIndex} to ${chunkPath}`);

            capturedHeight += height;
            chunkIndex++;
          }
        }
      } catch (e) {
        console.log('Viewer frame setup error', e);
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
      }
    } else {
      console.log('Viewer frame NOT found');
    }

    return NextResponse.json({ success: true, chunks: chunkPaths, frameCount: frames.length, hasViewer: !!viewerFrame, debugInfo });

  } catch (error) {
    console.error('Debug capture error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
