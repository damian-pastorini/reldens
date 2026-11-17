/**
 *
 * Reldens - Admin Server Usage Renderer
 *
 */

class AdminServerUsageRenderer
{
    constructor()
    {
        this.container = null;
        this.serversList = null;
        this.serverItemTemplate = null;
        this.unavailableMessage = null;
        this.defaultRefreshMs = 5000;
        this.adminPagePathPattern = /\/(management)?\/?$/;
        this.refreshTimer = null;
        window.adminFunctions.onDocumentReady(() => this.bind());
    }

    bind()
    {
        this.container = document.querySelector('.server-usage');
        if(!this.container){
            return;
        }
        this.serversList = this.container.querySelector('.servers-list');
        this.serverItemTemplate = this.container.querySelector('.server-item-template');
        this.unavailableMessage = this.container.querySelector('.server-usage-unavailable');
        this.fetchUsage();
        this.refreshTimer = setInterval(
            () => this.fetchUsage(),
            Number(this.container.dataset.refreshMs) || this.defaultRefreshMs
        );
    }

    fetchUsage()
    {
        fetch(window.location.pathname.replace(this.adminPagePathPattern, '')+this.container.dataset.usagePath)
            .then((response) => response.json())
            .then((serversUsage) => this.renderServers(serversUsage))
            .catch(() => this.unavailableMessage.classList.remove('hidden'));
    }

    renderServers(serversUsage)
    {
        if(!serversUsage || serversUsage.error || !Array.isArray(serversUsage.servers)){
            this.unavailableMessage.classList.remove('hidden');
            return;
        }
        this.unavailableMessage.classList.add('hidden');
        let serverItems = [];
        for(let serverStatus of serversUsage.servers){
            serverItems.push(this.createServerItem(serverStatus));
        }
        this.serversList.replaceChildren(...serverItems);
    }

    createServerItem(serverStatus)
    {
        let serverItem = this.serverItemTemplate.content.firstElementChild.cloneNode(true);
        serverItem.querySelector('.server-url').textContent = (serverStatus.serverUrl || '-')
            +(serverStatus.isSelf ? ' (this server)' : '');
        if(!serverStatus.isSelf){
            serverItem.querySelector('.response-time').textContent = 'Response time: '+serverStatus.latencyMs+' ms';
        }
        let statusElement = serverItem.querySelector('.status-value');
        let usageReport = serverStatus.usageReport;
        if(!serverStatus.isReachable || !usageReport || !usageReport.usage){
            statusElement.textContent = 'Not available'+(serverStatus.error ? ', '+serverStatus.error : '');
            statusElement.classList.add('overloaded');
            serverItem.querySelector('.usage-tiles').classList.add('hidden');
            return serverItem;
        }
        this.renderStatus(statusElement, usageReport);
        for(let tile of serverItem.querySelectorAll('.usage-tile')){
            this.renderTile(tile, usageReport);
        }
        return serverItem;
    }

    renderStatus(statusElement, usageReport)
    {
        if(usageReport.isBlocking){
            statusElement.textContent = 'Overloaded, the new logins, arriving players and new rooms are blocked';
            statusElement.classList.add('overloaded');
            return;
        }
        if(!usageReport.blockingEnabled){
            statusElement.textContent = (usageReport.isOverloaded ? 'Over the limits' : 'OK')
                +', monitor only (blocking disabled)';
            statusElement.classList.add('disabled');
            return;
        }
        statusElement.textContent = 'OK';
    }

    renderTile(tile, usageReport)
    {
        let unit = tile.dataset.unit || '';
        tile.querySelector('.usage-value').textContent = usageReport.usage[tile.dataset.usageKey]+' '+unit;
        let limitKey = tile.dataset.limitKey;
        if(!limitKey){
            return;
        }
        tile.classList.toggle('exceeded', -1 !== usageReport.exceededLimits.indexOf(limitKey));
        let limitValue = Number(usageReport.limits[limitKey]);
        tile.querySelector('.usage-limit').textContent = 0 >= limitValue ? 'No limit' : 'Limit: '+limitValue+' '+unit;
    }
}

new AdminServerUsageRenderer();
