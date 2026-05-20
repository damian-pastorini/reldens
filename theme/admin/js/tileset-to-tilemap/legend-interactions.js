class TilesetLegendInteractions
{
    constructor(editor)
    {
        this.editor = editor;
    }

    bindListContainer(tilesetIndex)
    {
        let refs = this.editor.app.refs[tilesetIndex];
        if(!refs || !refs.list || refs.legendDelegationBound){
            return;
        }
        refs.legendDelegationBound = true;
        let list = refs.list;
        list.addEventListener('click', (event) => this.dispatch(tilesetIndex, event, 'click'));
        list.addEventListener('change', (event) => this.dispatch(tilesetIndex, event, 'change'));
        list.addEventListener('input', (event) => this.dispatch(tilesetIndex, event, 'input'));
        list.addEventListener('focusout', (event) => this.dispatch(tilesetIndex, event, 'focusout'));
    }

    dispatch(tilesetIndex, event, eventType)
    {
        let spotRow = event.target.closest('.spot-row');
        if(spotRow){
            this.editor.spotInteractions.dispatchSpot(tilesetIndex, event, eventType, spotRow);
            return;
        }
        let elementRow = event.target.closest('.element-row');
        if(!elementRow){
            return;
        }
        let context = {
            target: event.target,
            elementRow,
            elementIndex: Number(elementRow.dataset.elementIndex)
        };
        if('click' === eventType){
            this.handleListClick(tilesetIndex, event, context);
            return;
        }
        if('change' === eventType){
            this.handleListChange(tilesetIndex, context);
            return;
        }
        if('input' === eventType){
            this.handleListInput(tilesetIndex, context);
            return;
        }
        if('focusout' === eventType){
            this.handleListFocusOut(tilesetIndex, context);
        }
    }

    handleListClick(tilesetIndex, event, context)
    {
        if(context.target.closest('.element-bulk-select')){
            event.stopPropagation();
            return;
        }
        if(context.target.closest('.layer-type-custom-input')){
            event.stopPropagation();
            return;
        }
        if(context.target.closest('.element-lock-btn')){
            event.stopPropagation();
            this.toggleElementLock(tilesetIndex, context.elementIndex, context.elementRow);
            return;
        }
        if(context.target.closest('.element-delete-btn')){
            this.requestDeleteElement(tilesetIndex, context.elementIndex);
            return;
        }
        if(context.target.closest('.cluster-split-btn')){
            event.stopPropagation();
            this.editor.splitCluster(tilesetIndex, context.elementIndex);
            return;
        }
        if(context.target.closest('.cluster-convert-btn')){
            event.stopPropagation();
            this.convertCluster(tilesetIndex, context.elementIndex);
            return;
        }
        if(context.target.closest('.element-ai-detect-btn')){
            event.stopPropagation();
            this.runAiDetectForElement(tilesetIndex, context.elementIndex, context.elementRow);
            return;
        }
        if(context.target.closest('.element-ai-name-btn')){
            event.stopPropagation();
            this.runAiNameForElement(tilesetIndex, context.elementIndex, context.elementRow);
            return;
        }
        if(context.target.closest('.element-row-header')){
            if(context.target.closest('.element-name-input')){
                return;
            }
            this.selectElementFromHeader(tilesetIndex, context.elementIndex);
        }
    }

    selectElementFromHeader(tilesetIndex, elementIndex)
    {
        let app = this.editor.app;
        let wasSelected = app.selectedTileset === tilesetIndex && app.selectedElement === elementIndex;
        this.editor.selectElement(tilesetIndex, elementIndex);
        if(!wasSelected){
            this.editor.scroller.scrollCanvasToElement(tilesetIndex, elementIndex);
        }
    }

    handleListChange(tilesetIndex, context)
    {
        let app = this.editor.app;
        if(context.target.matches('.element-bulk-select')){
            app.state[tilesetIndex].elements[context.elementIndex].bulkSelected = context.target.checked;
            app.generator.updateGenerateButtonState();
            return;
        }
        if(context.target.matches('.element-allow-paths')){
            app.state[tilesetIndex].elements[context.elementIndex].allowPathsInFreeSpace = context.target.checked;
            return;
        }
        if(context.target.matches('.layer-type-radio')){
            this.editor.legendRenderer.handleRadioChange(context.target);
        }
    }

    handleListInput(tilesetIndex, context)
    {
        let app = this.editor.app;
        if(context.target.matches('.element-quantity')){
            app.state[tilesetIndex].elements[context.elementIndex].quantity = Number(context.target.value) || 1;
            return;
        }
        if(context.target.matches('.element-free-space')){
            app.state[tilesetIndex].elements[context.elementIndex].freeSpaceAround = Number(context.target.value) || 0;
            return;
        }
        if(context.target.matches('.layer-type-custom-input')){
            app.customLayerSuffix = context.target.value;
            let customRadio = context.elementRow.querySelector('.layer-type-custom-radio');
            if(customRadio && customRadio.checked){
                app.activeLayerType = context.target.value;
            }
        }
    }

    handleListFocusOut(tilesetIndex, context)
    {
        if(context.target.matches('.element-name-input')){
            let app = this.editor.app;
            let valid = /^[a-z]+(?:-[a-z]+)*-\d+(?:-\d+)*$/.test(context.target.value);
            app.state[tilesetIndex].elements[context.elementIndex].name = context.target.value;
            context.elementRow.classList.toggle('element-name-invalid', !valid);
            app.generator.updateGenerateButtonState();
        }
    }

    toggleElementLock(tilesetIndex, elementIndex, elementRow)
    {
        let app = this.editor.app;
        let elementState = app.state[tilesetIndex].elements[elementIndex];
        elementState.approved = !elementState.approved;
        let lockBtn = elementRow.querySelector('.element-lock-btn');
        let lockIcon = lockBtn.querySelector('.lock-icon');
        lockBtn.classList.toggle('locked', elementState.approved);
        lockIcon.src = '/assets/admin/'+(elementState.approved ? 'lock-solid' : 'unlock-solid')+'.svg';
    }

    requestDeleteElement(tilesetIndex, elementIndex)
    {
        let app = this.editor.app;
        let elementName = app.state[tilesetIndex].elements[elementIndex].name;
        app.modals.show(
            'Delete "'+elementName+'"?',
            () => this.editor.removeElement(tilesetIndex, elementIndex)
        );
    }

    convertCluster(tilesetIndex, elementIndex)
    {
        let app = this.editor.app;
        let elementState = app.state[tilesetIndex].elements[elementIndex];
        let newName = this.editor.namer.resolveConvertName(tilesetIndex, elementIndex, elementState.name);
        elementState.type = 'element';
        elementState.approved = true;
        elementState.name = newName;
        this.editor.applyElementTypeUpdate(tilesetIndex, elementIndex);
        app.renderer.renderCanvas(tilesetIndex);
        app.generator.updateGenerateButtonState();
    }

    runAiDetectForElement(tilesetIndex, elementIndex, elementRow)
    {
        let app = this.editor.app;
        let aiSelect = elementRow.querySelector('.element-ai-select');
        let aiDetectBtn = elementRow.querySelector('.element-ai-detect-btn');
        app.aiElement.runAiDetectSingle(tilesetIndex, elementIndex, aiSelect.value, aiDetectBtn);
    }

    runAiNameForElement(tilesetIndex, elementIndex, elementRow)
    {
        let app = this.editor.app;
        let aiSelect = elementRow.querySelector('.element-ai-select');
        let aiNameBtn = elementRow.querySelector('.element-ai-name-btn');
        app.aiElement.runAiNameSingle(tilesetIndex, elementIndex, aiSelect.value, aiNameBtn);
    }
}
window.TilesetLegendInteractions = TilesetLegendInteractions;
