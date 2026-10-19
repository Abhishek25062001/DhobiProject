export function imageFileData(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Choose a PNG, JPEG or WebP image.'));
  if (file.size > 6 * 1024 * 1024) return Promise.reject(new Error('Images must be 6 MB or smaller.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}
