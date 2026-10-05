/**
 *
 * Reldens - Rooms Active Players Refresher
 *
 */

class RoomsActivePlayersRefresher
{
    constructor()
    {
        this.banner = null;
        this.countElement = null;
        this.warningElement = null;
        this.roomId = '';
        this.refreshTimer = null;
        this.defaultRefreshMs = 5000;
        this.activePlayersPath = '/rooms/active-players';
        window.addEventListener('DOMContentLoaded', () => this.bind());
        if('loading' !== document.readyState){
            this.bind();
        }
    }

    bind()
    {
        if(this.banner){
            return;
        }
        this.banner = document.querySelector('.room-active-players-banner');
        if(!this.banner){
            return;
        }
        this.countElement = this.banner.querySelector('.count-value');
        this.warningElement = this.banner.querySelector('.room-active-players-warning');
        this.roomId = this.banner.dataset.roomId;
        if(!this.roomId){
            return;
        }
        this.refreshTimer = setInterval(() => this.fetchCount(), this.refreshMs());
    }

    refreshMs()
    {
        let configuredRefresh = Number(this.banner.dataset.refreshMs);
        if(!configuredRefresh){
            return this.defaultRefreshMs;
        }
        return configuredRefresh;
    }

    fetchCount()
    {
        let basePath = window.location.pathname.replace(/\/rooms\/view.*$/, '');
        fetch(basePath+this.activePlayersPath+'?id='+encodeURIComponent(this.roomId))
            .then((response) => response.json())
            .then((data) => this.applyCount(data))
            .catch(() => clearInterval(this.refreshTimer));
    }

    applyCount(data)
    {
        if(!this.countElement){
            return;
        }
        let count = Number(data.count);
        this.countElement.textContent = String(count);
        if(!this.warningElement){
            return;
        }
        this.warningElement.classList.toggle('hidden', 0 === count);
    }
}

new RoomsActivePlayersRefresher();
