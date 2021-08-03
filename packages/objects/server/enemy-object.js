/**
 *
 * Reldens - EnemyObject
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 * The main point here is that this is just and example, and you could even create several NPCs and make them run any
 * kind of actions at any time. Here you can see a simple message but it could do literally anything.
 *
 */

const { NpcObject } = require('./npc-object');
const { Pve } = require('../../actions/server/pve');
const { TypeAttack, TypePhysicalAttack } = require('../../actions/server/skills/types');
const { ObjectsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class EnemyObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.hasState = true;
        // @TODO - BETA - Remove from config and make enemy stats load dynamically (passed on props from storage).
        let configStats = sc.getDef(props, 'initialStats', this.config.get('server/enemies/initialStats'));
        this.initialStats = Object.assign({}, configStats);
        this.stats = Object.assign({}, configStats);
        this.type = ObjectsConst.TYPE_ENEMY;
        this.eventsPrefix = 'eo';
        // @NOTE: we could run different actions and enemies reactions based on the player action.
        // this.runOnAction = true;
        // run on hit will make the enemy aggressive when the player enter the in the enemy-object interactive area.
        this.runOnHit = sc.getDef(props, 'runOnHit', true);
        this.roomVisible = sc.getDef(props, 'roomVisible', true);
        this.randomMovement = sc.getDef(props, 'randomMovement', true);
        this.startBattleOnHit = sc.getDef(props, 'startBattleOnHit', true);
        this.isAggressive = sc.getDef(props, 'isAggressive', false);
        this.battle = new Pve({
            battleTimeOff: sc.getDef(props, 'battleTimeOff', 20000),
            chaseMultiple: sc.getDef(props, 'chaseMultiple', false),
            events: this.events
        });
        // enemy created, setting broadcastKey:
        this.broadcastKey = this.client_key;
        this.battle.setTargetObject(this);
        // @TODO - BETA - Load enemy skills from storage and implement here.
        this.setupDefaultAction();
        if(this.config.get('server/enemies/defaultAttacks/attackBullet')){
            this.setupPhysicalAction();
        }
        this.respawnTime = false;
        this.respawnTimer = false;
        this.respawnLayer = false;
    }

    runAdditionalSetup()
    {
        super.runAdditionalSetup();
        if(!this.isAggressive){
            return;
        }
        this.events.on('reldens.sceneRoomOnCreate', (room) => {
            room.roomWorld.on('postBroadphase', (event) => {
                if(!this.battle.inBattleWithPlayer.length){
                    this.waitForPlayersToEnterRespawnArea(event, room);
                }
            });
        });
    }

    waitForPlayersToEnterRespawnArea(event, room)
    {
        for(let body of event.target.bodies){
            if(body.playerId){
                let {currentCol, currentRow} = body.positionToTiles(body.position[0], body.position[1]);
                let tileIndex = currentRow * body.worldWidth + currentCol;
                let respawnArea = body.world.respawnAreas[this.respawnLayer];
                if(respawnArea && sc.hasOwn(respawnArea.respawnTilesData, tileIndex)){
                    this.startBattleWithPlayer({bodyA: body, room: room});
                }
            }
        }
    }

    setupDefaultAction()
    {
        // @TODO - BETA - Replace by skill reference.
        let skillProps = {
            owner: this,
            key: 'attackShort',
            affectedProperty: 'stats/hp',
            skillDelay: 600,
            range: 50,
            hitDamage: 5,
            rangePropertyX: 'state/x',
            rangePropertyY: 'state/y',
            events: this.events
        };
        let attackShort = new TypeAttack(skillProps);
        this.actionsKeys = ['attackShort'];
        this.actions = {'attackShort': attackShort};
    }
    
    setupPhysicalAction()
    {
        let attackBullet = new TypePhysicalAttack({
            owner: this,
            key: 'attackBullet',
            affectedProperty: 'stats/hp',
            skillDelay: 1000,
            range: 250,
            hitDamage: 3,
            hitPriority: 2,
            magnitude: 350,
            objectWidth: 5,
            objectHeight: 5,
            rangePropertyX: 'state/x',
            rangePropertyY: 'state/y',
            events: this.events
        });
        attackBullet.attacker = this;
        this.actionsKeys.push('attackBullet');
        this.actions['attackBullet'] = attackBullet;
    }

    getBattleEndEvent()
    {
        return this.key+'.reldens.battleEnded';
    }

    getEventRemoveKey()
    {
        return this.key+'battleEnd';
    }

    getEventMasterKey()
    {
        return 'battleRoom';
    }

    respawn(room)
    {
        // @NOTE: here we move the body to some place where it can't be reach so it doesn't collide with anything, this
        // will also make it invisible because the update in the client will move the sprite outside the view.
        this.objectBody.resetAuto().stopMove();
        this.objectBody.position = [-1000, -1000];
        if(this.respawnTime){
            this.respawnTimer = setTimeout(async () => {
                this.restoreObject(room);
            }, this.respawnTime);
        } else {
            this.restoreObject(room);
        }
    }

    restoreObject(room)
    {
        this.stats = Object.assign({}, this.initialStats);
        this.inState = GameConst.STATUS.ACTIVE;
        let respawnArea = this.objectBody.world.respawnAreas[this.respawnLayer];
        let randomTile = respawnArea.getRandomTile();
        let { x, y } = randomTile;
        this.objectBody.position = [x, y];
        this.objectBody.originalCol = x;
        this.objectBody.originalRow = y;
        // @TODO - BETA - Fix this! My eyes are bleeding...
        room.objectsManager.objectsAnimationsData[this.key].x = x;
        room.objectsManager.objectsAnimationsData[this.key].y = y;
        room.objectsManager.roomObjects[this.key].x = x;
        room.objectsManager.roomObjects[this.key].y = y;
        // this is the real fix, update the room scene data which is the data sent to the client on join:
        let roomSceneData = JSON.parse(room.state.sceneData);
        roomSceneData.objectsAnimationsData[this.key].x = x;
        roomSceneData.objectsAnimationsData[this.key].y = y;
        room.state.sceneData = JSON.stringify(roomSceneData);
        this.x = x;
        this.y = y;
        this.events.emit('reldens.restoreObjectAfter', {enemyObject: this, room});
    }

    onHit(props)
    {
        if(this.startBattleOnHit){
            this.startBattleWithPlayer(props);
        }
    }

    startBattleWithPlayer(props)
    {
        let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
        if(!props.room || !playerBody){
            // this shouldn't happen :P
            Logger.error('Required properties room and playerBody not found.');
            return;
        }
        let roomScene = props.room;
        let playerSchema = roomScene.getPlayerFromState(playerBody.playerId);
        if(playerSchema){
            // it the player hit the enemy then it will start the battle with the player because this will be an
            // aggressive enemy.
            this.battle.startBattleWith(playerSchema, props.room).catch((err) => {
                Logger.error(err);
            });
        }
    }

}

module.exports.EnemyObject = EnemyObject;
