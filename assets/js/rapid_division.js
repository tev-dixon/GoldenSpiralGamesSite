// SETUP //

// Game settings
const ALOTTED_TIME = 120;
const COUNTDOWN_TIME = 3;
const RANKUP_PAUSE_TIME = 3;
const FACTOR_EXCLUSION_LIST = [0, 1, 2, 10]
const MUSIC_VOLUME = 0.7; // 0.0 - 1.0


// Visuals and Page elements
const RANK_SVG_DEFAULT_COLOR = '#470004';
const RANKS = {
    'lead': {'color': '#5c6274', 'order': 1, 'name': 'Lead'},
    'iron': {'color': '#a19d94', 'order': 2, 'name': 'Iron'},
    'bron': {'color': '#cd7f32', 'order': 3, 'name': 'Bronze'},
    'silv': {'color': '#c0c0c0', 'order': 4, 'name': 'Silver'},
    'gold': {'color': '#ffd700', 'order': 5, 'name': 'Gold'},
    'plat': {'color': '#e5e4e2', 'order': 6, 'name': 'Platinum'},
    'diam': {'color': '#b9f2ff', 'order': 7, 'name': 'Diamond'},
};
const DEFAULT_ANSWER_BUTTON_COLOR = '#444444';
const WRONG_ANSWER_BUTTON_COLOR = '#ff0000';
const ANSWER_BUTTON_IDS = ['answer-btn-0', 'answer-btn-1', 'answer-btn-2', 'answer-btn-3', 'answer-btn-4', 'answer-btn-5'];


// Load audio
const CORRECT_AUDIO = document.getElementById("correctAudio");
const INCORRECT_AUDIO = document.getElementById("incorrectAudio");
const RANKUP_AUDIO = document.getElementById("rankupAudio");
const START_AUDIO = document.getElementById("startAudio");
const COUNTDOWN_AUDIO = document.getElementById("countdownAudio");
const GAMEOVER_AUDIO = document.getElementById("gameOverAudio");
const WIN_AUDIO = document.getElementById("winAudio");


// Visual logic (not reset on global)
let svgSquareElems = null; //not reset on global

// Game logic
let factor_list = null;
let correctButtonID = null;
let timerInterval = null; 
let timeRemaining = null;
let scoreCounter = null;
let prev_rank = null;
let firstAttempt = null;

// Audio logic (not reset on global)
let musicElems = [];
let currentAudio = null;
let is_muteSFX = false;
let is_muteMusic = false;





// ON LOAD //

// Setup SVG rank visuals
document.addEventListener("DOMContentLoaded", () => {
    const rankElems = document.querySelectorAll('.rank-container > svg rect');
    svgSquareElems = Array.from(rankElems).filter(el => /^[a-z]{4}-\d{1}$/.test(el.id));

    svgSquareElems.sort((a, b) => {
        let [rankA, numA] = [getRank(a), getNum(a)];
        let [rankB, numB] = [getRank(b), getNum(b)];

        if (RANKS[rankA]['order'] < RANKS[rankB]['order']) {
            return -1;
        } else if (RANKS[rankA]['order'] > RANKS[rankB]['order']) {
            return 1;
        } else { // ranks are same
            return parseInt(numA, 10) - parseInt(numB, 10);
        }
    });
});


// Setup audio
document.addEventListener('DOMContentLoaded', function () {
    resetAudio();
});


// Setup page elements
document.addEventListener('DOMContentLoaded', function () {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = ALOTTED_TIME;

    // Setup GPU force repaints
    const elements = document.getElementsByClassName('hardware-accelerated');
    for (let element of elements) {
        setForceRepaint(element);
    }
});


// Fetch JSON factor_list data
document.addEventListener('DOMContentLoaded', function () {
    fetch('/assets/data/rapid_division_fakes.json').then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Network response was not ok.');
    }).then(data => {
        factor_list = data;
    }).catch(error => {
    console.error('There has been a problem with the json data fetch operation:', error);
    });
});

// Prevent spacebar from triggering default actions
document.addEventListener('keydown', function(event) {
    if (event.key === ' ') {
        event.preventDefault();
    }
});




// PRIMARY FUNCTIONS //

// Check if an answer is correct and execute logic, record attempt if not
function checkAnswer(button) {
    if (button.id === correctButtonID) {
        nextRound();
        firstAttempt = true;
    } else {
        playSFX(INCORRECT_AUDIO);
        setButtonWrong(button);
        firstAttempt = false;
    }
}


// Start the game
async function startGame() {
    resetGlobals();

    for (elem in svgSquareElems) {
        svgSquareElems[elem].style.fill = RANK_SVG_DEFAULT_COLOR;
    }
    resetButtons();

    hideOverlayByID('menu-overlay');
    showOverlayByID('countdown-overlay');

    // Wait for the countdown to finish before proceeding
    await countdown();

    hideOverlayByID('countdown-overlay');

    generateQuestion();
    startTimer(ALOTTED_TIME); // Start game timer thread
    console.log('playing music')
    playMusic();
}


// End the game
function endGame(win) {
    stopMusic();
    clearInterval(timerInterval);

    showOverlayByID('menu-overlay');

    const overlayHeader = document.getElementById('menuHeader');
    const overlayScore = document.getElementById('menuScore');
    const overlayRank = document.getElementById('menuRank');
    const startButton = document.getElementById('menuButton');

    

    if (win) {
        playSFX(WIN_AUDIO);
        overlayHeader.textContent = 'You Win!';

        overlayRank.innerText = '';
    } else {
        playSFX(GAMEOVER_AUDIO);
        overlayHeader.textContent = 'Game Over';

        const nextElement = svgSquareElems[scoreCounter];
        const rank = getRank(nextElement);
        overlayRank.innerText = RANKS[rank]['name'];
        overlayRank.style.color = RANKS[rank]['color'];
    }

    overlayScore.textContent = 'Score: ' + scoreCounter;
    startButton.innerText = 'PLAY AGAIN';
}





// TIMERS //

// Primary game timer
function startTimer(startTime) {
    const timerElement = document.getElementById('timer');
    timeRemaining = startTime;
    timerElement.textContent = timeRemaining;

    timerInterval = setInterval(() => {
        if (timeRemaining > 1) {
            timeRemaining--;
            timerElement.textContent = timeRemaining;

            if (timeRemaining <= 5) {
                playSFX(COUNTDOWN_AUDIO);
                
                try {
                    if (currentAudio && typeof currentAudio.volume === 'number') {
                        currentAudio.volume = 0.2 * timeRemaining * MUSIC_VOLUME; // dampen audio
                    } else {
                        throw new Error("Invalid audio object or volume property missing");
                    }
                } catch (error) {
                    console.error("Failed to set the audio volume:", error);
                }

            }
            
        } else {
            timerElement.textContent = 0;
            endGame();
        }
    }, 1000);
}


// Pause the game's primary timer and return the current timeRemaining
function stopTimer() {
    clearInterval(timerInterval);
    return timeRemaining;
}


// Game start countdown timer
function countdown() {
    return new Promise((resolve, reject) => {
        const countdownHeader = document.getElementById('countdownHeader');
        let countdownRemaining = COUNTDOWN_TIME;
        countdownHeader.textContent = countdownRemaining;
        playSFX(COUNTDOWN_AUDIO);

        const intervalId = setInterval(() => {
            countdownRemaining--;

            if (countdownRemaining > 0) {
                countdownHeader.textContent = countdownRemaining;
                playSFX(COUNTDOWN_AUDIO);
            } else if (countdownRemaining == 0) {
                countdownHeader.textContent = 'Start!';
                playSFX(START_AUDIO);
            } else {
                clearInterval(intervalId);
                resolve();
            }
        }, 1000);
    });
}


// Pause on rankup screen for set timer
function rankupPause() {
    return new Promise((resolve, reject) => {
        let rankupRemaining = RANKUP_PAUSE_TIME;

        const intervalId = setInterval(() => {
            if (rankupRemaining > 0) {
                rankupRemaining--;
            } else {
                clearInterval(intervalId);
                resolve();
            }
        }, 1000);
    });
}





// HELPER FUNCTIONS //

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


// Show the rankup screen
async function showRankup(rank) {
    playSFX(RANKUP_AUDIO);
    const rankupRank = document.getElementById('rankupRank');
    rankupRank.innerText = RANKS[rank]['name'];
    rankupRank.style.color = RANKS[rank]['color'];

    showOverlayByID('rankup-overlay');
    await rankupPause();
    hideOverlayByID('rankup-overlay');
}


// Increase the game score
async function increaseScore() {
    const nextElement = svgSquareElems[scoreCounter];
    const rank = getRank(nextElement);
    nextElement.style.fill = RANKS[rank]['color'];

    if (prev_rank === rank) {
        playSFX(CORRECT_AUDIO);
    } else {
        prev_rank = rank;
        currentTime = stopTimer();
        await showRankup(rank);
        startTimer(currentTime);
    }
    scoreCounter++;
}

// Start a new game round
async function nextRound() {
    resetButtons();
    resetQuestion();
    if (firstAttempt === true) {
        await increaseScore();
    } else {
        playSFX(CORRECT_AUDIO);
    }
    if (scoreCounter >= svgSquareElems.length) {
        endGame(win=true);
        return;
    } else {
        generateQuestion()
    }
}


// Generate a list of possible answers given the parameters
function generateAnswerList(factor1, factor2, product) {
    selected_options = [];

    possible_fakes = factor_list[product.toString()].filter(factor => factor !== factor2);

    // We now select 5 wrong answers from our possible options
    for (i = selected_options.length; i < 5; i++) {
        selected_options.push(getRandomFromList(possible_fakes, true));
    }

    console.log(factor2)
    
    // We add the correct answer to the selected_options list
    selected_options.push(factor2);

    // We sort the list (strings first, then ascending numerical order)
    selected_options.sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
        }
        if (typeof a === 'string' && typeof b === 'number') {
            return -1;
        }
        if (typeof a === 'number' && typeof b === 'string') {
            return 1;
        }
    });

    return selected_options;
}

// Generate a question
function generateQuestion() {
    const product = getRandomFromList(Object.keys(factor_list), false);
    const factor1 = getRandomFromList(getFactorsExclude(product, FACTOR_EXCLUSION_LIST), false)
    const factor2 = Math.round(product/factor1);

    // We set the question
    const question = document.getElementById('question');
    question.textContent = 'What is ' + product + ' ÷ ' + factor1 + '?';

    const answerList = generateAnswerList(factor1, factor2, product);

    // We populate the buttons and set the correctID to the correct answer's button id
    for (i=0; i < 6; i++) {
        const ansBtn = document.getElementById(ANSWER_BUTTON_IDS[i]);
        ansBtn.textContent = answerList[i];
        if (answerList[i] === factor2) {
            correctButtonID = ANSWER_BUTTON_IDS[i];
        }
    }
}


// Extract the rank and numbers from the SVG rect element IDs
function getRank(elem) {
    return elem.id.substring(0, 4);
}
function getNum(elem) {
    return elem.id.substring(5, 6);
}





// LOGICAL HELPERS //

// Get a random element from the list (with or without removal)
function getRandomFromList(list, removal) {
    const randomIndex = Math.floor(Math.random()*list.length);
    item = list[randomIndex];
    if (removal) {
        list.splice(randomIndex, 1);
    }
    return item;
}


// Get a list of a product's factors excluding items in the list
function getFactorsExclude(product, exclusion_list) {
    let filteredFactors = [];
    const numericExclusionList = exclusion_list.map(item => Number(item));  // Convert exclusion list to numbers

    // Iterate only up to the square root of the product
    for (let i = 1; i <= Math.sqrt(product); i++) {
        if (product % i === 0) {
            let j = Math.round(product / i);  // Find the corresponding factor
            // Check if either factor is in the exclusion list
            if (!numericExclusionList.includes(i) && !numericExclusionList.includes(j)) {
                filteredFactors.push(i);
                if (i !== j) {  // Avoid pushing the square root twice if it's a perfect square
                    filteredFactors.push(j);
                }
            }
        }
    }

    return filteredFactors.sort((a, b) => a - b);  // Ensure the list is in ascending order
}





// SETS / RESETS //

// Set an answer button to be 'wrong'
function setButtonWrong(button) {
    button.disabled = true;
    button.style.backgroundColor = WRONG_ANSWER_BUTTON_COLOR;
}


// Reset the answer buttons
function resetButtons() {
    for (i in ANSWER_BUTTON_IDS) {
        const btn = document.getElementById(ANSWER_BUTTON_IDS[i]);
        btn.disabled = false;
        btn.style.backgroundColor = DEFAULT_ANSWER_BUTTON_COLOR;
        btn.innerText = '';
    }
}


// Reset the question header
function resetQuestion() {
    const header = document.getElementById('question');
    header.innerText = '...';
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

function resetGlobals() {
    resetAudio();
    timerInterval = null; 
    timeRemaining = 0;
    scoreCounter = 0;
    prev_rank = 'lead';
    firstAttempt = true;
    correctButtonID = null;
}





// AUDIO //

// Play a sound effect
function playSFX(audio) {
    if (!is_muteSFX) {
        audio.pause();
        audio.currentTime = 0;
        audio.play();
    }
}


// Play music on random playlist loop
function playMusic() {
    if (!is_muteMusic) {
        playRandomAudio(musicElems);
    }
}


// Stop the music
function stopMusic(audio) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0; // Reset the current audio if playing
    }
}


// Play random audio from a list
function playRandomAudio(audioList) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = getRandomFromList(audioList, false);
    currentAudio.play().catch(e => console.error('Error playing audio:', e));
}


// Toggle the SFX
function toggleSFX(self) {
    is_muteSFX = !is_muteSFX;
    if (is_muteSFX) {
        self.innerText = 'Enable Sound FX';
    } else {
        self.innerText = 'Disable Sound FX';
    }
}


// Toggle the Music
function toggleMusic(self) {
    is_muteMusic = !is_muteMusic;
    if (is_muteMusic) {
        self.innerText = 'Enable Music';
    } else {
        self.innerText = 'Disable Music';
    }
}

// Repaint force (ghosting refresh 50ms)
function setForceRepaint(element) {
    element.style.transform = 'translateZ(0)';
    setTimeout(() => {
      element.style.transform = '';
    }, 50);
}
