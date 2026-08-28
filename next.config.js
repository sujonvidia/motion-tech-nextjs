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
                destination: `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/shop-api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
