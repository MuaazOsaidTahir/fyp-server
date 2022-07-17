const hasha = require('hasha');
const axios = require('axios');

const getHash = (url) => {
    const hash = hasha(url);

    return hash
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const uploadToInsta = async (id, image, caption, accessToken) => {
    const response = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v13.0/${id}/media?image_url=${encodeURIComponent(image)}&caption=${caption}&access_token=${accessToken}`
    })

    let mediaObjectStatusCode = "IN_PROGRESS";

    while (mediaObjectStatusCode !== 'FINISHED') {
        const statusResponse = await axios({
            method: 'GET',
            url: `https://graph.facebook.com/v13.0/${response.data.id}?fields=status_code&access_token=${accessToken}`
        })

        mediaObjectStatusCode = statusResponse.data.status_code

        await sleep(1000)
    }

    const publishResponse = await axios({
        method: "POST",
        url: `https://graph.facebook.com/v13.0/${id}/media_publish?creation_id=${response.data.id}&access_token=${accessToken}`
    })

    return publishResponse
}

module.exports = { getHash, uploadToInsta }