const intervalRateMs = 1000;
const maxCountdownStartTimeMs = 36 * 1000;
const minCountdownStartTimeMs = 3 * 1000;

const cssClassName_Wrapper = `page-auto-closer-for-chrome-wrapper`;
const cssClassName_MainPopOver = `page-auto-closer-for-chrome-main-pop-over`;
const cssClassName_CountdownText = `page-auto-closer-for-chrome-countdown-text`;
const cssClassName_CloseNowBtn = `page-auto-closer-for-chrome-close-now-btn`;
const cssClassName_StopLink = `page-auto-closer-for-chrome-stop-link`;

const cssClassName_SettingsMenu = `page-auto-closer-for-chrome-settings-menu`;
const cssClassName_SettingsOption = `page-auto-closer-for-chrome-settings-option`;

const localStorageKey_CountdownStartTimeMs = `a65d38be-3ae4-47e5-8bfd-482ab89dd120`;

const autoClosePageTextIncludes = [
  // AWS VPN Client with Okta auth
  'you may close this window at any time.',
  'you have been logged out due to inactivity. refresh or return to the sign in screen.',
  // HashiCorp Vault with Okta auth
  'you can now close this window and start using vault.',
  // Zoom
  'click open zoom.',
  'click launch meeting below',
  'having issues with zoom',
  'meeting has been launched',
];

const autoCloseUrlIncludes = [
  // Zoom
  'success',
];

const autoCloseUrlStartsWith = [
  // Zoom
  '/wc/leave',
  '/postattendee',
];

function log(text) {
  console.log(`PACFC: ${text}`);
}

log('loaded...');

let timeTillCloseMs = getCountdownStartTimeMs();

function getCountdownStartTimeMs() {
  const defaultStartTimeMs = 21 * 1000;
  let startTimeMs = defaultStartTimeMs;
  try {
    startTimeMs = Number(localStorage.getItem(localStorageKey_CountdownStartTimeMs));
  } catch (e) {
    console.error(e);
  }
  if (!startTimeMs || startTimeMs <= minCountdownStartTimeMs || startTimeMs > maxCountdownStartTimeMs) {
    setCountdownStartTimeMs(defaultStartTimeMs); // Overwrite to self-correct
    startTimeMs = defaultStartTimeMs;
  }
  return startTimeMs;
}

function setCountdownStartTimeMs(startTimeMs) {
  localStorage.setItem(localStorageKey_CountdownStartTimeMs, startTimeMs);
}

function getWrapperEl() {
  return document.documentElement.querySelector(`.${cssClassName_Wrapper}`);
}

function countdownWithText(countdownTimeMs) {
  if (false) {//Used for freezing the countdown to debugging styling
    countdownTimeMs = getCountdownStartTimeMs();
    clearInterval(intervalId);
  }

  let wrapperEl = getWrapperEl();

  if (!wrapperEl) { // Lazy init the element
    wrapperEl = document.createElement('div');
    wrapperEl.classList.add(cssClassName_Wrapper);
    wrapperEl.innerHTML = `
    <div class='${cssClassName_MainPopOver}'>
      <div class='${cssClassName_CountdownText}'></div>
      <a class='${cssClassName_StopLink}'>cancel</a>
      <a class='${cssClassName_CloseNowBtn}'>close now</a>
    </div>
    `;
    document.body.appendChild(wrapperEl);

    wrapperEl.querySelector(`.${cssClassName_CloseNowBtn}`).onclick = () => {
      log('Closing tab now');
      closeThisTabNow();
    };

    wrapperEl.querySelector(`.${cssClassName_StopLink}`).onclick = () => {
      log('Canceled the countdown');
      clearInterval(intervalId);
      wrapperEl.remove();
    };

    injectAndUpdateSettingsMenu();
  }

  const countdownEl = wrapperEl.querySelector(`.${cssClassName_CountdownText}`);
  countdownEl.innerText = `Closing page in ${Math.round(countdownTimeMs / 1000)} seconds`;
}

function injectAndUpdateSettingsMenu() {
  const incrementalSec = 3.0;
  const trueCountdownStartTimeSec = Math.round(getCountdownStartTimeMs() / incrementalSec / 1000.0) * incrementalSec;

  const optionsList = [];
  const decrementValSec = trueCountdownStartTimeSec - incrementalSec;
  const incrementValSec = trueCountdownStartTimeSec + incrementalSec;
  if (decrementValSec * 1000 >= minCountdownStartTimeMs) {
    optionsList.push(decrementValSec);
  }
  if (incrementValSec * 1000 < maxCountdownStartTimeMs) {
    optionsList.push(incrementValSec);
  }
  if (!optionsList) {
    log('no options');
    return;
  }
  const wrapperEl = getWrapperEl();
  wrapperEl.querySelector(`.${cssClassName_SettingsMenu}`)?.remove();

  const settingsEl = document.createElement('div');
  settingsEl.classList.add(cssClassName_SettingsMenu);
  settingsEl.innerHTML = `
  ${trueCountdownStartTimeSec} seconds not your speed?  Try 
  <a class='${cssClassName_SettingsOption}'>${optionsList[0]}s</a>
  `;
  if (optionsList.length > 1) {
    settingsEl.innerHTML += `
    or
    <a class='${cssClassName_SettingsOption}'>${optionsList[1]}s</a>
    `;
  }
  const optionsElList = settingsEl.querySelectorAll(`.${cssClassName_SettingsOption}`);
  for (let i = 0; i < optionsElList.length; i++) {
    const optionEl = optionsElList[i];
    const op = optionsList[i];
    optionEl.onclick = () => {
      log(`New option selected: ${op}`);
      const ms = (op + 1) * 1000;
      timeTillCloseMs = ms;
      setCountdownStartTimeMs(ms);
      injectAndUpdateSettingsMenu();
    };

  }
  wrapperEl.appendChild(settingsEl);
}

function getUrl() {
  return new URL(window.location.href);
}

function isAutoCloseUrl() {
  const url = getUrl();
  const pathname = url.pathname.toLowerCase();
  if (!url || !url.pathname) { return false; }
  if (autoCloseUrlIncludes.some((autoCloseUrl) => pathname.includes(autoCloseUrl))) {
    return true;
  }
  if (autoCloseUrlStartsWith.some((autoCloseUrl) => pathname.startsWith(autoCloseUrl))) {
    return true;
  }

  return false;
}

function isAutoClosePageText() {
  const pageText = document?.body?.innerText?.toLowerCase() || '';
  return autoClosePageTextIncludes.some((autoClosePageText) => pageText.includes(autoClosePageText))
}

function countDownToClose() {
  timeTillCloseMs -= intervalRateMs;
  log(`TimeMs left: ${timeTillCloseMs}`);

  if (isAutoClosePageText() || isAutoCloseUrl()) {
    log(`Auto close condition detected isAutoClosePageText=${isAutoClosePageText()} isAutoCloseUrl=${isAutoCloseUrl()}`);
  } else {
    timeTillCloseMs += intervalRateMs; // Put back the time
    return;
  }

  countdownWithText(timeTillCloseMs);

  if (timeTillCloseMs > 0) { return; }

  clearInterval(intervalId);

  closeThisTabNow();
}

function closeThisTabNow() {
  chrome.runtime.sendMessage({ pleaseCloseThisTab: true });
}

let intervalId = setInterval(countDownToClose, intervalRateMs);
