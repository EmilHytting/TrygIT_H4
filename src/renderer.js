const skillGrid = document.querySelector('#skillGrid');
const chatHeading = document.querySelector('#chatHeading');
const skillTitle = document.querySelector('#skillTitle');
const startOver = document.querySelector('#startOver');
const modelSelect = document.querySelector('#modelSelect');
const conversationList = document.querySelector('#conversationList');
const newChatButton = document.querySelector('#newChatButton');
const connectionDot = document.querySelector('#connectionDot');
const connectionLabel = document.querySelector('#connectionLabel');
const notice = document.querySelector('#notice');
const chatForm = document.querySelector('#chatForm');
const promptInput = document.querySelector('#promptInput');
const sendButton = document.querySelector('#sendButton');
const welcome = document.querySelector('#welcome');
const messages = document.querySelector('#messages');
const savedChats = document.querySelector('.saved-chats');
const historyStatus = document.querySelector('#historyStatus');
const retryChats = document.querySelector('#retryChats');
const themeToggle = document.querySelector('#themeToggle');
const userDialog = document.querySelector('#userDialog');
const userForm = document.querySelector('#userForm');
const userName = document.querySelector('#userName');
const userError = document.querySelector('#userError');
const saveUserButton = document.querySelector('#saveUserButton');

async function loadUser() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kunne ikke hente dit navn. Prøv at genindlæse siden.');
    if (data.user) return;
  } catch (error) {
    userError.textContent = error.message || 'Kunne ikke hente dit navn. Prøv at genindlæse siden.';
  }
  userDialog.showModal();
}

userDialog.addEventListener('cancel', (event) => event.preventDefault());
userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = userName.value.trim();
  if (!name) {
    userError.textContent = 'Skriv dit navn for at fortsætte.';
    userName.focus();
    return;
  }
  userError.textContent = '';
  saveUserButton.disabled = true;
  userName.disabled = true;
  try {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kunne ikke gemme dit navn. Prøv igen.');
    userDialog.close();
  } catch (error) {
    userError.textContent = error.message || 'Kunne ikke gemme dit navn. Prøv igen.';
  } finally {
    saveUserButton.disabled = false;
    userName.disabled = false;
  }
});

function setTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.querySelector('meta[name="color-scheme"]').content = light ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]').content = light ? '#f7f8fa' : '#1b1d20';
  themeToggle.textContent = light ? 'Mørkt tema' : 'Lyst tema';
  themeToggle.setAttribute('aria-label', light ? 'Skift til mørkt tema' : 'Skift til lyst tema');
}

setTheme('dark');
try {
  setTheme(localStorage.getItem('trygit-theme'));
} catch {}

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try {
    localStorage.setItem('trygit-theme', theme);
  } catch {}
});

const skillIcons = {
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  printer: '<path d="M7 8V3h10v5M7 17H4V8h16v9h-3"/><path d="M7 14h10v7H7zM17 11h.01"/>',
  drivers: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  programs: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 8h18M8 8v13M6 5.5h.01M9 5.5h.01"/>',
  general: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
};
const skillQuestions = {
  email: 'Hvilket problem oplever du med din e-mail?',
  printer: 'Hvad sker der, når du forsøger at udskrive?',
  drivers: 'Hvad vil du gerne opdatere, og er der noget på computeren, der ikke virker?',
  programs: 'Hvilket program har du brug for hjælp til?',
  general: 'Hvad har du brug for hjælp til på computeren?',
};

let history = []; // Systemprompten tilføjes af backend'en (backend/system_prompt.md)
let activeChatId = null;
let activeController = null;
let assistantMessage;
let selectedSkill;
let ready = false;
let skills = [];
let busy = false;
let installedModels = new Set();
let loadingChats = false;
let loadingModels = false;

savedChats.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    savedChats.open = false;
    savedChats.querySelector('summary').focus();
  }
});

document.addEventListener('click', (event) => {
  if (!savedChats.contains(event.target)) savedChats.open = false;
});

function setStatus(state, detail = '') {
  notice.className = `notice ${state}`;
  notice.setAttribute('role', state === 'error' ? 'alert' : 'status');
  connectionDot.className = 'connection-dot';
  connectionDot.classList.toggle('is-online', state === 'ready');
  connectionDot.classList.toggle('is-offline', state === 'error');
  connectionLabel.textContent = state === 'ready' ? 'Klar til at hjælpe'
    : state === 'error' ? 'Ikke tilgængelig' : 'Gør klar til at hjælpe';
  notice.title = detail;
}

function createSkillCard(skill) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'skill-card';

  const icon = document.createElement('span');
  icon.className = 'skill-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = `<svg viewBox="0 0 24 24">${skillIcons[skill.id] || skillIcons.general}</svg>`;

  const title = document.createElement('strong');
  title.textContent = skill.label;

  button.append(icon, title);
  button.addEventListener('click', () => beginConversation(skill));
  return button;
}

// Beder serveren indlæse den valgte model i Ollama, så første svar ikke venter på indlæsning.
let warmedModel = '';
function warmUpSelectedModel() {
  const model = modelSelect.value;
  if (!model || model === warmedModel || !installedModels.has(model)) return;
  warmedModel = model;
  fetch('/api/warmup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  }).catch(() => { warmedModel = ''; });
}

async function loadModels() {
  if (loadingModels || busy || activeController) return;
  loadingModels = true;
  const previousModel = modelSelect.value;
  ready = false;
  modelSelect.replaceChildren(new Option('Henter modeller…', ''));
  skillGrid.replaceChildren();
  skillGrid.setAttribute('aria-busy', 'true');
  promptInput.disabled = true;
  setStatus('loading');
  updateControls();
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    if (!response.ok) throw new Error('Simon kan ikke få forbindelse. Start Ollama, og prøv igen.');
    installedModels = new Set((data.models || []).map((model) => model.name));
    modelSelect.replaceChildren();
    for (const model of installedModels) {
      modelSelect.add(new Option(model, model));
    }
    if (installedModels.has(previousModel)) {
      modelSelect.value = previousModel;
    } else if (installedModels.has(data.default_model)) {
      modelSelect.value = data.default_model;
    } else {
      modelSelect.value = [...installedModels][0] || '';
    }
    skills = data.skills;
    skillGrid.replaceChildren(...skills.map(createSkillCard));
    ready = installedModels.size > 0;
    if (ready) {
      setStatus('ready');
      warmUpSelectedModel();
    } else {
      modelSelect.replaceChildren(new Option('Ingen modeller installeret', ''));
      setStatus('error', 'Der mangler en model til hjælpen. Bed den, der har sat Simon op, om at installere den i Ollama.');
    }
  } catch (error) {
    modelSelect.replaceChildren(new Option('Modeller ikke tilgængelige', ''));
    setStatus('error', error.message || 'Forbindelsen blev afbrudt. Prøv igen.');
  }
  loadingModels = false;
  skillGrid.setAttribute('aria-busy', 'false');
  updateControls();
}

function beginConversation(skill) {
  if (!ready || busy || activeController || !skill) return false;
  if (!installedModels.has(modelSelect.value)) {
    setStatus('error', 'Vælg en installeret model, før du starter samtalen.');
    return false;
  }
  showConversation(null);
  selectedSkill = skill;
  welcome.hidden = true;
  chatHeading.hidden = false;
  skillTitle.textContent = skill.label;
  const greeting = skillQuestions[skill.id] || skillQuestions.general;
  history.push({ role: 'assistant', content: greeting });
  addMessage('assistant', greeting);
  promptInput.placeholder = 'Skriv dit svar her…';
  promptInput.focus();
  updateControls();
  return true;
}

function renderConversationList(chats) {
  conversationList.replaceChildren();
  for (const chat of chats) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.chatId = chat.id;
    button.textContent = chat.title;
    button.addEventListener('click', () => openConversation(chat.id));
    item.append(button);
    conversationList.append(item);
  }
}

async function refreshChats() {
  loadingChats = true;
  conversationList.setAttribute('aria-busy', 'true');
  retryChats.hidden = true;
  historyStatus.textContent = 'Henter samtaler…';
  updateControls();
  try {
    const response = await fetch('/api/chats');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kunne ikke hente samtaler.');
    renderConversationList(data.chats);
    historyStatus.textContent = data.chats.length ? '' : 'Dine samtaler vises her, når du har startet en samtale.';
  } catch (error) {
    historyStatus.textContent = error.message || 'Kunne ikke hente samtaler.';
    retryChats.hidden = false;
  } finally {
    loadingChats = false;
    conversationList.setAttribute('aria-busy', 'false');
    updateControls();
  }
}

function showConversation(chat) {
  savedChats.open = false;
  activeChatId = chat?.id || null;
  history = chat?.messages || [];
  messages.replaceChildren();
  for (const message of history) addMessage(message.role, message.content);
  selectedSkill = null;
  if (chat) {
    selectedSkill = skills.find((skill) => skill.id === (chat.skill || 'general'))
      || { id: 'general', label: 'IT-hjælp' };
  }
  welcome.hidden = Boolean(chat);
  chatHeading.hidden = !chat;
  skillTitle.textContent = selectedSkill?.label || '';
  promptInput.value = '';
  promptInput.placeholder = 'Skriv en besked…';
  promptInput.style.height = 'auto';
  updateControls();
  if (chat) {
    promptInput.focus();
    messages.lastElementChild?.scrollIntoView({ block: 'end' });
  } else {
    promptInput.focus();
  }
}

async function openConversation(chatId) {
  if (!chatId || busy || activeController) return;
  busy = true;
  updateControls();
  try {
    const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}`);
    const chat = await response.json();
    if (!response.ok) throw new Error(chat.error || 'Kunne ikke åbne samtalen.');
    showConversation(chat);
  } catch (error) {
    setStatus('error', error.message || 'Kunne ikke åbne samtalen.');
  } finally {
    busy = false;
    updateControls();
  }
}

function startNewConversation() {
  if (activeController || busy) return;
  showConversation(null);
}

function addMessage(role, text = '') {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const content = document.createElement('div');
  content.className = 'message-content';
  const label = document.createElement('p');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'Dig' : 'Simon';
  if (role === 'assistant') {
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = '/assets/Simon.png';
    avatar.alt = '';
    label.prepend(avatar);
  }
  const body = document.createElement('p');
  body.className = 'message-text';
  body.textContent = text;
  content.append(label, body);
  article.append(content);
  messages.append(article);
  return { article, body };
}

function updateControls() {
  const streaming = Boolean(activeController);
  const navigationDisabled = busy || streaming;
  const sendLabel = streaming ? 'Stop svar' : 'Send besked';

  sendButton.disabled = busy || (!activeController && (!promptInput.value.trim() || !ready));
  sendButton.textContent = sendLabel;
  sendButton.setAttribute('aria-label', sendLabel);
  startOver.disabled = navigationDisabled;
  for (const button of conversationList.querySelectorAll('button')) {
    button.disabled = navigationDisabled || loadingChats;
    if (button.dataset.chatId === activeChatId) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  retryChats.disabled = loadingChats;
  newChatButton.disabled = navigationDisabled;
  modelSelect.disabled = !ready || navigationDisabled;
  promptInput.disabled = !ready || busy;
  chatForm.setAttribute('aria-busy', String(navigationDisabled));
  messages.setAttribute('aria-busy', String(streaming));
}

function appendStreamLine(line) {
  if (!line.trim()) return;
  const chunk = JSON.parse(line);
  if (chunk.error) throw new Error(chunk.error);
  const content = chunk.message?.content || '';
  if (!content || !assistantMessage) return;
  if (assistantMessage.pending) {
    assistantMessage.body.textContent = '';
    assistantMessage.pending = false;
  }
  assistantMessage.body.textContent += content;
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240) {
    assistantMessage.article.scrollIntoView({ block: 'end' });
  }
}

async function readAssistantStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(appendStreamLine);
    if (done) break;
  }
  if (buffer.trim()) appendStreamLine(buffer);
}

function rememberAssistantMessage() {
  if (assistantMessage?.body.textContent && !assistantMessage.pending) {
    history.push({ role: 'assistant', content: assistantMessage.body.textContent });
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (activeController) {
    activeController.abort();
    return;
  }

  const text = promptInput.value.trim();
  const model = modelSelect.value;
  if (!text || !ready || busy || !installedModels.has(model)) return;
  if (!selectedSkill) selectedSkill = skills.find((skill) => skill.id === 'general');
  if (!selectedSkill) return;

  if (!activeChatId) {
    busy = true;
    updateControls();
    try {
      const createResponse = await fetch('/api/chats', { method: 'POST' });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error || 'Kunne ikke oprette samtalen.');
      activeChatId = created.id;
      await refreshChats();
    } catch (error) {
      setStatus('error', error.message || 'Kunne ikke oprette samtalen.');
      return;
    } finally {
      busy = false;
      updateControls();
    }
  }

  welcome.hidden = true;
  chatHeading.hidden = false;
  skillTitle.textContent = selectedSkill.label;
  history.push({ role: 'user', content: text });
  addMessage('user', text);
  assistantMessage = addMessage('assistant', 'Simon skriver…');
  assistantMessage.pending = true;
  assistantMessage.article.scrollIntoView({ block: 'end' });
  const controller = new AbortController();
  activeController = controller;
  promptInput.value = '';
  promptInput.style.height = 'auto';
  updateControls();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChatId, model, skill: selectedSkill.id, messages: history }),
      signal: controller.signal
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Serveren svarede med status ${response.status}.`);
    }

    await readAssistantStream(response);
    if (assistantMessage.pending) throw new Error('Simon svarede ikke. Prøv igen.');
    rememberAssistantMessage();
    await refreshChats();
    setStatus('ready');
  } catch (error) {
    if (error.name === 'AbortError') {
      rememberAssistantMessage();
    } else {
      setStatus('error', error.message || 'Der opstod en fejl under chatten.');
      assistantMessage?.article.classList.add('error');
      if (assistantMessage?.pending) {
        assistantMessage.body.textContent = 'Beskeden kunne ikke besvares. Prøv igen.';
        if (!promptInput.value) promptInput.value = text;
      }
    }
  } finally {
    if (assistantMessage?.pending && controller.signal.aborted) assistantMessage.body.textContent = 'Svaret blev stoppet.';
    activeController = null;
    assistantMessage = null;
    promptInput.focus();
    updateControls();
  }
});

promptInput.addEventListener('input', () => {
  promptInput.style.height = 'auto';
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 140)}px`;
  updateControls();
});

promptInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!sendButton.disabled) chatForm.requestSubmit();
  }
});

window.addEventListener('focus', loadModels);
modelSelect.addEventListener('change', () => {
  updateControls();
  warmUpSelectedModel();
});
startOver.addEventListener('click', startNewConversation);
newChatButton.addEventListener('click', startNewConversation);
retryChats.addEventListener('click', refreshChats);
loadUser();
refreshChats();
loadModels();
