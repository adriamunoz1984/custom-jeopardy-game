function isCustomGameComplete() {
    let totalQuestions = 0;
    for (let cat = 1; cat <= 5; cat++) {
        for (let amount of [100, 200, 300, 400, 500]) {
            if (customQuestions.questions[cat][amount]) {
                totalQuestions++;
            }
        }
    }
    return totalQuestions >= 20; // Allow playing with at least 20 questions
}

// Save/Load Game Functions
function saveGameToFile() {
    const gameName = document.getElementById('game-name-input').value.trim() || customQuestions.title || 'Custom Jeopardy Game';
    const gameDescription = document.getElementById('game-description-input').value.trim() || customQuestions.description || 'Custom game created with Jeopardy maker';
    
    // Update custom questions with metadata
    customQuestions.title = gameName;
    customQuestions.description = gameDescription;
    
    // Only update creation date if not editing
    if (!gameState.isEditing) {
        customQuestions.dateCreated = new Date().toISOString();
    }
    
    // Create the game file
    const gameFile = {
        ...customQuestions,
        version: '1.0',
        type: 'jeopardy-game'
    };
    
    if (gameState.isEditing) {
        // Update existing game
        const allGames = gameStorage.getAllGames();
        const updatedGames = allGames.map((game, index) => 
            index === gameState.editingGameId ? gameFile : game
        );
        
        // Clear storage and re-add updated games
        gameStorage.clear();
        updatedGames.forEach(game => gameStorage.saveGame(game));
        
        alert(`Game "${gameName}" updated successfully!`);
    } else {
        // Save new game
        gameStorage.saveGame(gameFile);
        alert(`Game "${gameName}" saved successfully!`);
    }
    
    // Also download as file
    const dataStr = JSON.stringify(gameFile, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${gameName.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Update the saved games list
    loadSavedGamesList();
    
    // If editing, reset state
    if (gameState.isEditing) {
        resetCreatorState();
    }
}

function loadSavedGamesList() {
    const savedGamesList = document.getElementById('saved-games-list');
    
    // Get all games from our safe storage
    const allGames = gameStorage.getAllGames();
    
    if (allGames.length === 0) {
        savedGamesList.innerHTML = `
            <p>No saved games found. Upload a game file or create a new custom game first.</p>
            ${!gameStorage.canUseLocalStorage ? '<p style="color: #FFA500; font-size: 0.9em;">Note: Browser storage is not available in this environment. Games will only persist during this session.</p>' : ''}
        `;
        return;
    }
    
    savedGamesList.innerHTML = '';
    
    allGames.forEach((game, index) => {
        const gameItem = document.createElement('div');
        gameItem.className = 'saved-game-item';
        gameItem.dataset.gameIndex = index;
        
        const dateStr = new Date(game.dateCreated).toLocaleDateString();
        const questionsCount = countGameQuestions(game);
        
        gameItem.innerHTML = `
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-details">${game.description}</div>
                <div class="game-details">Created: ${dateStr} | ${questionsCount}/25 questions</div>
            </div>
        `;
        
        gameItem.addEventListener('click', () => selectSavedGame(index));
        savedGamesList.appendChild(gameItem);
    });
    
    // Add storage info if localStorage is not available
    if (!gameStorage.canUseLocalStorage) {
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'background: rgba(255,165,0,0.2); padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 0.9em; color: #FFA500;';
        infoDiv.innerHTML = '⚠️ Browser storage is limited in this environment. Games will only persist during this session. Use file download/upload for permanent storage.';
        savedGamesList.appendChild(infoDiv);
    }
}

function countGameQuestions(game) {
    let count = 0;
    for (let cat = 1; cat <= 5; cat++) {
        for (let amount of [100, 200, 300, 400, 500]) {
            if (game.questions[cat] && game.questions[cat][amount]) {
                count++;
            }
        }
    }
    return count;
}

function selectSavedGame(index) {
    // Remove previous selection
    document.querySelectorAll('.saved-game-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select new game
    const gameItem = document.querySelector(`[data-game-index="${index}"]`);
    if (gameItem) {
        gameItem.classList.add('selected');
        gameState.selectedSavedGame = index;
        
        // Enable buttons
        document.getElementById('play-selected-game-btn').disabled = false;
        document.getElementById('edit-selected-game-btn').disabled = false;
        document.getElementById('delete-selected-game-btn').disabled = false;
    }
}

function playSelectedGame() {
    if (gameState.selectedSavedGame === null) return;
    
    const allGames = gameStorage.getAllGames();
    const selectedGame = allGames[gameState.selectedSavedGame];
    if (!selectedGame) return;
    
    loadCustomGame(selectedGame);
    
    gameState.usingCustomQuestions = true;
    gameState.currentGameTitle = selectedGame.title;
    
    showScreen('setup-screen');
}

function editSelectedGame() {
    if (gameState.selectedSavedGame === null) return;
    
    const allGames = gameStorage.getAllGames();
    const selectedGame = allGames[gameState.selectedSavedGame];
    if (!selectedGame) return;
    
    // Set editing mode
    gameState.isEditing = true;
    gameState.editingGameId = gameState.selectedSavedGame;
    
    // Load the game into the creator
    loadCustomGame(selectedGame);
    
    // Go to creator screen
    showScreen('creator-screen');
    initializeCreator(true); // true = editing mode
}

function deleteSelectedGame() {
    if (gameState.selectedSavedGame === null) return;
    
    const allGames = gameStorage.getAllGames();
    const selectedGame = allGames[gameState.selectedSavedGame];
    if (!selectedGame) return;
    
    if (confirm(`Are you sure you want to delete "${selectedGame.title}"?`)) {
        // Create a new array without the selected game
        const updatedGames = allGames.filter((_, index) => index !== gameState.selectedSavedGame);
        
        // Clear storage and re-add all games except the deleted one
        gameStorage.clear();
        updatedGames.forEach(game => gameStorage.saveGame(game));
        
        gameState.selectedSavedGame = null;
        document.getElementById('play-selected-game-btn').disabled = true;
        document.getElementById('edit-selected-game-btn').disabled = true;
        document.getElementById('delete-selected-game-btn').disabled = true;
        
        loadSavedGamesList();
    }
}

function loadCustomGame(gameFile) {
    // Load the game data into our custom questions structure
    customQuestions = { ...gameFile };
    
    // Ensure all questions have 'used: false' property
    for (let cat = 1; cat <= 5; cat++) {
        for (let amount of [100, 200, 300, 400, 500]) {
            if (customQuestions.questions[cat] && customQuestions.questions[cat][amount]) {
                customQuestions.questions[cat][amount].used = false;
            }
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const gameData = JSON.parse(e.target.result);
            
            // Validate game file structure
            if (!gameData.questions || !gameData.categories) {
                throw new Error('Invalid game file format');
            }
            
            // Check if game already exists
            const allGames = gameStorage.getAllGames();
            const existingIndex = allGames.findIndex(game => 
                game.title === gameData.title && 
                game.dateCreated === gameData.dateCreated
            );
            
            if (existingIndex === -1) {
                gameStorage.saveGame(gameData);
                loadSavedGamesList();
                alert(`Game "${gameData.title}" loaded successfully!`);
            } else {
                alert(`Game "${gameData.title}" already exists in your saved games.`);
            }
            
        } catch (error) {
            alert('Error loading game file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Initialize audio manager
let audioManager;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    audioManager = new AudioManager();
    
    // Initialize storage system
    gameStorage = new SafeStorage();
    
    // Load saved games on startup
    loadSavedGamesList();
    
    console.log('🔧 Setting up event listeners...');
    console.log('saveCategories function exists:', typeof saveCategories);
    console.log('editCategories function exists:', typeof editCategories);
    console.log('previousQuestion function exists:', typeof previousQuestion);
    
    // Main menu
    document.getElementById('play-default-btn').addEventListener('click', function() {
        gameState.usingCustomQuestions = false;
        gameState.currentGameTitle = 'Aerospace Ethics Jeopardy';
        showScreen('setup-screen');
    });

    document.getElementById('create-questions-btn').addEventListener('click', function() {
        showScreen('creator-screen');
        initializeCreator();
    });

    document.getElementById('load-custom-btn').addEventListener('click', function() {
        showScreen('load-game-screen');
        loadSavedGamesList();
    });

    // Load game screen
    document.getElementById('play-selected-game-btn').addEventListener('click', playSelectedGame);
    document.getElementById('edit-selected-game-btn').addEventListener('click', editSelectedGame);
    document.getElementById('delete-selected-game-btn').addEventListener('click', deleteSelectedGame);
    document.getElementById('back-to-menu-from-load-btn').addEventListener('click', function() {
        showScreen('main-menu-screen');
    });
    document.getElementById('game-file-input').addEventListener('change', handleFileUpload);

    // Question Creator
    document.getElementById('save-categories-btn').addEventListener('click', saveCategories);
    document.getElementById('edit-categories-btn').addEventListener('click', editCategories);
    document.getElementById('previous-question-btn').addEventListener('click', previousQuestion);
    document.getElementById('save-question-btn').addEventListener('click', saveCurrentQuestion);
    document.getElementById('save-game-btn').addEventListener('click', saveGameToFile);
    document.getElementById('back-to-menu-btn').addEventListener('click', function() {
        showScreen('main-menu-screen');
        resetCreatorState();
    });
    document.getElementById('finish-creating-btn').addEventListener('click', function() {
        if (isCustomGameComplete()) {
            gameState.usingCustomQuestions = true;
            gameState.currentGameTitle = customQuestions.title || 'Custom Jeopardy Game';
            showScreen('setup-screen');
        } else {
            alert('Please complete all 25 questions before playing!');
        }
    });

    // Player count selection
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            gameState.numPlayers = parseInt(this.dataset.count);
            document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Setup buttons
    document.getElementById('continue-btn').addEventListener('click', startNameEntry);
    document.getElementById('add-player-btn').addEventListener('click', addPlayer);
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // Game control buttons
    document.getElementById('reset-game-btn').addEventListener('click', resetCurrentGame);
    document.getElementById('back-to-home-btn').addEventListener('click', backToHome);

    // Question screen buttons
    document.getElementById('show-question-btn').addEventListener('click', showQuestion);
    document.getElementById('nobody-correct-btn').addEventListener('click', nobodyCorrect);

    // Final Jeopardy buttons
    document.getElementById('submit-wager-btn').addEventListener('click', submitWager);
    document.getElementById('show-final-question-btn').addEventListener('click', showFinalQuestion);
    document.getElementById('finish-game-btn').addEventListener('click', finishGame);

    // Game over buttons
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    document.getElementById('quit-game-btn').addEventListener('click', quitGame);

    // Keyboard events
    document.getElementById('player-name-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });

    document.getElementById('wager-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitWager();
        }
    });

    console.log('🛩️ Enhanced Jeopardy Game Loaded! ✈️');
    console.log('All functions loaded and ready!');
});

function getGameData() {
    if (gameState.usingCustomQuestions) {
        // Convert custom questions to game format
        const customGameData = {};
        for (let cat = 1; cat <= 5; cat++) {
            const categoryName = customQuestions.categories[cat - 1];
            customGameData[categoryName] = {};
            for (let amount of [100, 200, 300, 400, 500]) {
                if (customQuestions.questions[cat][amount]) {
                    customGameData[categoryName][amount] = customQuestions.questions[cat][amount];
                } else {
                    // Placeholder for missing questions
                    customGameData[categoryName][amount] = {
                        answer: "Question not created",
                        question: "What is a missing question?",
                        used: false
                    };
                }
            }
        }
        return customGameData;
    } else {
        return gameData;
    }
}

// Utility Functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Setup Functions
function startNameEntry() {
    document.getElementById('player-count-section').classList.add('hidden');
    document.getElementById('name-entry-section').classList.remove('hidden');
    gameState.setupStep = 1;
    updateNameEntry();
}

function updateNameEntry() {
    const playerNum = gameState.players.length + 1;
    document.getElementById('name-prompt').textContent = `Enter name for Player ${playerNum}:`;
    document.getElementById('current-color').style.backgroundColor = playerColors[gameState.players.length];
    document.getElementById('player-name-input').value = '';
    document.getElementById('player-name-input').focus();
}

function addPlayer() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    
    if (name) {
        gameState.players.push({
            name: name,
            score: 0,
            color: playerColors[gameState.players.length],
            finalJeopardyWager: 0,
            hasWagered: false
        });

        if (gameState.players.length < gameState.numPlayers) {
            updateNameEntry();
        } else {
            showPlayersSummary();
        }
    }
}

function showPlayersSummary() {
    document.getElementById('name-entry-section').classList.add('hidden');
    document.getElementById('players-summary').classList.remove('hidden');
    
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-preview';
        playerDiv.innerHTML = `
            <div class="color-indicator" style="background-color: ${player.color}"></div>
            <span>${index + 1}. ${player.name}</span>
        `;
        playersList.appendChild(playerDiv);
    });
}

// Game Functions
function startGame() {
    showScreen('board-screen');
    initializeBoard();
    updateScoreboard();
    updateCurrentTurn();
    updateGameTitle();
}

function updateGameTitle() {
    document.getElementById('game-title-display').textContent = gameState.currentGameTitle;
}

function initializeBoard() {
    const amountsGrid = document.getElementById('amounts-grid');
    const categoriesDisplay = document.getElementById('categories-display');
    
    amountsGrid.innerHTML = '';
    categoriesDisplay.innerHTML = '';
    
    const currentGameData = getGameData();
    const categories = Object.keys(currentGameData);
    const amounts = [100, 200, 300, 400, 500];
    
    // Update category headers
    categories.forEach(category => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        categoriesDisplay.appendChild(categoryHeader);
    });
    
    // Create amount buttons
    amounts.forEach(amount => {
        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'amount-btn';
            btn.textContent = `${amount}`;
            btn.addEventListener('click', () => selectQuestion(category, amount));
            btn.id = `${category.replace(/\s+/g, '-')}-${amount}`;
            amountsGrid.appendChild(btn);
        });
    });
}

function selectQuestion(category, amount) {
    const currentGameData = getGameData();
    if (currentGameData[category][amount].used) return;
    
    gameState.currentCategory = category;
    gameState.currentAmount = amount;
    gameState.currentQuestion = currentGameData[category][amount];
    
    showScreen('question-screen');
    displayQuestion();
}

function displayQuestion() {
    document.getElementById('question-category').textContent = `Category: ${gameState.currentCategory}`;
    document.getElementById('question-value').textContent = `Value: ${gameState.currentAmount}`;
    document.getElementById('question-selector').textContent = `Selected by: ${gameState.players[gameState.questionSelector].name}`;
    document.getElementById('answer-text').textContent = gameState.currentQuestion.answer;
    
    document.getElementById('show-question-section').classList.remove('hidden');
    document.getElementById('question-section').classList.add('hidden');
    
    updateQuestionScoreboard();
}

function showQuestion() {
    document.getElementById('show-question-section').classList.add('hidden');
    document.getElementById('question-section').classList.remove('hidden');
    document.getElementById('question-text').textContent = gameState.currentQuestion.question;
    
    const answerButtons = document.getElementById('answer-buttons');
    answerButtons.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const btn = document.createElement('button');
        btn.className = 'player-btn';
        btn.style.backgroundColor = player.color;
        btn.style.color = 'black';
        btn.textContent = `${player.name} ✓`;
        btn.addEventListener('click', () => playerCorrect(index));
        answerButtons.appendChild(btn);
    });
}

function playerCorrect(playerIndex) {
    gameState.players[playerIndex].score += gameState.currentAmount;
    gameState.questionSelector = playerIndex;
    gameState.currentQuestion.used = true;
    gameState.questionsAnswered++;
    
    updateQuestionUsed();
    checkGameCompletion();
}

function nobodyCorrect() {
    gameState.currentQuestion.used = true;
    gameState.questionsAnswered++;
    
    updateQuestionUsed();
    checkGameCompletion();
}

function updateQuestionUsed() {
    const categoryForId = gameState.currentCategory.replace(/\s+/g, '-');
    const btn = document.getElementById(`${categoryForId}-${gameState.currentAmount}`);
    btn.classList.add('used');
    btn.textContent = '---';
    btn.onclick = null;
}

function checkGameCompletion() {
    if (gameState.questionsAnswered >= gameState.totalQuestions) {
        startFinalJeopardy();
    } else {
        showScreen('board-screen');
        updateScoreboard();
        updateCurrentTurn();
        updateQuestionsRemaining();
    }
}

// Final Jeopardy Functions
function startFinalJeopardy() {
    gameState.finalJeopardyPlayer = 0;
    showScreen('final-wager-screen');
    updateWagerScreen();
}

function updateWagerScreen() {
    const currentPlayer = gameState.players[gameState.finalJeopardyPlayer];
    document.getElementById('current-wagerer').innerHTML = `
        <h2 style="color: ${currentPlayer.color}">${currentPlayer.name}'s turn to wager</h2>
    `;
    
    document.getElementById('current-score').textContent = `Current score: ${currentPlayer.score}`;
    const maxWager = Math.max(1000, currentPlayer.score);
    document.getElementById('max-wager').textContent = `Maximum wager: ${maxWager}`;
    document.getElementById('wager-input').max = maxWager;
    document.getElementById('wager-input').value = '';
    
    const previousWagers = document.getElementById('previous-wagers');
    previousWagers.innerHTML = '<h3>Wagers so far:</h3>';
    gameState.players.forEach(player => {
        if (player.hasWagered) {
            const wagerDiv = document.createElement('div');
            wagerDiv.style.color = player.color;
            wagerDiv.textContent = `${player.name}: ${player.finalJeopardyWager}`;
            previousWagers.appendChild(wagerDiv);
        }
    });
}

function submitWager() {
    const wagerInput = document.getElementById('wager-input');
    const wager = parseInt(wagerInput.value) || 0;
    const maxWager = Math.max(1000, gameState.players[gameState.finalJeopardyPlayer].score);
    
    if (wager >= 0 && wager <= maxWager) {
        gameState.players[gameState.finalJeopardyPlayer].finalJeopardyWager = wager;
        gameState.players[gameState.finalJeopardyPlayer].hasWagered = true;
        gameState.finalJeopardyPlayer++;
        
        if (gameState.finalJeopardyPlayer >= gameState.players.length) {
            showFinalJeopardyQuestion();
        } else {
            updateWagerScreen();
        }
    } else {
        alert(`Please enter a wager between $0 and ${maxWager}`);
    }
}

function showFinalJeopardyQuestion() {
    showScreen('final-question-screen');
    document.getElementById('final-show-section').classList.remove('hidden');
    document.getElementById('final-question-section').classList.add('hidden');
    
    // Update Final Jeopardy content if using custom questions
    if (gameState.usingCustomQuestions && customQuestions.finalJeopardy) {
        document.getElementById('final-category-display').textContent = `Category: ${customQuestions.finalJeopardy.category}`;
        document.getElementById('final-answer-text').textContent = customQuestions.finalJeopardy.answer;
        document.getElementById('final-question-text').textContent = customQuestions.finalJeopardy.question;
    }
    
    const allWagers = document.getElementById('all-wagers');
    allWagers.innerHTML = '';
    gameState.players.forEach(player => {
        const wagerDiv = document.createElement('div');
        wagerDiv.style.color = player.color;
        wagerDiv.textContent = `${player.name}: ${player.finalJeopardyWager}`;
        allWagers.appendChild(wagerDiv);
    });
}

function showFinalQuestion() {
    document.getElementById('final-show-section').classList.add('hidden');
    document.getElementById('final-question-section').classList.remove('hidden');
    
    const finalAnswerButtons = document.getElementById('final-answer-buttons');
    finalAnswerButtons.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const btn = document.createElement('button');
        btn.className = 'player-btn';
        btn.style.backgroundColor = player.color;
        btn.style.color = 'black';
        btn.textContent = `${player.name} ✓`;
        btn.addEventListener('click', () => finalCorrect(index));
        finalAnswerButtons.appendChild(btn);
    });
}

function finalCorrect(playerIndex) {
    gameState.players[playerIndex].score += gameState.players[playerIndex].finalJeopardyWager;
    event.target.style.opacity = '0.5';
    event.target.onclick = null;
}

function finishGame() {
    showScreen('game-over-screen');
    displayResults();
}

// Game Over Functions
function displayResults() {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    const winner = sortedPlayers[0];
    document.getElementById('winner-announcement').innerHTML = `
        🏆 WINNER: <span style="color: ${winner.color}">${winner.name}</span>! 🏆
    `;
    
    const rankings = document.getElementById('final-rankings');
    rankings.innerHTML = '';
    
    sortedPlayers.forEach((player, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        if (index === 0) {
            scoreItem.style.backgroundColor = 'rgba(255, 204, 0, 0.3)';
        }
        
        scoreItem.innerHTML = `
            <span>
                <div class="color-indicator" style="background-color: ${player.color}; display: inline-block; margin-right: 10px;"></div>
                ${index + 1}. ${player.name}
            </span>
            <span style="color: ${player.color}; font-weight: bold;">${player.score}</span>
        `;
        rankings.appendChild(scoreItem);
    });
    
    document.getElementById('final-question-count').textContent = gameState.questionsAnswered;
}

// Scoreboard Functions
function updateScoreboard() {
    const scoreboardContent = document.getElementById('scoreboard-content');
    scoreboardContent.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerScore = document.createElement('div');
        playerScore.className = 'player-score';
        if (index === gameState.questionSelector) {
            playerScore.classList.add('active');
        }
        
        playerScore.innerHTML = `
            <div class="color-indicator" style="background-color: ${player.color}"></div>
            <div>
                <div style="font-weight: bold;">${player.name}</div>
                <div>${player.score}</div>
            </div>
        `;
        scoreboardContent.appendChild(playerScore);
    });
}

function updateQuestionScoreboard() {
    const questionScoreboard = document.getElementById('question-scoreboard');
    questionScoreboard.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerScore = document.createElement('div');
        playerScore.className = 'player-score';
        
        playerScore.innerHTML = `
            <div class="color-indicator" style="background-color: ${player.color}"></div>
            <div>
                <div style="font-weight: bold;">${player.name}</div>
                <div>${player.score}</div>
            </div>
        `;
        questionScoreboard.appendChild(playerScore);
    });
}

function updateCurrentTurn() {
    const currentTurn = document.getElementById('current-turn');
    const player = gameState.players[gameState.questionSelector];
    currentTurn.innerHTML = `<span style="color: ${player.color}">${player.name}'s turn to select</span>`;
}

function updateQuestionsRemaining() {
    document.getElementById('questions-remaining').textContent = gameState.totalQuestions - gameState.questionsAnswered;
}

// Reset Functions
function resetCurrentGame() {
    if (confirm('Are you sure you want to reset the current game? All progress will be lost.')) {
        // Reset player scores
        gameState.players.forEach(player => {
            player.score = 0;
            player.finalJeopardyWager = 0;
            player.hasWagered = false;
        });
        
        // Reset game state
        gameState.currentPlayer = 0;
        gameState.questionSelector = 0;
        gameState.questionsAnswered = 0;
        gameState.finalJeopardyPlayer = 0;
        gameState.currentQuestion = null;
        gameState.currentCategory = null;
        gameState.currentAmount = 0;
        
        // Reset question usage
        if (gameState.usingCustomQuestions) {
            // Reset custom questions
            for (let cat = 1; cat <= 5; cat++) {
                for (let amount of [100, 200, 300, 400, 500]) {
                    if (customQuestions.questions[cat][amount]) {
                        customQuestions.questions[cat][amount].used = false;
                    }
                }
            }
        } else {
            // Reset default game data
            Object.keys(gameData).forEach(category => {
                Object.keys(gameData[category]).forEach(amount => {
                    gameData[category][amount].used = false;
                });
            });
        }
        
        // Reinitialize the board
        initializeBoard();
        updateScoreboard();
        updateCurrentTurn();
        updateQuestionsRemaining();
        
        alert('Game has been reset! Start fresh with the same players.');
    }
}

function backToHome() {
    if (confirm('Are you sure you want to return to the main menu? All game progress will be lost.')) {
        // Complete reset of everything
        gameState = {
            players: [],
            currentPlayer: 0,
            questionSelector: 0,
            questionsAnswered: 0,
            totalQuestions: 25,
            numPlayers: 4,
            setupStep: 0,
            currentQuestion: null,
            currentCategory: null,
            currentAmount: 0,
            finalJeopardyPlayer: 0,
            usingCustomQuestions: false,
            creatorStep: 0,
            creatorCategory: 1,
            creatorAmount: 100,
            currentGameData: null,
            currentGameTitle: 'Aerospace Ethics Jeopardy',
            selectedSavedGame: null,
            isEditing: false,
            editingGameId: null
        };
        
        // Reset all game data
        Object.keys(gameData).forEach(category => {
            Object.keys(gameData[category]).forEach(amount => {
                gameData[category][amount].used = false;
            });
        });
        
        // Reset UI elements
        document.getElementById('player-count-section').classList.remove('hidden');
        document.getElementById('name-entry-section').classList.add('hidden');
        document.getElementById('players-summary').classList.add('hidden');
        
        document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.count-btn')[2].classList.add('selected'); // Default to 4 players
        
        showScreen('main-menu-screen');
    }
}

function playAgain() {
    gameState = {
        players: [],
        currentPlayer: 0,
        questionSelector: 0,
        questionsAnswered: 0,
        totalQuestions: 25,
        numPlayers: 4,
        setupStep: 0,
        currentQuestion: null,
        currentCategory: null,
        currentAmount: 0,
        finalJeopardyPlayer: 0,
        usingCustomQuestions: false,
        creatorStep: 0,
        creatorCategory: 1,
        creatorAmount: 100,
        currentGameData: null,
        currentGameTitle: 'Aerospace Ethics Jeopardy',
        selectedSavedGame: null,
        isEditing: false,
        editingGameId: null
    };
    
    // Reset default game data
    Object.keys(gameData).forEach(category => {
        Object.keys(gameData[category]).forEach(amount => {
            gameData[category][amount].used = false;
        });
    });
    
    // Reset custom questions if they were being used
    if (gameState.usingCustomQuestions) {
        for (let cat = 1; cat <= 5; cat++) {
            for (let amount of [100, 200, 300, 400, 500]) {
                if (customQuestions.questions[cat][amount]) {
                    customQuestions.questions[cat][amount].used = false;
                }
            }
        }
    }
    
    document.getElementById('player-count-section').classList.remove('hidden');
    document.getElementById('name-entry-section').classList.add('hidden');
    document.getElementById('players-summary').classList.add('hidden');
    
    document.querySelectorAll('.count-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.count-btn')[2].classList.add('selected');
    
    showScreen('main-menu-screen');
}

function quitGame() {
    if (confirm('Are you sure you want to quit?')) {
        showScreen('main-menu-screen');
    }
}// Game Data - Aerospace Ethics Questions
const gameData = {
    "COST-CUTTING": {
        100: {
            answer: "These seven measures include outsourcing maintenance, leasing aircraft, offering ticket-less travel, using kiosk-based check-in, minimizing inflight meals, transferring functions to call centers, and maximizing employee scheduling efficiency.",
            question: "What are the 7 typical airline cost-cutting measures?",
            used: false
        },
        200: {
            answer: "Airlines now lease new airplanes for shorter periods, increased aircraft reliability has reduced maintenance needs, computer technology has transformed maintenance into 'remove and replace' rather than repair, and lay-offs have forced maintenance professionals to seek employment outside aviation.",
            question: "What are the 4 maintenance changes that have occurred to reduce cost?",
            used: false
        },
        300: {
            answer: "This describes mechanics who love the technology and their work but feel undervalued by their company, creating a disconnect between labor and management groups.",
            question: "What does 'square peg in a round hole' mean in aviation maintenance?",
            used: false
        },
        400: {
            answer: "This collaborative program between management, labor, and regulators detects and resolves systemic problems through self-reports of maintenance errors.",
            question: "What is the ASAP program?",
            used: false
        },
        500: {
            answer: "Only two universities offered aviation ethics courses at the time of writing, and while students found them interesting, they didn't necessarily teach 'anything new'.",
            question: "What is the status of ethics education in collegiate aviation programs?",
            used: false
        }
    },
    "ETHICAL THEMES": {
        100: {
            answer: "These four themes are: passion for aviation, commitment to safety, role models and defining moments, and square peg in a round hole.",
            question: "What are the four themes that emerged from interviewing mechanics and inspectors?",
            used: false
        },
        200: {
            answer: "Most people in aviation are passionate about airplanes, fascinated by flight technology, and willing to endure incredible highs and lows professionally and personally.",
            question: "What characterizes 'passion for aviation' as described in Chapter 3?",
            used: false
        },
        300: {
            answer: "Maintenance personnel are committed to safety because they've incurred personal injury, been proximal to accidents, were influenced by role models, or were mentored early in their careers.",
            question: "What motivates maintenance personnel's commitment to safety?",
            used: false
        },
        400: {
            answer: "These are important elements of character development, where both positive and negative examples impact impressionable minds.",
            question: "What are role models and defining moments in professional development?",
            used: false
        },
        500: {
            answer: "Military training emphasizes thoroughness, attention to detail, following procedures exactly, accountability for tools and actions, and systematic approaches to maintenance.",
            question: "What military work practices might help improve safety in civilian aviation?",
            used: false
        }
    },
    "REGULATIONS": {
        100: {
            answer: "This is the process by which individuals learn appropriate behaviors by observing and imitating the actions of others, particularly authority figures.",
            question: "What is behavior modeling?",
            used: false
        },
        200: {
            answer: "Their function is to create, enforce, and oversee compliance with aviation safety regulations and ensure public safety through inspections and oversight.",
            question: "What is the function of Federal Regulators?",
            used: false
        },
        300: {
            answer: "They develop, publicize, and uphold high ethical standards; create codes of ethics; provide guidance to membership; and help transition individuals from Level-1 to Level-2 decision-makers.",
            question: "What are the responsibilities of Professional Organizations in the aviation industry?",
            used: false
        },
        400: {
            answer: "An AMT is responsible for public safety, will exercise good judgment in evaluating risks, and will not degrade their profession by allowing supervisors to persuade them against better judgment.",
            question: "What are the 3 Code of Ethics published by PAMA?",
            used: false
        },
        500: {
            answer: "Ethical behavior builds trust because it demonstrates reliability, integrity, and consistency in decision-making, essential for professional relationships and public confidence.",
            question: "Why is the practice of ethical behavior associated with trust?",
            used: false
        }
    },
    "AVIATION INDUSTRY": {
        100: {
            answer: "The post-deregulation aviation industry has been plagued with fare wars, with very few airlines successful in the low-cost business model.",
            question: "What characterizes the modern aviation industry environment?",
            used: false
        },
        200: {
            answer: "Outsourcing maintenance, leasing aircraft instead of buying, offering ticket-less travel, using kiosk-based check-in, and minimizing costs wherever possible.",
            question: "What are typical cost-cutting measures airlines use?",
            used: false
        },
        300: {
            answer: "The drive to reduce costs and increased equipment reliability have pushed safety concerns into the design domain, leading toward 'disposable' consumerism.",
            question: "How have cost-cutting measures affected aviation safety philosophy?",
            used: false
        },
        400: {
            answer: "Historical stigma, classification as 'semi-skilled' laborers, limited collegiate education, and reluctance to take charge due to seeing themselves as 'not the management type'.",
            question: "What factors prevent mechanics from taking leadership roles?",
            used: false
        },
        500: {
            answer: "Companies focus on survival and getting paperwork signed off rather than whether jobs are done properly, leading to outsourcing and reduced investment in employee development.",
            question: "What are the current trends affecting aviation maintenance quality?",
            used: false
        }
    },
    "SAFETY CULTURE": {
        100: {
            answer: "Safety should always be on the forefront of your mind, and safety ethics should be enforced to the extent that they become part of company culture.",
            question: "What is the fundamental principle of aviation safety culture?",
            used: false
        },
        200: {
            answer: "Personal injury, proximity to serious accidents, influence of powerful role models, early career mentoring, or genuine love for aviation and recognition of responsibilities.",
            question: "What experiences lead to strong commitment to safety?",
            used: false
        },
        300: {
            answer: "People working midnights affects safety because fatigue leads to poor decision-making, increased mistakes, and reduced alertness during critical maintenance tasks.",
            question: "How do work schedules like midnight shifts impact aviation safety?",
            used: false
        },
        400: {
            answer: "It creates a system where mechanics feel pressure to rush work, compromise quality, and focus on paperwork completion rather than thorough maintenance.",
            question: "How does the current aviation business model affect maintenance ethics?",
            used: false
        },
        500: {
            answer: "A code of ethics provides opportunity for Level-1 decision-makers to move toward Level-2 decision-making, but requires consistent behavior modeling by management for effectiveness.",
            question: "What is the fundamental purpose and limitation of professional codes of ethics?",
            used: false
        }
    }
};

// Game State
let gameState = {
    players: [],
    currentPlayer: 0,
    questionSelector: 0,
    questionsAnswered: 0,
    totalQuestions: 25,
    numPlayers: 4,
    setupStep: 0,
    currentQuestion: null,
    currentCategory: null,
    currentAmount: 0,
    finalJeopardyPlayer: 0,
    usingCustomQuestions: false,
    creatorStep: 0,
    creatorCategory: 1,
    creatorAmount: 100,
    currentGameData: null,
    currentGameTitle: 'Aerospace Ethics Jeopardy',
    selectedSavedGame: null,
    isEditing: false,
    editingGameId: null
};

// Custom Questions Storage
let customQuestions = {
    title: '',
    description: '',
    categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'],
    questions: {
        1: { 100: null, 200: null, 300: null, 400: null, 500: null },
        2: { 100: null, 200: null, 300: null, 400: null, 500: null },
        3: { 100: null, 200: null, 300: null, 400: null, 500: null },
        4: { 100: null, 200: null, 300: null, 400: null, 500: null },
        5: { 100: null, 200: null, 300: null, 400: null, 500: null }
    },
    finalJeopardy: {
        category: 'Final Category',
        answer: 'Final answer goes here',
        question: 'What is the final question?'
    },
    dateCreated: new Date().toISOString()
};

const playerColors = [
    '#FF6464', '#64FF64', '#6464FF', '#FFFF64', '#FF64FF'
];

// Audio Management with Web Audio API
class AudioManager {
    constructor() {
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.volume = 0.5;
        this.audioContext = null;
        this.isInitialized = false;
        
        this.setupControls();
        
        // Show audio info message
        console.log('🎵 Audio System Info:');
        console.log('• All sounds are generated using Web Audio API (no MP3 files needed)');
        console.log('• Sounds include: theme music, correct/incorrect chimes, question select beeps');
        console.log('• Audio works entirely in the browser using synthesized tones');
        console.log('• No external files or links required - everything is code-generated!');
    }
    
    async initializeAudio() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            console.log('🔊 Audio initialized successfully! Sounds are generated using Web Audio API.');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    setupControls() {
        const musicToggle = document.getElementById('music-toggle');
        const sfxToggle = document.getElementById('sfx-toggle');
        const volumeSlider = document.getElementById('volume-slider');
        
        musicToggle.addEventListener('click', () => this.toggleMusic());
        sfxToggle.addEventListener('click', () => this.toggleSFX());
        volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        const btn = document.getElementById('music-toggle');
        
        if (this.musicEnabled) {
            btn.classList.remove('muted');
            btn.textContent = '🎵 Music';
        } else {
            btn.classList.add('muted');
            btn.textContent = '🔇 Music';
        }
    }
    
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        const btn = document.getElementById('sfx-toggle');
        
        if (this.sfxEnabled) {
            btn.classList.remove('muted');
            btn.textContent = '🔊 SFX';
        } else {
            btn.classList.add('muted');
            btn.textContent = '🔇 SFX';
        }
    }
    
    setVolume(volume) {
        this.volume = volume;
    }
    
    playTone(frequency, duration, type = 'sine') {
        if (!this.sfxEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Could not play tone:', error);
        }
    }
    
    playChord(frequencies, duration) {
        if (!this.sfxEnabled || !this.audioContext) return;
        
        frequencies.forEach(freq => {
            this.playTone(freq, duration);
        });
    }
    
    async playThemeMusic() {
        if (!this.musicEnabled) return;
        await this.initializeAudio();
        
        const playMelody = () => {
            if (!this.musicEnabled || !this.audioContext) return;
            
            const notes = [261.63, 293.66, 329.63, 349.23, 392.00];
            notes.forEach((note, index) => {
                setTimeout(() => {
                    this.playTone(note, 0.5);
                }, index * 600);
            });
            
            setTimeout(playMelody, 4000);
        };
        
        playMelody();
    }
    
    stopMusic() {
        // For our simple system, we just disable music
    }
    
    async playQuestionSelect() {
        await this.initializeAudio();
        this.playTone(800, 0.1);
    }
    
    async playCorrect() {
        await this.initializeAudio();
        this.playChord([261.63, 329.63, 392.00], 0.5);
    }
    
    async playIncorrect() {
        await this.initializeAudio();
        setTimeout(() => this.playTone(200, 0.3, 'square'), 0);
        setTimeout(() => this.playTone(150, 0.3, 'square'), 100);
        setTimeout(() => this.playTone(100, 0.5, 'square'), 200);
    }
    
    async playFinalJeopardy() {
        await this.initializeAudio();
        if (!this.musicEnabled) return;
        
        const playDramaticMusic = () => {
            if (!this.musicEnabled || !this.audioContext) return;
            
            const pattern = [220, 220, 220, 196, 220, 220, 220, 196];
            pattern.forEach((note, index) => {
                setTimeout(() => {
                    this.playTone(note, 0.4);
                }, index * 500);
            });
            
            setTimeout(playDramaticMusic, 4500);
        };
        
        playDramaticMusic();
    }
    
    async playBuzzer() {
        await this.initializeAudio();
        this.playTone(150, 0.8, 'square');
    }
    
    async playApplause() {
        await this.initializeAudio();
        const celebration = [523.25, 659.25, 783.99, 1046.50];
        celebration.forEach((note, index) => {
            setTimeout(() => {
                this.playTone(note, 0.3);
            }, index * 150);
        });
    }
}

// Safe Storage System (works in sandboxed environments)
class SafeStorage {
    constructor() {
        this.canUseLocalStorage = this.testLocalStorage();
        this.memoryStorage = new Map();
        
        if (this.canUseLocalStorage) {
            this.loadFromLocalStorage();
        }
    }
    
    testLocalStorage() {
        try {
            const test = 'localStorage-test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.log('localStorage not available, using memory storage');
            return false;
        }
    }
    
    loadFromLocalStorage() {
        try {
            const storedGames = localStorage.getItem('jeopardy-saved-games');
            if (storedGames) {
                const games = JSON.parse(storedGames);
                games.forEach((game, index) => {
                    this.memoryStorage.set(`game-${index}`, game);
                });
            }
        } catch (e) {
            console.log('Error loading from localStorage:', e);
        }
    }
    
    saveGame(game) {
        const gameId = `game-${Date.now()}`;
        this.memoryStorage.set(gameId, game);
        
        if (this.canUseLocalStorage) {
            try {
                const allGames = this.getAllGames();
                localStorage.setItem('jeopardy-saved-games', JSON.stringify(allGames));
            } catch (e) {
                console.log('Error saving to localStorage:', e);
            }
        }
        
        return gameId;
    }
    
    getAllGames() {
        return Array.from(this.memoryStorage.values());
    }
    
    getGame(gameId) {
        return this.memoryStorage.get(gameId);
    }
    
    deleteGame(gameId) {
        this.memoryStorage.delete(gameId);
        
        if (this.canUseLocalStorage) {
            try {
                const allGames = this.getAllGames();
                localStorage.setItem('jeopardy-saved-games', JSON.stringify(allGames));
            } catch (e) {
                console.log('Error updating localStorage:', e);
            }
        }
    }
    
    clear() {
        this.memoryStorage.clear();
        
        if (this.canUseLocalStorage) {
            try {
                localStorage.removeItem('jeopardy-saved-games');
            } catch (e) {
                console.log('Error clearing localStorage:', e);
            }
        }
    }
}

// Initialize storage system
let gameStorage = new SafeStorage();

// Question Creator Functions - Define these BEFORE event listeners
function saveCategories() {
    console.log('saveCategories function called');
    // Save category names
    for (let i = 1; i <= 5; i++) {
        const categoryInput = document.getElementById(`category-${i}-input`);
        const categoryName = categoryInput.value.trim() || `Category ${i}`;
        customQuestions.categories[i - 1] = categoryName;
    }
    
    // Hide category setup, show question creation
    document.getElementById('category-setup-section').classList.add('hidden');
    document.getElementById('question-creation-section').classList.remove('hidden');
    document.getElementById('save-game-section').classList.remove('hidden');
    
    // Update progress display with new category names
    updateProgressDisplay();
    
    // Small delay to ensure DOM elements are rendered before calling updateCreatorDisplay
    setTimeout(() => {
        updateCreatorDisplay();
    }, 50);
}

function editCategories() {
    console.log('editCategories function called');
    // Show category setup again
    document.getElementById('category-setup-section').classList.remove('hidden');
    document.getElementById('question-creation-section').classList.add('hidden');
    
    // Pre-populate with current category names
    for (let i = 1; i <= 5; i++) {
        const categoryInput = document.getElementById(`category-${i}-input`);
        categoryInput.value = customQuestions.categories[i - 1];
    }
}

function initializeCreator(isEditing = false) {
    gameState.creatorStep = 0;
    gameState.creatorCategory = 1;
    gameState.creatorAmount = 100;
    
    if (isEditing) {
        // Pre-populate category inputs
        for (let i = 1; i <= 5; i++) {
            const categoryInput = document.getElementById(`category-${i}-input`);
            categoryInput.value = customQuestions.categories[i - 1] || `Category ${i}`;
        }
        
        // Show category section for editing
        document.getElementById('category-setup-section').classList.remove('hidden');
        document.getElementById('question-creation-section').classList.add('hidden');
        document.getElementById('save-game-section').classList.add('hidden');
        
        // Update title for editing mode
        document.querySelector('#creator-screen .title').textContent = 'EDIT CUSTOM GAME';
        document.querySelector('#creator-screen .subtitle').textContent = `Editing: ${customQuestions.title}`;
    } else {
        // Reset for new game
        resetCustomQuestions();
        
        // Show category setup first
        document.getElementById('category-setup-section').classList.remove('hidden');
        document.getElementById('question-creation-section').classList.add('hidden');
        document.getElementById('save-game-section').classList.add('hidden');
        
        // Reset title
        document.querySelector('#creator-screen .title').textContent = 'CREATE CUSTOM QUESTIONS';
        document.querySelector('#creator-screen .subtitle').textContent = 'Build your own Jeopardy game!';
        
        // Reset category inputs
        for (let i = 1; i <= 5; i++) {
            const categoryInput = document.getElementById(`category-${i}-input`);
            categoryInput.value = `Category ${i}`;
        }
    }
}

function resetCreatorState() {
    gameState.isEditing = false;
    gameState.editingGameId = null;
    gameState.creatorStep = 0;
    gameState.creatorCategory = 1;
    gameState.creatorAmount = 100;
}

function resetCustomQuestions() {
    customQuestions = {
        title: '',
        description: '',
        categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'],
        questions: {
            1: { 100: null, 200: null, 300: null, 400: null, 500: null },
            2: { 100: null, 200: null, 300: null, 400: null, 500: null },
            3: { 100: null, 200: null, 300: null, 400: null, 500: null },
            4: { 100: null, 200: null, 300: null, 400: null, 500: null },
            5: { 100: null, 200: null, 300: null, 400: null, 500: null }
        },
        finalJeopardy: {
            category: 'Final Category',
            answer: 'Final answer goes here',
            question: 'What is the final question?'
        },
        dateCreated: new Date().toISOString()
    };
}

function updateCreatorDisplay() {
    const stepNumber = gameState.creatorStep + 1;
    const categoryName = customQuestions.categories[gameState.creatorCategory - 1];
    
    document.getElementById('question-counter').textContent = stepNumber;
    document.getElementById('current-category-display').textContent = categoryName;
    document.getElementById('current-amount-display').textContent = gameState.creatorAmount;
    
    // Check if elements exist before trying to set values
    const answerInput = document.getElementById('answer-input');
    const questionInput = document.getElementById('question-input');
    
    if (answerInput && questionInput) {
        // Clear inputs first
        answerInput.value = '';
        questionInput.value = '';
        
        // Always check if question exists (for any step, including step 0)
        const existingQuestion = customQuestions.questions[gameState.creatorCategory][gameState.creatorAmount];
        if (existingQuestion) {
            answerInput.value = existingQuestion.answer || '';
            questionInput.value = existingQuestion.question || '';
        }
        
        // Focus on first input
        answerInput.focus();
    }
    
    // Update progress display
    updateProgressDisplay();
    
    // Update previous button visibility and state
    const prevBtn = document.getElementById('previous-question-btn');
    if (prevBtn) {
        if (gameState.creatorStep === 0) {
            // Hide button on first question
            prevBtn.style.display = 'none';
        } else {
            // Show and enable button for questions 2+
            prevBtn.style.display = 'inline-block';
            prevBtn.disabled = false;
            prevBtn.style.opacity = '1';
        }
    }
}

function previousQuestion() {
    console.log('previousQuestion function called');
    if (gameState.creatorStep === 0) return;
    
    // Save current question before going back (only if both fields have content)
    saveCurrentQuestionSilently();
    
    // Move to previous question
    gameState.creatorStep--;
    
    // Move to previous amount
    if (gameState.creatorAmount > 100) {
        gameState.creatorAmount -= 100;
    } else {
        // Move to previous category
        gameState.creatorAmount = 500;
        gameState.creatorCategory--;
    }
    
    updateCreatorDisplay();
}

function saveCurrentQuestionSilently() {
    const answerInput = document.getElementById('answer-input');
    const questionInput = document.getElementById('question-input');
    
    if (answerInput && questionInput) {
        const answer = answerInput.value.trim();
        const question = questionInput.value.trim();
        
        // Only save if both fields have content
        if (answer && question) {
            customQuestions.questions[gameState.creatorCategory][gameState.creatorAmount] = {
                answer: answer,
                question: question,
                used: false
            };
        }
    }
}

function updateProgressDisplay() {
    for (let cat = 1; cat <= 5; cat++) {
        let completed = 0;
        for (let amount of [100, 200, 300, 400, 500]) {
            if (customQuestions.questions[cat][amount]) {
                completed++;
            }
        }
        
        // Update progress count
        document.getElementById(`progress-cat${cat}`).textContent = `${completed}/5`;
        
        // Update category name in progress
        const progressCatName = document.getElementById(`progress-cat${cat}-name`);
        if (progressCatName) {
            const shortName = customQuestions.categories[cat - 1].length > 8 
                ? customQuestions.categories[cat - 1].substring(0, 8) + '...'
                : customQuestions.categories[cat - 1];
            progressCatName.textContent = shortName;
        }
    }
}

function saveCurrentQuestion() {
    const answerInput = document.getElementById('answer-input');
    const questionInput = document.getElementById('question-input');
    
    if (!answerInput || !questionInput) {
        alert('Error: Form elements not found!');
        return;
    }
    
    const answer = answerInput.value.trim();
    const question = questionInput.value.trim();
    
    if (!answer || !question) {
        alert('Please fill in both the answer and question fields!');
        return;
    }
    
    // Save the current question (including the first one)
    customQuestions.questions[gameState.creatorCategory][gameState.creatorAmount] = {
        answer: answer,
        question: question,
        used: false
    };
    
    // Move to next question
    nextCreatorStep();
}

function nextCreatorStep() {
    gameState.creatorStep++;
    
    // Move to next amount
    if (gameState.creatorAmount < 500) {
        gameState.creatorAmount += 100;
    } else {
        // Move to next category
        gameState.creatorAmount = 100;
        gameState.creatorCategory++;
    }
    
    // Check if we're done
    if (gameState.creatorStep >= 25) {
        if (gameState.isEditing) {
            alert('Game updated! You can now save your changes.');
        } else {
            alert('All questions created! You can now save your game and play it.');
        }
        // Show finish button
        const finishBtn = document.getElementById('finish-creating-btn');
        if (finishBtn) {
            finishBtn.classList.remove('hidden');
        }
    } else {
        // Small delay to ensure any DOM changes are completed
        setTimeout(() => {
            updateCreatorDisplay();
        }, 10);
    }
}