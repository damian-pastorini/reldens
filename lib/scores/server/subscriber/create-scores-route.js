/**
 *
 * Reldens - CreateScoresRoute
 *
 * Creates an HTTP route to display the scores table as a public web page.
 * Supports pagination for browsing through the complete scores leaderboard.
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { FileHandler } = require('@reldens/server-utils');
const { PageRangeProvider, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 * @typedef {import('../../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('../scores-provider').ScoresProvider} ScoresProvider
 */
class CreateScoresRoute
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {ThemeManager|boolean} */
        this.themeManager = sc.get(props, 'themeManager', false);
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {ScoresProvider} */
        this.scoresProvider = new ScoresProvider(props);
    }

    /**
     * @param {Object} event
     * @param {string} scoresPath
     * @returns {Promise<boolean>}
     */
    async execute(event, scoresPath)
    {
        if(!event?.serverManager?.app){
            Logger.warning('Undefined app to create scores route.');
            return false;
        }
        if(!this.config){
            Logger.error('Undefined config in CreateScoresRoute.');
            return false;
        }
        if(!this.themeManager){
            Logger.error('Undefined themeManager in CreateScoresRoute.');
            return false;
        }
        event.serverManager.app.get(scoresPath, async (req, res) => {
            let pageSize = 100;
            let page = req.body.page || 1;
            let totalPages = Math.ceil(await this.scoresProvider.scoresRepository.count({}) / pageSize);
            let pagesData = PageRangeProvider.fetch(page, totalPages);
            let pages = [];
            for(let pageData of pagesData){
                pages.push({pageLabel: pageData.label, pageLink: scoresPath+'/?page='+ pageData.value});
            }
            let scores = await this.scoresProvider.fetchTopScoresMappedData(pageSize, page);
            let content = await this.themeManager.templateEngine.render(
                FileHandler.fetchFileContents(FileHandler.joinPaths(
                    this.themeManager.projectAssetsPath,
                    'features',
                    'scores',
                    'templates',
                    'ui-scores-table.html'
                )),
                {
                    scores,
                    pages,
                    showScoresTitle: true,
                    // @TODO - BETA - Apply translations.
                    scoresTitle: this.config.getWithoutLogs('server/scores/fullTableView/title', 'Scores Table')
                }
            );
            let result = await this.themeManager.templateEngine.render(
                FileHandler.fetchFileContents(FileHandler.joinPaths(
                    this.themeManager.projectAssetsPath,
                    'html',
                    'layout.html'
                )),
                {content, contentKey: 'scores-content'}
            );
            res.send(result);
        });
    }

}

module.exports.CreateScoresRoute = CreateScoresRoute;
