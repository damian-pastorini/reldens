/**
 *
 * Reldens - Loaded Config Reloader
 *
 * Reads again the config values the running server reads only once (the config rows are never hot plugged, a server
 * restart applies them), run by the e2e endpoints after every config override and restore: the death relocator, the
 * rooms auto recovery, the kill score subscriber, the scores page size and title, the player creation (the player name
 * lengths and the rooms selection), created again with the new values, the rooms server validation flag of every
 * defined room (RoomsServerValidationFlagRefresher, the next instance gets it like on a restart), the teams plugin values (the teams and clan shared properties, also on their cross server syncs, and the clan name
 * limit and starting points, read again for the next team, clan and update),
 * and the game over time of the live enemy and player battles (BattlesLoadedConfig) and the resurrection ad gate values
 * (ResurrectionAdLoadedConfig), like the restart that loads them. The reload answers its summary for the caller log.
 *
 */

const { BattlesLoadedConfig } = require('./battles-loaded-config');
const { ResurrectionAdLoadedConfig } = require('./resurrection-ad-loaded-config');
const { RoomsServerValidationFlagRefresher } = require('./rooms-server-validation-flag-refresher');
const { IncreaseScoreOnKill } = require('../../../lib/scores/server/subscriber/increase-score-on-kill');
const { TeamsConst } = require('../../../lib/teams/constants');
const { sc } = require('@reldens/utils');

class LoadedConfigReloader
{

    static async reload(serverManager)
    {
        let actionsPlugin = serverManager.featuresManager.featuresList.actions.package;
        await actionsPlugin.playerDeathRelocator.loadTownRoom(serverManager.roomsManager);
        actionsPlugin.playerDeathRelocator.loadConfig();
        actionsPlugin.roomAutoRecovery.loadConfig();
        let scoresPlugin = serverManager.featuresManager.featuresList.scores.package;
        scoresPlugin.increaseScoreOnKill = new IncreaseScoreOnKill({
            config: scoresPlugin.config,
            dataServer: scoresPlugin.dataServer
        });
        scoresPlugin.createScoresRoute.loadConfig();
        serverManager.loginManager.playerCreation = serverManager.loginManager.createPlayerCreation();
        let updatedBattles = BattlesLoadedConfig.applyGameOverTimeOut(serverManager);
        let isGateUpdated = ResurrectionAdLoadedConfig.applyGateValues(serverManager);
        RoomsServerValidationFlagRefresher.apply(serverManager);
        LoadedConfigReloader.applyClanSettings(serverManager);
        return 'E2e loaded config reload: '+updatedBattles+' live battles, resurrection ad gate: '+isGateUpdated;
    }

    static applyClanSettings(serverManager)
    {
        let teamsPlugin = sc.getByPath(serverManager.featuresManager.featuresList, ['teams', 'package'], false);
        if(!teamsPlugin){
            return;
        }
        let configManager = serverManager.configManager;
        teamsPlugin.teamsSharedProperties = configManager.getWithoutLogs('client/ui/teams/sharedProperties', {});
        teamsPlugin.teamCrossServerStateSync.sharedProperties = teamsPlugin.teamsSharedProperties;
        teamsPlugin.clanSharedProperties = configManager.getWithoutLogs('client/ui/clan/sharedProperties', {});
        teamsPlugin.clanCrossServerStateSync.sharedProperties = teamsPlugin.clanSharedProperties;
        teamsPlugin.clanNameLimit = configManager.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT);
        teamsPlugin.clanStartingPoints = configManager.getWithoutLogs(
            'server/clan/settings/startingPoints',
            TeamsConst.CLAN_STARTING_POINTS
        );
    }

}

module.exports.LoadedConfigReloader = LoadedConfigReloader;
