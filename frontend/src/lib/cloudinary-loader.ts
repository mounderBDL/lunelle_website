/** Asks Cloudinary for the right size and the best format (WebP/AVIF) instead of the original. */
export default function cloudinaryLoader({ src, width }: { src: string; width: number }): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  // local files (the logo): the query string is ignored by the server, it only satisfies Next.js
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}