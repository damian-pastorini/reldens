#! /usr/bin/env node

/**
 *
 * Reldens - Commands
 *
 */

const commander = require('./commander');

if(commander.ready){
    'test' === commander.command || 'help' === commander.command || 'generateEntities' === commander.command
        ? commander[commander.command]()
        : commander.execute().then(() => { console.info('- End'); });
}
