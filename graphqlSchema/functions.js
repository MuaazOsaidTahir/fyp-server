const hasha = require('hasha');

const getHash = (url) => {
    const hash = hasha(url);

    return hash
}

module.exports = { getHash }