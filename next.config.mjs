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
  async redirects() {
    return [
      // Client asked the business-card QR (/links) to land on the home page.
      // Temporary (307) on purpose so it's reversible — switch to permanent:true
      // only once it's final. The /links page itself is left intact.
      { source: "/links", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
