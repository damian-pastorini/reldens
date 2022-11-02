const {BasePreloaderUiDriver} = require("../base-preloader-ui-driver");
const {Geom} = require("phaser");

class PhaserPreloaderUiDriver extends BasePreloaderUiDriver
{
    constructor(config)
    {
        super(config);
        this.driverName = 'Phaser Preloader Ui Driver';
        this.sceneDriver = config.sceneDriver;
        this.configManager = config.configManager;

        this.progressBar = null;
        this.progressCompleteRect = null;
        this.progressRect = null;
        this.loadingText;
        this.assetText;
        this.percentText;
    }

    createUi()
    {
        this.setupProgressBar();

        let width = this.sceneDriver.getMainCameraWidth();
        let height = this.sceneDriver.getMainCameraHeight();
        let loadingFont = this.configManager.get('client/ui/loading/font');
        let loadingFontSize = this.configManager.get('client/ui/loading/fontSize');
        let loadingAssetsSize = this.configManager.get('client/ui/loading/assetsSize');

        this.setupLoadingText(width, height, loadingFont, loadingFontSize);
        this.setupPercentText(width, height, loadingFont, loadingAssetsSize);
        this.setupAssetText(width, height, loadingFont, loadingAssetsSize);
    }

    setupProgressBar()
    {
        let Rectangle = Geom.Rectangle;
        let main = Rectangle.Clone(this.sceneDriver.getMainCamera());
        this.progressRect = new Rectangle(0, 0, main.width / 2, 50);
        Rectangle.CenterOn(this.progressRect, main.centerX, main.centerY);
        this.progressCompleteRect = Geom.Rectangle.Clone(this.progressRect);
        this.progressBar = this.sceneDriver.addGraphics();
    }

    setupAssetText(width, height, loadingFont, loadingAssetsSize)
    {
        this.assetText = this.sceneDriver.addText(width / 2, height / 2 + 50, '', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.assetText.setFill(this.configManager.get('client/ui/loading/assetsColor'));
        this.assetText.setOrigin(0.5, 0.5);
    }

    setupPercentText(width, height, loadingFont, loadingAssetsSize)
    {
        this.percentText = this.sceneDriver.addText(width / 2, height / 2 - 5, '0%', {
            fontFamily: loadingFont,
            fontSize: loadingAssetsSize
        });
        this.percentText.setOrigin(0.5, 0.5);
        this.percentText.setFill(this.configManager.get('client/ui/loading/percentColor'));
    }

    setupLoadingText(width, height, loadingFont, loadingFontSize)
    {
        this.loadingText = this.sceneDriver.addText(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: loadingFont,
            fontSize: loadingFontSize
        });
        this.loadingText.setOrigin(0.5, 0.5);
        this.loadingText.setFill(this.configManager.get('client/ui/loading/loadingColor'));
    }

    onFileProgress(file)
    {
        if (!this.configManager.get('client/ui/loading/showAssets')) {
            return;
        }
        this.assetText.setText('Loading asset: ' + file.key);
    }

    onLoadProgress(progress)
    {
        let progressText = (progress * 100) + '%';
        this.percentText.setText(progressText);
        let color = (0xffffff);
        let fillColor = (0x222222);
        this.progressRect.width = progress * this.progressCompleteRect.width;
        this.progressBar
            .clear()
            .fillStyle(fillColor)
            .fillRectShape(this.progressCompleteRect)
            .fillStyle(color)
            .fillRectShape(this.progressRect);
    }

    onLoadComplete()
    {
        for (let child of this.sceneDriver.getChildren().list) {
            child.destroy();
        }
        this.loadingText.destroy();
        this.assetText.destroy();
        this.percentText.destroy();
        this.sceneDriver.shutdownScene();
    }
}

module.exports.PhaserPreloaderUiDriver = PhaserPreloaderUiDriver;