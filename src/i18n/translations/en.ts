import type { Translations } from './ko';

export const en: Translations = {
  // 공통
  common: {
    logo: 'Chuni Park',
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
    paintings: 'Paintings',
    installations: 'Installations',
    objets: 'Objets',
    drawings: 'Drawings',
    special: 'Featured',
    current: 'Current',
    past: 'Past',
    makingWorks: 'Process',
    writings: 'Writings',
    articles: 'Articles',
    broadcasts: 'Broadcasts',
  },

  // 접근성 (aria-label)
  aria: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    closeModal: 'Close modal',
    prevArtwork: 'Previous artwork',
    nextArtwork: 'Next artwork',
    scrollDown: 'Scroll down',
    viewArtwork: 'View artwork details',
  },

  // Footer
  footer: {
    contact: 'Contact',
    links: 'Links',
    website: 'Website',
    copyright: '© {year} {name}. All rights reserved.',
    notice:
      'All artwork images on this website are copyrighted by the artist {name}. Unauthorized reproduction, distribution, modification, and commercial use of the artwork is prohibited. For inquiries regarding artwork usage, please contact via email.',
    defaultBio: 'Creating artworks that capture the nature and people of Korea.',
    defaultName: 'Chuni Park',
  },

  // Exhibitions 페이지 (Phase 4에서 삭제 예정)
  exhibitions: {
    title: 'Exhibitions',
    soloExhibitions: 'Selected Solo Exhibitions',
    groupExhibitions: 'Selected Group Exhibitions',
    noExhibitions: 'No exhibitions to display',
  },

  // CV 페이지 (구 About)
  cv: {
    education: 'Education',
    exhibitions: 'Exhibitions',
    contact: 'Contact',
    downloadCv: 'Download CV',
    defaultBio: [
      'Enter artist introduction text here.',
      'You can describe your artistic philosophy, sources of inspiration, and artistic journey.',
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
    noItems: 'No items to display',
    readMore: 'Read More',
    externalLink: 'View Original',
    downloadPdf: 'Download PDF',
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
      'For inquiries about artworks, exhibitions, or collaborations, please feel free to reach out via email.',
  },

  // Contact 폼
  contactForm: {
    title: 'Get in Touch',
    name: 'Name',
    namePlaceholder: 'Enter your name',
    email: 'Email',
    emailPlaceholder: 'Enter your email address',
    subject: 'Subject',
    subjectPlaceholder: 'Enter the subject',
    message: 'Message',
    messagePlaceholder: 'Enter your message',
    submit: 'Send',
    sending: 'Sending...',
    success: 'Your message has been sent successfully.',
    error: 'Failed to send message. Please try again.',
  },

  // Artwork 새 필드
  artwork: {
    medium: 'Medium',
    collection: 'Collection',
    variableSize: 'Variable dimensions',
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
    graph: 'Ecosystem',
    colors: 'Chroma',
    years: 'Years',
  },

  // 연도별 뷰
  years: {
    artworkCount: '{count} artworks',
    noArtworks: 'No artworks registered for this year.',
  },

  // 그래프 뷰
  graph: {
    // 통계
    artworks: 'Artworks',
    tags: 'Tags',
    connections: 'Connections',
    statsFormat: '{artworks} · {tags} {tagCount} · {connections} {connectionCount}',
    
    // 뷰 모드
    physics: 'Physics',
    view2d: '2D',
    view3d: '3D',
    
    // 범례
    artwork: 'Artwork',
    tag: 'Tag',
    
    // 조작 안내
    help2d: 'Scroll: Zoom · Drag: Pan · Click: Detail',
    help3d: 'Drag: Rotate · Scroll: Zoom · Click: Detail',
    
    // 툴팁
    year: '',
    linkedCount: 'links',
    clickToView: 'Click to view details',
    artworksLinked: ' artworks linked',
    
    // 물리 설정
    physicsSettings: 'Physics Settings',
    reset: 'Reset',
    repulsion: 'Repulsion',
    centerForce: 'Center Force',
    linkDistance: 'Link Distance',
    linkStrength: 'Link Strength',
    nodeSize: 'Node Size',
    small: 'Small',
    large: 'Large',
    
    // 슬라이더 라벨
    weak: 'Weak',
    strong: 'Strong',
    short: 'Short',
    long: 'Long',
    
    // 슬라이더 강도 표시
    slightly: 'Slightly',
    quite: 'Quite',
    normal: 'Normal',
    
    // 물리 설명
    physicsHelp: {
      repulsion: 'Repulsion ↑ Nodes spread out',
      center: 'Center ↑ Nodes cluster',
      distance: 'Distance ↑ Linked nodes separate',
      strength: 'Strength ↑ Linked nodes stick',
    },
    
    // 상태
    loading: 'Loading graph...',
    error: 'Failed to load graph data.',
    noData: 'No data to display.',
  },
};
