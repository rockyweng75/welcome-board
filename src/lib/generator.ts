export const rand = (min: number, max: number) => Math.random() * (max - min) + min;
export const randInt = (min: number, max: number) => Math.floor(rand(min, max));

function parseGradient(css: string) {
  const m = css.match(/linear-gradient\((\d+(?:\.\d+)?)deg,\s*(.+)\)/);
  if (!m) return null;
  const angle = parseFloat(m[1]);
  const stops = m[2].split(',').map((s, idx, arr) => {
    const parts = s.trim().split(/\s+/);
    return { 
        color: parts[0], 
        pos: parts[1] ? parseFloat(parts[1]) / 100 : (arr.length === 1 ? 0 : idx / (arr.length - 1))
    };
  });
  return { angle, stops };
}

function gradientPoints(angleDeg: number, w: number, h: number) {
  const rad = angleDeg * Math.PI / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const cx = w / 2, cy = h / 2;
  let lo = Infinity, hi = -Infinity;
  for (const [px, py] of [[0,0],[w,0],[0,h],[w,h]]) {
    const t = (px - cx) * dx + (py - cy) * dy;
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  return { x1: cx + lo * dx, y1: cy + lo * dy, x2: cx + hi * dx, y2: cy + hi * dy };
}

function drawBaseGradient(ctx: CanvasRenderingContext2D, w: number, h: number, css: string) {
  const parsed = parseGradient(css);
  if (!parsed) { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, w, h); return; }
  const { x1, y1, x2, y2 } = gradientPoints(parsed.angle, w, h);
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const s of parsed.stops) g.addColorStop(s.pos, s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const numStars = randInt(150, 400);
  for(let i = 0; i < numStars; i++) {
    ctx.beginPath();
    const r = Math.random() > 0.95 ? rand(1.5, 3) : rand(0.5, 1.5);
    ctx.arc(rand(0, w), rand(0, h), r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${rand(0.1, 0.8)})`;
    ctx.fill();
    if (Math.random() > 0.98) {
      ctx.shadowBlur = rand(5, 15);
      ctx.shadowColor = 'white';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

type Renderer = (ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) => void;

const renderers: Record<string, Renderer> = {
  't-elegant': (ctx, w, h, accent) => {
    const numCircles = randInt(3, 8);
    for(let i=0; i<numCircles; i++) {
      ctx.beginPath();
      ctx.arc(rand(-100, w+100), rand(-100, h+100), rand(100, 600), 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? accent : 'rgba(255,255,255,0.03)';
      ctx.fill();
    }
    const numLines = randInt(5, 15);
    for(let i=0; i<numLines; i++) {
      ctx.beginPath();
      ctx.moveTo(rand(0, w), rand(0, h)); ctx.lineTo(rand(0, w), rand(0, h));
      ctx.lineWidth = rand(1, 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.stroke();
    }
  },
  't-modern-centered': (ctx, w, h, accent) => {
    ctx.translate(w/2, h/2);
    const numRings = randInt(4, 9);
    for(let i=1; i<=numRings; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, rand(100, 800), 0, Math.PI * 2);
      ctx.lineWidth = rand(1, 5);
      ctx.strokeStyle = Math.random() > 0.6 ? accent : 'rgba(255,255,255,0.04)';
      ctx.stroke();
    }
    const numNodes = randInt(15, 40);
    for(let i=0; i<numNodes; i++) {
      const a = rand(0, Math.PI*2), r = rand(50, 900);
      ctx.beginPath();
      ctx.arc(Math.cos(a)*r, Math.sin(a)*r, rand(2, 6), 0, Math.PI*2);
      ctx.fillStyle = Math.random() > 0.5 ? accent : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }
    ctx.resetTransform();
  },
  't-bold-dark': (ctx, w, h, accent) => {
    const numPoly = randInt(5, 12);
    for(let i=0; i<numPoly; i++) {
      ctx.beginPath();
      const startX = rand(-200, w+200), startY = rand(-200, h+200);
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + rand(-600, 600), startY + rand(-600, 600));
      ctx.lineTo(startX + rand(-600, 600), startY + rand(-600, 600));
      ctx.closePath();
      if (Math.random() > 0.4) {
        ctx.fillStyle = Math.random() > 0.7 ? accent : 'rgba(0,0,0,0.3)';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = rand(1, 4);
        ctx.stroke();
      }
    }
  },
  't-nature-soft': (ctx, w, h, accent) => {
    const numWaves = randInt(4, 9);
    for(let i=0; i<numWaves; i++) {
      ctx.beginPath();
      ctx.moveTo(0, rand(0, h));
      ctx.bezierCurveTo(w*0.3, rand(-200, h+200), w*0.7, rand(-200, h+200), w, rand(0, h));
      ctx.lineTo(w, h); ctx.lineTo(0, h);
      ctx.fillStyle = Math.random() > 0.6 ? accent : 'rgba(255,255,255,0.04)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, rand(0, h));
      ctx.bezierCurveTo(w*0.3, rand(0, h), w*0.7, rand(0, h), w, rand(0, h));
      ctx.lineWidth = rand(2, 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.stroke();
    }
    if (Math.random() > 0.3) {
       ctx.beginPath();
       ctx.arc(rand(w*0.7, w*0.9), rand(h*0.1, h*0.4), rand(80, 150), 0, Math.PI*2);
       ctx.fillStyle = accent;
       ctx.fill();
    }
  },
  't-vip-gold': (ctx, w, h, accent) => {
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(rand(30, 60) * Math.PI / 180);
    const rays = randInt(10, 25);
    for(let i=0; i<rays; i++) {
       let yOffset = rand(-h, h);
       let thickness = rand(10, 50);
       let grad = ctx.createLinearGradient(-w, yOffset, w, yOffset);
       grad.addColorStop(0, 'rgba(255,255,255,0)');
       grad.addColorStop(0.5, accent);
       grad.addColorStop(1, 'rgba(255,255,255,0)');
       ctx.fillStyle = grad;
       ctx.fillRect(-w*1.5, yOffset, w*3, thickness);
    }
    ctx.restore();
    
    const frames = randInt(2, 6);
    for(let i=0; i<frames; i++) {
       ctx.strokeStyle = accent;
       ctx.lineWidth = rand(1, 4);
       let fw = rand(300, 1000), fh = rand(200, 800);
       ctx.strokeRect(rand(0, w-fw), rand(0, h-fh), fw, fh);
    }
  },
  't-vip-modern': (ctx, w, h, accent) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const verticalLines = randInt(10, 30);
    for(let i=0; i<verticalLines; i++) {
       let x = rand(0, w);
       ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    const horizontalLines = randInt(10, 30);
    for(let i=0; i<horizontalLines; i++) {
       let y = rand(0, h);
       ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    
    const shapes = randInt(8, 20);
    for(let i=0; i<shapes; i++) {
       ctx.fillStyle = (Math.random() > 0.5) ? accent : 'rgba(255,255,255,0.1)';
       let sSize = Math.random() > 0.8 ? rand(20, 80) : rand(4, 12);
       ctx.fillRect(rand(0, w), rand(0, h), sSize, sSize);
    }
  }
};

const accents: Record<string, string> = {
  't-elegant': 'rgba(249, 115, 22, 0.15)',
  't-modern-centered': 'rgba(59, 130, 246, 0.15)',
  't-bold-dark': 'rgba(255, 255, 255, 0.05)',
  't-nature-soft': 'rgba(34, 197, 94, 0.2)',
  't-vip-gold': 'rgba(251, 191, 36, 0.2)',
  't-vip-modern': 'rgba(255, 255, 255, 0.08)',
};

export function generatePresetImage(templateId: string, gradientCss: string): string {
  const W = 1920, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  drawBaseGradient(ctx, W, H, gradientCss);
  drawStars(ctx, W, H);
  
  if (renderers[templateId]) {
    renderers[templateId](ctx, W, H, accents[templateId] || 'rgba(255,255,255,0.1)');
  }
  
  return canvas.toDataURL('image/jpeg', 0.92);
}