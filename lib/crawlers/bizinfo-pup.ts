
import type { Browser } from 'puppeteer';
import { extractTargetFromImage } from '../llm/extract-target';

/**
 * Puppeteer를 사용하여 단일 페이지 처리 (스크린샷 -> Vision AI)
 */
export async function processBizinfoPage(browser: Browser, url: string, id: string) {
  let page = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 2000 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // 기본 컨텐츠 대기
    try {
      await page.waitForSelector('.view_cont', { timeout: 10000 });
    } catch {
      console.warn(`[Puppeteer] .view_cont not found for ${id}`);
    }

    // 1. Frame URL 검색으로 뷰어 찾기 (동적 대기)
    let viewerFrame = null;
    const maxWaitTime = 15000; // 최대 15초 대기
    const checkInterval = 500; // 0.5초마다 체크
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const frames = page.frames();
      viewerFrame = frames.find(f => f.url().includes('dxviewer') || f.url().includes('synap') || f.url().includes('pdf'));
      if (viewerFrame) break;
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // 스크린샷 저장용 배열
    const screenshots: string[] = [];
    let screenshotBuffer: string | Buffer = ''; // Legacy support if needed, but we use screenshots array now

    if (viewerFrame) {
      console.log(`[Puppeteer] Viewer frame found for ${id}: ${viewerFrame.url()}`);

      try {
        // 뷰어 내부 body 대기
        await viewerFrame.waitForSelector('body', { timeout: 10000 });

        // 뷰어 내 이미지/콘텐츠 로딩 완료 대기
        try {
          await viewerFrame.waitForFunction(() => {
            // 이미지가 모두 로딩되었는지 확인
            const images = document.querySelectorAll('img');
            const allImagesLoaded = Array.from(images).every(img => img.complete && img.naturalHeight > 0);
            // 또는 특정 콘텐츠 요소가 존재하는지 확인
            const hasContent = document.body.innerText.length > 100;
            return allImagesLoaded && hasContent;
          }, { timeout: 20000 });
        } catch {
          // 타임아웃되어도 진행 (일부 콘텐츠라도 캡처)
          console.warn(`[Puppeteer] Content loading timeout for ${id}, proceeding anyway`);
        }

        // 뷰어 높이 계산 (body 대신 가장 긴 요소 기준)
        const bodyHeight = await viewerFrame.evaluate(() => {
          let maxH = document.body.scrollHeight;
          const allElements = document.querySelectorAll('*');
          for (const el of Array.from(allElements)) {
            if (el.scrollHeight > maxH) {
              maxH = el.scrollHeight;
            }
          }
          return maxH;
        });
        const bodyWidth = await viewerFrame.evaluate(() => document.body.scrollWidth);
        const finalHeight = Math.min(Math.max(bodyHeight, 2000), 20000); // 최소 2000, 최대 20000 제한

        console.log(`[Puppeteer] Viewer size: ${bodyWidth}x${finalHeight}`);

        // Page Viewport 조정 (전체 렌더링을 위해)
        await page.setViewport({ width: Math.max(1920, bodyWidth), height: finalHeight + 200 });

        // Frame element 스크린샷 (분할 캡처)
        const bodyEl = await viewerFrame.$('body');

        if (bodyEl) {
          const CHUNK_HEIGHT = 3000;
          const MAX_CHUNKS = 6; // 안전장치: 최대 6장까지만 캡처
          let capturedHeight = 0;

          while (capturedHeight < finalHeight) {
            // 안전장치: 너무 많은 청크 생성 방지
            if (screenshots.length >= MAX_CHUNKS) {
              console.warn(`[Puppeteer] Max chunks (${MAX_CHUNKS}) reached for ${id}, stopping capture`);
              break;
            }

            const height = Math.min(CHUNK_HEIGHT, finalHeight - capturedHeight);

            // 마지막 자투리가 너무 작으면(예: 100px) 무시하거나 포함
            if (height < 100 && screenshots.length > 0) break;

            // 렌더링 트리거: 해당 위치로 스크롤 이동
            try {
              await viewerFrame.evaluate((y) => window.scrollTo(0, y), capturedHeight);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 렌더링 대기
            } catch (e) {
              console.warn(`[Puppeteer] Scroll failed: ${e}`);
            }

            const buffer = await bodyEl.screenshot({
              encoding: 'base64',
              type: 'jpeg',
              quality: 100,
              clip: {
                x: 0,
                y: capturedHeight,
                width: bodyWidth,
                height: height
              }
            });

            // 디버깅용 이미지 저장 (로컬 확인용)
            try {
              const fs = require('fs');
              const path = require('path');
              const debugPath = path.join(process.cwd(), `debug_chunk_${screenshots.length}.jpg`);
              fs.writeFileSync(debugPath, Buffer.from(buffer as string, 'base64'));
              console.log(`[Puppeteer] Saved debug image to ${debugPath}`);
            } catch (e) {
              console.error('[Puppeteer] Failed to save debug image:', e);
            }

            screenshots.push(buffer as string);
            capturedHeight += height;
          }
          console.log(`[Puppeteer] Captured ${screenshots.length} chunks for ${id}`);
        }
      } catch (e) {
        console.error(`[Puppeteer] Frame screenshot failed for ${id}:`, e);
      }
    }

    // 2. Fallback: Main Content
    if (!viewerFrame && !screenshotBuffer) {
      console.log(`[Puppeteer] Fallback to .view_cont screenshot for ${id}`);
      // ... (fallback은 단일 이미지 유지 또는 필요 시 분할)
      // Fallback 로직도 screenshots 배열을 채우도록 수정 필요하지만 
      // 일단 viewerFrame이 없는 경우는 드물므로 기존 로직 유지하되 screenshots 배열에 넣음
      const contentElement = await page.$('.view_cont') || await page.$('body');

      if (contentElement) {
        // ... (기존 viewport 조정)
        try {
          const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
          await page.setViewport({ width: 1920, height: bodyHeight + 100 });
        } catch { }

        const buffer = await contentElement.screenshot({
          encoding: 'base64',
          type: 'jpeg',
          quality: 80,
        });
        screenshots.push(buffer as string);
      }
    }

    if (screenshots.length === 0) {
      throw new Error('Screenshot failed');
    }

    // Vision API 호출
    console.log(`[Puppeteer] Sending ${screenshots.length} screenshots to Gemini Vision (${id})...`);
    const applicationTarget = await extractTargetFromImage(screenshots, 'image/jpeg');

    return applicationTarget;

  } catch (error) {
    console.error(`[Puppeteer] Error processing ${id}:`, error);
    return null;
  } finally {
    if (page) await page.close();
  }
}
