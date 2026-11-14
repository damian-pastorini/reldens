/**
 *
 * Reldens - Test Admin Object Layer Selector
 *
 * Tests the layer field of the admin game object edit form: with a room selected the layer field becomes a select of
 * that room map layers keeping the saved layer selected (added first when the map does not have it), picking another
 * layer writes it to the hidden field, and a room without layers turns the select back into the text field.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');

class TestAdminObjectLayerSelector extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomsList = [
            {id: 41, name: 'reldens-new-age-town', layers: ['ground-variations', 'merge-collisions', 'merge-below-player']},
            {id: 114, name: 'reldens-forest-level-1', layers: []}
        ];
    }

    createSelectElement()
    {
        let select = LoginFormStubsBuilder.createElement({options: []});
        select.add = (option) => select.options.push(option);
        Object.defineProperty(select, 'innerHTML', {set: () => select.options = [], get: () => ''});
        Object.defineProperty(select, 'value', {
            get: () => (select.options.find(option => option.selected) || {value: ''}).value,
            set: (value) => {
                for(let option of select.options){
                    option.selected = value === option.value;
                }
            }
        });
        return select;
    }

    createObjectFormPage()
    {
        let page = {insertedSelects: []};
        page.layerNameInput = LoginFormStubsBuilder.createElement({value: 'merge-over-player', type: 'text'});
        page.layerNameInput.parentElement = {insertBefore: (select) => page.insertedSelects.push(select)};
        page.roomSelector = LoginFormStubsBuilder.createElement({value: '41'});
        let elements = {'[name="layer_name"]': page.layerNameInput, '[name="room_id"]': page.roomSelector};
        page.selector = new (AdminBrowserScriptLoader.loadClass('admin-object-layer-selector.js', 'AdminObjectLayerSelector', {
            window: {},
            document: {
                querySelector: (selector) => elements[selector] || null,
                createElement: (tagName) => 'select' === tagName ? this.createSelectElement() : {}
            },
            adminMapRenderer: {
                findRoomById: (roomsList, roomId) => roomsList.find(room => String(room.id) === String(roomId)) || false
            }
        }))();
        return page;
    }

    async testTheLayerFieldBecomesTheRoomLayersSelect()
    {
        await this.test('a selected room turns the layer field into its map layers select keeping the saved layer', async () => {
            let page = this.createObjectFormPage();
            let bound = page.selector.bind({extraData: {roomsList: this.roomsList}});
            let layerSelect = [...page.insertedSelects].shift();
            let savedLayer = [layerSelect.options.map(option => [option.value, option.selected]), layerSelect.classes];
            layerSelect.value = 'merge-collisions';
            layerSelect.listeners.change();
            this.assert.deepStrictEqual(
                [bound, savedLayer, page.layerNameInput.type, page.layerNameInput.value],
                [
                    true,
                    [
                        [
                            ['merge-over-player', true],
                            ['ground-variations', false],
                            ['merge-collisions', false],
                            ['merge-below-player', false]
                        ],
                        ['layer-name-selector']
                    ],
                    'hidden',
                    'merge-collisions'
                ]
            );
        });
    }

    async testARoomWithoutLayersRestoresTheTextField()
    {
        await this.test('a room without map layers turns the layer select back into the text field', async () => {
            let page = this.createObjectFormPage();
            page.selector.bind({extraData: {roomsList: this.roomsList}});
            let layerSelect = [...page.insertedSelects].shift();
            page.roomSelector.value = '114';
            page.roomSelector.listeners.change();
            this.assert.deepStrictEqual(
                [layerSelect.options, layerSelect.classes, page.layerNameInput.type, page.layerNameInput.value],
                [[], ['layer-name-selector', 'hidden'], 'text', 'merge-over-player']
            );
        });
    }

}

module.exports.TestAdminObjectLayerSelector = TestAdminObjectLayerSelector;
