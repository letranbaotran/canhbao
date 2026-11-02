const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

try {
  copyFolderSync(path.join(__dirname, '../.next/static'), path.join(__dirname, '../.next/standalone/.next/static'));
  copyFolderSync(path.join(__dirname, '../public'), path.join(__dirname, '../.next/standalone/public'));
  console.log('Static assets successfully synced to .next/standalone');
} catch (err) {
  console.error('Error copying static assets:', err);
}
