/**
 *
 * Reldens - EnemyObject
 *
 */

const { NpcObject } = require('./npc-object');
const { Pve } = require('../../../../actions/server/pve');
const { SkillsExtraDataMapper } = require('../../../../actions/server/skills-extra-data-mapper');
const { ObjectsConst } = require('../../../constants');
const { GameConst } = require('../../../../game/constants');
const { SkillConst } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

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
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.ENEMY;
        // @NOTE: we could run different actions and enemies reactions based on the player action.
        // this.runOnAction = true;
        // run on hit will make the enemy aggressive when the player enter the in the enemy-object interactive area.
        this.runOnHit = sc.get(props, 'runOnHit', true);
        this.roomVisible = sc.get(props, 'roomVisible', true);
        this.randomMovement = sc.get(props, 'randomMovement', true);
        this.startBattleOnHit = sc.get(props, 'startBattleOnHit', true);
        this.isAggressive = sc.get(props, 'isAggressive', false);
        this.interactionRadio = sc.get(props, 'interactionRadio', 0);
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
        this.enemiesDefaults = this.config.getWithoutLogs('server/enemies/default', {});
        this.defaultSkillKey = sc.get(props, 'defaultSkillKey', sc.get(this.enemiesDefaults, 'skillKey', ''));
        this.defaultSkillTarget = sc.get(
            props,
            'defaultSkillTarget',
            sc.get(this.enemiesDefaults, 'skillTarget', ObjectsConst.DEFAULTS.TARGETS.PLAYER)
        );
        this.defaultAffectedProperty = sc.get(
            props,
            'defaultAffectedProperty',
            sc.get(this.enemiesDefaults, 'affectedProperty', '')
        );
        this.setupDefaultAction();
        this.respawnTime = false;
        this.respawnTimer = false;
        this.respawnTimerInterval = false;
        this.respawnStateTimer = false;
        this.respawnLayer = false;
        this.postBroadPhaseListener = [];
        this.mapClientParams(props);
        this.mapPrivateParams(props);
        this.skillsExtraDataMapper = new SkillsExtraDataMapper();
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
            this.eventUniqueKey('battleEnd'),
            // @NOTE: objects use their uid as master key for the event listeners.
            this.uid
        );
    }

    setupAggressiveBehavior()
    {
        if(!this.isAggressive){
            return;
        }
        this.events.onWithKey(
            'reldens.sceneRoomOnCreate',
            this.attachAggressiveBehaviorEvent.bind(this),
            this.eventUniqueKey('attachAggressiveBehavior'),
            // @NOTE: objects use their uid as master key for the event listeners.
            this.uid
        );
    }

    attachAggressiveBehaviorEvent(room)
    {
        let newPostBroadPhaseListener = (event) => {
            if(0 === Object.keys(this.battle.inBattleWithPlayers).length){
                this.waitForPlayersToEnterRespawnArea(event, room);
            }
        };
        this.postBroadPhaseListener.push(newPostBroadPhaseListener);
        room.roomWorld.on('postBroadphase', newPostBroadPhaseListener);
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
            if(!body.world.respawnAreas){
                // none respawn areas in the current world:
                continue;
            }
            let respawnArea = sc.get(body.world.respawnAreas, this.respawnLayer);
            if(!respawnArea){
                continue;
            }
            let {currentCol, currentRow} = body.positionToTiles(body.position[0], body.position[1]);
            let tileIndex = currentRow * body.worldWidth + currentCol;
            if(!sc.hasOwn(respawnArea.respawnTilesData, tileIndex)){
                // tile is not part of the respawn area:
                continue;
            }
            if(!this.playerIsOnInteractionArea(body.position)){
                // interaction area is active and the distance to the player is too long:
                continue;
            }
            this.startBattleWithPlayer({bodyA: body, room: room});
        }
    }

    playerIsOnInteractionArea(playerPosition)
    {
        if(!playerPosition[0] || !playerPosition[1]){
            // if player position is invalid then we don't start the battle:
            return false;
        }
        if(0 === this.interactionRadio){
            // if none interaction radio was specified we allow the battle start:
            return true;
        }
        if(!this.objectBody || !this.objectBody?.position){
            // if the objectBody is not present then we allow the battle start:
            return true;
        }
        let distX = playerPosition[0] - this.objectBody?.position[0];
        let distY = playerPosition[1] - this.objectBody?.position[1];
        let distance = Math.sqrt(distX * distX + distY * distY);
        // check if the distance is less than or equal to the interactionRadio:
        return distance <= this.interactionRadio;
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
        let targetBody = target.physicalBody || target.objectBody;
        if(!targetBody){
            Logger.info('Target body is missing or do not have a body to be hit by a physical object.');
            return false;
        }
        if(!targetBody.world){
            Logger.error('Target body world is missing. Body ID: '+ targetBody.id);
            return false;
        }
        let thisWorldKey = this.objectBody?.world?.worldKey;
        let targetWorldKey = targetBody?.world?.worldKey;
        let enemyObjectUid = this.uid;
        if(thisWorldKey && targetWorldKey && thisWorldKey !== targetWorldKey){
            Logger.critical('Garbage enemy instance found.', {
                enemyObjectUid,
                thisWorldKey,
                targetWorldKey
            });
            return false;
        }
        let messageData = Object.assign({skillKey: executedSkill.key}, executedSkill.owner.getPosition());
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
        targetBody.world.shootBullet(from, to, executedSkill);
    }

    getSkillExtraData(params)
    {
        return this.skillsExtraDataMapper.extractSkillExtraData(params);
    }

    addSkillByKey(skillKey, skillTarget)
    {
        let skillData = this.config.skills.skillsList[skillKey];
        if(!skillData){
            return false;
        }
        let skillOwnerData = Object.assign({
            owner: this,
            ownerIdProperty: 'uid',
            eventsPrefix: this.eventsPrefix,
            affectedProperty: this.defaultAffectedProperty,
            events: this.events
        }, skillData['data']);
        let skillInstance = new skillData['class'](skillOwnerData);
        this.actionsKeys.push(skillKey);
        this.actions[skillKey] = skillInstance;
        this.actionsTargets[skillKey] = skillTarget;
        return true;
    }

    getBattleEndEvent()
    {
        return this.eventUniqueKey()+'emittedBattleEnded';
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
        let respawnStartTime = Date.now();
        this.respawnTimerInterval = setInterval(async () => {
            const elapsedTime = Date.now() - respawnStartTime;
            const remainingTime = Math.max(0, (this.respawnTime - elapsedTime) / 1000);
            Logger.debug('Respawn Object "'+this.uid+'" in: '+remainingTime.toFixed(2)+' seconds.');
            if(0 === Number(sc.numberWithDecimals(remainingTime, 0))){
                await this.respawnTimerCallback(room);
            }
        }, 1000);
        this.respawnTimer = setTimeout(async () => {
            await this.respawnTimerCallback(room);
        }, this.respawnTime);
    }

    async respawnTimerCallback(room)
    {
        clearInterval(this.respawnTimerInterval);
        await this.restoreObject(room);
    }

    async restoreObject(room)
    {
        this.stats = Object.assign({}, this.initialStats);
        if(!this.objectBody.world){
            Logger.error('ObjectBody world is null on restoreObject method for object UID: "'+this.uid+'".');
            return;
        }
        let interpolationStatus = GameConst.STATUS.AVOID_INTERPOLATION;
        this.objectBody.bodyState.inState = interpolationStatus;
        if(interpolationStatus !== this.battle.targetObject.objectBody.bodyState.inState){
            Logger.warning('Battle target object state miss match, set it to avoid interpolation.');
            this.battle.targetObject.objectBody.bodyState.inState = interpolationStatus;
        }
        if(interpolationStatus !== room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState){
            Logger.warning('Objects Manager room object state miss match, set it to avoid interpolation.');
            room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState = interpolationStatus;
        }
        let respawnArea = this.objectBody.world.respawnAreas[this.respawnLayer];
        delete respawnArea.usedTiles[this.randomTileIndex];
        let {randomTileIndex, tileData} = respawnArea.getRandomTile(this.objectIndex);
        respawnArea.usedTiles[randomTileIndex] = this.objectIndex;
        this.randomTileIndex = randomTileIndex;
        Object.assign(this, tileData);
        let { x, y } = tileData;
        this.objectBody.position = [x, y];
        this.objectBody.bodyState.x = x;
        this.objectBody.bodyState.y = y;
        let {currentCol, currentRow} = this.objectBody.positionToTiles(x, y);
        this.objectBody.originalCol = currentCol;
        this.objectBody.originalRow = currentRow;
        await this.events.emit('reldens.restoreObjectAfter', {enemyObject: this, room});
        let respawnTime = this.respawnTime || 1000;
        Logger.debug('Respawn: '+this.uid+ ' - Time: '+respawnTime+' - Position x/y: '+x+' / '+y);
        this.respawnStateTimer = setTimeout(()=> {
            Logger.debug('Activated object after respawn: '+this.uid);
            let activeStatus = GameConst.STATUS.ACTIVE;
            this.objectBody.bodyState.inState = activeStatus;
            if(activeStatus !== this.battle.targetObject.objectBody.bodyState.inState){
                Logger.warning('Battle target object state miss match, set it to active.');
                this.battle.targetObject.objectBody.bodyState.inState = activeStatus;
            }
            if(activeStatus !== room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState){
                Logger.warning('Objects Manager room object state miss match, set it to active.');
                room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState = activeStatus;
            }
        }, 1);
    }

    onHit(props)
    {
        if(!this.startBattleOnHit){
            return false;
        }
        return this.startBattleWithPlayer(props);
    }

    startBattleWithPlayer(props)
    {
        let roomScene = props.room;
        if(!roomScene){
            Logger.error('Required room not found to start battle in Object "'+this.uid+'".');
            return false;
        }
        let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
        if(!playerBody){
            // expected when object hits object on CollisionsManager, if a player wasn't hit don't start the battle:
            return false;
        }
        let playerSchema = roomScene.playerBySessionIdFromState(playerBody.playerId);
        if(!playerSchema){
            return false;
        }
        return this.battle.startBattleWith(playerSchema, props.room).catch((error) => {
            Logger.error(error);
        });
    }

    getPosition()
    {
        // @TODO - BETA - Check if we need to update and return this.x, this.y or these are just the initial position.
        return {
            x: this.state.x,
            y: this.state.y
        };
    }

    async onBattleEnd()
    {
        Logger.debug('BattleEnd method not implemented for EnemyObject.', this.uid, this.title);
    }

}

module.exports.EnemyObject = EnemyObject;
