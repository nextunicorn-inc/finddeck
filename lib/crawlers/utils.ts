
import * as cheerio from 'cheerio';

/**
 * 제목 정제 함수 - 불필요한 텍스트 제거하고 공백 정리
 */
export function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/새로운게시글/g, '')
    .replace(/\s+/g, ' ')  // 연속 공백을 단일 공백으로
    .trim();
}

/**
 * HTML 요소에서 텍스트만 깨끗하게 추출
 * script, style 등 불필요한 태그를 제거한 후 텍스트 반환
 */
export function getCleanText($: cheerio.CheerioAPI, element: any): string {
  if (!element) return '';

  // 원본 수정 방지를 위해 클론 생성 (필요한 경우)
  // Cheerio에서 $(element)는 새로운 래퍼를 생성하므로 안전할 수 있지만,
  // 내부 DOM을 수정하는 remove()를 호출하므로 clone()이 안전함
  const $el = $(element).clone();

  // 불필요한 태그 제거
  $el.find('script, style, noscript, iframe, link, meta, style').remove();

  // 주석 제거 (선택적)

  // 텍스트 추출 및 공백 정리
  return $el.text()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * HTML 문자열에서 텍스트만 추출 (cheerio 로드 오버헤드 있음)
 */
export function cleanHtmlText(html: string): string {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, link, meta').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
