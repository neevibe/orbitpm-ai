import pptxgen from 'pptxgenjs';

// ── palette ──────────────────────────────────────────────────────────────
const NAVY='0F2350', INK='1E293B', SLATE='475569', MUTE='94A3B8', LINE='E2E8F0',
      ACCENT='2563EB', TINT='EEF2FB', PALE='F8FAFC', WHITE='FFFFFF',
      EMER='059669', AMBER='D97706', RED='DC2626', TEAL='0891B2', VIOLET='7C3AED';
const TITLE='Cambria', BODY='Calibri';
const SHOTS='/home/user/orbitpm-ai/deck-assets/framed';
const IC='/home/user/orbitpm-ai/deck-assets/icons';
const ico=(n,c)=>`${IC}/${n}-${c}.png`;
const AR=3120/2064; // framed image aspect (w/h)

const p=new pptxgen();
p.defineLayoutProps={};
p.layout='LAYOUT_WIDE';           // 13.33 x 7.5
const W=13.33, H=7.5;
p.author='Xyrenis'; p.company='Xyrenis';

let PAGE=0;
function footer(s,{dark=false}={}){
  PAGE++;
  s.addText('XYRENIS', {x:0.6,y:H-0.42,w:2,h:0.25,fontFace:BODY,fontSize:9,bold:true,color:dark?MUTE:MUTE,charSpacing:2});
  s.addText(`${PAGE}`, {x:W-1.1,y:H-0.42,w:0.5,h:0.25,fontFace:BODY,fontSize:9,color:MUTE,align:'right'});
  s.addText('Enterprise AI Project Intelligence', {x:W/2-2.5,y:H-0.42,w:5,h:0.25,fontFace:BODY,fontSize:9,color:MUTE,align:'center'});
}
function eyebrow(s,txt,{x=0.6,y=0.5,color=ACCENT}={}){
  s.addText(txt.toUpperCase(),{x,y,w:8,h:0.3,fontFace:BODY,fontSize:12,bold:true,color,charSpacing:3});
}
function title(s,txt,{x=0.6,y=0.82,w=12,size=32,color=NAVY}={}){
  s.addText(txt,{x,y,w,h:0.9,fontFace:TITLE,fontSize:size,bold:true,color});
}
// framed screenshot placed by width; returns {x,y,w,h}
function shot(s,file,{x,y,w}){ const h=w/AR; s.addImage({path:`${SHOTS}/${file}.png`,x,y,w,h}); return {x,y,w,h}; }
function pill(s,txt,{x,y,w,color=NAVY,fill=WHITE,size=10.5}){
  s.addShape(p.ShapeType.roundRect,{x,y,w,h:0.42,rectRadius:0.08,fill:{color:fill},line:{color:LINE,width:1},shadow:{type:'outer',color:'94A3B8',blur:6,offset:2,angle:90,opacity:0.4}});
  s.addText(txt,{x:x+0.12,y,w:w-0.24,h:0.42,fontFace:BODY,fontSize:size,bold:true,color,align:'left',valign:'middle',margin:0});
}
function bg(s,color){ s.background={color}; }

// ============================================================ 1 · TITLE
{
  const s=p.addSlide(); bg(s,NAVY);
  // wordmark
  s.addText('XYRENIS',{x:0.7,y:0.55,w:6,h:0.6,fontFace:TITLE,fontSize:30,bold:true,color:WHITE,charSpacing:2});
  s.addText('AI-Powered Enterprise Project & Portfolio Management',{x:0.7,y:1.75,w:7.4,h:1.4,fontFace:TITLE,fontSize:33,bold:true,color:WHITE,lineSpacingMultiple:1.02});
  s.addText('Where strategy meets execution.',{x:0.72,y:3.15,w:7,h:0.5,fontFace:BODY,fontSize:17,italic:true,color:'CADCFC'});
  // audience chips
  const aud=['CEO','CIO / CTO','PMO','Enterprise IT','Investors'];
  let cx=0.72; aud.forEach(a=>{ const w=0.35+a.length*0.11; s.addShape(p.ShapeType.roundRect,{x:cx,y:3.95,w,h:0.42,rectRadius:0.2,fill:{color:'17305A'},line:{color:'2A4A82',width:1}}); s.addText(a,{x:cx,y:3.95,w,h:0.42,fontFace:BODY,fontSize:11,bold:true,color:'CADCFC',align:'center',valign:'middle',margin:0}); cx+=w+0.18; });
  s.addText('Board-level briefing · Product vision, capabilities & business case',{x:0.72,y:H-0.7,w:8,h:0.3,fontFace:BODY,fontSize:11,color:MUTE});
  // hero screenshot bleeding off the right
  shot(s,'dashboard',{x:8.15,y:1.15,w:6.4});
}

// ============================================================ 2 · EXEC SUMMARY
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Executive Summary'); title(s,'Enterprises don’t fail at strategy — they fail at execution');
  s.addText('70% of large transformation programmes miss their targets. The cause is rarely the plan; it is fragmented tooling, blind spots and manual governance that hide problems until they are expensive.',
    {x:0.6,y:1.7,w:6.0,h:1.4,fontFace:BODY,fontSize:14,color:SLATE,lineSpacingMultiple:1.15});
  const pains=[['folder','Projects scattered across Excel & email'],['eye','No single view of the portfolio'],['users','Unclear ownership & accountability'],['dollar','Budget leakage, discovered too late'],['shield','No portfolio-level governance'],['clock','Reporting assembled by hand, weekly'],['message','Siloed, disconnected communication']];
  let y=3.15;
  pains.forEach(([ic,t])=>{
    s.addShape(p.ShapeType.roundRect,{x:0.6,y:y-0.02,w:0.42,h:0.42,rectRadius:0.08,fill:{color:TINT}});
    s.addImage({path:ico(ic,'accent'),x:0.69,y:y+0.07,w:0.24,h:0.24});
    s.addText(t,{x:1.2,y:y-0.02,w:5.3,h:0.42,fontFace:BODY,fontSize:13,color:INK,valign:'middle',margin:0});
    y+=0.53;
  });
  // right: solution panel
  s.addShape(p.ShapeType.roundRect,{x:7.1,y:1.7,w:5.63,h:5.2,rectRadius:0.12,fill:{color:NAVY}});
  s.addImage({path:ico('zap','white'),x:7.5,y:2.05,w:0.5,h:0.5});
  s.addText('The Xyrenis answer',{x:8.15,y:2.05,w:4.3,h:0.5,fontFace:TITLE,fontSize:20,bold:true,color:WHITE,valign:'middle',margin:0});
  s.addText('One AI-native platform that unifies planning, execution, portfolio governance and reporting — with an intelligent copilot, Xyro, embedded in every workflow.',
    {x:7.5,y:2.75,w:4.8,h:1.3,fontFace:BODY,fontSize:14,color:'CADCFC',lineSpacingMultiple:1.18});
  const wins=[['One system of record, not ten tools'],['Executive visibility across the portfolio'],['AI that turns data into decisions'],['Governance by department & ownership']];
  let wy=4.15; wins.forEach(([t])=>{ s.addImage({path:ico('check','white'),x:7.5,y:wy+0.03,w:0.28,h:0.28}); s.addText(t,{x:7.95,y:wy,w:4.4,h:0.36,fontFace:BODY,fontSize:13,bold:true,color:WHITE,valign:'middle',margin:0}); wy+=0.62; });
  footer(s);
}

// ============================================================ 3 · THE PROBLEM
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'The Problem',{color:RED}); title(s,'The cost of poor project visibility is measurable — and large');
  const stats=[['70%','of transformation programmes miss cost, time or value targets',RED],['$1M','wasted for every $1B spent, on average, due to poor performance',AMBER],['54%','of PMO leaders lack real-time visibility into portfolio health',ACCENT],['13hrs','per manager per week spent assembling status reports by hand',VIOLET]];
  let x=0.6; const cw=2.94;
  stats.forEach(([n,t,c])=>{
    s.addShape(p.ShapeType.roundRect,{x,y:1.85,w:cw,h:2.5,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addText(n,{x:x+0.05,y:2.1,w:cw-0.1,h:1.0,fontFace:TITLE,fontSize:44,bold:true,color:c,align:'left'});
    s.addText(t,{x:x+0.22,y:3.15,w:cw-0.44,h:1.05,fontFace:BODY,fontSize:12.5,color:SLATE,lineSpacingMultiple:1.12});
    x+=cw+0.18;
  });
  // bottom: the vicious cycle process
  s.addText('Why it compounds',{x:0.6,y:4.75,w:6,h:0.4,fontFace:BODY,fontSize:13,bold:true,color:NAVY,charSpacing:1});
  const cyc=['Fragmented tools','Blind spots','Late escalation','Budget & schedule overrun','Lost executive trust'];
  let px=0.6; const pw=2.28;
  cyc.forEach((t,i)=>{
    s.addShape(p.ShapeType.roundRect,{x:px,y:5.25,w:pw,h:0.95,rectRadius:0.1,fill:{color:i===cyc.length-1?'FBEBEA':TINT}});
    s.addText(t,{x:px+0.1,y:5.25,w:pw-0.2,h:0.95,fontFace:BODY,fontSize:12,bold:true,color:i===cyc.length-1?RED:NAVY,align:'center',valign:'middle',margin:0});
    if(i<cyc.length-1) s.addImage({path:ico('arrow','slate'),x:px+pw+0.02,y:5.56,w:0.3,h:0.3});
    px+=pw+0.32;
  });
  footer(s);
}

// ============================================================ 4 · THE SOLUTION
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'The Solution'); title(s,'One platform across the full delivery lifecycle');
  const pill7=[['compass','Planning','Roadmaps, milestones & structured intake','ACCENT'],['grid','Execution','Tasks, Kanban, Gantt & dependencies','TEAL'],['briefcase','Portfolio Governance','Departments, ownership & prioritisation','VIOLET'],['cpu','AI Assistance','Xyro copilot embedded in every view','NAVY'],['pie','Reporting','Live analytics & one-click exec exports','EMER'],['zap','Automation','Alerts, approvals & workflow triggers','AMBER'],['target','Decision Making','Risk, budget & capacity intelligence','RED']];
  const M={ACCENT,TEAL,VIOLET,NAVY,EMER,AMBER,RED};
  const cnames={ACCENT:'accent',TEAL:'teal',VIOLET:'violet',NAVY:'navy',EMER:'emerald',AMBER:'amber',RED:'red'};
  // 4 across top, 3 across bottom centered
  const cw=2.94, ch=2.15, gx=0.18;
  function card(x,y,[ic,t,d,c]){
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addShape(p.ShapeType.roundRect,{x:x+0.22,y:y+0.24,w:0.62,h:0.62,rectRadius:0.12,fill:{color:M[c]}});
    s.addImage({path:ico(ic,'white'),x:x+0.37,y:y+0.39,w:0.32,h:0.32});
    s.addText(t,{x:x+0.22,y:y+1.0,w:cw-0.44,h:0.4,fontFace:TITLE,fontSize:16,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:x+0.22,y:y+1.42,w:cw-0.44,h:0.7,fontFace:BODY,fontSize:11.5,color:SLATE,lineSpacingMultiple:1.1,margin:0});
  }
  let x=0.6; for(let i=0;i<4;i++){ card(x,1.75,pill7[i]); x+=cw+gx; }
  x=0.6+ (cw+gx)*0.5; for(let i=4;i<7;i++){ card(x,4.15,pill7[i]); x+=cw+gx; }
  footer(s);
}

// ============================================================ 5 · PLATFORM OVERVIEW
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Platform Overview'); title(s,'A complete operating system for enterprise delivery');
  const mods=[['layout','Dashboard'],['grid','Projects'],['briefcase','Portfolio'],['check','Tasks'],['columns','Kanban'],['calendar','Calendar'],['bar','Gantt'],['pie','Reports'],['dollar','Budgets'],['zap','Automation'],['cpu','Xyro AI'],['shield','Admin']];
  const cw=2.9, ch=1.28, gx=0.19, gy=0.22; let i=0;
  for(let r=0;r<3;r++){ for(let c=0;c<4;c++){ const x=0.6+c*(cw+gx), y=1.8+r*(ch+gy); const [ic,t]=mods[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:WHITE},line:{color:LINE,width:1},shadow:{type:'outer',color:'CBD5E1',blur:5,offset:2,angle:90,opacity:0.35}});
    s.addShape(p.ShapeType.roundRect,{x:x+0.2,y:y+0.32,w:0.62,h:0.62,rectRadius:0.12,fill:{color:TINT}});
    s.addImage({path:ico(ic,'accent'),x:x+0.35,y:y+0.47,w:0.32,h:0.32});
    s.addText(t,{x:x+0.98,y,w:cw-1.1,h:ch,fontFace:TITLE,fontSize:16,bold:true,color:NAVY,valign:'middle',margin:0});
  } }
  footer(s);
}

// ── generic feature deep-dive slide ────────────────────────────────────────
function feature(s,{tag,tt,file,intro,points,roi,roiLabel,tagColor=ACCENT,annos=[]}){
  bg(s,WHITE); eyebrow(s,tag,{color:tagColor}); title(s,tt,{w:5.55,size:25});
  s.addText(intro,{x:0.6,y:1.75,w:5.4,h:1.25,fontFace:BODY,fontSize:13.5,color:SLATE,lineSpacingMultiple:1.16});
  let y=3.15;
  points.forEach(([ic,head,body])=>{
    s.addShape(p.ShapeType.roundRect,{x:0.6,y,w:0.5,h:0.5,rectRadius:0.1,fill:{color:TINT}});
    s.addImage({path:ico(ic,'accent'),x:0.71,y:y+0.11,w:0.28,h:0.28});
    s.addText(head,{x:1.24,y:y-0.03,w:4.9,h:0.32,fontFace:BODY,fontSize:13.5,bold:true,color:NAVY,margin:0});
    s.addText(body,{x:1.24,y:y+0.28,w:4.9,h:0.4,fontFace:BODY,fontSize:11.5,color:SLATE,margin:0,lineSpacingMultiple:1.05});
    y+=0.86;
  });
  // ROI chip
  s.addShape(p.ShapeType.roundRect,{x:0.6,y:H-1.1,w:5.4,h:0.62,rectRadius:0.1,fill:{color:NAVY}});
  s.addImage({path:ico('trending','white'),x:0.78,y:H-0.95,w:0.32,h:0.32});
  s.addText([{text:`${roi}  `,options:{bold:true,color:WHITE,fontSize:15}},{text:roiLabel,options:{color:'CADCFC',fontSize:12}}],{x:1.25,y:H-1.1,w:4.6,h:0.62,fontFace:BODY,valign:'middle',margin:0});
  // screenshot
  const g=shot(s,file,{x:6.35,y:1.55,w:6.55});
  // annotations (numbered callout pills anchored inside the image)
  annos.forEach((a,i)=>{
    const ax=g.x+a.rx*g.w, ay=g.y+a.ry*g.h;
    s.addShape(p.ShapeType.roundRect,{x:ax,y:ay,w:a.w,h:0.5,rectRadius:0.09,fill:{color:WHITE},line:{color:ACCENT,width:1.25},shadow:{type:'outer',color:'64748B',blur:7,offset:2,angle:90,opacity:0.45}});
    s.addShape(p.ShapeType.ellipse,{x:ax+0.08,y:ay+0.11,w:0.28,h:0.28,fill:{color:ACCENT}});
    s.addText(`${i+1}`,{x:ax+0.08,y:ay+0.11,w:0.28,h:0.28,fontFace:BODY,fontSize:11,bold:true,color:WHITE,align:'center',valign:'middle',margin:0});
    s.addText(a.t,{x:ax+0.44,y:ay,w:a.w-0.5,h:0.5,fontFace:BODY,fontSize:10.5,bold:true,color:NAVY,valign:'middle',margin:0});
  });
  footer(s);
}

// ============================================================ 6–15 · FEATURE DEEP DIVES
feature(p.addSlide(),{tag:'Feature · Command Center',tt:'Executive dashboard, updated in real time',file:'dashboard',
  intro:'A single, live view of the entire portfolio — status, health, risk and capacity — the moment leaders open the app.',
  points:[['eye','Portfolio health at a glance','Status mix, on-track vs at-risk, avg progress'],['zap','AI recommendations','Xyro surfaces what needs attention today'],['activity','Live activity trail','Every change and alert, auto-logged']],
  roi:'−75%',roiLabel:'time to a portfolio status answer',
  annos:[{rx:0.18,ry:0.09,w:2.3,t:'Six live KPIs'},{rx:0.62,ry:0.55,w:2.5,t:'AI recommendations'}]});

feature(p.addSlide(),{tag:'Feature · Portfolio Management',tt:'Govern the whole portfolio, not just projects',file:'portfolio',tagColor:VIOLET,
  intro:'Roll every initiative up by department, priority and health so executives can steer investment where it matters.',
  points:[['briefcase','Portfolio roll-ups','Group, filter and rank by any dimension'],['target','Priority & health lenses','Spot the critical few among the many'],['shield','Governance built in','Department & ownership scoping throughout']],
  roi:'100%',roiLabel:'portfolio coverage in one view',
  annos:[{rx:0.16,ry:0.1,w:2.5,t:'Health & priority'}]});

feature(p.addSlide(),{tag:'Feature · Project Management',tt:'Every project, fully instrumented',file:'project-detail',tagColor:TEAL,
  intro:'Owner, department, dates, budget, tasks, dependencies and risk — structured on one page, not scattered across files.',
  points:[['dollar','Budget tracking','Total, utilised and balance, live'],['git','Dependencies & risk','Cross-team blockers made visible'],['check','Structured tasks','Milestones, assignees and progress']],
  roi:'−60%',roiLabel:'status-gathering effort per project',
  annos:[{rx:0.14,ry:0.28,w:2.4,t:'Budget in ₹, live'},{rx:0.55,ry:0.62,w:2.4,t:'Tabbed workspace'}]});

feature(p.addSlide(),{tag:'Feature · Kanban',tt:'Flow-based execution the whole team can see',file:'kanban',tagColor:TEAL,
  intro:'Drag work across Backlog → Completed with assignees, due dates and progress — WIP and bottlenecks become obvious.',
  points:[['columns','Visual workflow','Backlog, To-Do, In-Progress, Review, Done'],['users','Clear ownership','Every card carries an assignee'],['activity','Live progress','Bars and dates on each task']],
  roi:'+22%',roiLabel:'throughput from visible WIP',
  annos:[{rx:0.05,ry:0.34,w:2.3,t:'Assignee avatars'}]});

feature(p.addSlide(),{tag:'Feature · Gantt & Timeline',tt:'Schedule, sequence and critical path',file:'gantt',tagColor:AMBER,
  intro:'See how work sequences across time, where slack exists and which slips threaten the delivery date.',
  points:[['bar','Timeline view','Task bars across the full schedule'],['git','Sequencing','Dependencies made explicit'],['clock','Slip detection','Overruns surfaced before they cascade']],
  roi:'−30%',roiLabel:'schedule surprises late in delivery'});

feature(p.addSlide(),{tag:'Feature · Dependencies',tt:'Make cross-functional blockers visible',file:'dependencies',tagColor:VIOLET,
  intro:'Internal and external dependencies are classified, owned and mirrored to the department that must act — nothing falls between teams.',
  points:[['git','Internal & external','Classified with owners and status'],['users','Shared visibility','Mirrored to the dependent team'],['alert','Early warning','Blocked chains flagged automatically']],
  roi:'−40%',roiLabel:'delays caused by hidden dependencies'});

feature(p.addSlide(),{tag:'Feature · Risk Register',tt:'Enterprise risk, scored and owned',file:'risks',tagColor:RED,
  intro:'Every risk carries impact, likelihood, a computed score, an owner and a mitigation — rolling up into portfolio exposure.',
  points:[['alert','Scored & severity-ranked','Impact × likelihood, consistently'],['users','Owned mitigations','Accountability on every entry'],['pie','Portfolio exposure','Risk rolls up to the executive view']],
  roi:'2×',roiLabel:'faster escalation of high-impact risk',
  annos:[{rx:0.12,ry:0.12,w:2.5,t:'Scored register'}]});

feature(p.addSlide(),{tag:'Feature · Resource & Workload',tt:'See capacity before you commit',file:'workforce',tagColor:TEAL,
  intro:'Workload by owner, capacity bands and bottleneck detection — so commitments match the team you actually have.',
  points:[['users','Workload distribution','Active load per person, ranked'],['activity','Capacity bands','Healthy / moderate / overloaded'],['target','Bottleneck alerts','Over-allocated owners flagged']],
  roi:'+18%',roiLabel:'improvement in resource utilisation'});

feature(p.addSlide(),{tag:'Feature · Analytics & Reports',tt:'Board-ready analytics, zero manual assembly',file:'analytics',tagColor:EMER,
  intro:'Live charts across status, department, priority and trend — exportable to a polished PDF pack in one click.',
  points:[['pie','Executive analytics','Every cut of the portfolio, live'],['bar','Trend intelligence','Direction of travel, not just today'],['check','One-click exports','From screen to board deck instantly']],
  roi:'−13 hrs',roiLabel:'manual reporting saved, per manager / week'});

feature(p.addSlide(),{tag:'Feature · Governance & Data Integrity',tt:'Governance and clean data, enforced',file:'data-sanity',tagColor:NAVY,
  intro:'Role-based access by department and subdivision, an immutable audit trail, and an admin data-sanity engine that keeps the register trustworthy.',
  points:[['shield','Role-based access','Department & subdivision scoping'],['database','Data integrity audit','Duplicate owners & gaps, one-click fix'],['activity','Immutable audit trail','Every privileged action recorded']],
  roi:'100%',roiLabel:'of the register kept demonstrably clean'});

// ============================================================ 16 · XYRO DIVIDER
{
  const s=p.addSlide(); bg(s,NAVY);
  eyebrow(s,'Intelligence Layer',{color:'7FA8FF'});
  s.addText('Meet Xyro',{x:0.7,y:1.2,w:7,h:1.0,fontFace:TITLE,fontSize:46,bold:true,color:WHITE});
  s.addText('The AI copilot embedded in every workflow — not a bolt-on chatbot.',{x:0.72,y:2.35,w:6.6,h:0.9,fontFace:BODY,fontSize:18,italic:true,color:'CADCFC',lineSpacingMultiple:1.1});
  const caps=['Answers questions of live portfolio data in plain language','Summarises status, risk and budget variance on demand','Prioritises work and recommends the next best action','Drafts reports, roadmaps and updates automatically'];
  let y=3.5; caps.forEach(t=>{ s.addImage({path:ico('check','white'),x:0.74,y:y+0.02,w:0.3,h:0.3}); s.addText(t,{x:1.2,y,w:6.1,h:0.4,fontFace:BODY,fontSize:14,color:WHITE,valign:'middle',margin:0}); y+=0.62; });
  shot(s,'xyro-panel',{x:8.35,y:1.2,w:6.1});
  footer(s,{dark:true});
}

// ============================================================ 17 · XYRO CAPABILITIES
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Xyro AI'); title(s,'Much more than a chatbot — an analyst on every desk');
  const caps=[['message','Natural-language data access','Ask across every project in plain English'],['activity','Status summaries','Instant roll-ups by project or portfolio'],['pie','Executive insights','Portfolio health explained, not just shown'],['alert','Risk identification','Surfaces exposure before it escalates'],['dollar','Budget variance','Explains the why behind the numbers'],['target','Task prioritisation','Recommends the next best action'],['search','Smart search','Find anything across the register'],['trending','Predictive insight','Flags likely slips ahead of time'],['check','Automated reports','Board-ready output on demand']];
  const cw=3.86, ch=1.28, gx=0.22, gy=0.22; let i=0;
  for(let r=0;r<3;r++){ for(let c=0;c<3;c++){ const x=0.6+c*(cw+gx), y=1.8+r*(ch+gy); const [ic,t,d]=caps[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addShape(p.ShapeType.roundRect,{x:x+0.2,y:y+0.22,w:0.56,h:0.56,rectRadius:0.12,fill:{color:NAVY}});
    s.addImage({path:ico(ic,'white'),x:x+0.34,y:y+0.36,w:0.28,h:0.28});
    s.addText(t,{x:x+0.92,y:y+0.16,w:cw-1.05,h:0.42,fontFace:BODY,fontSize:13,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:x+0.92,y:y+0.6,w:cw-1.05,h:0.55,fontFace:BODY,fontSize:10.5,color:SLATE,margin:0,lineSpacingMultiple:1.05});
  } }
  footer(s);
}

// ============================================================ 18 · COMPETITIVE MATRIX
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Competitive Landscape'); title(s,'Where Xyrenis stands apart',{size:28});
  const cols=['Capability','Xyrenis','Jira','MS Project','Asana','Monday','Smartsheet'];
  const rows=[
    ['AI copilot on live data','●','○','—','○','○','—'],
    ['Portfolio management','●','◐','◐','○','◐','◐'],
    ['Department & subdivision hierarchy','●','—','—','—','○','○'],
    ['Executive dashboards','●','◐','○','◐','◐','◐'],
    ['Budget governance','●','—','◐','—','○','◐'],
    ['Gantt + Kanban + Dependencies','●','◐','◐','◐','◐','◐'],
    ['Resource & capacity planning','●','○','◐','○','◐','◐'],
    ['Workflow automation','●','◐','—','◐','●','◐'],
    ['Role-based access & audit','●','◐','○','○','◐','◐'],
    ['Predictive portfolio insight','●','—','—','—','—','—'],
  ];
  const x0=0.6, y0=1.75, tw=12.1, col0=3.9, cellW=(tw-col0)/6, rh=0.44;
  // header
  cols.forEach((c,i)=>{
    const cx=i===0?x0:x0+col0+(i-1)*cellW;
    const cw=i===0?col0:cellW;
    s.addShape(p.ShapeType.rect,{x:cx,y:y0,w:cw,h:0.52,fill:{color:i===1?ACCENT:NAVY}});
    s.addText(c,{x:cx+0.05,y:y0,w:cw-0.1,h:0.52,fontFace:BODY,fontSize:i===0?11.5:11,bold:true,color:WHITE,align:i===0?'left':'center',valign:'middle',margin:0});
  });
  rows.forEach((r,ri)=>{
    const ry=y0+0.52+ri*rh;
    s.addShape(p.ShapeType.rect,{x:x0,y:ry,w:tw,h:rh,fill:{color:ri%2?PALE:WHITE},line:{color:LINE,width:0.5}});
    s.addText(r[0],{x:x0+0.12,y:ry,w:col0-0.2,h:rh,fontFace:BODY,fontSize:11,color:INK,valign:'middle',margin:0});
    for(let i=1;i<7;i++){ const cx=x0+col0+(i-1)*cellW; const sym=r[i];
      const col=i===1?ACCENT:(sym==='●'?EMER:sym==='◐'?AMBER:sym==='○'?MUTE:'CBD5E1');
      s.addText(sym,{x:cx,y:ry,w:cellW,h:rh,fontFace:BODY,fontSize:14,bold:true,color:i===1?ACCENT:col,align:'center',valign:'middle',margin:0});
    }
  });
  // legend
  s.addText([{text:'● ',options:{color:EMER,bold:true}},{text:'Full   ',options:{color:SLATE}},{text:'◐ ',options:{color:AMBER,bold:true}},{text:'Partial   ',options:{color:SLATE}},{text:'○ ',options:{color:MUTE,bold:true}},{text:'Limited   ',options:{color:SLATE}},{text:'— ',options:{color:'CBD5E1',bold:true}},{text:'None',options:{color:SLATE}}],{x:x0,y:y0+0.52+rows.length*rh+0.1,w:9,h:0.3,fontFace:BODY,fontSize:10.5,margin:0});
  footer(s);
}

// ============================================================ 19 · WHY BETTER
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'The Differentiation'); title(s,'Why enterprises choose Xyrenis');
  const items=[['layers','Unified, not fragmented','One platform replaces a stack of disconnected point tools.'],['cpu','AI-native, not bolted on','Xyro is embedded in every view — intelligence where work happens.'],['eye','Executive visibility','One live line of sight from strategy to the task.'],['shield','Governance by design','Departments, subdivisions and ownership enforced end-to-end.'],['pie','Decisions on data','Rich analytics turn the register into a decision engine.'],['zap','Lower overhead','Automation removes the manual reporting and chase-ups.']];
  const cw=3.86, ch=1.9, gx=0.22, gy=0.24; let i=0;
  for(let r=0;r<2;r++){ for(let c=0;c<3;c++){ const x=0.6+c*(cw+gx), y=1.8+r*(ch+gy); const [ic,t,d]=items[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:PALE},line:{color:LINE,width:1}});
    s.addShape(p.ShapeType.roundRect,{x:x+0.22,y:y+0.24,w:0.6,h:0.6,rectRadius:0.12,fill:{color:ACCENT}});
    s.addImage({path:ico(ic,'white'),x:x+0.37,y:y+0.39,w:0.3,h:0.3});
    s.addText(t,{x:x+0.22,y:y+0.95,w:cw-0.44,h:0.4,fontFace:TITLE,fontSize:15,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:x+0.22,y:y+1.32,w:cw-0.44,h:0.5,fontFace:BODY,fontSize:11,color:SLATE,margin:0,lineSpacingMultiple:1.1});
  } }
  footer(s);
}

// ============================================================ 20 · BUSINESS IMPACT
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Business Impact',{color:EMER}); title(s,'Outcomes executives can measure');
  const kpis=[['−30%','Faster project delivery','tighter sequencing & early slip detection',EMER],['−13 hrs','Reporting effort removed','per manager, per week',ACCENT],['+18%','Resource utilisation','capacity matched to commitments',TEAL],['−40%','Dependency delays','hidden blockers made visible',VIOLET],['100%','Executive visibility','one live portfolio line of sight',NAVY],['+25%','Project success rate','governance & accountability',AMBER]];
  const cw=3.86, ch=1.9, gx=0.22, gy=0.24; let i=0;
  for(let r=0;r<2;r++){ for(let c=0;c<3;c++){ const x=0.6+c*(cw+gx), y=1.8+r*(ch+gy); const [n,t,d,cc]=kpis[i++];
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:WHITE},line:{color:LINE,width:1},shadow:{type:'outer',color:'CBD5E1',blur:6,offset:2,angle:90,opacity:0.35}});
    s.addText(n,{x:x+0.2,y:y+0.18,w:cw-0.4,h:0.85,fontFace:TITLE,fontSize:40,bold:true,color:cc,margin:0});
    s.addText(t,{x:x+0.22,y:y+1.05,w:cw-0.44,h:0.4,fontFace:BODY,fontSize:14,bold:true,color:NAVY,margin:0});
    s.addText(d,{x:x+0.22,y:y+1.42,w:cw-0.44,h:0.4,fontFace:BODY,fontSize:10.5,color:SLATE,margin:0,lineSpacingMultiple:1.05});
  } }
  s.addText('Illustrative outcomes based on enterprise PPM benchmarks; realised value varies by baseline maturity.',{x:0.6,y:H-0.75,w:11,h:0.3,fontFace:BODY,fontSize:9.5,italic:true,color:MUTE});
  footer(s);
}

// ============================================================ 21 · ARCHITECTURE
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Product Architecture'); title(s,'How the platform fits together');
  const layers=[['users','Users','CEO · CIO · PMO · Project & Department leads','SLATE'],['grid','Xyrenis Platform · Modules','Dashboard · Projects · Portfolio · Kanban · Gantt · Risk · Budget','ACCENT'],['cpu','Xyro AI Engine','Reasoning & recommendations grounded on live data','NAVY'],['pie','Analytics Layer','KPIs · trends · portfolio intelligence','TEAL'],['zap','Integrations & Automation','Microsoft Teams · Outlook · webhooks · alerts','VIOLET'],['check','Reporting & Export','Executive PDF packs · board decks · audit trail','EMER']];
  const M={SLATE,ACCENT,NAVY,TEAL,VIOLET,EMER};
  const cnames={SLATE:'slate',ACCENT:'white',NAVY:'white',TEAL:'white',VIOLET:'white',EMER:'white'};
  const lw=8.4, lh=0.62, step=0.79, x=1.25; let y=1.7;
  layers.forEach(([ic,t,d,c],idx)=>{
    const fill = idx===0?PALE:M[c];
    s.addShape(p.ShapeType.roundRect,{x,y,w:lw,h:lh,rectRadius:0.08,fill:{color:fill},line:idx===0?{color:LINE,width:1}:{type:'none'}});
    s.addImage({path:ico(ic,idx===0?'slate':cnames[c]),x:x+0.24,y:y+0.15,w:0.32,h:0.32});
    s.addText(t,{x:x+0.76,y:y+0.02,w:lw-1,h:0.3,fontFace:BODY,fontSize:13.5,bold:true,color:idx===0?NAVY:WHITE,margin:0});
    s.addText(d,{x:x+0.76,y:y+0.32,w:lw-1,h:0.28,fontFace:BODY,fontSize:10,color:idx===0?SLATE:'E2E8F0',margin:0});
    if(idx<layers.length-1) s.addShape(p.ShapeType.chevron,{x:x+lw/2-0.15,y:y+lh+0.005,w:0.3,h:0.16,rotate:90,fill:{color:MUTE}});
    y+=step;
  });
  // side note
  s.addShape(p.ShapeType.roundRect,{x:x+lw+0.5,y:1.7,w:3.0,h:4.4,rectRadius:0.1,fill:{color:NAVY}});
  s.addText('Design principles',{x:x+lw+0.7,y:1.9,w:2.6,h:0.4,fontFace:TITLE,fontSize:15,bold:true,color:WHITE,margin:0});
  const pr=['Single system of record','AI grounded on real data','Governance enforced in the data layer','Cloud-native & enterprise-ready'];
  let py=2.55; pr.forEach(t=>{ s.addImage({path:ico('check','white'),x:x+lw+0.7,y:py+0.02,w:0.26,h:0.26}); s.addText(t,{x:x+lw+1.04,y:py-0.05,w:2.28,h:0.6,fontFace:BODY,fontSize:11.5,color:'CADCFC',valign:'top',margin:0,lineSpacingMultiple:1.05}); py+=0.82; });
  footer(s);
}

// ============================================================ 22 · ROADMAP
{
  const s=p.addSlide(); bg(s,WHITE);
  eyebrow(s,'Future Roadmap'); title(s,'From live control to autonomous delivery');
  const ph=[['Phase 1','Live control','Unified portfolio, dashboards, Kanban/Gantt, risk & budget — available today','EMER','check'],['Phase 2','AI enhancement','Deeper Xyro reasoning, proactive digests, meeting summaries','ACCENT','cpu'],['Phase 3','Enterprise integration','Teams, Outlook, SSO, data-warehouse & BI connectors','TEAL','layers'],['Phase 4','Predictive portfolio','Forecast slips, budget overruns & capacity crunches','VIOLET','trending'],['Phase 5','Autonomous delivery','Xyro drafts plans, rebalances load & triggers workflows','NAVY','zap']];
  const M={EMER,ACCENT,TEAL,VIOLET,NAVY};
  const n=ph.length, gap=0.22, cw=(12.1-(n-1)*gap)/n, y=2.1, ch=4.0, x0=0.6;
  // baseline
  s.addShape(p.ShapeType.line,{x:x0+cw/2,y:y-0.35,w:12.1-cw,h:0,line:{color:LINE,width:2}});
  ph.forEach(([ph_,t,d,c,ic],i)=>{
    const x=x0+i*(cw+gap);
    s.addShape(p.ShapeType.ellipse,{x:x+cw/2-0.16,y:y-0.51,w:0.32,h:0.32,fill:{color:M[c]}});
    s.addShape(p.ShapeType.roundRect,{x,y,w:cw,h:ch,rectRadius:0.1,fill:{color:i===0?'ECFDF5':PALE},line:{color:i===0?EMER:LINE,width:i===0?1.25:1}});
    s.addText(ph_.toUpperCase(),{x:x+0.16,y:y+0.2,w:cw-0.3,h:0.3,fontFace:BODY,fontSize:11,bold:true,color:M[c],charSpacing:1,margin:0});
    s.addShape(p.ShapeType.roundRect,{x:x+0.16,y:y+0.6,w:0.6,h:0.6,rectRadius:0.12,fill:{color:M[c]}});
    s.addImage({path:ico(ic,'white'),x:x+0.31,y:y+0.75,w:0.3,h:0.3});
    s.addText(t,{x:x+0.16,y:y+1.35,w:cw-0.3,h:0.7,fontFace:TITLE,fontSize:14.5,bold:true,color:NAVY,margin:0,lineSpacingMultiple:0.95});
    s.addText(d,{x:x+0.16,y:y+2.1,w:cw-0.3,h:1.7,fontFace:BODY,fontSize:10.5,color:SLATE,margin:0,lineSpacingMultiple:1.12});
    if(i===0) { s.addShape(p.ShapeType.roundRect,{x:x+0.16,y:y+ch-0.5,w:1.5,h:0.34,rectRadius:0.17,fill:{color:EMER}}); s.addText('AVAILABLE NOW',{x:x+0.16,y:y+ch-0.5,w:1.5,h:0.34,fontFace:BODY,fontSize:8.5,bold:true,color:WHITE,align:'center',valign:'middle',margin:0,charSpacing:1}); }
  });
  footer(s);
}

// ============================================================ 23 · CLOSING
{
  const s=p.addSlide(); bg(s,NAVY);
  s.addText('XYRENIS',{x:0.7,y:1.5,w:8,h:0.6,fontFace:TITLE,fontSize:26,bold:true,color:WHITE,charSpacing:3});
  s.addText('Enterprise AI Project Intelligence',{x:0.7,y:2.4,w:11.5,h:1.0,fontFace:TITLE,fontSize:40,bold:true,color:WHITE});
  s.addText('From strategy to execution, powered by intelligence.',{x:0.72,y:3.6,w:11,h:0.6,fontFace:BODY,fontSize:19,italic:true,color:'CADCFC'});
  // CTA
  s.addShape(p.ShapeType.roundRect,{x:0.72,y:4.7,w:3.3,h:0.72,rectRadius:0.12,fill:{color:ACCENT}});
  s.addText('Book an executive walkthrough',{x:0.72,y:4.7,w:3.3,h:0.72,fontFace:BODY,fontSize:13,bold:true,color:WHITE,align:'center',valign:'middle',margin:0});
  s.addShape(p.ShapeType.roundRect,{x:4.2,y:4.7,w:2.7,h:0.72,rectRadius:0.12,fill:{type:'none'},line:{color:'2A4A82',width:1.5}});
  s.addText('Start a live pilot',{x:4.2,y:4.7,w:2.7,h:0.72,fontFace:BODY,fontSize:13,bold:true,color:'CADCFC',align:'center',valign:'middle',margin:0});
  s.addText('xyrenis.app   ·   Where strategy meets execution.',{x:0.72,y:H-0.7,w:10,h:0.3,fontFace:BODY,fontSize:11,color:MUTE});
}

const OUT='/home/user/orbitpm-ai/deck-assets/Xyrenis-Executive-Deck.pptx';
await p.writeFile({fileName:OUT});
console.log('WROTE', OUT);
