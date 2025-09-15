'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  highScore: number;
  gameOver: boolean;
  wave: number;
  lives: number;
}

interface Player {
  x: number;
  y: number;
  angle: number;
}

interface Enemy {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  health: number;
  type: 'basic' | 'fast' | 'heavy';
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  damage?: number;
  pierce?: boolean;
  color?: string;
  hasRicocheted?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'rapid' | 'triple' | 'laser' | 'shield' | 'bomb';
  lifetime: number;
  color: string;
  pulse: number;
}

interface WeaponState {
  type: 'default' | 'rapid' | 'triple' | 'laser';
  duration: number;
  fireRate: number;
  damage: number;
}

interface CyberDefenseProps {
  isGenerating?: boolean;
  startTime?: number;
}

export function CyberDefense({ isGenerating = false, startTime = Date.now() }: CyberDefenseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    gameOver: false,
    wave: 1,
    lives: 3,
  });
  const [isMobileView, setIsMobileView] = useState(false);

  const playerRef = useRef<Player>({
    x: 400,
    y: 300,
    angle: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const mouseRef = useRef({ x: 400, y: 300 });
  const shootingRef = useRef(false);
  const shootCooldownRef = useRef(0);
  const waveTimerRef = useRef(0);
  const weaponRef = useRef<WeaponState>({
    type: 'default',
    duration: 0,
    fireRate: 8,
    damage: 1,
  });
  const shieldRef = useRef(0);
  const powerUpTimerRef = useRef(0);

  // Detect mobile viewport for optimizations
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update elapsed time for progress tracking
  useEffect(() => {
    if (!isGenerating) {
      setElapsedTime(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime]);

  // Get progress message based on elapsed time
  const getProgressMessage = () => {
    if (!isGenerating) return "Ready to generate your epic card";
    if (elapsedTime < 20) return "Initializing neural network...";
    if (elapsedTime < 40) return "Processing style parameters...";
    if (elapsedTime < 60) return "Generating card artwork...";
    if (elapsedTime < 80) return "Finalizing details...";
    return "Almost there...";
  };

  // Calculate progress percentage (0-100) - 90 seconds total
  const progressPercentage = isGenerating ? Math.min((elapsedTime / 90) * 100, 100) : 0;

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      playerRef.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        angle: 0,
      };
    }
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    shootCooldownRef.current = 0;
    waveTimerRef.current = 0;
    powerUpTimerRef.current = 0;
    weaponRef.current = {
      type: 'default',
      duration: 0,
      fireRate: 8,
      damage: 1,
    };
    shieldRef.current = 0;
  }, []);

  const createEnemy = useCallback((wave: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    
    switch(side) {
      case 0: x = Math.random() * canvas.width; y = -30; break;
      case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
      case 3: x = -30; y = Math.random() * canvas.height; break;
    }

    const types: Array<'basic' | 'fast' | 'heavy'> = ['basic', 'basic', 'fast'];
    if (wave > 3) types.push('heavy');
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    let enemy: Enemy = {
      x,
      y,
      size: type === 'heavy' ? 25 : type === 'fast' ? 12 : 18,
      speed: type === 'fast' ? 3 : type === 'heavy' ? 0.8 : 1.5,
      angle: 0,
      health: type === 'heavy' ? 3 : 1,
      type,
      color: type === 'heavy' ? '#ff00ff' : type === 'fast' ? '#ffff00' : '#ff00ff',
    };

    enemiesRef.current.push(enemy);
  }, []);

  const shoot = useCallback(() => {
    if (shootCooldownRef.current > 0) return;
    
    const player = playerRef.current;
    const weapon = weaponRef.current;
    const speed = weapon.type === 'laser' ? 20 : 12;
    
    if (weapon.type === 'triple') {
      for (let i = -1; i <= 1; i++) {
        const angle = player.angle + (i * 0.2);
        const bullet: Bullet = {
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          lifetime: 60,
          damage: weapon.damage,
          color: '#00ffff',
        };
        bulletsRef.current.push(bullet);
      }
    } else if (weapon.type === 'laser') {
      const bullet: Bullet = {
        x: player.x,
        y: player.y,
        vx: Math.cos(player.angle) * speed,
        vy: Math.sin(player.angle) * speed,
        lifetime: 80,
        damage: weapon.damage,
        pierce: true,
        color: '#ff00ff',
      };
      bulletsRef.current.push(bullet);
    } else {
      const bullet: Bullet = {
        x: player.x,
        y: player.y,
        vx: Math.cos(player.angle) * speed,
        vy: Math.sin(player.angle) * speed,
        lifetime: 60,
        damage: weapon.damage,
        color: weapon.type === 'rapid' ? '#ffff00' : '#00ffff',
      };
      bulletsRef.current.push(bullet);
    }
    
    shootCooldownRef.current = weapon.fireRate;
  }, []);

  const createPowerUp = useCallback((x: number, y: number) => {
    const types: Array<PowerUp['type']> = ['rapid', 'triple', 'laser', 'shield', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const colors = {
      rapid: '#ffff00',
      triple: '#00ff00',
      laser: '#ff00ff',
      shield: '#00ffff',
      bomb: '#ff0000',
    };
    
    powerUpsRef.current.push({
      x,
      y,
      type,
      lifetime: 600,
      color: colors[type],
      pulse: 0,
    });
  }, []);

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 10,
        color,
      });
    }
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid background
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    const player = playerRef.current;
    
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      // Update player angle to face mouse
      const dx = mouseRef.current.x - player.x;
      const dy = mouseRef.current.y - player.y;
      player.angle = Math.atan2(dy, dx);

      // Shooting
      if (shootingRef.current) {
        shoot();
      }
      if (shootCooldownRef.current > 0) {
        shootCooldownRef.current--;
      }

      // Wave spawning - faster waves
      waveTimerRef.current++;
      const spawnRate = Math.max(20, 80 - gameState.wave * 8);
      if (waveTimerRef.current % spawnRate === 0) {
        createEnemy(gameState.wave);
        // More enemies per spawn at higher waves
        if (gameState.wave > 5 && Math.random() < 0.3) {
          createEnemy(gameState.wave);
        }
      }
      
      // Power-up spawning
      powerUpTimerRef.current++;
      if (powerUpTimerRef.current % 300 === 0 && Math.random() < 0.5) {
        const canvas = canvasRef.current;
        if (canvas) {
          createPowerUp(
            50 + Math.random() * (canvas.width - 100),
            50 + Math.random() * (canvas.height - 100)
          );
        }
      }
      
      // Update weapon duration
      if (weaponRef.current.duration > 0) {
        weaponRef.current.duration--;
        if (weaponRef.current.duration === 0) {
          weaponRef.current = {
            type: 'default',
            duration: 0,
            fireRate: 8,
            damage: 1,
          };
        }
      }
      
      // Update shield
      if (shieldRef.current > 0) {
        shieldRef.current--;
      }

      // Update bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.lifetime--;
        
        return bullet.lifetime > 0 && 
               bullet.x > -10 && bullet.x < canvas.width + 10 &&
               bullet.y > -10 && bullet.y < canvas.height + 10;
      });

      // Update enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        enemy.angle = Math.atan2(dy, dx);
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;

        // Check collision with player
        if (dist < enemy.size + 15) {
          if (shieldRef.current > 0) {
            // Shield blocks damage
            createExplosion(enemy.x, enemy.y, '#00ffff');
            shieldRef.current = 0;
          } else {
            createExplosion(enemy.x, enemy.y, enemy.color);
            setGameState(prev => {
              const newLives = prev.lives - 1;
              if (newLives <= 0) {
                return {
                  ...prev,
                  lives: 0,
                  gameOver: true,
                  highScore: Math.max(prev.score, prev.highScore),
                };
              }
              return { ...prev, lives: newLives };
            });
          }
          return false;
        }

        // Check bullet collisions
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const bullet = bulletsRef.current[i];
          const bDist = Math.sqrt(
            Math.pow(bullet.x - enemy.x, 2) + 
            Math.pow(bullet.y - enemy.y, 2)
          );
          
          if (bDist < enemy.size) {
            enemy.health -= (bullet.damage || 1);
            
            if (!bullet.pierce) {
              bulletsRef.current.splice(i, 1);
            }
            
            if (enemy.health <= 0) {
              createExplosion(enemy.x, enemy.y, enemy.color);
              
              // Ricochet: If laser kills enemy and hasn't ricocheted yet, create new bullet toward nearest enemy
              if (bullet.pierce && !bullet.hasRicocheted && enemiesRef.current.length > 1) {
                let nearestEnemy: Enemy | null = null;
                let nearestDist = Infinity;
                
                enemiesRef.current.forEach(otherEnemy => {
                  if (otherEnemy !== enemy) {
                    const dist = Math.sqrt(
                      Math.pow(otherEnemy.x - enemy.x, 2) + 
                      Math.pow(otherEnemy.y - enemy.y, 2)
                    );
                    if (dist < nearestDist) {
                      nearestDist = dist;
                      nearestEnemy = otherEnemy;
                    }
                  }
                });
                
                if (nearestEnemy) {
                  const angle = Math.atan2(nearestEnemy.y - enemy.y, nearestEnemy.x - enemy.x);
                  const ricochetBullet: Bullet = {
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * 20,
                    vy: Math.sin(angle) * 20,
                    lifetime: 40,
                    damage: bullet.damage,
                    pierce: true,
                    color: '#ffff00', // Yellow for ricochet
                    hasRicocheted: true,
                  };
                  bulletsRef.current.push(ricochetBullet);
                }
              }
              
              // Chance to drop power-up
              if (Math.random() < 0.15) {
                createPowerUp(enemy.x, enemy.y);
              }
              
              setGameState(prev => {
                const newScore = prev.score + (enemy.type === 'heavy' ? 30 : enemy.type === 'fast' ? 20 : 10);
                const newWave = Math.floor(newScore / 200) + 1;
                return {
                  ...prev,
                  score: newScore,
                  wave: newWave,
                };
              });
              return false;
            }
          }
        }

        return true;
      });

      // Update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        return particle.life > 0;
      });
      
      // Update power-ups
      powerUpsRef.current = powerUpsRef.current.filter(powerUp => {
        powerUp.lifetime--;
        powerUp.pulse += 0.1;
        
        // Check bullet collisions with power-ups
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const bullet = bulletsRef.current[i];
          const dx = bullet.x - powerUp.x;
          const dy = bullet.y - powerUp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 20) {
            // Hit power-up with bullet
            bulletsRef.current.splice(i, 1);
            createExplosion(powerUp.x, powerUp.y, powerUp.color);
            
            switch(powerUp.type) {
              case 'rapid':
                weaponRef.current = {
                  type: 'rapid',
                  duration: 600,
                  fireRate: 3,
                  damage: 1,
                };
                break;
              case 'triple':
                weaponRef.current = {
                  type: 'triple',
                  duration: 500,
                  fireRate: 10,
                  damage: 1,
                };
                break;
              case 'laser':
                weaponRef.current = {
                  type: 'laser',
                  duration: 400,
                  fireRate: 8,  // Same speed as default
                  damage: 2,
                };
                break;
              case 'shield':
                shieldRef.current = 300;
                break;
              case 'bomb':
                // Clear all enemies
                enemiesRef.current.forEach(enemy => {
                  createExplosion(enemy.x, enemy.y, '#ff0000');
                });
                setGameState(prev => ({
                  ...prev,
                  score: prev.score + enemiesRef.current.length * 5,
                }));
                enemiesRef.current = [];
                break;
            }
            
            return false;
          }
        }
        
        return powerUp.lifetime > 0;
      });
    }

    // Draw particles
    particlesRef.current.forEach(particle => {
      ctx.globalAlpha = particle.life / 30;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Draw enemies
    enemiesRef.current.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);
      
      // Enemy body
      ctx.fillStyle = enemy.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = enemy.color;
      
      if (enemy.type === 'heavy') {
        // Heavy enemy - hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const x = Math.cos(angle) * enemy.size;
          const y = Math.sin(angle) * enemy.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (enemy.type === 'fast') {
        // Fast enemy - triangle
        ctx.beginPath();
        ctx.moveTo(enemy.size, 0);
        ctx.lineTo(-enemy.size, -enemy.size * 0.7);
        ctx.lineTo(-enemy.size, enemy.size * 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        // Basic enemy - diamond
        ctx.beginPath();
        ctx.moveTo(enemy.size, 0);
        ctx.lineTo(0, enemy.size);
        ctx.lineTo(-enemy.size, 0);
        ctx.lineTo(0, -enemy.size);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.restore();
    });

    // Draw power-ups
    powerUpsRef.current.forEach(powerUp => {
      ctx.save();
      const scale = 1 + Math.sin(powerUp.pulse) * 0.2;
      ctx.translate(powerUp.x, powerUp.y);
      ctx.scale(scale, scale);
      ctx.rotate(powerUp.pulse * 0.5);
      
      ctx.fillStyle = powerUp.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = powerUp.color;
      
      // Draw power-up shape based on type
      if (powerUp.type === 'shield') {
        // Shield shape
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, -5);
        ctx.lineTo(10, 8);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 8);
        ctx.lineTo(-10, -5);
        ctx.closePath();
        ctx.fill();
      } else if (powerUp.type === 'bomb') {
        // Bomb shape
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, -15, 4, 8);
      } else {
        // Weapon upgrade star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * 12;
          const y = Math.sin(angle) * 12;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          const innerAngle = angle + Math.PI / 5;
          const innerX = Math.cos(innerAngle) * 6;
          const innerY = Math.sin(innerAngle) * 6;
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.restore();
    });
    
    // Draw bullets
    bulletsRef.current.forEach(bullet => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = bullet.color || '#00ffff';
      ctx.fillStyle = bullet.color || '#00ffff';
      
      if (bullet.pierce) {
        // Laser beam - twice as wide
        ctx.fillRect(bullet.x - 12, bullet.y - 8, 24, 16);
      } else {
        ctx.fillRect(bullet.x - 3, bullet.y - 3, 6, 6);
      }
      
      // Bullet trail
      ctx.globalAlpha = 0.3;
      ctx.fillRect(bullet.x - bullet.vx - 2, bullet.y - bullet.vy - 2, 4, 4);
      ctx.globalAlpha = 1;
    });

    // Draw player
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Draw shield if active
    if (shieldRef.current > 0) {
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ffff';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.rotate(player.angle);
    
    // Player ship - change color based on weapon
    const shipColor = weaponRef.current.type === 'laser' ? '#ff00ff' : 
                     weaponRef.current.type === 'triple' ? '#00ff00' :
                     weaponRef.current.type === 'rapid' ? '#ffff00' : '#00ffff';
    
    ctx.fillStyle = shipColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = shipColor;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fillRect(-2, -3, 6, 6);
    
    ctx.restore();

    // Draw crosshair at mouse position
    if (gameState.isPlaying && !gameState.isPaused) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouseRef.current.x, mouseRef.current.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(mouseRef.current.x - 20, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x - 10, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x + 10, mouseRef.current.y);
      ctx.lineTo(mouseRef.current.x + 20, mouseRef.current.y);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 20);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y - 10);
      ctx.moveTo(mouseRef.current.x, mouseRef.current.y + 10);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 20);
      ctx.stroke();
    }

    // Always draw progress loader when generating - responsive sizing
    // Account for pixel ratio scaling on desktop
    const pixelRatio = window.devicePixelRatio || 1;
    const isMobileCanvas = canvas.width <= 400;
    const effectiveWidth = isMobileCanvas ? canvas.width : canvas.width / pixelRatio;
    const effectiveHeight = isMobileCanvas ? canvas.height : canvas.height / pixelRatio;
    
    const barHeight = 8; // Match the height from the start screen
    const barY = effectiveHeight - (isMobileCanvas ? 80 : 50);
    const barWidth = effectiveWidth - (isMobileCanvas ? 40 : 60);
    const barX = isMobileCanvas ? 20 : 30;
    
    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Border
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Progress fill (only when generating)
    if (isGenerating && progressPercentage > 0) {
      const fillWidth = (barWidth * progressPercentage) / 100;
      const gradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
      gradient.addColorStop(0, '#00ffff');
      gradient.addColorStop(0.5, '#ff00ff');
      gradient.addColorStop(1, '#00ff00');
      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY, fillWidth, barHeight);
      
      // Animated pulse effect on the progress edge
      const pulseAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgba(0, 255, 255, ${pulseAlpha})`;
      ctx.fillRect(barX + fillWidth - 2, barY, 2, barHeight);
      ctx.shadowBlur = 0;
    }
    
    // Progress text - mobile responsive fonts
    ctx.fillStyle = '#00ffff';
    ctx.font = isMobileCanvas ? '14px monospace' : '12px monospace';
    ctx.textAlign = 'center';
    
    // Use effective width for text centering
    const textCenterX = effectiveWidth / 2;
    
    if (isGenerating) {
      ctx.fillText(getProgressMessage(), textCenterX, barY - (isMobileCanvas ? 15 : 10));
      
      // Percentage - larger on mobile
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = isMobileCanvas ? '16px monospace' : '12px monospace';
      ctx.fillText(`${Math.floor(progressPercentage)}%`, textCenterX, barY + barHeight + (isMobileCanvas ? 25 : 20));
      
      // ETA - larger on mobile
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.font = isMobileCanvas ? '14px monospace' : '10px monospace';
      const remainingSeconds = Math.max(0, 90 - elapsedTime);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const etaText = remainingSeconds > 0 
        ? `ETA: ${minutes}:${seconds.toString().padStart(2, '0')}`
        : 'Finalizing...';
      ctx.fillText(etaText, textCenterX, barY + barHeight + (isMobileCanvas ? 45 : 35));
    } else {
      // Show ready message when not generating
      ctx.fillText('Ready to generate', textCenterX, barY - (isMobileCanvas ? 15 : 10));
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, shoot, createEnemy, createExplosion, createPowerUp, isGenerating, elapsedTime, progressPercentage, getProgressMessage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const container = canvas.parentElement;
      if (container) {
        // Get the actual available space in the container
        const containerRect = container.getBoundingClientRect();
        let availableWidth = containerRect.width;
        let availableHeight = containerRect.height;
        
        // Mobile optimization: ensure minimum playable area
        const isMobileCanvas = availableWidth <= 400;
        if (isMobileCanvas) {
          // Ensure minimum canvas size on mobile for playability
          availableWidth = Math.max(availableWidth, 300);
          availableHeight = Math.max(availableHeight, 350);
        }
        
        // Set canvas to fill available space exactly
        canvas.width = Math.floor(availableWidth);
        canvas.height = Math.floor(availableHeight);
        
        // Use device pixel ratio for crisp rendering on high-DPI screens
        const pixelRatio = window.devicePixelRatio || 1;
        if (pixelRatio > 1 && !isMobileCanvas) {
          canvas.width *= pixelRatio;
          canvas.height *= pixelRatio;
          canvas.style.width = availableWidth + 'px';
          canvas.style.height = availableHeight + 'px';
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(pixelRatio, pixelRatio);
          }
        }
        
        playerRef.current.x = canvas.width / (pixelRatio > 1 && !isMobileCanvas ? pixelRatio : 1) / 2;
        playerRef.current.y = canvas.height / (pixelRatio > 1 && !isMobileCanvas ? pixelRatio : 1) / 2;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Always run the game loop to show progress bar
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const scale = canvas.width <= 400 ? 1 : pixelRatio;
      
      mouseRef.current = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width / scale),
        y: (e.clientY - rect.top) * (canvas.height / rect.height / scale),
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const pixelRatio = window.devicePixelRatio || 1;
      const scale = canvas.width <= 400 ? 1 : pixelRatio;
      
      mouseRef.current = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width / scale),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height / scale),
      };
    };

    const handleMouseDown = () => {
      shootingRef.current = true;
    };

    const handleMouseUp = () => {
      shootingRef.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const pixelRatio = window.devicePixelRatio || 1;
      const scale = canvas.width <= 400 ? 1 : pixelRatio;
      
      mouseRef.current = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width / scale),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height / scale),
      };
      shootingRef.current = true;
    };

    const handleTouchEnd = () => {
      shootingRef.current = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const startGame = () => {
    initGame();
    setGameState({
      isPlaying: true,
      isPaused: false,
      score: 0,
      highScore: gameState.highScore,
      gameOver: false,
      wave: 1,
      lives: 3,
    });
  };


  return (
    <div className="w-full h-full max-w-6xl mx-auto">
      <div className="h-full flex flex-col bg-cyber-dark/90 backdrop-blur-sm rounded-lg border border-cyber-cyan/20 p-2 sm:p-4">
        <div className="flex justify-center items-center mb-2 gap-2 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs text-cyber-cyan/60 font-mono uppercase tracking-wider">SCORE</span>
            <span className="text-sm sm:text-base md:text-lg font-bold font-mono text-cyber-cyan">{gameState.score.toString().padStart(4, '0')}</span>
          </div>
          <div className="text-cyber-cyan/30">|</div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs text-cyber-purple/60 font-mono uppercase tracking-wider">WAVE</span>
            <span className="text-sm sm:text-base md:text-lg font-bold font-mono text-cyber-purple">{gameState.wave.toString().padStart(2, '0')}</span>
          </div>
          <div className="text-cyber-cyan/30">|</div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs text-cyber-pink/60 font-mono uppercase tracking-wider">LIVES</span>
            <span className="text-sm sm:text-base md:text-lg font-bold font-mono text-cyber-pink">{'❤'.repeat(gameState.lives)}</span>
          </div>
        </div>

        <div className="relative flex-1 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className={`bg-cyber-black rounded touch-none select-none ${
              gameState.isPlaying && !gameState.isPaused 
                ? (isMobileView ? 'cursor-none' : 'cursor-crosshair') 
                : 'cursor-default'
            }`}
            style={{ 
              imageRendering: 'pixelated',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
          
          
          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyber-dark/95 rounded backdrop-blur-sm px-4">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyber-cyan mb-2 font-mono uppercase tracking-wider text-center">
                {isGenerating ? "Your Card is Being Generated" : "Cyber Defense"}
              </h3>
              {isGenerating ? (
                <p className="text-gray-400 mb-6 font-mono text-sm text-center">
                  Defend the system while you wait!
                </p>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <p className="text-gray-400 mb-2 font-mono text-sm text-center">Move mouse to aim</p>
                    <p className="text-gray-400 mb-6 font-mono text-sm text-center">Click to shoot</p>
                  </div>
                  <div className="block sm:hidden mb-6">
                    <p className="text-gray-400 font-mono text-sm text-center">Touch to aim and shoot</p>
                  </div>
                </>
              )}
              <button
                onClick={startGame}
                className="min-h-[48px] px-6 sm:px-8 py-3 border-2 border-cyber-green text-cyber-green bg-transparent font-bold font-mono uppercase tracking-wider rounded-lg hover:bg-cyber-green/10 active:bg-cyber-green/20 transition-all duration-300 touch-manipulation text-sm sm:text-base"
              >
                Start Game
              </button>
              
              {/* Progress bar on start screen */}
              <div className="absolute bottom-[20px] sm:bottom-[60px] left-[20px] sm:left-[40px] right-[20px] sm:right-[40px]">
                  <div className="relative">
                    {/* Background bar */}
                    <div 
                      className="h-[8px] border border-cyber-cyan/30"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                    >
                      {/* Progress fill */}
                      {isGenerating && progressPercentage > 0 && (
                        <div 
                          className="h-full"
                          style={{ 
                            width: `${progressPercentage}%`,
                            background: 'linear-gradient(to right, #00ffff, #ff00ff, #00ff00)'
                          }}
                        />
                      )}
                    </div>
                    {/* Progress text */}
                    <div className="text-center">
                      <p className="text-cyber-cyan text-xs font-mono mt-[-30px] mb-1">
                        {isGenerating ? getProgressMessage() : 'Ready to generate'}
                      </p>
                      {isGenerating && (
                        <>
                          <p className="text-white/70 text-[10px] font-mono mt-[28px]">
                            {Math.floor(progressPercentage)}%
                          </p>
                          <p className="text-white/70 text-[10px] font-mono mt-[8px]">
                            ETA: {Math.floor(Math.max(0, 90 - elapsedTime) / 60)}:{(Math.max(0, 90 - elapsedTime) % 60).toString().padStart(2, '0')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          )}
          
          {gameState.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyber-dark/95 rounded backdrop-blur-sm px-4">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-pink mb-2 font-mono uppercase tracking-wider animate-pulse text-center">System Breached!</h3>
              <p className="text-cyber-cyan text-lg sm:text-xl mb-2 font-mono text-center">Score: {gameState.score}</p>
              <p className="text-cyber-purple mb-4 font-mono text-center">Wave: {gameState.wave}</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="text-cyber-yellow mb-4 font-mono uppercase tracking-wider text-center text-sm sm:text-base">New High Score!</p>
              )}
              <button
                onClick={startGame}
                className="min-h-[48px] px-6 sm:px-8 py-3 border-2 border-cyber-green text-cyber-green bg-transparent font-bold font-mono uppercase tracking-wider rounded-lg hover:bg-cyber-green/10 active:bg-cyber-green/20 transition-all duration-300 touch-manipulation text-sm sm:text-base"
              >
                Restart Defense
              </button>
            </div>
          )}
          
          {gameState.isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
              <p className="text-2xl font-bold text-cyan-400">PAUSED</p>
            </div>
          )}
        </div>
        
        {!isGenerating && (
          <div className="flex justify-between text-xs sm:text-sm text-gray-500 mt-2 px-2">
            <span className="hidden sm:inline">Move: Mouse</span>
            <span className="sm:hidden">Touch to play</span>
            <span className="hidden sm:inline">Shoot: Click</span>
            <span className="sm:hidden">Drag to aim</span>
          </div>
        )}
      </div>
    </div>
  );
}