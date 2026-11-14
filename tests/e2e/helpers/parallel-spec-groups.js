/**
 *
 * Reldens - Parallel Spec Groups
 *
 * The e2e specs groups. Every group is a Playwright project with one worker, so its specs run one after the other, it
 * logs in with its own test users set and its players start in its own room (the players reset places them on the
 * default return point of that room), so the groups never share a player or a room and run at the same time. The specs
 * that change the server wide state (the security limits, the bans, the address lists and any config value, which is
 * one server config read by every group and sent to every client that logs in), create players or use more than one
 * room run in the exclusive group, after every other group ended, and its players reset restores every room.
 * The users set 0 is the one configured in tests/config.json (root, root2 and root3), the next sets add the user number
 * to the base names (root4 to root6 and ImRoot4 to ImRoot6 for the set 1), those users are created on the setup as a
 * copy of the users set 0 (TestUsersSetup). The specs of every group are listed in ParallelSpecGroupsList.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { ParallelSpecGroupsList } = require('./parallel-spec-groups-list');

class ParallelSpecGroups
{

    static EXCLUSIVE_GROUP = 'exclusive';
    static USERS_KEYS_SUFFIXES = ['', '2', '3'];
    static DEFAULT_USERNAME = 'root';
    static DEFAULT_PLAYER_NAME = 'ImRoot';
    static SPECS_EXTENSION = '.spec.js';
    static GROUPS = ParallelSpecGroupsList;

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
        Logger.critical('E2E specs without a group in ParallelSpecGroupsList never run: '+ungroupedSpecs.join(', '));
        return false;
    }

}

module.exports.ParallelSpecGroups = ParallelSpecGroups;
