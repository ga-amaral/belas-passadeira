/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit", "linebreak", "unicode-properties", "brotli"],
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "gdsnfrfxvqxueubytoeb.supabase.co" },
    ],
  },
  async rewrites() {
    // Em desenvolvimento, proxy /api/* para o Express local na porta 3001
    if (process.env.NODE_ENV === "development") {
      return [
        { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
      ];
    }
    return [];
  },
};

export default nextConfig;
