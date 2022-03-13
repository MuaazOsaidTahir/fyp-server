const mongoose = require('mongoose');

let encode = encodeURIComponent('e5@CVRyz3JFAyRi');

mongoose.connect(`mongodb+srv://Muaaz:${encode}@cluster0.jybv3.mongodb.net/FYP?retryWrites=true&w=majority`, (e) => {
    console.log("DB Connected");
})