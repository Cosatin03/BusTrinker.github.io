export const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const tasks = {
 waterfall: ['Wasserfall','Alle beginnen gemeinsam. Die ziehende Person darf zuerst aufhören, danach reihum jeweils erst, wenn die vorherige Person aufgehört hat.'],
 give: ['Du bestimmst','Wähle eine Person, die die eingestellte Anzahl Schlücke bekommt.'],
 self: ['Ich selbst','Du bekommst die eingestellte Anzahl Schlücke.'],
 floor: ['Boden','Alle berühren den Boden. Wählt die letzte Person aus.'],
 men: ['Männer','Alle Männer bekommen die eingestellte Anzahl Schlücke. Markiert die betroffenen Personen.'],
 women: ['Frauen','Alle Frauen bekommen die eingestellte Anzahl Schlücke. Markiert die betroffenen Personen.'],
 heaven: ['Himmel','Alle Hände nach oben! Wählt die letzte Person aus.'],
 mate: ['Trinkpartner','Wähle einen Partner. Wenn einer von euch Schlücke bekommt, bekommt der andere dieselbe Menge. Die Verbindung gilt bis Spielende.'],
 rhyme: ['Reimen','Nenne ein Wort. Reihum nennt ihr einen neuen Reim. Wiederholung, kein Reim oder zu langes Zögern verliert. Wählt die Person aus.'],
 category: ['Kategorie','Nenne eine Kategorie und einen passenden Begriff. Reihum folgen neue Begriffe. Wiederholung oder keine Antwort verliert.'],
 rule: ['Neue Regel','Erfinde eine Regel. Sie bleibt bis Spielende sichtbar und gültig.'],
 question: ['Fragenmeister','Wer deine Fragen beantwortet, bekommt Schlücke. Die nächste Fragenmeister-Karte ersetzt dich. Verstöße könnt ihr unter „Verstoß“ erfassen.'],
 king: ['Königsbecher','Die ersten drei Könige füllen den Becher symbolisch. Beim vierten König erhält die ziehende Person die eingestellte Becher-Aufgabe.'],
 thumb: ['Daumenmeister','Du darfst jederzeit den Daumen auf den Tisch legen. Wer es zuletzt nachmacht, bekommt Schlücke. Die nächste Daumenmeister-Karte ersetzt dich.'],
 all: ['Alle','Alle bekommen die eingestellte Anzahl Schlücke.'],
 reverse: ['Richtungswechsel','Ab jetzt zieht ihr in der anderen Richtung.'],
 custom: ['Eigene Aufgabe','Führt eure selbst festgelegte Aufgabe aus.']
};
export const defaults = Object.fromEntries(ranks.map((r,i)=>[r,{task:Object.keys(tasks)[i],text:''}]));
const integer = (n,f) => Number.isInteger(+n) && +n >= 0 && +n <= 100 ? +n : f;
export function createGame(names, options={}, random=Math.random) {
 const players=names.map(n=>String(n).trim().slice(0,40)).filter(Boolean);
 if(players.length<2) throw Error('Tragt mindestens zwei Namen ein.');
 const mapping=Object.fromEntries(ranks.map(r=>{const v=options.mapping?.[r]||defaults[r]; return [r,{task:tasks[v.task]?v.task:defaults[r].task,text:String(v.text||'').trim().slice(0,500)}];}));
 const deck=['♠','♥','♦','♣'].flatMap(suit=>ranks.map(rank=>({rank,suit})));
 for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return {version:1,players,deck,removed:[],turn:0,direction:1,phase:'draw',pending:null,kings:0,breaks:0,totals:players.map(()=>0),mates:[],rules:[],question:null,thumb:null,history:[],options:{mapping,sips:integer(options.sips,2),gapSips:integer(options.gapSips,3),cupSips:integer(options.cupSips,5),end:options.end==='deck'?'deck':'king',gap:options.gap!==false}};
}
// Cards cover three angular slot spacings. A new uncovered arc opens only
// when removal joins two neighbours whose circular distance exceeds three.
export function gaps(removed) {
 const live=Array.from({length:52},(_,i)=>i).filter(i=>!removed.includes(i));
 if(!live.length) return [];
 return live.map((a,i)=>({from:a,to:live[(i+1)%live.length],distance:(live[(i+1)%live.length]-a+52)%52 || 52})).filter(g=>g.distance>3);
}
function award(s,ids,amount){
 const affected=new Set(ids);
 let changed=true; while(changed){changed=false; for(const [a,b] of s.mates) if(affected.has(a)!==affected.has(b)){affected.add(a);affected.add(b);changed=true;}}
 for(const id of affected)s.totals[id]+=amount;
 return [...affected].map(id=>`${s.players[id]} +${amount}`).join(', ');
}
export function draw(s,index){
 if(s.phase!=='draw'||!Number.isInteger(index)||index<0||index>51||s.removed.includes(index))throw Error('Diese Karte kann gerade nicht gezogen werden.');
 const n=structuredClone(s),before=gaps(n.removed); n.removed.push(index);
 const opened=gaps(n.removed).some(g=>!before.some(b=>b.from===g.from&&b.to===g.to));
 const card=n.deck[index], rule=n.options.mapping[card.rank];
 n.pending={index,card,rule,broken:opened,notes:[]};n.phase='resolve';
 if(opened){n.breaks++;if(n.options.gap)n.pending.notes.push('Ring gebrochen: '+award(n,[n.turn],n.options.gapSips));}
 return n;
}
export function resolve(s,{targets=[],text=''}={}) {
 if(s.phase!=='resolve')throw Error('Zieht zuerst eine Karte.');
 const n=structuredClone(s),p=n.pending,t=p.rule.task;
 targets=[...new Set(targets)].filter(i=>Number.isInteger(i)&&i>=0&&i<n.players.length);
 if(['give','floor','heaven','rhyme','category','mate'].includes(t)&&targets.length!==1)throw Error('Wählt genau eine Person.');
 if(t==='mate'&&targets[0]===n.turn)throw Error('Wähle eine andere Person.');
 if(t==='rule'&&!text.trim())throw Error('Gebt eure neue Regel ein.');
 if(t==='mate'){const pair=[n.turn,targets[0]].sort((a,b)=>a-b);if(!n.mates.some(m=>m[0]===pair[0]&&m[1]===pair[1]))n.mates.push(pair);}
 if(t==='rule')n.rules.push(text.trim().slice(0,300));
 if(t==='question')n.question=n.turn;
 if(t==='thumb')n.thumb=n.turn;
 if(t==='reverse')n.direction*=-1;
 if(t==='self')targets=[n.turn];
 if(t==='all')targets=n.players.map((_,i)=>i);
 if(['give','self','floor','men','women','heaven','rhyme','category','all'].includes(t))p.notes.push(award(n,targets,n.options.sips));
 if(t==='king'){n.kings++; if(n.kings%4===0)p.notes.push('Königsbecher: '+award(n,[n.turn],n.options.cupSips));}
 n.history.unshift({player:n.players[n.turn],card:p.card,title:tasks[t][0],notes:p.notes});
 n.phase=n.removed.length===52||(t==='king'&&n.kings===4&&n.options.end==='king')?'finished':'draw';
 n.turn=(n.turn+n.direction+n.players.length)%n.players.length;n.pending=null;
 return n;
}
export function penalty(s,id){if(s.phase==='finished'||!Number.isInteger(id)||!s.players[id])throw Error('Ungültige Person.');const n=structuredClone(s); const note=award(n,[id],n.options.sips);n.history.unshift({player:n.players[id],title:'Verstoß',notes:[note]});return n;}
