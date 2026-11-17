/**
 *
 * Reldens - Test Admin Object Tile Picker
 *
 * Tests the tile picker of the admin game object edit form: a tile picked on the selected room map writes its tile
 * index, the picker without a selected room marks the room selector as required and opens no map, and changing the
 * room while the map is open reloads the map of the new room.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');

class TestAdminObjectTilePicker extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomsList = [
            {id: 41, name: 'reldens-new-age-town', mapFile: 'reldens-new-age-town.json'},
            {id: 114, name: 'reldens-forest-level-1', mapFile: 'reldens-forest-level-1.json'}
        ];
        this.pickedTileIndex = 2078;
    }

    createObjectFormPage()
    {
        let page = {openedMaps: [], reloadedMaps: []};
        page.mapContainer = LoginFormStubsBuilder.createElement({classes: ['hidden']});
        page.roomSelector = LoginFormStubsBuilder.createElement({value: '41'});
        page.tileIndexField = LoginFormStubsBuilder.createElement();
        page.tileIndexInput = LoginFormStubsBuilder.createElement({value: '', closest: () => page.tileIndexField});
        page.pickerButton = LoginFormStubsBuilder.createElement();
        let elements = {
            '.object-tile-selector-container': page.mapContainer,
            '[name="room_id"]': page.roomSelector,
            '[name="tile_index"]': page.tileIndexInput,
            '.object-tile-picker-button': page.pickerButton
        };
        let tileClick = (selectedRoom, onTileClick, mapsList) => {
            mapsList.push(selectedRoom.name);
            onTileClick({}, {});
        };
        page.picker = new (AdminBrowserScriptLoader.loadClass('admin-object-tile-picker.js', 'AdminObjectTilePicker', {
            window: {},
            document: {querySelector: (selector) => elements[selector] || null},
            adminMapRenderer: {
                findRoomById: (roomsList, roomId) => roomsList.find(room => String(room.id) === String(roomId)) || false,
                attachInlinePickerButton: () => true,
                calculateTileData: () => ({tileIndex: this.pickedTileIndex}),
                toggleMapPicker: (mapContainer, field, selectedRoom, onTileClick) => tileClick(selectedRoom, onTileClick, page.openedMaps),
                loadMapPickerContent: (mapContainer, selectedRoom, onTileClick) => tileClick(selectedRoom, onTileClick, page.reloadedMaps)
            }
        }))();
        page.picker.bind({extraData: {roomsList: this.roomsList}});
        return page;
    }

    async testThePickedTileWritesItsIndex()
    {
        await this.test('a tile picked on the selected room map writes its tile index', async () => {
            let page = this.createObjectFormPage();
            page.pickerButton.listeners.click();
            this.assert.deepStrictEqual(
                [page.openedMaps, page.tileIndexInput.value, page.roomSelector.classes],
                [['reldens-new-age-town'], this.pickedTileIndex, []]
            );
        });
    }

    async testThePickerWithoutARoomOpensNoMap()
    {
        await this.test('the tile picker without a selected room marks the room selector required and opens no map', async () => {
            let page = this.createObjectFormPage();
            page.roomSelector.value = '';
            page.pickerButton.listeners.click();
            this.assert.deepStrictEqual(
                [page.openedMaps, page.tileIndexInput.value, page.roomSelector.classes],
                [[], '', ['room-selector-required']]
            );
        });
    }

    async testChangingTheRoomReloadsTheOpenMap()
    {
        await this.test('changing the room reloads the open map of the new room and a closed map stays closed', async () => {
            let page = this.createObjectFormPage();
            page.roomSelector.listeners.change();
            let closedMapReloads = [...page.reloadedMaps];
            page.mapContainer.classes = [];
            page.roomSelector.value = '114';
            page.roomSelector.listeners.change();
            this.assert.deepStrictEqual(
                [closedMapReloads, page.reloadedMaps, page.tileIndexInput.value],
                [[], ['reldens-forest-level-1'], this.pickedTileIndex]
            );
        });
    }

}

module.exports.TestAdminObjectTilePicker = TestAdminObjectTilePicker;
