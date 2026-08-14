import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Значок Next в углу экрана. В боевой сборке его и так нет, но он мешает
  // смотреть на работу во время разработки.
  devIndicators: false,
};

export default nextConfig;
