/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // La portada sirve la app de tienda (public/app.html).
      beforeFiles: [{ source: "/", destination: "/app.html" }],
    };
  },
};
export default nextConfig;
