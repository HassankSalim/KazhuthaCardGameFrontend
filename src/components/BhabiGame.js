import React, { useState, useEffect, useCallback } from 'react';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'kazhutha-card-game-server.onrender.com';
const BACKEND_URL = `https://${SERVER_URL}`;

const BhabiGame = () => {
  const [gameState, setGameState] = useState('lobby'); // lobby, joining, playing
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [gameData, setGameData] = useState(null);
  const [ws, setWs] = useState(null);

  const connectWebSocket = useCallback(() => {
    if (gameId && playerName) {
      const wsUrl = `wss://${SERVER_URL}/ws/${gameId}/${playerName}`;
      const websocket = new WebSocket(wsUrl);
  
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data); // Debug log
        
        switch(data.type) {
            case 'ping':
              websocket.send('pong');
              break;
              
            case 'player_joined':
            case 'game_started':
            case 'game_update':
            case 'card_played':
            case 'game_state':
              console.log('Updating game state:', data.game_state); // Debug log
              setGameData(data.game_state);
              if (data.type === 'game_started') {
                setGameState('playing');
              }
              break;
              
            case 'player_disconnected':
              setGameData(data.game_state);
              setErrorMessage(`Player ${data.player_name} disconnected`);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
        }
      };
  
      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };
  
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // You might want to show an error message to the user
        setErrorMessage('Connection error. Attempting to reconnect...');
      };
  
      setWs(websocket);
    }
  }, [gameId, playerName]);
  
  // Clean up function
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);
  
  // Add a reconnection check
  useEffect(() => {
    if (ws?.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
  }, [ws, connectWebSocket]);

  const createGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player_name: playerName }),
      });
      const data = await response.json();
      setGameId(data.game_id);
      setGameState('lobby');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to create game');
    }
  };

  const joinGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/game/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_id: gameId, player_name: playerName }),
      });
      const data = await response.json();
      if (data.success) {
        setGameState('lobby');
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to join game');
      }
    } catch (error) {
      setErrorMessage('Failed to join game');
    }
  };

  const startGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_id: gameId, player_name: playerName }),
      });
      const data = await response.json();
      if (data.success) {
        setGameState('playing');
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to start game');
      }
    } catch (error) {
      setErrorMessage('Failed to start game');
    }
  };

  const playCard = async (card) => {
    try {
      const response = await fetch(`${BACKEND_URL}/game/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_id: gameId,
          player_name: playerName,
          card: card,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local game state immediately with the response
        setGameData(data.game_state);
      } else {
        setErrorMessage('Invalid move');
      }
    } catch (error) {
      console.error('Error playing card:', error);
      setErrorMessage('Failed to play card');
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
      {gameState === 'lobby' && !gameId && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome to Kazhutha</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <div className="flex space-x-4">
            <button
              onClick={createGame}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Game
            </button>
            <button
              onClick={() => setGameState('joining')}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Join Game
            </button>
          </div>
        </div>
      )}

      {gameState === 'joining' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Join Game</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <input
            type="text"
            placeholder="Enter game code"
            value={gameId}
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
            className="w-full p-2 border rounded mb-4"
          />
          <button
            onClick={joinGame}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Join
          </button>
        </div>
      )}

      {gameState === 'lobby' && gameId && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Game Lobby: {gameId}</h2>
          <div className="mb-4">
            <h3 className="font-bold">Players:</h3>
            {gameData?.players.map((player) => (
              <div key={player.name} className="ml-4">
                {player.name} {player.is_host ? '(Host)' : ''}
              </div>
            ))}
          </div>
          {gameData?.players.find((p) => p.name === playerName)?.is_host && (
            <button
              onClick={startGame}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {gameState === 'playing' && gameData && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Current Game</h2>
          <div className="mb-4">
            <div>Current Player: {gameData.current_player}</div>
            <div>Current Suit: {gameData.current_suit || 'None'}</div>
          </div>
          
          {/* Display current pile */}
          <div className="mb-4">
            <h3 className="font-bold">Current Pile:</h3>
            <div className="flex flex-wrap gap-2">
              {gameData.current_pile?.map((play, index) => (
                <div
                  key={index}
                  className="p-2 border rounded bg-gray-50"
                >
                  {play.player}: {play.card.rank} of {play.card.suit}
                </div>
              ))}
            </div>
          </div>

          {/* Display player's hand */}
          <div>
            <h3 className="font-bold mb-2">Your Hand:</h3>
            <div className="flex flex-wrap gap-2">
              {gameData.your_hand?.map((card, index) => (
                <button
                  key={index}
                  onClick={() => playCard(card)}
                  disabled={gameData.current_player !== playerName}
                  className={`p-2 border rounded ${
                    gameData.current_player === playerName
                      ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                      : 'bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  {card.rank} of {card.suit}
                </button>
              ))}
            </div>
          </div>

          {/* Display players and their card counts */}
          <div className="mt-4">
            <h3 className="font-bold mb-2">Players:</h3>
            {gameData.players.map((player) => (
              <div key={player.name} className={`p-2 ${player.name === gameData.current_player ? 'bg-yellow-50' : ''}`}>
                {player.name}: {player.card_count} cards
                {player.name === gameData.current_player && ' (Current Player)'}
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-100 text-red-700">{errorMessage}</div>
      )}
    </div>
  );
};

export default BhabiGame;