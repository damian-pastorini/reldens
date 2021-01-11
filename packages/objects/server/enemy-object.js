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
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class EnemyObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.hasState = true;
        this.initialStats = Object.assign({}, this.config.get('server/enemies/initialStats'));
        this.stats = Object.assign({}, this.config.get('server/enemies/initialStats'));
        this.type = ObjectsConst.TYPE_ENEMY;
        this.eventsPrefix = 'eo';
        // @NOTE: we could run different actions and enemies reactions based on the player action.
        // this.runOnAction = true;
        // run on hit will make the enemy aggressive when the player enter the in the enemy-object interactive area.
        this.runOnHit = sc.hasOwn(props, 'runOnHit') ? props.runOnHit : true;
        this.roomVisible = sc.hasOwn(props, 'roomVisible') ? props.runOnHit : true;
        this.randomMovement = sc.hasOwn(props, 'randomMovement') ? props.runOnHit : true;
        // assign extra public params:
        Object.assign(this.clientParams, {
            enabled: true,
            frameStart: sc.hasOwn(props, 'frameStart') ? props.runOnHit : 0,
            frameEnd: sc.hasOwn(props, 'frameEnd') ? props.runOnHit : 3,
            repeat: sc.hasOwn(props, 'repeat') ? props.runOnHit : -1,
            hideOnComplete: sc.hasOwn(props, 'hideOnComplete') ? props.runOnHit : false,
            autoStart: sc.hasOwn(props, 'autoStart') ? props.runOnHit : true
        });
        this.battle = new Pve({
            battleTimeOff: sc.hasOwn(props, 'battleTimeOff') ? props.battleTimeOff : 20000,
            chaseMultiple: sc.hasOwn(props, 'chaseMultiple') ? props.chaseMultiple : false
        });
        // enemy created, setting broadcastKey:
        this.broadcastKey = this.client_key;
        this.battle.setTargetObject(this);
        // @TODO - BETA.17 - Load enemy skills from storage and implement here.
        this.setupDefaultAction();
        if(this.config.get('server/enemies/defaultAttacks/attackBullet')){
            this.setupPhysicalAction();
        }
        this.respawnTime = false;
        this.respawnTimer = false;
        this.respawnLayer = false;
    }

    setupDefaultAction()
    {
        let skillProps = {
            owner: this,
            key: 'attack-short',
            affectedProperty: 'stats/hp',
            skillDelay: 600,
            range: 50,
            hitDamage: 5,
            rangePropertyX: 'state/x',
            rangePropertyY: 'state/y',
            events: EventsManagerSingleton
        };
        let attackShort = new TypeAttack(skillProps);
        this.actionsKeys = ['attackShort'];
        this.actions = {'attackShort': attackShort};
    }
    
    setupPhysicalAction()
    {
        let attackBullet = new TypePhysicalAttack({
            owner: this,
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
            rangePropertyY: 'state/y',
            events: EventsManagerSingleton
        });
        attackBullet.attacker = this;
        this.actionsKeys.push('attackBullet');
        this.actions['attackBullet'] = attackBullet;
    }

    getBattleEndEvent()
    {
        return this.uid+'.reldens.battleEnded';
    }

    getEventRemoveKey()
    {
        return this.uid+'battleEnd';
    }

    getEventMasterKey()
    {
        return 'battleRoom';
    }

    respawn()
    {
        // @NOTE: here we move the body to some place where it can't be reach so it doesn't collide with anything, this
        // will also make it invisible because the update in the client will move the sprite outside the view.
        this.objectBody.resetAuto().stopMove();
        this.objectBody.position = [-1000, -1000];
        if(this.respawnTime){
            this.respawnTimer = setTimeout(() => {
                this.restoreObject();
            }, this.respawnTime);
        } else {
            this.restoreObject();
        }
    }

    restoreObject()
    {
        let respawnArea = this.objectBody.world.respawnAreas[this.respawnLayer];
        let randomTile = respawnArea.getRandomTile();
        let { x, y } = randomTile;
        this.objectBody.position = [x, y];
        this.objectBody.originalCol = x;
        this.objectBody.originalRow = y;
        this.stats = this.initialStats;
    }

    onHit(props)
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
