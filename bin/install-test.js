#! /usr/bin/env node

/**
 *
 * Reldens - Install Test
 *
 */

const commander = require('./commander');
const { ThemeManager } = require('../lib/game/server/theme-manager');

commander.projectThemeName = 'custom-game-theme-test';

commander.themeManager = new ThemeManager(commander);

async function runCommander(commander) {
    await commander.themeManager.installSkeleton();
    process.exit();
}

runCommander(commander);
