const mongoose = require("mongoose");

const automateSchema = new mongoose.Schema({
    time: {
        type: Date,
    },
    InstagramToken: String,
    instagramId: String,
    instagramCaption: String,
    image: String,
    campaignId: String,
    campaignName: String,
    userId: String,
})

const automationModel = new mongoose.model('automate', automateSchema);

module.exports = { automationModel }