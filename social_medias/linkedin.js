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