/**
 * -= NOTES =-
 * Video limits
 * The Predict API has limits to the length and size it can support. A video, uploaded through URL, can be anywhere up to 80MB in size or 10mins in length. When a video is sent through by bytes, the Predict API can support 10MB in size.
 * If your video exceeds the limits, please follow our tutorial on how to break up a large video into smaller components, and send those into the Video API. Otherwise, the processing will time out and you will receive an error response.
 */

/*
// Insert here the initialization code as outlined on this page:
// https://docs.clarifai.com/api-guide/api-overview/api-clients#client-installation-instructions

stub.PostModelOutputs(
    {
        model_id: "{THE_MODEL_ID}",
        version_id: "{THE_MODEL_VERSION_ID}",  // This is optional. Defaults to the latest model version.
        inputs: [
            {data: {video: {url: "https://samples.clarifai.com/beer.mp4"}}}
        ]
    },
    metadata,
    (err, response) => {
        if (err) {
            throw new Error(err);
        }

        if (response.status.code !== 10000) {
            throw new Error("Post model outputs failed, status: " + response.status.description);
        }

        // Since we have one input, one output will exist here.
        const output = response.outputs[0]

        // A separate prediction is available for each "frame".
        for (const frame of output.data.frames) {
            console.log("Predicted concepts on frame " + frame.frame_info.time + ":");
            for (const concept of frame.data.concepts) {
                console.log("\t" + concept.name + " " + concept.value);
            }
        }
    }
);

RESPONSE:

{
  "status": {
    "code": 10000,
    "description": "Ok"
  },
  "outputs": [
    {
      "id": "d8234da5d1f04ca8a2e13e34d51f9b85",
      "status": {
        "code": 10000,
        "description": "Ok"
      },
      "created_at": "2017-06-28T14:58:41.835370141Z",
      "model": {
        "id": "aaa03c23b3724a16a56b629203edc62c",
        "name": "general-v1.3",
        "created_at": "2016-03-09T17:11:39.608845Z",
        "app_id": "main",
        "output_info": {
          "message": "Show output_info with: GET /models/{model_id}/output_info",
          "type": "concept",
          "type_ext": "concept"
        },
        "model_version": {
          "id": "aa9ca48295b37401f8af92ad1af0d91d",
          "created_at": "2016-07-13T01:19:12.147644Z",
          "status": {
            "code": 21100,
            "description": "Model trained successfully"
          }
        }
      },
      "input": {
        "id": "f0fc1a005f124d389da4d80823a3125b",
        "data": {
          "video": {
            "url": "https://samples.clarifai.com/beer.mp4"
          }
        }
      },
      "data": {
        "frames": [
          {
            "frame_info": {
              "index": 0,
              "time": 0
            },
            "data": {
              "concepts": [
                {
                  "id": "ai_zJx6RbxW",
                  "name": "drink",
                  "value": 0.98658466,
                  "app_id": "main"
                },
								{ ...another concept ..}
							]
						}
					},
					{
            "frame_info": {
              "index": 1,
              "time": 1000 //<= every one second
            },
            "data": {
              "concepts": [
                {
                  "id": "ai_zJx6RbxW",
                  "name": "drink",
                  "value": 0.98658466,
                  "app_id": "main"
                },
						...

*/