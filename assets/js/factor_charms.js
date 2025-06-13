// SETUP //

// Fetches
// Fetch JSON primeData data
function fetchPrimeData() {
    return fetch('assets/data/factor_charms_primeData.json')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            primeData = data;
            return data; // Resolve the promise with the fetched data
        })
        .catch(error => {
            console.error('There has been a problem with the json data fetch operation:', error);
            throw error; // Reject the promise with the error
        });
}

// Fetch JSON levelData data
function fetchLevelData() {
    return fetch('assets/data/factor_charms_levelData.json')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            levelData = data;
            return data; // Resolve the promise with the fetched data
        })
        .catch(error => {
            console.error('There has been a problem with the json data fetch operation:', error);
            throw error; // Reject the promise with the error
        });
}

// Initializations
// Prevent spacebar from triggering default actions
document.getElementById('warm-prime-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (currState === STATES.WARM) {
            submitWarm();
        }
    }
});

// Init
async function init() {
    await fetchPrimeData();
    await fetchLevelData();
    setStateNone();
    document.getElementById('anti-flash-container').remove();
    startSpaceScroller();
    resetAudio();
}

// App settings
const STATES = Object.freeze({ NONE: 0, WARM: 1, GAME: 2 });
const END_CONDITIONS = Object.freeze({ WIN: 0, SCORE: 1, CHAIN: 2 });
const MAX_DEPTH = 100;
const MUSIC_VOLUME = 0.7;
let primeData = {};

// App vars
let continueSpaceScroll = false;
let currState = STATES.NONE;
let is_hardMode = false;

// App logic
async function start() {
    currState = STATES.NONE;
    currWarmChain = [];
    currWarmFactors = [];
    warmCounter = 0;
    score = 100;
    level = 0;
    levelingUp = false;
    currGameChain = [];
    backgroundGameChain = [];
    dropCount = 0;
    charmDropInterval;
    fallingCharms = new Set();

    // start warmup
    hideOverlayByID('menu-overlay');
    await showCountdownNotif(
        [{ 'text': '3', 'time': 1000 },
        { 'text': '2', 'time': 1000 },
        { 'text': '1', 'time': 1000 },
        { 'text': 'Warmup!', 'time': 1500 }
        ]);
    stopSpaceScroller();
    initWarm();
}

function setStateNone() {
    currState = STATES.NONE;
    document.getElementById('title-container').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('warm-container').style.display = 'none';
}

function setStateWarm() {
    currState = STATES.WARM;
    document.getElementById('title-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('warm-container').style.display = 'block';
}

function setStateGame() {
    currState = STATES.GAME;
    document.getElementById('title-container').style.display = 'none';
    document.getElementById('warm-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
}

function startSpaceScroller() {
    console.log('startSpaceScroller')
    continueSpaceScroll = true;

    const canvas = document.getElementById('space-background');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const stars = [];
    const numStars = 300;

    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            speed: Math.random() * 0.5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();

            star.y += star.speed;
            if (star.y > canvas.height) star.y = 0;
        });

        if (continueSpaceScroll === true) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function stopSpaceScroller() {
    continueSpaceScroll = false;
}

// Toggle the SFX
function toggleHardMode(self) {
    console.log('toggleEasy');
    is_hardMode = !is_hardMode;
    if (is_hardMode) {
        self.innerText = 'Disable Hard Mode';
    } else {
        self.innerText = 'Enable Hard Mode';
    }
}

// LOGICAL HELPERS //
function getProduct(list) {
    return list.reduce((product, current) => product * current, 1);
}

function shuffleArray(array) {
    console.log('shuffleArray');
    for (let i = array.length - 1; i > 0; i--) {
        console.log('shuffleArray 1');
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getUniqueList(list) {
    console.log('getUniqueList');
    let uniqueList = [];
    const seen = {};

    list.forEach(item => {
        console.log('getUniqueList 1');
        if (!seen[item]) {
            seen[item] = true;
            uniqueList.push(item);
        }
    });

    return uniqueList;
}

// Get a random element from the list (with or without removal)
function getRandomFromList(list, removal) {
    const randomIndex = Math.floor(Math.random() * list.length);
    item = list[randomIndex];
    if (removal) {
        list.splice(randomIndex, 1);
    }
    return item;
}

function getCount(list, targ) {
    console.log('getCount');
    let count = 0;
    for (let item of list) {
        console.log('getCount 1');
        if (item === targ) {
            count += 1;
        }
    }
    return count;
}

function getPrimeFactorization(num) {
    console.log('getPrimeFactorization');
    let chain = [];
    let divisor = 2;

    while (num > 1 && divisor <= MAX_DEPTH) {
        console.log('getPrimeFactorization 1');
        if (num % divisor === 0) {
            chain.push(divisor);
            num = num / divisor;
        } else {
            divisor++;
        }
    }

    return chain;
}

function pause(ms) {
    console.log('pause');
    return new Promise(resolve => setTimeout(resolve, ms));
}

// VISUAL HELPERS //
// Show and hide overlays
function showOverlayByID(id) {
    const overlay = document.getElementById(id);
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
}
function hideOverlayByID(id) {
    const overlay = document.getElementById(id);
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

// Show an overlay notification
async function showNotif(text, time_ms) {
    document.getElementById('notif-header').textContent = text;
    showOverlayByID('notif-overlay');
    await pause(time_ms);
    hideOverlayByID('notif-overlay');
}

// Show an overlay countdown notification
async function showCountdownNotif(arr) {
    showOverlayByID('notif-overlay');
    for (let i = 0; i < arr.length; i++) {
        if (i + 1 < arr.length) {
            playSFX(COUNTDOWN_AUDIO);
        } else {
            playSFX(START_AUDIO);
        }

        document.getElementById('notif-header').textContent = arr[i]['text'];
        await pause(arr[i]['time']);
    }
    hideOverlayByID('notif-overlay');
    hideOverlayByID('notif-overlay');
}

function flash(color, duration_ms) {
    return new Promise(resolve => {
        const flashers = document.getElementsByClassName('flasher');
        Array.from(flashers).forEach(element => {
            element.style.backgroundColor = color;
            setTimeout(() => {
                element.style.backgroundColor = '';
                resolve();
            }, duration_ms);
        });
    });
}

// Flash all elements with 'flasher' class red
async function flashError() {
    return await flash('#ffcccb', 500);
}

// Flash all elements with 'flasher' class green
async function flashSuccess() {
    return await flash('#ccffd5', 750);
}







// WARMUP //
// Warmup settings
const warmPoolEasy = [2, 2, 3, 3, 5, 5];
const warmPoolMedm = [7, 11, 13, 17];
const warmTotal = 3;

// Warmup vars
let currWarmChain = [];
let currWarmFactors = [];
let warmCounter = 0;

// Warmup init
function initWarm() {
    createWarmCharmButtons();
    setStateWarm();
    startWarmRound();
}

// Warmup primary
// Start a warmup round
async function startWarmRound() {
    if (warmCounter >= warmTotal) {
        await showCountdownNotif(
            [{ 'text': 'Good Job.', 'time': 1000 },
            { 'text': 'Now Get Ready', 'time': 1000 },
            { 'text': 'Get Set', 'time': 1000 },
            { 'text': 'Go!', 'time': 1000 }
            ]);
        initGame();
    }
    updateWarmCounter(0);
    currWarmFactors = [];
    currWarmChain = getWarmChain();
    updateWarmTarget();
    updateWarmDisplay();
}

// Submit an answer for the warmup
async function submitWarm(prime) {
    if (!prime) { // if there's no given prime, get it from the input
        prime = parseInt(document.getElementById('warm-prime-input').value);
    }
    document.getElementById('warm-prime-input').value = '';

    let index = currWarmChain.indexOf(prime);
    if (index === -1) { // if it's not in the chain, flash error and -1 warmup
        updateWarmCounter(-1);
        playSFX(INCORRECT_AUDIO);
        flashError();
        return;
    }
    playSFX(CORRECT_AUDIO);
    currWarmFactors.push(prime);
    currWarmChain.splice(index, 1);  // Remove one instance of the prime

    // Update the UI
    updateWarmDisplay();

    // If the round is over
    if (currWarmChain.length === 0) {
        await flashSuccess();
        updateWarmCounter(1);
        startWarmRound();
    }
}

// Warmup helpers
function createWarmCharmButtons() {
    const buttonContainerElem = document.getElementById('charm-button-contianer');
    buttonContainerElem.innerHTML = '';
    Object.entries(primeData).forEach(([prime, color]) => {
        const button = document.createElement('button');
        button.className = 'factor-charm-button';
        button.textContent = prime;
        button.style.backgroundColor = color;
        button.onclick = () => submitWarm(parseInt(prime));
        buttonContainerElem.appendChild(button);
    });
}

function updateWarmCounter(inc) {
    warmCounter += inc;
    if (warmCounter < 0) {
        warmCounter = 0;
    }
    const warmCounterElem = document.getElementById('warm-counter');
    warmCounterElem.innerText = `${warmCounter} / ${warmTotal}`;
}

function updateWarmTarget() {
    const warmTargetElem = document.getElementById('warm-target');
    warmTargetElem.innerText = `${getProduct(currWarmChain)}`;
}

function updateWarmDisplay() {
    // Update factor display
    const warmFactorsElem = document.getElementById('warm-factors');
    warmFactorsElem.innerHTML = '';
    currWarmFactors.forEach((factor) => {
        const charm = document.createElement('div');
        charm.className = 'factor-charm';
        charm.textContent = factor;
        charm.style.backgroundColor = primeData[factor];
        warmFactorsElem.appendChild(charm);
    });

    // Update remaining display
    const warmRemainingElem = document.getElementById('warm-remaining');
    warmRemainingElem.innerText = getProduct(currWarmChain);
}

// Warmup logical helpers
function getWarmChain() {
    let chain = [];
    let bag = [...warmPoolEasy]; // copy the original array to avoid mutating it

    while (chain.length < 4) { // Get 4 (no replace) from the easy pool
        let randomIndex = Math.floor(Math.random() * bag.length);
        chain.push(bag[randomIndex]);
        bag.splice(randomIndex, 1);
    }

    while (chain.length < 6) { // Get 2 (with replace) from the medm pool
        let randomIndex = Math.floor(Math.random() * warmPoolMedm.length);
        chain.push(warmPoolMedm[randomIndex]);
    }

    return chain;
}










// GAME //
// Game settings
const DROP_TIME = 10000;
const WRONG_PENELTY = 50;
const RIGHT_BONUS = { 'easy': 10, 'medm': 25, 'hard': 50 };
const MAX_LEVEL = 20;
const MAX_CHAIN_LEN = 15;
const NUM_GAME_BUTTONS = 5;
const NUM_FAKE_TRIES = 15;
const NUM_FILL_TRIES = 20;
const MAX_OPTION_VALUE = 150;
const MAX_OPTION_INITIAL_VALUE = 100;
const MAX_OPTION_LENGTH = 3;
const gamePoolEasy = [2, 3, 5];
const gamePoolMedm = [7, 11, 13, 17];
const gamePoolHard = [19, 23, 29, 31, 37, 41, 43, 47];
const DEAFULT_POOL_1 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const DEFAULT_POOL_2 = [17, 19, 23, 29, 31, 37, 41, 43, 47]
let levelData = {};

// Game vars
let score = 100;
let level = 0;
let currGameChain = [];
let backgroundGameChain = [];
let dropCount = 0;
let charmDropInterval;
let fallingCharms = new Set();
let levelingUp = false;

// Game init
function initGame() {
    console.log('initGame');
    setStateGame();
    updateScore();
    updateLevel();
    playMusic();
}

// Game primary
// Submit an answer in the game
async function submitGame(button) {
    console.log('submitGame');
    disableGameButtons();
    const number = parseInt(button.textContent);
    let chain = getPrimeFactorization(number);

    let incorrect = await handleFactoring(chain);

    backgroundGameChain = [...backgroundGameChain, ...incorrect];
    enableGameButtons();
    updateGameState();
}

async function updateLevel() {
    console.log('updateLevel');
    // note that the dropper must be stopped from the calling function

    document.getElementById('level').innerText = level;
    document.getElementById('game-work-display').innerHTML = '';
    document.getElementById('game-chain-display').innerHTML = '';

    if (level >= MAX_LEVEL) {
        endGame(END_CONDITIONS.WIN);
        return;
    }

    backgroundGameChain = getGameChain();

    updateGameState();

    startDropper();
}

// Game logic helpers
function getGameChain() {
    console.log('getGameChain');
    let chain = [];

    const levelIni = levelData[level]['ini'];

    for (let i = 0; i < levelIni['easy']; i++) {
        console.log('getGameChain 1');
        let randomIndex = Math.floor(Math.random() * gamePoolEasy.length);
        chain.push(gamePoolEasy[randomIndex]);
    }

    for (let i = 0; i < levelIni['medm']; i++) {
        console.log('getGameChain 2');
        let randomIndex = Math.floor(Math.random() * gamePoolMedm.length);
        chain.push(gamePoolMedm[randomIndex]);
    }

    for (let i = 0; i < levelIni['hard']; i++) {
        console.log('getGameChain 3');
        let randomIndex = Math.floor(Math.random() * gamePoolHard.length);
        chain.push(gamePoolHard[randomIndex]);
    }

    return chain;
}

// End the game
function endGame(condition) {
    console.log('endGame');
    stopMusic();

    stopDropper();
    setStateNone();
    startSpaceScroller();

    showOverlayByID('menu-overlay');

    let overlayHeader = document.getElementById('menu-header');
    let overlaySubHeader = document.getElementById('menu-subheader');
    let menuScore = document.getElementById('menu-score');
    let startButton = document.getElementById('menuBtn');

    menuScore.textContent = "Your Score: " + score;
    switch (condition) {
        case END_CONDITIONS.WIN:
            overlayHeader.textContent = 'You Win!';
            overlaySubHeader.textContent = '';
            break;
        case END_CONDITIONS.SCORE:
            overlayHeader.textContent = 'Game Over';
            overlaySubHeader.textContent = 'Score Dropped Below 0';
            break;
        case END_CONDITIONS.CHAIN:
            overlayHeader.textContent = 'Game Over';
            overlaySubHeader.textContent = 'Chain Longer Than ' + MAX_CHAIN_LEN;
            break;
    }

    startButton.textContent = 'PLAY AGAIN';

    throw new Error("Gracefully terminating execution");

}

// Game helpers
function updateGameState() {
    console.log('updateGameState');
    if (backgroundGameChain.length === 0) {
        levelUp();
        return;
    }
    currGameChain = [...backgroundGameChain];
    updateGameDisplay();
    setGameButtons();
}

async function levelUp() {
    levelingUp = true;
    console.log('levelUp');
    document.getElementById('game-work-display').innerHTML = '';
    playSFX(RANKUP_AUDIO);
    stopDropper();
    level += 1;
    await showNotif(`Level up!\nlvl: ${level}`, 2500)
    updateLevel();
    levelingUp = false;
}

function getFake() {
    console.log('getFake');
    let maxProduct = getProduct(currGameChain);

    let fakeChain = [];

    selectedPool = getFilteredPoolByChance(maxProduct, MAX_OPTION_INITIAL_VALUE);
    let randomIndex = Math.floor(Math.random() * selectedPool.length);
    let selectedNum = selectedPool[randomIndex];
    for (let i = 0; i < getCount(currGameChain, selectedNum) + 1; i++) {
        console.log('getFake 1');
        fakeChain.push(selectedNum);
    }

    while (true) {
        console.log('getFake 2');
        if (Math.floor(Math.random() * 2) === 0) { // 50% chance of random stop
            break;
        }

        let pool = getFilteredPoolByChance(maxProduct / getProduct(fakeChain), MAX_OPTION_VALUE / getProduct(fakeChain));
        if (pool.length === 0) {
            break;
        }

        let randomIndex = Math.floor(Math.random() * pool.length);
        fakeChain.push(pool[randomIndex]);
    }

    return getProduct(fakeChain);
}

function getReal(max_len) {
    console.log('getReal');
    if (currGameChain.length === 1) {
        return currGameChain[0];
    }

    realChain = [];
    let pool = [...currGameChain];

    while (true) {
        console.log('getReal 1');
        let randomIndex = Math.floor(Math.random() * pool.length);
        realChain.push(pool[randomIndex]);
        pool.splice(randomIndex, 1)

        if (getProduct(realChain) >= MAX_OPTION_VALUE) { // prevent large numbers
            realChain.pop();
            break;
        }

        if (pool.length === 0) { // prevent NAN when pool is empty
            break;
        }

        /* client wanted this removed
        if (pool.length === 1) { // prevent giving answer on 2-chain
            break;
        }
        */

        if (pool.length === 1 && realChain.length >= 2) { // if the pool has one number left and the chain is bigger than 2, break
            break;
        }

        if (realChain.length > max_len) { // prevent long chains
            break;
        }

        if (Math.floor(Math.random() * 4) === 0) { // 25% chance of random stop
            break;
        }
    }

    return getProduct(realChain);
}

function getFilteredPoolByChance(maxProduct, max) {
    console.log('getFilteredPoolByChance');
    const cps = levelData[level]['cps'];

    let filteredEasy = filterLarge([...gamePoolEasy], maxProduct, max);
    let filteredMedm = filterLarge([...gamePoolMedm], maxProduct, max);
    let filteredHard = filterLarge([...gamePoolHard], maxProduct, max);

    let total = 0;
    let cumulativeProbabilities = [];

    // Create an array of non-empty pools with their probabilities
    let pools = [
        { name: 'easy', pool: filteredEasy, probability: cps['easy'] },
        { name: 'medm', pool: filteredMedm, probability: cps['medm'] },
        { name: 'hard', pool: filteredHard, probability: cps['hard'] }
    ].filter(p => p.pool.length !== 0);

    // Calculate cumulative probabilities
    pools.forEach(pool => {
        total += pool.probability;
        cumulativeProbabilities.push(total);
    });

    let randomValue = Math.random() * total;
    let selectedPool = [];

    for (let i = 0; i < cumulativeProbabilities.length; i++) {
        console.log('getFilteredPoolByChance 1');
        if (randomValue <= cumulativeProbabilities[i]) {
            selectedPool = pools[i].pool;
            break;
        }
    }

    return selectedPool;
}

function filterLarge(list, maxProduct, max) {
    console.log('filterLarge');
    let outList = [];
    for (let item of list) {
        console.log('filterLarge 1');
        let count = getCount(currGameChain, item);
        if (count + 1 > MAX_OPTION_LENGTH) {
            continue;
        }
        let weight = Math.pow(item, count + 1);
        if (weight <= Math.min(maxProduct, max)) {
            outList.push(item);
        }
    }

    return outList;
}

async function handleFactoring(chain) {
    console.log('handleFactoring');
    let incorrect = [];
    const gameChainDisplay = document.getElementById('game-chain-display');
    const workDisplayElem = document.getElementById('game-work-display');
    workDisplayElem.innerHTML = '';
    for (let factor of chain) {
        console.log('handleFactoring 1');
        await pause(250);
        const charm = document.createElement('div');
        charm.className = 'factor-charm';
        charm.textContent = factor;
        charm.style.backgroundColor = primeData[factor];
        workDisplayElem.appendChild(charm);

        await pause(150);

        let index = backgroundGameChain.indexOf(factor);
        if (index === -1) { // if it's not in the chain, flash fail
            showFactorFail(charm);
            playSFX(INCORRECT_AUDIO);
            incorrect.push(factor);
            score -= WRONG_PENELTY;
            
            updateScore();

            if (score < 0) {
                endGame(END_CONDITIONS.SCORE);
                return;
            }

            continue;
        }
        showFactorSuccess(charm);
        playSFX(CORRECT_AUDIO);

        if (gamePoolEasy.includes(factor)) {
            score += RIGHT_BONUS['easy'];
        } else if (gamePoolMedm.includes(factor)) {
            score += RIGHT_BONUS['medm'];
        } else {
            score += RIGHT_BONUS['hard'];
        }
        updateScore();

        if (gameChainDisplay.children.length > 0) {
            gameChainDisplay.children[0].remove();
        }
        backgroundGameChain.splice(index, 1);  // Remove one instance of the prime
    }

    await pause(500);

    return incorrect;
}

// Game secondary helpers
function updateScore() {
    console.log('updateScore');
    document.getElementById('score').innerText = score;
}

function updateGameDisplay() {
    console.log('updateGameDisplay');
    enableGameButtons();
    // Update workspace display
    const gameWorkDisplay = document.getElementById('game-work-display');
    gameWorkDisplay.innerHTML = '';

    // Update factor display
    updateFactorDisplay();

    // Update current number display
    const currentNumberElem = document.getElementById('current-number');
    currentNumberElem.innerText = getProduct(currGameChain);

    if (!is_hardMode) {
        let currentChainElem = document.getElementById('current-chain');
        currentChainElem.innerHTML = '';
        currGameChain.sort((a, b) => a - b).forEach((factor) => {
            const charm = document.createElement('div');
            charm.className = 'factor-charm';
            charm.textContent = factor;
            charm.style.backgroundColor = primeData[factor];
            currentChainElem.appendChild(charm);
        });
    }
}

function updateFactorDisplay() {
    console.log('updateFactorDisplay');
    const gameFactorsElem = document.getElementById('game-chain-display');
    gameFactorsElem.innerHTML = '';
    backgroundGameChain.forEach((factor) => {
        const charm = document.createElement('div');
        charm.className = 'factor-charm';
        charm.textContent = '?';
        charm.style.backgroundColor = 'grey';
        gameFactorsElem.appendChild(charm);
    });

    const backgroundNumber = document.getElementById('background-number');
    backgroundNumber.textContent = "value: " + getProduct(backgroundGameChain);

    const backgroundChainCount = document.getElementById('background-chain-count');
    backgroundChainCount.textContent = "length: " + backgroundGameChain.length + "/" + MAX_CHAIN_LEN;
}

function setGameButtons() {
    console.log('setGameButtons');
    let options = [];
    options.push(getReal(2));
    options.push(getReal(MAX_OPTION_LENGTH));
    options = getUniqueList(options);

    for (let i = 0; options.length < NUM_GAME_BUTTONS && i < NUM_FAKE_TRIES; i++) {
        console.log('setGameButtons 1');
        let fake = getFake();
        if (!Number.isNaN(fake)) {
            options.push(fake);
            options = getUniqueList(options);
        }
    }

    for (let i = 0; options.length < NUM_GAME_BUTTONS && i < NUM_FILL_TRIES; i++) {
        console.log('setGameButtons 2');
        let pool = [...DEAFULT_POOL_1];
        let randomIndex = Math.floor(Math.random() * pool.length);
        let selectedNum = pool[randomIndex];
        if (getProduct(currGameChain) % selectedNum === 0) {
            continue;
        }
        options.push(selectedNum);
        options = getUniqueList(options);
    }

    for (let i = 0; options.length < NUM_GAME_BUTTONS && i < DEFAULT_POOL_2.length; i++) {
        console.log('setGameButtons 3');
        let selectedNum = DEFAULT_POOL_2[i];
        if (getProduct(currGameChain) % selectedNum === 0) {
            continue;
        }
        options.push(selectedNum);
        options = getUniqueList(options);
    }

    options = shuffleArray(options);

    const gameButtons = document.getElementsByClassName('gameButton');
    for (let i = 0; i < NUM_GAME_BUTTONS; i++) {
        console.log('setGameButtons 3');
        gameButtons[i].innerText = options[i];
    }

}

function showFactorSuccess(element) {
    console.log('showFactorSuccess');
    element.classList.remove('factor-fail');
    element.classList.add('factor-success');
    // Remove the class after the animation ends
    setTimeout(() => element.classList.remove('factor-success'), 500);
}

function showFactorFail(element) {
    console.log('showFactorFail');
    element.classList.remove('factor-success');
    element.classList.add('factor-fail');
    // Remove the class after the animation ends
    setTimeout(() => element.classList.remove('factor-fail'), 500);
}

function disableGameButtons() {
    console.log('disableGameButtons');
    // Select all buttons you want to disable
    const buttons = document.getElementById('game-buttons').children;

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }
}

function enableGameButtons() {
    console.log('enableGameButtons');
    // Select all buttons you want to disable
    const buttons = document.getElementById('game-buttons').children;

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = false;
    }
}

function createCharm(panel, xPosition, value) {
    console.log('createCharm');
    const charm = document.createElement('div');
    charm.className = 'factor-charm';
    charm.textContent = '?';
    charm.style.cssText = `
        position: absolute;
        background-color: grey;
        left: ${xPosition}%;
        display: none;
        text-align: center;
        line-height: 40px;
        color: white;
        user-select: none;
    `;
    // Set the value as a data attribute
    charm.dataset.value = value;
    panel.appendChild(charm);
    return charm;
}

// Retrieve the value
function getCharmValue(charm) {
    console.log('getCharmValue');
    return parseInt(charm.dataset.value);
}

function flashElement(element, times, interval, onComplete) {
    console.log('flashElement');
    let flashCount = 0;
    const flash = setInterval(() => {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
        flashCount++;
        if (flashCount >= times * 2) {
            clearInterval(flash);
            element.style.display = 'block';
            onComplete();
        }
    }, interval);
}

function rollDrop() {
    console.log('rollDrop');
    if (backgroundGameChain.length > MAX_CHAIN_LEN) {
        endGame(END_CONDITIONS.CHAIN);
        return;
    }

    dropCount += 1;

    const cpsData = levelData[level]['cps'];
    const maxData = levelData[level]['max'];
    if (Math.random() < cpsData['easy']) {
        let randomIndex = Math.floor(Math.random() * gamePoolEasy.length);
        let dropVal = gamePoolEasy[randomIndex];
        dropFactorCharm(dropVal);
    }
    let poolCounts = getPoolCounts();
    if (poolCounts['medm'] + poolCounts['hard'] < maxData['comb']) {
        return;
    }
    if (Math.random() < cpsData['medm'] && poolCounts['medm'] < maxData['medm']) {
        let randomIndex = Math.floor(Math.random() * gamePoolMedm.length);
        let dropVal = gamePoolMedm[randomIndex];
        dropFactorCharm(dropVal);
    }
    if (Math.random() < cpsData['hard'] && poolCounts['hard'] < maxData['hard']) {
        let randomIndex = Math.floor(Math.random() * gamePoolHard.length);
        dropFactorCharm(gamePoolHard[randomIndex]);
        let dropVal = gamePoolHard[randomIndex];
        dropFactorCharm(dropVal);
    }
}

function getPoolCounts() {
    console.log('getPoolCounts');
    let values = [...backgroundGameChain];
    for (let fallingCharm of fallingCharms) {
        console.log('getPoolCounts 1');
        values.push(getCharmValue(fallingCharm));
    }

    let easyCount = 0;
    let medmCount = 0;
    let hardCount = 0;

    for (let value of values) {
        console.log('getPoolCounts 2');
        if (gamePoolEasy.includes(value)) {
            easyCount += 1;
        } else if (gamePoolMedm.includes(value)) {
            medmCount += 1;
        } else {
            hardCount += 1;
        }
    }

    return { 'easy': easyCount, 'medm': medmCount, 'hard': hardCount }

}

async function dropFactorCharm(value) {
    console.log('dropFactorCharm');
    const panelId = Math.random() < 0.5 ? 'left-side-panel' : 'right-side-panel';
    const panel = document.getElementById(panelId);
    panel.style.position = 'relative';

    const xPosition = panelId === 'left-side-panel'
        ? 0 + Math.random() * 50  // 0% to 50%
        : 10 + Math.random() * 70; // 10% to 70%

    const charm = createCharm(panel, xPosition, value);

    function animateFall(element, duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const startY = 0;
            const endY = element.parentElement.clientHeight - element.offsetHeight;

            function fall() {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const currentY = startY + (endY - startY) * progress;

                element.style.top = `${currentY}px`;

                if (progress < 1) {
                    element.fallAnimationId = requestAnimationFrame(fall);
                } else {
                    fallingCharms.delete(element);
                    resolve();
                }
            }

            fallingCharms.add(element);
            element.fallAnimationId = requestAnimationFrame(fall);
        });
    }

    await new Promise(resolve => flashElement(charm, 3, 167, resolve));
    await animateFall(charm, DROP_TIME);
    await new Promise(resolve => flashElement(charm, 3, 167, resolve));
    
    if (!levelingUp) { // don't add to the chain if it's currently leveling up
        backgroundGameChain = [...backgroundGameChain, getCharmValue(charm)];
        updateFactorDisplay();
        panel.removeChild(charm);
    }
    
}

function startDropper() {
    console.log('startDropper');
    dropCount = 0;
    // Clear any existing interval
    if (charmDropInterval) {
        clearInterval(charmDropInterval);
    }

    // Set a new interval to drop a charm every 1 seconds
    charmDropInterval = setInterval(rollDrop, 1000 - dropCount);
}

function stopDropper() {
    console.log('stopDropper');

    if (charmDropInterval) {
        clearInterval(charmDropInterval);
        charmDropInterval = null;
    }

    const panelNames = ['left-side-panel', 'right-side-panel'];

    // Stop the fall of all charms
    fallingCharms.forEach(charm => {
        console.log('stopDropper 1');
        cancelAnimationFrame(charm.fallAnimationId);
    });

    // Get all charms
    const charms = panelNames.flatMap(panelName =>
        Array.from(document.getElementById(panelName).querySelectorAll('.factor-charm'))
    );

    // Flash and remove charms
    let flashedCharms = 0;
    charms.forEach(charm => {
        console.log('stopDropper 2');
        flashElement(charm, 3, 167, () => {
            flashedCharms++;
            if (flashedCharms === charms.length) {
                // All charms have finished flashing, now remove them
                console.log('stopDropper 2-1');
                charms.forEach(c => c.remove());
                fallingCharms.clear();
            }
        });
    });
}


// AUDIO //


// Load audio
const CORRECT_AUDIO = document.getElementById("correctAudio");
const INCORRECT_AUDIO = document.getElementById("incorrectAudio");
const RANKUP_AUDIO = document.getElementById("rankupAudio");
const START_AUDIO = document.getElementById("startAudio");
const COUNTDOWN_AUDIO = document.getElementById("countdownAudio");
const GAMEOVER_AUDIO = document.getElementById("gameOverAudio");
const WIN_AUDIO = document.getElementById("winAudio");

// Audio logic (not reset on global)
let musicElems = [];
let currentAudio = null;
let is_muteSFX = false;
let is_muteMusic = true;

// Play a sound effect
function playSFX(audio) {
    console.log('playSFX');
    if (!is_muteSFX) {
        audio.pause();
        audio.currentTime = 0;
        audio.play();
    }
}


// Play music on random playlist loop
function playMusic() {
    console.log('playMusic');
    if (!is_muteMusic) {
        playRandomAudio(musicElems);
    }
}


// Stop the music
function stopMusic(audio) {
    console.log('stopMusic');
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reset the current audio if playing
    }
}


// Play random audio from a list
function playRandomAudio(audioList) {
    console.log('playRandomAudio');
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = getRandomFromList(audioList, false);
    currentAudio.play().catch(e => console.error('Error playing audio:', e));
}


// Toggle the SFX
function toggleSFX(self) {
    console.log('toggleSFX');
    is_muteSFX = !is_muteSFX;
    if (is_muteSFX) {
        self.innerText = 'Enable Sound FX';
    } else {
        self.innerText = 'Disable Sound FX';
    }
}


// Toggle the Music
function toggleMusic(self) {
    console.log('toggleMusic');
    is_muteMusic = !is_muteMusic;
    if (is_muteMusic) {
        self.innerText = 'Enable Music';
    } else {
        self.innerText = 'Disable Music';
    }
}

function resetAudio() {
    musicElems = document.querySelectorAll('.music-audio');

    musicElems.forEach(audio => {
        // Add event listener to invoke playRandomAudio when the event 'ended' occurs
        audio.addEventListener('ended', () => {
            playRandomAudio(musicElems);
        });
        audio.volume = MUSIC_VOLUME;
        audio.pause();
    });
}














// Call init
document.addEventListener('DOMContentLoaded', init);