import React, { useEffect, useRef } from 'react';

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let dots: Dot[] = [];
    const spacing = 20; 
    const mouse = { x: -1000, y: -1000, radius: 250 };

    class Dot {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      vx: number;
      vy: number;
      
      // Colores de la marca
      readonly blue = { r: 0, g: 102, b: 204 }; // Azul más profundo y sólido
      readonly grey = { r: 100, g: 116, b: 139 }; // Slate-500 para mejor contraste

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 2 + 1.5; // Partículas ligeramente más grandes
        this.vx = 0;
        this.vy = 0;
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          this.vx += dx * force * 0.025; // Fuerza de repulsión aumentada
          this.vy += dy * force * 0.025;
        }

        // Añadir entropía (movimiento aleatorio constante mucho más pronunciado)
        this.vx += (Math.random() - 0.5) * 0.6;
        this.vy += (Math.random() - 0.5) * 0.6;

        this.vx += (this.baseX - this.x) * 0.05;
        this.vy += (this.baseY - this.y) * 0.05;
        
        this.vx *= 0.85; // Menos fricción para más movimiento
        this.vy *= 0.85;
        
        this.x += this.vx;
        this.y += this.vy;
      }

      draw() {
        if (!ctx) return;
        
        // Calcular color basado en la velocidad (movimiento)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const factor = Math.min(speed / 4, 1); // Sensibilidad al color aumentada
        
        const r = Math.round(this.grey.r + (this.blue.r - this.grey.r) * factor);
        const g = Math.round(this.grey.g + (this.blue.g - this.grey.g) * factor);
        const b = Math.round(this.grey.b + (this.blue.b - this.grey.b) * factor);
        const alpha = 0.5 + factor * 0.4; // Mucho más sólido (0.5 a 0.9)

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dots = [];
      
      for (let y = 0; y < canvas.height + spacing; y += spacing) {
        for (let x = 0; x < canvas.width + spacing; x += spacing) {
          dots.push(new Dot(x, y));
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < dots.length; i++) {
        dots[i].update();
        dots[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};

export default ParticleBackground;
