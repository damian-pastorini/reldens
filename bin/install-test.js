#! /usr/bin/env node

/**
 *
 * Reldens - Install Test
 *
 */

const commander = require('./commander');

commander.projectThemeName = 'custom-game-theme-test';

commander.themeManager.setupPaths(commander);

async function runCommander(commander) {
    await commander.themeManager.installSkeleton();
    process.exit();
}

runCommander(commander);
