'use strict';

// Builds every game workspace under games/ and copies its dist/ into
// build/games/<slug>/, next to the homepage build. Runs after the homepage
// build (which empties build/), see the "build" script in package.json.

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gamesDir = path.join(root, 'games');
const buildDir = path.join(root, 'build');

const slugs = fs.existsSync(gamesDir)
  ? fs
      .readdirSync(gamesDir)
      .filter(name => fs.existsSync(path.join(gamesDir, name, 'package.json')))
  : [];

for (const slug of slugs) {
  const dir = path.join(gamesDir, slug);
  const pkg = fs.readJsonSync(path.join(dir, 'package.json'));
  if (!pkg.scripts || !pkg.scripts.build) continue;

  console.log(`\nBuilding game: ${slug}`);
  execSync('npm run build', { cwd: dir, stdio: 'inherit' });

  const dist = path.join(dir, 'dist');
  const target = path.join(buildDir, 'games', slug);
  fs.ensureDirSync(target);
  fs.copySync(dist, target, { overwrite: true });
  console.log(`Copied ${path.relative(root, dist)} -> ${path.relative(root, target)}`);
}
