import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary resizes images for us (see the loader)
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",
  },
  async rewrites() {
    // the browser only ever talks to this site; /api/* is forwarded to the Spring Boot backend
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  devIndicators: false,
};

export default withNextIntl(nextConfig);