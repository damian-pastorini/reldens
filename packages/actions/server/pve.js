/**
 *
 * Reldens - Pve
 *
 * Player vs environment battle logic handler.
 *
 */

const { Battle } = require('./battle');

class Pve extends Battle
{

    async runBattle(playerSchema, target, room)
    {
        console.log('Start PvE!');
        let inBattle = await super.runBattle(playerSchema, target);
    }

}

module.exports.Pve = Pve;
