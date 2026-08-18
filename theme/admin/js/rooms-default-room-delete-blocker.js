/**
 *
 * Reldens - Rooms Default Room Delete Blocker
 *
 */

class RoomsDefaultRoomDeleteBlocker
{
    constructor()
    {
        this.blockedTitle = 'This room is the default room and can not be deleted.';
        window.addEventListener('DOMContentLoaded', () => this.bind());
        if('loading' !== document.readyState){
            this.bind();
        }
    }

    bind()
    {
        let banner = document.querySelector('.room-active-players-banner');
        if(!banner || '1' !== banner.dataset.defaultRoom){
            return;
        }
        for(let deleteButton of document.querySelectorAll('.rooms-view .form-delete button')){
            deleteButton.disabled = true;
            deleteButton.title = this.blockedTitle;
        }
    }
}

new RoomsDefaultRoomDeleteBlocker();
