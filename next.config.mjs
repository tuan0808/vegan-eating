// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // The on-the-fly optimizer (esp. AVIF encode without `sharp`) was OOM-
    // crashing the server under WSL, resetting every asset connection.
    // Your images are already web-sized, so serve them as-is — no optimizer.
    unoptimized: true,
  },
};

export default nextConfig;
