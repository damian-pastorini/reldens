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
            surroundingTiles: ['-1,-1','-1,0','-1,1','0,-1','0,1','1,-1','1,0','1,1'],
            corners: ['-1,-1','-1,1','1,-1','1,1'],
            bordersTiles: ['top','right','bottom','left'],
            borderCornersTiles: ['top-left','top-right','bottom-left','bottom-right']
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
            type: 'spot',
            approved: false,
            bulkSelected: false,
            spotTile: null,
            spotTileVariations: [],
            surroundingTiles: {},
            corners: {},
            bordersTiles: {},
            borderCornersTiles: {},
            width: 5,
            height: 5,
            quantity: 1,
            layerName: '',
            walkable: true,
            markPercentage: 100,
            variableTilesPercentage: 0,
            isElement: false,
            freeSpaceAround: null,
            allowPathsInFreeSpace: false,
            mapCentered: 0,
            placeRandomPath: false,
            depth: false,
            splitBordersInLayers: false,
            borderLayerSuffix: '',
            wallsLayerSuffix: '',
            outerWallsLayerSuffix: '',
            borderOuterWallsIncreaseLayerSize: 4
        };
    }

    findSpot(tilesetIndex, spotName)
    {
        let spots = this.app.state[tilesetIndex].spots;
        if(!spots){
            return null;
        }
        for(let spot of spots){
            if(spot.name === spotName){
                return spot;
            }
        }
        return null;
    }

    getTilesetRowEl(tilesetIndex)
    {
        return document.querySelector('[data-tileset-index="'+tilesetIndex+'"]');
    }

    withGlobalPanel(callback)
    {
        let globalPanel = document.querySelector('.global-tile-options');
        if(globalPanel){
            callback(globalPanel);
        }
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
        for(let btn of optionBtns){
            btn.classList.remove('active');
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

    clearOption(tilesetIndex, optionKey, positionKey, spotName)
    {
        this.clearer.clearOption(tilesetIndex, optionKey, positionKey, spotName);
    }

    addSpot(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        if(!tileset.spots){
            tileset.spots = [];
        }
        let spotNum = SharedUtils.padNum(tileset.spots.length + 1);
        tileset.spots.push(this.buildDefaultSpot('spot-'+spotNum));
        this.app.editor.renderLegend(tilesetIndex);
        let refs = this.app.refs[tilesetIndex];
        if(refs && refs.list){
            let spotRows = refs.list.querySelectorAll('.spot-row');
            let lastRow = spotRows[spotRows.length - 1];
            if(lastRow){
                let detail = lastRow.querySelector('.spot-detail');
                if(detail){
                    detail.classList.remove('hidden');
                }
                lastRow.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        }
    }

    removeSpot(tilesetIndex, spotName)
    {
        let tileset = this.app.state[tilesetIndex];
        if(!tileset.spots){
            return;
        }
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
        let panel = rowEl.querySelector('.tileset-tile-options');
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
