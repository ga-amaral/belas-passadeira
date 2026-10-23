/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "gdsnfrfxvqxueubytoeb.supabase.co" },
    ],
  },
};

export default nextConfig;
