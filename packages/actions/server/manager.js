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
        // @TODO: create storage tables and load skills dynamically.
        this.availableActions = {
            attackShort: {
                actClass: AttackShort,
                props: {
                    key: 'attack-short',
                    affectedProperty: 'stats/hp',
                    skillDelay: 600,
                    range: 50,
                    hitDamage: 5,
                    rangePropertyX: 'state/x',
                    rangePropertyY: 'state/y'
                }
            },
            attackBullet: {
                actClass: AttackBullet,
                props: {
                    key: 'attack-bullet',
                    affectedProperty: 'stats/hp',
                    skillDelay: 1000,
                    range: 250,
                    hitDamage: 3,
                    hitPriority: 2,
                    magnitude: 350,
                    objectWidth: 5,
                    objectHeight: 5,
                    rangePropertyX: 'state/x',
                    rangePropertyY: 'state/y'
                }
            }
        };
    }

}

module.exports.ActionsManager = ActionsManager;
