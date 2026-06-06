// 메인 내비게이션 메뉴 정의 (TopNav 데스크탑 + SidePanel 모바일 공용)
// 라벨은 i18n nav 객체에서 주입받는다.

export interface SubMenuItem {
  label: string;
  href: string;
}

export interface MenuItem {
  label: string;
  href: string;
  children?: SubMenuItem[];
}

// 메뉴별 컬러 — 항목별 개성은 유지하되 채도를 낮춘 차분한 뮤트 톤으로 통일감(품격).
// TopNav(공개)와 관리자 탭이 동일 색을 공유하도록 여기서 단일 정의한다.
export const NAV_COLORS: Record<string, string> = {
  '/': '#6b7280',            // 중성 회색(유지)
  '/cv': '#51688f',          // 차분한 남색
  '/works': '#b05a4e',       // 차분한 테라코타 — 강조
  '/exhibition': '#41707c',  // 차분한 청록
  '/resources': '#5c7d61',   // 차분한 녹
  '/press': '#977045',       // 차분한 세피아
  '/contact': '#51688f',     // cv와 통일
};

// 홈페이지 메뉴에 없는 관리자 전용 탭(series·about·setting)의 중립 컬러
export const NEUTRAL_NAV_COLOR = '#6b7280';

type NavLabels = Record<string, string>;

export function buildMenu(nav: NavLabels): MenuItem[] {
  return [
    { label: nav.home, href: '/' },
    { label: nav.cv, href: '/cv' },
    {
      label: nav.works,
      href: '/works',
      children: [
        { label: nav.paintings, href: '/works/paintings' },
        { label: nav.installations, href: '/works/installations' },
        { label: nav.objets, href: '/works/objets' },
        { label: nav.drawings, href: '/works/drawings' },
      ],
    },
    {
      label: nav.exhibitions,
      href: '/exhibition',
      children: [
        { label: nav.special, href: '/exhibition/special' },
        { label: nav.current, href: '/exhibition/current' },
        { label: nav.past, href: '/exhibition/past' },
      ],
    },
    {
      label: nav.resources,
      href: '/resources',
      children: [
        { label: nav.makingWorks, href: '/resources/making' },
        { label: nav.writings, href: '/resources/writings' },
      ],
    },
    {
      label: nav.press,
      href: '/press',
      children: [
        { label: nav.articles, href: '/press/articles' },
        { label: nav.broadcasts, href: '/press/broadcasts' },
      ],
    },
    { label: nav.contact, href: '/contact' },
  ];
}
