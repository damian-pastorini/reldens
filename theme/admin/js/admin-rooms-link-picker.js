class AdminRoomsLinkPicker
{
    bind(entityData)
    {
        if(!entityData){
            return false;
        }
        this.bindChangePointPicker(entityData);
        this.bindNextRoomPicker(entityData);
        this.bindChangePointsLayerConfirmation(entityData);
        return true;
    }

    bindChangePointsLayerConfirmation(entityData)
    {
        let linkForm = document.querySelector('#createRoomsLink');
        let layerFlagInput = document.querySelector('#createChangePointsLayer');
        if(!linkForm || !layerFlagInput){
            return false;
        }
        document.addEventListener('submit', (event) => {
            this.onLinkFormSubmit(event, linkForm, layerFlagInput, entityData);
        }, true);
        return true;
    }

    onLinkFormSubmit(event, linkForm, layerFlagInput, entityData)
    {
        if(event.target !== linkForm || this.hasChangePointsLayer(entityData)){
            return false;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        adminFunctions.showConfirmDialog((confirmed) => {
            layerFlagInput.value = confirmed ? '1' : '0';
            linkForm.submit();
        }, {
            title: 'Change points layer',
            message: 'This room does not have the required change points layer in the map file, should I create it?',
            messageClass: 'alert',
            confirmText: 'Yes',
            confirmClass: 'button-primary',
            cancelText: 'No',
            cancelClass: 'button-secondary'
        });
        return true;
    }

    hasChangePointsLayer(entityData)
    {
        let currentRoom = adminMapRenderer.findRoomById(entityData?.extraData?.roomsList, entityData?.id);
        let roomLayers = currentRoom ? currentRoom.layers : false;
        if(!roomLayers || 0 === roomLayers.length){
            return true;
        }
        for(let layerName of roomLayers){
            if(-1 !== String(layerName).indexOf('change-points')){
                return true;
            }
        }
        return false;
    }

    bindChangePointPicker(entityData)
    {
        let mapContainer = document.querySelector('.current-room-change-point-container');
        let tileIndexInput = document.querySelector('#currentRoomChangePointTileIndex');
        let pickerButton = document.querySelector('.change-point-tile-picker-button');
        if(!mapContainer || !tileIndexInput || !pickerButton){
            return false;
        }
        let tileIndexField = tileIndexInput.closest('.edit-field');
        if(!tileIndexField){
            return false;
        }
        pickerButton.addEventListener('click', () => {
            adminMapRenderer.toggleMapPicker(
                mapContainer,
                tileIndexField,
                {mapFile: entityData.map_filename, mapImages: entityData.scene_images},
                (event, data) => {
                    tileIndexInput.value = adminMapRenderer.calculateTileData(event, data).tileIndex;
                },
                tileIndexInput.value
            );
        });
        return true;
    }

    bindNextRoomPicker(entityData)
    {
        let roomsSelector = document.querySelector('.nextRoomSelector');
        let mapContainer = document.querySelector('.next-room-return-position-container');
        let tileIndexInput = document.querySelector('#nextRoomPositionTileIndex');
        let pickerButton = document.querySelector('.next-room-position-tile-picker-button');
        let roomsList = entityData?.extraData?.roomsList;
        if(!roomsList || !mapContainer || !tileIndexInput || !pickerButton){
            return false;
        }
        if(!(roomsSelector instanceof HTMLSelectElement)){
            return false;
        }
        let positionInputs = {
            x: document.querySelector('#nextRoomPositionX'),
            y: document.querySelector('#nextRoomPositionY')
        };
        if(!positionInputs.x || !positionInputs.y){
            return false;
        }
        this.appendRoomsOptions(roomsSelector, roomsList);
        roomsSelector.addEventListener('change', () => {
            this.resetSelectedPosition(mapContainer, tileIndexInput, positionInputs, roomsSelector);
        });
        pickerButton.addEventListener('click', () => {
            this.togglePicker(mapContainer, tileIndexInput, positionInputs, roomsList, roomsSelector);
        });
        tileIndexInput.addEventListener('change', () => {
            this.applyTileIndexPosition(tileIndexInput, positionInputs, roomsList, roomsSelector);
        });
        return true;
    }

    appendRoomsOptions(roomsSelector, roomsList)
    {
        for(let roomData of roomsList){
            let option = document.createElement('option');
            option.text = roomData.name;
            option.value = roomData.id;
            roomsSelector.add(option);
        }
    }

    resetSelectedPosition(mapContainer, tileIndexInput, positionInputs, roomsSelector)
    {
        roomsSelector.classList.remove('room-selector-required');
        tileIndexInput.value = '';
        positionInputs.x.value = '';
        positionInputs.y.value = '';
        mapContainer.innerHTML = '';
        mapContainer.classList.add('hidden');
    }

    togglePicker(mapContainer, tileIndexInput, positionInputs, roomsList, roomsSelector)
    {
        let selectedRoom = adminMapRenderer.findRoomById(roomsList, roomsSelector.value);
        if(!selectedRoom){
            roomsSelector.classList.add('room-selector-required');
            return false;
        }
        roomsSelector.classList.remove('room-selector-required');
        return adminMapRenderer.toggleMapPicker(
            mapContainer,
            tileIndexInput.closest('.edit-field'),
            selectedRoom,
            (event, data) => {
                let tileData = adminMapRenderer.calculateTileData(event, data);
                tileIndexInput.value = tileData.tileIndex;
                positionInputs.x.value = tileData.positionTileX;
                positionInputs.y.value = tileData.positionTileY;
            },
            tileIndexInput.value
        );
    }

    applyTileIndexPosition(tileIndexInput, positionInputs, roomsList, roomsSelector)
    {
        let selectedRoom = adminMapRenderer.findRoomById(roomsList, roomsSelector.value);
        if(!selectedRoom || '' === tileIndexInput.value){
            return false;
        }
        adminMapRenderer.fetchMapData(adminMapRenderer.mapsBucket+selectedRoom.mapFile)
            .then((data) => {
                let position = adminMapRenderer.positionFromTileIndex(tileIndexInput.value, data);
                if(null === position.x){
                    return;
                }
                positionInputs.x.value = position.x;
                positionInputs.y.value = position.y;
            })
            .catch((error) => {
                tileIndexInput.dataset.loadError = error.message;
            });
        return true;
    }
}
window.AdminRoomsLinkPicker = AdminRoomsLinkPicker;
