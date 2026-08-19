class AdminObjectTilePicker
{
    bind(entityData)
    {
        let mapContainer = document.querySelector('.object-tile-selector-container');
        if(!mapContainer){
            return false;
        }
        let roomsList = entityData?.extraData?.roomsList;
        if(!roomsList){
            return false;
        }
        let roomSelector = document.querySelector('[name="room_id"]');
        let tileIndexInput = document.querySelector('[name="tile_index"]');
        let pickerButton = document.querySelector('.object-tile-picker-button');
        if(!roomSelector || !tileIndexInput || !pickerButton){
            return false;
        }
        let tileIndexField = tileIndexInput.closest('.edit-field');
        if(!tileIndexField){
            return false;
        }
        adminMapRenderer.attachInlinePickerButton(pickerButton, tileIndexInput);
        pickerButton.addEventListener('click', () => {
            this.togglePicker(mapContainer, tileIndexField, roomsList, roomSelector, tileIndexInput);
        });
        roomSelector.addEventListener('change', () => {
            this.reloadSelectedRoomMap(mapContainer, roomsList, roomSelector, tileIndexInput);
        });
        return true;
    }

    togglePicker(mapContainer, tileIndexField, roomsList, roomSelector, tileIndexInput)
    {
        let selectedRoom = adminMapRenderer.findRoomById(roomsList, roomSelector.value);
        if(!selectedRoom){
            roomSelector.classList.add('room-selector-required');
            return false;
        }
        roomSelector.classList.remove('room-selector-required');
        return adminMapRenderer.toggleMapPicker(
            mapContainer,
            tileIndexField,
            selectedRoom,
            (event, data) => {
                tileIndexInput.value = adminMapRenderer.calculateTileData(event, data).tileIndex;
            },
            tileIndexInput.value
        );
    }

    reloadSelectedRoomMap(mapContainer, roomsList, roomSelector, tileIndexInput)
    {
        roomSelector.classList.remove('room-selector-required');
        if(mapContainer.classList.contains('hidden')){
            return false;
        }
        let selectedRoom = adminMapRenderer.findRoomById(roomsList, roomSelector.value);
        if(!selectedRoom){
            return false;
        }
        adminMapRenderer.loadMapPickerContent(
            mapContainer,
            selectedRoom,
            (event, data) => {
                tileIndexInput.value = adminMapRenderer.calculateTileData(event, data).tileIndex;
            },
            tileIndexInput.value
        );
        return true;
    }
}
window.AdminObjectTilePicker = AdminObjectTilePicker;
