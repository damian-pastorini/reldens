/**
 *
 * Reldens - CrazyGames SDK Mock
 *
 * Browser script the e2e server serves in place of the CrazyGames SDK (E2eAssetsEndpoints): the client ads provider
 * loads it from the provider "sdkUrl" and plays its video ads through it, like with the real SDK. Every requested ad
 * shows an advertisement overlay with a countdown for the provider video minimum duration plus a margin, calling the
 * client "adStarted" callback when it opens and "adFinished" when it closes, or "adError" when the spec set
 * "failNextAd" before the request.
 *
 */

class CrazyGamesSdkMock
{

    constructor()
    {
        this.environment = 'local';
        this.stylesPath = '/api/e2e/assets/e2e-overlays.css';
        this.minimumDurationPath = 'client/ads/general/providers/crazyGames/videoMinimumDuration';
        this.defaultMinimumDuration = 3000;
        this.playMarginMs = 1000;
        this.countdownStepMs = 1000;
        this.failureMessage = 'Mocked ad failure.';
        this.failNextAd = false;
        this.getEnvironment = async () => this.environment;
        this.ad = {
            hasAdblock: async () => false,
            requestAd: async (adType, callbacks) => this.playAd(adType, callbacks)
        };
        this.appendStyles();
    }

    appendStyles()
    {
        let styles = document.createElement('link');
        styles.rel = 'stylesheet';
        styles.href = this.stylesPath;
        document.head.append(styles);
    }

    playDuration()
    {
        return Number(window.reldens.config.getWithoutLogs(
            this.minimumDurationPath,
            this.defaultMinimumDuration
        )) + this.playMarginMs;
    }

    appendElement(parent, className, text)
    {
        let element = document.createElement('div');
        element.classList.add(className);
        element.textContent = text;
        parent.append(element);
        return element;
    }

    createOverlay(adType, seconds)
    {
        let overlay = this.appendElement(document.body, 'crazy-games-sdk-mock-ad', '');
        let box = this.appendElement(overlay, 'mock-ad-box', '');
        this.appendElement(box, 'mock-ad-label', 'Advertisement');
        this.appendElement(box, 'mock-ad-title', 'Mocked '+adType+' video ad');
        this.appendElement(box, 'mock-ad-screen', '');
        return {overlay, countdown: this.appendElement(box, 'mock-ad-countdown', 'The ad ends in '+seconds+'s')};
    }

    playAd(adType, callbacks)
    {
        let duration = this.playDuration();
        let seconds = Math.ceil(duration / this.countdownStepMs);
        let adElements = this.createOverlay(adType, seconds);
        callbacks.adStarted();
        let countdownInterval = setInterval(() => {
            seconds = Math.max(0, seconds - 1);
            adElements.countdown.textContent = 'The ad ends in '+seconds+'s';
        }, this.countdownStepMs);
        setTimeout(async () => {
            clearInterval(countdownInterval);
            adElements.overlay.remove();
            await this.endAd(callbacks);
        }, duration);
        return true;
    }

    async endAd(callbacks)
    {
        if(this.failNextAd){
            this.failNextAd = false;
            return await callbacks.adError(this.failureMessage);
        }
        return await callbacks.adFinished();
    }

}

window.CrazyGames = {SDK: new CrazyGamesSdkMock()};
