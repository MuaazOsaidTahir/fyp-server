const graphql = require('graphql');
const { userModel } = require('../db/dbSchema');
const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLSchema } = graphql;
const jwt = require("jsonwebtoken");
const { postModel, campaignModel } = require('../db/postUrlSchema');
const { getHash } = require('./functions');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

const userSchema = new GraphQLObjectType({
    name: "userSchema",
    fields: () => ({
        id: { type: GraphQLString },
        email: { type: GraphQLString },
        password: { type: GraphQLString },
        stripe_customerId: { type: GraphQLString },
        subscription_status: { type: GraphQLString }
    })
})

const postSchema = new GraphQLObjectType({
    name: "postSchema",
    fields: () => ({
        id: { type: GraphQLString },
        hash: { type: GraphQLString },
        url: { type: GraphQLString },
    })
})

const campaignSchema = new GraphQLObjectType({
    name: "campaignSchema",
    fields: () => ({
        id: { type: GraphQLString },
        instagramPostId: { type: GraphQLString },
        linkedinPostId: { type: GraphQLString },
        twitterPostId: { type: GraphQLString },
        userId: { type: GraphQLString },
        // date: { type: Gra }
    })
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const RootQuery = new GraphQLObjectType({
    name: "RootQuery",
    fields: () => ({
        getsignedInUser: {
            type: userSchema,
            async resolve(_, __, { req }) {
                const token = req.cookies["fyp_auth"];
                if (token) {
                    const userdata = jwt.verify(token, "muaazosaidtahir");
                    const data = await userModel.findOne({ _id: userdata._id, "tokens.token": token });
                    return data;
                }
                return null
            }
        },
    })
})

const MutationQuery = new GraphQLObjectType({
    name: "MutationQuery",
    fields: () => ({
        signupUser: {
            type: userSchema,
            args: { email: { type: GraphQLString }, password: { type: GraphQLString } },
            async resolve(parent, args, { res }) {
                const alreadyUser = await userModel.findOne({ email: args.email });
                if (!alreadyUser) {
                    const user = await new userModel({ email: args.email, password: args.password });
                    const token = await user.generateAuthToken();
                    res.cookie("fyp_auth", token, {
                        httpOnly: true,
                        path: "/",
                        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
                    });
                    return user;
                }
                else {
                    return null
                }
            }
        },
        loginUser: {
            type: userSchema,
            args: { email: { type: GraphQLString }, password: { type: GraphQLString } },
            async resolve(parent, args, { res }) {
                const alreadyUser = await userModel.findOne({ $and: [{ email: args.email }, { password: args.password }] });
                if (alreadyUser) {
                    const token = await alreadyUser.generateAuthToken();
                    res.cookie("fyp_auth", token, {
                        httpOnly: true,
                        path: "/",
                        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
                    });
                    return alreadyUser;
                }
                else {
                    return null
                }
            }
        },
        uploadPictures: {
            type: postSchema,
            args: { pictueURL: { type: GraphQLString } },
            async resolve(parent, args) {
                const hash = getHash(args.pictueURL);
                let alreadyPost = await postModel.findOne({ hash: hash });
                if (alreadyPost) {
                    return alreadyPost;
                }
                else {
                    const res = await cloudinary.uploader.upload(args.pictueURL, {
                        resource_type: 'image'
                    })

                    const post = new postModel({ url: res.secure_url, hash: hash });

                    await post.save();

                    return post
                }
            }
        },
        uploadInstagram: {
            type: campaignSchema,
            args: { userId: { type: GraphQLString }, accessToken: { type: GraphQLString }, id: { type: GraphQLString }, image: { type: GraphQLString }, caption: { type: GraphQLString } },
            async resolve(parent, values, { redisClient }) {
                console.log("Insta Upload")
                // const values = JSON.parse(args.object);
                try {
                    const response = await axios({
                        method: 'POST',
                        url: `https://graph.facebook.com/v13.0/${values.id}/media?image_url=${encodeURIComponent(values.image)}&caption=${values.caption}&access_token=${values.accessToken}`
                    })

                    // console.log(response.data);

                    let mediaObjectStatusCode = "IN_PROGRESS";

                    while (mediaObjectStatusCode !== 'FINISHED') {
                        const statusResponse = await axios({
                            method: 'GET',
                            url: `https://graph.facebook.com/v13.0/${response.data.id}?fields=status_code&access_token=${values.accessToken}`
                        })

                        // console.log(statusResponse.data.status_code);

                        mediaObjectStatusCode = statusResponse.data.status_code

                        await sleep(2000)
                    }

                    const publishResponse = await axios({
                        method: "POST",
                        url: `https://graph.facebook.com/v13.0/${values.id}/media_publish?creation_id=${response.data.id}&access_token=${values.accessToken}`
                    })

                    console.log(publishResponse.data)

                    const campaign = new campaignModel({ userId: values.userId, instagramPostId: publishResponse.data.id })
                    await campaign.save();

                    const data = await redisClient.get(`${args.userId}`);
                    if (data) {
                        const redisData = JSON.parse(data);
                        redisClient.set(`${values.userId}`, JSON.stringify([...redisData, campaign]))
                    }

                    return campaign
                } catch (error) {
                    console.log(error.message);
                }

                return null
            }
        },
        getUserCampaigns: {
            type: GraphQLList(campaignSchema),
            args: { userId: { type: GraphQLString } },
            async resolve(_, args, { redisClient }) {
                try {
                    const data = await redisClient.get(`${args.userId}`);
                    // console.log(data);
                    if (data) {
                        return JSON.parse(data)
                    }
                    else {
                        const response = await campaignModel.find({ userId: args.userId }).sort({ "date": 1 });
                        redisClient.set(`${args.userId}`, JSON.stringify(response))
                        return response
                    }
                } catch (error) {
                    console.log(error.message)
                }
            }
        }
    })
})

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: MutationQuery
})