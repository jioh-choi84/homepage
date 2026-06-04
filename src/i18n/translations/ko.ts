export const ko = {
  // 공통
  common: {
    logo: '추니박',
  },

  // 네비게이션
  nav: {
    home: 'Home',
    portfolio: 'Works',
    works: 'Works',
    cv: 'CV',
    exhibition: 'Exhibition',
    exhibitions: 'Exhibitions',
    resources: 'Resources',
    press: 'Press',
    contact: 'Contact',
    // Works 하위
    paintings: 'Paintings',
    installations: 'Installations',
    objets: 'Objets',
    drawings: 'Drawings',
    // Exhibition 하위
    special: 'Featured',
    current: 'Current',
    past: 'Past',
    // Resources 하위
    makingWorks: 'Process',
    writings: 'Writings',
    // Press 하위
    articles: 'Articles',
    broadcasts: 'Broadcasts',
  },

  // 접근성 (aria-label)
  aria: {
    openMenu: '메뉴 열기',
    closeMenu: '메뉴 닫기',
    closeModal: '모달 닫기',
    prevArtwork: '이전 작품',
    nextArtwork: '다음 작품',
    scrollDown: '아래로 스크롤',
    viewArtwork: '작품 상세 보기',
  },

  // Footer
  footer: {
    contact: '연락처',
    links: '링크',
    website: '웹사이트',
    copyright: '© {year} {name}. All rights reserved.',
    notice:
      '본 웹사이트에 게시된 모든 작품 이미지의 저작권은 작가 {name}에게 있습니다.\n작품의 무단 복제, 배포, 수정 및 상업적 이용을 금지합니다.\n작품 사용에 관한 문의는 이메일로 연락 바랍니다.',
    defaultBio: '한국의 자연과 인물을 담은 작품 활동을 하고 있습니다.',
    defaultName: '추니박',
  },

  // Exhibitions 페이지 (Phase 4에서 삭제 예정)
  exhibitions: {
    title: 'Exhibitions',
    soloExhibitions: '개인전',
    groupExhibitions: '단체전',
    noExhibitions: 'No exhibitions to display',
  },

  // CV 페이지 (구 About)
  cv: {
    education: 'Education',
    exhibitions: 'Exhibitions',
    contact: 'Contact',
    downloadCv: 'Download CV',
    defaultBio: [
      '작가 소개 텍스트를 여기에 입력하세요.',
      '작업 철학, 영감의 원천, 예술적 여정 등을 기술할 수 있습니다.',
    ],
    bornIn: 'Born in',
    liveAndWorkIn: 'Live & Work in',
    residencies: 'Residencies',
    collections: 'Collections',
    fellowships: 'Fellowships',
    awards: 'Awards',
    soloExhibitions: 'Selected Solo Exhibitions',
    groupExhibitions: 'Selected Group Exhibitions',
    popupExhibitions: 'Pop-up Exhibitions',
    publications: 'Publications',
  },

  // Press 페이지
  press: {
    title: 'Press',
    noItems: '등록된 항목이 없습니다',
    readMore: '자세히 보기',
    externalLink: '원문 보기',
    downloadPdf: 'PDF 다운로드',
    categories: {
      article: 'Articles',
      broadcast: 'Broadcasts',
    },
  },

  // Contact 페이지
  contact: {
    title: 'Contact',
    artist: 'Artist',
    introduction: 'About',
    email: 'Email',
    socialLinks: 'Social',
    studioAddress: 'Studio',
    noContact: 'Contact information not available',
    inquiryNotice:
      '작품, 전시, 협업에 관한 문의는 이메일로 연락 바랍니다.',
  },

  // Contact 폼
  contactForm: {
    title: '문의하기',
    name: '이름',
    namePlaceholder: '이름을 입력해주세요',
    email: '이메일',
    emailPlaceholder: '이메일 주소를 입력해주세요',
    subject: '제목',
    subjectPlaceholder: '문의 제목을 입력해주세요',
    message: '메시지',
    messagePlaceholder: '문의 내용을 입력해주세요',
    submit: '전송',
    sending: '전송 중...',
    success: '메시지가 성공적으로 전송되었습니다.',
    error: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
  },

  // Artwork 새 필드
  artwork: {
    medium: '재료/기법',
    collection: '소장처',
    variableSize: '가변크기',
    dimensions: '{height} × {width} cm',
    dimensionsInch: '{height} × {width} in',
  },

  // Portfolio 페이지
  portfolio: {
    title: 'Works',
    backToPortfolio: 'Back to Portfolio',
    noCategories: 'No categories yet',
    noArtworks: 'No artworks in this category',
  },

  // Landing 페이지
  landing: {
    selectedWorks: 'Selected Works',
    viewAllWorks: 'View All Works',
    noArtworks: 'No artworks to display',
  },

  // 언어 선택
  language: {
    korean: 'KR',
    english: 'EN',
  },

  // Portfolio 뷰 탭
  portfolioViews: {
    graph: '생태계',
    colors: '크로마',
    years: '연도',
  },

  // 연도별 뷰
  years: {
    artworkCount: '{count}개 작품',
    noArtworks: '이 연도에 등록된 작품이 없습니다.',
  },

  // 그래프 뷰
  graph: {
    // 통계
    artworks: '작품',
    tags: '태그',
    connections: '연결',
    statsFormat: '{artworks}개 · {tags} {tagCount}개 · {connections} {connectionCount}개',
    
    // 뷰 모드
    physics: '물리',
    view2d: '2D',
    view3d: '3D',
    
    // 범례
    artwork: '작품',
    tag: '태그',
    
    // 조작 안내
    help2d: '마우스 휠: 확대/축소 · 드래그: 이동 · 클릭: 상세',
    help3d: '마우스 드래그: 회전 · 스크롤: 확대/축소 · 클릭: 상세',
    
    // 툴팁
    year: '년',
    linkedCount: '연결',
    clickToView: '클릭하여 상세 보기',
    artworksLinked: '개 작품 연결',
    
    // 물리 설정
    physicsSettings: '물리 설정',
    reset: '초기화',
    repulsion: '반발력',
    centerForce: '중심 인력',
    linkDistance: '링크 거리',
    linkStrength: '링크 강도',
    nodeSize: '점 크기',
    small: '작게',
    large: '크게',
    
    // 슬라이더 라벨
    weak: '약함',
    strong: '강함',
    short: '짧음',
    long: '김',
    
    // 슬라이더 강도 표시
    slightly: '약간',
    quite: '꽤',
    normal: '보통',
    
    // 물리 설명
    physicsHelp: {
      repulsion: '반발력 ↑ 노드가 퍼짐',
      center: '중심 인력 ↑ 한 곳에 모임',
      distance: '링크 거리 ↑ 연결된 노드가 멀어짐',
      strength: '링크 강도 ↑ 연결된 노드가 뭉침',
    },
    
    // 상태
    loading: '그래프 로딩 중...',
    error: '그래프 데이터를 불러오는데 실패했습니다.',
    noData: '표시할 데이터가 없습니다.',
  },
};

export type Translations = typeof ko;
