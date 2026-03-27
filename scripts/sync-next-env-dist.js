const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const nextEnvPath = path.join(projectRoot, 'next-env.d.ts');
const requestedDistDir = (process.argv[2] || '').trim() || '.next';

function normalizeDistDir(value) {
  const trimmed = value.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
  return trimmed || '.next';
}

function main() {
  if (!fs.existsSync(nextEnvPath)) {
    return;
  }

  const distDir = normalizeDistDir(requestedDistDir);
  const nextEnv = fs.readFileSync(nextEnvPath, 'utf8');
  const desiredLine = `/// <reference path="./${distDir}/types/routes.d.ts" />`;

  if (nextEnv.includes(desiredLine)) {
    return;
  }

  const lines = nextEnv.split(/\r?\n/);
  const existingIndex = lines.findIndex((line) =>
    line.includes('/types/routes.d.ts')
  );

  if (existingIndex >= 0) {
    lines[existingIndex] = desiredLine;
  } else {
    lines.splice(2, 0, desiredLine);
  }

  fs.writeFileSync(nextEnvPath, `${lines.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
  console.log(`Updated next-env.d.ts route types reference to ./${distDir}/types/routes.d.ts`);
}

main();
