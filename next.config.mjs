/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // small self-contained server for the Docker image
};

export default nextConfig;
