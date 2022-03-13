const express = require('express');
const app = express();
const { graphqlHTTP } = require("express-graphql");
const cors = require('cors');
const schema = require('./graphqlSchema/schema');
const CookieParser = require("cookie-parser");
const axios = require('axios');
const stripe = require('stripe')('sk_test_51KAjFaKduQGSo5NCsMnZ66emLkEP66DluNyhdpkNlv5L4uspo1CQR6x0zSGUTRVrdriqu8t5BtG0SLvJlaSexKQg00EFIKL4Fo')
let endpointSecret = 'whsec_084f6e6d3bcbb6d139b054edbcc423256c977c9dbae56b5dc2e825e9c1e6b900'
const bodyParser = require('body-parser');
const { userModel } = require('./db/dbSchema');
const { isRequiredArgument } = require('graphql');

require("./db/db")

app.use(CookieParser());

// app.use('/webhook', (req, res, next) => {
//     next();
// });
app.use('/webhook', express.raw({ type: "*/*" }));
app.use(bodyParser.json());

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

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
        success_url: 'http://localhost:3000/dashboard?session_id={CHECKOUT_SESSION_ID}',
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
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
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


let clientId = '7786u3tstimzmb';
let clientSecret = 'AW4iBJz4mjXmyGtp';
let redirectURL = 'http://localhost:3000/dashboard/LinkedIn'

app.post("/linkedInToken", async (req, res) => {
    const { accessCode } = req.body;
    const response = await axios.post(`https://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&code=${accessCode}&redirect_uri=${redirectURL}&client_id=${clientId}&client_secret=${clientSecret}`, {
        headers: {
            'Content-Type': "x-www-form-urlencoded",
        }
    })

    try {
        const companies = await axios({
            method: "GET",
            url: "https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee",
            headers: {
                'Authorization': `Bearer ${response.data.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        })

        console.log(companies);
    } catch (error) {
        console.log(error.message)
    }

    // res.json((response.data));
})

app.post("/linkedInProfile", async (req, res) => {
    const { token } = req.body;
    // console.log(token)
    let response;
    try {
        response = await axios({
            method: 'GET',
            url: "https://api.linkedin.com/v2/me",
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
    } catch (error) {
        console.log("Token: " + error.message)
        return
    }

    let profilePicture;
    try {
        profilePicture = await axios({
            method: 'GET',
            url: `https://api.linkedin.com/v2/me?projection=(${response.data.id},profilePicture(displayImage~digitalmediaAsset:playableStreams))`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
    } catch (error) {
        console.log("Profile: " + error.message)
        return
    }

    // try {
    //     const posts = await axios({
    //         method: "GET",
    //         url: `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:${response.data.id}`,
    //         headers: {
    //             'Authorization': `Bearer ${token}`
    //         }
    //     })

    //     console.log(posts);
    // } catch (error) {
    //     console.log("Posts: " + error.message)
    // }

    res.json({ name: `${response.data.localizedFirstName}${response.data.localizedLastName}`, profilePicture: profilePicture.data.profilePicture["displayImage~"].elements[0].identifiers[0].identifier, userId: response.data.id })

})

app.post('/sharingPostLinkedIn', async (req, res) => {
    const { accessToken, userId, description } = req.body;

    let response;
    try {
        response = await axios({
            method: "POST",
            url: 'https://api.linkedin.com/v2/ugcPosts',
            headers: {
                'X-Restli-Protocol-Version': '2.0.0',
                'x-li-format': 'json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            data: {
                'author': `urn:li:person:${userId}`,
                'lifecycleState': "PUBLISHED",
                'specificContent': {
                    'com.linkedin.ugc.ShareContent': {
                        'shareCommentary': {
                            "text": `${description}`
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS"
                }
            }
        })
    } catch (error) {
        console.log(`Uploading Error: ${error.message}`)
    }

    // try {
    //     const share = await axios({
    //         method: 'GET',
    //         url: `https://api.linkedin.com/v2/shares/${response.data.id}`,
    //         headers: {
    //             'Authorization': `Bearer ${accessToken}`
    //         }
    //     })

    //     console.log(share.data);
    // } catch (error) {
    //     console.log("Post Retriving ID: " + error.message)
    // }

})

app.use("/graphql", graphqlHTTP((req, res) => ({
    schema: schema,
    graphiql: true,
    context: { req, res }
})))

app.listen(8000, () => {
    console.log('Running');
})