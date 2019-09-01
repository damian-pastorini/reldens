/**
 *
 * Reldens - FeaturesManager
 *
 * This class will load the features, parse their configuration files and assign them as required.
 *
 */

class FeaturesManager
{

    constructor()
    {
        this.featuresList = [];
    }

    async loadAndInitFeatures()
    {
        // load features from the database.
        await this.loadFeaturesFromDb();
    }

    async loadFeaturesFromDb()
    {

    }

}

module.exports = FeaturesManager;