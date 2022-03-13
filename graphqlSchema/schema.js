const graphql = require('graphql');
const { userModel } = require('../db/dbSchema');
const { GraphQLObjectType, GraphQLString, GraphQLSchema } = graphql;
const jwt = require("jsonwebtoken")

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
    })
})

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: MutationQuery
})