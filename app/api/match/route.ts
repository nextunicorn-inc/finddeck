import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 사용자 조건에 맞는 지원사업 매칭 API
 * 
 * Query Parameters:
 * - foundingYear: 회사 설립연도 (예: 2022)
 * - region: 회사 소재지 (예: 서울)
 * - birthMonth: 대표자 생년월 (예: 1990-05)
 * - industry: 회사 업종 (예: SW)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const foundingYear = searchParams.get('foundingYear');
    const region = searchParams.get('region');
    const birthMonth = searchParams.get('birthMonth');
    const industry = searchParams.get('industry');

    // 현재 날짜 (마감일 필터용)
    const now = new Date();

    // 업력 계산 (설립연도 → 현재까지 몇 년)
    let companyAgeYears: number | null = null;
    if (foundingYear) {
      companyAgeYears = now.getFullYear() - parseInt(foundingYear);
    }

    // 대표자 나이 계산 (생년월 → 만 나이)
    let ceoAge: number | null = null;
    if (birthMonth) {
      const [birthYear, birthMonthNum] = birthMonth.split('-').map(Number);
      ceoAge = now.getFullYear() - birthYear;
      // 생일이 지나지 않았으면 -1
      if (now.getMonth() + 1 < birthMonthNum) {
        ceoAge -= 1;
      }
    }

    // 마감일이 지나지 않은 공고만 조회 (applicationEnd >= now)
    const programs = await prisma.supportProgram.findMany({
      where: {
        applicationEnd: {
          gte: now,
        },
      },
      orderBy: {
        applicationEnd: 'asc', // 마감 임박 순
      },
      select: {
        id: true,
        title: true,
        organization: true,
        applicationEnd: true,
        url: true,
        companyAge: true,
        targetRegion: true,
        targetAge: true,
        targetIndustry: true,
        supportField: true,
        fundingAmount: true,
      },
    });

    // 클라이언트 사이드 필터링 (DB 쿼리로는 복잡한 텍스트 매칭이 어려움)
    const matched = programs.filter((program) => {
      // 1. 업력 조건 체크
      if (companyAgeYears !== null && program.companyAge) {
        if (!matchCompanyAge(program.companyAge, companyAgeYears)) {
          return false;
        }
      }

      // 2. 지역 조건 체크
      if (region && program.targetRegion) {
        if (!matchRegion(program.targetRegion, region)) {
          return false;
        }
      }

      // 3. 대표자 나이 조건 체크
      if (ceoAge !== null && program.targetAge) {
        if (!matchAge(program.targetAge, ceoAge)) {
          return false;
        }
      }

      // 4. 업종 조건 체크
      if (industry && program.targetIndustry) {
        if (!matchIndustry(program.targetIndustry, industry)) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      data: matched,
      total: matched.length,
    });
  } catch (error) {
    console.error('[match] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * 업력 조건 매칭
 * 예: "7년 미만", "3년 이내", "예비창업자" 등
 */
function matchCompanyAge(condition: string, years: number): boolean {
  const normalized = condition.toLowerCase();

  // "무관", "제한없음" 등은 통과
  if (normalized.includes('무관') || normalized.includes('제한없음') || normalized.includes('제한 없음')) {
    return true;
  }

  // "예비창업자" - 업력 0년
  if (normalized.includes('예비') && years === 0) {
    return true;
  }

  // "N년 미만", "N년 이내", "N년 이하" 패턴
  const yearMatch = condition.match(/(\d+)\s*년\s*(미만|이내|이하)/);
  if (yearMatch) {
    const limit = parseInt(yearMatch[1]);
    const type = yearMatch[2];
    if (type === '미만') {
      return years < limit;
    } else {
      return years <= limit;
    }
  }

  // 패턴 매칭 실패 시 통과 (보수적 접근)
  return true;
}

/**
 * 지역 조건 매칭
 * 예: "서울", "전국", "수도권" 등
 */
function matchRegion(condition: string, userRegion: string): boolean {
  const normalized = condition.toLowerCase();

  // "전국", "무관" 등은 통과
  if (normalized.includes('전국') || normalized.includes('무관')) {
    return true;
  }

  // 수도권 체크
  if (normalized.includes('수도권')) {
    return ['서울', '경기', '인천'].includes(userRegion);
  }

  // 직접 포함 여부
  return condition.includes(userRegion);
}

/**
 * 나이 조건 매칭
 * 예: "만 39세 이하", "만 19세~39세", "무관" 등
 */
function matchAge(condition: string, age: number): boolean {
  const normalized = condition.toLowerCase();

  // "무관", "제한없음" 등은 통과
  if (normalized.includes('무관') || normalized.includes('제한없음') || normalized.includes('제한 없음')) {
    return true;
  }

  // "만 N세 이하" 패턴
  const underMatch = condition.match(/만?\s*(\d+)\s*세\s*(이하|미만)/);
  if (underMatch) {
    const limit = parseInt(underMatch[1]);
    const type = underMatch[2];
    if (type === '미만') {
      return age < limit;
    } else {
      return age <= limit;
    }
  }

  // "만 N세~M세" 또는 "만 N세 이상 M세 이하" 패턴
  const rangeMatch = condition.match(/만?\s*(\d+)\s*세?\s*[~\-]\s*(\d+)\s*세/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return age >= min && age <= max;
  }

  // "만 N세 이상" 패턴
  const overMatch = condition.match(/만?\s*(\d+)\s*세\s*이상/);
  if (overMatch) {
    const limit = parseInt(overMatch[1]);
    return age >= limit;
  }

  // 패턴 매칭 실패 시 통과 (보수적 접근)
  return true;
}

/**
 * 업종 조건 매칭
 * 예: "SW", "제조업", "전분야" 등
 */
function matchIndustry(condition: string, userIndustry: string): boolean {
  const normalized = condition.toLowerCase();

  // "전분야", "전업종", "무관" 등은 통과
  if (normalized.includes('전분야') || normalized.includes('전업종') || normalized.includes('무관') || normalized.includes('일반')) {
    return true;
  }

  // 직접 포함 여부 (유사 키워드도 체크)
  const industryKeywords: Record<string, string[]> = {
    'SW': ['sw', 'it', '소프트웨어', '정보통신', 'ict', '디지털'],
    '제조': ['제조', '생산', '공장'],
    '바이오': ['바이오', '헬스', '의료', '제약', '건강'],
    '콘텐츠': ['콘텐츠', '미디어', '엔터', '방송', '영상'],
    '유통': ['유통', '물류', '배송', '커머스'],
    '관광': ['관광', '여행', '숙박', '서비스'],
    '에너지': ['에너지', '환경', '그린', '친환경', '신재생'],
    '농업': ['농업', '식품', '농식품', '푸드'],
  };

  const keywords = industryKeywords[userIndustry] || [userIndustry.toLowerCase()];
  return keywords.some(keyword => normalized.includes(keyword));
}
