#! /usr/bin/env node

/**
 *
 * Reldens - Commands
 *
 */

const commander = require('./commander');

if(commander.prepareCommand()){
    -1 !== commander.availableCommands.indexOf(commander.command)
        ? commander[commander.command]()
        : commander.execute().then(() => { console.info('- End'); });
}
