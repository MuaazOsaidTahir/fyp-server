const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

//Statuses
//free -- green
//trial -- blue
//pro -- red

const userSchema = new mongoose.Schema({
    email: String,
    stripe_customerId: String,
    password: String,
    tokens: [
        {
            token: String,
        }
    ],
    subscription_status: {
        type: String,
        default: 'canceled'
    },
    current_period_end: String,
})

userSchema.methods.generateAuthToken = async function () {
    var token = jwt.sign({ _id: this._id }, process.env.JWTTOKEN);
    this.tokens = this.tokens.concat({ token });

    await this.save();
    return token;
}

const userModel = new mongoose.model("user", userSchema);

module.exports = { userModel };