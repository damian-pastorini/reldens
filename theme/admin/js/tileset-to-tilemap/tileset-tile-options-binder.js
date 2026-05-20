/* exported TilesetTileOptionsBinder */
class TilesetTileOptionsBinder
{
    constructor(app)
    {
        this.app = app;
        this.apply = new TilesetTileOptions(this);
        this.events = new TilesetTileOptionsEvents(this);
        this.picker = new TilesetTileOptionsPickHandler(this);
        this.clearer = new TilesetTileOptionsClearer(this);
        this.positionOrders = {
            surroundingTiles: ['-1,-1','-1,0','-1,1','0,-1','0,0','0,1','1,-1','1,0','1,1'],
            corners: ['-1,-1','-1,1','1,-1','1,1'],
            bordersTiles: ['top','right','bottom','left'],
            borderCornersTiles: ['top-left','top-right','bottom-left','bottom-right'],
            innerWallsTiles: ['-1,-1','-1,0','-1,1','0,-1','0,0','0,1','1,-1','1,0','1,1'],
            innerWallsCornerTiles: ['top-left','top-right','bottom-left','bottom-right'],
            outerWallsTiles: ['-1,-1','-1,0','-1,1','0,-1','0,0','0,1','1,-1','1,0','1,1'],
            outerWallsCornerTiles: ['top-left','top-right','bottom-left','bottom-right']
        };
        this.resetPickState();
    }

    resetPickState()
    {
        this.activeTilesetIndex = null;
        this.activeOptionKey = null;
        this.activePositionKey = null;
        this.activeSpotName = null;
        this.multiSelect = false;
    }

    buildDefaultTileOptions()
    {
        return {
            groundTile: null,
            pathTile: null,
            borderTile: null,
            randomGroundTiles: [],
            surroundingTiles: {},
            corners: {},
            bordersTiles: {},
            borderCornersTiles: {}
        };
    }

    buildDefaultSpot(name)
    {
        return {
            name: name,
            type: SharedUtils.SPOT_TYPE,
            approved: false,
            bulkSelected: false,
            spotTile: null,
            spotTileVariations: [],
            surroundingTiles: {},
            corners: {},
            bordersTiles: {},
            borderCornersTiles: {},
            innerWallsTiles: {},
            innerWallsCornerTiles: {},
            outerWallsTiles: {},
            outerWallsCornerTiles: {},
            width: SharedUtils.SPOT_DEFAULTS.width,
            height: SharedUtils.SPOT_DEFAULTS.height,
            quantity: 1,
            walkable: true,
            markPercentage: SharedUtils.SPOT_DEFAULTS.markPercentage,
            variableTilesPercentage: SharedUtils.SPOT_DEFAULTS.variableTilesPercentage,
            isElement: false,
            freeSpaceAround: null,
            allowPathsInFreeSpace: false,
            mapCentered: 0,
            placeRandomPath: false,
            depth: false,
            splitBordersInLayers: false,
            borderInnerWalls: false,
            borderOuterWalls: false,
            borderOuterWallsIncreaseLayerSize: SharedUtils.SPOT_DEFAULTS.borderOuterWallsIncreaseLayerSize
        };
    }

    findSpot(tilesetIndex, spotName)
    {
        for(let spot of this.app.state[tilesetIndex].spots){
            if(spot.name === spotName){
                return spot;
            }
        }
        return null;
    }

    getTilesetRowEl(tilesetIndex)
    {
        let refs = this.app.refs[tilesetIndex];
        if(refs && refs.row){
            return refs.row;
        }
        let canvas = document.querySelector('.tileset-canvas[data-tileset-index="'+tilesetIndex+'"]');
        if(!canvas){
            return null;
        }
        return canvas.closest('.tileset-row');
    }

    withGlobalPanel(callback)
    {
        let globalPanel = document.querySelector('.global-tile-options');
        if(globalPanel){
            callback(globalPanel);
        }
    }

    isSameActiveState(tilesetIndex, optionKey, spotName)
    {
        return this.activeTilesetIndex === tilesetIndex
            && this.activeOptionKey === optionKey
            && this.activeSpotName === (spotName ? spotName : null);
    }

    activateOption(tilesetIndex, optionKey, multiSelect, spotName)
    {
        this.activeTilesetIndex = tilesetIndex;
        this.activeOptionKey = optionKey;
        this.multiSelect = multiSelect;
        this.activeSpotName = spotName ? spotName : null;
        this.activePositionKey = null;
    }

    activatePosition(positionKey)
    {
        this.activePositionKey = positionKey;
        let tilesetIndex = this.activeTilesetIndex;
        if(-1 === tilesetIndex){
            this.withGlobalPanel((p) => {
                this.apply.updateActiveCellClass(-1, p);
                this.apply.updateBanner(-1, p);
            });
            return;
        }
        this.activatePositionForRow(tilesetIndex);
    }

    withTilesetRow(tilesetIndex, callback)
    {
        let row = this.getTilesetRowEl(tilesetIndex);
        if(!row){
            return;
        }
        callback(row);
    }

    activatePositionForRow(tilesetIndex)
    {
        this.withTilesetRow(tilesetIndex, (row) => {
            this.apply.updateActiveCellClass(tilesetIndex, row);
            this.apply.updateBanner(tilesetIndex, row);
        });
    }

    deactivate()
    {
        let tilesetIndex = this.activeTilesetIndex;
        this.resetPickState();
        if(-1 === tilesetIndex){
            this.withGlobalPanel((p) => {
                this.apply.clearAllActiveCellClasses(p);
                this.apply.hideBanner(p);
                this.clearActiveBtns(p);
            });
            this.app.renderAllCanvases();
            return;
        }
        if(null === tilesetIndex){
            return;
        }
        this.deactivateForRow(tilesetIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    renderForActiveScope(tilesetIndex)
    {
        if(-1 === tilesetIndex){
            this.app.renderAllCanvases();
            return;
        }
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    deactivateForRow(tilesetIndex)
    {
        this.withTilesetRow(tilesetIndex, (row) => {
            this.apply.clearAllActiveCellClasses(row);
            this.apply.hideBanner(row);
            this.clearActiveBtns(row);
        });
    }

    clearActiveBtns(containerEl)
    {
        let optionBtns = containerEl.querySelectorAll('.tile-option-btn.active');
        for(let optionBtn of optionBtns){
            optionBtn.classList.remove('active');
        }
    }

    applyToTilesetRow(tilesetIndex)
    {
        let rowEl = this.getTilesetRowEl(tilesetIndex);
        if(rowEl){
            this.apply.applyToRow(tilesetIndex, rowEl);
        }
    }

    handleTileClick(tilesetIndex, row, col)
    {
        this.picker.handleTileClick(tilesetIndex, row, col);
    }

    clearGroundGroup(tilesetIndex, spotName)
    {
        this.clearer.clearGroundGroup(tilesetIndex, spotName);
    }

    clearPathTilesGroup(tilesetIndex)
    {
        this.clearer.clearPathTilesGroup(tilesetIndex);
    }

    clearOption(tilesetIndex, optionKey, positionKey, spotName)
    {
        this.clearer.clearOption(tilesetIndex, optionKey, positionKey, spotName);
    }

    addSpot(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let spotNum = SharedUtils.padNum(tileset.spots.length + 1);
        tileset.spots.push(this.buildDefaultSpot('spot-'+spotNum));
        this.app.selectedSpot = { tilesetIndex, spotIndex: tileset.spots.length - 1 };
        this.app.editor.renderLegend(tilesetIndex);
        let refs = this.app.refs[tilesetIndex];
        if(refs && refs.list){
            let spotRows = refs.list.querySelectorAll('.spot-row');
            this.app.editor.scroller.scrollIntoView(refs.list, spotRows[spotRows.length - 1]);
        }
    }

    removeSpot(tilesetIndex, spotName)
    {
        let tileset = this.app.state[tilesetIndex];
        let spot = this.findSpot(tilesetIndex, spotName);
        if(!spot){
            return;
        }
        tileset.spots.splice(tileset.spots.indexOf(spot), 1);
        if(this.activeSpotName === spotName && this.activeTilesetIndex === tilesetIndex){
            this.deactivate();
        }
        this.app.editor.renderLegend(tilesetIndex);
    }

    toggleIsElementFields(spotRow, isChecked)
    {
        let freeSpaceRow = spotRow.querySelector('.spot-free-space-row');
        let allowPathsRow = spotRow.querySelector('.spot-allow-paths-row');
        if(freeSpaceRow){
            freeSpaceRow.classList.toggle('hidden', !isChecked);
        }
        if(allowPathsRow){
            allowPathsRow.classList.toggle('hidden', !isChecked);
        }
    }

    bindCancelBtns(containerEl)
    {
        let cancelBtns = containerEl.querySelectorAll('.tile-pick-cancel');
        for(let cancelBtn of cancelBtns){
            cancelBtn.addEventListener('click', () => this.deactivate());
        }
    }

    bind(tilesetIndex, rowEl)
    {
        this.bindCancelBtns(rowEl);
        let addSpotBtn = rowEl.querySelector('.add-spot-btn');
        if(addSpotBtn){
            addSpotBtn.addEventListener('click', () => this.addSpot(tilesetIndex));
        }
        let panel = rowEl.querySelector('.tileset-tile-options:not(.spot-tile-config)');
        if(panel){
            this.events.bindOptionBtns(tilesetIndex, panel, null);
            this.events.bindClearBtns(tilesetIndex, panel, null);
            this.events.bindPositionCells(tilesetIndex, panel, null);
        }
        this.events.bindReferenceButtons(rowEl);
        this.apply.applyToRow(tilesetIndex, rowEl);
    }

    bindGlobal(panelEl)
    {
        this.bindCancelBtns(panelEl);
        this.events.initReferenceModal();
        this.events.bindReferenceButtons(panelEl);
        this.events.bindOptionBtns(-1, panelEl, null);
        this.events.bindClearBtns(-1, panelEl, null);
        this.events.bindPositionCells(-1, panelEl, null);
        this.apply.applyToRow(-1, null);
    }

    bindSpotRows(tilesetIndex)
    {
        this.events.bindSpotRows(tilesetIndex);
    }
}
window.TilesetTileOptionsBinder = TilesetTileOptionsBinder;
