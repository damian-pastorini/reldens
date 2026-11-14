/**
 *
 * Reldens - Test Admin Entity Sections
 *
 * Tests the administration panel entity sections: every sidebar section lists one link per entity configured in it
 * (EntitiesConfigOverrides), every entity list page renders its table and its create form, every listed row opens its
 * view and edit pages, and the top level entities (features, administrator sessions and address lists) are rendered at
 * the first sidebar level with their own list.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { EntitiesConfigOverrides } = require('../../lib/admin/server/entities-config-override');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminEntitySections
{

    static LIST_TABLE = 'table.list';
    static LIST_ROWS = 'table.list tr.row:not(.row-header)';
    static ROW_VIEW_LINK = 'td.field:not(.field-actions):not(.field-edit):not(.field-delete) a';
    static ROW_EDIT_LINK = 'td.field-edit a';
    static CREATE_LINK = '.create-new-btn';
    static ENTITY_VIEW = '.entity-view';
    static TOP_LEVEL_LINKS = '.side-bar-item.level-1 > a';

    static fetchSectionsEntitiesCount()
    {
        let sectionsCount = {};
        for(let entityKey of Object.keys(EntitiesConfigOverrides)){
            let sectionLabel = EntitiesConfigOverrides[entityKey].parentItemLabel;
            if(sectionLabel){
                sectionsCount[sectionLabel] = (sectionsCount[sectionLabel] || 0) + 1;
            }
        }
        return sectionsCount;
    }

    static async fetchSectionLinks(page, sectionLabel)
    {
        return await page.locator('.side-bar-item.with-sub-items').filter({
            has: page.locator(':scope > .side-bar-item-header', {hasText: new RegExp('^'+sectionLabel+'$')})
        }).locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    }

    static async expectPageForm(page, pagePath, formSelector, longRun)
    {
        await page.goto(pagePath);
        await expect(page.locator(formSelector), pagePath).toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        expect(page.url(), pagePath+' without error result').not.toContain('result=error');
    }

    static async openListPage(page, listPath, longRun)
    {
        await TestAdminEntitySections.expectPageForm(page, listPath, TestAdminEntitySections.LIST_TABLE, longRun);
        let firstRow = page.locator(TestAdminEntitySections.LIST_ROWS).first();
        let rowLinks = {
            createPath: await page.locator(TestAdminEntitySections.CREATE_LINK).getAttribute('href'),
            viewPath: '',
            editPath: ''
        };
        if(0 < await page.locator(TestAdminEntitySections.LIST_ROWS).count()){
            rowLinks.viewPath = await firstRow.locator(TestAdminEntitySections.ROW_VIEW_LINK).first().getAttribute('href');
            rowLinks.editPath = await firstRow.locator(TestAdminEntitySections.ROW_EDIT_LINK).getAttribute('href');
        }
        return rowLinks;
    }

    static async runSectionsTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let sectionsCount = TestAdminEntitySections.fetchSectionsEntitiesCount();
        let sectionsLinks = {};
        for(let sectionLabel of Object.keys(sectionsCount)){
            sectionsLinks[sectionLabel] = await TestAdminEntitySections.fetchSectionLinks(page, sectionLabel);
        }
        expect(
            Object.keys(sectionsLinks).map(sectionLabel => [sectionLabel, sectionsLinks[sectionLabel].length]),
            'One sidebar link per configured entity'
        ).toEqual(Object.keys(sectionsCount).map(sectionLabel => [sectionLabel, sectionsCount[sectionLabel]]));
        let rowsPages = [];
        for(let listPath of Object.keys(sectionsLinks).flatMap(sectionLabel => sectionsLinks[sectionLabel])){
            let rowLinks = await TestAdminEntitySections.openListPage(page, listPath, longRun);
            await TestAdminEntitySections.expectPageForm(page, rowLinks.createPath, Selectors.admin.editForm, longRun);
            rowsPages.push(rowLinks);
        }
        let listedRowsPages = rowsPages.filter(rowLinks => '' !== rowLinks.viewPath);
        expect(listedRowsPages.length, 'The sample data lists rows in the entities').toBeGreaterThan(0);
        for(let rowLinks of listedRowsPages){
            await TestAdminEntitySections.expectPageForm(page, rowLinks.viewPath, TestAdminEntitySections.ENTITY_VIEW, longRun);
            await TestAdminEntitySections.expectPageForm(page, rowLinks.editPath, Selectors.admin.editForm, longRun);
        }
        await screenshots.capture(page, 'entity-sections-last-edit-page');
    }

    static async runTopLevelItemsTest(page, screenshots, gameConfig, longRun)
    {
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let adminPath = AdminPanelSession.adminPath(gameConfig);
        let topLevelPaths = [adminPath+'/features', adminPath+'/admin-sessions', adminPath+'/ip-lists'];
        let topLevelLinks = await page.locator(TestAdminEntitySections.TOP_LEVEL_LINKS).evaluateAll(
            links => links.map(link => link.getAttribute('href'))
        );
        expect(topLevelPaths.filter(topLevelPath => topLevelLinks.includes(topLevelPath)), 'Top level items').toEqual(
            topLevelPaths
        );
        for(let topLevelPath of topLevelPaths){
            await TestAdminEntitySections.expectPageForm(page, topLevelPath, TestAdminEntitySections.LIST_TABLE, longRun);
        }
        await screenshots.capture(page, 'entity-sections-top-level-items');
    }

    static run()
    {
        test.describe('Admin Entity Sections', () => {
            test('every entity section lists its entities and their list, create, view and edit pages render', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntitySections.runSectionsTest(page, screenshots, gameConfig, longRun);
            });
            test('the top level entities are rendered at the first sidebar level and list their rows', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminEntitySections.runTopLevelItemsTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminEntitySections.run();
