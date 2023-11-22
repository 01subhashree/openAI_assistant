const PORT = 8000;
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
const { OPENAI_API_KEY, OPENAI_ASS_ID } = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

app.use(express.json());
app.use(cors());

app.post("/create", async (req, res) => {
  const response = await openai.beta.assistants.retrieve(OPENAI_ASS_ID);

  const thread = await openai.beta.threads.create();

  const response_threads = await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: req.body.prompt,
      //   content: "Let's go to india",
    }
  );

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: response.id,
  });

  const result = await waitForRunCompletion(run.id, thread.id, response.id);
  //   console.log(result);s
  res.send(result);
});

const waitForRunCompletion = async (runId, threadId, responseId) => {
  let timeElapsed = 0;
  const timeout = 120000;
  const interval = 1000;

  while (timeElapsed < timeout) {
    try {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);

      console.log(run.status);
      if (run.status === "requires_action") {
        const toolCall =
          run.required_action?.submit_tool_outputs?.tool_calls[0];
        const args = JSON.parse(toolCall?.function?.arguments || "{}");

        console.log("arguments", toolCall?.function?.arguments);
        await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: [
            {
              tool_call_id: toolCall?.id,
              output: JSON.stringify(args),
            },
          ],
        });
      }
      if (run.status === "completed") {
        const messagesFromThread = await openai.beta.threads.messages.list(
          threadId
        );
        // console.log("messagesFromThread :  ---", messagesFromThread);
        const data = messagesFromThread?.data;
        const resultData = data.filter((e) => e.assistant_id === responseId);
        const resultArray = resultData[0]?.content;

        // console.log("messagesFromThread :  ---", resultData);

        return resultArray;
      } else if (["failed", "cancelled", "expired"].includes(run.status)) {
        console.log(`Run ended with status: ${run.status}`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
      timeElapsed += interval;
    } catch (error) {
      console.log(`Error occurred: ${error.message}`);
    }
  }

  console.log("Timeout reached while waiting for run completion");
};

app.listen(PORT, () => console.log("Your server is running on PORT " + PORT));
