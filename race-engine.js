(function(){
'use strict';
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rand=(a,b)=>a+Math.random()*(b-a);
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));

const NIGHT={hemi:0.5,sun:0.3,sunAmt:0,sunY:0.5,sunCol:0xa597ff,day:0};
const P=(o)=>Object.assign({},NIGHT,o);
const ZONES={
  grid:    P({top:0x040306,hor:0x0f0a19,glow:0.15,ground:0x09080c,gR:0.35,gM:0.5,fogN:18,fogF:150,pl:4,exp:1.0,bend:0,hill:0}),
  city:    P({top:0x06070f,hor:0x221a3c,glow:0.45,ground:0x0a090e,gR:0.18,gM:0.8,fogN:35,fogF:320,pl:4.5,exp:1.05,bend:0.00045,hill:0.00003}),
  creative:P({top:0x06050a,hor:0x170c28,glow:0.3,ground:0x0b0a0f,gR:0.3,gM:0.6,fogN:25,fogF:240,pl:3.5,exp:1.05,bend:0.0004,hill:0.00003}),
  circuitN:P({top:0x040306,hor:0x110a1d,glow:0.2,ground:0x0a090c,gR:0.45,gM:0.4,fogN:30,fogF:260,pl:2.5,exp:1.0,bend:0.0011,hill:0.00008}),
  world:   P({top:0x040306,hor:0x140b25,glow:0.25,ground:0x08070b,gR:0.4,gM:0.5,fogN:40,fogF:320,pl:3,exp:1.0,bend:0.00025,hill:0}),
  highway: P({top:0x120a30,hor:0xa0479e,glow:1.0,ground:0x0c0918,gR:0.12,gM:0.85,fogN:60,fogF:440,pl:1.5,exp:1.05,hemi:0.6,sun:0.9,sunAmt:0.6,sunY:0.035,sunCol:0xffb3c6,day:0.25,bend:0.0006,hill:0.00012}),
  finish:  P({top:0x160b3a,hor:0xb3559f,glow:1.3,ground:0x0d0a1b,gR:0.12,gM:0.85,fogN:50,fogF:420,pl:2,exp:1.1,hemi:0.7,sun:1.0,sunAmt:0.75,sunY:0.03,sunCol:0xffc0d0,day:0.3,bend:0,hill:0}),
  day:     {top:0x2a64b8,hor:0xc9dbeb,glow:0,ground:0x3d6633,gR:0.95,gM:0,fogN:110,fogF:620,pl:0,exp:0.82,hemi:0.8,sun:1.9,sunAmt:1,sunY:0.5,sunCol:0xfff1dc,day:1,bend:0.0011,hill:0.00008}
};
const SEG_ZONE=['grid','city','creative','circuit','world','highway','finish'];
const CRUISE=[30,22,32,46,14,26,95];
const SHOTS={
  wheel:{p:[2.1,0.42,-0.2],l:[0.95,0.38,-1.45],f:30,d:[0,0,-0.22]},
  headlight:{p:[1.5,0.72,-4.6],l:[0.6,0.5,-2.3],f:26,d:[-0.22,0,0]},
  carbon:{p:[-2.2,0.34,-3.6],l:[-0.4,0.26,-2.1],f:28,d:[0,0,0.22]},
  rear:{p:[1.4,1.05,5.0],l:[0.2,0.62,2.3],f:26,d:[-0.25,0,0]},
  hero:{p:[5.4,1.35,-6.6],l:[0.2,0.6,0.1],f:30,fx:0.2,my:0.2},
  chase:{p:[0,1.75,6.6],l:[0,0.95,-5],f:54,my:0.14},
  lowRear:{p:[0.3,0.62,5.6],l:[0,0.7,-6],f:58,my:0.12},
  side:{p:[10.5,1.35,1.0],l:[0,0.8,-0.6],f:30,fx:0.22,my:0.2},
  creative:{p:[-3.2,3.0,9.5],l:[1.5,1.8,-10],f:54,fx:0.1,my:0.1},
  circuit:{p:[-0.8,1.55,6.2],l:[0.2,0.9,-8],f:56,fx:0.14,my:0.12},
  roof:{p:[0,1.6,1.2],l:[0,1.2,-12],f:64,my:0.04},
  overhead:{p:[0,44,20],l:[0,0,-16],f:42},
  highway:{p:[7.6,1.5,3.4],l:[-0.6,1.3,-3.2],f:36,fx:0.2,my:0.16},
  dest:{p:[7.2,1.7,-4.6],l:[0.4,0.9,-0.4],f:34,fx:0.22,my:0.22,d:[0,0,0.06]},
  destLow:{p:[-6.4,0.9,5.2],l:[0.4,0.8,-1],f:36,fx:0.22,my:0.22,d:[0.04,0,0]},
  front:{p:[1.2,1.0,-9],l:[0,0.7,0],f:38}
};
const SVC_NAMES=['UI/UX DESIGN','VIDEO EDITING','GRAPHICS DESIGN','VIBE CODING','UX WRITING','LOGO DESIGN'];
const BEND={uBendX:{value:0},uBendY:{value:0}};

function patchShaders(){
  const T=THREE; if(T.__cePatched) return; T.__cePatched=true;
  T.ShaderChunk.common='uniform float uBendX;\nuniform float uBendY;\n'+T.ShaderChunk.common;
  T.ShaderChunk.project_vertex=[
    'vec4 mvPosition = vec4( transformed, 1.0 );',
    '#ifdef USE_INSTANCING','mvPosition = instanceMatrix * mvPosition;','#endif',
    'vec4 bwp = modelMatrix * mvPosition;','float bdz = min( bwp.z, 0.0 );',
    'bwp.x += uBendX * bdz * bdz;','bwp.y += uBendY * bdz * bdz;',
    'mvPosition = viewMatrix * bwp;','gl_Position = projectionMatrix * mvPosition;'].join('\n');
}
function bendable(mat){mat.onBeforeCompile=sh=>{sh.uniforms.uBendX=BEND.uBendX;sh.uniforms.uBendY=BEND.uBendY;};mat.customProgramCacheKey=()=>'bend';return mat;}
function canvasTex(w,h,draw,srgb=true){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c); if(srgb) t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

class RaceAudio{
  constructor(){this.on=false;this.ctx=null;this.muted=false;}
  init(){
    if(this.ctx) return; const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    const c=this.ctx=new C();
    this.master=c.createGain(); this.master.gain.value=0; this.master.connect(c.destination);
    this.f=c.createBiquadFilter(); this.f.type='lowpass'; this.f.frequency.value=400; this.f.Q.value=5; this.f.connect(this.master);
    this.o1=c.createOscillator(); this.o1.type='sawtooth'; this.o2=c.createOscillator(); this.o2.type='square'; this.o2.detune.value=-1200;
    const g1=c.createGain(); g1.gain.value=0.5; const g2=c.createGain(); g2.gain.value=0.35;
    this.o1.connect(g1).connect(this.f); this.o2.connect(g2).connect(this.f); this.o1.start(); this.o2.start();
    const buf=c.createBuffer(1,c.sampleRate*2,c.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const n=c.createBufferSource(); n.buffer=buf; n.loop=true; const nf=c.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=700;
    this.wind=c.createGain(); this.wind.gain.value=0; n.connect(nf).connect(this.wind).connect(c.destination); n.start();
  }
  enable(){this.init(); if(!this.ctx) return; this.ctx.resume(); this.on=true;}
  disable(){this.on=false;}
  update(sn,engineOn,rev){
    if(!this.ctx) return; const now=this.ctx.currentTime;
    const active=this.on&&!this.muted&&(engineOn||rev>0);
    const gears=6, g=Math.min(gears-1,Math.floor(sn*gears)), rpm=sn*gears-g;
    const r=engineOn? Math.max(0.18+rpm*0.82*Math.min(1,sn*8), 0.18+rev*0.5) : rev*0.6;
    const fq=34+r*72+g*5;
    this.o1.frequency.setTargetAtTime(fq,now,0.05); this.o2.frequency.setTargetAtTime(fq,now,0.05);
    this.f.frequency.setTargetAtTime(240+r*1500,now,0.08);
    this.master.gain.setTargetAtTime(active?0.03+0.05*r:0,now,0.12);
    this.wind.gain.setTargetAtTime(active?sn*0.035:0,now,0.2);
  }
  beep(freq=600,dur=0.12,vol=0.05){
    if(!this.on||!this.ctx||this.muted) return; const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
    o.type='sine'; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+0.02);
  }
  click(){this.beep(1400,0.035,0.03);}
}

class RaceEngine{
  constructor(container,opts={}){
    const T=THREE; patchShaders();
    this.c=container; this.mobile=!!opts.mobile; this.reduced=!!opts.reduced; this.timeMode=opts.timeMode||'mix';
    const r=this.renderer=new T.WebGLRenderer({antialias:!this.mobile,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.dpr=Math.min(window.devicePixelRatio||1,this.mobile?1.4:1.75); r.setPixelRatio(this.dpr);
    r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=0;
    r.domElement.style.cssText='display:block;width:100%;height:100%';
    container.appendChild(r.domElement);
    this.scene=new T.Scene(); this.camera=new T.PerspectiveCamera(40,1,0.1,1400);
    this.scene.fog=new T.Fog(0x07060a,20,160);
    this.clock=new T.Clock(); this.t=0;
    this.state={seg:0,p:0,service:0,sector:0,sectorP:0,started:false};
    this.speed=0; this.dist=0; this.spin=0; this.steer=0; this.laneOff=0;
    this.override='hero'; this.snap=true; this.blendK=1.8; this.cutAt=0; this.lastShot=null;
    this.exposure=0; this.expTarget=0; this.rev=0; this.engineOn=false; this.shake=0; this.smokeT=0;
    this.speedOverride=null; this.paused=false; this.stopping=false; this.svcShown=-1; this.boardFlash=0;
    this.camPos=new T.Vector3(5,1.4,-6); this.camLook=new T.Vector3(); this.camFov=30; this.fx=0; this.fy=0;
    this.zc={top:new T.Color(),hor:new T.Color(),ground:new T.Color(),sunCol:new T.Color()};
    const Z=ZONES.grid; ['top','hor','ground','sunCol'].forEach(k=>this.zc[k].set(Z[k]));
    ['glow','gR','gM','fogN','fogF','pl','exp','hemi','sun','sunAmt','sunY','day','bend','hill'].forEach(k=>this.zc[k]=Z[k]);
    this._c=new T.Color(); this._v1=new T.Vector3(); this._v2=new T.Vector3(); this._m=new T.Matrix4();
    this.nightHemi=new T.Color(0x34303f); this.dayHemi=new T.Color(0xbcd4f0);
    this.spawnZone='grid'; this.frameCost=16; this.lastRender=0;
    this.buildMaterials(); this.buildWorld(); this.buildCar(); this.buildFx();
    this.scene.traverse(o=>{if(o.material&&!o.material.__nobend&&!o.isSprite)bendable(o.material);});
    Object.values(this.M).flat().forEach(m=>m&&m.isMaterial&&bendable(m));
    this.audio=new RaceAudio();
    this.resize(); this._onResize=()=>this.resize(); window.addEventListener('resize',this._onResize);
    this.lastY=window.scrollY; this.vel=0;
    window.__race=this;
    this.prewarm();
    this.loop=this.loop.bind(this); this._raf=requestAnimationFrame(this.loop);
  }
  destroy(){cancelAnimationFrame(this._raf); window.removeEventListener('resize',this._onResize); this.renderer.dispose();}
  zoneFor(name){
    if(this.timeMode==='day'){const d=Object.assign({},ZONES.day);const src=ZONES[name==='circuit'?'circuitN':name];d.bend=src.bend;d.hill=src.hill;if(name==='city'||name==='creative'||name==='grid'){d.ground=0x3a3940;d.gR=0.7;d.gM=0.1;}if(name==='finish'||name==='highway'){d.ground=0x2c4f63;d.gR=0.2;d.gM=0.6;}return d;}
    if(name==='circuit') return this.timeMode==='night'?ZONES.circuitN:ZONES.day;
    return ZONES[name];
  }
  setTimeMode(m){this.timeMode=m;}

  buildMaterials(){
    const T=THREE, M=this.M={};
    const std=o=>new T.MeshStandardMaterial(o), basic=(c,o={})=>new T.MeshBasicMaterial(Object.assign({color:c},o));
    M.concrete=std({color:0x1d1a22,roughness:0.85,metalness:0.1});
    M.concrete2=std({color:0x24212a,roughness:0.7,metalness:0.25});
    M.light=std({color:0x5e5b64,roughness:0.8,metalness:0.1});
    M.metal=std({color:0x5a5662,roughness:0.35,metalness:0.9});
    M.rock=std({color:0x1a1620,roughness:0.95,metalness:0,flatShading:true});
    M.leaf=std({color:0x284a24,roughness:0.9,flatShading:true}); M.leaf2=std({color:0x335a2a,roughness:0.9,flatShading:true});
    M.trunk=std({color:0x3a2b22,roughness:0.9});
    M.seat=std({color:0x6d35e8,roughness:0.6});
    M.purple=basic(0x8247ff); M.electric=basic(0xa15cff); M.lav=basic(0xc7aeff); M.white=basic(0xe9e4f2);
    M.kerbP=std({color:0x6d35e8,roughness:0.6,emissive:0x36105c,emissiveIntensity:0.25}); M.kerbW=std({color:0xe2dee8,roughness:0.6});
    M.mark=basic(0xd9d4e2,{transparent:true,opacity:0.55});
    const wt=canvasTex(128,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);
      for(let r=0;r<24;r++)for(let c=0;c<8;c++){const v=Math.random();
        if(v<0.06)g.fillStyle=`rgba(225,220,240,${rand(0.4,0.9)})`;else if(v<0.08)g.fillStyle='#8247ff';else if(v<0.16)g.fillStyle='rgba(110,100,130,0.18)';else continue;
        g.fillRect(c*16+3,r*10.6+2,10,6);}});
    M.win=[1,2,3].map(i=>{const t=wt.clone();t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(i,i*2);
      return std({color:0x15131b,roughness:0.25,metalness:0.85,emissive:0xffffff,emissiveMap:t,emissiveIntensity:0.7});});
    M.board=basic(0xffffff,{toneMapped:false});this.svcTex=[];M.board.map=this.serviceTexture(0);
    M.neon=basic(0xd77bff,{toneMapped:false});
    M.palmT=std({color:0x3b2f2a,roughness:0.9});M.palmL=std({color:0x1d3a26,roughness:0.75,side:T.DoubleSide});M.hedge=std({color:0x18301f,roughness:0.95});
    const glowT=canvasTex(64,128,(g,w,h)=>{const gr=g.createRadialGradient(32,64,0,32,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,0.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
    M.refl=[0x8247ff,0xd77bff,0xe9e4f2,0xff3a55].map(c=>basic(c,{map:glowT,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0.55,toneMapped:false}));
    const wt2=canvasTex(128,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);
      for(let r=0;r<32;r++){const lit=Math.random()<0.7;for(let c=0;c<10;c++){const v=Math.random();if(!lit&&v>0.15)continue;
        g.fillStyle=v<0.08?'rgba(160,225,255,0.9)':(v<0.6?`rgba(255,236,200,${rand(0.55,0.95)})`:'rgba(255,236,200,0.15)');g.fillRect(c*12.8+2,r*8+2,9,4.5);}}
      for(let r=0;r<32;r+=4){g.fillStyle='rgba(215,205,255,0.5)';g.fillRect(0,r*8,w,1.5);}});
    M.win2=[1,2].map(i=>{const t=wt2.clone();t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(i,i*2);
      return std({color:0x101218,roughness:0.2,metalness:0.9,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.0});});
    M.trafBody=new T.MeshPhysicalMaterial({color:0x2a2a31,metalness:0.85,roughness:0.3,clearcoat:1});
    M.trafGlass=std({color:0x050508,metalness:0.9,roughness:0.1});
    M.trafTail=basic(0xff3a55,{toneMapped:false});
    M.sponsor=basic(0xffffff,{map:canvasTex(1024,96,(g,w,h)=>{g.fillStyle='#f4f2f7';g.fillRect(0,0,w,h);g.fillStyle='#6d35e8';g.fillRect(0,0,14,h);g.fillRect(w-14,0,14,h);
      g.fillStyle='#0d0a11';g.font='600 52px Raleway,sans-serif';g.textBaseline='middle';g.fillText('CLAIRE ERHUANGA',60,50);g.fillStyle='#6d35e8';g.font='500 34px Raleway,sans-serif';g.fillText('UI/UX LAB  ·  TEST CIRCUIT',560,50);})});
  }
  serviceTexture(i){
    if(this.svcTex[i]) return this.svcTex[i];
    const t=canvasTex(1024,512,(g,w,h)=>{
      g.fillStyle='#0d0a11';g.fillRect(0,0,w,h);
      const P='#8247ff',L='#c7aeff',W='rgba(246,244,248,0.9)',D='rgba(199,174,255,0.28)';
      g.lineWidth=3;g.strokeStyle=D;g.fillStyle=D;
      if(i===0){for(let k=0;k<3;k++){const x=120+k*300,y=60;g.strokeStyle=k===1?P:D;rr(g,x,y,180,340,22);g.stroke();
          g.fillStyle=k===1?'rgba(130,71,255,0.35)':D;g.fillRect(x+20,y+40,140,14);g.fillRect(x+20,y+70,100,10);
          rr(g,x+20,y+100,140,110,8);g.stroke();for(let j=0;j<3;j++)g.fillRect(x+20,y+230+j*26,140-j*30,10);
          if(k<2){g.strokeStyle=L;g.beginPath();g.moveTo(x+200,y+170);g.lineTo(x+280,y+170);g.stroke();g.beginPath();g.moveTo(x+268,y+160);g.lineTo(x+280,y+170);g.lineTo(x+268,y+180);g.stroke();}}}
      if(i===1){for(let k=0;k<6;k++){g.strokeStyle=D;g.strokeRect(60+k*150,60,130,80);g.fillStyle=k===2?'rgba(130,71,255,0.5)':'rgba(199,174,255,0.12)';g.fillRect(64+k*150,64,122,72);}
        for(let r=0;r<4;r++){let x=60;while(x<960){const ww=rand(60,200);g.fillStyle=r===1&&x>300&&x<600?P:D;g.fillRect(x,190+r*48,Math.min(ww,960-x)-6,30);x+=ww;}}
        g.fillStyle=L;g.fillRect(520,170,3,230);}
      if(i===2){const xs=[60,250,440,630,820];xs.forEach((x,k)=>{g.strokeStyle=D;g.strokeRect(x,50,160,360);
          if(k===0){g.fillStyle=P;g.beginPath();g.arc(x+80,170,56,0,7);g.fill();}
          if(k===1){for(let j=0;j<8;j++){g.fillStyle=j%2?D:'rgba(199,174,255,0.08)';g.fillRect(x,50+j*45,160,45);}}
          if(k===2){g.fillStyle=W;g.font='600 92px Raleway,sans-serif';g.fillText('Aa',x+18,200);g.fillStyle=D;g.fillRect(x+18,240,120,8);g.fillRect(x+18,260,90,8);}
          if(k===3){g.strokeStyle=L;g.beginPath();g.moveTo(x,410);g.lineTo(x+160,50);g.stroke();g.fillStyle='rgba(130,71,255,0.4)';g.fillRect(x+20,300,60,90);}
          if(k===4){g.strokeStyle=P;for(let j=0;j<5;j++){g.beginPath();g.arc(x+80,230,20+j*14,0,7);g.stroke();}}});}
      if(i===3){for(let r=0;r<11;r++){const ind=[0,1,2,2,1,2,3,3,2,1,0][r];g.fillStyle=r%4===1?L:D;g.fillRect(70+ind*26,70+r*30,rand(120,300),12);}
        g.strokeStyle=L;g.beginPath();g.moveTo(480,240);g.lineTo(560,240);g.stroke();g.beginPath();g.moveTo(546,228);g.lineTo(560,240);g.lineTo(546,252);g.stroke();
        g.strokeStyle=P;rr(g,610,60,340,360,18);g.stroke();g.fillStyle='rgba(130,71,255,0.35)';rr(g,640,100,280,90,10);g.fill();
        g.fillStyle=D;g.fillRect(640,215,200,12);g.fillRect(640,240,150,12);rr(g,640,350,130,44,22);g.fillStyle=P;g.fill();}
      if(i===4){g.fillStyle=W;g.font='600 86px Raleway,sans-serif';g.fillText('Saved.',70,150);g.fillStyle=P;g.fillText('Try again?',70,260);g.fillStyle='rgba(246,244,248,0.45)';g.fillText('You\u2019re all set.',70,370);}
      if(i===5){g.strokeStyle=D;g.lineWidth=2;for(let x=0;x<=w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<=h;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
        g.beginPath();g.arc(512,236,150,0,7);g.stroke();g.beginPath();g.arc(512,236,96,0,7);g.stroke();
        g.lineWidth=26;g.strokeStyle=P;g.beginPath();g.arc(512,236,123,0.6,5.7);g.stroke();g.fillStyle=W;g.fillRect(500,224,150,24);}
      g.fillStyle='rgba(130,71,255,0.9)';g.fillRect(48,h-74,w-96,2);
      g.fillStyle=W;g.font='500 26px Raleway,sans-serif';g.fillText(`0${i+1}  ${SVC_NAMES[i]}`,48,h-34);
    });
    this.svcTex[i]=t; return t;
  }

  buildWorld(){
    const T=THREE,s=this.scene,M=this.M;
    this.skyMat=new T.ShaderMaterial({uniforms:{top:{value:new T.Color()},hor:{value:new T.Color()},glow:{value:0},sunDir:{value:new T.Vector3(0.15,0.5,-1).normalize()},sunCol:{value:new T.Color()},sunAmt:{value:0},clouds:{value:0},uTime:{value:0}},
      vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:[
        'uniform vec3 top;uniform vec3 hor;uniform float glow;uniform vec3 sunDir;uniform vec3 sunCol;uniform float sunAmt;uniform float clouds;uniform float uTime;varying vec3 vP;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
        'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}',
        'void main(){vec3 d=normalize(vP);float h=clamp(d.y,0.,1.);vec3 c=mix(hor,top,pow(h,0.45));',
        'c+=vec3(.5,.22,.9)*exp(-pow(d.y*12.,2.))*glow*.5;',
        'float sd=max(dot(d,normalize(sunDir)),0.);c+=sunCol*(pow(sd,900.)*6.+pow(sd,14.)*.4+pow(sd,3.)*.08)*sunAmt;',
        'if(d.y>0.&&clouds>0.01){vec2 uv=d.xz/(d.y+.12)*1.3+vec2(uTime*.006,0.);float cl=smoothstep(.5,.8,fbm(uv));vec3 cc=mix(vec3(1.),hor,.25)*(.82+.18*h)+sunCol*pow(sd,6.)*.3;c=mix(c,cc,cl*clouds*smoothstep(0.,.2,d.y)*.9);}',
        'gl_FragColor=vec4(c,1.);}'].join('\n'),
      side:T.BackSide,depthWrite:false}); this.skyMat.__nobend=true;
    this.sky=new T.Mesh(new T.SphereGeometry(600,32,16),this.skyMat); s.add(this.sky);
    this.groundMat=new T.MeshStandardMaterial({color:0x09080c,roughness:0.35,metalness:0.5});
    const ground=new T.Mesh(new T.PlaneGeometry(1800,1800,40,300),this.groundMat); ground.rotation.x=-Math.PI/2; ground.position.y=-0.03; s.add(ground);
    this.roadTex=canvasTex(256,1024,(g,w,h)=>{g.fillStyle='#2a282e';g.fillRect(0,0,w,h);
      for(let i=0;i<9000;i++){const v=Math.random();g.fillStyle=v<0.5?`rgba(255,255,255,${rand(0,0.06)})`:`rgba(0,0,0,${rand(0,0.12)})`;g.fillRect(Math.random()*w,Math.random()*h,rand(1,2),rand(1,2));}
      for(let k=0;k<5;k++){const x=rand(60,200),gr=g.createLinearGradient(0,0,0,h);g.fillStyle=`rgba(0,0,0,${rand(0.08,0.18)})`;g.fillRect(x,rand(0,h*0.5),rand(4,9),rand(200,500));}
      g.fillStyle='rgba(0,0,0,0.12)';g.fillRect(w*0.32,0,18,h);g.fillRect(w*0.62,0,18,h);
      g.fillStyle='rgba(235,230,240,0.85)';g.fillRect(8,0,5,h);g.fillRect(w-13,0,5,h);
      [0.25,0.5,0.75].forEach(f=>{for(let y=0;y<h;y+=256)g.fillRect(w*f-1.5,y,3,110);});});
    this.roadTex.wrapS=this.roadTex.wrapT=T.RepeatWrapping; this.roadTex.repeat.set(1,600/48);
    this.roadMat=new T.MeshStandardMaterial({map:this.roadTex,roughness:0.55,metalness:0.3,color:0x9a98a0});
    const road=new T.Mesh(new T.PlaneGeometry(17,600,1,300),this.roadMat); road.rotation.x=-Math.PI/2; road.position.set(0,0,-270); s.add(road);
    const lineGeo=new T.PlaneGeometry(0.3,600,1,300);
    this.lineP=new T.Mesh(lineGeo,new T.MeshBasicMaterial({color:0x8247ff,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
    this.lineG=new T.Mesh(lineGeo,new T.MeshBasicMaterial({color:0x5a5560,transparent:true,opacity:0,depthWrite:false}));
    [this.lineP,this.lineG].forEach(l=>{l.rotation.x=-Math.PI/2;l.position.set(0,0.012,-270);s.add(l);});
    this.hemi=new T.HemisphereLight(0x34303f,0x050408,0.5); s.add(this.hemi);
    this.sunLight=new T.DirectionalLight(0xa597ff,0.3); this.sunLight.position.set(-12,40,-60); s.add(this.sunLight);
    this.pass=[new T.PointLight(0x8247ff,0,20,1.8),new T.PointLight(0xd8ccff,0,20,1.8)]; this.pass.forEach(l=>s.add(l));
    const pm=new T.PMREMGenerator(this.renderer);
    const envN=canvasTex(1024,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b0812');gr.addColorStop(0.5,'#1a0f2a');gr.addColorStop(0.52,'#07060a');gr.addColorStop(1,'#040306');g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.fillStyle='rgba(130,71,255,0.95)';g.fillRect(0,250,w,6);g.fillStyle='rgba(215,123,255,0.9)';g.fillRect(80,200,260,14);g.fillRect(620,215,180,10);g.fillStyle='rgba(255,236,200,0.8)';for(let i=0;i<30;i++)g.fillRect(Math.random()*w,rand(90,240),3,3);
      for(let i=0;i<18;i++){g.fillStyle=i%3?'rgba(199,174,255,0.9)':'rgba(255,255,255,0.95)';g.fillRect(Math.random()*w,rand(120,235),rand(20,110),rand(3,8));}
      g.fillStyle='#4a3a6a';g.fillRect(280,30,460,50);});
    envN.mapping=T.EquirectangularReflectionMapping;
    const envD=canvasTex(1024,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3f78c8');gr.addColorStop(0.47,'#dfe8f2');gr.addColorStop(0.5,'#8d9a86');gr.addColorStop(1,'#2c3826');g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.fillStyle='rgba(255,250,235,1)';g.beginPath();g.arc(560,110,26,0,7);g.fill();for(let i=0;i<10;i++){g.fillStyle='rgba(255,255,255,0.7)';g.fillRect(rand(0,w),rand(140,220),rand(60,200),rand(10,24));}});
    envD.mapping=T.EquirectangularReflectionMapping;
    this.envN=pm.fromEquirectangular(envN).texture; this.envD=pm.fromEquirectangular(envD).texture;
    this.scene.environment=this.envN; this.envIsDay=false;
    this.G={box:new T.BoxGeometry(1,1,1),plane:new T.PlaneGeometry(1,1),cone:new T.ConeGeometry(1,1,6),cone5:new T.ConeGeometry(1,1,5)};
    this.SP=12; this.N=this.mobile?32:44; this.slots=[]; this.counter=0;
    for(let i=0;i<this.N;i++){const g=new T.Group();g.position.z=30-(i+1)*this.SP;s.add(g);this.buildSlot(g,'grid',this.counter++);this.slots.push(g);}
    this.skyMat2=new T.MeshBasicMaterial({color:0x0c0a12,transparent:true,opacity:0,fog:false}); this.skyMat2.__nobend=true;
    this.winFar=new T.MeshBasicMaterial({color:0xc7aeff,transparent:true,opacity:0,fog:false}); this.winFar.__nobend=true;
    this.skyline=new T.Group();
    for(let i=0;i<46;i++){const h=rand(40,150),w=rand(14,36),x=rand(-340,340);const b=new T.Mesh(this.G.box,this.skyMat2);b.scale.set(w,h,20);b.position.set(x,h/2,rand(-420,-480));this.skyline.add(b);
      if(Math.random()<0.5){const st=new T.Mesh(this.G.box,this.winFar);st.scale.set(w*0.9,0.6,1);st.position.set(x,h*rand(0.5,0.95),b.position.z+10.6);this.skyline.add(st);}}
    s.add(this.skyline);
    this.mtnMat=new T.MeshBasicMaterial({color:0x2a1440,transparent:true,opacity:0,fog:false}); this.mtnMat.__nobend=true;
    this.mtns=new T.Group();
    for(let i=0;i<22;i++){const m=new T.Mesh(this.G.cone5,this.mtnMat);const r=rand(60,150),h=rand(30,95);m.scale.set(r,h,r);m.position.set(rand(-420,420),h/2-2,rand(-470,-540));m.rotation.y=Math.random()*3;this.mtns.add(m);}
    s.add(this.mtns);
    const F=this.finish=new T.Group();
    const chk=canvasTex(256,32,(g,w,h)=>{for(let x=0;x<16;x++)for(let y=0;y<2;y++){g.fillStyle=(x+y)%2?'#0a0a0c':'#efeaf5';g.fillRect(x*16,y*16,16,16);}});
    const line=new T.Mesh(new T.PlaneGeometry(17,2.2),new T.MeshBasicMaterial({map:chk}));line.rotation.x=-Math.PI/2;line.position.y=0.015;F.add(line);
    [-9.6,9.6].forEach(x=>{const p=new T.Mesh(this.G.box,M.metal);p.scale.set(0.5,7.5,0.5);p.position.set(x,3.75,0);F.add(p);});
    const bar=new T.Mesh(this.G.box,M.white);bar.scale.set(20,0.5,0.5);bar.position.y=7.5;F.add(bar);
    const bar2=new T.Mesh(this.G.box,M.purple);bar2.scale.set(20,0.08,0.6);bar2.position.y=7.15;F.add(bar2);
    F.visible=false; s.add(F);
  }
  buildSlot(slotG,zone,idx){
    const cache=slotG.userData.c||(slotG.userData.c={});
    for(const k in cache)cache[k].visible=(k===zone);
    if(cache[zone])return;
    const slot=new THREE.Group();cache[zone]=slot;slotG.add(slot);
    const M=this.M,S=this.SP,G=this.G,T=THREE;
    const add=(mat,sx,sy,sz,x,y,z,ry,geo)=>{const o=new T.Mesh(geo||G.box,mat);o.scale.set(sx,sy,sz);o.position.set(x,y,z||0);if(ry)o.rotation.y=ry;slot.add(o);return o;};
    const flat=(mat,sx,sz,x,z,y)=>{const o=new T.Mesh(G.plane,mat);o.rotation.x=-Math.PI/2;o.scale.set(sx,sz,1);o.position.set(x,y||0.03,z||0);slot.add(o);return o;};
    const lamp=(x,mat)=>{const sd=Math.sign(x);add(M.metal,0.16,8,0.16,x,4,0);add(M.metal,2.2,0.12,0.12,x-sd*1.1,8,0);add(mat||M.purple,1.4,0.06,0.3,x-sd*1.7,7.92,0);
      flat(mat===M.lav?M.refl[2]:M.refl[0],1.8,14,x-sd*1.9,4);};
    const palm=(x,z,s)=>{s=s||rand(0.9,1.25);const g=new T.Group();g.position.set(x,0,z||0);slot.add(g);const lean=rand(-0.12,0.12);
      for(let k=0;k<4;k++){const tr=new T.Mesh(G.box,M.palmT);tr.scale.set(0.32*s-k*0.03,2.1*s,0.32*s-k*0.03);tr.position.set(lean*k*2*s,(1.05+k*2.05)*s,0);tr.rotation.z=-lean;g.add(tr);}
      const top=new T.Group();top.position.set(lean*8*s,8.2*s,0);g.add(top);
      for(let k=0;k<8;k++){const f=new T.Group();f.rotation.y=k*Math.PI/4+rand(-0.2,0.2);top.add(f);const l=new T.Mesh(G.box,M.palmL);l.scale.set(0.7*s,0.04,3.4*s);l.position.set(0,-0.6*s,1.5*s);l.rotation.x=0.55+rand(0,0.3);f.add(l);}};
    const tree=(x,z,s)=>{s=s||rand(0.8,1.4);add(M.trunk,0.35*s,2.2*s,0.35*s,x,1.1*s,z);add(Math.random()<0.5?M.leaf:M.leaf2,2.4*s,4.2*s,2.4*s,x,3.6*s,z,Math.random()*3,G.cone);add(M.leaf2,1.8*s,3.2*s,1.8*s,x,5.4*s,z,Math.random()*3,G.cone);};
    const tall=this.mobile?0.7:1;
    const zz=zone==='circuit'?'circuit':zone;
    if(zz==='grid'){
      add(M.concrete,12,5,S*0.98,-30,2.5);add(M.purple,0.1,0.1,S*0.98,-23.94,4.4);
      add(M.concrete,0.6,1,S,-9.2,0.5);add(M.lav,0.62,0.05,S,-9.2,1.0);add(M.concrete,0.6,1,S,9.2,0.5);
      if(idx%2===0) lamp(10.6,M.lav);
      const lx=idx%2?-2.1:2.1;add(M.mark,2.2,0.01,0.12,lx,0.02,-1.4);add(M.mark,0.12,0.01,1.2,lx-1.1,0.02,-0.9);add(M.mark,0.12,0.01,1.2,lx+1.1,0.02,-0.9);
    } else if(zz==='city'){
      [-1,1].forEach(sd=>{const bw=rand(9,18),bh=rand(22,80)*tall,bd=S*rand(0.7,0.98),bx=sd*(rand(16,22)+bw/2);
        const mat=Math.random()<0.5?M.win2[Math.floor(Math.random()*2)]:M.win[Math.floor(Math.random()*3)];
        add(mat,bw,bh,bd,bx,bh/2,rand(-1,1));
        if(Math.random()<0.7){const h2=rand(50,130)*tall,w2=rand(12,22);add(M.win2[1],w2,h2,S*0.9,sd*(rand(38,52)+w2/2),h2/2,0);}
        if(Math.random()<0.3) add(M.neon,0.12,rand(4,12),1.2,bx-sd*(bw/2+0.08),rand(6,16),rand(-2,2));
        add(M.concrete,5.4,0.22,S,sd*11.2,0.11,0);});
      add(M.hedge,1.8,0.8,S*0.96,11.6,0.6);
      if(idx%2===0) palm(11.6,rand(-2,2));
      if(idx%3===0) palm(-11.8,rand(-2,2),rand(1.1,1.4));
      if(idx%2===1){lamp(9.2);lamp(-9.2,M.lav);}
      if(idx%4===1){add(M.concrete2,7.5,0.5,S*0.92,-12.8,5.4);
        const u=new T.Mesh(G.plane,M.neon);u.rotation.x=Math.PI/2;u.scale.set(7.3,S*0.9,1);u.position.set(-12.8,5.13,0);slot.add(u);
        add(M.neon,0.1,0.1,S*0.92,-9.0,5.1);[-1,1].forEach(o=>add(M.metal,0.3,5.2,0.3,-9.6,2.6,o*S*0.4));
        flat(M.refl[1],10,S*1.3,-10.5,1.5);}
      if(idx%9===4){add(M.concrete,80,1.6,5,0,9,0);add(M.neon,80,0.06,0.1,0,8.18,2.45);add(M.concrete,1.4,8.2,3,-10.5,4.1,0);add(M.concrete,1.4,8.2,3,10.5,4.1,0);flat(M.refl[1],17,6,0,5);}
    } else if(zz==='creative'){
      [-1,1].forEach(sd=>{const w=rand(10,18),h=rand(7,14),d=S*rand(0.7,0.95),x=sd*(17+w/2);
        add(M.concrete2,w,h,d,x,h/2);add(M.lav,0.08,0.08,d,x-sd*(w/2+0.05),h-0.6);
        add(M.concrete,5,0.25,S,sd*11,0.12,0);});
      if(idx%3===0){add(M.metal,0.35,7,0.35,13.5,3.5,0);
        const b=new T.Mesh(G.plane,M.board);b.scale.set(14,7,1);b.position.set(14,9.8,0);b.rotation.y=-0.5;slot.add(b);
        add(M.purple,14,0.08,0.08,14,6.25,0,-0.5);}
      if(idx%3===1){for(let k=0;k<5;k++){const h=rand(3,10);add(k%2?M.purple:M.lav,0.25,h,0.25,-13-k*1.4,h/2,rand(-3,3));}}
      if(idx%2===0) lamp(9.2,M.lav);
    } else if(zz==='circuit'){
      [-1,1].forEach(sd=>{
        add(idx%2?M.kerbP:M.kerbW,1.1,0.1,S,sd*9.05,0.05);
        add(M.light,4,0.03,S,sd*12.2,0.02);
        add(M.metal,0.12,0.38,S,sd*14.4,0.62);add(M.metal,0.12,0.38,S,sd*14.4,0.98);
        add(M.metal,0.14,0.9,0.14,sd*14.55,0.45,0);
        add(M.metal,0.08,4.2,0.08,sd*15.4,2.1,0);add(M.metal,0.05,0.05,S,sd*15.4,4.15,0);
        if(Math.random()<0.75)tree(sd*rand(24,34),rand(-5,5));
        if(Math.random()<0.6)tree(sd*rand(40,70),rand(-5,5),rand(1.3,2));
      });
      if(idx%5===2){for(let k=0;k<4;k++){add(M.light,3,1.2+k*1.3,S*0.92,-19-k*2.6,(1.2+k*1.3)/2,0);add(M.seat,2.6,0.3,S*0.9,-19-k*2.6,1.2+k*1.3+0.12,0);}
        add(M.light,13,0.3,S*0.95,-23,8.2,0);[-1,1].forEach(o=>add(M.metal,0.25,3,0.25,-17.5,6.7,o*S*0.42));}
      if(idx%11===6){[-1,1].forEach(sd=>add(M.light,0.8,8,0.8,sd*13,4,0));add(M.light,27,1.6,1.2,0,8.4,0);
        const b=new T.Mesh(G.plane,M.sponsor);b.scale.set(25,1.5,1);b.position.set(0,8.4,0.62);slot.add(b);}
    } else if(zz==='world'){
      [-1,1].forEach(sd=>{if(Math.random()<0.7){const h=rand(2,9);add(M.concrete,rand(6,16),h,rand(6,10),sd*rand(26,70),h/2,rand(-3,3));}add(M.purple,0.08,0.12,0.12,sd*8.45,0.1,0);});
      if(idx%3===0) lamp(9.2,M.lav);
    } else {
      [-1,1].forEach(sd=>{add(M.metal,0.15,0.5,S,sd*9,0.7,0);add(M.metal,0.12,0.8,0.12,sd*9.05,0.4,0);add(M.purple,0.05,0.12,0.12,sd*8.9,0.75,0);});
      if(Math.random()<0.8){const w=rand(10,26),h=rand(6,30)*tall;add(M.rock,w,h,S,18+w/2+rand(0,6),h/2-1,0);}
      if(Math.random()<0.35)tree(rand(14,18),rand(-4,4),rand(0.8,1.2));
      if(idx%5===0) lamp(10.2);
    }
  }
  prewarm(){
    const T=THREE,zones=['grid','city','creative','circuit','world','highway','finish'];
    // build every zone into every slot ahead of time, in idle chunks, so no zone change allocates mid-drive
    const jobs=[];zones.forEach(z=>this.slots.forEach((g,i)=>jobs.push([g,z,i])));
    const keep=this.slots.map(g=>this.spawnZone);
    const idle=window.requestIdleCallback||(f=>setTimeout(()=>f({timeRemaining:()=>8}),16));
    const run=dl=>{while(jobs.length&&dl.timeRemaining()>2){const [g,z,i]=jobs.shift();const c=g.userData.c||{};
        if(!c[z]){const vis={};for(const k in c)vis[k]=c[k].visible;this.buildSlot(g,z,i);for(const k in c)c[k].visible=vis[k]||false;g.userData.c[z].visible=(z===g.userData.zone);}}
      if(jobs.length)idle(run);else this.compileAll();};
    this.slots.forEach(g=>g.userData.zone='grid');
    idle(run);
    for(let i=0;i<6;i++)this.serviceTexture(i);
  }
  compileAll(){
    // make every cached group visible for one compile pass, then restore
    const hidden=[];this.scene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true;}});
    try{this.renderer.compile(this.scene,this.camera);}catch(err){}
    hidden.forEach(o=>o.visible=false);
    this.svcTex.forEach(t=>this.renderer.initTexture&&this.renderer.initTexture(t));
    this.warm=true;
  }
  rebuildAll(zone){this.slots.forEach(g=>{g.userData.zone=zone;this.buildSlot(g,zone,this.counter++);});}

  buildCar(){
    const T=THREE,s=this.scene,M=this.M;
    const car=this.car=new T.Group(), body=this.body=new T.Group(); car.add(body); s.add(car); car.position.x=-2.1;
    const carbonTex=canvasTex(64,64,(g)=>{for(let x=0;x<8;x++)for(let y=0;y<8;y++){const gr=g.createLinearGradient(x*8,y*8,x*8+8,y*8+8);const a=(x+y)%2;gr.addColorStop(0,a?'#1b1a20':'#0b0b0e');gr.addColorStop(1,a?'#0b0b0e':'#1b1a20');g.fillStyle=gr;g.fillRect(x*8,y*8,8,8);}});
    carbonTex.wrapS=carbonTex.wrapT=T.RepeatWrapping; carbonTex.repeat.set(6,6);
    const paint=this.paint=new T.MeshPhysicalMaterial({color:0x121116,metalness:0.8,roughness:0.24,clearcoat:1,clearcoatRoughness:0.04,envMapIntensity:1.2});
    const carbon=new T.MeshStandardMaterial({color:0x2a2830,roughness:0.5,metalness:0.4,map:carbonTex});
    const glass=new T.MeshPhysicalMaterial({color:0x050408,metalness:0.95,roughness:0.04,clearcoat:1,envMapIntensity:2.2});
    const tyre=new T.MeshStandardMaterial({color:0x050506,roughness:0.75,metalness:0.2});
    const rim=new T.MeshStandardMaterial({color:0x26232b,metalness:0.95,roughness:0.28});
    this.headMat=new T.MeshBasicMaterial({color:0xede6ff,toneMapped:false});
    this.tailMat=new T.MeshBasicMaterial({color:0xa15cff,toneMapped:false});
    const plateTex=canvasTex(128,32,(g,w,h)=>{g.fillStyle='#e9e6ee';g.fillRect(0,0,w,h);g.fillStyle='#0d0a11';g.font='600 22px Raleway,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('CE · 01',64,17);});
    const ext=(pts,depth,bev,mat)=>{const sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>sh.lineTo(p[0],p[1]));sh.closePath();
      const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:bev,bevelSize:bev*0.6,bevelSegments:3,steps:1});g.translate(0,0,-depth/2);
      const m=new T.Mesh(g,mat);m.rotation.y=-Math.PI/2;body.add(m);return m;};
    ext([[-2.38,0.22],[-2.46,0.36],[-2.3,0.5],[-1.55,0.66],[-0.85,0.76],[0.95,0.8],[1.75,0.84],[2.32,0.8],[2.42,0.56],[2.32,0.24]],1.72,0.14,paint);
    ext([[-0.95,0.74],[-0.15,1.1],[0.75,1.12],[1.55,0.86],[1.6,0.78],[-0.95,0.72]],1.2,0.1,glass);
    const box=(mat,sx,sy,sz,x,y,z,ry,rz)=>{const o=new T.Mesh(this.G.box,mat);o.scale.set(sx,sy,sz);o.position.set(x,y,z);if(ry)o.rotation.y=ry;if(rz)o.rotation.z=rz;body.add(o);return o;};
    [-1,1].forEach(sd=>{
      box(paint,0.2,0.36,1.5,sd*1.02,0.6,1.35,0,sd*-0.12);
      box(paint,0.14,0.22,1.15,sd*0.98,0.54,-1.45,0,sd*-0.08);
      box(carbon,0.06,0.3,0.9,sd*1.02,0.48,0.45);box(carbon,0.06,0.08,2.6,sd*1.0,0.24,0);box(M.electric,0.014,0.014,2.6,sd*1.012,0.34,0);
      box(this.headMat,0.55,0.035,0.05,sd*0.62,0.52,-2.36,sd*0.25);
      box(this.tailMat,0.42,0.07,0.05,sd*0.66,0.66,2.45);box(this.tailMat,0.05,0.2,0.05,sd*0.9,0.6,2.44);
      box(carbon,0.12,0.12,0.12,sd*0.36,0.3,2.44);
    });
    box(this.tailMat,0.9,0.025,0.04,0,0.7,2.45);
    const plate=new T.Mesh(this.G.plane,new T.MeshBasicMaterial({map:plateTex}));plate.scale.set(0.52,0.13,1);plate.position.set(0,0.42,2.51);body.add(plate);
    box(carbon,2.1,0.04,0.42,0,1.18,2.12);[-0.5,0.5].forEach(x=>box(carbon,0.04,0.34,0.16,x,1.0,2.15));
    [-1,1].forEach(sd=>box(carbon,0.03,0.22,0.5,sd*1.05,1.12,2.12));
    box(carbon,2.06,0.035,0.42,0,0.2,-2.25);box(carbon,1.8,0.12,0.3,0,0.26,2.36);
    this.wheels=[];
    const tg=new T.CylinderGeometry(0.38,0.38,0.34,28),rg=new T.CylinderGeometry(0.27,0.27,0.35,14);
    [[-0.98,-1.48],[0.98,-1.48],[-1.0,1.52],[1.0,1.52]].forEach(([x,z])=>{
      const steer=new T.Group();steer.position.set(x,0.38,z);car.add(steer);
      const spin=new T.Group();steer.add(spin);
      const t=new T.Mesh(tg,tyre);t.rotation.z=Math.PI/2;spin.add(t);const r=new T.Mesh(rg,rim);r.rotation.z=Math.PI/2;spin.add(r);
      for(let k=0;k<5;k++){const sp=new T.Mesh(this.G.box,carbon);sp.scale.set(0.36,0.46,0.05);sp.rotation.x=k*Math.PI*2/5;spin.add(sp);}
      const cal=new T.Mesh(this.G.box,M.purple);cal.scale.set(0.08,0.14,0.2);cal.position.set(-Math.sign(x)*0.06,0.12,0.12);steer.add(cal);
      this.wheels.push({steer,spin,front:z<0});});
    const radial=(inner,outer)=>canvasTex(128,128,(g,w,h)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,inner);gr.addColorStop(1,outer);g.fillStyle=gr;g.fillRect(0,0,w,h);});
    const shadow=new T.Mesh(this.G.plane,new T.MeshBasicMaterial({map:radial('rgba(0,0,0,0.95)','rgba(0,0,0,0)'),transparent:true,depthWrite:false}));
    shadow.scale.set(3.4,6.4,1);shadow.rotation.x=-Math.PI/2;shadow.position.y=0.015;car.add(shadow);
    this.glowMat=new T.MeshBasicMaterial({map:radial('rgba(130,71,255,1)','rgba(130,71,255,0)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0.3,toneMapped:false});
    const glow=new T.Mesh(this.G.plane,this.glowMat);glow.scale.set(3.0,5.8,1);glow.rotation.x=-Math.PI/2;glow.position.y=0.02;car.add(glow);
    const flare=radial('rgba(255,255,255,1)','rgba(255,255,255,0)');
    this.tailGlow=new T.SpriteMaterial({map:flare,color:0xa15cff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0.5,toneMapped:false});
    this.headGlow=new T.SpriteMaterial({map:flare,color:0xe6dcff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0,toneMapped:false});
    [-0.66,0.66].forEach(x=>{const t=new T.Sprite(this.tailGlow);t.scale.set(0.9,0.5,1);t.position.set(x,0.66,2.55);body.add(t);
      const h=new T.Sprite(this.headGlow);h.scale.set(0.9,0.5,1);h.position.set(x*0.94,0.52,-2.45);body.add(h);});
    this.spots=[];
    [-0.62,0.62].forEach(x=>{const sp=new T.SpotLight(0xe0d4ff,0,45,0.5,0.7,1.2);sp.position.set(x,0.55,-2.3);sp.target.position.set(x*1.3,0,-18);car.add(sp);car.add(sp.target);this.spots.push(sp);});
    this.tailLight=new T.PointLight(0x8247ff,1.2,7,2);this.tailLight.position.set(0,0.6,3.0);car.add(this.tailLight);
  }
  buildFx(){
    const T=THREE;
    this.streakMat=new T.MeshBasicMaterial({color:0xc7aeff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
    const n=this.mobile?40:90; this.streaks=new T.InstancedMesh(this.G.box,this.streakMat,n); this.streakData=[];
    for(let i=0;i<n;i++){const sd=Math.random()<0.5?-1:1;this.streakData.push({x:sd*rand(4,14),y:rand(0.2,3.2),z:rand(-120,15)});}
    this.scene.add(this.streaks);
    const st=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(200,190,215,0.6)');gr.addColorStop(1,'rgba(200,190,215,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
    this.traffic=[];const lanes=[-6.4,6.4,-6.4,6.4];
    for(let i=0;i<(this.mobile?2:4);i++){const g=new T.Group(),M=this.M;
      const b=new T.Mesh(this.G.box,M.trafBody);b.scale.set(1.9,0.62,4.4);b.position.y=0.55;g.add(b);
      const c=new T.Mesh(this.G.box,M.trafGlass);c.scale.set(1.5,0.5,2.1);c.position.set(0,1.1,0.3);g.add(c);
      const tl=new T.Mesh(this.G.box,M.trafTail);tl.scale.set(1.75,0.08,0.05);tl.position.set(0,0.72,2.21);g.add(tl);
      [-0.95,0.95].forEach(x=>[-1.4,1.4].forEach(z=>{const w=new T.Mesh(this.G.box,M.concrete);w.scale.set(0.3,0.6,0.6);w.position.set(x,0.3,z);g.add(w);}));
      const rf=new T.Mesh(this.G.plane,M.refl[3]);rf.rotation.x=-Math.PI/2;rf.scale.set(2.2,7,1);rf.position.set(0,0.03,5.2);g.add(rf);
      g.position.set(lanes[i],0,-60-i*70);g.userData={v:rand(18,28)};this.scene.add(g);this.traffic.push(g);}
    this.smoke=[];for(let i=0;i<26;i++){const m=new T.SpriteMaterial({map:st,transparent:true,opacity:0,depthWrite:false});const sp=new T.Sprite(m);sp.visible=false;this.scene.add(sp);this.smoke.push({sp,life:0});}
  }

  setJourney(j){Object.assign(this.state,j);}
  cut(name){this.override=name;this.snap=true;}
  blendTo(name,k){this.override=name;this.blendK=k||1.8;}
  release(){this.override=null;this.speedOverride=null;this.blendK=1.6;}
  setExposure(v,instant){this.expTarget=v;if(instant)this.exposure=v;}
  setRev(v){this.rev=v;}
  setSteer(v){this.steer=v;}
  ignite(){this.engineOn=true;}
  launch(){this.speedOverride=this.reduced?30:88;this.shake=this.reduced?0:1;this.smokeT=this.reduced?0:0.9;this.blendTo('lowRear',3);this.state.started=true;}
  travel(on){if(on){this.blendTo('lowRear',2);this.speedOverride=92;this.shake=this.reduced?0:0.35;}else this.release();}
  setDestination(d){this.dest=d;if(d){this.audio.muted=false;}else{this.ambient=false;this.audio.muted=false;}}
  arrive(){this.override=null;this.speedOverride=null;this.blendK=0.85;this.shake=0;}
  setAmbient(b){this.ambient=b;this.audio.muted=b;}
  setPaused(b){this.paused=b;this.audio.muted=b;if(!b)this.clock.getDelta();}
  silence(){this.audio.muted=true;}
  finishLine(cb){this.finish.visible=true;this.finish.position.z=-240;this.finishCb=cb;this.crossed=false;this.stopping=false;}
  resume(){this.finish.visible=false;this.stopping=false;this.audio.muted=false;if(this.override==='hero')this.override=null;}
  reset(){this.finish.visible=false;this.stopping=false;this.audio.muted=false;this.engineOn=false;this.rev=0;this.speed=0;this.speedOverride=null;this.laneOff=0;
    this.state.started=false;this.state.seg=0;this.rebuildAll('grid');this.car.position.x=-2.1;this.cut('hero');}
  resize(){const w=this.c.clientWidth||innerWidth,h=this.c.clientHeight||innerHeight;this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  journeyShot(S){
    if(!S.started) return 'hero';
    switch(S.seg){case 0:return 'chase';case 1:return S.p<0.18?'chase':'side';case 2:return 'creative';
      case 3:return S.sector===4?'roof':(S.sector===5?'chase':'circuit');case 4:return 'overhead';case 5:return S.p<0.22?'chase':'highway';default:return 'lowRear';}
  }
  loop(){
    this._raf=requestAnimationFrame(this.loop);
    const now=performance.now();
    const rawDt=this.clock.getDelta();
    this.ft=lerp(this.ft||16,rawDt*1000,0.05);
    if(!this._qT)this._qT=now;
    if(now-this._qT>1500&&!this.paused&&document.visibilityState==='visible'){this._qT=now;
      const pr=this.renderer.getPixelRatio(),max=this.ambient?1:this.dpr;
      let np=pr;if(this.ft>24&&pr>0.75)np=Math.max(0.75,pr-0.25);else if(this.ft<15&&pr<max)np=Math.min(max,pr+0.25);else if(pr>max)np=max;
      if(np!==pr){this.renderer.setPixelRatio(np);this.resize();}}
    this._acc=(this._acc||0)+rawDt;
    if(this.ambient){this._skip=!this._skip;if(this._skip)return;}
    const dt=Math.min(this._acc,0.05);this._acc=0; this.t+=dt;
    const y=window.scrollY,v=(y-this.lastY)/Math.max(dt,1e-3); this.lastY=y; this.vel=damp(this.vel,Math.abs(v),5,dt);
    if(this.paused) return;
    const T=THREE,S=this.state,M=this.M;
    const zoneName=this.dest?this.dest.zone:(S.seg===0?(S.started?'city':'grid'):SEG_ZONE[S.seg]);
    this.spawnZone=zoneName;
    let target=0;
    if(this.speedOverride!=null) target=this.speedOverride;
    else if(S.started){const cruise=S.seg===6?lerp(40,95,clamp(S.p*1.6,0,1)):CRUISE[S.seg];target=cruise*(0.45+0.75*clamp(this.vel/1400,0,1));}
    if(this.dest&&this.speedOverride==null) target=this.dest.speed;
    if(this.stopping) target=0;
    if(this.reduced) target*=0.4;
    const prevSpeed=this.speed; this.speed=damp(this.speed,target,target>this.speed?1.6:(this.stopping?0.9:1.1),dt);
    const accel=(this.speed-prevSpeed)/Math.max(dt,1e-3);
    let lane=-2.1;
    if(this.dest)lane=this.dest.lane;else if(S.started){if(S.seg===2)lane=2.1;else if(S.seg===3)lane=S.sector===5?(S.sectorP>0.35?1.5:-1.5):0;else if(S.seg===4||S.seg===6)lane=0;}
    if(S.started&&this.steer)this.laneOff=clamp(this.laneOff+this.steer*dt*7,-6.4-lane,6.4-lane);else this.laneOff=damp(this.laneOff,0,0.25,dt);
    lane+=this.laneOff;
    const px=this.car.position.x; this.car.position.x=damp(px,lane,this.steer?4:1.3,dt); const dx=(this.car.position.x-px)/Math.max(dt,1e-3);
    const sn=clamp(this.speed/95,0,1);
    const zc=this.zc;
    const bx=zc.bend*(Math.sin(this.dist/520)*0.75+Math.sin(this.dist/190+1.3)*0.25)*clamp(this.speed/20,0,1)*(this.reduced?0.3:1);
    const by=zc.hill*Math.sin(this.dist/340+0.5);
    BEND.uBendX.value=damp(BEND.uBendX.value,S.started?bx:0,1.2,dt); BEND.uBendY.value=damp(BEND.uBendY.value,S.started?by:0,1.2,dt);
    const bend=BEND.uBendX.value;
    this.car.rotation.y=damp(this.car.rotation.y,-dx*0.05-bend*60+Math.sin(this.t*0.7)*0.008*sn,6,dt);
    const vib=(this.rev*0.012+(this.engineOn?0.0015:0)+this.shake*0.006)*(Math.random()-0.5);
    this.body.position.y=vib+Math.sin(this.t*31)*0.003*sn;
    this.body.rotation.x=damp(this.body.rotation.x,clamp(accel*0.0016,-0.03,0.035),4,dt);
    this.body.rotation.z=damp(this.body.rotation.z,clamp(dx*0.01+bend*25,-0.04,0.04),4,dt);
    this.spin-=this.speed*dt/0.38;
    this.wheels.forEach(w=>{w.spin.rotation.x=this.spin;if(w.front)w.steer.rotation.y=damp(w.steer.rotation.y,clamp(-dx*0.12-bend*160,-0.3,0.3),6,dt);});
    const dz=this.speed*dt; this.dist+=dz;
    for(const g of this.slots){g.position.z+=dz;if(g.position.z>30){g.position.z-=this.N*this.SP;g.userData.zone=this.spawnZone;this.buildSlot(g,this.spawnZone,this.counter++);}}
    this.roadTex.offset.y+=dz/48;
    const trafOn=zoneName==='city'||zoneName==='creative'||zoneName==='highway'||zoneName==='world';
    for(const g of this.traffic){g.position.z+=(this.speed-g.userData.v)*dt;
      if(g.position.z>40||(!g.visible&&trafOn&&g.position.z>-200)){g.position.z=-rand(260,360);g.visible=trafOn;g.userData.v=rand(18,28);}
      if(g.position.z<-440)g.position.z=-440;
      if(g.visible&&!trafOn&&g.position.z<-150)g.visible=false;
      if(Math.abs(g.position.z)<7&&Math.abs(g.position.x-this.car.position.x)<2.4)g.position.x+=g.position.x>this.car.position.x?dt*6:-dt*6;}
    if(this.finish.visible){this.finish.position.z+=dz;if(!this.crossed&&this.finish.position.z>0){this.crossed=true;this.stopping=true;this.shake=0;
      setTimeout(()=>this.blendTo('hero',0.7),900);if(this.finishCb)this.finishCb();}}
    const Z=this.zoneFor(zoneName),kz=1-Math.exp(-dt*(this.speedOverride?1.1:0.7));
    zc.top.lerp(this._c.set(Z.top),kz);zc.hor.lerp(this._c.set(Z.hor),kz);zc.ground.lerp(this._c.set(Z.ground),kz);zc.sunCol.lerp(this._c.set(Z.sunCol),kz);
    ['glow','gR','gM','fogN','fogF','pl','exp','hemi','sun','sunAmt','sunY','day','bend','hill'].forEach(k=>zc[k]=lerp(zc[k],Z[k],kz));
    const U=this.skyMat.uniforms;U.top.value.copy(zc.top);U.hor.value.copy(zc.hor);U.glow.value=zc.glow;U.sunCol.value.copy(zc.sunCol);U.sunAmt.value=zc.sunAmt;U.clouds.value=zc.day;U.uTime.value=this.t+this.dist*0.02;
    U.sunDir.value.set(0.15,zc.sunY,-1).normalize();
    const fog=this.scene.fog;fog.color.copy(zc.hor);fog.near=zc.fogN;fog.far=zc.fogF;
    this.groundMat.color.copy(zc.ground);this.groundMat.roughness=zc.gR;this.groundMat.metalness=zc.gM;
    this.hemi.intensity=zc.hemi;this.hemi.color.copy(this.nightHemi).lerp(this.dayHemi,zc.day);
    this.sunLight.intensity=zc.sun;this.sunLight.color.copy(zc.sunCol);this.sunLight.position.set(-12+this.car.position.x,Math.max(4,zc.sunY*80),-60);
    const isDay=zc.day>0.5;if(isDay!==this.envIsDay){this.envIsDay=isDay;this.scene.environment=isDay?this.envD:this.envN;}
    M.win.forEach(m=>m.emissiveIntensity=0.7*(1-zc.day*0.75));
    this.roadMat.color.setScalar(0.6+zc.day*0.2);const wetT=(zoneName==='city'||zoneName==='creative'||zoneName==='grid'||zoneName==='world')?1:0;this.wet=damp(this.wet||0,wetT,0.8,dt);const wn=this.wet*(1-zc.day);
    this.roadMat.metalness=lerp(0.3*(1-zc.day),0.75,wn);this.roadMat.roughness=lerp(0.55+zc.day*0.3,0.16,wn);
    M.refl.forEach((m,i)=>m.opacity=(i===3?0.45:0.5)*(1-zc.day)*(0.35+0.65*this.wet));M.win2.forEach(m=>m.emissiveIntensity=1.0*(1-zc.day*0.8));this.paint.envMapIntensity=1.2-zc.day*0.4;
    this.exposure=damp(this.exposure,this.expTarget,1.4,dt);this.renderer.toneMappingExposure=this.exposure*zc.exp;
    const cityish=(zoneName==='city'||zoneName==='creative')?1:0,coast=(zoneName==='highway'||zoneName==='finish')?1:0;
    this.skyMat2.opacity=damp(this.skyMat2.opacity,cityish,0.8,dt);this.winFar.opacity=this.skyMat2.opacity*0.5*(1-zc.day);this.skyline.visible=this.skyMat2.opacity>0.01;
    this.skyMat2.color.setRGB(0.05+zc.day*0.45,0.04+zc.day*0.5,0.07+zc.day*0.58);
    this.mtnMat.opacity=damp(this.mtnMat.opacity,coast,0.6,dt);this.mtns.visible=this.mtnMat.opacity>0.01;
    if(zoneName==='creative'&&S.service!==this.svcShown){this.svcShown=S.service;M.board.map=this.serviceTexture(S.service);this.boardFlash=1;}
    this.boardFlash=damp(this.boardFlash,0,3,dt);M.board.color.setScalar(1+this.boardFlash*0.8);
    const onC=S.seg===3&&S.started;
    this.lineP.material.opacity=damp(this.lineP.material.opacity,onC?0.3+0.1*S.sector:0,2,dt);
    this.lineP.position.x=damp(this.lineP.position.x,onC&&S.sector===5?1.5:0,2,dt);
    this.lineG.material.opacity=damp(this.lineG.material.opacity,onC&&S.sector===5?0.55:0,2,dt);this.lineG.position.x=-1.5;
    const level=this.engineOn?1:this.rev;
    this.spots.forEach(s=>s.intensity=level*3.5*(1-zc.day*0.6));
    this.headMat.color.setScalar(0.12+level*0.9);const tl=0.25+0.75*level;this.tailMat.color.setRGB(0.63*tl,0.36*tl,tl);
    this.tailGlow.opacity=(0.2+0.5*level)*(1-zc.day*0.5);this.headGlow.opacity=level*0.6*(1-zc.day*0.6);
    this.glowMat.opacity=(0.08+0.16*level)*(1-zc.day*0.8);this.tailLight.intensity=(0.4+1.2*level)*(1-zc.day*0.7);
    const cx=this.car.position.x;
    this.pass.forEach((l,i)=>{
      if(!S.started){l.position.set(cx+(i?3.4:-3.4),2.6,Math.sin(this.t*0.55+i*Math.PI)*5);l.intensity=zc.pl*0.6;}
      else{const ph=((this.dist+i*12)%24)/24;l.position.set(cx+(i?7:-7),4.5,-12+ph*24);l.intensity=Math.sin(ph*Math.PI)*zc.pl;}});
    const so=this.reduced?0:clamp((this.speed-45)/55,0,1)*0.45*(1-zc.day);this.streakMat.opacity=so;this.streaks.visible=so>0.01;
    if(this.streaks.visible){const len=0.6+this.speed*0.09;this.streakData.forEach((d,i)=>{d.z+=dz*1.4;if(d.z>15){d.z=-120;d.x=(Math.random()<0.5?-1:1)*rand(3,14);d.y=rand(0.2,3.2);}
      this._m.makeScale(0.025,0.025,len);this._m.setPosition(cx+d.x,d.y,d.z);this.streaks.setMatrixAt(i,this._m);});this.streaks.instanceMatrix.needsUpdate=true;}
    if(this.smokeT>0){this.smokeT-=dt;for(let k=0;k<2;k++){const p=this.smoke.find(s=>s.life<=0);if(p){p.life=1.2;p.sp.visible=true;p.sp.position.set(cx+(k?0.96:-0.96)+rand(-0.2,0.2),0.3,1.7);}}}
    this.smoke.forEach(p=>{if(p.life>0){p.life-=dt;p.sp.position.z+=dz*0.6+dt*2;p.sp.position.y+=dt*0.5;const a=1-p.life/1.2;p.sp.scale.setScalar(0.6+a*3.4);p.sp.material.opacity=0.32*(1-a);if(p.life<=0)p.sp.visible=false;}});
    const name=this.override||(this.dest?this.dest.shot:this.journeyShot(S)),sh=SHOTS[name]||SHOTS.chase;
    if(name!==this.lastShot){this.lastShot=name;this.cutAt=this.t;}
    const age=this.t-this.cutAt;
    const tp=this._v1.set(sh.p[0]+cx,sh.p[1],sh.p[2]);if(sh.d)tp.set(tp.x+sh.d[0]*age,tp.y+sh.d[1]*age,tp.z+sh.d[2]*age);
    const look=sh.l[2]<-3?Math.min(0,sh.l[2]):0;
    const tl2=this._v2.set(sh.l[0]+cx+bend*look*look*0.6,sh.l[1]+BEND.uBendY.value*look*look*0.5,sh.l[2]);
    const k=this.snap?1000:(this.reduced?8:this.blendK);
    this.camPos.x=damp(this.camPos.x,tp.x,k,dt);this.camPos.y=damp(this.camPos.y,tp.y,k,dt);this.camPos.z=damp(this.camPos.z,tp.z,k,dt);
    this.camLook.x=damp(this.camLook.x,tl2.x,k,dt);this.camLook.y=damp(this.camLook.y,tl2.y,k,dt);this.camLook.z=damp(this.camLook.z,tl2.z,k,dt);
    this.camFov=damp(this.camFov,sh.f,this.snap?1000:k,dt);
    const portrait=this.w/this.h<0.9;
    const tfx=portrait?0:(sh.fx||0),tfy=portrait?(sh.my||0.12):0;
    this.fx=damp(this.fx,tfx,this.snap?1000:k,dt);this.fy=damp(this.fy,tfy,this.snap?1000:k,dt);
    this.snap=false;
    this.shake=damp(this.shake,0,1.4,dt);
    const cam=this.camera;cam.position.copy(this.camPos);
    if(!this.reduced){const sa=this.shake*0.05+sn*sn*0.012;cam.position.x+=(Math.random()-0.5)*sa;cam.position.y+=(Math.random()-0.5)*sa;}
    cam.lookAt(this.camLook);
    if(sh.l[2]<-3&&!this.reduced)cam.rotateZ(-bend*30);
    let fov=this.camFov+(this.reduced?0:sn*10+this.shake*5);if(portrait)fov=Math.min(95,fov*1.4);
    cam.fov=fov;cam.setViewOffset(this.w,this.h,-this.fx*this.w,-this.fy*this.h,this.w,this.h);
    this.sky.position.copy(cam.position);
    this.audio.update(sn,this.engineOn,this.rev);
    this.renderer.render(this.scene,cam);this.lastRender=now;
    if(this.onFrame)this.onFrame(this.speed*3.6,sn);
  }
}
window.RaceEngine=RaceEngine;
})();
