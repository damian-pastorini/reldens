/**
 *
 * Reldens - Test Admin Rooms Link Picker
 *
 * Tests the next room picker of the admin room view: the rooms list fills the next room selector, changing the next
 * room clears the picked tile, the hidden position and the opened map, and the map picker without a selected room
 * marks the selector as required and opens no map while a selected room opens its map.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');

class TestAdminRoomsLinkPicker extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomsList = [
            {id: 41, name: 'reldens-new-age-town', mapFile: 'reldens-new-age-town.json'},
            {id: 114, name: 'reldens-forest', mapFile: 'reldens-forest.json'}
        ];
    }

    createPickerPage()
    {
        let page = {openedPickers: []};
        page.roomsSelector = LoginFormStubsBuilder.createElement({value: '114', options: [], classes: ['room-selector-required']});
        page.roomsSelector.add = (option) => page.roomsSelector.options.push([option.text, option.value]);
        page.mapContainer = LoginFormStubsBuilder.createElement({innerHTML: 'opened-map-picker'});
        page.tileIndexInput = LoginFormStubsBuilder.createElement({value: '2078', closest: () => page.tileIndexField});
        page.tileIndexField = LoginFormStubsBuilder.createElement();
        page.pickerButton = LoginFormStubsBuilder.createElement();
        page.positionX = LoginFormStubsBuilder.createElement({value: '640'});
        page.positionY = LoginFormStubsBuilder.createElement({value: '400'});
        let elements = {
            '.nextRoomSelector': page.roomsSelector,
            '.next-room-return-position-container': page.mapContainer,
            '#nextRoomPositionTileIndex': page.tileIndexInput,
            '.next-room-position-tile-picker-button': page.pickerButton,
            '#nextRoomPositionX': page.positionX,
            '#nextRoomPositionY': page.positionY
        };
        page.picker = new (AdminBrowserScriptLoader.loadClass('admin-rooms-link-picker.js', 'AdminRoomsLinkPicker', {
            window: {},
            HTMLSelectElement: Object,
            document: {querySelector: (selector) => elements[selector] || null, createElement: () => ({})},
            adminMapRenderer: {
                findRoomById: (roomsList, roomId) => roomsList.find(room => String(room.id) === String(roomId)) || false,
                toggleMapPicker: (mapContainer, tileIndexField, selectedRoom) => page.openedPickers.push(selectedRoom.name)
            }
        }))();
        page.picker.bindNextRoomPicker({extraData: {roomsList: this.roomsList}});
        return page;
    }

    async testChangingTheNextRoomClearsThePickedTile()
    {
        await this.test('changing the next room clears the picked tile, the hidden position and the opened map', async () => {
            let page = this.createPickerPage();
            page.roomsSelector.listeners.change();
            this.assert.deepStrictEqual(
                [
                    page.roomsSelector.options,
                    page.tileIndexInput.value,
                    page.positionX.value,
                    page.positionY.value,
                    page.mapContainer.innerHTML,
                    page.mapContainer.classes,
                    page.roomsSelector.classes
                ],
                [[['reldens-new-age-town', 41], ['reldens-forest', 114]], '', '', '', '', ['hidden'], []]
            );
        });
    }

    async testTheMapPickerNeedsASelectedNextRoom()
    {
        await this.test('the map picker without a next room marks the selector required and a selected room opens its map', async () => {
            let page = this.createPickerPage();
            page.roomsSelector.value = '';
            page.pickerButton.listeners.click();
            let withoutRoom = [[...page.roomsSelector.classes], [...page.openedPickers]];
            page.roomsSelector.value = '114';
            page.pickerButton.listeners.click();
            this.assert.deepStrictEqual(
                [withoutRoom, [page.roomsSelector.classes, page.openedPickers]],
                [[['room-selector-required', 'room-selector-required'], []], [[], ['reldens-forest']]]
            );
        });
    }

}

module.exports.TestAdminRoomsLinkPicker = TestAdminRoomsLinkPicker;
