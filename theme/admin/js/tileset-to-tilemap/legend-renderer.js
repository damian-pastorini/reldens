/* exported TilesetLegendRenderer */
class TilesetLegendRenderer
{
    constructor(editor)
    {
        this.editor = editor;
    }

    renderLegend(tilesetIndex)
    {
        let app = this.editor.app;
        let list = app.refs[tilesetIndex].list;
        list.textContent = '';
        let template = app.getElement('.element-row-template');
        let tileset = app.state[tilesetIndex];
        let elements = tileset.elements;
        for(let i = 0; i < elements.length; i++){
            let element = elements[i];
            let frag = template.content.cloneNode(true);
            this.buildElementRow(frag, element, tilesetIndex, i);
            list.appendChild(frag);
        }
        let spots = tileset.spots || [];
        let spotTemplate = app.getElement('.spot-row-template');
        if(spots.length && spotTemplate){
            for(let si = 0; si < spots.length; si++){
                this.editor.spotEditor.appendSpotRow(
                    list, spots[si], si, tileset, tilesetIndex, spotTemplate
                );
            }
        }
        if(app.tileOptionsBinder){
            app.tileOptionsBinder.bindSpotRows(tilesetIndex);
        }
        this.applyLegendVisibility(tilesetIndex);
    }

    readShowSpots(tilesetIndex)
    {
        let refs = this.editor.app.refs[tilesetIndex];
        if(!refs || !refs.showSpotsCheck){
            return true;
        }
        return refs.showSpotsCheck.checked;
    }

    applyLegendVisibility(tilesetIndex)
    {
        let app = this.editor.app;
        let refs = app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        let filter = this.editor.elementVisibilityFilter(refs);
        let elements = app.state[tilesetIndex].elements;
        let elementRows = refs.list.querySelectorAll('.element-row');
        let limit = Math.min(elementRows.length, elements.length);
        for(let i = 0; i < limit; i++){
            elementRows[i].classList.toggle('hidden', !this.editor.matchesVisibilityFilter(elements[i], filter));
        }
        for(let spotRow of refs.list.querySelectorAll('.spot-row')){
            spotRow.classList.toggle('hidden', !filter.showSpots);
        }
    }

    buildElementRow(frag, element, tilesetIndex, i)
    {
        let app = this.editor.app;
        let isSelected = app.selectedTileset === tilesetIndex && app.selectedElement === i;
        let row = frag.querySelector('.element-row');
        row.dataset.elementIndex = i;
        if(SharedUtils.CLUSTER_TYPE === element.type){
            row.classList.add('element-type-cluster');
        }
        let typeIcon = frag.querySelector('.element-type-icon');
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        typeIcon.src = isCluster ? SharedUtils.ICON_PATHS.cubes : SharedUtils.ICON_PATHS.cube;
        typeIcon.alt = element.type;
        typeIcon.title = element.type;
        let bulkCheckbox = frag.querySelector('.element-bulk-select');
        bulkCheckbox.checked = element.bulkSelected || false;
        let nameInput = frag.querySelector('.element-name-input');
        nameInput.value = element.name;
        let expanded = frag.querySelector('.element-expanded');
        if(isSelected){
            expanded.classList.remove('hidden');
        }
        let quantityInput = frag.querySelector('.element-quantity');
        quantityInput.value = element.quantity;
        let freeSpaceInput = frag.querySelector('.element-free-space');
        freeSpaceInput.value = element.freeSpaceAround;
        let allowPathsInput = frag.querySelector('.element-allow-paths');
        allowPathsInput.checked = element.allowPathsInFreeSpace;
        let isCustomActive = isSelected && !SharedUtils.KNOWN_LAYER_TYPES.includes(app.activeLayerType);
        let radioName = 'layer-type-t'+tilesetIndex+'-e'+i;
        let radios = frag.querySelectorAll('.layer-type-radio');
        let customInput = frag.querySelector('.layer-type-custom-input');
        customInput.value = app.customLayerSuffix;
        this.assignRadioNames(radios, radioName, isCustomActive, isSelected);
        this.applyApprovedState(frag, element);
        this.applyElementTypeVisuals(frag, element);
    }

    applyApprovedState(frag, element)
    {
        SharedUtils.applyLockVisual(frag.querySelector('.element-lock-btn'), element.approved);
    }

    applyElementTypeVisuals(frag, element)
    {
        let app = this.editor.app;
        let splitBtn = frag.querySelector('.cluster-split-btn');
        let convertBtn = frag.querySelector('.cluster-convert-btn');
        let aiControls = frag.querySelector('.element-ai-controls');
        let aiSelect = frag.querySelector('.element-ai-select');
        let aiDetectBtn = frag.querySelector('.element-ai-detect-btn');
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        if(isCluster){
            splitBtn.classList.remove('hidden');
            convertBtn.classList.remove('hidden');
        }
        if(!app.showAiControls || !app.activeProviders.length){
            return;
        }
        SharedUtils.populateProviderSelect(aiSelect, app.activeProviders);
        aiDetectBtn.textContent = isCluster ? 'Detect Elements' : 'Detect Layers';
        aiControls.classList.remove('hidden');
    }

    assignRadioNames(radios, radioName, isCustomActive, isSelected)
    {
        for(let radio of radios){
            radio.name = radioName;
            if(radio.classList.contains('layer-type-custom-radio')){
                radio.checked = isCustomActive;
                continue;
            }
            radio.checked = isSelected && radio.value === this.editor.app.activeLayerType;
        }
    }

    handleRadioChange(radio)
    {
        if(!radio.checked){
            return;
        }
        if(radio.classList.contains('layer-type-custom-radio')){
            this.editor.app.activeLayerType = this.editor.app.customLayerSuffix;
            return;
        }
        this.editor.app.activeLayerType = radio.value;
    }

}
