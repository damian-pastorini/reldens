/**
 *
 * Reldens - CreateScoresRoute
 *
 * Creates an HTTP route to display the scores table as a public web page.
 * Supports pagination for browsing through the complete scores leaderboard. A page parameter that is not an integer
 * from 1 (zero, negative, decimal, not numeric or repeated) shows the first page, and a configured page size that is
 * not an integer from 1 uses the default page size. The page size and the title are read once, when the route is
 * created.
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { ScoresConst } = require('../../constants');
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
        /** @type {number} */
        this.pageSize = ScoresConst.FULL_TABLE_PAGE_SIZE;
        /** @type {string} */
        this.scoresTitle = '';
    }

    /**
     * @param {Object} event
     * @param {string} scoresPath
     * @returns {Promise<boolean>}
     */
    async execute(event, scoresPath)
    {
        if(!this.config){
            Logger.error('Undefined config in CreateScoresRoute.');
            return false;
        }
        if(!this.themeManager){
            Logger.error('Undefined themeManager in CreateScoresRoute.');
            return false;
        }
        if(!event?.serverManager?.app){
            Logger.warning('Undefined app to create scores route.');
            return false;
        }
        this.loadConfig();
        event.serverManager.app.get(scoresPath, async (req, res) => {
            let requestedPage = Number(sc.get(req.query, 'page', 1));
            let page = sc.isValidInteger(requestedPage, 1) ? requestedPage : 1;
            let totalPages = Math.ceil(await this.scoresProvider.scoresRepository.count({}) / this.pageSize);
            let pagesData = PageRangeProvider.fetch(page, totalPages);
            let pages = [];
            for(let pageData of pagesData){
                pages.push({
                    pageLabel: pageData.label,
                    pageLink: scoresPath+'/?page='+ pageData.value,
                    isCurrent: page === pageData.value
                });
            }
            let scores = await this.scoresProvider.fetchTopScoresMappedData(this.pageSize, page);
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
                    scoresTitle: this.scoresTitle
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

    /**
     * @returns {boolean|void}
     */
    loadConfig()
    {
        if(!this.config){
            return false;
        }
        let pageSize = this.config.getWithoutLogs(
            'server/scores/fullTableView/pageSize',
            ScoresConst.FULL_TABLE_PAGE_SIZE
        );
        this.pageSize = sc.isValidInteger(pageSize, 1) ? pageSize : ScoresConst.FULL_TABLE_PAGE_SIZE;
        // @TODO - BETA - Apply translations.
        this.scoresTitle = this.config.getWithoutLogs('server/scores/fullTableView/title', 'Scores Table');
    }

}

module.exports.CreateScoresRoute = CreateScoresRoute;
