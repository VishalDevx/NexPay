/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexpay/shared"],
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: "http://localhost:3004/api/v1/:path*" },
    ];
  },
};

module.exports = nextConfig;
