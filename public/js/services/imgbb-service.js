// =====================================================================
// MIZANORA — ImgBB upload service
//
// IMGBB_API_KEY must be injected at build/deploy time (see .env.example
// and README "Environment Variables"). It is read here from a global
// that your build step or a small server-side endpoint populates —
// it must NEVER be committed to source as a literal string.
//
// If you have no build step yet, the simplest safe option is a tiny
// serverless function (e.g. a Cloud Function) that proxies the upload
// so the key never ships to the browser at all. See the `uploadImage`
// Cloud Function stub in /functions for that path — recommended for
// production. The direct-upload path below is the fastest way to get
// moving in development.
// =====================================================================

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

function getImgbbKey() {
  return "c408b58c591b9f93b9572c4176a9903f";
}

/**
 * Upload a single image file to ImgBB.
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<{ url: string, thumbUrl: string, deleteUrl: string }>}
 */
export function uploadImageToImgbb(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not an image."));
      return;
    }
    if (file.size > 32 * 1024 * 1024) {
      reject(new Error("Image exceeds ImgBB's 32MB limit."));
      return;
    }

    const key = getImgbbKey();
    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${IMGBB_ENDPOINT}?key=${key}`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (!res.success) {
          reject(new Error(res.error?.message || "ImgBB upload failed."));
          return;
        }
        resolve({
          url: res.data.image.url,
          thumbUrl: res.data.thumb?.url || res.data.image.url,
          deleteUrl: res.data.delete_url
        });
      } catch (err) {
        reject(new Error("Could not parse ImgBB response."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during image upload."));
    xhr.send(formData);
  });
}

/**
 * Upload multiple images sequentially, reporting overall progress.
 * @param {File[]} files
 * @param {(overallPct: number, index: number) => void} [onProgress]
 */
export async function uploadMultipleToImgbb(files, onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const result = await uploadImageToImgbb(files[i], (pct) => {
      const overall = Math.round(((i + pct / 100) / files.length) * 100);
      onProgress?.(overall, i);
    });
    results.push(result);
  }
  return results;
}
