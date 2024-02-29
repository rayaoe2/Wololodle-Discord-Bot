const { Client, IntentsBitField, Partials } = require("discord.js");
require("dotenv").config();

let civList;

// Function to load civList
const loadCivList = () => {
  return new Promise((resolve, reject) => {
    try {
      civList = require("./civ-list.js");
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
  ],
  partials: [Partials.Channel],
});

let currentCiv,
  unformattedCiv,
  wrongGuessCount = 0,
  maxGuesses = 5;
let clueDisplays = [];
let initialized = false;
let clues = [];
let gameMessage = null;
let gameOverFlag = false;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Handle the error, or just log it
});

client.once("ready", async () => {
  if (!initialized) {
    console.log(`Logged in as ${client.user.tag}`);
    await loadCivList();
    initialized = true;
  }
});

client.on("messageCreate", (message) => {
  // Check if the message is from a DM or the allowed channel
  if (
    message.guildId === null ||
    message.channel.id === "1212331125465419820"
  ) {
    // Ignore Bot Messages
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // If game has never been started
    if (!gameMessage && command !== "!n") {
      message.channel.send(
        "Wololodle not running. Start a new game with **!n**"
      );
      return;
    }

    if (command === "!n") {
      startNewGame(message);
      gameOverFlag = false; // Reset the game over flag
    } else {
      // Treat the message content as a guess
      const guess = message.content.toLowerCase();
      handleGuess(message, guess);
    }
  } else {
    // Ignore messages from channels other than DMs and the allowed channel
    return;
  }
});

const startNewGame = async (message) => {
  wrongGuessCount = 0;
  //const randomIndex = Math.floor(Math.random() * civList.length);
  const randomIndex = Math.floor(Math.random() * 3) + 1;

  //const randomIndex = 1; // For testing, replace with random index calculation
  const { civilization } = civList[randomIndex];
  unformattedCiv = civilization; // Set civilization globally
  const [cluesArray] = civList[randomIndex].clues;
  clues = cluesArray; // Set clues globally
  currentCiv = civilization.toLowerCase();

  let guessMessage = `Guess the civilization!\nYou have ${
    maxGuesses - wrongGuessCount
  } guesses remaining. Clues:`;
  clueDisplays = shuffleArray(clues.clue1).slice(0, 5);
  const cluesMessage = clueDisplays.map((clue) => `• ${clue}`).join("\n");
  guessMessage += `\n${cluesMessage}`;
  gameMessage = await message.channel.send(guessMessage);
};

const handleGuess = async (message, guess) => {
  //   console.log("Handling guess:", guess);
  if (gameOverFlag) {
    // If the game is over, reply with the message and return
    message.channel.send("Wololodle not running. Start a new game with **!n**");
    return;
  }

  if (guess === currentCiv) {
    gameOver(message, true);
  } else {
    wrongGuessCount++; // Increment wrong guess count
    const remainingGuesses = maxGuesses - wrongGuessCount;
    let hintMessage = "";
    if (remainingGuesses > 0) {
      // Display clues based on wrongGuessCount
      switch (wrongGuessCount) {
        case 1:
          const shuffledClues1 = shuffleArray(clues.clue2).slice(0, 2);
          hintMessage += `\n• ${shuffledClues1[0]}\n• ${shuffledClues1[1]}`;
          break;
        case 2:
          const { civbonus, civuniquetech } = clues.clue3[0];
          const randomCivBonus = shuffleArray(civbonus)[0];
          const randomUniqueTech = shuffleArray(civuniquetech)[0];
          hintMessage += `\n• Civ Bonus: ${randomCivBonus}`;
          hintMessage += `\n• UT: ${randomUniqueTech}`;
          break;
        case 3:
          const randomClue4 = shuffleArray(clues.clue4)[0];
          hintMessage += `\n• Team Bonus: ${randomClue4}`;
          break;
        case 4:
          const randomClue5 = shuffleArray(clues.clue5)[0];
          hintMessage += `\n• UU: ${randomClue5}`;
          break;
        default:
          break;
      }
    } else {
      gameOver(message, false);
    }

    // Get the current message content
    let updatedMessageContent = gameMessage.content;

    // Replace the existing guess count with the updated one
    updatedMessageContent = updatedMessageContent.replace(
      /You have \d+ guesses? remaining\./,
      `You have ${remainingGuesses} guess${
        remainingGuesses !== 1 ? "es" : ""
      } remaining.`
    );

    // Add the new hints
    updatedMessageContent += `${hintMessage}`;

    // Edit the game message to update the content
    await gameMessage.edit(updatedMessageContent);
  }
};

const gameOver = (message, isVictory) => {
  //if isVictory, update user highscore

  // Set the game over flag
  gameOverFlag = true;

  const guessCountText = wrongGuessCount === 0 ? "guess" : "guesses";
  const modalText = isVictory
    ? `Congrats! It was **${unformattedCiv}**! You solved Wololodle in **${
        wrongGuessCount + 1
      }** ${guessCountText}!`
    : `You've used all your guesses. The correct civilization was **${unformattedCiv}**.`;
  message.channel.send(`\n${modalText} **!n** to start a new game`);
};

const shuffleArray = (array) => {
  // FIX SHUFFLE BY THE SAME SEED IF PUZZLE IS DAILY
  const shuffled = array.slice(); // Create a shallow copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled;
};

loadCivList()
  .then(() => {
    client.login(process.env.DISCORD_BOT_KEY);
  })
  .catch((error) => {
    console.error("Failed to load civList:", error);
  });
