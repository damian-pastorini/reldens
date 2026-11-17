/**
 *
 * Reldens - Test Enemy Aggression
 *
 */

const { BaseTest } = require('./base-test');
const { EnemyAggression } = require('../lib/objects/server/object/type/enemy-aggression');

class TestEnemyAggression extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.respawnLayer = 'respawn-area-monsters-lvl-1-2';
        this.worldWidth = 10;
        this.respawnTile = {currentCol: 3, currentRow: 4};
        this.enemyPosition = [100, 100];
        this.interactionRadio = 170;
        this.respawnTileIndex = this.respawnTile.currentRow * this.worldWidth + this.respawnTile.currentCol;
        this.respawnAreas = {[this.respawnLayer]: {respawnTilesData: {[this.respawnTileIndex]: true}}};
    }

    createPlayerBody(position)
    {
        return {
            playerId: 'session-2',
            world: {respawnAreas: this.respawnAreas},
            position,
            worldWidth: this.worldWidth,
            positionToTiles: () => this.respawnTile
        };
    }

    createAggression(inBattlePlayers, interactionRadio, startedBattles)
    {
        return new EnemyAggression({
            isAggressive: true,
            uid: 'enemy_forest_1-1',
            getInBattlePlayers: () => inBattlePlayers,
            getRespawnLayer: () => this.respawnLayer,
            getInteractionRadio: () => interactionRadio,
            getObjectBody: () => ({position: this.enemyPosition}),
            startBattle: (props) => startedBattles.push(props.bodyA.playerId)
        });
    }

    attachListener(aggression)
    {
        let listeners = [];
        aggression.attachBehaviorEvent({roomWorld: {on: (eventName, listener) => listeners.push(listener)}});
        return listeners.shift();
    }

    async testEnemyInBattleStartsNoOtherBattle()
    {
        await this.test('an aggressive enemy already in battle starts no battle with another player entering its area', async () => {
            let inBattlePlayers = {'session-1': true};
            let startedBattles = [];
            let listener = this.attachListener(this.createAggression(inBattlePlayers, this.interactionRadio, startedBattles));
            let worldEvent = {target: {bodies: [this.createPlayerBody([110, 110])]}};
            listener(worldEvent);
            this.assert.deepStrictEqual(startedBattles, []);
            delete inBattlePlayers['session-1'];
            listener(worldEvent);
            this.assert.deepStrictEqual(startedBattles, ['session-2']);
        });
    }

    async testZeroRadioAggroesOnTheWholeRespawnArea()
    {
        await this.test('an aggressive enemy with interaction radio 0 starts the battle anywhere on its respawn area', async () => {
            let farPosition = [this.enemyPosition[0] + 10 * this.interactionRadio, this.enemyPosition[1]];
            let radioBattles = [];
            this.attachListener(this.createAggression({}, this.interactionRadio, radioBattles))(
                {target: {bodies: [this.createPlayerBody(farPosition)]}}
            );
            let zeroRadioBattles = [];
            this.attachListener(this.createAggression({}, 0, zeroRadioBattles))(
                {target: {bodies: [this.createPlayerBody(farPosition)]}}
            );
            this.assert.deepStrictEqual([radioBattles, zeroRadioBattles], [[], ['session-2']]);
        });
    }

}

module.exports.TestEnemyAggression = TestEnemyAggression;
