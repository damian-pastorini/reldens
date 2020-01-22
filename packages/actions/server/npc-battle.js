/**
 *
 * Reldens - NpcBattle
 *
 * Battle logic handler.
 *
 */

class NpcBattle
{

    constructor()
    {
        // the same body can be in battle with multiple bodies:
        this.inBattleWith = [];
        // setting the battleTimeOff = false the battle will never end:
        this.battleTimeOff = false;
    }

    start(bodyA, bodyB)
    {
        console.log('Start Battle!', bodyA.id, bodyB.id);
    }

}

module.exports.NpcBattle = NpcBattle;
