import pptxgen from 'pptxgenjs';

const NAVY='0F2350', INK='1E293B', SLATE='475569', MUTE='94A3B8', LINE='E2E8F0',
      ACCENT='2563EB', TINT='EEF2FB', PALE='F8FAFC', WHITE='FFFFFF',
      EMER='059669', AMBER='D97706', RED='DC2626', TEAL='0891B2', VIOLET='7C3AED';
const TITLE='Cambria', BODY='Calibri';
const SHOTS='/home/user/orbitpm-ai/deck-assets/framed';
const IC='/home/user/orbitpm-ai/deck-assets/icons';
const PUB='/home/user/orbitpm-ai/public';
const XYRO='/home/user/orbitpm-ai/deck-assets/brand/xyro.png';
const LOGO=`${PUB}/logo-full.png`, LOGO_W=`${PUB}/logo-full-white.png`, MARK=`${PUB}/logo-mark.png`;
const ico=(n,c)=>`${IC}/${n}-${c}.png`;
const AR=3120/2064;

const p=new pptxgen(); p.layout='LAYOUT_WIDE';
const W=13.33, H=7.5;
p.author='Xyrenis'; p.company='Xyrenis';

let PAGE=0;
function footer(s){ PAGE++;
  s.addImage({path:MARK,x:0.6,y:H-0.5,w:1.35,h:1.35*272/1716});
  s.addText(`${PAGE}`,{x:W-1.0,y:H-0.45,w:0.5,h:0.25,fontFace:BODY,fontSize:9,color:MUTE,align:'right'});
  s.addText('Enterprise AI Project Intelligence',{x:W/2-2.5,y:H-0.45,w:5,h:0.25,fontFace:BODY,fontSize:9,color:MUTE,align:'center'});
}
const eyebrow=(s,t,{x=0.6,y=0.52,color=ACCENT}={})=>s.addText(t.toUpperCase(),{x,y,w:9,h:0.3,fontFace:BODY,fontSize:12,bold:true,color,charSpacing:3});
const title=(s,t,{x=0.6,y=0.84,w=12,size=30,color=NAVY}={})=>s.addText(t,{x,y,w,h:0.85,fontFace:TITLE,fontSize:size,bold:true,color});
function shot(s,f,{x,y,w}){ const h=w/AR; s.addImage({path:`${SHOTS}/${f}.png`,x,y,w,h}); return {x,y,w,h}; }

// ============================================================ 1 · COVER
{
  const s=p.addSlide(); s.background={color:NAVY};
  s.addImage({path:LOGO_W,x:0.7,y:0.55,w:3.1,h:3.1*374/1716});
  s.addText('AI-Powered Enterprise Project & Portfolio Management',{x:0.7,y:1.9,w:7.3,h:1.5,fontFace:TITLE,fontSize:32,bold:true,color:WHITE,lineSpacingMultiple:1.02});
  s.addText('Where strategy meets execution.',{x:0.72,y:3.35,w:7,h:0.5,fontFace:BODY,fontSize:17,italic:true,color:'CADCFC'});
  const aud=['CEO','CIO / CTO','PMO','Enterprise IT','Investors']; let cx=0.72;
  aud.forEach(a=>{ const w=0.35+a.length*0.11; s.addShape(p.ShapeType.roundRect,{x:cx,y:4.15,w,h:0.42,rectRadius:0.2,fill:{color:'17305A'},line:{color:'2A4A82',width:1}}); s.addText(a,{x:cx,y:4.15,w,h:0.42,fontFace:BODY,fontSize:11,bold:true,color:'CADCFC',align:'center',valign:'middle',margin:0}); cx+=w+0.18; });
  s.addImage({path:XYRO,x:0.7,y:5.05,w:1.7,h:1.7});
  s.addText('Board-level briefing · Product vision, capabilities & business case',{x:2.55,y:5.75,w:5,h:0.3,fontFace:BODY,fontSize:11,color:MUTE});
  shot(s,'dashboard',{x:8.2,y:1.25,w:6.4});
}

// ============================================================ 2 · THE PROBLEM
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'The Enterprise Problem',{color:RED}); title(s,'Enterprises don’t fail at strategy — they fail at execution');
  const stats=[['70%','of transformation programmes miss cost, time or value targets',RED],['$1M','wasted for every $1B spent, on average',AMBER],['54%','of PMO leaders lack real-time portfolio visibility',ACCENT],['13 hrs','per manager / week lost to manual reporting',VIOLET]];
  let x=0.6; const cw=2.94;
  stats.forEach(([n,t,c])=>{ s.addShape(p.ShapeType.roundRect,{x,y:1.9,w:cw,h:2.4,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addText(n,{x:x+0.05,y:2.1,w:cw-0.1,h:1.0,fontFace:TITLE,fontSize:42,bold:true,color:c});
    s.addText(t,{x:x+0.22,y:3.12,w:cw-0.44,h:1.0,fontFace:BODY,fontSize:12.5,color:SLATE,lineSpacingMultiple:1.12}); x+=cw+0.18; });
  s.addText('Why it compounds',{x:0.6,y:4.72,w:6,h:0.4,fontFace:BODY,fontSize:13,bold:true,color:NAVY,charSpacing:1});
  const cyc=['Fragmented tools','Blind spots','Late escalation','Budget & schedule overrun','Lost executive trust'];
  let px=0.6; const pw=2.28;
  cyc.forEach((t,i)=>{ s.addShape(p.ShapeType.roundRect,{x:px,y:5.2,w:pw,h:0.95,rectRadius:0.1,fill:{color:i===cyc.length-1?'FBEBEA':TINT}});
    s.addText(t,{x:px+0.1,y:5.2,w:pw-0.2,h:0.95,fontFace:BODY,fontSize:12,bold:true,color:i===cyc.length-1?RED:NAVY,align:'center',valign:'middle',margin:0});
    if(i<cyc.length-1) s.addImage({path:ico('arrow','slate'),x:px+pw+0.02,y:5.51,w:0.3,h:0.3}); px+=pw+0.32; });
  s.addText('Industry benchmarks — replace with your own baseline where available.',{x:0.6,y:H-0.9,w:9,h:0.3,fontFace:BODY,fontSize:9.5,italic:true,color:MUTE});
  footer(s);
}

// ============================================================ 3 · THE SOLUTION
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'The Xyrenis Solution'); title(s,'One AI-native system of record, end to end');
  const pillars=[['compass','Planning','Roadmaps, milestones & structured intake',ACCENT],['grid','Execution','Tasks, Kanban, Gantt & dependencies',TEAL],['briefcase','Governance','Departments, subdivisions & ownership',VIOLET],['cpu','Intelligence','Xyro AI + live analytics turn data into decisions',NAVY]];
  const cn={[ACCENT]:'white',[TEAL]:'white',[VIOLET]:'white',[NAVY]:'white'};
  let y=1.9;
  pillars.forEach(([ic,t,d,c])=>{ s.addShape(p.ShapeType.roundRect,{x:0.6,y,w:5.35,h:1.05,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addShape(p.ShapeType.roundRect,{x:0.8,y:y+0.22,w:0.62,h:0.62,rectRadius:0.12,fill:{color:c}});
    s.addImage({path:ico(ic,'white'),x:0.95,y:y+0.37,w:0.32,h:0.32});
    s.addText(t,{x:1.58,y:y+0.14,w:4.2,h:0.34,fontFace:TITLE,fontSize:16,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:1.58,y:y+0.5,w:4.25,h:0.44,fontFace:BODY,fontSize:11.5,color:SLATE,margin:0}); y+=1.2; });
  shot(s,'dashboard',{x:6.35,y:1.85,w:6.55});
  s.addText('Replaces a stack of point tools with one governed source of truth.',{x:6.35,y:6.35,w:6.5,h:0.4,fontFace:BODY,fontSize:12.5,italic:true,color:SLATE,align:'center'});
  footer(s);
}

// ============================================================ 4 · PLATFORM OVERVIEW
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'Platform Overview'); title(s,'The operating system for enterprise delivery');
  // process flow
  const flow=['Plan','Execute','Govern','Report']; let fx=0.6; const fw=2.9;
  flow.forEach((t,i)=>{ s.addShape(p.ShapeType.roundRect,{x:fx,y:1.75,w:fw,h:0.62,rectRadius:0.1,fill:{color:NAVY}});
    s.addText(t,{x:fx,y:1.75,w:fw,h:0.62,fontFace:BODY,fontSize:14,bold:true,color:WHITE,align:'center',valign:'middle',margin:0});
    if(i<flow.length-1) s.addImage({path:ico('arrow','slate'),x:fx+fw+0.03,y:1.9,w:0.3,h:0.3}); fx+=fw+0.32; });
  const mods=[['layout','Command Center'],['grid','Projects'],['briefcase','Portfolio'],['columns','Kanban'],['bar','Gantt'],['calendar','Calendar'],['dollar','Budgets'],['git','Dependencies'],['alert','Risk Register'],['users','Workforce'],['zap','Automation'],['shield','Admin']];
  const cw=2.9,ch=1.12,gx=0.19,gy=0.2; let i=0;
  for(let r=0;r<3;r++){ for(let c=0;c<4;c++){ const x=0.6+c*(cw+gx),y=2.75+r*(ch+gy); const [ic,t]=mods[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:WHITE},line:{color:LINE,width:1},shadow:{type:'outer',color:'CBD5E1',blur:5,offset:2,angle:90,opacity:0.35}});
    s.addShape(p.ShapeType.roundRect,{x:x+0.18,y:y+0.28,w:0.56,h:0.56,rectRadius:0.12,fill:{color:TINT}});
    s.addImage({path:ico(ic,'accent'),x:x+0.32,y:y+0.42,w:0.28,h:0.28});
    s.addText(t,{x:x+0.9,y,w:cw-1.0,h:ch,fontFace:TITLE,fontSize:14.5,bold:true,color:NAVY,valign:'middle',margin:0});
  } }
  footer(s);
}

// ============================================================ 5 · KEY FEATURES
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'Key Features'); title(s,'Enterprise delivery, fully instrumented');
  const g=[['kanban','Kanban','Flow-based execution'],['gantt','Gantt','Critical-path scheduling'],['project-detail','Projects & Budgets','Live ₹ budget per project'],['risks','Risk Register','Scored & owned'],['analytics','Analytics','Board-ready, one click'],['dependencies','Dependencies','Cross-team blockers visible']];
  const slotW=3.86, gx=0.22, iw=3.0, ih=iw/AR, rowH=0.05+ih+0.02+0.34, rowGap=0.3; let i=0;
  for(let r=0;r<2;r++){ for(let c=0;c<3;c++){ const sx=0.6+c*(slotW+gx), y=1.72+r*(rowH+rowGap); const [f,t,d]=g[i++];
    const ix=sx+(slotW-iw)/2;
    s.addImage({path:`${SHOTS}/${f}.png`,x:ix,y:y+0.05,w:iw,h:ih});
    s.addText([{text:`${t}  `,options:{bold:true,color:NAVY,fontSize:13}},{text:d,options:{color:SLATE,fontSize:10.5}}],{x:ix,y:y+0.05+ih+0.02,w:iw,h:0.34,fontFace:BODY,margin:0,valign:'middle',align:'center'});
  } }
  footer(s);
}

// ============================================================ 6 · XYRO AI
{
  const s=p.addSlide(); s.background={color:NAVY};
  eyebrow(s,'Xyro AI Copilot',{color:'7FA8FF'});
  s.addImage({path:XYRO,x:0.6,y:1.2,w:2.5,h:2.5});
  s.addText('An analyst on every desk — not a chatbot',{x:0.65,y:3.7,w:6.9,h:1.0,fontFace:TITLE,fontSize:30,bold:true,color:WHITE,lineSpacingMultiple:1.0});
  const caps=['Ask the portfolio anything, in plain language','Instant status, risk & budget-variance summaries','Prioritises work & recommends the next action','Drafts reports and roadmaps automatically','Grounded on live data — it never invents numbers'];
  let y=4.7; caps.forEach(t=>{ s.addImage({path:ico('check','white'),x:0.66,y:y+0.02,w:0.26,h:0.26}); s.addText(t,{x:1.08,y,w:6.5,h:0.36,fontFace:BODY,fontSize:13,color:WHITE,valign:'middle',margin:0}); y+=0.44; });
  shot(s,'xyro-panel',{x:8.35,y:1.2,w:6.1});
  footer(s);
}

// ============================================================ 7 · COMPETITIVE
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'Competitive Advantage'); title(s,'The only platform pairing portfolio governance with AI on live data',{size:24});
  const cols=['Capability','Xyrenis','Jira','MS Proj','Asana','Monday','ClickUp','Zoho','Notion'];
  const rows=[
    ['AI copilot on live data',      '●','○','—','○','○','◐','○','○'],
    ['Portfolio management',         '●','◐','◐','○','◐','◐','◐','—'],
    ['Department & subdivision hierarchy','●','—','—','—','○','○','◐','—'],
    ['Executive dashboards',         '●','◐','○','◐','◐','◐','◐','○'],
    ['Budget governance',            '●','—','◐','—','○','◐','◐','—'],
    ['Gantt + Kanban + Dependencies','●','◐','◐','◐','◐','●','◐','○'],
    ['Resource & capacity planning', '●','○','◐','○','◐','◐','◐','—'],
    ['Predictive portfolio insight', '●','—','—','—','—','—','—','—'],
  ];
  const x0=0.6,y0=1.8,tw=12.1,col0=3.5,cw=(tw-col0)/8,rh=0.5;
  cols.forEach((c,i)=>{ const cx=i===0?x0:x0+col0+(i-1)*cw, w=i===0?col0:cw;
    s.addShape(p.ShapeType.rect,{x:cx,y:y0,w,h:0.5,fill:{color:i===1?ACCENT:NAVY}});
    s.addText(c,{x:cx+0.03,y:y0,w:w-0.06,h:0.5,fontFace:BODY,fontSize:i===0?11:10,bold:true,color:WHITE,align:i===0?'left':'center',valign:'middle',margin:0}); });
  rows.forEach((r,ri)=>{ const ry=y0+0.5+ri*rh;
    s.addShape(p.ShapeType.rect,{x:x0,y:ry,w:tw,h:rh,fill:{color:ri%2?PALE:WHITE},line:{color:LINE,width:0.5}});
    s.addText(r[0],{x:x0+0.12,y:ry,w:col0-0.2,h:rh,fontFace:BODY,fontSize:10.5,color:INK,valign:'middle',margin:0});
    for(let i=1;i<9;i++){ const cx=x0+col0+(i-1)*cw; const sym=r[i];
      const col=i===1?ACCENT:(sym==='●'?EMER:sym==='◐'?AMBER:sym==='○'?MUTE:'CBD5E1');
      s.addText(sym,{x:cx,y:ry,w:cw,h:rh,fontFace:BODY,fontSize:14,bold:true,color:col,align:'center',valign:'middle',margin:0}); } });
  s.addText([{text:'● ',options:{color:EMER,bold:true}},{text:'Full   ',options:{color:SLATE}},{text:'◐ ',options:{color:AMBER,bold:true}},{text:'Partial   ',options:{color:SLATE}},{text:'○ ',options:{color:MUTE,bold:true}},{text:'Limited   ',options:{color:SLATE}},{text:'— ',options:{color:'CBD5E1',bold:true}},{text:'None',options:{color:SLATE}}],{x:x0,y:y0+0.5+rows.length*rh+0.08,w:9,h:0.3,fontFace:BODY,fontSize:10.5,margin:0});
  footer(s);
}

// ============================================================ 8 · BUSINESS IMPACT
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'Business Impact & ROI',{color:EMER}); title(s,'Outcomes executives can measure');
  const kpis=[['−30%','Faster delivery','early slip detection',EMER],['−13 hrs','Reporting removed','per manager / week',ACCENT],['+18%','Resource utilisation','capacity-matched work',TEAL],['−40%','Dependency delays','hidden blockers exposed',VIOLET],['100%','Executive visibility','one live line of sight',NAVY],['+25%','Project success rate','governance & ownership',AMBER]];
  const cw=3.86,ch=1.9,gx=0.22,gy=0.24; let i=0;
  for(let r=0;r<2;r++){ for(let c=0;c<3;c++){ const x=0.6+c*(cw+gx),y=1.8+r*(ch+gy); const [n,t,d,cc]=kpis[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:WHITE},line:{color:LINE,width:1},shadow:{type:'outer',color:'CBD5E1',blur:6,offset:2,angle:90,opacity:0.35}});
    s.addText(n,{x:x+0.2,y:y+0.16,w:cw-0.4,h:0.85,fontFace:TITLE,fontSize:38,bold:true,color:cc,margin:0});
    s.addText(t,{x:x+0.22,y:y+1.02,w:cw-0.44,h:0.4,fontFace:BODY,fontSize:14,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:x+0.22,y:y+1.4,w:cw-0.44,h:0.4,fontFace:BODY,fontSize:10.5,color:SLATE,margin:0}); } }
  s.addText('Illustrative outcomes based on enterprise PPM benchmarks; realised value varies by baseline maturity.',{x:0.6,y:H-0.78,w:11,h:0.3,fontFace:BODY,fontSize:9.5,italic:true,color:MUTE});
  footer(s);
}

// ============================================================ 9 · ROADMAP
{
  const s=p.addSlide(); s.background={color:WHITE};
  eyebrow(s,'Future Roadmap'); title(s,'From live control to autonomous delivery');
  const ph=[['Phase 1','Live control','Unified portfolio, dashboards, Kanban/Gantt, risk & budget — today','EMER','check'],['Phase 2','AI enhancement','Deeper Xyro reasoning, proactive digests, meeting summaries','ACCENT','cpu'],['Phase 3','Enterprise integration','Teams, Outlook, SSO, BI & warehouse connectors','TEAL','layers'],['Phase 4','Predictive portfolio','Forecast slips, overruns & capacity crunches','VIOLET','trending'],['Phase 5','Autonomous delivery','Xyro drafts plans, rebalances load, triggers workflows','NAVY','zap']];
  const M={EMER,ACCENT,TEAL,VIOLET,NAVY};
  const n=5,gap=0.22,cw=(12.1-(n-1)*gap)/n,y=2.15,ch=3.9,x0=0.6;
  s.addShape(p.ShapeType.line,{x:x0+cw/2,y:y-0.35,w:12.1-cw,h:0,line:{color:LINE,width:2}});
  ph.forEach(([ph_,t,d,c,ic],i)=>{ const x=x0+i*(cw+gap);
    s.addShape(p.ShapeType.ellipse,{x:x+cw/2-0.16,y:y-0.51,w:0.32,h:0.32,fill:{color:M[c]}});
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:i===0?'ECFDF5':PALE},line:{color:i===0?EMER:LINE,width:i===0?1.25:1}});
    s.addText(ph_.toUpperCase(),{x:x+0.16,y:y+0.2,w:cw-0.3,h:0.3,fontFace:BODY,fontSize:11,bold:true,color:M[c],charSpacing:1,margin:0});
    s.addShape(p.ShapeType.roundRect,{x:x+0.16,y:y+0.58,w:0.58,h:0.58,rectRadius:0.12,fill:{color:M[c]}});
    s.addImage({path:ico(ic,'white'),x:x+0.3,y:y+0.72,w:0.3,h:0.3});
    s.addText(t,{x:x+0.16,y:y+1.3,w:cw-0.3,h:0.65,fontFace:TITLE,fontSize:14,bold:true,color:NAVY,margin:0,lineSpacingMultiple:0.95});
    s.addText(d,{x:x+0.16,y:y+2.0,w:cw-0.3,h:1.5,fontFace:BODY,fontSize:10.5,color:SLATE,margin:0,lineSpacingMultiple:1.12});
    if(i===0){ s.addShape(p.ShapeType.roundRect,{x:x+0.16,y:y+ch-0.5,w:1.5,h:0.34,rectRadius:0.17,fill:{color:EMER}}); s.addText('AVAILABLE NOW',{x:x+0.16,y:y+ch-0.5,w:1.5,h:0.34,fontFace:BODY,fontSize:8.5,bold:true,color:WHITE,align:'center',valign:'middle',margin:0,charSpacing:1}); }
  });
  footer(s);
}

// ============================================================ 10 · CLOSING
{
  const s=p.addSlide(); s.background={color:NAVY};
  s.addImage({path:LOGO_W,x:W/2-2.1,y:1.35,w:4.2,h:4.2*374/1716});
  s.addText('Enterprise AI Project Intelligence',{x:1,y:2.85,w:11.33,h:0.9,fontFace:TITLE,fontSize:34,bold:true,color:WHITE,align:'center'});
  s.addText('From strategy to execution, powered by intelligence.',{x:1,y:3.85,w:11.33,h:0.5,fontFace:BODY,fontSize:18,italic:true,color:'CADCFC',align:'center'});
  // CTAs centered
  const bw1=3.4,bw2=2.7,gap=0.3, tot=bw1+bw2+gap, sx=(W-tot)/2;
  s.addShape(p.ShapeType.roundRect,{x:sx,y:4.85,w:bw1,h:0.72,rectRadius:0.12,fill:{color:ACCENT}});
  s.addText('Book an executive walkthrough',{x:sx,y:4.85,w:bw1,h:0.72,fontFace:BODY,fontSize:13,bold:true,color:WHITE,align:'center',valign:'middle',margin:0});
  s.addShape(p.ShapeType.roundRect,{x:sx+bw1+gap,y:4.85,w:bw2,h:0.72,rectRadius:0.12,fill:{type:'none'},line:{color:'2A4A82',width:1.5}});
  s.addText('Start a live pilot',{x:sx+bw1+gap,y:4.85,w:bw2,h:0.72,fontFace:BODY,fontSize:13,bold:true,color:'CADCFC',align:'center',valign:'middle',margin:0});
  s.addImage({path:XYRO,x:W/2-0.8,y:5.85,w:1.6,h:1.6});
  s.addText('xyrenis.app   ·   Where strategy meets execution.',{x:1,y:H-0.55,w:11.33,h:0.3,fontFace:BODY,fontSize:11,color:MUTE,align:'center'});
}

const OUT='/home/user/orbitpm-ai/deck-assets/Xyrenis-Executive-Deck-10.pptx';
await p.writeFile({fileName:OUT});
console.log('WROTE',OUT);
