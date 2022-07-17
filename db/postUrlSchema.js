const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    hash: String,
    url: String,
})

const campaignsCreated = new mongoose.Schema({
    userId: String,
    campaignName: String,
    instagramPostId: String,
    facebookPostId: String,
    twitterPostId: String,
    date: {
        type: Date,
        default: Date.now
    },
    // created_at: {
    //     type: String,
    //     default: Date.now()
    // },
    campaignId: String
})

const postModel = new mongoose.model('post', postSchema);
const campaignModel = new mongoose.model('campaign', campaignsCreated);

module.exports = { postModel, campaignModel };