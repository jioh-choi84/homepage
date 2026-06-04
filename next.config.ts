import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      // 유튜브 영상 썸네일(대표이미지 fallback)
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
    ],
  },
  async redirects() {
    return [
      { source: '/artworks', destination: '/works', permanent: true },
      { source: '/artworks/:path*', destination: '/works', permanent: true },
      { source: '/portfolio', destination: '/works', permanent: true },
      { source: '/portfolio/:path*', destination: '/works', permanent: true },
      { source: '/about', destination: '/cv', permanent: true },
      { source: '/news', destination: '/press', permanent: true },
      { source: '/news/:path*', destination: '/press', permanent: true },
    ];
  },
};

export default nextConfig;
