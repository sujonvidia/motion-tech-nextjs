/** @type {import('next').NextConfig} */
const nextConfig = {
    trailingSlash: true,
    pageExtensions: ['page.tsx', 'page.ts'],
    swcMinify: true,
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;
