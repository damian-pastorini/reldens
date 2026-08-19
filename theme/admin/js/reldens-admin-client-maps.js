class AdminClientMaps
{
    bindTilesetAlertIcons()
    {
        let tilesetAlertIcons = document.querySelectorAll('.alert-icon');
        if(!tilesetAlertIcons){
            return;
        }
        for(let icon of tilesetAlertIcons){
            icon.addEventListener('click', () => {
                let message = icon.nextElementSibling;
                if(message && message.classList.contains('tileset-info-message')){
                    message.classList.toggle('hidden');
                }
            });
        }
    }

    removeRequiredUploadButtons(container)
    {
        let remainingFiles = container.querySelectorAll('.upload-current-file');
        if(2 !== remainingFiles.length){
            return;
        }
        let allRemoveButtons = container.querySelectorAll('.remove-upload-btn');
        for(let removeBtn of allRemoveButtons){
            removeBtn.remove();
        }
    }

    appendRemovedFileName(form, fieldName, fileName)
    {
        let hiddenFieldName = 'removed_'+fieldName;
        let existingHiddenInput = form.querySelector('input[name="'+hiddenFieldName+'"]');
        if(existingHiddenInput){
            let currentValue = existingHiddenInput.value;
            let filesArray = currentValue ? currentValue.split(',') : [];
            if(-1 === filesArray.indexOf(fileName)){
                filesArray.push(fileName);
            }
            existingHiddenInput.value = filesArray.join(',');
            return;
        }
        let hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = hiddenFieldName;
        hiddenInput.value = fileName;
        form.appendChild(hiddenInput);
    }

    appendClearField(form, fieldName)
    {
        let clearFieldName = 'clear_'+fieldName;
        let existingClearInput = form.querySelector('input[name="'+clearFieldName+'"]');
        if(existingClearInput){
            return;
        }
        let clearInput = document.createElement('input');
        clearInput.type = 'hidden';
        clearInput.name = clearFieldName;
        clearInput.value = '1';
        form.appendChild(clearInput);
    }

    handleRemoveUpload(button)
    {
        let fieldName = button.getAttribute('data-field');
        let fileName = button.getAttribute('data-filename');
        let fileInput = document.getElementById(fieldName);
        let form = fileInput?.closest('form');
        if(!fileInput || !form){
            return;
        }
        let currentFileDisplay = button.closest('.upload-current-file');
        let container = button.closest('.upload-files-container');
        let isRequired = container && 'true' === container.dataset.required;
        if(isRequired){
            this.removeRequiredUploadButtons(container);
        }
        if(currentFileDisplay){
            currentFileDisplay.remove();
        }
        if(fileName){
            this.appendRemovedFileName(form, fieldName, fileName);
            return;
        }
        fileInput.value = '';
        this.appendClearField(form, fieldName);
    }

    bindRemoveUpload()
    {
        let removeUploadButtons = document.querySelectorAll('.remove-upload-btn');
        if(!removeUploadButtons){
            return;
        }
        for(let button of removeUploadButtons){
            button.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleRemoveUpload(button);
            });
        }
    }

    bindEntityMapLoader()
    {
        let entityDataElement = document.querySelector('[data-entity-serialized-data]');
        if(!entityDataElement){
            return;
        }
        let entityData = entityDataElement?.dataset.entitySerializedData
            ? JSON.parse(entityDataElement.dataset.entitySerializedData) // HOFF
            : false;
        new AdminRoomsLinkPicker().bind(entityData);
        new AdminObjectTilePicker().bind(entityData);
        new AdminObjectLayerSelector().bind(entityData);
        this.bindRoomStartingPoint(entityData);
    }

    bindRoomStartingPoint(entityData)
    {
        let container = document.querySelector('.room-starting-point-container');
        if(!container || !entityData || !entityData.map_filename){
            return;
        }
        let elementStartX = document.querySelector('#roomStartingPointX');
        let elementStartY = document.querySelector('#roomStartingPointY');
        adminMapRenderer.loadAndCreateMap(
            entityData.map_filename,
            entityData.scene_images,
            container,
            (event, data) => this.applyStartingPointTile(event, data, elementStartX, elementStartY),
            true,
            null,
            {x: elementStartX ? elementStartX.value : null, y: elementStartY ? elementStartY.value : null}
        );
    }

    applyStartingPointTile(event, data, elementStartX, elementStartY)
    {
        let tileData = adminMapRenderer.calculateTileData(event, data);
        if(elementStartX){
            elementStartX.value = tileData.positionTileX;
        }
        if(elementStartY){
            elementStartY.value = tileData.positionTileY;
        }
    }

    deactivateAllWizardContainers(wizardOptionsContainer)
    {
        for(let container of wizardOptionsContainer){
            container.classList.remove('active');
        }
    }

    bindMapsWizardOptions()
    {
        let mapsWizardsOptions = document.querySelectorAll('.maps-wizard-form .map-wizard-option.with-state');
        for(let option of mapsWizardsOptions){
            option.addEventListener('click', (event) => {
                let wizardOptionsContainer = document.querySelectorAll('.wizard-option-container');
                this.deactivateAllWizardContainers(wizardOptionsContainer);
                event.currentTarget.parentNode.parentNode.classList.add('active');
            });
        }
    }

    bindMapCanvas()
    {
        let mapCanvasElements = document.querySelectorAll('.mapCanvas');
        for(let mapCanvas of mapCanvasElements){
            mapCanvas.addEventListener(
                'wheel',
                (wheelEvent) => adminFunctions.blockCtrlWheelZoom(wheelEvent),
                {passive: false}
            );
            if(!mapCanvas.dataset?.mapJson){
                continue;
            }
            let tileset = new Image();
            // for now, we will only handle 1 image cases:
            tileset.src = mapCanvas.dataset.imageKey;
            tileset.onload = () => {
                adminMapRenderer.fetchMapFileAndDraw(mapCanvas.dataset.mapJson, tileset, mapCanvas);
            };
            tileset.onerror = () => {
                tileset.dataset.loadError = '1';
            };
        }
    }

    bindMapsImportSticky()
    {
        let mapsImportSubmitContainer = document.querySelector('.maps-import-form .submit-container');
        if(!mapsImportSubmitContainer){
            return;
        }
        let naturalTop = mapsImportSubmitContainer.getBoundingClientRect().top + window.scrollY;
        window.addEventListener('scroll', function(){
            mapsImportSubmitContainer.classList.toggle('is-sticky', window.scrollY > naturalTop);
        }, {passive: true});
    }

    bindGoBackButton()
    {
        let goBackButton = document.querySelector('.maps-wizard-go-back');
        if(!goBackButton){
            return;
        }
        goBackButton.addEventListener('click', () => {
            let goBackUrl = goBackButton.dataset.goBackUrl;
            adminFunctions.showConfirmDialog((confirmed) => {
                if(confirmed){
                    window.location.href = goBackUrl;
                }
            }, {
                title: 'Go Back',
                message: 'If you go back, the generated maps will be lost. Are you sure?',
                confirmText: 'Leave',
                confirmClass: 'button-secondary',
                cancelText: 'Stay',
                cancelClass: 'button-primary'
            });
        });
    }

    bind()
    {
        this.bindTilesetAlertIcons();
        this.bindRemoveUpload();
        this.bindEntityMapLoader();
        this.bindMapsWizardOptions();
        new AdminMapElementsEditorLauncher().bind();
        new AdminMapPreviewModal().bind();
        this.bindMapCanvas();
        this.bindMapsImportSticky();
        this.bindGoBackButton();
    }
}
window.AdminClientMaps = AdminClientMaps;
