'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  highScore: number;
  gameOver: boolean;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  jumping: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

export function NeonRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    gameOver: false,
  });

  const playerRef = useRef<Player>({
    x: 50,
    y: 200,
    width: 30,
    height: 40,
    velocityY: 0,
    jumping: false,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const gameSpeedRef = useRef(5);
  const groundY = 280;
  const gravity = 0.8;
  const jumpStrength = -15;

  const initGame = useCallback(() => {
    playerRef.current = {
      x: 50,
      y: groundY - 40,
      width: 30,
      height: 40,
      velocityY: 0,
      jumping: false,
    };
    obstaclesRef.current = [];
    gameSpeedRef.current = 5;
  }, []);

  const handleJump = useCallback(() => {
    const player = playerRef.current;
    if (!player.jumping && gameState.isPlaying && !gameState.isPaused) {
      player.velocityY = jumpStrength;
      player.jumping = true;
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const checkCollision = (player: Player, obstacle: Obstacle): boolean => {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    for (let i = 0; i < canvas.width; i += 40) {
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 - (i / canvas.width) * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i, groundY);
      ctx.lineTo(i - 10, groundY + 10);
      ctx.stroke();
    }

    const player = playerRef.current;
    
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      player.velocityY += gravity;
      player.y += player.velocityY;

      if (player.y >= groundY - player.height) {
        player.y = groundY - player.height;
        player.velocityY = 0;
        player.jumping = false;
      }

      if (Math.random() < 0.015 + (gameSpeedRef.current - 5) * 0.002) {
        const obstacleHeight = 30 + Math.random() * 40;
        obstaclesRef.current.push({
          x: canvas.width,
          y: groundY - obstacleHeight,
          width: 20 + Math.random() * 20,
          height: obstacleHeight,
          passed: false,
        });
      }

      obstaclesRef.current = obstaclesRef.current.filter(obstacle => {
        obstacle.x -= gameSpeedRef.current;
        
        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
          obstacle.passed = true;
          setGameState(prev => ({
            ...prev,
            score: prev.score + 1,
          }));
          
          if ((gameState.score + 1) % 10 === 0) {
            gameSpeedRef.current += 0.5;
          }
        }

        if (checkCollision(player, obstacle)) {
          setGameState(prev => ({
            ...prev,
            gameOver: true,
            highScore: Math.max(prev.score, prev.highScore),
          }));
        }

        return obstacle.x > -50;
      });
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 - i * 0.1})`;
      ctx.strokeRect(
        player.x - i * 2,
        player.y - i * 2,
        player.width + i * 4,
        player.height + i * 4
      );
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    obstaclesRef.current.forEach(obstacle => {
      const obstacleGradient = ctx.createLinearGradient(
        obstacle.x,
        obstacle.y,
        obstacle.x,
        obstacle.y + obstacle.height
      );
      obstacleGradient.addColorStop(0, '#ff00ff');
      obstacleGradient.addColorStop(1, '#8b008b');
      ctx.fillStyle = obstacleGradient;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = Math.min(container.clientWidth, 800);
        canvas.height = 320;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    if (gameState.isPlaying && !gameState.isPaused) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameLoop]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleJump();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [handleJump]);

  const startGame = () => {
    initGame();
    setGameState({
      isPlaying: true,
      isPaused: false,
      score: 0,
      highScore: gameState.highScore,
      gameOver: false,
    });
  };

  const togglePause = () => {
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  };

  const resetGame = () => {
    initGame();
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      score: 0,
      gameOver: false,
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <div className="text-cyan-400">
              <span className="text-sm opacity-70">Score: </span>
              <span className="text-xl font-bold">{gameState.score}</span>
            </div>
            <div className="text-purple-400">
              <span className="text-sm opacity-70">High: </span>
              <span className="text-xl font-bold">{gameState.highScore}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!gameState.isPlaying ? (
              <Button
                onClick={startGame}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600 text-black"
              >
                <Play className="w-4 h-4 mr-1" />
                Play
              </Button>
            ) : (
              <>
                <Button
                  onClick={togglePause}
                  size="sm"
                  variant="outline"
                  className="border-cyan-500 text-cyan-400"
                >
                  {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={resetGame}
                  size="sm"
                  variant="outline"
                  className="border-purple-500 text-purple-400"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full bg-gray-900 rounded cursor-pointer"
            onClick={handleJump}
          />
          
          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded">
              <h3 className="text-2xl font-bold text-cyan-400 mb-2">Neon Runner</h3>
              <p className="text-gray-400 mb-4">Tap or press Space to jump</p>
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                Start Game
              </Button>
            </div>
          )}
          
          {gameState.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded">
              <h3 className="text-2xl font-bold text-red-400 mb-2">Game Over!</h3>
              <p className="text-cyan-400 text-xl mb-4">Score: {gameState.score}</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="text-purple-400 mb-4">New High Score!</p>
              )}
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                Play Again
              </Button>
            </div>
          )}
          
          {gameState.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
              <p className="text-2xl font-bold text-cyan-400">PAUSED</p>
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-2">
          {typeof window !== 'undefined' && 'ontouchstart' in window 
            ? 'Tap to jump' 
            : 'Press Space to jump'}
        </p>
      </div>
    </div>
  );
}