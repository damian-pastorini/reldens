/**
 *
 * Reldens - Parallel Spec Groups
 *
 * The e2e specs groups. Every group is a Playwright project with one worker, so its specs run one after the other, it
 * logs in with its own test users set and its players start in its own room (the players reset places them on the
 * default return point of that room), so the groups never share a player or a room and run at the same time. The specs
 * that change the server wide state (the security limits, the bans and the address lists), create players or use more
 * than one room run in the exclusive group, after every other group ended, and its players reset restores every room.
 * The users set 0 is the one configured in tests/config.json (root, root2 and root3), the next sets add the user number
 * to the base names (root4 to root6 and ImRoot4 to ImRoot6 for the set 1), those users are created on the setup as a
 * copy of the users set 0 (TestUsersSetup).
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { Login } = require('./login');

class ParallelSpecGroups
{

    static EXCLUSIVE_GROUP = 'exclusive';
    static SOCIAL_ROOM_NAME = 'reldens-new-age-town-house-01';
    static USERS_KEYS_SUFFIXES = ['', '2', '3'];
    static DEFAULT_USERNAME = 'root';
    static DEFAULT_PLAYER_NAME = 'ImRoot';
    static SPECS_EXTENSION = '.spec.js';
    static GROUPS = {
        world: {
            usersSet: 0,
            startRoomName: Login.TOWN_ROOM_NAME,
            resetsEveryRoom: false,
            specs: [
                'test-npc.spec.js',
                'test-player-pathfinding-collisions.spec.js',
                'test-object-pathfinding-collisions.spec.js'
            ]
        },
        forest: {
            usersSet: 1,
            startRoomName: Login.FOREST_ROOM_NAME,
            resetsEveryRoom: false,
            specs: [
                'test-combat.spec.js',
                'test-stats.spec.js',
                'test-interactive-objects.spec.js',
                'test-timing-objects-cancel.spec.js',
                'test-objects-movement.spec.js',
                'test-object-animation-frame-ranges.spec.js'
            ]
        },
        social: {
            usersSet: 2,
            startRoomName: ParallelSpecGroups.SOCIAL_ROOM_NAME,
            resetsEveryRoom: false,
            specs: [
                'test-chat.spec.js',
                'test-teams.spec.js',
                'test-clans.spec.js',
                'test-trading.spec.js',
                'test-items.spec.js',
                'test-rewards.spec.js',
                'test-scores.spec.js',
                'test-locale-selector.spec.js',
                'test-quests-tracking.spec.js',
                'test-game-login.spec.js'
            ]
        },
        exclusive: {
            usersSet: 0,
            startRoomName: Login.TOWN_ROOM_NAME,
            resetsEveryRoom: true,
            specs: [
                'test-admin-security.spec.js',
                'test-login-security.spec.js',
                'test-authentication.spec.js',
                'test-character-system.spec.js',
                'test-movement.spec.js'
            ]
        }
    };

    static fetchGroup(groupKey)
    {
        return sc.get(
            ParallelSpecGroups.GROUPS,
            groupKey,
            ParallelSpecGroups.GROUPS[ParallelSpecGroups.EXCLUSIVE_GROUP]
        );
    }

    static fetchSetUsers(config, usersSet)
    {
        return ParallelSpecGroups.USERS_KEYS_SUFFIXES.map((keySuffix, baseSlot) => ({
            keySuffix,
            baseSlot,
            username: ParallelSpecGroups.fetchUserValue(
                config,
                {key: 'e2eUsername', defaultValue: ParallelSpecGroups.DEFAULT_USERNAME},
                usersSet,
                baseSlot
            ),
            playerName: ParallelSpecGroups.fetchUserValue(
                config,
                {key: 'e2ePlayerName', defaultValue: ParallelSpecGroups.DEFAULT_PLAYER_NAME},
                usersSet,
                baseSlot
            )
        }));
    }

    static fetchUserValue(config, configField, usersSet, baseSlot)
    {
        let baseValue = sc.get(config, configField.key, configField.defaultValue);
        let keySuffix = ParallelSpecGroups.USERS_KEYS_SUFFIXES[baseSlot];
        if(0 === usersSet){
            return sc.get(config, configField.key+keySuffix, baseValue+keySuffix);
        }
        return baseValue+(usersSet * ParallelSpecGroups.USERS_KEYS_SUFFIXES.length + baseSlot + 1);
    }

    static fetchUsersSets()
    {
        return [...new Set(Object.keys(ParallelSpecGroups.GROUPS).map(
            groupKey => ParallelSpecGroups.GROUPS[groupKey].usersSet
        ))];
    }

    static fetchAllUsers(config)
    {
        return ParallelSpecGroups.fetchUsersSets().flatMap(
            usersSet => ParallelSpecGroups.fetchSetUsers(config, usersSet)
        );
    }

    static buildGroupConfig(config, groupKey)
    {
        let groupConfig = {...config};
        for(let user of ParallelSpecGroups.fetchSetUsers(config, ParallelSpecGroups.fetchGroup(groupKey).usersSet)){
            groupConfig['e2eUsername'+user.keySuffix] = user.username;
            groupConfig['e2ePlayerName'+user.keySuffix] = user.playerName;
        }
        return groupConfig;
    }

    static buildProjects()
    {
        return Object.keys(ParallelSpecGroups.GROUPS).map(groupKey => ({
            name: groupKey,
            testMatch: ParallelSpecGroups.GROUPS[groupKey].specs.map(specFile => '**/'+specFile),
            workers: 1,
            dependencies: ParallelSpecGroups.EXCLUSIVE_GROUP === groupKey
                ? Object.keys(ParallelSpecGroups.GROUPS).filter(
                    dependencyKey => ParallelSpecGroups.EXCLUSIVE_GROUP !== dependencyKey
                )
                : [],
            use: {e2eGroup: groupKey}
        }));
    }

    static validateSpecsGroups(specsFolder)
    {
        let groupedSpecs = Object.keys(ParallelSpecGroups.GROUPS).flatMap(
            groupKey => ParallelSpecGroups.GROUPS[groupKey].specs
        );
        let ungroupedSpecs = FileHandler.getFilesInFolder(specsFolder, [ParallelSpecGroups.SPECS_EXTENSION]).filter(
            specFile => !groupedSpecs.includes(specFile)
        );
        if(0 === ungroupedSpecs.length){
            return true;
        }
        Logger.critical('E2E specs without a group in ParallelSpecGroups.GROUPS never run: '+ungroupedSpecs.join(', '));
        return false;
    }

}

module.exports.ParallelSpecGroups = ParallelSpecGroups;
