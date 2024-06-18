async function FillGoogleForms() {
  console.log("Filling Google Forms...");
  let formData = await new Promise((resolve, reject) => {
    chrome.storage.sync.get("formData", (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.formData || {});
      }
    });
  });

  const formElement = document.getElementsByTagName("form")[0];
  if (!formElement) {
    console.error("No form found on the page.");
    return;
  }
  // Fill multiple choice questions
  const multipleChoiceQuestions = formElement.querySelectorAll("div[role='radiogroup']");
  for (const question of multipleChoiceQuestions) {
    const formTitleElement = question.closest("div[role='listitem']")?.querySelector("div[role='heading'] span");
    if (!formTitleElement) {
      console.error("Form title element not found for multiple choice question.");
      continue;
    }

    const options = question.querySelectorAll("div[role='radio']");
    let availableAnswers = [];
    for (const option of options) {
      const label = option.getAttribute("data-value").trim();
      availableAnswers.push(label);
    }

    if (availableAnswers.length > 0) {
      try {
        const prompt =
          `What is the answer to this question, respond with only number of the option, without the actual answer text:\n${formTitleElement.textContent.trim()}\n` +
          availableAnswers.map((answer, index) => `${index + 1}. ${answer}`).join("\n");
        answer = await fetchChatGPTAnswer(prompt);
        chrome.storage.sync.set({ formData });
      } catch (error) {
        console.error("Error fetching answer from ChatGPT:", error);
        continue;
      }

      if (answer) {
        const options = question.querySelectorAll("div[role='radio']");
        let selected = false;
        for (let i = 0; i < availableAnswers.length; i++) {
          const label = options[i].getAttribute("data-value").trim();
          if (i + 1 === parseInt(answer) || label.toLowerCase().includes(answer.toLowerCase())) {
            options[i].click();
            selected = true;
            break;
          }
        }
        if (!selected) {
          console.warn(`No matching option found for: ${answer}`);
        }
      }
    }
  }

  // Fill text fields
  const selectorStr = "input[type='text'], input[type='url']";
  const fields = formElement.querySelectorAll(selectorStr);

  for (const item of fields) {
    const formTitleElement = item.closest("div[role='listitem']").querySelector("div[role='heading']").firstChild;
    if (!formTitleElement) {
      console.error("Form title element not found.");
      continue;
    }
    const formTitle = formTitleElement.textContent.trim();
    let answer = formData[formTitle];

    if (!answer) {
      try {
        answer = await fetchChatGPTAnswer(`Answer this question in a concise matter: ${formTitle}`);
        formData[formTitle] = answer;
        chrome.storage.sync.set({ formData });
      } catch (error) {
        console.error("Error fetching answer from ChatGPT:", error);
        continue;
      }
    }

    if (answer) {
      item.value = answer;
      item.setAttribute("data-initial-value", answer);
      item.setAttribute("badinput", "false");
      if (item.nextElementSibling) {
        item.nextElementSibling.style.display = "none";
      }
    }
  }

  // Fill textareas
  const textareas = formElement.querySelectorAll("textarea");
  for (const item of textareas) {
    const formTitleElement = item.closest("div[role='listitem']").querySelector("div[role='heading']").firstChild;
    if (!formTitleElement) {
      console.error("Form title element not found.");
      continue;
    }
    const formTitle = formTitleElement.textContent.trim();
    let answer = formData[formTitle];

    if (!answer) {
      try {
        answer = await fetchChatGPTAnswer(formTitle);
        formData[formTitle] = answer;
        chrome.storage.sync.set({ formData });
      } catch (error) {
        console.error("Error fetching answer from ChatGPT:", error);
        continue;
      }
    }

    if (answer) {
      item.value = answer;
      item.setAttribute("data-initial-value", answer);
      item.setAttribute("badinput", "false");
      if (item.parentElement.previousElementSibling) {
        item.parentElement.previousElementSibling.style.display = "none";
      }
      item.style.height = "auto";
      item.style.height = item.scrollHeight + "px";
    }
  }
  console.log("Google Forms filled successfully.");
}

async function fetchChatGPTAnswer(question) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetchAnswer", question: question }, (response) => {
      if (response && response.answer) {
        resolve(response.answer);
      } else {
        reject(`No answer from ChatGPT, ${response.error}`);
      }
    });
  });
}

window.onload = FillGoogleForms;
