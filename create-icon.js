// Simple script to create PNG icons for the PWA
// Run this in a browser console or as a Node.js script with canvas support

function createIconDataURL(size) {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Magenta background
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, size, size);

  // Black text
  ctx.fillStyle = 'black';
  ctx.font = `bold ${Math.floor(size * 0.16)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = size / 2;
  const spacing = size * 0.2;
  const startY = size * 0.35;

  ctx.fillText('PEE', centerX, startY);
  ctx.fillText('DEE', centerX, startY + spacing);
  ctx.fillText('EFF', centerX, startY + spacing * 2);

  return canvas.toDataURL('image/png');
}

function downloadIcon(size) {
  const dataURL = createIconDataURL(size);
  const link = document.createElement('a');
  link.download = `icon-${size}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate and log data URLs for both sizes
console.log('192px icon data URL:', createIconDataURL(192));
console.log('512px icon data URL:', createIconDataURL(512));

// If running in browser, create download buttons
if (typeof document !== 'undefined') {
  const container = document.createElement('div');
  container.innerHTML = `
    <h3>Icon Generator</h3>
    <button onclick="downloadIcon(192)">Download 192px</button>
    <button onclick="downloadIcon(512)">Download 512px</button>
  `;
  document.body.appendChild(container);
}

// Export for Node.js usage
if (typeof module !== 'undefined') {
  module.exports = { createIconDataURL, downloadIcon };
}
