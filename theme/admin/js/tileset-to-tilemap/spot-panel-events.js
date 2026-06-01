class TilesetSpotPanelEvents
{
    constructor(binder)
    {
        this.binder = binder;
    }

    bindSpotRows(tilesetIndex)
    {
        let refs = this.binder.app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        this.ensureDelegation(tilesetIndex, refs);
        this.applySpotRowStates(tilesetIndex, refs);
    }

    ensureDelegation(tilesetIndex, refs)
    {
        if(refs.spotPanelDelegationBound){
            return;
        }
        refs.spotPanelDelegationBound = true;
        let list = refs.list;
        list.addEventListener('click', (event) => this.handleSpotPanelClick(tilesetIndex, event));
    }

    applySpotRowStates(tilesetIndex, refs)
    {
        let spotRows = refs.list.querySelectorAll('.spot-row');
        for(let spotRow of spotRows){
            let spotName = spotRow.dataset.spotName;
            if(!spotName){
                continue;
            }
            let spot = this.binder.findSpot(tilesetIndex, spotName);
            if(spot){
                this.binder.apply.applySpotToRow(spotRow, spot);
            }
        }
    }

    handleSpotPanelClick(tilesetIndex, event)
    {
        let spotRow = event.target.closest('.spot-row');
        if(!spotRow){
            return;
        }
        let spotName = spotRow.dataset.spotName;
        let target = event.target;
        if(target.closest('.tile-pick-cancel')){
            this.binder.deactivate();
            return;
        }
        if(this.handleSpotClearClicks(tilesetIndex, target, event, spotName)){
            return;
        }
        let positionCell = target.closest('.tile-position-cell');
        if(positionCell){
            this.handlePositionCellClick(tilesetIndex, positionCell, spotName);
            return;
        }
        let optionBtn = target.closest('.tile-option-btn');
        if(optionBtn){
            this.handleOptionBtnClick(tilesetIndex, optionBtn, spotName);
        }
    }

    handleSpotClearClicks(tilesetIndex, target, event, spotName)
    {
        let multiClear = target.closest('.tile-multi-cell-clear');
        if(multiClear){
            event.stopPropagation();
            let mc = multiClear.closest('.tile-option-multi-values');
            if(mc){
                let key = mc.dataset.multiOption;
                this.binder.clearer.clearArrayItem(tilesetIndex, key, multiClear.dataset.multiValue, spotName);
            }
            return true;
        }
        let cellClear = target.closest('.tile-position-cell-clear');
        if(cellClear){
            event.stopPropagation();
            this.handleCellClearClick(tilesetIndex, cellClear, spotName);
            return true;
        }
        let groupClear = target.closest('.tile-options-group-clear-all');
        if(groupClear){
            event.stopPropagation();
            let optionKey = groupClear.dataset.option;
            if(optionKey){
                this.dispatchClearGroup(tilesetIndex, optionKey, spotName);
            }
            return true;
        }
        let optionClear = target.closest('.tile-option-clear');
        if(optionClear){
            event.stopPropagation();
            let optionKey = optionClear.dataset.option;
            if(optionKey){
                this.binder.clearOption(tilesetIndex, optionKey, null, spotName);
            }
            return true;
        }
        return false;
    }

    handleCellClearClick(tilesetIndex, cellClearBtn, spotName)
    {
        let cell = cellClearBtn.closest('.tile-position-cell');
        let grid = cellClearBtn.closest('.tile-position-grid');
        if(!cell || !grid){
            return;
        }
        let optKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
        this.binder.clearOption(tilesetIndex, optKey, cell.dataset.pos, spotName);
    }

    dispatchClearGroup(tilesetIndex, optionKey, spotName)
    {
        if('ground' === optionKey){
            this.binder.clearGroundGroup(tilesetIndex, spotName);
            return;
        }
        if('pathTilesGroup' === optionKey){
            this.binder.clearPathTilesGroup(tilesetIndex);
            return;
        }
        this.binder.clearOption(tilesetIndex, optionKey, null, spotName);
    }

    isSameActiveState(tilesetIndex, optionKey, spotName)
    {
        return this.binder.isSameActiveState(tilesetIndex, optionKey, spotName);
    }

    handleOptionBtnClick(tilesetIndex, optionBtn, spotName)
    {
        let optionKey = optionBtn.dataset.option;
        if(!optionKey){
            return;
        }
        let isMulti = 'true' === optionBtn.dataset.multi;
        let b = this.binder;
        let isSameState = this.isSameActiveState(tilesetIndex, optionKey, spotName)
            && null === b.activePositionKey;
        b.deactivate();
        if(isSameState){
            return;
        }
        b.activateOption(tilesetIndex, optionKey, isMulti, spotName ? spotName : null);
        optionBtn.classList.add('active');
        let rowEl = b.getTilesetRowEl(tilesetIndex);
        if(rowEl){
            b.apply.updateBanner(tilesetIndex, rowEl);
        }
        b.app.renderer.renderCanvas(tilesetIndex);
    }

    handlePositionCellClick(tilesetIndex, cell, spotName)
    {
        let grid = cell.closest('.tile-position-grid');
        if(!grid){
            return;
        }
        let optionKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
        let posKey = cell.dataset.pos;
        let b = this.binder;
        let isSameState = this.isSameActiveState(tilesetIndex, optionKey, spotName)
            && b.activePositionKey === posKey;
        b.deactivate();
        if(isSameState){
            return;
        }
        b.activateOption(tilesetIndex, optionKey, false, spotName ? spotName : null);
        b.activatePosition(posKey);
    }

}
window.TilesetSpotPanelEvents = TilesetSpotPanelEvents;
