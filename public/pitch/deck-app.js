/* app v3 */
(function(){
  var A=window.SF_ASSETS||{}, M=window.Motion||{}, hasM=typeof M.animate==="function";
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var EASE=[0.22,0.61,0.36,1];
  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  function anim(el,kf,op){
    op=op||{}; if(!el) return {finished:Promise.resolve()};
    if(reduce||!hasM){
      for(var k in kf){var v=kf[k],val=Array.isArray(v)?v[v.length-1]:v;
        if(k==="opacity")el.style.opacity=val; else if(k==="transform")el.style.transform=val; else el.style[k]=val;}
      return {finished:Promise.resolve()};
    }
    var o={duration:op.duration||0.6,delay:op.delay||0,easing:op.easing||EASE,ease:op.easing||EASE};
    if(op.repeat){o.repeat=op.repeat;o.repeatType="reverse";o.direction="alternate";}
    try{return M.animate(el,kf,o);}catch(e){
      for(var k2 in kf){var v2=kf[k2],val2=Array.isArray(v2)?v2[v2.length-1]:v2;
        if(k2==="opacity")el.style.opacity=val2;else if(k2==="transform")el.style.transform=val2;else el.style[k2]=val2;}
      return {finished:Promise.resolve()};
    }
  }

  var hud=$("#hudLeaf"); if(hud&&A.flower5) hud.src=A.flower5;
  $$(".scene").forEach(function(s){var k=s.getAttribute("data-scene"); if(A[k])s.style.backgroundImage="url("+A[k]+")";});

  /* ambient petals */
  (function ambient(){
    var cv=$("#petals"); if(!cv||reduce) return;
    var ctx=cv.getContext("2d"),W,H,DPR=Math.min(2,window.devicePixelRatio||1),ps=[];
    function resize(){W=cv.width=innerWidth*DPR;H=cv.height=innerHeight*DPR;cv.style.width=innerWidth+"px";cv.style.height=innerHeight+"px";}
    resize(); addEventListener("resize",resize);
    var petalCol=["239,143,176","242,148,106","187,156,226","174,233,180","139,208,216"];
    var NF=Math.min(28,Math.round(innerWidth/40)), NP=Math.min(16,Math.round(innerWidth/72));
    function fire(){return {t:0,x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.5+0.6)*DPR,vx:(Math.random()-.5)*.16*DPR,vy:(Math.random()-.5)*.16*DPR,p:Math.random()*6.28,ps:.008+Math.random()*.02,kind:"f"};}
    function petal(){return {t:1,x:Math.random()*W,y:Math.random()*-H*.2,r:(6+Math.random()*8)*DPR,vx:(Math.random()-.5)*.2*DPR,vy:(.25+Math.random()*.45)*DPR,rot:Math.random()*6,rs:(Math.random()-.5)*.02,c:petalCol[Math.random()*petalCol.length|0],kind:"p"};}
    for(var i=0;i<NF;i++)ps.push(fire());
    for(var j=0;j<NP;j++)ps.push(petal());
    function tick(){
      ctx.clearRect(0,0,W,H);
      ps.forEach(function(p){
        if(p.kind==="f"){
          p.x+=p.vx; p.y+=p.vy; p.p+=p.ps;
          if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
          ctx.beginPath(); ctx.fillStyle="rgba(243,197,99,"+(0.18+Math.sin(p.p)*0.12)+")";
          ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill();
        }else{
          p.x+=p.vx; p.y+=p.vy; p.rot+=p.rs;
          if(p.y>H+20){p.y=-20;p.x=Math.random()*W;}
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
          ctx.fillStyle="rgba("+p.c+",.55)"; ctx.beginPath();
          ctx.ellipse(0,0,p.r,p.r*.46,0,0,6.28); ctx.fill(); ctx.restore();
        }
      });
      requestAnimationFrame(tick);
    }
    tick();
  })();

  function splitTitle(el){
    if(!el||el.dataset.splitDone)return; el.dataset.splitDone="1";
    var html=el.innerHTML; el.textContent="";
    var tmp=document.createElement("div"); tmp.innerHTML=html;
    function walk(node,host){
      node.childNodes.forEach(function(n){
        if(n.nodeType===3){
          Array.from(n.textContent).forEach(function(ch){
            var s=document.createElement("span"); s.className="char"; s.textContent=ch;
            host.appendChild(s);
          });
        }else{
          var c=n.cloneNode(false); host.appendChild(c); walk(n,c);
        }
      });
    }
    walk(tmp,el);
  }
  $$("h2[data-split]").forEach(splitTitle);

  function revealSlide(sl){
    if(!sl)return;
    $$(".reveal",sl).forEach(function(el,i){
      var rv=el.getAttribute("data-rv")||"up";
      var kf={opacity:[0,1]};
      if(rv==="up")kf.transform=["translateY(18px)","translateY(0)"];
      if(rv==="pop")kf.transform=["scale(.82)","scale(1)"];
      if(rv==="seed")kf.transform=["translateY(-40px) scale(.6)","translateY(0) scale(1)"];
      if(rv==="fade")kf={opacity:[0,1]};
      anim(el,kf,{duration:0.7,delay:0.08+i*0.06});
    });
    $$(".char",sl).forEach(function(ch,i){anim(ch,{opacity:[0,1],transform:["translateY(12px)","none"]},{duration:0.45,delay:0.05+i*0.012});});
  }

  /* vine */
  var vineGrow=$("#vineGrow"), vineTrack=$("#vineTrack");
  if(vineTrack){vineTrack.setAttribute("d","M26 20 C18 180 34 360 22 540 C14 720 32 880 26 980");}
  if(vineGrow){vineGrow.setAttribute("d","M26 20 C18 180 34 360 22 540 C14 720 32 880 26 980"); vineGrow.style.strokeDasharray="1"; vineGrow.style.strokeDashoffset="1";}
  function growVine(t){ if(vineGrow) anim(vineGrow,{strokeDashoffset:[vineGrow.style.strokeDashoffset||1, (1-t).toFixed(3)]},{duration:0.5}); }

  /* live product */
  var APP_ORIGIN=location.protocol==="file:"?(location.search.match(/app=([^&]+)/)?decodeURIComponent(RegExp.$1):"http://127.0.0.1:3000"):"";
  var frame=$("#productFrame"), stage=$("#liveStage"), fallback=$("#productFallback");
  var frameReady=false;
  function ensureFrame(view){
    if(!frame) return;
    var base=(APP_ORIGIN||"")+"/world/index.html";
    var next=base+"#pitch="+(view||"garden");
    if(!frame.getAttribute("src")){
      frame.src=next;
      frame.addEventListener("load",function(){
        frameReady=true;
        stage&&stage.classList.remove("offline");
        sendView(lastView||view||"garden");
      },{once:true});
      frame.addEventListener("error",function(){ stage&&stage.classList.add("offline"); },{once:true});
      setTimeout(function(){
        try{ if(!frame.contentWindow||!frame.contentWindow.HuatuobangPitch) stage&&stage.classList.add("offline"); }
        catch(e){ stage&&stage.classList.add("offline"); }
      },2800);
    }
  }
  var lastView="garden";
  function sendView(view){
    lastView=view||lastView;
    if(!view||!frame) return;
    ensureFrame(view);
    var url=(APP_ORIGIN||"")+"/world/index.html#pitch="+view;
    try{
      var win=frame.contentWindow;
      if(win&&win.HuatuobangPitch){ win.HuatuobangPitch.go(view); return; }
    }catch(e){}
    if(frameReady){ try{ frame.contentWindow.location.hash="pitch="+view; }catch(e){ frame.src=url; } }
  }
  function placeStage(sl){
    if(!stage)return;
    var live=sl&&sl.classList.contains("live");
    stage.classList.toggle("on",!!live);
    if(!live) return;
    var slot=sl.querySelector(".live-slot");
    if(!slot) return;
    var r=slot.getBoundingClientRect();
    if(r.width<40){ /* stacked mobile: css handles */ return; }
    stage.style.left=Math.max(16,r.left)+"px";
    stage.style.top=(r.top+r.height/2)+"px";
  }
  function setShot(sl){
    if(!fallback)return;
    var shot=sl&&sl.getAttribute("data-shot");
    fallback.src=shot?("/pitch/shots/"+shot):"";
    var cap=$(".live-phone .cap");
    if(cap) cap.textContent=sl&&sl.classList.contains("live")?"真实产品 · 可操作":"";
  }

  /* page animations */
  var actIdx=0, actTimer=null;
  var ACTS=[
    {title:"一朵花，不只是一次完成记录", copy:"留下照片和感言，AI 会生成更定制的经历花。", view:"journal"},
    {title:"两朵花可以继续长成一段关系", copy:"和同一个人再完成一件事，花可以融合升级。原花仍在。", view:"fusion"},
    {title:"花会结出下一颗灵感种子", copy:"这颗种子离开花园，去往别人的生活。", view:"fusion"}
  ];
  function clearActTimer(){ if(actTimer){clearTimeout(actTimer);actTimer=null;} }
  function setAct(i,send){
    actIdx=Math.max(0,Math.min(ACTS.length-1,i));
    var a=ACTS[actIdx];
    var t=$("#actTitle"), c=$("#actCopy");
    if(t)t.textContent=a.title; if(c)c.textContent=a.copy;
    $$("#actRail i").forEach(function(el,idx){el.classList.toggle("on",idx<=actIdx);});
    $$("#actLife [data-act], #actLife .pair").forEach(function(el){
      var on=String(el.getAttribute("data-act"))===String(actIdx) || (el.classList.contains("pair")&&actIdx===1);
      el.classList.toggle("on",on);
      el.style.opacity=on?1:0;
    });
    if(send) sendView(a.view);
  }
  function playActCycle(){
    clearActTimer(); setAct(0,true);
    if(reduce) return;
    actTimer=setTimeout(function(){ setAct(1,true);
      actTimer=setTimeout(function(){ setAct(2,true); launchSeed(); }, 2200);
    }, 2400);
  }
  var fly=$("#flySeed");
  function launchSeed(){
    if(!fly) return;
    var life=$("#actLife"); if(!life) return;
    var r=life.getBoundingClientRect();
    fly.style.opacity="1";
    fly.style.left=(r.left+r.width/2)+"px";
    fly.style.top=(r.top+r.height/2)+"px";
    anim(fly,{opacity:[1,1,0],transform:["translate(-50%,-50%) scale(1)","translate(120px,-80px) scale(1.2)","translate(280px,-220px) scale(.4)"]},{duration:1.15});
  }

  function playSlideAnims(i){
    clearActTimer();
    if(i===0){
      var a=$("#msgA"),b=$("#msgB"),w=$("#realAction");
      if(a){a.style.opacity=0;anim(a,{opacity:[0,.95],transform:["translateX(-70%) translateY(8px)","translateX(-50%) translateY(0)"]},{duration:.55,delay:.15});}
      if(b){b.style.opacity=0;anim(b,{opacity:[0,.95],transform:["translateX(-30%) translateY(8px)","translateX(-50%) translateY(0)"]},{duration:.55,delay:.45});}
      setTimeout(function(){ if(a)a.classList.add("frozen"); if(b)b.classList.add("frozen"); }, 1600);
      if(w)anim(w,{opacity:[0,1],transform:["translateY(16px)","none"]},{duration:.7,delay:1.8});
    }
    if(i===1){
      $$("#growOutline .grow-chip").forEach(function(el,idx){
        anim(el,{opacity:[0,1],transform:["translateY(16px)","none"]},{duration:.5,delay:.25+idx*.12});
      });
    }
    if(i===4){
      $$('[data-life="grow"] img').forEach(function(img,idx){
        img.classList.remove("on");
        setTimeout(function(){img.classList.add("on");}, 280+idx*700);
      });
    }else{
      $$(".life[data-life] img").forEach(function(img){
        var host=img.closest(".slide");
        if(host===slides[i]) setTimeout(function(){img.classList.add("on");},200);
        else img.classList.remove("on");
      });
    }
    if(i===6) playActCycle();
    if(i===7){
      var bf=$(".collect-scene .bf");
      if(bf) anim(bf,{opacity:[0,1],transform:["translate(-40px,-20px)","none"]},{duration:.8,delay:.2});
    }
    if(i===9){
      $$("#feelWords span").forEach(function(el,idx){
        anim(el,{opacity:[0,1],transform:["translateY(10px)","none"]},{duration:.5,delay:.2+idx*.12});
      });
    }
  }

  /* nav */
  var deck=$("#deck"), slides=$$(".slide",deck), n=slides.length, active=0;
  $("#cAll").textContent=n;
  var dotsWrap=$("#dots");
  slides.forEach(function(sl,i){
    var b=document.createElement("button");
    b.setAttribute("aria-label","第"+(i+1)+"页");
    b.addEventListener("click",function(e){e.stopPropagation();gotoSlide(i);});
    dotsWrap.appendChild(b);
  });
  var dots=$$("button",dotsWrap);

  function setActive(i){
    active=i;
    dots.forEach(function(d,idx){d.classList.toggle("on",idx===i);});
    $("#cNow").textContent=("0"+(i+1)).slice(-2);
    growVine(n>1?i/(n-1):0);
    revealSlide(slides[i]);
    renderNotes(i);
    placeStage(slides[i]);
    setShot(slides[i]);
    var view=slides[i].getAttribute("data-view");
    if(view) sendView(view);
    playSlideAnims(i);
  }

  var veil=$("#veil"), veilBand=$("#veil .band");
  function doTransition(dir){
    if(reduce||!hasM||!veil)return;
    anim(veil,{opacity:[0,1,0]},{duration:0.62});
    var from=dir>=0?"-140%":"140%", to=dir>=0?"140%":"-140%";
    anim(veilBand,{transform:["translateY("+from+")","translateY("+to+")"]},{duration:0.66});
  }
  function gotoSlide(i){
    i=Math.max(0,Math.min(n-1,i));
    if(i!==active) doTransition(i>active?1:-1);
    slides[i].scrollIntoView({behavior:reduce?"auto":"smooth"});
  }
  var io=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(en.isIntersecting&&en.intersectionRatio>0.55){
        var i=slides.indexOf(en.target);
        if(i>=0&&i!==active) setActive(i);
        else if(i>=0) revealSlide(slides[i]);
      }
    });
  },{threshold:[0.55,0.75]});
  slides.forEach(function(sl){io.observe(sl);});

  function next(){
    if(active===6&&actIdx<ACTS.length-1){ setAct(actIdx+1,true); if(actIdx===2) launchSeed(); return; }
    gotoSlide(active+1);
  }
  function prev(){
    if(active===6&&actIdx>0){ setAct(actIdx-1,true); return; }
    gotoSlide(active-1);
  }
  function replay(){ setActive(active); }

  var productArmed=false;
  if(stage){
    stage.addEventListener("pointerdown",function(){ productArmed=true; },true);
  }
  document.addEventListener("pointerdown",function(e){
    if(!e.target.closest||!e.target.closest(".live-stage")) productArmed=false;
  },true);
  function inProduct(){
    return productArmed && document.activeElement && document.activeElement.id==="productFrame";
  }

  document.addEventListener("keydown",function(e){
    if(inProduct()) return;
    if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "||e.key==="Spacebar"){e.preventDefault();next();}
    else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();prev();}
    else if(e.key==="ArrowDown"){e.preventDefault();next();}
    else if(e.key==="ArrowUp"){e.preventDefault();prev();}
    else if(e.key==="n"||e.key==="N") toggleNotes();
    else if(e.key==="r"||e.key==="R"){e.preventDefault();replay();}
    else if(e.key==="Home"){e.preventDefault();gotoSlide(0);}
    else if(e.key==="End"){e.preventDefault();gotoSlide(n-1);}
  });
  deck.addEventListener("click",function(e){
    if(e.target.closest("a,button,.dots,.notes,.live-stage,.live-phone,.live-slot,iframe")) return;
    if(e.target.closest(".live-copy") || e.target.closest(".story .wrap") || e.target.closest(".cover .wrap")) next();
  });

  var hint=$("#hint"), hintGone=false;
  function killHint(){if(hintGone)return;hintGone=true;if(hint)hint.style.opacity=0;}
  ["keydown","click","wheel","touchstart"].forEach(function(ev){addEventListener(ev,function(){setTimeout(killHint,1400);},{once:true});});

  var notesEl=$("#notes"), notesOpen=false;
  function renderNotes(i){if(!notesEl)return;var t=slides[i].getAttribute("data-note")||"";notesEl.innerHTML='<span class="tag">讲稿 '+("0"+(i+1)).slice(-2)+'</span>'+t;}
  function toggleNotes(){notesOpen=!notesOpen;if(notesEl)notesEl.classList.toggle("show",notesOpen);}

  addEventListener("resize",function(){placeStage(slides[active]);});

  setActive(0);
  if(!hasM)$$(".reveal").forEach(function(el){el.style.opacity=1;el.style.transform="none";});
})();
