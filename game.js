// Game state
let allWords = [];
let gameWords = [];
let cardOrder = [];
let flippedCards = [];
let currentTargetIndex = 0;
let currentTargetWord = null;
let remainingIndices = [];
let gameComplete = false;
let firstWord = null; // Store the first word separately

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
        } else {
            allWords = [data];
        }
        
        if (allWords.length === 0) {
            throw new Error('No words found in JSON');
        }
        
        initializeGame();
        
    } catch (error) {
        console.error('Error loading words:', error);
        document.getElementById('currentWord').textContent = '?';
    }
}

// Initialize game
function initializeGame() {
    // Take first 16 words and shuffle them
    gameWords = [...allWords].sort(() => Math.random() - 0.5).slice(0, 16);
    
    // Create random order for flipping cards
    cardOrder = Array.from({ length: 16 }, (_, i) => i);
    for (let i = cardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
    }
    
    // Initialize remaining indices (all cards available)
    remainingIndices = [...cardOrder];
    
    flippedCards = new Array(16).fill(false);
    currentTargetIndex = 0;
    firstWord = gameWords[cardOrder[0]].word; // Store the first word
    currentTargetWord = firstWord;
    gameComplete = false;
    
    updateDisplay();
    renderGrid();
    
    document.getElementById('playAgainBtn').classList.add('hidden');
    document.getElementById('message').textContent = '';
}

// Update display - always shows the first word
function updateDisplay() {
    if (gameComplete) {
        document.getElementById('currentWord').textContent = '✓';
    } else {
        document.getElementById('currentWord').textContent = firstWord;
    }
}

// Play sound
function playSound(soundFile) {
    return new Promise((resolve) => {
        const audio = new Audio(soundFile);
        audio.play().then(() => {
            audio.onended = resolve;
        }).catch(error => {
            console.error('Error playing sound:', error);
            resolve();
        });
    });
}

// Render grid
function renderGrid() {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';

    for (let i = 0; i < 16; i++) {
        const card = document.createElement('div');
        card.className = `card ${flippedCards[i] ? 'flipped' : ''}`;
        card.setAttribute('data-index', i);

        // Front side (image)
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        const img = document.createElement('img');
        img.src = gameWords[i].image;
        img.alt = gameWords[i].word;
        img.onerror = () => {
            img.style.display = 'none';
            cardFront.innerHTML = '📷';
            cardFront.style.fontSize = '2em';
        };
        cardFront.appendChild(img);

        // Back side - will show next word when flipped
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        // If card is already flipped, show the appropriate content
        if (flippedCards[i]) {
            const flippedPosition = cardOrder.indexOf(i);
            
            if (flippedPosition === 15) {
                // Last card shows checkmark
                cardBack.innerHTML = '✓';
                cardBack.style.fontSize = '3em';
            } else {
                // Show the word of the next card in sequence
                const nextCardIndex = cardOrder[flippedPosition + 1];
                const nextWord = gameWords[nextCardIndex].word;
                cardBack.textContent = nextWord;
                cardBack.setAttribute('data-word-length', nextWord.length);
            }
        }

        card.appendChild(cardFront);
        card.appendChild(cardBack);
        
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = parseInt(this.getAttribute('data-index'));
            handleCardClick(idx);
        });
        
        grid.appendChild(card);
    }
}

// Handle card click
async function handleCardClick(index) {
    if (flippedCards[index] || gameComplete) return;

    const messageEl = document.getElementById('message');
    const card = document.querySelector(`[data-index="${index}"]`);
    const cardBack = card.querySelector('.card-back');

    if (gameWords[index].word === currentTargetWord) {
        messageEl.textContent = 'Correct!';
        messageEl.className = 'message correct';
        
        await playSound('audio/ding.mp3');
        
        const posInRemaining = remainingIndices.indexOf(index);
        if (posInRemaining > -1) {
            remainingIndices.splice(posInRemaining, 1);
        }
        
        if (currentTargetIndex === 15) {
            cardBack.innerHTML = '';
        } else {
            const nextCardIndex = remainingIndices[0];
            const nextWord = gameWords[nextCardIndex].word;
            cardBack.textContent = nextWord;
            cardBack.setAttribute('data-word-length', nextWord.length);
            currentTargetWord = nextWord;
        }
        
        flippedCards[index] = true;
        card.classList.add('flipped');
        
        await playSound(gameWords[index].audio);
        
        currentTargetIndex++;
        
        if (currentTargetIndex === 16) {
            gameComplete = true;
            document.getElementById('currentWord').textContent = '✓';
            document.getElementById('playAgainBtn').classList.remove('hidden');
            
            setTimeout(() => {
                const lastCardIndex = cardOrder[15];
                const lastCard = document.querySelector(`[data-index="${lastCardIndex}"]`);
                if (lastCard) {
                    const lastCardBack = lastCard.querySelector('.card-back');
                    lastCardBack.innerHTML = '✓';
                    lastCardBack.style.fontSize = '3em';
                    lastCardBack.removeAttribute('data-word-length');
                }
            }, 500);
        }
        
    } else {
        messageEl.textContent = 'Try again';
        messageEl.className = 'message wrong';
        
        await playSound('audio/thud.mp3');
        
        card.classList.add('shake');
        setTimeout(() => {
            card.classList.remove('shake');
        }, 500);
    }
}

// Play again button
document.getElementById('playAgainBtn').addEventListener('click', () => {
    initializeGame();
});

// Start the game
loadWords();