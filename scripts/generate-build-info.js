/**
 * Extract the build info from the package.json file
 * and write it to a TypeScript file.
 */
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const buildInfo = {
  name: pkg.name,
  version: pkg.version,
};

const buildInfoFileContent = `// This file is automatically generated. DO NOT EDIT.

/* eslint-disable */

export const buildInfo = ${JSON.stringify(buildInfo, null, 2)};
`;

const buildInfoPath = path.join(__dirname, '../src/generated/build-info.ts');
fs.writeFileSync(buildInfoPath, buildInfoFileContent, 'utf8');
