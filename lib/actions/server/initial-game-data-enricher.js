/**
 *
 * Reldens - InitialGameDataEnricher
 *
 * Enriches initial game data with class path labels for the client.
 *
 */

/**
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 */
class InitialGameDataEnricher
{

    constructor()
    {
        /** @type {Object<string, Object>|boolean} */
        this.classesData = false;
    }

    /**
     * @param {RoomScene} roomGame
     * @param {Object} superInitialGameData
     * @returns {Promise<void>}
     */
    async withClassPathLabels(roomGame, superInitialGameData)
    {
        if(!roomGame.config.skills.classPaths.classPathsByKey){
            return;
        }
        if(!this.classesData){
            let classPathsLabelsByKey = {};
            for(let i of Object.keys(roomGame.config.skills.classPaths.classPathsByKey)){
                let classPath = roomGame.config.skills.classPaths.classPathsByKey[i];
                classPathsLabelsByKey[classPath.data.id] = {key: i, label: classPath.data.label};
            }
            this.classesData = classPathsLabelsByKey;
        }
        superInitialGameData.classesData = this.classesData;
    }

}

module.exports.InitialGameDataEnricher = InitialGameDataEnricher;
