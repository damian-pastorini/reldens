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
        let refs = app.refs[tilesetIndex];
        let searchTerm = refs.legendSearch ? refs.legendSearch.value.toLowerCase() : '';
        let showElements = refs.showElementsCheck ? refs.showElementsCheck.checked : true;
        let showClusters = refs.showClustersCheck ? refs.showClustersCheck.checked : true;
        let showSpots = refs.showSpotsCheck ? refs.showSpotsCheck.checked : true;
        let filters = { searchTerm, showElements, showClusters, showSpots };
        for(let i = 0; i < elements.length; i++){
            let element = elements[i];
            let frag = template.content.cloneNode(true);
            this.buildElementRow(frag, element, tilesetIndex, i, filters);
            list.appendChild(frag);
        }
        let spots = tileset.spots || [];
        let spotTemplate = app.getElement('.spot-row-template');
        if(showSpots && spots.length && spotTemplate){
            for(let si = 0; si < spots.length; si++){
                this.editor.spotEditor.appendSpotRow(
                    list, spots[si], si, tileset, tilesetIndex, spotTemplate
                );
            }
        }
        if(app.tileOptionsBinder){
            app.tileOptionsBinder.bindSpotRows(tilesetIndex);
        }
    }

    buildElementRow(frag, element, tilesetIndex, i, filters)
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
        let isClusterType = 'cluster' === element.type;
        let isSpotType = 'spot' === element.type;
        let matchesType = (isClusterType && filters.showClusters)
            || (isSpotType && filters.showSpots)
            || (!isClusterType && !isSpotType && filters.showElements);
        let matchesSearch = !filters.searchTerm || element.name.toLowerCase().includes(filters.searchTerm);
        row.classList.toggle('hidden', !matchesType || !matchesSearch);
        let bulkCheckbox = frag.querySelector('.element-bulk-select');
        bulkCheckbox.checked = element.bulkSelected || false;
        bulkCheckbox.addEventListener('click', (e) => e.stopPropagation());
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

    setupElementRowHeader(element, tilesetIndex, capturedI, els)
    {
        let app = this.editor.app;
        if(element.approved){
            els.lockBtn.classList.add('locked');
            els.lockIcon.src = '/assets/admin/lock-solid.svg';
        }
        els.lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let el = app.state[tilesetIndex].elements[capturedI];
            el.approved = !el.approved;
            els.lockBtn.classList.toggle('locked', el.approved);
            els.lockIcon.src = '/assets/admin/'+(el.approved ? 'lock-solid' : 'unlock-solid')+'.svg';
        });
        els.header.addEventListener('click', (e) => {
            if(e.target === els.nameInput){
                return;
            }
            if(e.target === els.lockBtn || els.lockBtn.contains(e.target)){
                return;
            }
            if(e.target === els.deleteBtn || els.deleteBtn.contains(e.target)){
                return;
            }
            let wasSelected = app.selectedTileset === tilesetIndex && app.selectedElement === capturedI;
            this.editor.selectElement(tilesetIndex, capturedI);
            if(!wasSelected){
                this.editor.scrollCanvasToElement(tilesetIndex, capturedI);
            }
        });
        els.deleteBtn.addEventListener('click', () => {
            this.editor.removeElement(tilesetIndex, capturedI);
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
            splitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editor.splitCluster(tilesetIndex, capturedI);
            });
            convertBtn.classList.remove('hidden');
            convertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let el = app.state[tilesetIndex].elements[capturedI];
                let newName = this.editor.resolveConvertName(tilesetIndex, capturedI, el.name);
                el.type = 'element';
                el.approved = true;
                el.name = newName;
                app.refresh(tilesetIndex);
            });
        }
        if(!app.showAiControls || !app.activeProviders.length){
            return;
        }
        SharedUtils.populateProviderSelect(aiSelect, app.activeProviders);
        aiDetectBtn.textContent = 'cluster' === element.type ? 'Detect Elements' : 'Detect Layers';
        aiControls.classList.remove('hidden');
        aiDetectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            app.aiElement.runAiDetectSingle(tilesetIndex, capturedI, aiSelect.value, aiDetectBtn);
        });
        aiNameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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

    handleRadioChange(radio, customRadio)
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
                this.handleRadioChange(radio, customRadio);
            });
        }
        customInput.addEventListener('input', () => {
            this.editor.app.customLayerSuffix = customInput.value;
            if(customRadio.checked){
                this.editor.app.activeLayerType = customInput.value;
            }
        });
        customInput.addEventListener('click', (e) => e.stopPropagation());
    }

    bindElementInputEvents(tilesetIndex, capturedI, els)
    {
        let app = this.editor.app;
        els.nameInput.addEventListener('blur', () => {
            let valid = /^[a-z]+(?:-[a-z]+)*-\d+(?:-\d+)*$/.test(els.nameInput.value);
            app.state[tilesetIndex].elements[capturedI].name = els.nameInput.value;
            els.row.classList.toggle('element-name-invalid', !valid);
            app.generator.updateGenerateButtonState();
        });
        els.quantityInput.addEventListener('input', () => {
            app.state[tilesetIndex].elements[capturedI].quantity = Number(els.quantityInput.value) || 1;
        });
        els.freeSpaceInput.addEventListener('input', () => {
            app.state[tilesetIndex].elements[capturedI].freeSpaceAround = Number(els.freeSpaceInput.value) || 0;
        });
        els.allowPathsInput.addEventListener('change', () => {
            app.state[tilesetIndex].elements[capturedI].allowPathsInFreeSpace = els.allowPathsInput.checked;
        });
        this.bindRadioChangeEvents(els.radios, els.customRadio, els.customInput);
    }
}
