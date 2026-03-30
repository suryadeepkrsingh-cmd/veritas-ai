document.addEventListener('DOMContentLoaded', async () => {
  const claimTextarea = document.getElementById('claim');
  const verifyButton = document.getElementById('verify');
  const resultDiv = document.getElementById('result');

  // Get selected text from active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.getSelection().toString()
  }, (results) => {
    if (results && results[0] && results[0].result) {
      claimTextarea.value = results[0].result;
    }
  });

  // Handle verify button click
  verifyButton.addEventListener('click', async () => {
    const claim = claimTextarea.value.trim();
    if (!claim) {
      resultDiv.innerHTML = 'Please enter a claim or select text.';
      return;
    }
    resultDiv.innerHTML = 'Verifying...';
    try {
      const response = await fetch('http://localhost:3001/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim })
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      resultDiv.innerHTML = `
        <p><strong>Verdict:</strong> ${data.verdict}</p>
        <p><strong>Confidence:</strong> ${Math.round(data.confidence * 100)}%</p>
        <p><strong>Explanation:</strong> ${data.explanation}</p>
        ${data.sources ? `<p><strong>Sources:</strong> ${data.sources.map(s => s.name).join(', ')}</p>` : ''}
      `;
    } catch (error) {
      resultDiv.innerHTML = 'Error: Unable to verify. Ensure backend is running at localhost:3001.';
    }
  });
});