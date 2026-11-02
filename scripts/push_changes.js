const { execSync } = require('child_process');

try {
  console.log('Adding files...');
  execSync('git add .', { stdio: 'inherit' });
  
  console.log('Committing changes...');
  execSync('git commit -m "Update logo from Image 5 and remove UI sections from Images 1-4"', { stdio: 'inherit' });
  
  console.log('Pushing to main...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('Main branch updated successfully!');
} catch (err) {
  console.error('Error committing/pushing:', err.message);
}
