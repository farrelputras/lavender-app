const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro sees changes in packages/shared
config.watchFolders = [workspaceRoot];

// Look in the app's own node_modules first, then fall back to the hoisted root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Prevent Metro from walking up the filesystem and finding duplicate React copies
// (causes "invalid hook call" crash when two React instances are loaded)
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
