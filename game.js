// Game state
let allWords = [];
let gameWords = [];
let cardOrder = [];
let flippedCards = [];
let currentTargetIndex = 0;
let gameComplete = false;

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
        document.getElementById('currentWord').textContent = 'Error Loading Game';
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
    
    flippedCards = new Array(16).fill(false);
    currentTargetIndex = 0;
    gameComplete = false;
    
    updateDisplay();
    renderGrid();
    
    document.getElementById('playAgainBtn').classList.add('hidden');
    document.getElementById('message').textContent = '';
}

// Update display - ONLY shows the first word
function updateDisplay() {
    if (gameComplete) {
        document.getElementById('currentWord').textContent = '🎉 Game Complete! 🎉';
    } else if (currentTargetIndex === 0) {
        // Only show the first word at the top
        document.getElementById('currentWord').textContent = gameWords[cardOrder[0]].word;
    } else {
        // After first card, the top becomes empty or shows a prompt
        document.getElementById('currentWord').textContent = 'Find the next image...';
    }
    document.getElementById('wordsLearned').textContent = currentTargetIndex;
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
            cardFront.style.fontSize = '3em';
        };
        cardFront.appendChild(img);

        // Back side (word or star) - initially empty until flipped
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        // If card is already flipped (from previous game), show its content
        if (flippedCards[i]) {
            if (i === cardOrder[15] && gameComplete) {
                cardBack.innerHTML = '⭐';
                cardBack.style.fontSize = '5em';
            } else {
                cardBack.textContent = gameWords[i].word;
            }
        }

        card.appendChild(cardFront);
        card.appendChild(cardBack);
        
        // Add click handler
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
    // Check if card is already flipped or game is complete
    if (flippedCards[index] || gameComplete) {
        return;
    }

    const messageEl = document.getElementById('message');
    const card = document.querySelector(`[data-index="${index}"]`);
    const cardBack = card.querySelector('.card-back');

    // Check if this is the correct card (in the random order)
    if (index === cardOrder[currentTargetIndex]) {
        // Correct!
        messageEl.textContent = 'Correct! 🎉';
        messageEl.className = 'message correct';
        
        // Play ding sound
        await playSound('audio/ding.mp3');
        
        // Flip the card
        flippedCards[index] = true;
        card.classList.add('flipped');
        
        // Show the word on the back of THIS card
        if (currentTargetIndex === 15) {
            // Last card will show star after game complete
            cardBack.innerHTML = ''; // Clear first
        } else {
            // Show the word on the back of this card
            cardBack.textContent = gameWords[index].word;
        }
        
        // Play word audio
        await playSound(gameWords[index].audio);
        
        // Move to next target
        currentTargetIndex++;
        
        // Check if game is complete
        if (currentTargetIndex === 16) {
            gameComplete = true;
            document.getElementById('currentWord').textContent = '🎉 Game Complete! 🎉';
            document.getElementById('playAgainBtn').classList.remove('hidden');
            
            // Update the last card to show a star
            setTimeout(() => {
                const lastCardIndex = cardOrder[15];
                const lastCard = document.querySelector(`[data-index="${lastCardIndex}"]`);
                if (lastCard) {
                    const lastCardBack = lastCard.querySelector('.card-back');
                    lastCardBack.innerHTML = '⭐';
                    lastCardBack.style.fontSize = '5em';
                }
            }, 500);
        } else {
            // Update display (which now shows "Find the next image..." or similar)
            updateDisplay();
        }
        
    } else {
        // Wrong!
        messageEl.textContent = 'Try again! 🤔';
        messageEl.className = 'message wrong';
        
        // Play thud sound
        await playSound('audio/thud.mp3');
        
        // Shake animation
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