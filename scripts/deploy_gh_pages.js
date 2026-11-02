const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  const outDir = path.resolve(__dirname, '../out');
  console.log('Out dir:', outDir);

  // Initialize git repo inside out if not present
  const gitDir = path.join(outDir, '.git');
  if (!fs.existsSync(gitDir)) {
    execSync('git init', { cwd: outDir, stdio: 'inherit' });
    execSync('git checkout -b gh-pages', { cwd: outDir, stdio: 'inherit' });
  }

  // Ensure remote origin is set
  try {
    execSync('git remote remove origin', { cwd: outDir });
  } catch (e) {}

  execSync('git config user.name "letranbaotran"', { cwd: outDir, stdio: 'inherit' });
  execSync('git config user.email "baotran@easupso.com"', { cwd: outDir, stdio: 'inherit' });

  const parentDir = path.resolve(__dirname, '..');
  const remoteUrl = execSync('git remote get-url origin', { cwd: parentDir }).toString().trim();
  execSync(`git remote add origin ${remoteUrl}`, { cwd: outDir, stdio: 'inherit' });

  execSync('git add -A', { cwd: outDir, stdio: 'inherit' });
  execSync('git commit -m "Deploy latest build with new logo and clean UI"', { cwd: outDir, stdio: 'inherit' });
  console.log('Pushing out to gh-pages...');
  execSync('git push -f origin gh-pages', { cwd: outDir, stdio: 'inherit' });
  console.log('GitHub Pages deployment successful!');
} catch (err) {
  console.error('Deployment error:', err.message);
  process.exit(1);
}
