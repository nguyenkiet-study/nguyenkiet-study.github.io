// Simulates learners of known ability against a synthetic bank and reports how close the engine gets.
const vm=require('vm'),fs=require('fs');
const ctx={console};vm.createContext(ctx);
vm.runInContext(['Config.gs','AdaptiveEngine.gs'].map(f=>fs.readFileSync(__dirname+'/../'+f,'utf8')).join('\n')+';this.__={CONFIG,Engine}',ctx);
const {CONFIG,Engine}=ctx.__;
let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
function bank(perLevel){const b=[];let id=0;CONFIG.LEVELS.forEach(l=>{for(let i=0;i<perLevel;i++){const ds=15+70*i/(perLevel-1);b.push({id:'q'+id++,b:Engine.itemTheta(l,ds),sub:['vocabulary','grammar','comprehension'][i%3]})}});return b}
function run(trueTheta,cfg,prior,perLevel){
  const B=bank(perLevel),st=Engine.newState(prior);
  while(!Engine.shouldStop(st,cfg)){const c=Engine.pickNext(st,B,rnd);if(!c)break;
    const ok=rnd()<Engine.prob(trueTheta,c.b);Engine.update(st,c,ok)}
  const e=Engine.estimate(st);return {est:e.theta,se:e.se,n:st.items.length,fit:Engine.infit(st),st}}
for(const [name,cfg] of [['reading',CONFIG.TEST.READING],['listening',CONFIG.TEST.LISTENING]]){
  const per=name==='reading'?15:10;
  console.log('\n'+name+' (max '+cfg.MAX+', min '+cfg.MIN+')');
  console.log('true level  | mean est | MAE  | exact level | within 1 | mean n | high/med/low conf');
  CONFIG.LEVELS.forEach((lv,li)=>{
    let mae=0,exact=0,w1=0,n=0,N=300,conf={High:0,Medium:0,Low:0},bias=0;
    for(let k=0;k<N;k++){
      const th=CONFIG.TEST.LEVEL_THETA[li]+(rnd()-0.5)*0.9; // learner somewhere inside the level
      const prior=['A2','B1','B2'][k%3]; // self-estimate unrelated to truth
      const r=run(th,cfg,prior,per);
      mae+=Math.abs(r.est-th);bias+=r.est-th;n+=r.n;
      const tl=Engine.levelIndex(Engine.levelFromTheta(th)),el=Engine.levelIndex(Engine.levelFromTheta(r.est));
      if(tl===el)exact++;if(Math.abs(tl-el)<=1)w1++;
      conf[Engine.confidence(r.se,r.fit,r.st.items.length)]++;
    }
    console.log(lv+'          | '+(CONFIG.TEST.LEVEL_THETA[li]+bias/N).toFixed(2).padStart(6)+'   | '+(mae/N).toFixed(2)+' | '+(exact/N*100).toFixed(0).padStart(5)+'%      | '+(w1/N*100).toFixed(0).padStart(4)+'%   | '+(n/N).toFixed(1)+'   | '+conf.High+'/'+conf.Medium+'/'+conf.Low);
  });
}
