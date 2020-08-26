/**
 *
 * Reldens - ActionsManager
 *
 * This class will validate and run all the players and objects actions.
 *
 */

const { AttackShort } = require('./attack-short');
const { AttackBullet } = require('./attack-bullet');

class ActionsManager
{

    constructor(config)
    {
        this.config = config;
        // @TODO: load dynamically player skills here and clean up.
        this.availableActions = {'attack-short': AttackShort, 'attack-bullet': AttackBullet};
    }

}

module.exports.ActionsManager = ActionsManager;
