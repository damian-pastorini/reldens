/**
 *
 * Reldens - EnemyObject
 *
 * Enemy NPC with combat abilities, AI behavior, skills, and respawn mechanics.
 *
 */

const { NpcObject } = require('./npc-object');
const { Pve } = require('../../../../actions/server/pve');
const { SkillsExtraDataMapper } = require('../../../../actions/server/skills-extra-data-mapper');
const { ObjectsConst } = require('../../../constants');
const { GameConst } = require('../../../../game/constants');
const { SkillConst } = require('@reldens/skills');
const { EnemyAggression } = require('./enemy-aggression');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../../rooms/server/scene').RoomScene} RoomScene
 */
class EnemyObject extends NpcObject
{

    /**
     * @param {Object} props
     */
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
        // run on hit will make the enemy aggressive when the player enters the enemy-object interactive area.
        this.runOnHit = sc.get(props, 'runOnHit', true);
        this.roomVisible = sc.get(props, 'roomVisible', true);
        this.randomMovement = sc.get(props, 'randomMovement', true);
        this.startBattleOnHit = sc.get(props, 'startBattleOnHit', true);
        this.isAggressive = sc.get(this, 'isAggressive', false);
        this.interactionRadio = sc.get(this, 'interactionRadio', 0);
        this.updateInitialPosition = sc.get(
            props,
            'updateInitialPosition',
            this.config.getWithoutLogs('server/enemies/updateInitialPosition', true)
        );
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
        this.respawnStateTime = sc.get(props, 'battleTimeOff', 1000);
        this.respawnLayer = false;
        this.aggression = new EnemyAggression({
            isAggressive: this.isAggressive,
            events: this.events,
            uid: this.uid,
            eventUniqueKeyFn: this.eventUniqueKey.bind(this),
            getInBattlePlayers: () => this.battle.inBattleWithPlayers,
            getRespawnLayer: () => this.respawnLayer,
            getInteractionRadio: () => this.interactionRadio,
            getObjectBody: () => this.objectBody,
            startBattle: this.startBattleWithPlayer.bind(this)
        });
        this.mapClientParams(props);
        this.mapPrivateParams(props);
        this.skillsExtraDataMapper = new SkillsExtraDataMapper();
    }
    /**
     * @returns {Promise<void>}
     */
    async runAdditionalRespawnSetup()
    {
        // @NOTE: this will load the object skills every time the instance is created, it can be refactored for
        // performance, but at the same time it could make easier to hot-plug new skills on an object.
        await this.setupActions();
        this.aggression.setup();
        this.events.onWithKey(
            this.getBattleEndEvent(),
            await this.onBattleEnd.bind(this),
            this.eventUniqueKey('battleEnd'),
            // @NOTE: objects use their uid as a master key for the event listeners.
            this.uid
        );
    }

    setupDefaultAction()
    {
        if('' === this.defaultSkillKey){
            return;
        }
        this.addSkillByKey(this.defaultSkillKey, this.defaultSkillTarget);
    }

    /**
     * @returns {Promise<void>}
     */
    async setupActions()
    {
        let objectSkills = await this.dataServer.getEntity('objectsSkills').loadByWithRelations(
            'object_id',
            this.id,
            ['related_skills_skill']
        );
        if(!objectSkills){
            return;
        }
        for(let objectSkill of objectSkills){
            if(!objectSkill.related_skills_skill?.key){
                Logger.error('Object skill not found.', objectSkill);
                continue;
            }
            let addSkillResult = this.addSkillByKey(objectSkill.related_skills_skill.key, objectSkill.target);
            if(false === addSkillResult){
                Logger.error('Could not add a "'+objectSkill.related_skills_skill.key+'" skill to object id: '+this.id);
            }
        }
        await this.events.emit('reldens.setupActions', {enemyObject: this});
    }

    /**
     * @param {Object} target
     * @param {Object} executedSkill
     * @returns {Promise<boolean|undefined>}
     */
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

    /**
     * @param {Object} params
     * @returns {Object}
     */
    getSkillExtraData(params)
    {
        return this.skillsExtraDataMapper.extractSkillExtraData(params);
    }

    /**
     * @param {string} skillKey
     * @param {string} skillTarget
     * @returns {boolean}
     */
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

    /**
     * @returns {string}
     */
    getBattleEndEvent()
    {
        return this.eventUniqueKey()+'emittedBattleEnded';
    }

    /**
     * @param {RoomScene} room
     * @returns {Promise<Object|undefined>}
     */
    async respawn(room)
    {
        // @TODO - BETA - Add respawn to the other object types as well, we could have normal NPCs with respawn.
        // @NOTE: here we move the body to some place where it can't be reach so it doesn't collide with anything, this
        // will also make it invisible because the update in the client will move the sprite outside the view.
        this.objectBody.resetAuto();
        this.objectBody.stopMove();
        this.objectBody.collisionResponse = false;
        this.originalType = this.objectBody.type;
        this.objectBody.type = this.objectBody.world.bodyTypes.STATIC;
        return this.respawnBehavior.execute(room);
    }

    /**
     * @param {RoomScene} room
     */
    onBeforeRestore(room)
    {
        this.objectBody.collisionResponse = true;
        this.objectBody.type = this.originalType || this.objectBody.world.bodyTypes.DYNAMIC;
        this.stats = Object.assign({}, this.initialStats);
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
    }

    /**
     * @param {Object} room
     * @returns {Promise<void>}
     */
    async onAfterRestore(room)
    {
        await this.events.emit('reldens.restoreObjectAfter', {enemyObject: this, room});
    }

    /**
     * @param {RoomScene} room
     */
    onSetActive(room)
    {
        let activeStatus = GameConst.STATUS.ACTIVE;
        if(this.battle.targetObject && activeStatus !== this.battle.targetObject.objectBody?.bodyState?.inState){
            Logger.warning('Battle target object state miss match, set it to active.');
            this.battle.targetObject.objectBody.bodyState.inState = activeStatus;
        }
        if(
            room?.objectsManager?.roomObjects
            && room.objectsManager.roomObjects[this.objectIndex]
            && room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState
            && activeStatus !== room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState
        ){
            Logger.warning('Objects Manager room object state miss match, set it to active.');
            room.objectsManager.roomObjects[this.objectIndex].objectBody.bodyState.inState = activeStatus;
        }
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>|boolean}
     */
    onHit(props)
    {
        if(!this.startBattleOnHit){
            return false;
        }
        return this.startBattleWithPlayer(props);
    }

    /**
     * @param {Object} props
     * @returns {Promise<Object>|boolean}
     */
    startBattleWithPlayer(props)
    {
        let room = props.room;
        if(!room){
            Logger.error('Required room not found to start battle in Object "'+this.uid+'".');
            return false;
        }
        let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
        if(!playerBody){
            // expected when an object hits object on CollisionsManager, if a player wasn't hit don't start the battle:
            return false;
        }
        let playerSchema = room.playerBySessionIdFromState(playerBody.playerId);
        if(!playerSchema){
            return false;
        }
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty', this.defaultAffectedProperty);
        if(0 === this.stats[affectedProperty]){
            //Logger.debug('Object is death, do not run battle.', this.uid);
            // do not start the battle if the object is death:
            return false;
        }
        return this.battle.startBattleWith(playerSchema, props.room).catch((error) => {
            Logger.error(error);
        });
    }

    /**
     * @returns {Object}
     */
    getPosition()
    {
        // @TODO - BETA - Check if we need to update and return this.x, this.y or these are just the initial position.
        return {
            x: this.state.x,
            y: this.state.y
        };
    }

    /**
     * @returns {Promise<void>}
     */
    async onBattleEnd()
    {
        Logger.notice('BattleEnd method not implemented for EnemyObject.', this.uid, this.title);
    }

}

module.exports.EnemyObject = EnemyObject;
