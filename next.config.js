/** @type {import('next').NextConfig} */
const nextConfig = {
    trailingSlash: true,
    pageExtensions: ['page.tsx', 'page.ts'],
    swcMinify: true,
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return [
            {
                source: '/shop-api/:path*',
                destination: `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://motion-tech-server-production-a8dc.up.railway.app'}/shop-api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
