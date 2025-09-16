
(function(){
  const TAU = Math.PI*2;
  class Confetti {
    constructor(canvas){
      this.c = canvas || document.createElement('canvas');
      if(!canvas){ document.body.appendChild(this.c); }
      this.ctx = this.c.getContext('2d');
      // Ensure the confetti canvas never blocks clicks and stays fixed on top
      const s = this.c.style;
      s.position = 'fixed';
      s.left = '0';
      s.top = '0';
      s.width = '100vw';
      s.height = '100vh';
      s.pointerEvents = 'none';
      s.zIndex = '9999';
      this.resize();
      this.particles = [];
      this.running = false;
      window.addEventListener('resize', ()=>this.resize());
    }
    resize(){
      this.c.width = window.innerWidth;
      this.c.height = window.innerHeight;
    }
    burst(x, y){
      for(let i=0;i<150;i++){
        const angle = Math.random()*TAU;
        const speed = 4+Math.random()*6;
        this.particles.push({
          x, y,
          vx: Math.cos(angle)*speed,
          vy: Math.sin(angle)*speed - 4,
          g: 0.2 + Math.random()*0.3,
          size: 2+Math.random()*4,
          life: 80+Math.random()*60,
          color: `hsl(${Math.random()*360},90%,60%)`
        });
      }
      if(!this.running){ this.running = true; requestAnimationFrame(()=>this.loop()); }
    }
    loop(){
      const {ctx,c}=this;
      ctx.clearRect(0,0,c.width,c.height);
      this.particles = this.particles.filter(p=>p.life>0);
      for(const p of this.particles){
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      if(this.particles.length>0){ requestAnimationFrame(()=>this.loop()); } else { this.running=false; }
    }
  }
  window.Confetti = Confetti;
})();
