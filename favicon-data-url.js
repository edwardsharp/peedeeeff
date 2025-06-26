// Simple data URL favicon generator for immediate use
// Creates a 16x16 magenta favicon with "P" in black

function createFaviconDataURL() {
  // Create a 16x16 canvas
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  // Magenta background
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, 16, 16);

  // Black "P" letter
  ctx.fillStyle = 'black';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', 8, 8);

  return canvas.toDataURL('image/png');
}

// Generate and apply favicon immediately
function applyDataURLFavicon() {
  const dataURL = createFaviconDataURL();

  // Remove existing favicon
  const existingFavicon = document.querySelector('link[rel="icon"]');
  if (existingFavicon) {
    existingFavicon.remove();
  }

  // Create new favicon link
  const faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/png';
  faviconLink.href = dataURL;

  document.head.appendChild(faviconLink);

  console.log('Applied data URL favicon:', dataURL.substring(0, 50) + '...');
}

// Auto-apply when this script loads (if in browser)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDataURLFavicon);
  } else {
    applyDataURLFavicon();
  }
}

// Export for manual use
window.faviconUtils = {
  createFaviconDataURL,
  applyDataURLFavicon
};
