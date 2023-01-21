/**
 *
 * Reldens - EnemyObject
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 * The main point here is that this is just and example, and you could even create several NPCs and make them run any
 * kind of actions at any time.
 *
 */

const { NpcObject } = require('./npc-object');
const { Pve } = require('../../../../actions/server/pve');
const { ObjectsConst } = require('../../../constants');
const { GameConst } = require('../../../../game/constants');
const { Logger, sc } = require('@reldens/utils');
const { SkillConst } = require('@reldens/skills');
const { SkillsExtraData } = require('../../../../actions/server/skills/skills-extra-data');

class EnemyObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.hasState = true;
        let configStats = sc.get(props, 'initialStats', this.config.get('server/enemies/initialStats'));
        this.initialStats = Object.assign({}, configStats);
        this.stats = Object.assign({}, configStats);
        this.statsBase = Object.assign({}, configStats);
        this.type = ObjectsConst.TYPE_ENEMY;
        this.eventsPrefix = 'eo';
        // @NOTE: we could run different actions and enemies reactions based on the player action.
        // this.runOnAction = true;
        // run on hit will make the enemy aggressive when the player enter the in the enemy-object interactive area.
        this.runOnHit = sc.get(props, 'runOnHit', true);
        this.roomVisible = sc.get(props, 'roomVisible', true);
        this.randomMovement = sc.get(props, 'randomMovement', true);
        this.startBattleOnHit = sc.get(props, 'startBattleOnHit', true);
        this.isAggressive = sc.get(props, 'isAggressive', false);
        this.battle = new Pve({
            battleTimeOff: sc.get(props, 'battleTimeOff', 20000),
            chaseMultiple: sc.get(props, 'chaseMultiple', false),
            events: this.events
        });
        // enemy created, setting broadcastKey:
        this.broadcastKey = this.client_key;
        this.battle.setTargetObject(this);
        this.actionsKeys = [];
        this.actionsTargets = {};
        this.actions = {};
        this.defaultSkillKey = sc.get(
            props,
            'defaultSkillKey',
            this.config.get('server/enemies/default/skillKey', '')
        );
        this.defaultSkillTarget = sc.get(
            props,
            'defaultSkillTarget',
            this.config.getWithoutLogs('server/enemies/default/skillTarget', ObjectsConst.DEFAULTS.TARGETS.PLAYER)
        );
        this.defaultAffectedProperty = sc.get(
            props,
            'defaultAffectedProperty',
            this.config.get('server/enemies/default/affectedProperty', '')
        );
        this.setupDefaultAction();
        this.respawnTime = false;
        this.respawnTimer = false;
        this.respawnLayer = false;
        this.mapClientParams(props);
        this.mapPrivateParams(props);
    }

    async runAdditionalRespawnSetup()
    {
        // @NOTE: this will load the object skills every time the instance is created, it can be refactored for
        // performance, but at the same time it could make easier to hot-plug new skills on an object.
        await this.setupActions();
        this.setupAggressiveBehavior();
        this.events.onWithKey(
            this.getBattleEndEvent(),
            await this.onBattleEnd.bind(this),
            this.getEventRemoveKey(),
            this.getEventMasterKey()
        );
        let dataArr = this.events.listeners('reldens.battleEnded');
        this.battleEndListener = dataArr[dataArr.length -1];
    }

    setupAggressiveBehavior()
    {
        if(!this.isAggressive){
            return;
        }
        this.events.on('reldens.sceneRoomOnCreate', (room) => {
            room.roomWorld.on('postBroadphase', (event) => {
                if(0 === this.battle.inBattleWithPlayer.length){
                    this.waitForPlayersToEnterRespawnArea(event, room);
                }
            });
        });
    }

    waitForPlayersToEnterRespawnArea(event, room)
    {
        if(0 === event.target.bodies.length){
            return;
        }
        for(let body of event.target.bodies){
            if(!body.playerId){
                continue;
            }
            if(!body.world){
                Logger.error('Body world is null.', body.id);
                continue;
            }
            let {currentCol, currentRow} = body.positionToTiles(body.position[0], body.position[1]);
            let tileIndex = currentRow * body.worldWidth + currentCol;
            let respawnArea = body.world.respawnAreas[this.respawnLayer];
            if(respawnArea && sc.hasOwn(respawnArea.respawnTilesData, tileIndex)){
                this.startBattleWithPlayer({bodyA: body, room: room});
            }
        }
    }

    setupDefaultAction()
    {
        if('' === this.defaultSkillKey){
            return;
        }
        this.addSkillByKey(this.defaultSkillKey, this.defaultSkillTarget);
    }

    async setupActions()
    {
        let objectSkills = await this.dataServer.getEntity('objectsSkills').loadByWithRelations(
            'object_id',
            this.id,
            ['skill']
        );
        if(!objectSkills){
            return;
        }
        for(let objectSkill of objectSkills){
            if(!objectSkill.skill?.key){
                Logger.error('Object skill not found.', objectSkill);
                continue;
            }
            let addSkillResult = this.addSkillByKey(objectSkill.skill.key, objectSkill.target);
            if(false === addSkillResult){
                Logger.error('Could not add a "'+objectSkill.skill.key+'" skill to object id: '+this.id);
            }
        }
        await this.events.emit('reldens.setupActions', {enemyObject: this});
    }

    async executePhysicalSkill(target, executedSkill)
    {
        let messageData = Object.assign({
                skillKey: executedSkill.key
            },
            executedSkill.owner.getPosition()
        );
        if(sc.isObjectFunction(executedSkill.owner, 'getSkillExtraData')){
            let params = {skill: executedSkill, target};
            Object.assign(messageData, {extraData: executedSkill.owner.getSkillExtraData(params)});
        }
        await target.skillsServer.client.runBehaviors(
            messageData,
            SkillConst.ACTION_SKILL_AFTER_CAST,
            SkillConst.BEHAVIOR_BROADCAST,
            target.player_id
        );
        let from = this.getPosition();
        executedSkill.initialPosition = from;
        let to = {x: target.state.x, y: target.state.y};
        let animData = sc.get(this.config.client.skills.animations, executedSkill.key+'_bullet', false);
        if(animData){
            executedSkill.animDir = sc.get(animData.animationData, 'dir', false);
        }
        // player disconnection would cause the physicalBody to be removed, so we need to validate it:
        let targetBody = target.physicalBody || target.objectBody;
        if(targetBody){
            if(!targetBody.world){
                Logger.error('PhysicalBody world is null.', targetBody.id);
                return false;
            }
            targetBody.world.shootBullet(from, to, executedSkill);
        }
        return false;
    }

    getSkillExtraData(params)
    {
        return SkillsExtraData.extractSkillExtraData(params);
    }

    addSkillByKey(skillKey, skillTarget)
    {
        let skillData = this.config.skills.skillsList[skillKey];
        if(!skillData){
            return false;
        }
        let skillInstance = new skillData['class'](
            Object.assign(
                {
                    owner: this,
                    ownerIdProperty: 'uid',
                    affectedProperty: this.defaultAffectedProperty,
                    events: this.events
                },
                skillData['data']
            )
        );
        this.actionsKeys.push(skillKey);
        this.actions[skillKey] = skillInstance;
        this.actionsTargets[skillKey] = skillTarget;
        return true;
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

    async respawn(room)
    {
        // @NOTE: here we move the body to some place where it can't be reach so it doesn't collide with anything, this
        // will also make it invisible because the update in the client will move the sprite outside the view.
        this.objectBody.resetAuto();
        this.objectBody.stopMove();
        this.objectBody.position = [-1000, -1000];
        if(this.respawnTime){
            return this.restoreOnTimeOut(room);
        }
        return await this.restoreObject(room);
    }

    restoreOnTimeOut(room)
    {
        this.respawnTimer = setTimeout(async () => {
            await this.restoreObject(room);
        }, this.respawnTime*0.9);
    }

    async restoreObject(room)
    {
        this.stats = Object.assign({}, this.initialStats);
        if(!this.objectBody.world){
            Logger.error('ObjectBody world is null on restoreObject method.', this.objectBody.id);
            return;
        }
        this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION;
        let respawnArea = this.objectBody.world.respawnAreas[this.respawnLayer];
        delete respawnArea.usedTiles[this.randomTileIndex];
        let {randomTileIndex, tileData} = respawnArea.getRandomTile(this.objectIndex);
        respawnArea.usedTiles[randomTileIndex] = this.objectIndex;
        this.randomTileIndex = randomTileIndex;
        Object.assign(this, tileData);
        let { x, y } = tileData;
        this.objectBody.position = [x, y];
        this.objectBody.originalCol = x;
        this.objectBody.originalRow = y;
        this.objectBody.bodyState.x = x;
        this.objectBody.bodyState.y = y;
        await this.events.emit('reldens.restoreObjectAfter', {enemyObject: this, room});
        setTimeout(()=> {
            this.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE;
        }, (this.respawnTime || 1000)*0.1);
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
            // if the player hit the enemy then it will start the battle with the player because this will be an
            // aggressive enemy.
            this.battle.startBattleWith(playerSchema, props.room).catch((err) => {
                Logger.error(err);
            });
        }
    }

    getPosition()
    {
        return {
            x: this.state.x,
            y: this.state.y
        };
    }

}

module.exports.EnemyObject = EnemyObject;
