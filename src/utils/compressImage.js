// Shrinks a photo to a JPEG data URL small enough for one Firestore doc (1 MiB limit)
const MAX_CHARS = 900_000;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('UNREADABLE')); };
    img.src = url;
  });
}

export async function compressImage(file, maxSide = 1600) {
  const img = await loadImage(file);
  let scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_CHARS) return dataUrl;
    }
    scale *= 0.75;
  }
  throw new Error('TOO_LARGE');
}
