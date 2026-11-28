/**
 *
 * Reldens - Test Theme Manager Build CSS Copies To Dist
 *
 * Tests ThemeManager.buildCss with a stub CSS bundler over a temporary project: the built styles.css is copied into
 * the dist CSS folder when the dist has none and replaces an existing dist styles.css on the next build, so a rebuilt
 * theme style always reaches the game (ISSUE #503).
 *
 */

const { BaseTest } = require('./base-test');
const { ThemeManager } = require('../lib/game/server/theme-manager');
const { GameConst } = require('../lib/game/constants');
const { FileHandler } = require('@reldens/server-utils');
const os = require('os');

class TestThemeManagerBuildCssCopiesToDist extends BaseTest
{

    async testTheBuiltCssReplacesTheDistCss()
    {
        await this.test('the built CSS is copied into an empty dist and replaces an existing dist CSS (ISSUE #503)', async () => {
            let rootPath = FileHandler.joinPaths(os.tmpdir(), 'reldens-build-css-'+process.pid+'-'+Date.now());
            let themeManager = new ThemeManager({projectRoot: rootPath});
            themeManager.createCssBundler = () => ({run: async () => ({buildTime: 1})});
            let builtCssPath = FileHandler.joinPaths(themeManager.projectCssPath, GameConst.STRUCTURE.CSS_FILE);
            let distCssPath = FileHandler.joinPaths(themeManager.cssDistPath, GameConst.STRUCTURE.CSS_FILE);
            FileHandler.createFolder(themeManager.projectCssPath);
            let distContents = [];
            for(let builtContent of ['.title{color:red}', '.title{color:blue}']){
                FileHandler.writeFile(builtCssPath, builtContent);
                await themeManager.buildCss();
                distContents.push(FileHandler.readFile(distCssPath));
            }
            FileHandler.remove(rootPath);
            this.assert.deepStrictEqual(distContents, ['.title{color:red}', '.title{color:blue}']);
        });
    }

}

module.exports.TestThemeManagerBuildCssCopiesToDist = TestThemeManagerBuildCssCopiesToDist;
