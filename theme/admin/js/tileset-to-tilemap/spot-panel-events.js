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
            this.binder.clearPositionCell(tilesetIndex, cellClear, spotName);
            return true;
        }
        let groupClear = target.closest('.tile-options-group-clear-all, .tile-option-clear');
        if(groupClear){
            event.stopPropagation();
            let optionKey = groupClear.dataset.option;
            if(optionKey){
                this.binder.dispatchGroupClear(tilesetIndex, optionKey, spotName);
            }
            return true;
        }
        return false;
    }

    handleOptionBtnClick(tilesetIndex, optionBtn, spotName)
    {
        let optionKey = optionBtn.dataset.option;
        if(!optionKey){
            return;
        }
        let isMulti = 'true' === optionBtn.dataset.multi;
        if(!this.binder.toggleActivation(tilesetIndex, optionKey, null, isMulti, spotName)){
            return;
        }
        this.binder.showActiveOptionAndRender(tilesetIndex, optionBtn);
    }

    handlePositionCellClick(tilesetIndex, cell, spotName)
    {
        let grid = cell.closest('.tile-position-grid');
        if(!grid){
            return;
        }
        let optionKey = cell.dataset.option ? cell.dataset.option : grid.dataset.option;
        this.binder.toggleActivation(tilesetIndex, optionKey, cell.dataset.pos, false, spotName);
    }

}
window.TilesetSpotPanelEvents = TilesetSpotPanelEvents;
