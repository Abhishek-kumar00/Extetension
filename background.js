let problems = [];
let index = 0;
let questionSolved = false; 


chrome.runtime.onInstalled.addListener(() => {
  fetch(chrome.runtime.getURL('allproblems.json'))
    .then((response) => response.json())
    .then(data => {
      problems = data;
      chrome.storage.local.set({ problems: data, currentIndex: 0 });
    })
    .catch(err => console.error("Error in fetching the JSON file: ", err));
});


function getNextProblem() {
  const problem = problems[index];
  index = (index + 1) % problems.length;
  return problem;
}


function setNextProblem() {
  const now = new Date();
  const nextProb = getNextProblem();
  chrome.storage.local.set({
    todaysProb: nextProb,
    lastUpdate: now.toISOString(),
    currentIndex: index
  });
}

// Redirect Google searches to the problem
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!questionSolved) {  // Only redirect if the question isn't solved yet
      const url = new URL(details.url);
      if (url.hostname.includes('google.com') && url.pathname.includes('/search')) {
        return { redirectUrl: problems[index].href };
      }
    }
  },
  { urls: ["*://www.google.com/search?*"] },
  ["blocking"]
);


function isSubmissionSuccessURL(url) {
  return url.includes('/submissions/detail/') && url.includes('/check/');
}


chrome.webRequest.onCompleted.addListener(async (details) => {
  if (isSubmissionSuccessURL(details.url)) {
    try {
      const response = await fetch(details.url);
      const text = await response.text();

      
      if (text.includes('ACCEPTED')) {  
        questionSolved = true;  
        setNextProblem();  

       
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Problem Solved',
          message: 'Congratulations! You have solved the problem.'
        });

        
        chrome.webRequest.onBeforeRequest.removeListener();
      }
    } catch (e) {
      console.error(e);
    }
  }
},
{ urls: ["*://leetcode.com/problems/*"] });  
