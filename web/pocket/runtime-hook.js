/* Appended to a staged copy of PlasmaTerm's web/plasma-browser.js. */
(() => {
  function sampleRgb(cell){
    const mode=cell?.getFgColorMode?.(),code=cell?.getFgColor?.();
    if(mode===0x3000000&&Number.isInteger(code))return [(code>>>16)&255,(code>>>8)&255,code&255];
    if(mode===0x2000000&&Number.isInteger(code)&&code>=16&&code<=231){
      const n=code-16,cube=[0,95,135,175,215,255];
      return [cube[Math.floor(n/36)],cube[Math.floor(n%36/6)],cube[n%6]];
    }
    return null;
  }
  window.__pocketPlasmaBridge=Object.freeze({
    get ready(){return runtimeReady;},
    motion(data){
      if(!runtimeReady||!data||!['x','y','twist','magnitude'].every(k=>
          typeof data[k]==='number'&&Number.isFinite(data[k])&&Math.abs(data[k])<=1))return false;
      worker.postMessage({type:'pocketMotion',motion:data});return true;
    },
    command(action){
      const key={randomize:'P',next:'I',previous:'K'}[action];
      if(!key||!runtimeReady)return false;
      worker.postMessage({type:'pocketCommand',key});return true;
    },
    sampleLed(){
      if(!runtimeReady||!terminal.buffer.active)return null;
      const out=new Uint8Array(192),buffer=terminal.buffer.active;
      let valid=0;
      for(let y=0;y<8;y++){
        const line=buffer.getLine(Math.min(terminal.rows-1,Math.floor((y+.5)*terminal.rows/8)));
        for(let x=0;x<8;x++){
          const rgb=sampleRgb(line?.getCell(Math.min(terminal.cols-1,Math.floor((x+.5)*terminal.cols/8))));
          if(rgb){out.set(rgb,(y*8+x)*3);valid++;}
        }
      }
      return valid>=32?out:null;
    }
  });
})();