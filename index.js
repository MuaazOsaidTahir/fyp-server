require('dotenv').config();
const express = require('express');
const app = express();
const { graphqlHTTP } = require("express-graphql");
const cors = require('cors');
const schema = require('./graphqlSchema/schema');
const CookieParser = require("cookie-parser");
const stripe = require('stripe')(process.env.STRIPE_KEY)
const bodyParser = require('body-parser');
const { userModel } = require('./db/dbSchema');
const axios = require('axios');
const Redis = require('ioredis');
const redisClient = new Redis();

require("./db/db")

app.use(CookieParser());

// app.use('/webhook', (req, res, next) => {
//     next();
// });
app.use('/webhook', express.raw({ type: "*/*" }));
app.use(bodyParser.json());
app.use(express.urlencoded({ limit: "50mb" }))

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

app.post("/fb-long-lived", async (req, res) => {
    const { token } = req.body;
    console.log(token)

    try {
        const longlivedAccessToken = await axios(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=b86b0353aa0dec1ba78d8e23b43cc236&access_token=${token}`);
        console.log(longlivedAccessToken.data);
    } catch (error) {
        console.log(error.message)
    }
})

//Stripe End Point
app.post("/create-checkout", async (req, res) => {
    const { email, amount, productId } = req.body

    const customer = await stripe.customers.create({
        email: email,
    });

    console.log(customer.id);

    await userModel.updateOne({ email: email }, { $set: { stripe_customerId: customer.id } })

    const price = await stripe.prices.create({
        product: productId,
        unit_amount: amount * 100,
        currency: 'usd',
        recurring: {
            interval: 'month',
            // trial_period_days: 7,
        },
    });

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{
            price: price.id,
            quantity: 1,
        }],
        customer: customer.id,
        billing_address_collection: 'required',
        success_url: 'http://localhost:3000?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/',
    });
    return res.json({ url: session.url })
})

//Stripe Webhooks
app.post('/webhook', async (request, response) => {
    // console.log(request.body);

    let event;

    try {
        const sig = request.headers['stripe-signature'];
        // console.log(sig)
        event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_END_POINT_KEY);
    } catch (err) {
        // response.status(400).send(`Webhook Error: ${err.message}`);
        console.log(`WEBHOOK---${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'customer.subscription.created':
            // console.log(event.data.object);
            await userModel.updateOne({ stripe_customerId: event.data.object.customer }, { $set: { subscription_status: 'activated' } })
            break;
        case 'customer.subscription.deleted':
            await userModel.updateOne({ stripe_customerId: event.data.object.customer }, { $set: { subscription_status: 'deleted' } })
            break;
        default:
            // console.log(`Unhandled event type ${event.type}`);
            break
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});

app.use("/graphql", graphqlHTTP((req, res) => ({
    schema: schema,
    graphiql: true,
    context: { req, res, redisClient }
})))

app.listen(8000, () => {
    console.log('Running');
})