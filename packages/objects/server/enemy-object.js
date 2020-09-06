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
const { AttackShort } = require('../../actions/server/attack-short');
const { AttackBullet } = require('../../actions/server/attack-bullet');
const { ObjectsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class EnemyObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.hasState = true;
        this.initialStats = Object.assign({}, this.config.get('server/enemies/initialStats'));
        this.stats = Object.assign({}, this.config.get('server/enemies/initialStats'));
        this.type = ObjectsConst.TYPE_ENEMY;
        // @NOTE: we could run different actions and enemies reactions based on the player action.
        // this.runOnAction = true;
        // run on hit will make the enemy aggressive when the player enter the in the enemy-object interactive area.
        this.runOnHit = {}.hasOwnProperty.call(props, 'runOnHit') ? props.runOnHit : true;
        this.roomVisible = {}.hasOwnProperty.call(props, 'roomVisible') ? props.runOnHit : true;
        this.randomMovement = {}.hasOwnProperty.call(props, 'randomMovement') ? props.runOnHit : true;
        // assign extra public params:
        Object.assign(this.clientParams, {
            enabled: true,
            frameStart: {}.hasOwnProperty.call(props, 'frameStart') ? props.runOnHit : 0,
            frameEnd: {}.hasOwnProperty.call(props, 'frameEnd') ? props.runOnHit : 3,
            repeat: {}.hasOwnProperty.call(props, 'repeat') ? props.runOnHit : -1,
            hideOnComplete: {}.hasOwnProperty.call(props, 'hideOnComplete') ? props.runOnHit : false,
            autoStart: {}.hasOwnProperty.call(props, 'autoStart') ? props.runOnHit : true
        });
        this.battle = new Pve({
            battleTimeOff: {}.hasOwnProperty.call(props, 'battleTimeOff') ? props.battleTimeOff : 20000,
            chaseMultiple: {}.hasOwnProperty.call(props, 'chaseMultiple') ? props.chaseMultiple : false
        });
        // enemy created, setting broadcastKey:
        this.broadcastKey = this.client_key;
        this.battle.setTargetObject(this);
        // @TODO: load enemy skills from storage and implement here.
        let skillProps = {
            owner: this,
            key: 'attack-short',
            affectedProperty: 'stats/hp',
            skillDelay: 600,
            range: 50,
            hitDamage: 5,
            rangePropertyX: 'state/x',
            rangePropertyY: 'state/y'
        };
        let attackShort = new AttackShort(skillProps);
        this.actionsKeys = ['attackShort'];
        this.actions = {'attackShort': attackShort};
        if(this.config.get('server/enemies/defaultAttacks/attackBullet')){
            let attackBullet = new AttackBullet();
            attackBullet.attacker = this;
            this.actionsKeys.push('attackBullet');
            this.actions['attackBullet'] = attackBullet;
        }
        this.respawnTime = false;
        this.respawnTimer = false;
        this.respawnLayer = false;
    }

    respawn()
    {
        // @NOTE: here we move the body to some place where it can't be reach so it doesn't collide with anything, this
        // will also make it invisible because the update in the client will move the sprite outside the view.
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
        this.stats = this.initialStats;
    }

    onHit(props)
    {
        let playerBody = {}.hasOwnProperty.call(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
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
