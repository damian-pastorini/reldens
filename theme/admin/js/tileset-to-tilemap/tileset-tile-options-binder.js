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
        if(null === tilesetIndex){
            return;
        }
        if(-1 === tilesetIndex){
            this.withGlobalPanel((panel) => {
                this.apply.clearAllActiveCellClasses(panel);
                this.apply.hideBanner(panel);
                this.deactivateOptionButtons(panel);
            });
            this.renderForActiveScope(tilesetIndex);
            return;
        }
        this.deactivateForRow(tilesetIndex);
        this.renderForActiveScope(tilesetIndex);
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
            this.deactivateOptionButtons(row);
        });
    }

    deactivateOptionButtons(containerEl)
    {
        let optionButtons = containerEl.querySelectorAll('.tile-option-btn.active');
        for(let optionBtn of optionButtons){
            optionBtn.classList.remove('active');
        }
    }

    applyAndRenderTilesetRow(tilesetIndex)
    {
        this.withTilesetRow(tilesetIndex, (row) => this.apply.applyToRow(tilesetIndex, row));
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    handleTileClick(tilesetIndex, row, col)
    {
        if(this.picker){
            this.picker.handleTileClick(tilesetIndex, row, col);
        }
    }

    clearTilesGroup(tilesetIndex, groupType, spotName)
    {
        if(!this.clearer){
            return;
        }
        if('ground' === groupType){
            this.clearer.clearGroundGroup(tilesetIndex, spotName);
            return;
        }
        this.clearer.clearPathTilesGroup(tilesetIndex);
    }

    toggleActivation(tilesetIndex, optionKey, posKey, isMulti, spotName)
    {
        let samePosition = null === posKey ? null === this.activePositionKey : this.activePositionKey === posKey;
        let isSameState = this.isSameActiveState(tilesetIndex, optionKey, spotName) && samePosition;
        this.deactivate();
        if(isSameState){
            return false;
        }
        this.activateOption(tilesetIndex, optionKey, isMulti, spotName ? spotName : null);
        if(null !== posKey){
            this.activatePosition(posKey);
        }
        return true;
    }

    showActiveOptionAndRender(tilesetIndex, optionBtn)
    {
        optionBtn.classList.add('active');
        if(-1 === tilesetIndex){
            this.withGlobalPanel((panel) => this.apply.updateBanner(-1, panel));
            this.app.renderAllCanvases();
            return;
        }
        this.withTilesetRow(tilesetIndex, (row) => this.apply.updateBanner(tilesetIndex, row));
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    dispatchGroupClear(tilesetIndex, optionKey, spotName)
    {
        if('ground' === optionKey || 'pathTilesGroup' === optionKey){
            this.clearTilesGroup(tilesetIndex, optionKey, spotName);
            return;
        }
        if(this.clearer){
            this.clearer.clearOption(tilesetIndex, optionKey, null, spotName);
        }
    }

    clearPositionCell(tilesetIndex, cellClearBtn, spotName)
    {
        let cell = cellClearBtn.closest('.tile-position-cell');
        let grid = cellClearBtn.closest('.tile-position-grid');
        if(!cell || !grid || !this.clearer){
            return;
        }
        let optionKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
        this.clearer.clearOption(tilesetIndex, optionKey, cell.dataset.pos, spotName);
    }

    addSpot(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let spotNum = SharedUtils.padNum(tileset.spots.length + 1);
        tileset.spots.push(SharedUtils.buildDefaultSpot('spot-'+spotNum));
        this.app.selectedSpot = { tilesetIndex, spotIndex: tileset.spots.length - 1 };
        this.app.editor.legendRenderer.renderLegend(tilesetIndex);
        let refs = this.app.refs[tilesetIndex];
        if(refs && refs.list){
            let newSpotIndex = tileset.spots.length - 1;
            let newSpotRow = refs.list.querySelector('.spot-row[data-spot-index="'+newSpotIndex+'"]');
            this.app.editor.scroller.scrollIntoView(refs.list, newSpotRow);
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
        this.app.editor.legendRenderer.renderLegend(tilesetIndex);
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

    bindCancelButtons(containerEl)
    {
        let cancelButtons = containerEl.querySelectorAll('.tile-pick-cancel');
        for(let cancelBtn of cancelButtons){
            cancelBtn.addEventListener('click', () => this.deactivate());
        }
    }

    bind(tilesetIndex, rowEl)
    {
        this.bindCancelButtons(rowEl);
        let addSpotBtn = rowEl.querySelector('.add-spot-btn');
        if(addSpotBtn){
            addSpotBtn.addEventListener('click', () => this.addSpot(tilesetIndex));
        }
        let panel = rowEl.querySelector('.tileset-tile-options:not(.spot-tile-config)');
        if(panel){
            this.events.bindOptionButtons(tilesetIndex, panel, null);
            this.events.bindClearButtons(tilesetIndex, panel, null);
            this.events.bindPositionCells(tilesetIndex, panel, null);
        }
        this.events.bindReferenceButtons(rowEl);
        this.apply.applyToRow(tilesetIndex, rowEl);
    }

    bindGlobal(panelEl)
    {
        this.bindCancelButtons(panelEl);
        this.events.initReferenceModal();
        this.events.bindReferenceButtons(panelEl);
        this.events.bindOptionButtons(-1, panelEl, null);
        this.events.bindClearButtons(-1, panelEl, null);
        this.events.bindPositionCells(-1, panelEl, null);
        this.apply.applyToRow(-1, null);
    }

}
window.TilesetTileOptionsBinder = TilesetTileOptionsBinder;
