/**
 *
 * Reldens - Test Admin Tileset Bulk Delete
 *
 * Tests the Tileset Analyzer bulk delete of the checked elements and spots: the locked (approved) checked items are
 * kept and their count is shown in the confirmation, the unlocked checked items are removed after the confirmation, and
 * a selection with only locked items asks nothing and removes nothing.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');

class TestAdminTilesetBulkDelete extends BaseTest
{

    createBinderPage(elements, spots)
    {
        let page = {confirmations: [], refreshed: []};
        page.tileset = {elements, spots};
        page.app = {
            state: [page.tileset],
            modals: {show: (message, onConfirm) => page.confirmations.push({message, onConfirm})},
            updatePaletteStyles: () => true,
            refresh: (tilesetIndex) => page.refreshed.push(tilesetIndex)
        };
        page.binder = new (AdminBrowserScriptLoader.loadClass('tileset-to-tilemap/tileset-row-binder.js', 'TilesetRowBinder', {
            window: {},
            TilesetLegendControlsBinder: Object,
            TilesetCanvasTileReadout: Object
        }))(page.app);
        return page;
    }

    async testTheLockedCheckedItemsAreKept()
    {
        await this.test('the checked unlocked items are deleted and the checked locked items are kept and counted', async () => {
            let page = this.createBinderPage(
                [{id: 1, bulkSelected: true}, {id: 2, bulkSelected: true, approved: true}, {id: 3}],
                [{id: 4, bulkSelected: true, approved: true}, {id: 5, bulkSelected: true}]
            );
            page.binder.bulkDeleteSelectedMapObjects(0);
            let confirmation = [...page.confirmations].shift();
            confirmation.onConfirm();
            this.assert.deepStrictEqual(
                [
                    confirmation.message,
                    [...page.tileset.elements].map(element => element.id),
                    [...page.tileset.spots].map(spot => spot.id),
                    page.refreshed
                ],
                ['Delete 2 selected item(s)? 2 locked item(s) will be kept.', [2, 3], [4], [0]]
            );
        });
    }

    async testOnlyLockedCheckedItemsAskNothing()
    {
        await this.test('a selection with only locked items asks no confirmation and deletes nothing', async () => {
            let page = this.createBinderPage([{id: 1, bulkSelected: true, approved: true}, {id: 2}], []);
            page.binder.bulkDeleteSelectedMapObjects(0);
            this.assert.deepStrictEqual(
                [page.confirmations, page.tileset.elements.map(element => element.id)],
                [[], [1, 2]]
            );
        });
    }

}

module.exports.TestAdminTilesetBulkDelete = TestAdminTilesetBulkDelete;
