/**
 *
 * Reldens - Admin Dashboard Stats Renderer
 *
 */

class AdminDashboardStatsRenderer
{
    constructor()
    {
        this.container = null;
        this.canvas = null;
        this.tooltip = null;
        this.fromDate = '';
        this.daysRange = 0;
        this.countsBySlot = {};
        this.dayMilliseconds = 86400000;
        this.chartLayout = {paddingLeft: 42, paddingRight: 12, paddingTop: 16, paddingBottom: 34, barGap: 2};
        this.xLabelsStep = 5;
        this.yTicksCount = 4;
        this.defaultRefreshMs = 15000;
        this.refreshTimer = null;
        this.hoverBound = false;
        window.addEventListener('DOMContentLoaded', () => this.bind());
        if('loading' !== document.readyState){
            this.bind();
        }
    }

    bind()
    {
        if(this.container){
            return;
        }
        this.container = document.querySelector('.admin-dashboard');
        if(!this.container){
            return;
        }
        this.canvas = this.container.querySelector('.daily-logins-chart');
        this.tooltip = this.container.querySelector('.chart-tooltip');
        this.fetchStats();
        this.refreshTimer = setInterval(() => this.fetchStats(), this.refreshMs());
    }

    refreshMs()
    {
        let configuredRefresh = Number(this.container.dataset.refreshMs);
        if(!configuredRefresh){
            return this.defaultRefreshMs;
        }
        return configuredRefresh;
    }

    fetchStats()
    {
        fetch(window.location.pathname.replace(/\/$/, '')+'/'+this.container.dataset.statsPath)
            .then((response) => response.json())
            .then((stats) => this.renderStats(stats))
            .catch(() => this.showFetchError());
    }

    showFetchError()
    {
        let activeUsersElement = this.container.querySelector('.active-users-count');
        if(activeUsersElement){
            activeUsersElement.textContent = 'N/A';
        }
    }

    renderStats(stats)
    {
        if(!stats || stats.error || !stats.fromDate){
            this.showFetchError();
            return;
        }
        let activeUsersElement = this.container.querySelector('.active-users-count');
        if(activeUsersElement){
            activeUsersElement.textContent = String(Number(stats.activeUsersCount || 0));
        }
        this.fromDate = String(stats.fromDate || '');
        this.daysRange = Number(stats.daysRange || 0);
        this.mapCountsBySlot(Array.isArray(stats.dailyLoggedUsers) ? stats.dailyLoggedUsers : []);
        this.renderChart();
        this.bindChartHover();
    }

    mapCountsBySlot(dailyLoggedUsers)
    {
        this.countsBySlot = {};
        let rangeStartTime = Date.parse(this.fromDate);
        for(let dayData of dailyLoggedUsers){
            let slotIndex = Math.round((Date.parse(dayData.date) - rangeStartTime) / this.dayMilliseconds);
            this.countsBySlot[slotIndex] = Number(dayData.count);
        }
    }

    slotDate(slotIndex)
    {
        let slotDate = new Date(Date.parse(this.fromDate));
        slotDate.setUTCDate(slotDate.getUTCDate() + slotIndex);
        return slotDate.toISOString().slice(0, 10);
    }

    slotCount(slotIndex)
    {
        let slotCount = this.countsBySlot[slotIndex];
        if(!slotCount){
            return 0;
        }
        return Number(slotCount);
    }

    fetchThemeColor(variableName, fallbackColor)
    {
        let variableValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        if('' === variableValue){
            return fallbackColor;
        }
        return variableValue;
    }

    chartArea()
    {
        return {
            x: this.chartLayout.paddingLeft,
            y: this.chartLayout.paddingTop,
            width: this.canvas.width - this.chartLayout.paddingLeft - this.chartLayout.paddingRight,
            height: this.canvas.height - this.chartLayout.paddingTop - this.chartLayout.paddingBottom
        };
    }

    maxCount()
    {
        let maxCount = 0;
        for(let i = 0; i < this.daysRange; i++){
            if(maxCount < this.slotCount(i)){
                maxCount = this.slotCount(i);
            }
        }
        if(0 === maxCount){
            return 1;
        }
        return maxCount;
    }

    renderChart()
    {
        if(!this.canvas || 0 === this.daysRange){
            return;
        }
        let context = this.canvas.getContext('2d');
        let area = this.chartArea();
        let maxCount = this.maxCount();
        let mutedInkColor = this.fetchThemeColor('--color-grey-20', '#909090');
        let gridColor = this.fetchThemeColor('--color-grey-40', '#484848');
        let barColor = this.fetchThemeColor('--color-blue', '#2f7dde');
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.font = '11px sans-serif';
        this.drawYAxis(context, area, maxCount, mutedInkColor, gridColor);
        this.drawBars(context, area, maxCount, barColor);
        this.drawXLabels(context, area, mutedInkColor);
    }

    drawYAxis(context, area, maxCount, mutedInkColor, gridColor)
    {
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        for(let i = 0; i <= this.yTicksCount; i++){
            let tickValue = Math.round(maxCount * i / this.yTicksCount);
            let tickY = area.y + area.height - (area.height * i / this.yTicksCount);
            context.strokeStyle = gridColor;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(area.x, tickY);
            context.lineTo(area.x + area.width, tickY);
            context.stroke();
            context.fillStyle = mutedInkColor;
            context.fillText(String(tickValue), area.x - 6, tickY);
        }
    }

    drawBars(context, area, maxCount, barColor)
    {
        let barSlot = area.width / this.daysRange;
        let barWidth = Math.max(1, barSlot - this.chartLayout.barGap);
        context.fillStyle = barColor;
        for(let i = 0; i < this.daysRange; i++){
            let slotCount = this.slotCount(i);
            if(0 === slotCount){
                continue;
            }
            let barHeight = area.height * slotCount / maxCount;
            context.fillRect(
                area.x + (i * barSlot) + (this.chartLayout.barGap / 2),
                area.y + area.height - barHeight,
                barWidth,
                barHeight
            );
        }
    }

    drawXLabels(context, area, mutedInkColor)
    {
        let barSlot = area.width / this.daysRange;
        context.fillStyle = mutedInkColor;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        for(let i = 0; i < this.daysRange; i++){
            if(0 !== i % this.xLabelsStep && i !== this.daysRange - 1){
                continue;
            }
            context.fillText(
                this.slotDate(i).slice(5),
                area.x + (i * barSlot) + (barSlot / 2),
                area.y + area.height + 8
            );
        }
    }

    bindChartHover()
    {
        if(!this.canvas || !this.tooltip || this.hoverBound){
            return;
        }
        this.hoverBound = true;
        this.canvas.addEventListener('mousemove', (event) => this.showTooltipForEvent(event));
        this.canvas.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));
    }

    showTooltipForEvent(event)
    {
        let canvasBounds = this.canvas.getBoundingClientRect();
        let area = this.chartArea();
        let pointerX = (event.clientX - canvasBounds.left) * (this.canvas.width / canvasBounds.width);
        let slotIndex = Math.floor((pointerX - area.x) / (area.width / this.daysRange));
        if(0 > slotIndex || slotIndex >= this.daysRange){
            this.tooltip.classList.add('hidden');
            return;
        }
        let slotCount = this.slotCount(slotIndex);
        this.tooltip.textContent = this.slotDate(slotIndex)
            +': '+slotCount+' logged user'+(1 === slotCount ? '' : 's');
        this.tooltip.classList.remove('hidden');
        let wrapperBounds = this.tooltip.parentNode.getBoundingClientRect();
        this.tooltip.style.setProperty('--tooltip-x', String(Math.round(event.clientX - wrapperBounds.left))+'px');
        this.tooltip.style.setProperty(
            '--tooltip-y',
            String(Math.max(0, Math.round(event.clientY - wrapperBounds.top - 28)))+'px'
        );
    }
}

new AdminDashboardStatsRenderer();
