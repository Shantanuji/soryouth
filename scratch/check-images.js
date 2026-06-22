const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, '..', 'public', 'assets', 'images');
const files = ['logo.png', 'logo-black.png', 'logo-sm.png'];

files.forEach(file => {
  const filePath = path.join(imgDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`${file}: size = ${stats.size} bytes`);
    // Read PNG width/height from IHDR chunk
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('ascii', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      console.log(`  Dimensions: ${width}x${height}`);
    }
  } else {
    console.log(`${file} does not exist`);
  }
});
