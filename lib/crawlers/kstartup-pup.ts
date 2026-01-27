
import type { Browser, Page } from 'puppeteer';
import { extractTargetFromImage } from '../llm/extract-target';

/**
 * Puppeteer를 사용하여 K-Startup 페이지의 첨부파일 뷰어 처리
 */
export async function processKStartupPage(browser: Browser, url: string, id: string) {
  let page: Page | null = null;
  let viewerPage: Page | null = null;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });

    // 페이지 이동
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 첨부파일 리스트 대기
    try {
      await page.waitForSelector('.board_file', { timeout: 10000 });
    } catch {
      console.warn(`[K-Startup] File list not found for ${id}`);
      return null;
    }

    // 뷰어 버튼 찾기 (공고문 우선)
    const viewButtonSelector = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.board_file ul li'));

      // 1. "공고" 또는 "모집"이 포함된 파일의 바로보기 버튼 찾기
      let targetLink = links.find(li => {
        const text = li.textContent || '';
        return text.includes('공고') || text.includes('모집') || text.includes('안내');
      });

      // 2. 없다면 첫 번째 파일 선택
      if (!targetLink) {
        targetLink = links[0];
      }

      if (targetLink) {
        const btn = targetLink.querySelector('.btn_view');
        // Puppeteer에서 클릭하기 위해 selector 정보 반환은 어렵고, element 자체를 반환하기도 어려움.
        // 대신 index를 찾아서 반환.
        const allBtns = Array.from(document.querySelectorAll('.btn_view'));
        return allBtns.indexOf(btn as Element);
      }
      return -1;
    });

    if (viewButtonSelector === -1) {
      console.log(`[K-Startup] No viewer button found for ${id}`);
      return null;
    }

    // 새 창 열림 감지 준비
    const newTargetPromise = browser.waitForTarget(target => target.opener() === page!.target());

    // 버튼 클릭
    const buttons = await page.$$('.btn_view');
    if (buttons[viewButtonSelector]) {
      console.log(`[K-Startup] Clicking viewer button index ${viewButtonSelector} for ${id}`);
      await buttons[viewButtonSelector].click();
    } else {
      console.warn(`[K-Startup] Viewer button element not found for index ${viewButtonSelector}`);
      return null;
    }

    // 새 창(뷰어) 연결
    const newTarget = await newTargetPromise;
    viewerPage = await newTarget.page();

    if (!viewerPage) {
      console.error(`[K-Startup] Failed to get viewer page for ${id}`);
      return null;
    }

    console.log(`[K-Startup] Viewer opened for ${id}: ${viewerPage.url()}`);

    // 로딩 대기 (Synap Viewer or PDF Viewer)
    // 보통 'skin_Container'나 canvas 등을 기다림
    await viewerPage.waitForSelector('body', { timeout: 30000 });
    // 3초 정도 안정화 대기
    await new Promise(r => setTimeout(r, 4000));

    // 스크롤 및 캡처
    // K-Startup 뷰어는 보통 iframe이거나 canvas 렌더링임.
    // 전체 페이지 스크롤 캡처 시도

    const screenshots: string[] = [];
    const MAX_CHUNKS = 5;
    const CHUNK_HEIGHT = 1500; // 뷰어가 보통 상단 툴바가 있어서 조금 작게

    let currentScroll = 0;
    const scrollHeight = await viewerPage.evaluate(() => document.body.scrollHeight);

    // 최대 높이 제한 (너무 긴 문서는 앞부분만)
    const limitHeight = Math.min(scrollHeight, 10000);

    await viewerPage.setViewport({ width: 1280, height: CHUNK_HEIGHT });

    while (currentScroll < limitHeight && screenshots.length < MAX_CHUNKS) {
      await viewerPage.evaluate((y) => window.scrollTo(0, y), currentScroll);
      await new Promise(r => setTimeout(r, 1000)); // 렌더링 대기

      const buffer = await viewerPage.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 60,
      });

      screenshots.push(buffer as string);
      currentScroll += CHUNK_HEIGHT;
    }

    console.log(`[K-Startup] Captured ${screenshots.length} screenshots for ${id}`);

    if (screenshots.length === 0) return null;

    // Vision AI 호출
    return await extractTargetFromImage(screenshots, 'image/jpeg');

  } catch (error) {
    console.error(`[K-Startup] Puppeteer error for ${id}:`, error);
    return null;
  } finally {
    if (viewerPage) await viewerPage.close();
    if (page) await page.close();
  }
}
