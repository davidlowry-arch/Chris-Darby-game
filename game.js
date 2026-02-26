// Game state
let allWords = [];
let gameWords = [];
let cardOrder = []; // Will store the randomized order of indices
let flippedCards = [];
let currentTargetWord = null;
let currentTargetIndex = 0;
let gameComplete = false;
let audioElements = {};

// Load JSON data
async function loadWords() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) {
            throw new Error('Failed to load words.json');
        }
        const data = await response.json();
        
        if (Array.isArray(data)) {
            allWords = data;
        } else if (data.words && Array.isArray(data.words)) {
            allWords = data.words;
        } else {
            allWords = [data];
        }
        
        if (allWords.length === 0) {
            throw new Error('No words found in JSON');
        }
        
        // Initialize the game
        initializeGame();
        
    } catch (error) {
        console.error('Error loading words:', error);
        document.getElementById('currentWord').textContent = 'Error Loading Game';
        document.getElementById('gameGrid').innerHTML = 
            '<div class="error">Failed to load words.json. Make sure the file exists in the parent folder.</div>';
    }
}

// Initialize or reset the game
function initializeGame() {
    // Shuffle and take first 16 words
    gameWords = [...allWords].sort(() => Math.random() - 0.5).slice(0, 16);
    
    // Create a randomized order of indices (0-15)
    cardOrder = Array.from({ length: 16 }, (_, i) => i);
    shuffleArray(cardOrder);
    
    flippedCards = new Array(16).fill(false);
    currentTargetIndex = 0;
    currentTargetWord = gameWords[cardOrder[0]];
    gameComplete = false;
    
    // Pre-load audio elements
    preloadAudio();
    
    updateDisplay();
    renderGrid();
    
    document.getElementById('playAgainBtn').classList.add('hidden');
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = 'message';
}

// Shuffle array function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Preload audio files
function preloadAudio() {
    // Add thud and ding sounds
    audioElements['thud'] = new Audio('audio/thud.mp3');
    audioElements['ding'] = new Audio('audio/ding.mp3');
    
    // Preload all word audio files
    gameWords.forEach((word, index) => {
        if (word.audio) {
            const audio = new Audio(word.audio);
            audio.load();
            audioElements[`word_${index}`] = audio;
        }
    });
}

// Play sound function
function playSound(soundName, index = null) {
    return new Promise((resolve) => {
        let audio;
        
        if (soundName === 'thud') {
            audio = audioElements['thud'];
        } else if (soundName === 'ding') {
            audio = audioElements['ding'];
        } else if (soundName === 'word' && index !== null) {
            audio = audioElements[`word_${index}`];
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.play().then(() => {
                audio.onended = resolve;
            }).catch(error => {
                console.error('Error playing sound:', error);
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Update the current word display
function updateDisplay() {
    if (gameComplete) {
        document.getElementById('currentWord').textContent = '🎉 Game Complete! 🎉';
    } else if (currentTargetWord) {
        document.getElementById('currentWord').textContent = currentTargetWord.word;
    }
    document.getElementById('wordsLearned').textContent = currentTargetIndex;
}

// Render the game grid
function renderGrid() {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';

    for (let i = 0; i < 16; i++) {
        const card = document.createElement('div');
        card.className = `card ${flippedCards[i] ? 'flipped' : ''}`;
        card.dataset.index = i;

        // Front of card (shows image)
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        const img = document.createElement('img');
        img.src = gameWords[i].image;
        img.alt = gameWords[i].word;
        img.onerror = () => {
            // Fallback if image doesn't load
            img.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.style.cssText = 'width:100%;height:100%;display:flex;justify-content:center;align-items:center;';
            fallback.textContent = '📷';
            fallback.style.fontSize = '3em';
            cardFront.appendChild(fallback);
        };
        cardFront.appendChild(img);

        // Back of card (shows word or star)
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';

        if (flippedCards[i]) {
            if (i === cardOrder[15] && gameComplete) {
                // Last card shows star
                cardBack.innerHTML = '⭐';
                cardBack.style.fontSize = '5em';
            } else {
                // Show the word on the back
                cardBack.textContent = gameWords[i].word;
            }
        }

        card.appendChild(cardFront);
        card.appendChild(cardBack);
        
        card.addEventListener('click', () => handleCardClick(i));
        grid.appendChild(card);
    }
}

// Handle card clicks
async function handleCardClick(index) {
    if (flippedCards[index] || gameComplete) return;

    const messageEl = document.getElementById('message');
    const card = document.querySelector(`[data-index="${index}"]`);

    // Check if this is the current target card (based on randomized order)
    if (index === cardOrder[currentTargetIndex]) {
        // Correct answer
        messageEl.textContent = 'Correct! 🎉';
        messageEl.className = 'message correct';
        
        // Play ding sound
        await playSound('ding');
        
        // Flip the card
        flippedCards[index] = true;
        card.classList.add('flipped');
        
        // Play word audio
        await playSound('word', index);
        
        // Move to next target
        currentTargetIndex++;
        
        // Check if game is complete
        if (currentTargetIndex === 16) {
            gameComplete = true;
            document.getElementById('currentWord').textContent = '🎉 Game Complete! 🎉';
            document.getElementById('playAgainBtn').classList.remove('hidden');
            
            // Re-render to show star on last card
            setTimeout(() => {
                renderGrid();
            }, 500);
        } else {
            // Update current target word
            currentTargetWord = gameWords[cardOrder[currentTargetIndex]];
            updateDisplay();
        }
        
    } else {
        // Wrong answer
        messageEl.textContent = 'Try again! 🤔';
        messageEl.className = 'message wrong';
        
        // Play thud sound
        await playSound('thud');
        
        // Shake the card
        card.classList.add('shake');
        setTimeout(() => {
            card.classList.remove('shake');
        }, 500);
    }
}

// Play again button handler
document.getElementById('playAgainBtn').addEventListener('click', () => {
    initializeGame();
});

// Start the game
loadWords();

// Add touch support for mobile
document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.card')) {
        e.preventDefault();
    }
}, { passive: false });