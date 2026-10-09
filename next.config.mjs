/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "gdsnfrfxvqxueubytoeb.supabase.co" },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
      ];
    }
    return [];
  },
};

export default nextConfig;
