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
        let showSpotsAtBuild = this.readShowSpots(tilesetIndex);
        if(showSpotsAtBuild && spots.length && spotTemplate){
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
        let showSpots = this.readShowSpots(tilesetIndex);
        let spots = app.state[tilesetIndex].spots || [];
        let hasSpotRows = null !== refs.list.querySelector('.spot-row');
        if(showSpots && spots.length && !hasSpotRows){
            this.renderLegend(tilesetIndex);
            return;
        }
        let showElements = refs.showElementsCheck ? refs.showElementsCheck.checked : true;
        let showClusters = refs.showClustersCheck ? refs.showClustersCheck.checked : true;
        let searchTerm = refs.legendSearch ? refs.legendSearch.value.toLowerCase() : '';
        let elements = app.state[tilesetIndex].elements;
        let elementRows = refs.list.querySelectorAll('.element-row');
        let limit = Math.min(elementRows.length, elements.length);
        for(let i = 0; i < limit; i++){
            let element = elements[i];
            let isCluster = 'cluster' === element.type;
            let isSpot = 'spot' === element.type;
            let matchesType = (isCluster && showClusters)
                || (isSpot && showSpots)
                || (!isCluster && !isSpot && showElements);
            let matchesSearch = !searchTerm || element.name.toLowerCase().includes(searchTerm);
            elementRows[i].classList.toggle('hidden', !matchesType || !matchesSearch);
        }
        for(let spotRow of refs.list.querySelectorAll('.spot-row')){
            spotRow.classList.toggle('hidden', !showSpots);
        }
    }

    buildElementRow(frag, element, tilesetIndex, i)
    {
        let app = this.editor.app;
        let isSelected = app.selectedTileset === tilesetIndex && app.selectedElement === i;
        let row = frag.querySelector('.element-row');
        if('cluster' === element.type){
            row.classList.add('element-type-cluster');
        }
        let typeIcon = frag.querySelector('.element-type-icon');
        typeIcon.src = '/assets/admin/'+('cluster' === element.type ? 'cubes-solid-full' : 'cube-solid-full')+'.svg';
        typeIcon.alt = element.type;
        typeIcon.title = element.type;
        let bulkCheckbox = frag.querySelector('.element-bulk-select');
        bulkCheckbox.checked = element.bulkSelected || false;
        bulkCheckbox.addEventListener('click', (event) => event.stopPropagation());
        bulkCheckbox.addEventListener('change', () => {
            app.state[tilesetIndex].elements[i].bulkSelected = bulkCheckbox.checked;
            app.generator.updateGenerateButtonState();
        });
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
        let knownLayerTypes = ['below-player', 'collisions', 'over-player', 'collisions-over-player', 'base', 'path'];
        let isCustomActive = isSelected && !knownLayerTypes.includes(app.activeLayerType);
        let radioName = 'layer-type-t'+tilesetIndex+'-e'+i;
        let radios = frag.querySelectorAll('.layer-type-radio');
        let customRadio = frag.querySelector('.layer-type-custom-radio');
        let customInput = frag.querySelector('.layer-type-custom-input');
        customInput.value = app.customLayerSuffix;
        this.assignRadioNames(radios, radioName, isCustomActive, isSelected);
        let lockBtn = frag.querySelector('.element-lock-btn');
        let lockIcon = lockBtn.querySelector('.lock-icon');
        let deleteBtn = frag.querySelector('.element-delete-btn');
        let header = frag.querySelector('.element-row-header');
        this.setupElementRowHeader(element, tilesetIndex, i, { nameInput, lockBtn, lockIcon, deleteBtn, header });
        this.setupElementTypeControls(frag, element, tilesetIndex, i);
        this.bindElementInputEvents(tilesetIndex, i, { nameInput, quantityInput, freeSpaceInput, allowPathsInput, radios, customRadio, customInput, row });
    }

    setupElementRowHeader(element, tilesetIndex, capturedI, controls)
    {
        let app = this.editor.app;
        if(element.approved){
            controls.lockBtn.classList.add('locked');
            controls.lockIcon.src = '/assets/admin/lock-solid.svg';
        }
        controls.lockBtn.addEventListener('click', (mouseEvent) => {
            mouseEvent.stopPropagation();
            let elementState = app.state[tilesetIndex].elements[capturedI];
            elementState.approved = !elementState.approved;
            controls.lockBtn.classList.toggle('locked', elementState.approved);
            controls.lockIcon.src = '/assets/admin/'+(elementState.approved ? 'lock-solid' : 'unlock-solid')+'.svg';
        });
        controls.header.addEventListener('click', (mouseEvent) => {
            if(mouseEvent.target === controls.nameInput){
                return;
            }
            if(mouseEvent.target === controls.lockBtn || controls.lockBtn.contains(mouseEvent.target)){
                return;
            }
            if(mouseEvent.target === controls.deleteBtn || controls.deleteBtn.contains(mouseEvent.target)){
                return;
            }
            let wasSelected = app.selectedTileset === tilesetIndex && app.selectedElement === capturedI;
            this.editor.selectElement(tilesetIndex, capturedI);
            if(!wasSelected){
                this.editor.scrollCanvasToElement(tilesetIndex, capturedI);
            }
        });
        controls.deleteBtn.addEventListener('click', () => {
            let elementName = app.state[tilesetIndex].elements[capturedI].name;
            app.modals.show(
                'Delete "'+elementName+'"?',
                () => this.editor.removeElement(tilesetIndex, capturedI)
            );
        });
    }

    setupElementTypeControls(frag, element, tilesetIndex, capturedI)
    {
        let app = this.editor.app;
        let splitBtn = frag.querySelector('.cluster-split-btn');
        let convertBtn = frag.querySelector('.cluster-convert-btn');
        let aiControls = frag.querySelector('.element-ai-controls');
        let aiSelect = frag.querySelector('.element-ai-select');
        let aiDetectBtn = frag.querySelector('.element-ai-detect-btn');
        let aiNameBtn = frag.querySelector('.element-ai-name-btn');
        if('cluster' === element.type){
            splitBtn.classList.remove('hidden');
            splitBtn.addEventListener('click', (mouseEvent) => {
                mouseEvent.stopPropagation();
                this.editor.splitCluster(tilesetIndex, capturedI);
            });
            convertBtn.classList.remove('hidden');
            convertBtn.addEventListener('click', (mouseEvent) => {
                mouseEvent.stopPropagation();
                let elementState = app.state[tilesetIndex].elements[capturedI];
                let newName = this.editor.resolveConvertName(tilesetIndex, capturedI, elementState.name);
                elementState.type = 'element';
                elementState.approved = true;
                elementState.name = newName;
                app.refresh(tilesetIndex);
            });
        }
        if(!app.showAiControls || !app.activeProviders.length){
            return;
        }
        SharedUtils.populateProviderSelect(aiSelect, app.activeProviders);
        aiDetectBtn.textContent = 'cluster' === element.type ? 'Detect Elements' : 'Detect Layers';
        aiControls.classList.remove('hidden');
        aiDetectBtn.addEventListener('click', (mouseEvent) => {
            mouseEvent.stopPropagation();
            app.aiElement.runAiDetectSingle(tilesetIndex, capturedI, aiSelect.value, aiDetectBtn);
        });
        aiNameBtn.addEventListener('click', (mouseEvent) => {
            mouseEvent.stopPropagation();
            app.aiElement.runAiNameSingle(tilesetIndex, capturedI, aiSelect.value, aiNameBtn);
        });
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

    bindRadioChangeEvents(radios, customRadio, customInput)
    {
        for(let radio of radios){
            radio.addEventListener('change', () => {
                this.handleRadioChange(radio);
            });
        }
        customInput.addEventListener('input', () => {
            this.editor.app.customLayerSuffix = customInput.value;
            if(customRadio.checked){
                this.editor.app.activeLayerType = customInput.value;
            }
        });
        customInput.addEventListener('click', (event) => event.stopPropagation());
    }

    bindElementInputEvents(tilesetIndex, capturedI, controls)
    {
        let app = this.editor.app;
        controls.nameInput.addEventListener('blur', () => {
            let valid = /^[a-z]+(?:-[a-z]+)*-\d+(?:-\d+)*$/.test(controls.nameInput.value);
            app.state[tilesetIndex].elements[capturedI].name = controls.nameInput.value;
            controls.row.classList.toggle('element-name-invalid', !valid);
            app.generator.updateGenerateButtonState();
        });
        controls.quantityInput.addEventListener('input', () => {
            app.state[tilesetIndex].elements[capturedI].quantity = Number(controls.quantityInput.value) || 1;
        });
        controls.freeSpaceInput.addEventListener('input', () => {
            app.state[tilesetIndex].elements[capturedI].freeSpaceAround = Number(controls.freeSpaceInput.value) || 0;
        });
        controls.allowPathsInput.addEventListener('change', () => {
            app.state[tilesetIndex].elements[capturedI].allowPathsInFreeSpace = controls.allowPathsInput.checked;
        });
        this.bindRadioChangeEvents(controls.radios, controls.customRadio, controls.customInput);
    }
}
