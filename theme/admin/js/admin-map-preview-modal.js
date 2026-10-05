class AdminMapPreviewModal
{
    bind()
    {
        let fieldValue = document.querySelector('.entity-view .field-value.with-view-button');
        if(!fieldValue){
            return;
        }
        let container = document.querySelector('.extra-content-container');
        if(!container){
            return;
        }
        let entityData = new window.AdminMapElementsEditorLauncher().parseEntityData(container);
        if(!entityData || !entityData.map_filename){
            return;
        }
        let anchor = fieldValue.querySelector('a');
        if(!anchor){
            return;
        }
        let mapCanvas = this.buildMapCanvas(entityData);
        fieldValue.appendChild(mapCanvas);
        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            adminFunctions.openElementModal(mapCanvas);
        });
        this.addRawJsonButton(fieldValue, anchor.getAttribute('href'));
    }

    buildMapCanvas(entityData)
    {
        let mapCanvas = document.createElement('canvas');
        mapCanvas.className = 'mapCanvas hidden';
        mapCanvas.dataset.toggle = 'modal';
        mapCanvas.dataset.mapJson = '/assets/maps/'+entityData.map_filename;
        mapCanvas.dataset.imageKey = '/assets/maps/'+entityData.scene_images.split(',')[0];
        return mapCanvas;
    }

    addRawJsonButton(fieldValue, jsonHref)
    {
        if(!jsonHref){
            return;
        }
        let editorButton = fieldValue.querySelector('.edit-map-elements-entity-btn');
        let rawButton = document.createElement('button');
        rawButton.type = 'button';
        rawButton.className = 'button button-secondary show-raw-json-btn';
        rawButton.textContent = 'Show raw JSON';
        rawButton.addEventListener('click', () => {
            window.open(jsonHref, '_blank');
        });
        if(editorButton){
            editorButton.before(rawButton);
            return;
        }
        fieldValue.appendChild(rawButton);
    }
}
window.AdminMapPreviewModal = AdminMapPreviewModal;
