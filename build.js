import fs from 'fs';
fs.realpathSync = (p) => p;

import('./node_modules/astro/bin/astro.mjs');
