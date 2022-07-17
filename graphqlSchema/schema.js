const graphql = require('graphql');
const { userModel } = require('../db/dbSchema');
const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLSchema } = graphql;
const jwt = require("jsonwebtoken");
const { postModel, campaignModel } = require('../db/postUrlSchema');
const { getHash, uploadToInsta } = require('./functions');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const { automationModel } = require('../db/automateSchema');

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
        facebookPostId: { type: GraphQLString },
        twitterPostId: { type: GraphQLString },
        userId: { type: GraphQLString },
        campaignName: { type: GraphQLString },
        date: { type: GraphQLString },
        campaignId: { type: GraphQLString },
    })
})

const InstaautomateSchema = new GraphQLObjectType({
    name: 'AutomateSchema',
    fields: () => ({
        id: { type: GraphQLString },
        time: { type: GraphQLString },
        InstagramToken: { type: GraphQLString },
        instagramId: { type: GraphQLString },
        instagramCaption: { type: GraphQLString },
        image: { type: GraphQLString },
        campaignId: { type: GraphQLString },
        campaignName: { type: GraphQLString },
        userId: { type: GraphQLString },
    })
})

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
            args: { campaignName: { type: GraphQLString }, userId: { type: GraphQLString }, accessToken: { type: GraphQLString }, id: { type: GraphQLString }, image: { type: GraphQLString }, caption: { type: GraphQLString }, campaignId: { type: GraphQLString } },
            async resolve(parent, values, { redisClient }) {
                console.log("Insta Upload")
                // const values = JSON.parse(args.object);
                try {
                    const publishResponse = await uploadToInsta(values.id, values.image, values.caption, values.accessToken)

                    console.log(publishResponse.data)
                    // console.log(values.campaignId)
                    const alreadyCampaign = await campaignModel.findOne({ campaignId: values.campaignId });
                    console.log(alreadyCampaign)

                    if (!alreadyCampaign) {
                        // console.log('----false----')
                        // console.log(values.campaignId)
                        const campaign = new campaignModel({ campaignId: values.campaignId, campaignName: values.campaignName, userId: values.userId, instagramPostId: publishResponse.data.id })
                        await campaign.save();
                        const response = await campaignModel.find({ userId: values.userId }).sort({ "date": 1 });
                        redisClient.set(`${values.userId}`, JSON.stringify(response))

                        return campaign
                    }
                    else {
                        const updateCampaign = await campaignModel.findOneAndUpdate({ campaignId: values.campaignId }, { $set: { instagramPostId: publishResponse.data.id } }, { new: true })

                        const response = await campaignModel.find({ userId: values.userId }).sort({ "date": 1 });
                        redisClient.set(`${values.userId}`, JSON.stringify(response))
                        return updateCampaign;
                    }
                } catch (error) {
                    console.log(error.message);
                }

                return null
            }
        },
        automateInstagram: {
            type: InstaautomateSchema,
            args: { campaignName: { type: GraphQLString }, userId: { type: GraphQLString }, accessToken: { type: GraphQLString }, profileid: { type: GraphQLString }, image: { type: GraphQLString }, caption: { type: GraphQLString }, campaignId: { type: GraphQLString }, time: { type: GraphQLString } },
            async resolve(parent, para) {
                console.log("Automate Insta")

                try {
                    const model = new automationModel({
                        time: Date.now() + Number(para.time),
                        InstagramToken: para.accessToken,
                        instagramId: para.profileid,
                        instagramCaption: para.caption,
                        image: para.image,
                        campaignId: para.campaignId,
                        campaignName: para.campaignName,
                        userId: para.userId,
                    })

                    await model.save()

                    return model;
                } catch (error) {
                    console.log(error.message);
                }
                return null
            }
        },
        uploadFacebook: {
            type: campaignSchema,
            args: { campaignName: { type: GraphQLString }, pageId: { type: GraphQLString }, accessToken: { type: GraphQLString }, image: { type: GraphQLString }, campaignId: { type: GraphQLString }, caption: { type: GraphQLString }, userId: { type: GraphQLString } },
            async resolve(parent, values, { redisClient }) {
                try {
                    // console.log(values)
                    const alreadyCampaign = await campaignModel.findOne({ campaignId: values.campaignId });
                    // console.log(alreadyCampaign)
                    const res = await axios.post(`https://graph.facebook.com/${values.pageId}/photos?`, {
                        url: values.image,
                        access_token: values.accessToken,
                        message: values.caption
                    })
                    if (alreadyCampaign) {
                        const updateCampaign = await campaignModel.findOneAndUpdate({ campaignId: values.campaignId }, { $set: { facebookPostId: res.data.id } }, { new: true })
                        console.log(updateCampaign)
                        return updateCampaign
                    }
                    else {
                        const campaign = new campaignModel({ campaignId: values.campaignId, campaignName: values.campaignName, userId: values.userId, facebookPostId: res.data.id })
                        await campaign.save();
                        const response = await campaignModel.find({ userId: values.userId }).sort({ "date": 1 });
                        redisClient.set(`${values.userId}`, JSON.stringify(response))

                        return campaign
                    }
                } catch (error) {
                    console.log(error.message)
                    return null
                }
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