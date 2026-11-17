/**
 *
 * Reldens - Player Level Steps
 *
 * The steps of the specs with the player class path levels: the class path level and experience of a player set for the
 * group before its login (its skills_owners_class_path row preserved), the stored class path data of a player (its
 * class path, the levels of its levels set sorted by key, the labels and the skills by level), the live level data read
 * from the server, and the level, experience, next level experience and class path label texts shown in the client,
 * expected from the live level data and the actions snippets.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { ActionsConst } = require('../../../lib/actions/constants');
const ActionsTranslations = require('../../../lib/actions/client/snippets/en_US');

class PlayerLevelSteps
{

    static async setClassPathLevel(gameConfig, group, level, experience, playerName = gameConfig.e2ePlayerName)
    {
        let ownerFilter = {owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})};
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, group, 'skillsOwnersClassPath', ownerFilter, {
            currentLevel: level,
            currentExp: experience
        });
        return ownerFilter;
    }

    static async loadClassPathData(gameConfig, playerName = gameConfig.e2ePlayerName)
    {
        let ownerRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsOwnersClassPath', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})
        })].shift();
        expect(ownerRow, 'The class path of '+playerName+' must be stored').toBeTruthy();
        let classPath = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsClassPath', {id: ownerRow.class_path_id})]
            .shift();
        let classPathData = {ownerRow, classPath};
        classPathData.levels = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsLevels', {
            level_set_id: classPath.levels_set_id
        })).sort((levelA, levelB) => Number(levelA.key) - Number(levelB.key));
        classPathData.labels = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsClassPathLevelLabels', {
            class_path_id: classPath.id
        });
        classPathData.levelSkills = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsClassPathLevelSkills', {
            class_path_id: classPath.id
        });
        return classPathData;
    }

    static async fetchLiveLevel(gameConfig, roomName = Login.FOREST_ROOM_NAME)
    {
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        expect(player.level, 'The level of '+gameConfig.e2ePlayerName+' must be read: '+player.error).toBeGreaterThan(0);
        return player;
    }

    static async fetchShownLevel(page)
    {
        return await page.evaluate((selectors) => Object.fromEntries(Object.keys(selectors).map(
            textKey => [textKey, (document.querySelector(selectors[textKey])?.textContent || '').trim()]
        )), {
            level: ActionsConst.SELECTORS.LEVEL_LABEL,
            experience: ActionsConst.SELECTORS.CURRENT_EXPERIENCE,
            nextLevelExperience: ActionsConst.SELECTORS.NEXT_LEVEL_EXPERIENCE,
            classPathLabel: ActionsConst.SELECTORS.CLASS_PATH_LABEL
        });
    }

    static expectedShownLevel(player)
    {
        return {
            level: ActionsTranslations.actions.currentLevel.replace('%currentLevel', player.level),
            experience: ActionsTranslations.actions.experience.replace('%experience', player.experience),
            nextLevelExperience: ActionsTranslations.actions.nextLevelExperience.replace(
                '%nextLevelExperience',
                player.nextLevelExperience
            ),
            classPathLabel: ActionsTranslations.actions.classPathLabel.replace('%classPathLabel', player.classPathLabel)
        };
    }

    static async expectShownLevel(page, player, message)
    {
        await expect.poll(
            async () => await PlayerLevelSteps.fetchShownLevel(page),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(PlayerLevelSteps.expectedShownLevel(player));
    }

}

module.exports.PlayerLevelSteps = PlayerLevelSteps;
