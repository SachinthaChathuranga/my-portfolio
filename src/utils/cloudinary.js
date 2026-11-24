/**
 * Cloudinary unsigned upload helper & automatic WebP/quality URL optimizer.
 */
export const CLOUDINARY_CLOUD_NAME = "dtpff8781";
export const CLOUDINARY_UPLOAD_PRESET = "smsc_portfolio";

export function optimizeCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (url.includes("/upload/f_auto")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

export async function uploadToCloudinary(file, subfolder = "uploads") {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const cleanSub = String(subfolder || "uploads")
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `smsc-portfolio/${cleanSub}`);

  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }

  return {
    ok: true,
    path: optimizeCloudinaryUrl(json.secure_url),
    rawUrl: json.secure_url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
  };
}
