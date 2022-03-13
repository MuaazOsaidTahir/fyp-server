// app.post("/uploadPost", async (req, res) => {
//     try {
//         const { session_id, access_token } = req.headers;
//         const { fileUrl, fileType } = req.body;
//         fs.writeFileSync(`uploads/out.${fileType.split("/").pop()}`, fileUrl.split('data:image/png;base64,').pop(), 'base64', (err) => {
//             if (err) {
//                 console.log(err.message);
//             }
//         })

//         console.log(`${session_id},${access_token}`);

//         data.append('data-binary', fs.createReadStream('D:/web development/finalProject/server/uploads/out.png'));

//         var config = {
//             method: 'post',
//             url: `https://graph.facebook.com/v12.0/${session_id}`,
//             headers: {
//                 'Authorization': `OAuth ${access_token}`,
//                 'file_offset': '0',
//                 'Content-Type': 'multipart/form-data',
//                 'Host': 'graph.facebook.com',
//                 'Connection': 'close',
//                 ...data.getHeaders()
//             },
//             data: data
//         };

//         try {
//             const response = await axios(config);
//             console.log(response)
//         } catch (error) {
//             console.log(error.message)
//         }
//     } catch (error) {
//         console.log(`Upload Post: ${error.message}`)
//     }

// })