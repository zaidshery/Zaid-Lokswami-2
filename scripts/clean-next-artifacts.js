const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const targets = ['.next', '.next-dev'];

for (const target of targets) {
  fs.rmSync(path.join(projectRoot, target), { recursive: true, force: true });
}

console.log(`Removed ${targets.join(', ')}`);
