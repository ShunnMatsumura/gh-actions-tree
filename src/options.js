const tokenInput = document.getElementById('token');
const saveButton = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.local.get({ token: '' }, ({ token }) => {
  tokenInput.value = token;
});

saveButton.addEventListener('click', () => {
  chrome.storage.local.set({ token: tokenInput.value.trim() }, () => {
    status.textContent = 'Saved';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
});
