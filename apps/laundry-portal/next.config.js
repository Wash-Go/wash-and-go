/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Workspace TS packages are compiled by Next (no prebuild step).
  transpilePackages: ['@wash-and-go/domain', '@wash-and-go/api-client'],
};
