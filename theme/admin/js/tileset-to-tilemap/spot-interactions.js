class TilesetSpotInteractions
{
    constructor(editor)
    {
        this.editor = editor;
    }

    dispatchSpot(tilesetIndex, event, eventType, spotRow)
    {
        let context = {
            target: event.target,
            spotRow,
            spotIndex: Number(spotRow.dataset.spotIndex)
        };
        if('click' === eventType){
            this.handleSpotClick(tilesetIndex, event, context);
            return;
        }
        if('change' === eventType){
            this.handleSpotChange(tilesetIndex, context);
            return;
        }
        if('input' === eventType){
            this.handleSpotInput(tilesetIndex, context);
            return;
        }
        if('focusout' === eventType){
            this.handleSpotFocusOut(tilesetIndex, context);
        }
    }

    handleSpotClick(tilesetIndex, event, context)
    {
        if(context.target.closest('.spot-bulk-select')){
            event.stopPropagation();
            return;
        }
        if(context.target.closest('.spot-lock-btn')){
            event.stopPropagation();
            this.toggleSpotLock(tilesetIndex, context.spotIndex, context.spotRow);
            return;
        }
        if(context.target.closest('.spot-delete-btn')){
            this.requestDeleteSpot(tilesetIndex, context.spotIndex);
            return;
        }
        if(context.target.closest('.spot-row-header')){
            if(context.target.closest('.spot-name-input')){
                return;
            }
            this.toggleSpotSelection(tilesetIndex, context.spotIndex);
        }
    }

    handleSpotChange(tilesetIndex, context)
    {
        let app = this.editor.app;
        let spot = app.state[tilesetIndex].spots[context.spotIndex];
        if(context.target.matches('.spot-bulk-select')){
            spot.bulkSelected = context.target.checked;
            return;
        }
        if(context.target.matches('[data-prop]') && 'checkbox' === context.target.type){
            let key = context.target.dataset.prop;
            spot[key] = context.target.checked;
            if('isElement' === key){
                this.editor.spotEditor.toggleIsElementRows(context.spotRow, context.target.checked);
            }
        }
    }

    handleSpotInput(tilesetIndex, context)
    {
        let app = this.editor.app;
        if(!context.target.matches('[data-prop]')){
            return;
        }
        let spot = app.state[tilesetIndex].spots[context.spotIndex];
        let key = context.target.dataset.prop;
        if('number' === context.target.type){
            spot[key] = '' === context.target.value ? null : SharedUtils.toNumber(context.target.value, 0);
            return;
        }
        if('depth' === key){
            let value = context.target.value.trim();
            if('' === value || 'false' === value){
                spot[key] = null;
                return;
            }
            if('true' === value){
                spot[key] = true;
                return;
            }
            spot[key] = value;
            return;
        }
        spot[key] = context.target.value;
    }

    handleSpotFocusOut(tilesetIndex, context)
    {
        if(!context.target.matches('.spot-name-input')){
            return;
        }
        let app = this.editor.app;
        let oldName = app.state[tilesetIndex].spots[context.spotIndex].name;
        let newName = context.target.value;
        if(oldName === newName){
            return;
        }
        app.state[tilesetIndex].spots[context.spotIndex].name = newName;
        context.spotRow.dataset.spotName = newName;
        if(app.tileOptionsBinder && app.tileOptionsBinder.activeSpotName === oldName){
            app.tileOptionsBinder.activeSpotName = newName;
        }
    }

    toggleSpotLock(tilesetIndex, spotIndex, spotRow)
    {
        let app = this.editor.app;
        let spot = app.state[tilesetIndex].spots[spotIndex];
        spot.approved = !spot.approved;
        SharedUtils.applyLockVisual(spotRow.querySelector('.spot-lock-btn'), spot.approved);
    }

    requestDeleteSpot(tilesetIndex, spotIndex)
    {
        let app = this.editor.app;
        let spot = app.state[tilesetIndex].spots[spotIndex];
        let spotName = spot.name;
        app.modals.show(
            'Delete "'+spotName+'"?',
            () => {
                if(app.tileOptionsBinder && app.tileOptionsBinder.activeSpotName === spotName){
                    app.tileOptionsBinder.deactivate();
                }
                app.state[tilesetIndex].spots.splice(spotIndex, 1);
                this.editor.renderLegend(tilesetIndex);
            }
        );
    }

    toggleSpotSelection(tilesetIndex, spotIndex)
    {
        let app = this.editor.app;
        let previousSpot = app.selectedSpot;
        let wasSelected = previousSpot
            && previousSpot.tilesetIndex === tilesetIndex
            && previousSpot.spotIndex === spotIndex;
        app.selectedSpot = wasSelected ? null : { tilesetIndex, spotIndex };
        this.applySpotSelectionVisual(tilesetIndex, previousSpot);
        app.renderer.renderCanvas(tilesetIndex);
    }

    applySpotSelectionVisual(tilesetIndex, previousSpot)
    {
        let refs = this.editor.app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        let spotRows = refs.list.querySelectorAll('.spot-row');
        if(previousSpot
            && previousSpot.tilesetIndex === tilesetIndex
            && spotRows[previousSpot.spotIndex]){
            let prevDetail = spotRows[previousSpot.spotIndex].querySelector('.spot-detail');
            if(prevDetail){
                prevDetail.classList.add('hidden');
            }
        }
        let app = this.editor.app;
        if(app.selectedSpot && app.selectedSpot.tilesetIndex === tilesetIndex){
            let currentRow = spotRows[app.selectedSpot.spotIndex];
            if(currentRow){
                let currentDetail = currentRow.querySelector('.spot-detail');
                if(currentDetail){
                    currentDetail.classList.remove('hidden');
                }
            }
        }
    }
}
window.TilesetSpotInteractions = TilesetSpotInteractions;
