/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['stripe'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
