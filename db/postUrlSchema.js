const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    hash: String,
    url: String,
})

const campaignsCreated = new mongoose.Schema({
    userId: String,
    name: String,
    instagramPostId: String,
    linkedinPostId: String,
    twitterPostId: String,
    date: {
        type: Date,
        default: Date.now
    },
    created_at: {
        type: String,
        default: Date.now()
    }
})

const postModel = new mongoose.model('post', postSchema);
const campaignModel = new mongoose.model('campaign', campaignsCreated);

module.exports = { postModel, campaignModel };