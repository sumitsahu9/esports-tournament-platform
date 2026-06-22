const { exec } = require('child_process');
const fs = require('fs');

const WATCH_DIR = __dirname;
let debounceTimer = null;
const COOLDOWN_MS = 5000; // Wait for 5 seconds of silence before pushing to group saves

console.log('===================================================');
console.log('  Mash Arena - Real-Time Live Watcher Started  ');
console.log('  Monitoring directory for edits...                ');
console.log('===================================================');

function syncToGithub() {
  console.log('\n[Auto-Sync] Change detected! Preparing push...');
  
  exec('git add .', { cwd: WATCH_DIR }, (addErr) => {
    if (addErr) {
      console.error('[Error] git add failed:', addErr.message);
      return;
    }
    
    const timestamp = new Date().toLocaleString();
    exec(`git commit -m "Auto-update website: ${timestamp}"`, { cwd: WATCH_DIR }, (commitErr) => {
      // It is fine if commit reports nothing new
      exec('git push origin main', { cwd: WATCH_DIR }, (pushErr, stdout, stderr) => {
        if (pushErr) {
          console.error('[Error] git push failed:', pushErr.message);
        } else {
          console.log(`[Success] Live site updated successfully at ${timestamp}!`);
        }
      });
    });
  });
}

function handleChange(eventType, filename) {
  if (!filename) return;
  
  // Ignore git metadata, next build assets, and package modules
  if (
    filename.includes('.git') ||
    filename.includes('.next') ||
    filename.includes('node_modules') ||
    filename.includes('watch_deploy.js') ||
    filename.includes('deploy.bat')
  ) {
    return;
  }

  console.log(`[Edit] File modified: ${filename}`);
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(syncToGithub, COOLDOWN_MS);
}

// Watch recursively (natively supported on Windows)
fs.watch(WATCH_DIR, { recursive: true }, handleChange);
