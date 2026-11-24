/**
 *
 * Reldens - Test Admin Items Groups Hot Plug
 *
 * Tests an items group edited in the administration panel with the hot plug on (exclusive group, so no other group
 * reads the groups data while it changes): the label of the weapon group saved from its edit form reaches the running
 * server and every scene room broadcasts the groups data, so the client of a player in the town receives the edited
 * label (ISSUE #360); the stored label saved again goes back to the running server the same way, and the stored row is
 * preserved for the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ItemsConst } = require('@reldens/items-system');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminItemsGroupsHotPlug
{

    static GROUP_KEY = 'weapon';
    static EDITED_LABEL = 'E2E Weapons';
    static LABEL_INPUT = '#edit-form [name="label"]';

    static async saveGroupLabel(page, gameConfig, longRun, groupId, label)
    {
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/items-group/edit?id='+groupId);
        await page.locator(TestAdminItemsGroupsHotPlug.LABEL_INPUT).fill(label);
        await page.click(Selectors.admin.saveButton);
        await AdminPanelSession.expectSuccessNotification(page, longRun);
    }

    static async expectBroadcastLabel(clientPage, label, message)
    {
        await expect.poll(
            async () => [...await RoomMessagesRecorder.fetchMessages(clientPage, ItemsConst.ACTION_SET_GROUPS)].pop()
                ?.groups?.[TestAdminItemsGroupsHotPlug.GROUP_KEY]?.label,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(label);
    }

    static async runEditedGroupTest(page, gameConfig, e2eGroup, longRun)
    {
        let [groupRow] = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsGroup', {
            key: TestAdminItemsGroupsHotPlug.GROUP_KEY
        });
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'itemsGroup', {id: groupRow.id});
        let client = await Login.openClientPage(page, gameConfig);
        await Login.loginRootPlayer(client.clientPage, gameConfig, longRun);
        await RoomMessagesRecorder.start(client.clientPage);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await TestAdminItemsGroupsHotPlug.saveGroupLabel(
            page,
            gameConfig,
            longRun,
            groupRow.id,
            TestAdminItemsGroupsHotPlug.EDITED_LABEL
        );
        await TestAdminItemsGroupsHotPlug.expectBroadcastLabel(
            client.clientPage,
            TestAdminItemsGroupsHotPlug.EDITED_LABEL,
            'The edited group label reaches the running server and the town client'
        );
        await TestAdminItemsGroupsHotPlug.saveGroupLabel(page, gameConfig, longRun, groupRow.id, groupRow.label);
        await TestAdminItemsGroupsHotPlug.expectBroadcastLabel(
            client.clientPage,
            groupRow.label,
            'The stored label saved again goes back to the running server and the town client'
        );
    }

    static run()
    {
        test.describe('Admin Items Groups Hot Plug', () => {
            test('an items group edited in the admin reaches the running server and the scene clients', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdminItemsGroupsHotPlug.runEditedGroupTest(page, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdminItemsGroupsHotPlug.run();
