chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ formData: {} });
  console.log("Extension installed and formData initialized.");
});

async function fetchChatGPTAnswer(question) {
  console.log("Sending question to ChatGPT:", question);

  // SET YOUR OPENAI API KEY HERE
  const apiKey = "";
  try {
    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-instruct",
        prompt: question,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, ${data}`);
    }

    if (data.choices && data.choices.length > 0) {
      console.log("Received response from ChatGPT:", data.choices[0].text.trim());
      return data.choices[0].text.trim();
    } else {
      throw new Error("No valid response from ChatGPT");
    }
  } catch (error) {
    console.error("Error fetching answer from ChatGPT:", error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetchAnswer") {
    fetchChatGPTAnswer(message.question)
      .then((answer) => {
        sendResponse({ answer: answer });
      })
      .catch((error) => {
        sendResponse({ answer: null, error: error.message });
      });
    return true;
  }
});
