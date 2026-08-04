// ══════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════
const SAVE='ccna_v3';
const RANKS=[
  [1,'Apprentice','🌐'],[3,'Packet Analyst','📡'],[5,'Subnet Specialist','🔢'],
  [8,'VLAN Engineer','🔀'],[11,'Routing Architect','🗺️'],[14,'Security Expert','🛡️'],
  [17,'CCNA Candidate','📋'],[20,'CCNA Champion','🏆'],
];
function loadG(){try{const s=JSON.parse(localStorage.getItem(SAVE));if(s&&s.modules)return s;}catch(e){}
  return{xp:0,xpNext:100,level:1,score:0,streak:0,certs:0,done:0,
    modules:{},days:{},bestStreak:0,dailyGoal:60};
}
let G=loadG();
// migrazione stato calendario per salvataggi vecchi
if(!G.days)G.days={};
if(!G.review)G.review=[];
if(G.bestStreak==null)G.bestStreak=0;
if(G.dailyGoal==null)G.dailyGoal=60;
if(!G.labs)G.labs={};
function todayStr(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function recordActivity(n){
  const t=todayStr();G.days[t]=(G.days[t]||0)+n;
  const s=currentStreak();if(s>G.bestStreak)G.bestStreak=s;
}
function currentStreak(){
  const d=new Date();if(!(G.days[todayStr(d)]>0))d.setDate(d.getDate()-1);
  let s=0;while(G.days[todayStr(d)]>0){s++;d.setDate(d.getDate()-1);}return s;
}
function activeDays(){return Object.values(G.days).filter(v=>v>0).length;}
function xpThisWeek(){const d=new Date();let sum=0;for(let i=0;i<7;i++){sum+=G.days[todayStr(d)]||0;d.setDate(d.getDate()-1);}return sum;}
function saveG(){try{localStorage.setItem(SAVE,JSON.stringify(G));}catch(e){}}
function getRank(){return RANKS.slice().reverse().find(r=>G.level>=r[0])||RANKS[0];}
function addXP(n){
  G.xp+=n;G.score+=n;G.streak++;
  recordActivity(n);
  while(G.xp>=G.xpNext){G.xp-=G.xpNext;G.level++;G.xpNext=Math.round(G.xpNext*1.35);}
  saveG();updateUI();
  showToast('+'+n+' XP 🎯');
}
function updateUI(){
  const r=getRank();const pct=(G.xp/G.xpNext*100).toFixed(1);
  _id('nav-lv').textContent='LV'+G.level;
  _id('nav-fill').style.width=pct+'%';
  _id('nav-score').textContent=G.score+' XP';
  _id('lv-avatar').textContent=r[2];
  _id('lv-rank').textContent=r[1];
  _id('lv-sub').textContent='Livello '+G.level;
  _id('lv-xp-cur').textContent=G.xp+' XP';
  _id('lv-xp-max').textContent=G.xpNext+' XP';
  _id('lv-xp-fill').style.width=pct+'%';
  _id('lv-done').textContent=G.done;
  _id('lv-score').textContent=G.score;
  _id('lv-streak').textContent=currentStreak()+'🔥';
  _id('lv-cert').textContent=G.certs;
  updateHeroProgress();
  renderHomeStreak();
  renderReviewCard();
}
function _id(id){return document.getElementById(id);}
let toastT;
function showToast(msg,col){
  const t=_id('xp-toast');t.textContent=msg;
  t.style.borderLeftColor=col||'var(--green)';
  t.onclick=()=>{t.classList.remove('show');clearTimeout(toastT);};
  t.classList.add('show');clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2500);
}
// evita che una casella appena renderizzata resti "evidenziata" dall'hover col cursore fermo
function suppressHover(grid){
  if(!grid)return;grid.classList.add('nohover');
  const clr=()=>{grid.classList.remove('nohover');document.removeEventListener('mousemove',clr);document.removeEventListener('touchstart',clr);};
  document.addEventListener('mousemove',clr,{once:true});
  document.addEventListener('touchstart',clr,{once:true});
}

// ── VIEWS ──
function showView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  _id('view-'+v).classList.add('active');
  _id('nb-'+v).classList.add('active');
  if(v==='home'){renderTree();updateHeroProgress();}
  if(v==='quiz') initQuizMenu();
  if(v==='lab')  {initOsi();initSubnet();initCli();initPacket();initVlan();initLabTopics();initTshoot();}
  if(v==='cal') renderCalendar();
  if(v==='schemas') renderSchema('osi');
  if(v==='gloss') renderGlossary((_id('gloss-search')||{}).value||'');
  if(v==='video') renderVideos();
}

// ══════════════════════════════════════
// TIER TREE
// ══════════════════════════════════════
const TIERS=[
  {id:0,label:'Tier 0 — Zero assoluto'},
  {id:1,label:'Tier 1 — Modelli di rete'},
  {id:2,label:'Tier 2 — IP & Subnetting'},
  {id:3,label:'Tier 3 — Switching'},
  {id:4,label:'Tier 4 — Routing'},
  {id:5,label:'Tier 5 — Sicurezza'},
  {id:6,label:'Tier 6 — Avanzato'},
  {id:7,label:'Tier 7 — Certificazione'},
];
const MODS=[
  {id:'net_basics',tier:0,icon:'🌐',title:'Fondamenta di rete',sub:'LAN, WAN, topologie',xp:50,req:[],type:'normal',game:'osi'},
  {id:'binary',tier:0,icon:'🔢',title:'Binario & Hex',sub:'Conversioni, bit, byte',xp:60,req:[],type:'normal',game:'subnet'},
  {id:'osi_mod',tier:1,icon:'📶',title:'Modello OSI',sub:'7 layer, PDU, protocolli',xp:80,req:['net_basics'],type:'normal',game:'osi'},
  {id:'tcpip_mod',tier:1,icon:'🤝',title:'Stack TCP/IP',sub:'TCP, UDP, 3-way handshake',xp:80,req:['net_basics'],type:'normal',game:'ailab'},
  {id:'ip_addr',tier:2,icon:'🏠',title:'Indirizzi IP',sub:'Classi, privati, RFC 1918',xp:90,req:['binary','osi_mod'],type:'normal',game:'subnet'},
  {id:'subnetting',tier:2,icon:'📐',title:'Subnetting CIDR',sub:'Calcoli, VLSM, block size',xp:120,req:['ip_addr'],type:'normal',game:'subnet'},
  {id:'boss1',tier:2,icon:'💀',title:'BOSS: Subnet Gauntlet',sub:'10 sfide in 5 minuti',xp:200,req:['subnetting'],type:'boss',game:'subnet'},
  {id:'switching',tier:3,icon:'🔀',title:'Switching & Ethernet',sub:'MAC, CAM table, STP',xp:100,req:['osi_mod'],type:'normal',game:'osi'},
  {id:'vlan_mod',tier:3,icon:'🏢',title:'VLANs & 802.1Q',sub:'Access, trunk, inter-VLAN',xp:110,req:['switching','boss1'],type:'normal',game:'vlan'},
  {id:'wifi_mod',tier:3,icon:'📡',title:'Wireless & Wi-Fi',sub:'AP, WLC, SSID, WPA2/3',xp:100,req:['switching'],type:'normal',game:'ailab'},
  {id:'redun_mod',tier:3,icon:'♻️',title:'Ridondanza L2/L3',sub:'STP, EtherChannel, HSRP',xp:120,req:['vlan_mod'],type:'normal',game:'ailab'},
  {id:'routing_s',tier:4,icon:'🗺️',title:'Routing statico',sub:'Route table, default gw',xp:100,req:['ip_addr'],type:'normal',game:'cli'},
  {id:'ospf_mod',tier:4,icon:'🌐',title:'OSPF',sub:'Link-state, SPF, aree',xp:130,req:['routing_s','vlan_mod'],type:'normal',game:'ailab'},
  {id:'eigrp_mod',tier:4,icon:'⚡',title:'EIGRP',sub:'Hybrid, DUAL, Cisco',xp:120,req:['routing_s'],type:'normal',game:'cli'},
  {id:'boss2',tier:4,icon:'💀',title:'BOSS: Routing Lab',sub:'4 router da configurare',xp:250,req:['ospf_mod','eigrp_mod'],type:'boss',game:'cli'},
  {id:'acl_mod',tier:5,icon:'🛡️',title:'ACL',sub:'Standard, extended, named',xp:110,req:['routing_s'],type:'normal',game:'ailab'},
  {id:'nat_mod',tier:5,icon:'🔄',title:'NAT & PAT',sub:'Static, dynamic, overload',xp:110,req:['ip_addr','routing_s'],type:'normal',game:'ailab'},
  {id:'ssh_sec',tier:5,icon:'🔒',title:'Sicurezza dispositivi',sub:'SSH, AAA, port security',xp:100,req:['vlan_mod'],type:'normal',game:'cli'},
  {id:'boss3',tier:5,icon:'💀',title:'BOSS: Security Audit',sub:'8 vulnerabilità da trovare',xp:300,req:['acl_mod','nat_mod','ssh_sec'],type:'boss',game:'cli'},
  {id:'ipv6_mod',tier:6,icon:'6️⃣',title:'IPv6',sub:'128-bit, SLAAC, NDP',xp:130,req:['subnetting'],type:'normal',game:'ailab'},
  {id:'wan_mod',tier:6,icon:'🌍',title:'WAN & VPN',sub:'MPLS, GRE, IPSec',xp:120,req:['ospf_mod'],type:'normal',game:'ailab'},
  {id:'auto_mod',tier:6,icon:'🤖',title:'Network Automation',sub:'SDN, REST, Python',xp:140,req:['boss2'],type:'normal',game:'ailab'},
  {id:'ipserv_mod',tier:6,icon:'🛎️',title:'Servizi IP',sub:'DHCP, DNS, NTP, SNMP, QoS',xp:120,req:['routing_s','nat_mod'],type:'normal',game:'ailab'},
  {id:'ccna_cert',tier:7,icon:'🏆',title:'CCNA 200-301 Sim',sub:'120 domande — 120 min',xp:500,req:['boss1','boss2','boss3','ipv6_mod','wan_mod'],type:'cert',game:'quiz'},
];
// ensure modules
MODS.forEach(m=>{if(!G.modules[m.id])G.modules[m.id]={progress:0,completed:false};});

function isUnlocked(m){return m.req.every(r=>G.modules[r]&&G.modules[r].completed);}
function getStatus(m){
  if(G.modules[m.id].completed) return 'done';
  return isUnlocked(m)?'active':'locked';
}
function renderTree(){
  const c=_id('tree-container');c.innerHTML='';
  let cardIdx=0;
  TIERS.forEach((tier,ti)=>{
    const mods=MODS.filter(m=>m.tier===tier.id);
    if(!mods.length) return;
    const block=document.createElement('div');block.className='tier-block';
    block.innerHTML='<div class="tier-lbl">'+tier.label+'</div>';
    const row=document.createElement('div');row.className='tier-row';
    mods.forEach(mod=>{
      const st=getStatus(mod);const prog=G.modules[mod.id].progress||0;
      const isBoss=mod.type==='boss';const isCert=mod.type==='cert';
      let cls='mod-card';
      if(st==='locked') cls+=' locked';
      else if(st==='done') cls+=' done';
      else cls+=' unlocked';
      if(isBoss) cls+=' boss-c';
      if(isCert) cls+=' cert-c';
      let badge='';
      if(isCert) badge='<span class="mod-badge" style="background:rgba(245,158,11,.2);color:var(--orange)">CERT</span>';
      else if(isBoss) badge='<span class="mod-badge" style="background:rgba(239,68,68,.15);color:var(--red)">BOSS</span>';
      else if(st==='done') badge='<span class="mod-badge" style="background:rgba(16,185,129,.15);color:var(--green)">✓</span>';
      else if(st==='locked') badge='<span class="mod-badge" style="background:rgba(100,116,139,.15);color:var(--muted)">🔒</span>';
      else badge='<span class="mod-badge" style="background:rgba(59,130,246,.15);color:var(--accent)">▶</span>';
      const d=document.createElement('div');d.className=cls;
      d.style.animationDelay=(0.32+cardIdx*0.035)+'s';cardIdx++;
      d.innerHTML=badge+'<div class="mod-icon">'+mod.icon+'</div><div class="mod-title">'+mod.title+'</div><div class="mod-sub">'+mod.sub+'</div><div class="mod-xp">+'+mod.xp+' XP</div><div class="mod-pbar"><div class="mod-pfill" style="width:'+(st==='done'?100:prog)+'%"></div></div>';
      if(st!=='locked'){
        d.onclick=()=>launchModuleGame(mod);
        d.tabIndex=0;d.setAttribute('role','button');
        d.setAttribute('aria-label',mod.title+' — '+mod.sub+(st==='done'?' (completato)':''));
        d.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launchModuleGame(mod);}};
      }else{
        const need=mod.req.filter(r=>!(G.modules[r]&&G.modules[r].completed)).map(r=>{const rm=MODS.find(x=>x.id===r);return rm?rm.title:r;});
        const txt=need.length?'Serve: '+need.join(', '):'Bloccato';
        d.title='🔒 '+txt;
        d.setAttribute('aria-label',mod.title+' — bloccato. '+txt);
        const hint=document.createElement('div');hint.className='mod-lock-hint';hint.textContent=txt;d.appendChild(hint);
      }
      row.appendChild(d);
    });
    block.appendChild(row);
    if(ti<TIERS.length-1){const conn=document.createElement('div');conn.className='tier-conn';conn.innerHTML='<div class="tier-conn-line"></div>';block.appendChild(conn);}
    c.appendChild(block);
  });
}
function launchModuleGame(mod){
  // ogni livello è un gioco interattivo dedicato + quiz di consolidamento
  startLevel(mod);
  showToast('▶ '+mod.title+' — +'+mod.xp+' XP al completamento','var(--accent)');
}
// Apre il lab interattivo abbinato al modulo
function openModuleLab(key){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  _id('view-lab').classList.add('active');
  _id('nb-lab').classList.add('active');
  initOsi();initSubnet();initCli();initPacket();initVlan();initLabTopics();
  selLabTab(key,null);
}
function completeModule(id){
  if(G.modules[id]&&G.modules[id].completed) return;
  const mod=MODS.find(m=>m.id===id);if(!mod) return;
  G.modules[id].completed=true;G.modules[id].progress=100;
  G.done=MODS.filter(m=>G.modules[m.id]&&G.modules[m.id].completed).length;
  if(mod.type==='cert') G.certs++;
  addXP(mod.xp);
  showToast('🏆 '+mod.title+' completato! +'+mod.xp+' XP','var(--orange)');
  renderTree();
}

// ══════════════════════════════════════
// QUIZ GAME
// ══════════════════════════════════════
const TOPICS=[
  'OSI & TCP/IP Model','IP Addressing & Subnetting','VLANs & Switching',
  'Wireless (Wi-Fi)','Ridondanza (STP/HSRP)',
  'Routing (OSPF, EIGRP, RIP)','NAT & PAT','ACLs','WAN & VPN',
  'Network Security','Servizi IP (DHCP/DNS)','IPv6','Network Automation & SDN',
];
const MODE_CFG={practice:{q:10,t:60,mult:1},speed:{q:15,t:20,mult:1.5},hardcore:{q:10,t:30,mult:2},exam:{q:30,t:90,mult:1.2}};
let quizTopic=TOPICS[0],quizMode='practice',quizState={};

// ══════════════════════════════════════
// BANCO DOMANDE PRE-SCRITTO (per modulo)
//   o = opzioni, c = indice corretto, e = spiegazione
// ══════════════════════════════════════
const QBANK={
net_basics:[
 {q:"Qual è la definizione corretta di LAN?",o:["Rete ad alta velocità confinata a un'area ristretta (ufficio, edificio)","Rete che collega sedi in città o nazioni diverse tramite provider","Rete pubblica interamente gestita e instradata da un ISP","Collegamento seriale punto-punto dedicato tra due router"],c:0,e:"Una LAN (Local Area Network) copre un'area ristretta come casa, ufficio o campus, con alta velocità e bassa latenza."},
 {q:"Che cosa distingue una WAN da una LAN?",o:["Copre grandi distanze geografiche, spesso tramite provider terzi","È sempre più veloce e a bassa latenza rispetto a una LAN","Utilizza esclusivamente cablaggio in fibra monomodale","Non è in grado di trasportare traffico IP instradato"],c:0,e:"Una WAN (Wide Area Network) collega reti distanti geograficamente, tipicamente affidandosi a service provider."},
 {q:"In una topologia a stella, come sono collegati i dispositivi?",o:["Ogni nodo si collega a un unico dispositivo centrale (switch)","Ogni nodo è collegato ad anello al dispositivo successivo","Tutti i nodi condividono lo stesso cavo dorsale (bus)","Ogni nodo ha un link diretto verso ogni altro nodo"],c:0,e:"Nella topologia a stella tutti i nodi si connettono a un dispositivo centrale; un guasto a un cavo isola solo quel nodo."},
 {q:"A quale livello OSI opera un hub?",o:["Livello 1 - Fisico","Livello 2 - Data Link","Livello 3 - Network","Livello 4 - Transport"],c:0,e:"L'hub è un ripetitore multiporta: rigenera il segnale elettrico a livello 1 e non legge indirizzi MAC."},
 {q:"Qual è la differenza principale tra hub e switch?",o:["Lo switch inoltra il frame alla sola porta di destinazione via MAC","L'hub filtra i frame in base all'IP di destinazione del pacchetto","Lo switch ripete ogni frame su tutte le porte come un hub","L'hub crea e propaga automaticamente le VLAN 802.1Q"],c:0,e:"Lo switch mantiene una tabella MAC e inoltra in modo selettivo; l'hub trasmette a tutte le porte (un unico dominio di collisione)."},
 {q:"Cosa significa comunicazione full-duplex?",o:["Invio e ricezione simultanei sullo stesso link, senza collisioni","Un solo dispositivo alla volta può trasmettere sul mezzo","La comunicazione è possibile in una sola direzione fissa","Richiede un hub centrale che arbitra gli accessi al mezzo"],c:0,e:"Il full-duplex permette trasmissione e ricezione contemporanee, eliminando le collisioni (tipico dei link switch-a-dispositivo)."},
 {q:"Quale unità misura tipicamente la larghezza di banda di un collegamento?",o:["Bit per secondo (bps)","Byte totali trasferiti","Hertz della portante","Pacchetti per sessione"],c:0,e:"La banda si misura in bit per secondo (Mbps, Gbps): è la capacità teorica massima del collegamento."},
 {q:"Quale cavo si usa tradizionalmente tra due dispositivi simili (es. switch-switch) senza auto-MDIX?",o:["Cavo crossover","Cavo straight-through","Cavo seriale","Cavo coassiale"],c:0,e:"Il crossover incrocia le coppie TX/RX ed è usato tra dispositivi dello stesso tipo; lo straight-through tra dispositivi diversi."},
 {q:"In un modello client-server, cosa caratterizza il server?",o:["Fornisce risorse o servizi ai client che ne fanno richiesta","Richiede in modo continuo risorse agli altri nodi della rete","Opera senza avere alcun indirizzo IP assegnato","È necessariamente un dispositivo di tipo wireless"],c:0,e:"Il server ospita e fornisce servizi (web, file, DNS...) mentre i client li richiedono."},
 {q:"Qual è un vantaggio della fibra ottica rispetto al rame?",o:["Immunità alle interferenze elettromagnetiche e distanze maggiori","Ha sempre un costo di acquisto inferiore al rame UTP","È più semplice e rapida da terminare rispetto al rame","Trasporta anche alimentazione elettrica ai dispositivi"],c:0,e:"La fibra usa impulsi di luce: non è soggetta a EMI e supporta distanze e banda molto superiori al rame."},
 {q:"Cosa rappresenta il 'throughput' reale di una rete?",o:["I dati effettivamente trasferiti nell'unità di tempo","La velocità massima teorica dichiarata del mezzo","Il numero di dispositivi collegati al segmento","La lunghezza massima supportata dal cavo"],c:0,e:"Il throughput è la velocità realmente raggiunta, spesso inferiore alla banda nominale per overhead e congestione."},
 {q:"Quale topologia offre la massima ridondanza collegando ogni nodo a tutti gli altri?",o:["Mesh (magliata) completa","Bus a dorsale condivisa","Stella con nodo centrale","Anello singolo unidirezionale"],c:0,e:"Nella mesh completa ogni dispositivo ha un link diretto con ogni altro: massima ridondanza ma costo elevato."}
],
binary:[
 {q:"Quanti bit ci sono in un byte?",o:["8","4","16","32"],c:0,e:"Un byte è composto da 8 bit; un ottetto IPv4 è appunto 8 bit (0-255)."},
 {q:"Qual è il valore decimale del binario 11000000?",o:["192","128","224","240"],c:0,e:"11000000 = 128+64 = 192, primo ottetto tipico di una mask /26."},
 {q:"Il decimale 255 in binario è:",o:["11111111","10000000","11110000","01111111"],c:0,e:"255 = tutti gli 8 bit a 1 (128+64+32+16+8+4+2+1)."},
 {q:"Quanti valori diversi può rappresentare un ottetto (8 bit)?",o:["256","255","128","512"],c:0,e:"Con 8 bit si hanno 2^8 = 256 combinazioni, cioè valori da 0 a 255."},
 {q:"L'esadecimale corrispondente al decimale 15 è:",o:["F","10","E","1111"],c:0,e:"In esadecimale 15 = F. L'hex usa cifre 0-9 e A-F (10-15)."},
 {q:"Quanti bit rappresenta una singola cifra esadecimale?",o:["4 bit (un nibble)","8 bit","2 bit","16 bit"],c:0,e:"Ogni cifra hex mappa 4 bit; due cifre hex = 1 byte. Comodo con MAC e IPv6."},
 {q:"Qual è il valore decimale di 10101010?",o:["170","150","160","85"],c:0,e:"128+32+8+2 = 170."},
 {q:"Quanti indirizzi teorici offre uno spazio a 32 bit (IPv4)?",o:["Circa 4,3 miliardi","65.536","16 milioni","2^16"],c:0,e:"IPv4 usa 32 bit: 2^32 circa 4,29 miliardi di indirizzi totali."},
 {q:"Convertendo il binario 00001111 in esadecimale ottieni:",o:["0F","F0","1F","FF"],c:0,e:"0000=0, 1111=F, quindi 0F. Si raggruppano i bit a nibble di 4."},
 {q:"Il bit più significativo (MSB) di un ottetto ha quale peso?",o:["128","1","64","256"],c:0,e:"Nell'ottetto i pesi sono 128-64-32-16-8-4-2-1; l'MSB (più a sinistra) vale 128."},
 {q:"Quale operazione logica usa la subnet mask per estrarre la rete da un IP?",o:["AND bit a bit","OR bit a bit","XOR","NOT"],c:0,e:"L'AND logico tra IP e maschera azzera i bit host lasciando l'indirizzo di rete."},
 {q:"Il decimale 200 in binario è:",o:["11001000","11000100","10011000","11100000"],c:0,e:"200 = 128+64+8 = 11001000."}
],
osi_mod:[
 {q:"Quanti livelli ha il modello OSI?",o:["7","5","4","6"],c:0,e:"Il modello OSI ha 7 livelli: Physical, Data Link, Network, Transport, Session, Presentation, Application."},
 {q:"A quale livello OSI opera un router?",o:["Livello 3 - Network","Livello 2 - Data Link","Livello 4 - Transport","Livello 1 - Physical"],c:0,e:"Il router instrada in base all'indirizzo IP, che è di livello 3 (Network)."},
 {q:"Qual è la PDU (unità dati) del livello Transport?",o:["Segmento","Pacchetto","Frame","Bit"],c:0,e:"Transport=segmento, Network=pacchetto, Data Link=frame, Physical=bit."},
 {q:"Quale protocollo opera al livello Network?",o:["IP","TCP","HTTP","Ethernet"],c:0,e:"IP (e ICMP, OSPF) opera a livello 3. TCP è livello 4, HTTP livello 7, Ethernet livello 2."},
 {q:"A quale livello OSI appartengono gli indirizzi MAC?",o:["Livello 2 - Data Link","Livello 3 - Network","Livello 1 - Physical","Livello 4 - Transport"],c:0,e:"Gli indirizzi MAC identificano l'hardware a livello 2 (Data Link), sottolivello MAC."},
 {q:"Quale livello OSI gestisce cifratura e compressione dei dati?",o:["Presentation (6)","Session (5)","Application (7)","Transport (4)"],c:0,e:"Il livello Presentation gestisce formato, cifratura e compressione dei dati."},
 {q:"Lo switch di livello 2 prende decisioni di inoltro basandosi su:",o:["Indirizzo MAC di destinazione","Indirizzo IP di destinazione","Numero di porta TCP","Nome DNS"],c:0,e:"Lo switch consulta la tabella MAC (CAM) per inoltrare il frame alla porta corretta."},
 {q:"Quale mnemonico ricorda i livelli OSI dal 7 all'1?",o:["All People Seem To Need Data Processing","Please Do Not Throw Sausage Pizza Away","Every Good Boy Does Fine","Richard Of York Gave Battle"],c:0,e:"'All People Seem To Need Data Processing' va da Application (7) a Physical (1)."},
 {q:"L'aggiunta di header a ogni livello mentre i dati scendono lo stack si chiama:",o:["Incapsulamento","Decapsulamento","Frammentazione","Segmentazione"],c:0,e:"Scendendo lo stack ogni livello aggiunge il proprio header (incapsulamento); in ricezione avviene il decapsulamento."},
 {q:"A quale livello OSI opera il protocollo TCP?",o:["Livello 4 - Transport","Livello 3 - Network","Livello 5 - Session","Livello 7 - Application"],c:0,e:"TCP e UDP sono protocolli di livello 4 (Transport), che gestiscono affidabilità e porte."},
 {q:"Quale livello OSI definisce cavi, connettori, voltaggi e segnali?",o:["Physical (1)","Data Link (2)","Network (3)","Session (5)"],c:0,e:"Il livello 1 Physical riguarda la trasmissione dei bit grezzi sul mezzo fisico."},
 {q:"Nel modello OSI, il livello Session (5) si occupa di:",o:["Stabilire, gestire e terminare le sessioni tra host","Instradare i pacchetti tra reti IP diverse","Assegnare gli indirizzi MAC alle schede","Convertire i bit in segnali sul mezzo fisico"],c:0,e:"Il livello Session apre, coordina e chiude i dialoghi/sessioni tra host."}
],
tcpip_mod:[
 {q:"Quante fasi ha il three-way handshake di TCP?",o:["3: SYN, SYN-ACK, ACK","2: SYN, ACK","4: SYN, ACK, FIN, RST","1: solo SYN"],c:0,e:"TCP apre la connessione con SYN, SYN-ACK, ACK, stabilendo i numeri di sequenza."},
 {q:"Quale protocollo di trasporto è connectionless e senza garanzia di consegna?",o:["UDP","TCP","IP","ICMP"],c:0,e:"UDP è connectionless, veloce e senza ritrasmissione: adatto a VoIP, streaming e DNS."},
 {q:"Quale porta usa HTTPS?",o:["443","80","22","53"],c:0,e:"HTTPS usa la porta TCP 443; HTTP la 80, SSH la 22, DNS la 53."},
 {q:"Il numero di porta di destinazione appartiene a quale livello?",o:["Transport (4)","Network (3)","Application (7)","Data Link (2)"],c:0,e:"Le porte TCP/UDP sono un concetto del livello Transport e identificano l'applicazione/servizio."},
 {q:"Quale meccanismo TCP evita che il mittente saturi il ricevente?",o:["Il controllo di flusso a finestra (windowing)","Il controllo delle tempeste di broadcast","Lo split horizon del distance vector","L'accesso al mezzo tramite CSMA/CD"],c:0,e:"TCP usa il windowing per adattare la quantità di dati inviati alla capacità del ricevente."},
 {q:"Quante porte TCP/UDP totali esistono?",o:["65.536 (0-65535)","1024","256","1.000.000"],c:0,e:"Il campo porta è a 16 bit: 2^16 = 65.536 porte (0-65535)."},
 {q:"Le 'well-known ports' rientrano in quale intervallo?",o:["0-1023","1024-49151","49152-65535","0-255"],c:0,e:"Le porte note vanno da 0 a 1023 e sono riservate ai servizi standard."},
 {q:"Quale protocollo di trasporto useresti per un trasferimento file affidabile?",o:["TCP","UDP","ICMP","ARP"],c:0,e:"TCP garantisce consegna ordinata e affidabile con ACK e ritrasmissioni: ideale per file/web/email."},
 {q:"Il modello TCP/IP a 4 livelli è composto da:",o:["Application, Transport, Internet, Network Access","Application, Session, Network, Physical","Physical, Data Link, Network, Transport","Presentation, Transport, Internet, Physical"],c:0,e:"Il modello TCP/IP raggruppa in 4 livelli: Application, Transport, Internet, Network Access."},
 {q:"Quale porta usa il protocollo DNS?",o:["53","25","67","110"],c:0,e:"Il DNS usa la porta 53 (UDP per le query, TCP per zone transfer e risposte grandi)."},
 {q:"Nel handshake TCP, il numero di sequenza serve a:",o:["Ordinare i byte e rilevare i segmenti mancanti","Cifrare il contenuto dei segmenti trasmessi","Assegnare gli indirizzi IP agli endpoint","Identificare la VLAN di appartenenza"],c:0,e:"I sequence number permettono di riordinare i segmenti e individuare/ritrasmettere i dati persi."},
 {q:"Quale protocollo applicativo usa UDP porte 67/68?",o:["DHCP","FTP","SSH","SMTP"],c:0,e:"DHCP usa UDP: porta 67 (server) e 68 (client) per assegnare gli indirizzi IP dinamicamente."}
],
ip_addr:[
 {q:"Quale intervallo appartiene agli indirizzi privati (RFC 1918)?",o:["10.0.0.0 - 10.255.255.255","11.0.0.0 - 11.255.255.255","172.15.0.0/16","192.169.0.0/16"],c:0,e:"RFC 1918: 10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16 sono gli indirizzi privati."},
 {q:"A quale classe appartiene l'indirizzo 192.168.1.10?",o:["Classe C","Classe A","Classe B","Classe D"],c:0,e:"Il primo ottetto 192 (range 192-223) è di classe C, con maschera di default /24."},
 {q:"Qual è la maschera di default di un indirizzo di classe A?",o:["255.0.0.0 (/8)","255.255.0.0 (/16)","255.255.255.0 (/24)","255.255.255.255"],c:0,e:"Classe A: /8. Classe B /16, Classe C /24."},
 {q:"L'indirizzo 127.0.0.1 è:",o:["L'indirizzo di loopback locale","Un indirizzo pubblico instradabile","L'indirizzo di broadcast di rete","Un indirizzo APIPA auto-assegnato"],c:0,e:"127.0.0.0/8 è riservato al loopback; 127.0.0.1 testa lo stack TCP/IP locale."},
 {q:"Gli indirizzi APIPA rientrano in quale range?",o:["169.254.0.0/16","10.0.0.0/8","192.0.2.0/24","224.0.0.0/4"],c:0,e:"APIPA usa 169.254.0.0/16 quando un client non riceve risposta dal DHCP."},
 {q:"Quale intervallo è riservato agli indirizzi multicast?",o:["224.0.0.0 - 239.255.255.255","240.0.0.0 - 255.255.255.255","192.168.0.0 - 192.168.255.255","172.16.0.0 - 172.31.255.255"],c:0,e:"La classe D (224.0.0.0/4) è usata per il multicast; la classe E (240/4) è sperimentale."},
 {q:"Cosa identifica la porzione host di un indirizzo IP?",o:["Il singolo dispositivo dentro quella rete","La rete IP di appartenenza dell'host","Il gateway predefinito del segmento","L'indirizzo del server DNS locale"],c:0,e:"L'IP si divide in porzione di rete (comune) e porzione host (univoca per ogni dispositivo)."},
 {q:"L'intervallo privato di classe B (RFC 1918) è:",o:["172.16.0.0 - 172.31.255.255","172.16.0.0 - 172.16.255.255","172.0.0.0 - 172.255.255.255","172.32.0.0/12"],c:0,e:"Il blocco privato di classe B è 172.16.0.0/12, cioè da 172.16.0.0 a 172.31.255.255."},
 {q:"Un indirizzo con tutti i bit host a 1 rappresenta:",o:["L'indirizzo di broadcast della subnet","L'indirizzo di rete della subnet","Il primo host utilizzabile del range","Il gateway predefinito della LAN"],c:0,e:"Host tutti a 1 = broadcast; host tutti a 0 = indirizzo di rete. Nessuno dei due è assegnabile a un host."},
 {q:"Perché sono necessari gli indirizzi privati e il NAT?",o:["Per far fronte all'esaurimento degli IPv4 pubblici","Perché instradano più velocemente su Internet","Perché sono più sicuri degli indirizzi IPv6","Per abilitare il traffico multicast globale"],c:0,e:"Gli indirizzi privati più il NAT permettono di condividere pochi IP pubblici, mitigando l'esaurimento IPv4."},
 {q:"Quanti bit compongono un indirizzo IPv4?",o:["32","64","128","16"],c:0,e:"IPv4 è a 32 bit, suddiviso in 4 ottetti da 8 bit."},
 {q:"Quale di questi è un indirizzo IP pubblico valido?",o:["8.8.8.8","10.1.1.1","192.168.0.5","169.254.1.1"],c:0,e:"8.8.8.8 (DNS Google) è pubblico; gli altri sono privati o APIPA."}
],
subnetting:[
 {q:"Quanti host utilizzabili offre una subnet /26?",o:["62","64","30","126"],c:0,e:"/26 lascia 6 bit host: 2^6 - 2 = 62 host utilizzabili."},
 {q:"Qual è la subnet mask corrispondente a /27?",o:["255.255.255.224","255.255.255.192","255.255.255.240","255.255.255.128"],c:0,e:"/27 = 3 bit di rete nell'ultimo ottetto: 224 (128+64+32)."},
 {q:"Il 'block size' di una /28 nell'ultimo ottetto è:",o:["16","8","32","14"],c:0,e:"/28 mask 240, block size = 256-240 = 16. Le subnet iniziano ogni 16."},
 {q:"A quale subnet appartiene l'host 192.168.1.70 con maschera /26?",o:["192.168.1.64","192.168.1.0","192.168.1.128","192.168.1.32"],c:0,e:"/26 ha block size 64: reti .0, .64, .128, .192. 70 cade nella .64 (64-127)."},
 {q:"Qual è l'indirizzo di broadcast della rete 192.168.1.0/26?",o:["192.168.1.63","192.168.1.64","192.168.1.127","192.168.1.255"],c:0,e:"La prima subnet /26 va da .0 a .63; il broadcast è l'ultimo indirizzo, cioè .63."},
 {q:"Cosa significa VLSM?",o:["Variable Length Subnet Mask (maschere variabili)","Very Large Subnet Mask (maschera estesa)","Virtual LAN Subnet Mapping (metodo VLAN)","Variable Link-State Metric (metrica dinamica)"],c:0,e:"Il VLSM consente maschere di diversa lunghezza sulla stessa rete, ottimizzando lo spazio indirizzi."},
 {q:"Quanti host utilizzabili offre una /30, tipica dei link punto-punto?",o:["2","4","6","1"],c:0,e:"/30 = 2 bit host: 2^2 - 2 = 2 host, ideale per collegamenti tra due router."},
 {q:"Con h bit host, quanti host utilizzabili ci sono?",o:["2^h - 2","2^h","2^h + 2","h^2"],c:0,e:"Si sottraggono 2 per rete e broadcast: 2^h - 2 host assegnabili."},
 {q:"Suddividendo una /24 in subnet /26, quante subnet ottieni?",o:["4","2","8","16"],c:0,e:"Da /24 a /26 si prendono 2 bit in più: 2^2 = 4 subnet."},
 {q:"Qual è il primo host utilizzabile nella rete 10.0.0.0/24?",o:["10.0.0.1","10.0.0.0","10.0.0.255","10.0.0.254"],c:0,e:"L'indirizzo di rete .0 non è assegnabile; il primo host è .1, l'ultimo .254, broadcast .255."},
 {q:"La maschera 255.255.255.252 corrisponde a quale prefisso CIDR?",o:["/30","/29","/28","/31"],c:0,e:"252 = 11111100, cioè 6 bit nell'ultimo ottetto, quindi /30."},
 {q:"Quanti host utilizzabili offre una /23?",o:["510","512","254","1022"],c:0,e:"/23 = 9 bit host: 2^9 - 2 = 510 host (una /23 unisce due /24)."}
],
switching:[
 {q:"Come costruisce lo switch la sua tabella MAC?",o:["Impara la MAC sorgente dei frame in ingresso","Interroga periodicamente il server DHCP","Usa gli annunci del protocollo OSPF","Legge l'IP di destinazione del pacchetto"],c:0,e:"Lo switch esamina la MAC sorgente dei frame ricevuti e associa MAC-porta nella tabella CAM."},
 {q:"Cosa fa uno switch con un frame per una MAC destinazione sconosciuta?",o:["Lo inonda su tutte le porte tranne quella d'ingresso","Scarta immediatamente il frame ricevuto","Lo inoltra soltanto verso il gateway","Genera un messaggio di errore ARP"],c:0,e:"Con MAC destinazione sconosciuta lo switch fa flooding (unknown unicast) su tutte le porte eccetto la sorgente."},
 {q:"Qual è lo scopo principale dello Spanning Tree Protocol (STP)?",o:["Prevenire i loop di livello 2 in reti ridondanti","Assegnare gli indirizzi IP ai dispositivi","Cifrare il traffico che attraversa le VLAN","Instradare i pacchetti tra subnet diverse"],c:0,e:"STP (802.1D) blocca logicamente i link ridondanti per evitare loop e broadcast storm a livello 2."},
 {q:"Quanti bit ha un indirizzo MAC?",o:["48 bit","32 bit","64 bit","128 bit"],c:0,e:"La MAC è a 48 bit (12 cifre hex): i primi 24 sono l'OUI del produttore, gli altri 24 la scheda."},
 {q:"In STP, quale switch diventa la root bridge?",o:["Quello con il bridge ID più basso","Quello con il maggior numero di porte","Quello con l'indirizzo IP più alto","Quello configurato per ultimo in rete"],c:0,e:"La root bridge è lo switch con il bridge ID (priorità + MAC) più basso."},
 {q:"Cosa rappresenta un dominio di collisione?",o:["Un segmento dove i frame possono collidere tra loro","L'insieme dei dispositivi che ricevono un broadcast","Il perimetro logico di una singola VLAN","L'intervallo di indirizzi di una subnet IP"],c:0,e:"Ogni porta switch è un dominio di collisione separato; l'hub invece li condivide tutti."},
 {q:"Ogni porta switch è un dominio di ___ separato ma condivide lo stesso dominio di ___.",o:["collisione ; broadcast","broadcast ; collisione","VLAN ; subnet","MAC ; IP"],c:0,e:"Lo switch separa i domini di collisione (per porta) ma di default tutte le porte sono nello stesso dominio di broadcast."},
 {q:"Cosa succede a un frame con MAC destinazione broadcast (FFFF.FFFF.FFFF)?",o:["Viene inoltrato a tutte le porte della VLAN","Viene scartato subito dallo switch","Viene inoltrato solo verso il router","Viene messo in coda dal processo STP"],c:0,e:"Il frame broadcast raggiunge tutti i dispositivi del dominio di broadcast/VLAN."},
 {q:"Quale stato di porta STP inoltra il traffico normalmente?",o:["Forwarding","Blocking","Listening","Learning"],c:0,e:"Solo nello stato Forwarding la porta inoltra dati; gli altri sono stati transitori o di prevenzione loop."},
 {q:"La tabella MAC di uno switch è memorizzata nella cosiddetta:",o:["CAM table","ARP cache","Routing table","NAT table"],c:0,e:"La tabella MAC risiede nella CAM (Content Addressable Memory) dello switch."},
 {q:"Cosa introduce Rapid STP (802.1w) rispetto a 802.1D?",o:["Una convergenza più rapida dopo un cambio topologia","La cifratura dei BPDU scambiati tra gli switch","L'assegnazione automatica delle VLAN alle porte","Il routing dei pacchetti tra VLAN diverse"],c:0,e:"RSTP (802.1w) riduce drasticamente i tempi di convergenza rispetto allo STP classico."},
 {q:"Un frame Ethernet contiene, oltre ai dati, principalmente:",o:["MAC sorgente, MAC destinazione e FCS","IP sorgente e IP di destinazione","Numeri di porta TCP di origine","Il prefisso CIDR della rete"],c:0,e:"L'header Ethernet ha MAC destinazione, MAC sorgente, EtherType e in coda l'FCS per il controllo errori."}
],
vlan_mod:[
 {q:"Che cosa crea una VLAN su uno switch?",o:["Un dominio di broadcast logicamente separato","Una nuova subnet fisicamente ricablata","Un ulteriore dominio di collisione","Una tabella di routing dedicata"],c:0,e:"Ogni VLAN è un dominio di broadcast separato: dispositivi in VLAN diverse non comunicano senza routing."},
 {q:"Quale standard IEEE definisce il tagging VLAN sui trunk?",o:["802.1Q","802.11","802.3","802.1X"],c:0,e:"802.1Q inserisce un tag di 4 byte nel frame per identificare la VLAN sui link trunk."},
 {q:"Che tipo di porta trasporta il traffico di più VLAN tra switch?",o:["Porta trunk","Porta access","Porta mirror","Porta console"],c:0,e:"La porta trunk trasporta più VLAN taggate; la porta access appartiene a una sola VLAN."},
 {q:"Come comunicano host di VLAN diverse?",o:["Tramite un dispositivo L3 (router o switch)","Direttamente, se sono sullo stesso switch","Attraverso il protocollo Spanning Tree","Non possono comunicare in alcun modo"],c:0,e:"Serve un dispositivo di livello 3 (router-on-a-stick o switch L3) per instradare tra VLAN."},
 {q:"Cos'è la native VLAN su un trunk 802.1Q?",o:["La VLAN che viaggia non taggata sul trunk","La prima VLAN creata sullo switch","La VLAN di management obbligatoria","Una VLAN che blocca tutto il traffico"],c:0,e:"Il traffico della native VLAN (default 1) attraversa il trunk senza tag; va allineata su entrambi i lati."},
 {q:"Quale comando assegna la porta Fa0/1 alla VLAN 10 in modalità access?",o:["switchport access vlan 10","vlan 10 access Fa0/1","switchport trunk vlan 10","assign vlan 10"],c:0,e:"Sotto l'interfaccia: 'switchport mode access' e 'switchport access vlan 10'."},
 {q:"Quante VLAN supporta il campo VLAN ID a 12 bit?",o:["4094","1024","256","65535"],c:0,e:"Il VLAN ID è a 12 bit (0-4095); 1-4094 sono utilizzabili, 0 e 4095 riservate."},
 {q:"Cos'è il 'router-on-a-stick'?",o:["Un router con una sottointerfaccia per ogni VLAN","Un router privo di tabella di routing","Uno switch che opera solo a livello 2","Un access point con più SSID attivi"],c:0,e:"Il router-on-a-stick usa sottointerfacce (una per VLAN) su un unico link trunk per l'inter-VLAN routing."},
 {q:"Qual è la VLAN di default su uno switch Cisco?",o:["VLAN 1","VLAN 0","VLAN 10","VLAN 100"],c:0,e:"Di default tutte le porte appartengono alla VLAN 1, che funge anche da native e management iniziale."},
 {q:"Un vantaggio di segmentare la rete in VLAN è:",o:["Ridurre i domini di broadcast e isolare i gruppi","Aumentare le collisioni sul singolo segmento","Eliminare la necessità di usare degli switch","Accelerare la convergenza dello spanning tree"],c:0,e:"Le VLAN riducono la dimensione dei domini di broadcast, isolano i gruppi e semplificano la gestione."},
 {q:"Quanti byte aggiunge il tag 802.1Q al frame Ethernet?",o:["4 byte","2 byte","8 byte","12 byte"],c:0,e:"Il tag 802.1Q è di 4 byte (include TPID e TCI con priorità e VLAN ID)."},
 {q:"Il protocollo che propaga automaticamente le VLAN tra switch Cisco è:",o:["VTP","STP","CDP","OSPF"],c:0,e:"VTP sincronizza il database VLAN tra switch dello stesso dominio (attenzione ai rischi di sovrascrittura)."}
],
routing_s:[
 {q:"Qual è il comando per una rotta statica di default su un router Cisco?",o:["ip route 0.0.0.0 0.0.0.0 <next-hop>","ip default-network","router static 0.0.0.0","ip route default <next-hop>"],c:0,e:"'ip route 0.0.0.0 0.0.0.0 <next-hop>' definisce la rotta di ultima istanza."},
 {q:"Qual è la distanza amministrativa di una rotta statica per default?",o:["1","0","110","120"],c:0,e:"La statica ha AD 1 (molto affidabile); connesse=0, OSPF=110, EIGRP=90, RIP=120."},
 {q:"Cosa rappresenta il 'next hop' in una rotta statica?",o:["L'IP del router successivo verso la destinazione","La rete di destinazione finale del pacchetto","L'indirizzo dell'interfaccia di loopback","Il gateway predefinito configurato sul PC"],c:0,e:"Il next hop è l'IP del router adiacente a cui inoltrare i pacchetti per quella destinazione."},
 {q:"Nella tabella di routing, cosa indica una rotta 'connected' (C)?",o:["Una rete direttamente collegata a un'interfaccia","Una rotta appresa dinamicamente via OSPF","Una rotta statica configurata a mano","La rotta di default verso Internet"],c:0,e:"Le reti direttamente connesse (codice C) hanno AD 0 e appaiono appena l'interfaccia è up con IP."},
 {q:"Cos'è una floating static route?",o:["Una statica di backup con AD più alta della primaria","Una rotta statica configurata senza next hop","Una rotta appresa da un protocollo dinamico","Una rotta usata solo dal traffico multicast"],c:0,e:"La floating static ha una AD maggiore così entra in tabella solo se la rotta primaria cade."},
 {q:"Perché una rotta statica ha AD più bassa di OSPF?",o:["Perché è manuale ed è ritenuta più affidabile","Perché instrada i pacchetti più velocemente","Perché consuma molta meno CPU sul router","Non è vero: la statica ha AD più alta"],c:0,e:"L'AD misura l'affidabilità della sorgente: la statica (1) è preferita a OSPF (110)."},
 {q:"Il comando 'show ip route' mostra:",o:["La tabella di routing del router","La configurazione delle VLAN attive","La tabella ARP dell'interfaccia","Lo stato delle porte spanning tree"],c:0,e:"'show ip route' elenca reti connesse, statiche e apprese con AD e metriche."},
 {q:"Una rotta statica che punta a un'interfaccia di uscita è tipica di:",o:["Collegamenti punto-punto","Reti multiaccesso Ethernet","Interfacce loopback","VLAN trunk"],c:0,e:"Su link punto-punto si può usare l'interfaccia di uscita; su Ethernet è meglio indicare il next-hop IP."},
 {q:"Cosa succede senza una rotta verso la destinazione e senza default route?",o:["Il router scarta il pacchetto","Il router inonda il pacchetto ovunque","Il pacchetto viene inviato in broadcast","Il router crea una rotta automatica"],c:0,e:"Senza corrispondenza in tabella né default route, il pacchetto viene scartato."},
 {q:"Il routing statico è più adatto a:",o:["Reti piccole e stabili","Reti molto grandi e in continuo mutamento","Ambienti con frequenti cambi di topologia","Il backbone centrale di Internet"],c:0,e:"La statica non scala e non reagisce ai cambi: ideale per reti piccole/stub o rotte di default."},
 {q:"In 'ip route 10.1.1.0 255.255.255.0 192.168.1.2', qual è la destinazione?",o:["10.1.1.0 con maschera 255.255.255.0","192.168.1.2","255.255.255.0 da sola","Nessuna, è una default"],c:0,e:"'10.1.1.0 255.255.255.0' è la rete di destinazione; 192.168.1.2 è il next hop."},
 {q:"La rotta di default è anche detta:",o:["Gateway of last resort","Rotta connessa","Rotta host","Null route"],c:0,e:"La default route (0.0.0.0/0) è il 'gateway of last resort', usata quando nessun'altra rotta corrisponde."}
],
ospf_mod:[
 {q:"Che tipo di protocollo di routing è OSPF?",o:["Link-state","Distance vector","Path vector","Static"],c:0,e:"OSPF è link-state: ogni router costruisce una mappa della topologia e calcola i percorsi con SPF."},
 {q:"Quale algoritmo usa OSPF per il percorso migliore?",o:["Dijkstra (SPF)","Bellman-Ford","DUAL","Prim"],c:0,e:"OSPF esegue l'algoritmo Shortest Path First (Dijkstra) sul database link-state."},
 {q:"Qual è la distanza amministrativa di OSPF?",o:["110","90","120","1"],c:0,e:"OSPF ha AD 110; EIGRP 90, RIP 120, statica 1."},
 {q:"Su cosa si basa di default la metrica (cost) di OSPF?",o:["Sulla larghezza di banda dell'interfaccia","Sul numero di hop verso la destinazione","Sul ritardo accumulato lungo il percorso","Sul carico corrente dell'interfaccia"],c:0,e:"Il costo OSPF = banda di riferimento / banda dell'interfaccia; link più veloci hanno costo minore."},
 {q:"Cos'è l'area 0 in OSPF?",o:["L'area backbone a cui si collegano le altre","Un'area accessibile solo in sola lettura","L'area che contiene i router di confine","Un'area priva di router al suo interno"],c:0,e:"L'area 0 è il backbone: in OSPF multi-area tutte le aree devono connettersi ad essa."},
 {q:"Come stabiliscono l'adiacenza i router OSPF?",o:["Scambiando pacchetti Hello per trovare i vicini","Con il three-way handshake del protocollo TCP","Inviando richieste ARP in broadcast sul link","Tramite lo scambio di messaggi DHCP"],c:0,e:"OSPF usa pacchetti Hello (multicast 224.0.0.5) per scoprire i vicini e mantenere le adiacenze."},
 {q:"Cosa identifica univocamente un router OSPF?",o:["Il Router ID","L'indirizzo MAC","Il numero di area","Il process ID"],c:0,e:"Il Router ID (un IP a 32 bit, spesso la loopback più alta) identifica il router nel dominio OSPF."},
 {q:"In una rete multiaccesso, OSPF elegge un ___ per ridurre gli scambi di LSA.",o:["Un DR (Designated Router)","Un root bridge","Un gateway","Un master DHCP"],c:0,e:"Su reti broadcast OSPF elegge un DR e un BDR per limitare le adiacenze e il traffico LSA."},
 {q:"OSPF invia gli aggiornamenti di routing:",o:["Solo quando cambia la topologia della rete","Ogni 30 secondi inviando l'intera tabella","In modo continuo e in broadcast sul link","Mai: OSPF è un protocollo statico"],c:0,e:"Essendo link-state, OSPF inonda LSA solo ai cambiamenti; RIP invece manda periodicamente l'intera tabella."},
 {q:"A quale indirizzo multicast OSPF invia gli Hello?",o:["224.0.0.5","224.0.0.9","255.255.255.255","224.0.0.10"],c:0,e:"224.0.0.5 = tutti i router OSPF; 224.0.0.6 = DR/BDR. EIGRP usa 224.0.0.10."},
 {q:"Cosa contiene il Link-State Database (LSDB) di OSPF?",o:["La mappa completa della topologia dell'area","Soltanto le rotte di default dell'area","Le tabelle MAC apprese dagli switch","Gli indirizzi DHCP assegnati ai client"],c:0,e:"L'LSDB raccoglie tutti gli LSA: ogni router nell'area ha una copia identica della topologia."},
 {q:"Un vantaggio di OSPF rispetto a RIP è:",o:["Scala meglio e converge senza limite di hop","È decisamente più semplice da configurare","Consuma molta meno memoria sul router","Non richiede indirizzi IP sulle interfacce"],c:0,e:"OSPF scala molto meglio, converge rapidamente e non ha il limite dei 15 hop di RIP."}
],
eigrp_mod:[
 {q:"Chi ha sviluppato originariamente EIGRP?",o:["Cisco","IETF","IEEE","Microsoft"],c:0,e:"EIGRP è un protocollo sviluppato da Cisco, spesso definito ibrido (advanced distance vector)."},
 {q:"Quale algoritmo usa EIGRP per garantire percorsi privi di loop?",o:["DUAL","Dijkstra","Bellman-Ford puro","Spanning Tree"],c:0,e:"EIGRP usa DUAL (Diffusing Update Algorithm) per calcolare successor e feasible successor senza loop."},
 {q:"Qual è la distanza amministrativa di EIGRP interno?",o:["90","110","120","170"],c:0,e:"EIGRP interno ha AD 90 (esterno 170), più bassa di OSPF (110): quindi preferito a parità di rotta."},
 {q:"Cos'è il 'successor' in EIGRP?",o:["Il percorso migliore, installato in routing table","Un percorso di riserva già precalcolato","Il vicino con l'indirizzo MAC più alto","La rotta di default configurata sul router"],c:0,e:"Il successor è il next hop con la metrica migliore (feasible distance minima); va nella routing table."},
 {q:"Cos'è il 'feasible successor'?",o:["Un percorso di backup precalcolato e loop-free","Il percorso principale verso la destinazione","Un router vicino non più raggiungibile","Il Designated Router del segmento di rete"],c:0,e:"Il feasible successor è una rotta di riserva già validata come loop-free, usata se il successor cade."},
 {q:"Su quali metriche si basa di default EIGRP?",o:["Bandwidth e delay","Solo hop count","Solo bandwidth","Costo come OSPF"],c:0,e:"Di default EIGRP usa bandwidth e delay (K1 e K3); load e reliability sono disattivati di default."},
 {q:"A quale indirizzo multicast EIGRP invia gli aggiornamenti?",o:["224.0.0.10","224.0.0.5","224.0.0.9","255.255.255.255"],c:0,e:"EIGRP usa 224.0.0.10; OSPF 224.0.0.5, RIPv2 224.0.0.9."},
 {q:"EIGRP invia aggiornamenti di routing:",o:["Solo ai cambiamenti (aggiornamenti parziali)","Ogni 30 secondi inviando la tabella intera","Sempre e soltanto in broadcast sul link","Mai, perché è un protocollo statico"],c:0,e:"EIGRP invia aggiornamenti parziali e limitati solo ai router interessati quando cambia qualcosa."},
 {q:"Come EIGRP scopre e mantiene i vicini?",o:["Con pacchetti Hello","Con TCP handshake","Con richieste ARP","Con DHCP discover"],c:0,e:"EIGRP usa Hello periodici per formare e mantenere le adiacenze (neighbor table)."},
 {q:"Quali tre tabelle mantiene EIGRP?",o:["Neighbor, Topology e Routing","MAC, ARP e Routing","VLAN, STP e Routing","NAT, ACL e Routing"],c:0,e:"EIGRP mantiene la neighbor table, la topology table (con successor/feasible) e la routing table."},
 {q:"EIGRP è classificato come protocollo:",o:["Advanced distance vector (ibrido)","Puro link-state","Path vector","Statico"],c:0,e:"EIGRP combina caratteristiche distance vector e link-state: è detto advanced distance vector o ibrido."},
 {q:"La 'feasible distance' in EIGRP è:",o:["La metrica totale più bassa verso la rete","La metrica del vicino verso la destinazione","Il numero di hop lungo l'intero percorso","La larghezza di banda del singolo link"],c:0,e:"La feasible distance è la migliore metrica calcolata localmente verso la rete di destinazione."}
],
acl_mod:[
 {q:"Una ACL standard filtra il traffico in base a:",o:["Solo l'indirizzo IP sorgente","IP sorgente e destinazione e porta","Solo la porta TCP","L'indirizzo MAC"],c:0,e:"Le ACL standard (1-99) filtrano solo sull'IP sorgente; le extended anche su destinazione, protocollo e porta."},
 {q:"Quale range numerico identifica le ACL standard IPv4?",o:["1-99","100-199","200-299","0-99"],c:0,e:"Le ACL standard usano 1-99 (e 1300-1999); le extended 100-199 (e 2000-2699)."},
 {q:"Cosa c'è implicitamente alla fine di ogni ACL?",o:["Un 'deny any' implicito","Un 'permit any' implicito","Un log automatico","Una regola NAT"],c:0,e:"Ogni ACL termina con un deny any invisibile: se nessuna regola fa match, il traffico è bloccato."},
 {q:"Dove è consigliato posizionare una ACL standard?",o:["Il più vicino possibile alla destinazione","Il più vicino possibile alla sorgente","Sempre in ingresso sul router core","Su ogni interfaccia"],c:0,e:"La ACL standard filtra solo la sorgente, quindi va vicino alla destinazione per non bloccare traffico legittimo."},
 {q:"Dove è consigliato posizionare una ACL extended?",o:["Il più vicino possibile alla sorgente","Vicino alla destinazione","Solo sull'interfaccia WAN","Sul default gateway dei PC"],c:0,e:"La extended è specifica, quindi va vicino alla sorgente per scartare subito il traffico indesiderato."},
 {q:"Cos'è una wildcard mask in una ACL?",o:["Una maschera inversa: 0 confronta, 1 ignora il bit","Una normale subnet mask di rete","Un indirizzo di broadcast della subnet","Un numero di porta TCP o UDP"],c:0,e:"La wildcard è l'inverso della subnet mask: 0 = il bit deve corrispondere, 1 = il bit è ignorato."},
 {q:"La wildcard mask per confrontare esattamente una rete /24 è:",o:["0.0.0.255","255.255.255.0","0.0.0.0","0.0.255.255"],c:0,e:"Per una /24 la wildcard è 0.0.0.255: primi 3 ottetti da confrontare, ultimo ignorato."},
 {q:"Quale comando applica la ACL 10 in ingresso su un'interfaccia?",o:["ip access-group 10 in","access-list 10 in","ip acl 10 inbound","apply access-list 10 in"],c:0,e:"Sotto l'interfaccia: 'ip access-group 10 in' (o out) applica la ACL nella direzione scelta."},
 {q:"Le ACL extended possono filtrare in base a:",o:["Protocollo, IP sorgente/destinazione e porta","Soltanto l'indirizzo IP sorgente","Soltanto l'indirizzo MAC del frame","Soltanto il VLAN ID del traffico"],c:0,e:"Le extended (100-199) filtrano su protocollo (TCP/UDP/ICMP), IP sorgente e destinazione e porte."},
 {q:"Come vengono valutate le regole di una ACL?",o:["Dall'alto in basso, vince la prima corrispondenza","In ordine del tutto casuale tra le righe","Conta soltanto l'ultima riga della lista","A partire dalla regola più specifica"],c:0,e:"Le ACL sono processate top-down: appena una regola fa match, viene applicata e la valutazione si ferma."},
 {q:"Una named ACL offre il vantaggio di:",o:["Nomi descrittivi e modifica delle singole righe","Una maggiore velocità di elaborazione hardware","La possibilità di filtrare gli indirizzi MAC","La capacità di sostituire il routing IP"],c:0,e:"Le named ACL usano nomi significativi e consentono di aggiungere/rimuovere righe specifiche più facilmente."},
 {q:"Per permettere solo il traffico HTTPS, quale porta specifichi nella extended ACL?",o:["eq 443","eq 80","eq 22","eq 25"],c:0,e:"HTTPS usa la porta 443; 'permit tcp <src> any eq 443' consente solo quel traffico."}
],
nat_mod:[
 {q:"Cosa fa il NAT (Network Address Translation)?",o:["Traduce indirizzi privati in pubblici e viceversa","Cifra i pacchetti IP mentre sono in transito","Assegna le VLAN alle porte dello switch","Calcola le rotte migliori verso le reti"],c:0,e:"Il NAT modifica gli indirizzi IP nell'header dei pacchetti, tipicamente da privati (RFC1918) a pubblici."},
 {q:"Cosa distingue il PAT (NAT overload) dal NAT statico?",o:["Mappa molti IP privati su un solo IP pubblico","Usa un IP pubblico distinto per ogni host privato","Non utilizza affatto i numeri di porta","Funziona esclusivamente con indirizzi IPv6"],c:0,e:"Il PAT (overload) condivide un unico IP pubblico tra molti host distinguendo le sessioni tramite le porte."},
 {q:"Nel NAT, l'indirizzo privato dell'host interno è chiamato:",o:["Inside local","Inside global","Outside local","Outside global"],c:0,e:"Inside local = IP privato interno; inside global = IP pubblico dopo traduzione."},
 {q:"Quale tipo di NAT è più usato per condividere una connessione di casa/ufficio?",o:["PAT (overload)","NAT statico","Dynamic NAT senza overload","Nessuno"],c:0,e:"Il PAT permette a molti dispositivi di navigare con un solo IP pubblico: è la soluzione più diffusa."},
 {q:"Il NAT statico è tipicamente usato per:",o:["Esporre un server interno con un IP pubblico fisso","Assegnare gli IP ai client tramite DHCP","Creare nuove VLAN sullo switch di accesso","Bilanciare il carico tra più server web"],c:0,e:"Il NAT statico crea una mappatura 1:1 fissa, utile per rendere raggiungibili server (web, mail) dall'esterno."},
 {q:"Quale comando visualizza le traduzioni NAT attive?",o:["show ip nat translations","show nat pool","show ip route","show running-nat"],c:0,e:"'show ip nat translations' elenca le mappature inside/outside local/global attive."},
 {q:"Su un router, quale interfaccia va marcata 'ip nat inside'?",o:["L'interfaccia rivolta verso la LAN privata","L'interfaccia rivolta verso Internet (WAN)","L'interfaccia di loopback del router","Indistintamente tutte le interfacce"],c:0,e:"'ip nat inside' si mette sulla LAN privata, 'ip nat outside' sull'interfaccia pubblica (WAN)."},
 {q:"Un vantaggio di sicurezza del NAT è:",o:["Nasconde lo schema di indirizzamento interno","Cifra tutto il traffico in uscita dalla LAN","Blocca automaticamente i virus in ingresso","Autentica gli utenti che accedono alla rete"],c:0,e:"Il NAT maschera gli IP interni: dall'esterno si vede solo l'IP pubblico."},
 {q:"Cosa permette al PAT di distinguere sessioni diverse dello stesso IP pubblico?",o:["I numeri di porta","Gli indirizzi MAC","I VLAN ID","Le metriche di routing"],c:0,e:"Il PAT assegna/traccia numeri di porta univoci per ogni sessione, mappandoli sull'unico IP pubblico."},
 {q:"L'indirizzo pubblico con cui l'host interno appare su Internet è chiamato:",o:["Inside global","Inside local","Outside global","Outside local"],c:0,e:"Inside global è l'IP pubblico assegnato dal NAT all'host interno visto da Internet."},
 {q:"Un limite del NAT è:",o:["Complica le app P2P e i protocolli con IP nel payload","Dimezza sempre la velocità della LAN interna","Impedisce del tutto l'uso del protocollo TCP","Richiede obbligatoriamente l'adozione di IPv6"],c:0,e:"Il NAT può rompere applicazioni che incorporano indirizzi nel payload (es. alcuni VoIP/FTP) senza ALG."},
 {q:"Il NAT è meno necessario con IPv6 perché:",o:["Lo spazio è enorme: ogni host può avere un IP globale","IPv6 non supporta in alcun modo la traduzione NAT","IPv6 è più lento e va compensato in altro modo","IPv6 utilizza esclusivamente indirizzi privati"],c:0,e:"IPv6 offre uno spazio così vasto da rendere superfluo il NAT per la conservazione degli indirizzi."}
],
ssh_sec:[
 {q:"Perché SSH è preferito a Telnet per la gestione remota?",o:["SSH cifra la sessione, Telnet la manda in chiaro","SSH è sensibilmente più veloce di Telnet","Telnet non funziona sui router Cisco","SSH non richiede alcuna autenticazione"],c:0,e:"SSH cifra credenziali e dati; Telnet invia tutto in chiaro ed è vulnerabile allo sniffing."},
 {q:"Quale porta usa SSH di default?",o:["22","23","443","80"],c:0,e:"SSH usa la porta TCP 22; Telnet la 23."},
 {q:"Cosa fa la port security su uno switch?",o:["Limita gli indirizzi MAC ammessi su una porta","Cifra il traffico che attraversa la VLAN","Assegna indirizzi IP statici agli host","Crea automaticamente i collegamenti trunk"],c:0,e:"La port security restringe quali/quanti MAC possono usare una porta, bloccando accessi non autorizzati."},
 {q:"Cosa rappresenta la prima 'A' in AAA?",o:["Authentication","Access","Address","Auditing"],c:0,e:"AAA = Authentication (chi sei), Authorization (cosa puoi fare), Accounting (cosa hai fatto)."},
 {q:"Quale comando cifra le password in chiaro nel running-config?",o:["service password-encryption","enable secret","password encryption on","crypto key generate"],c:0,e:"'service password-encryption' applica una cifratura debole (tipo 7) alle password in chiaro del config."},
 {q:"Perché usare 'enable secret' invece di 'enable password'?",o:["'enable secret' salva un hash, 'enable password' è debole","I due comandi sono del tutto equivalenti tra loro","'enable password' è in realtà l'opzione più sicura","'enable secret' non richiede di impostare una password"],c:0,e:"'enable secret' salva un hash molto più sicuro della 'enable password'."},
 {q:"Quale modalità port security mette la porta in err-disabled a una violazione?",o:["shutdown","protect","restrict","permit"],c:0,e:"La modalità 'shutdown' (default) mette la porta in err-disabled; 'restrict' e 'protect' scartano solo il traffico."},
 {q:"Quali sono i due protocolli AAA server più comuni?",o:["RADIUS e TACACS+","HTTP e HTTPS","OSPF e EIGRP","STP e VTP"],c:0,e:"RADIUS (standard) e TACACS+ (Cisco, cifra l'intero pacchetto) sono i protocolli AAA tipici."},
 {q:"Cosa serve per abilitare SSH su un router Cisco?",o:["Hostname, ip domain-name e chiavi RSA generate","È sufficiente abilitare il protocollo Telnet","Un server DHCP raggiungibile sulla rete","Una VLAN interamente dedicata alla gestione"],c:0,e:"Servono hostname, ip domain-name e 'crypto key generate rsa', più utenti locali/AAA."},
 {q:"Cos'è una MAC 'sticky' nella port security?",o:["Un MAC appreso in automatico e salvato in config","Un indirizzo MAC generato in modo casuale","L'indirizzo MAC di broadcast della LAN","Un indirizzo MAC permanentemente bloccato"],c:0,e:"Con 'port-security mac-address sticky' lo switch impara il MAC e lo salva nel running-config."},
 {q:"Perché disabilitare le porte switch inutilizzate?",o:["Per ridurre la superficie d'attacco della rete","Soltanto per risparmiare energia elettrica","Per velocizzare la convergenza dello STP","Non porta in realtà alcun beneficio pratico"],c:0,e:"Le porte inattive andrebbero spente (shutdown) e messe in una VLAN parcheggio per sicurezza."},
 {q:"Un login banner (MOTD) serve principalmente a:",o:["Avvisare legalmente chi accede al dispositivo","Cifrare la sessione di gestione remota","Assegnare i privilegi agli utenti locali","Configurare il framework AAA sul device"],c:0,e:"Il banner MOTD mostra un avviso legale/di sicurezza; è buona prassi anche se non protegge tecnicamente."}
],
ipv6_mod:[
 {q:"Quanti bit ha un indirizzo IPv6?",o:["128","64","32","256"],c:0,e:"IPv6 usa 128 bit, contro i 32 di IPv4, offrendo uno spazio enormemente più grande."},
 {q:"Quale prefisso identifica un indirizzo IPv6 link-local?",o:["FE80::/10","2000::/3","FC00::/7","FF00::/8"],c:0,e:"Gli indirizzi link-local (FE80::/10) sono validi solo sul segmento locale e autogenerati."},
 {q:"Come si abbrevia 2001:0db8:0000:0000:0000:0000:0000:0001?",o:["2001:db8::1","2001:db8:0:1","2001::db8::1","2001:db8:1"],c:0,e:"Si tolgono gli zeri iniziali di ogni gruppo e si sostituisce una sola sequenza di gruppi nulli con ::."},
 {q:"Quale tipo di indirizzo IPv6 corrisponde agli IP pubblici instradabili?",o:["Global unicast (2000::/3)","Link-local (FE80::/10)","Unique local (FC00::/7)","Multicast (FF00::/8)"],c:0,e:"I global unicast (2000::/3) sono instradabili su Internet, equivalenti agli IP pubblici IPv4."},
 {q:"IPv6 ha eliminato quale concetto presente in IPv4?",o:["Il broadcast, sostituito dal multicast","Il traffico multicast di gruppo","Gli indirizzi di tipo unicast","Il routing dei pacchetti IP"],c:0,e:"IPv6 non usa il broadcast: le funzioni sono svolte da multicast e anycast."},
 {q:"Cos'è SLAAC in IPv6?",o:["L'autoconfigurazione stateless dell'indirizzo","Un protocollo di routing dinamico per IPv6","Un particolare tipo di ACL per IPv6","Un server DHCPv6 sempre obbligatorio"],c:0,e:"SLAAC permette all'host di generarsi l'indirizzo dal prefisso annunciato dal router (RA)."},
 {q:"Quale protocollo sostituisce ARP in IPv6?",o:["NDP","RARP","ICMPv4","DHCP"],c:0,e:"NDP usa messaggi ICMPv6 (NS/NA, RS/RA) per scoperta vicini, risoluzione indirizzi e router discovery."},
 {q:"Quanti gruppi (hextet) compongono un indirizzo IPv6?",o:["8 gruppi da 16 bit","4 gruppi da 8 bit","16 gruppi da 8 bit","6 gruppi da 32 bit"],c:0,e:"IPv6 ha 8 gruppi da 16 bit separati da due punti (128 bit totali)."},
 {q:"L'indirizzo di loopback IPv6 è:",o:["::1","127.0.0.1","FE80::1","::"],c:0,e:"::1 è il loopback IPv6, equivalente a 127.0.0.1 in IPv4."},
 {q:"La regola del '::' (doppio due punti) può essere usata:",o:["Una sola volta per indirizzo","Quante volte si vuole","Solo all'inizio","Mai negli indirizzi pubblici"],c:0,e:"Il :: comprime una sola sequenza di gruppi a zero; usarlo due volte renderebbe l'indirizzo ambiguo."},
 {q:"Un prefisso IPv6 tipico per una subnet LAN è:",o:["/64","/24","/32","/128"],c:0,e:"Le subnet IPv6 usano tipicamente /64: 64 bit di rete e 64 di interface ID (richiesto da SLAAC)."},
 {q:"A cosa serve l'indirizzo multicast FF02::1 in IPv6?",o:["Raggiungere tutti i nodi del link locale","Raggiungere tutti i router del link","Fare da indirizzo di loopback del nodo","Fare da broadcast a livello globale"],c:0,e:"FF02::1 = tutti i nodi del link; FF02::2 = tutti i router del link."}
],
wan_mod:[
 {q:"Cosa fornisce una VPN site-to-site?",o:["Un tunnel cifrato tra due sedi via Internet","Una rete LAN wireless estesa tra edifici","Un servizio DHCP centralizzato in sede","Una VLAN estesa fisicamente su fibra"],c:0,e:"La VPN site-to-site connette in modo sicuro reti di sedi diverse cifrando il traffico su Internet."},
 {q:"Quale suite di protocolli fornisce cifratura e autenticazione per le VPN?",o:["IPSec","HTTP","STP","VTP"],c:0,e:"IPSec offre riservatezza, integrità e autenticazione ai tunnel VPN (ESP/AH, IKE)."},
 {q:"Cos'è GRE?",o:["Un tunneling che incapsula più protocolli, senza cifrare","Un protocollo dedicato alla cifratura del traffico","Un protocollo di routing dinamico per la WAN","Uno standard per il tagging 802.1Q delle VLAN"],c:0,e:"GRE incapsula pacchetti in un tunnel ma non cifra: spesso combinato con IPSec per la sicurezza."},
 {q:"Cosa caratterizza MPLS?",o:["Inoltra i pacchetti in base a etichette (label)","Cifra tutto il traffico che attraversa la WAN","È un protocollo di accesso wireless 802.11","Assegna le VLAN alle porte degli switch"],c:0,e:"MPLS usa label switching per instradare rapidamente i pacchetti nella rete del provider."},
 {q:"Quale tecnologia WAN è un collegamento dedicato punto-punto tra due sedi?",o:["Leased line","Broadband condivisa","Wi-Fi","Hotspot 4G"],c:0,e:"La leased line è un circuito dedicato e sempre attivo tra due punti, con banda garantita."},
 {q:"Una VPN client-to-site (remote access) serve a:",o:["Connettere un singolo utente remoto alla LAN","Collegare tra loro due interi data center","Sostituire lo switch di accesso in sede","Creare nuove VLAN sulla rete aziendale"],c:0,e:"La remote access VPN permette a un lavoratore remoto di accedere in sicurezza alla LAN aziendale."},
 {q:"Nel modello WAN, il dispositivo del cliente al confine col provider è detto:",o:["CE (Customer Edge)","PE (Provider Edge)","Core router","DTE loopback"],c:0,e:"Il CE (Customer Edge) è l'apparato del cliente che si collega al PE del provider."},
 {q:"Quale incapsulamento WAN standard per link punto-punto supporta l'autenticazione?",o:["PPP","Ethernet","802.1Q","ARP"],c:0,e:"PPP supporta autenticazione (PAP/CHAP), multilink e più protocolli su link seriali punto-punto."},
 {q:"IPSec opera principalmente a quale livello?",o:["Livello 3 (Network)","Livello 2 (Data Link)","Livello 7 (Application)","Livello 1 (Physical)"],c:0,e:"IPSec protegge il traffico a livello 3, cifrando i pacchetti IP tra gli endpoint del tunnel."},
 {q:"Cosa fornisce la 'broadband' come tecnologia WAN?",o:["Accesso Internet condiviso ad alta velocità","Un circuito dedicato con banda garantita","Esclusivamente connettività di tipo wireless","Un tunnel cifrato creato in automatico"],c:0,e:"Broadband (DSL/cavo/fibra) offre accesso Internet ad alta velocità su mezzo condiviso, senza banda garantita."},
 {q:"Quale protocollo IPSec fornisce cifratura del payload?",o:["ESP","AH","IKE da solo","GRE"],c:0,e:"ESP cifra e autentica il payload; AH offre solo autenticazione/integrità senza cifratura."},
 {q:"Un vantaggio della VPN rispetto a una leased line è:",o:["Costo inferiore usando Internet come trasporto","Una banda sempre garantita dal provider","Una latenza praticamente nulla e costante","Non richiede alcuna cifratura del traffico"],c:0,e:"La VPN sfrutta Internet (economico) al posto di circuiti dedicati costosi, a scapito di garanzie di banda."}
],
auto_mod:[
 {q:"Cosa separa l'architettura SDN?",o:["Il control plane dal data plane","Le VLAN dalle subnet","Solo il routing dallo switching fisico","Il NAT dall'ACL"],c:0,e:"SDN centralizza il control plane (in un controller) separandolo dal data plane dei dispositivi."},
 {q:"Quale formato di dati leggibile è molto usato nelle API di rete?",o:["JSON","EXE","MP3","CSV binario"],c:0,e:"JSON è leggero e leggibile, molto usato nelle API REST; anche XML e YAML sono comuni."},
 {q:"Cosa usa una API REST per le operazioni?",o:["Metodi HTTP come GET, POST, PUT, DELETE","I comandi della CLI Cisco IOS","I pacchetti del protocollo OSPF","I frame Ethernet di livello 2"],c:0,e:"Le REST API sfruttano i verbi HTTP (GET/POST/PUT/DELETE) per interagire con le risorse."},
 {q:"Quale linguaggio è lo standard de facto per l'automazione di rete?",o:["Python","COBOL","Assembly","PHP"],c:0,e:"Python, con librerie come Netmiko e Nornir, è ampiamente usato per automatizzare la rete."},
 {q:"Quale strumento di automazione è agentless e usa YAML per i playbook?",o:["Ansible","Puppet","Chef","Java"],c:0,e:"Ansible è agentless (usa SSH) e definisce le configurazioni in playbook YAML."},
 {q:"Nel REST, quale verbo HTTP recupera dati senza modificarli?",o:["GET","POST","DELETE","PUT"],c:0,e:"GET è usato per leggere risorse; POST crea, PUT aggiorna, DELETE elimina."},
 {q:"Cos'è un controller SDN?",o:["Un sistema centrale che governa le decisioni d'inoltro","Uno switch che opera soltanto al livello 2","Un particolare tipo di cavo di rete","Un server DHCP per l'assegnazione degli IP"],c:0,e:"Il controller SDN centralizza l'intelligenza di rete e programma i dispositivi tramite southbound API."},
 {q:"Quale codice di stato HTTP indica una richiesta andata a buon fine?",o:["200 OK","404 Not Found","500 Server Error","401 Unauthorized"],c:0,e:"200 indica successo; 4xx errori client (404, 401), 5xx errori server (500)."},
 {q:"Un vantaggio dell'automazione di rete è:",o:["Configurazioni coerenti e ripetibili, meno errori","Elimina la necessità di indirizzi IP in rete","Rende del tutto superflua la sicurezza","Aumenta gli errori dovuti al lavoro manuale"],c:0,e:"L'automazione riduce gli errori manuali garantendo configurazioni standardizzate e scalabili."},
 {q:"Cosa sono le 'northbound API' in SDN?",o:["Interfacce tra il controller e le applicazioni","Interfacce tra il controller e gli switch","I cavi in fibra ottica del data center","I protocolli di routing dinamico interni"],c:0,e:"Le northbound API espongono le funzioni del controller alle applicazioni; le southbound parlano coi dispositivi."},
 {q:"Quale formato usa l'indentazione significativa ed è comune in Ansible?",o:["YAML","JSON","XML","HTML"],c:0,e:"YAML usa l'indentazione per la struttura ed è molto leggibile: tipico dei playbook Ansible."},
 {q:"Cos'è l'Infrastructure as Code (IaC)?",o:["Gestire l'infrastruttura con file di codice versionati","Cablare fisicamente i rack del data center","Uno specifico linguaggio di programmazione","Un protocollo di routing per l'automazione"],c:0,e:"IaC descrive l'infrastruttura in file di codice (versionati in Git), rendendo i deployment ripetibili."}
]
};
// Ogni lab interattivo abbinato a UN SOLO modulo (niente ripetizioni)
const LABMAP={osi_mod:'osi',tcpip_mod:'packet',subnetting:'subnet',vlan_mod:'vlan',routing_s:'cli'};
// Aggregazioni per BOSS e certificazione finale
// ── Banche domande dei moduli aggiuntivi (blueprint CCNA) ──
QBANK.wifi_mod=[
 {q:"In una rete wireless aziendale, qual è il ruolo del WLC (Wireless LAN Controller)?",o:["Gestisce e configura centralmente molti Access Point","Sostituisce il router di bordo verso Internet","Assegna gli indirizzi MAC ai client wireless","Cifra il traffico della LAN tramite IPSec"],c:0,e:"Il WLC gestisce in modo centralizzato molti AP 'lightweight': canali, potenza, SSID e roaming, senza configurarli uno per uno."},
 {q:"Quale banda Wi-Fi offre in genere più velocità ma minore portata?",o:["5 GHz","2.4 GHz","900 MHz","60 GHz sempre"],c:0,e:"La banda 5 GHz ha più canali non sovrapposti e velocità maggiori, ma penetra meno pareti rispetto ai 2.4 GHz."},
 {q:"Cos'è un SSID?",o:["Il nome identificativo di una rete wireless","L'indirizzo MAC radio dell'Access Point","La chiave di cifratura della rete WPA2","Il canale radio attualmente utilizzato"],c:0,e:"L'SSID (Service Set Identifier) è il nome della WLAN che i client vedono e a cui si associano."},
 {q:"Quale standard di sicurezza wireless è il più robusto tra questi?",o:["WPA3","WPA2","WEP","Rete aperta"],c:0,e:"WPA3 è il più recente e sicuro; WEP è obsoleto e facilmente violabile, la rete aperta non ha cifratura."},
 {q:"Nei canali 2.4 GHz, quali sono i tre canali che non si sovrappongono?",o:["1, 6, 11","1, 2, 3","2, 7, 12","1, 5, 9"],c:0,e:"Su 2.4 GHz i canali 1, 6 e 11 non si sovrappongono, riducendo le interferenze tra AP vicini."},
 {q:"Cosa descrive un AP in modalità 'autonoma' (autonomous)?",o:["Un AP con configurazione locale, senza WLC","Un AP che funziona soltanto tramite cavo","Un AP che instrada i pacchetti IP tra reti","Un AP che non trasmette alcun SSID"],c:0,e:"Un AP autonomo ha la propria configurazione locale; un AP 'lightweight' dipende invece dal WLC."}
];
QBANK.redun_mod=[
 {q:"A cosa serve lo Spanning Tree Protocol (STP) in una rete switched?",o:["A prevenire i loop di livello 2 in reti ridondanti","Ad accelerare il routing dei pacchetti IP","A cifrare i frame Ethernet tra gli switch","Ad assegnare automaticamente le VLAN"],c:0,e:"STP (802.1D/RSTP) evita i loop L2 mettendo in blocco le porte ridondanti, lasciando un solo percorso attivo."},
 {q:"Cosa fa EtherChannel?",o:["Aggrega più link fisici in un unico link logico","Crea una VLAN dedicata per ciascuna porta","Cifra il traffico scambiato tra due switch","Converte i collegamenti in rame in fibra"],c:0,e:"EtherChannel (LACP/PAgP) unisce più link in uno logico: più banda e ridondanza, e STP lo vede come un solo collegamento."},
 {q:"Qual è lo scopo di HSRP?",o:["Fornire un gateway predefinito ridondante","Assegnare gli indirizzi IP ai client LAN","Filtrare il traffico in base alla porta","Sincronizzare l'orologio dei router"],c:0,e:"HSRP (First Hop Redundancy) fa condividere a due router un IP virtuale: se l'attivo cade, lo standby subentra come gateway."},
 {q:"In HSRP, quale router inoltra normalmente il traffico?",o:["Il router Active","Il router Standby","Entrambi contemporaneamente","Nessuno, serve un WLC"],c:0,e:"L'Active inoltra il traffico verso il gateway virtuale; lo Standby monitora e subentra solo se l'Active diventa irraggiungibile."},
 {q:"Quale versione di Spanning Tree converge più rapidamente?",o:["RSTP (802.1w)","STP classico (802.1D)","Nessuna, sono identiche","Solo con EtherChannel"],c:0,e:"RSTP (Rapid STP, 802.1w) converge in pochi secondi rispetto ai ~30-50s dello STP classico."},
 {q:"Il protocollo LACP appartiene a quale tecnologia?",o:["EtherChannel","HSRP","DHCP","OSPF"],c:0,e:"LACP (802.3ad) è lo standard aperto per negoziare l'aggregazione di link in un EtherChannel; PAgP è l'equivalente Cisco."}
];
QBANK.ipserv_mod=[
 {q:"Qual è la sequenza corretta dello scambio DHCP?",o:["Discover → Offer → Request → Ack (DORA)","Request → Offer → Ack → Discover","Sync → Ack → Lease → Renew","Hello → Offer → Bind → Ack"],c:0,e:"Il client DHCP segue DORA: Discover (broadcast), Offer (server propone un IP), Request, Ack (conferma del lease)."},
 {q:"A cosa serve il DNS?",o:["A tradurre i nomi di dominio in indirizzi IP","A cifrare il traffico web tra client e server","Ad assegnare gli indirizzi IP ai client LAN","A sincronizzare l'orario dei dispositivi di rete"],c:0,e:"Il DNS risolve nomi (es. kuehne-nagel.com) negli indirizzi IP necessari per instradare i pacchetti. Porta UDP/TCP 53."},
 {q:"Quale protocollo sincronizza l'orologio dei dispositivi di rete?",o:["NTP","SNMP","Syslog","DHCP"],c:0,e:"NTP (Network Time Protocol, UDP 123) mantiene l'orario coerente: fondamentale per log, certificati e correlazione degli eventi."},
 {q:"A cosa serve Syslog?",o:["A raccogliere e centralizzare i messaggi di log","Ad assegnare gli indirizzi IP ai dispositivi","A creare e propagare le VLAN sugli switch","A cifrare le password memorizzate nella config"],c:0,e:"Syslog (UDP 514) invia i messaggi di log a un server centrale, con livelli di severità da 0 (emergency) a 7 (debug)."},
 {q:"Quale protocollo permette di monitorare i dispositivi (CPU, interfacce, traffico)?",o:["SNMP","NTP","DNS","ARP"],c:0,e:"SNMP (UDP 161/162) consente a un NMS di interrogare e ricevere trap dai dispositivi per il monitoraggio."},
 {q:"Cosa fa la QoS (Quality of Service) in rete?",o:["Dà priorità al traffico sensibile (voce e video)","Assegna gli indirizzi IP ai dispositivi","Cifra i pacchetti che attraversano la rete","Blocca le porte dello switch inutilizzate"],c:0,e:"La QoS classifica e prioritizza il traffico (es. VoIP) per garantire bassa latenza quando la banda è satura."},
 {q:"Su quali porte lavora tipicamente il DHCP?",o:["UDP 67 (server) e 68 (client)","TCP 80 e 443","UDP 53","TCP 22"],c:0,e:"Il server DHCP ascolta su UDP 67, il client su UDP 68; lo scambio iniziale avviene in broadcast."}
];
const AGG={boss1:['subnetting','ip_addr'],boss2:['routing_s','ospf_mod','eigrp_mod'],boss3:['acl_mod','nat_mod','ssh_sec']};
const ALL_BANK_IDS=Object.keys(QBANK);
// Argomenti del quiz libero -> banchi moduli
const TOPIC_MAP={
 'OSI & TCP/IP Model':['osi_mod','tcpip_mod'],
 'IP Addressing & Subnetting':['binary','ip_addr','subnetting'],
 'VLANs & Switching':['switching','vlan_mod'],
 'Wireless (Wi-Fi)':['wifi_mod'],
 'Ridondanza (STP/HSRP)':['redun_mod'],
 'Routing (OSPF, EIGRP, RIP)':['routing_s','ospf_mod','eigrp_mod'],
 'NAT & PAT':['nat_mod'],
 'ACLs':['acl_mod'],
 'WAN & VPN':['wan_mod'],
 'Network Security':['ssh_sec'],
 'Servizi IP (DHCP/DNS)':['ipserv_mod'],
 'IPv6':['ipv6_mod'],
 'Network Automation & SDN':['auto_mod'],
};
function qShuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
function collectQ(ids){let out=[];ids.forEach(id=>{if(QBANK[id])out=out.concat(QBANK[id]);});return out;}
function questionsForModule(mod){
  if(mod.type==='cert') return collectQ(ALL_BANK_IDS);
  if(AGG[mod.id]) return collectQ(AGG[mod.id]);
  if(QBANK[mod.id]) return QBANK[mod.id].slice();
  return collectQ(ALL_BANK_IDS);
}
// mescola le opzioni mantenendo la risposta corretta
function prepQuestion(raw,tag){
  const opts=raw.o.map((t,i)=>({t,ok:i===raw.c}));
  qShuffle(opts);
  return{question:raw.q,options:opts.map(o=>o.t),correct:opts.findIndex(o=>o.ok),explanation:raw.e,subtopic:raw.tag||tag||'',gloss:raw.g||null,schema:raw.s||null};
}

function initQuizMenu(){
  const tg=_id('topic-grid');tg.innerHTML='';
  TOPICS.forEach(t=>{
    const b=document.createElement('button');b.className='topic-btn'+(t===quizTopic?' sel':'');
    b.textContent=t;b.onclick=()=>{document.querySelectorAll('#topic-grid .topic-btn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');quizTopic=t;};
    tg.appendChild(b);
  });
  _id('quiz-menu').style.display='block';
  _id('quiz-active').style.display='none';
  _id('quiz-result').style.display='none';
}
function selMode(btn){
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');quizMode=btn.dataset.mode;
}
function startQuiz(){
  const cfg=MODE_CFG[quizMode];
  const ids=TOPIC_MAP[quizTopic]||ALL_BANK_IDS;
  const pool=qShuffle(collectQ(ids));
  quizState={source:'topic',topic:quizTopic,mode:quizMode,cfg,pool,total:Math.min(cfg.q,pool.length)||1,cur:0,results:[],xpEarned:0,timer:null,timeLeft:cfg.t,answered:false,labKey:null};
  _id('quiz-menu').style.display='none';
  _id('quiz-active').style.display='block';
  _id('quiz-result').style.display='none';
  buildDots();
  loadQuestion();
}
// Quiz dedicato a un singolo modulo del percorso
function startModuleQuiz(mod){
  const isBoss=mod.type==='boss',isCert=mod.type==='cert';
  const pool=qShuffle(questionsForModule(mod));
  const total=isCert?Math.min(30,pool.length):isBoss?Math.min(12,pool.length):Math.min(10,pool.length);
  const t=isBoss?25:isCert?75:45;
  quizState={source:'module',moduleId:mod.id,modTitle:mod.title,mode:isBoss?'boss':'module',cfg:{t,mult:isBoss?2:isCert?1.5:1},pool,total:total||1,cur:0,results:[],xpEarned:0,timer:null,timeLeft:t,answered:false,labKey:LABMAP[mod.id]||null};
  _id('quiz-menu').style.display='none';
  _id('quiz-active').style.display='block';
  _id('quiz-result').style.display='none';
  buildDots();
  loadQuestion();
}
function replayQuiz(){
  if(quizState&&quizState.source==='module'){const m=MODS.find(x=>x.id===quizState.moduleId);if(m)return startModuleQuiz(m);}
  if(quizState&&quizState.source==='exam')return startExam();
  startQuiz();
}
function buildDots(){
  const el=_id('prog-dots');el.innerHTML='';
  for(let i=0;i<quizState.total;i++){
    const d=document.createElement('div');d.className='prog-dot'+(i===0?' cur':'');d.id='dot-'+i;el.appendChild(d);
  }
}
function loadQuestion(){
  quizState.answered=false;
  clearInterval(quizState.timer);
  _id('q-loading').classList.remove('show');
  _id('q-err').classList.remove('show');
  _id('q-feedback').classList.remove('show','ok','ko');
  _id('next-btn').classList.remove('show');
  _id('opts-grid').innerHTML='';
  const raw=quizState.pool[quizState.cur%quizState.pool.length];
  const q=prepQuestion(raw,quizState.modTitle||quizState.topic);
  quizState.currentQ=q;
  renderQuestion(q);
}
function renderQuestion(q){
  _id('q-loading').classList.remove('show');
  _id('q-question').style.display='block';
  _id('q-meta').textContent='Domanda '+(quizState.cur+1)+'/'+quizState.total;
  _id('q-tag').textContent=(q.subtopic||quizState.topic).toUpperCase();
  _id('q-text').textContent=q.question;
  const grid=_id('opts-grid');grid.innerHTML='';
  q.options.forEach((opt,i)=>{
    const b=document.createElement('button');b.className='opt';
    b.innerHTML='<span class="opt-lbl">'+['A','B','C','D'][i]+'</span><span>'+opt.replace(/^[A-D]\)\s*/,'')+'</span>';
    b.onclick=()=>{if(!quizState.answered)answerQ(i,b);};
    grid.appendChild(b);
  });
  suppressHover(grid);
  startTimer();
}
function startTimer(){
  quizState.timeLeft=quizState.cfg.t;
  const el=_id('q-timer');el.classList.remove('warn');
  const tick=()=>{
    quizState.timeLeft--;
    el.textContent=quizState.timeLeft;
    if(quizState.timeLeft<=10) el.classList.add('warn');
    if(quizState.timeLeft<=0){clearInterval(quizState.timer);if(!quizState.answered)timeoutQ();}
  };
  el.textContent=quizState.timeLeft;
  quizState.timer=setInterval(tick,1000);
}
function timeoutQ(){
  quizState.answered=true;
  document.querySelectorAll('.opt').forEach((b,i)=>{b.disabled=true;if(i===quizState.currentQ.correct)b.classList.add('ok');});
  quizState.results.push(buildResult(quizState.currentQ,-1,false));
  G.streak=0;saveG();updateUI();
  showFeedback(false,'⏱ Tempo scaduto',quizState.currentQ.explanation);
  dotMark(false);_id('next-btn').classList.add('show');
}
function answerQ(idx,btn){
  if(quizState.answered) return;
  quizState.answered=true;
  clearInterval(quizState.timer);
  const ok=idx===quizState.currentQ.correct;
  document.querySelectorAll('.opt').forEach((b,i)=>{b.disabled=true;if(i===quizState.currentQ.correct)b.classList.add('ok');});
  if(!ok) btn.classList.add('ko');
  quizState.results.push(buildResult(quizState.currentQ,idx,ok));
  if(ok){
    const baseXP=20;const speedBonus=Math.floor(quizState.timeLeft*.4);
    const streakBonus=G.streak>2?(G.streak-2)*5:0;
    const pts=Math.round((baseXP+speedBonus+streakBonus)*quizState.cfg.mult);
    quizState.xpEarned+=pts;addXP(pts);
    showFeedback(true,'✓ Corretto! +'+pts+' XP',quizState.currentQ.explanation);
  } else {
    G.streak=0;saveG();updateUI();
    showFeedback(false,'✗ Risposta errata',quizState.currentQ.explanation);
  }
  dotMark(ok);_id('next-btn').classList.add('show');
  if(quizState.mode==='hardcore'&&!ok){
    _id('next-btn').textContent='VER RISULTATI';
    _id('next-btn').onclick=showQuizResult;
  }
}
function showFeedback(ok,title,body){
  const fb=_id('q-feedback');fb.className='feedback show '+(ok?'ok':'ko');
  _id('fb-title').textContent=title;_id('fb-body').textContent=body;
}
function dotMark(ok){
  const d=_id('dot-'+quizState.cur);if(d){d.classList.remove('cur');d.classList.add(ok?'ok':'ko');}
  const next=_id('dot-'+(quizState.cur+1));if(next) next.classList.add('cur');
}
async function nextQuestion(){
  quizState.cur++;
  _id('next-btn').textContent='PROSSIMA →';_id('next-btn').onclick=nextQuestion;
  if(quizState.cur>=quizState.total){showQuizResult();return;}
  await loadQuestion();
}
const DOMAINS={
 'Fondamenti':['net_basics','binary','osi_mod','tcpip_mod','ipv6_mod'],
 'Accesso alla rete':['switching','vlan_mod','wifi_mod','redun_mod'],
 'Connettività IP':['ip_addr','subnetting','boss1','routing_s','ospf_mod','eigrp_mod','boss2','wan_mod'],
 'Servizi IP':['nat_mod','ipserv_mod'],
 'Sicurezza':['acl_mod','ssh_sec','boss3'],
 'Automazione':['auto_mod']
};
function domainOfModule(mid){for(const d in DOMAINS){if(DOMAINS[d].includes(mid))return d;}return 'Altro';}
function domainOfQuestion(text){const e=EXAM_BANK.find(x=>x.q===text);if(e&&e.dom)return e.dom;return domainOfModule(moduleOfQuestion(text));}
// Snapshot completo di una domanda risposta: serve alla revisione post-esame
// (testo, opzioni mescolate, indice corretto, scelta dell'utente, glossario e schema).
function buildResult(cq,chosen,ok){
  return {q:cq.question,ok,dom:domainOfQuestion(cq.question),
    opts:(cq.options||[]).slice(),correct:cq.correct,chosen,exp:cq.explanation,
    gloss:cq.gloss||null,schema:cq.schema||null};
}
function renderDomainScores(){
  const dc=_id('res-domains');if(!dc)return;dc.innerHTML='';
  if(quizState.mode!=='exam')return;
  const agg={};quizState.results.forEach(r=>{const d=r.dom||'Altro';(agg[d]=agg[d]||{ok:0,t:0}).t++;if(r.ok)agg[d].ok++;});
  let h='<div class="sec-title" style="margin:20px 0 10px">Punteggio per dominio</div>';
  Object.keys(agg).forEach(d=>{const a=agg[d],p=Math.round(a.ok/a.t*100),c=p>=75?'var(--green)':p>=60?'var(--accent)':'var(--red)';
    h+='<div class="dom-row"><div class="dom-top"><span>'+d+'</span><b style="color:'+c+'">'+a.ok+'/'+a.t+' · '+p+'%</b></div><div class="dom-track"><div class="dom-fill" style="width:'+p+'%;background:'+c+'"></div></div></div>';});
  dc.innerHTML=h;
}
// ══════════════════════════════════════
// EXAM SIMULATION · original CCNA 200-301 style questions (English)
//   Aligned to the official blueprint — not dump copies.
//   dom = exam domain · g = related glossary term · s = related schema id
// ══════════════════════════════════════
const EXAM_BANK=[
 // ── 1 · Network Fundamentals ──────────────────────────────
 {dom:'Network Fundamentals',q:"Which two OSI layers map to the Network Access (Link) layer of the TCP/IP model?",o:["Data Link and Physical","Transport and Network","Session and Presentation","Application and Transport"],c:0,e:"The TCP/IP Network Access layer combines the OSI Data Link and Physical layers.",g:"Modello OSI",s:"osi"},
 {dom:'Network Fundamentals',q:"A host is configured with 172.16.5.10/20. What is its network address?",o:["172.16.0.0","172.16.4.0","172.16.5.0","172.16.16.0"],c:0,e:"/20 = 255.255.240.0, block size 16 in the 3rd octet: 5 falls in the 0–15 block → network 172.16.0.0.",g:"Subnet mask",s:"subnet"},
 {dom:'Network Fundamentals',q:"Which device separates broadcast domains by default?",o:["A router (L3)","A switch (L2)","A hub (L1)","A repeater"],c:0,e:"Routers bound broadcast domains; by default all switch ports are in one broadcast domain (VLAN 1).",g:"Router",s:"osi"},
 {dom:'Network Fundamentals',q:"Which IPv6 address is a link-local address?",o:["FE80::1","2001:db8::1","FC00::1","2002::1"],c:0,e:"Link-local addresses belong to FE80::/10 and are valid only on the local segment.",g:"Link-local",s:"ipv6"},
 {dom:'Network Fundamentals',q:"A frame with destination MAC FFFF.FFFF.FFFF is:",o:["Flooded to all ports in the VLAN (L2 broadcast)","Forwarded only to the default gateway port","Dropped immediately by the receiving switch","Routed out to the Internet by the router"],c:0,e:"FFFF.FFFF.FFFF is the L2 broadcast: the switch floods it out every port in the same VLAN.",g:"MAC address",s:"osi"},
 {dom:'Network Fundamentals',q:"How many usable hosts does a /26 subnet provide?",o:["62","64","30","126"],c:0,e:"/26 leaves 6 host bits: 2^6 − 2 = 62 usable hosts (network and broadcast removed).",g:"Block size",s:"subnet"},
 {dom:'Network Fundamentals',q:"Which transport protocol provides reliable, connection-oriented delivery with acknowledgements?",o:["TCP","UDP","ICMP","IP"],c:0,e:"TCP uses a 3-way handshake, sequencing and ACKs; UDP is fast but best-effort.",g:"TCP",s:"osi"},
 {dom:'Network Fundamentals',q:"Which cable connects a PC NIC directly to a switch access port (no auto-MDIX)?",o:["Straight-through","Crossover","Rollover (console)","Coaxial"],c:0,e:"Different device types (PC↔switch) use a straight-through cable; like devices use a crossover.",g:"Switch",s:"osi"},
 {dom:'Network Fundamentals',q:"Which range is a private (RFC 1918) address block?",o:["10.0.0.0 – 10.255.255.255","172.32.0.0 – 172.63.255.255","192.169.0.0 – 192.169.255.255","224.0.0.0 – 239.255.255.255"],c:0,e:"RFC 1918 blocks are 10/8, 172.16–31/12 and 192.168/16; they need NAT to reach the Internet.",g:"Indirizzo IP privato",s:"subnet"},
 {dom:'Network Fundamentals',q:"How many bits does a single hexadecimal digit represent?",o:["4 bits (a nibble)","8 bits","2 bits","16 bits"],c:0,e:"Each hex digit maps to 4 bits; two hex digits = 1 byte, handy for MAC and IPv6.",g:"MAC address",s:"ipv6"},
 // ── 2 · Network Access ────────────────────────────────────
 {dom:'Network Access',q:"Which command statically forces an interface to become a trunk?",o:["switchport mode trunk","switchport access vlan 1","switchport nonegotiate","no switchport"],c:0,e:"'switchport mode trunk' forces trunking; 'nonegotiate' only disables DTP.",g:"Trunk / 802.1Q",s:"vlan"},
 {dom:'Network Access',q:"On a non-root switch, which port role forwards traffic toward the root bridge?",o:["Root port","Designated port","Alternate (blocking) port","Disabled port"],c:0,e:"The root port has the lowest cost to the root bridge and forwards toward it.",g:"STP",s:"vlan"},
 {dom:'Network Access',q:"Which condition is required for an EtherChannel to form?",o:["Member ports share the same speed, duplex and VLAN","Each member port is given a different IP address","One member is an access port, one is a trunk","Spanning Tree is disabled on the member ports"],c:0,e:"All member ports must have consistent settings, otherwise the bundle stays down.",g:"EtherChannel",s:"vlan"},
 {dom:'Network Access',q:"A lightweight access point depends on which device to operate?",o:["A Wireless LAN Controller (WLC) via CAPWAP","A dedicated DHCP server on the same subnet","An OSPF process on the access-layer switch","A standalone Ethernet hub in the closet"],c:0,e:"Lightweight APs are centrally managed by a WLC through the CAPWAP tunnel.",g:"WLC",s:"osi"},
 {dom:'Network Access',q:"On an 802.1Q trunk, untagged traffic belongs to which VLAN?",o:["The native VLAN (default 1)","The reserved VLAN 4094","The dedicated voice VLAN","None — every frame is tagged"],c:0,e:"Untagged frames travel in the native VLAN; it must match on both ends of the trunk.",g:"Native VLAN",s:"vlan"},
 {dom:'Network Access',q:"Refer to the exhibit: 'show interfaces Gi0/1 switchport' shows Administrative Mode: dynamic auto on both switches. What will the link become?",o:["An access port (no trunk forms)","A trunk port","An EtherChannel","An error-disabled port"],c:0,e:"dynamic auto + dynamic auto never negotiates a trunk — both sides stay access.",g:"Trunk / 802.1Q",s:"vlan"},
 {dom:'Network Access',q:"Which command assigns interface Fa0/5 to VLAN 20 as an access port?",o:["switchport access vlan 20","switchport trunk vlan 20","vlan 20 access","switchport mode vlan 20"],c:0,e:"In interface config: 'switchport mode access' then 'switchport access vlan 20'.",g:"Access port",s:"vlan"},
 {dom:'Network Access',q:"A PC in VLAN 10 cannot reach a PC in VLAN 20 on the same switch. What is required?",o:["Inter-VLAN routing on a router or L3 switch","A second DHCP server for the other VLAN","Disabling Spanning Tree on the uplink","A crossover cable between the two PCs"],c:0,e:"Different VLANs are different subnets; a L3 device (router-on-a-stick or L3 switch SVIs) must route between them.",g:"Inter-VLAN routing",s:"vlan"},
 {dom:'Network Access',q:"Port security shuts a port after a violation. Which command returns it to service after clearing the cause?",o:["'shutdown' then 'no shutdown' on the interface","Clearing the switch MAC address-table","Reloading the entire switch chassis","Setting switchport port-security maximum 1"],c:0,e:"A port in err-disabled from a violation is recovered with shutdown / no shutdown (or errdisable recovery).",g:"Port security",s:"cli"},
 {dom:'Network Access',q:"Which wireless security standard is the most current and secure for a corporate WLAN?",o:["WPA3","WPA2","WEP","Open (no auth)"],c:0,e:"WPA3 is the newest and strongest; WEP is broken and must not be used.",g:"WPA2 / WPA3",s:"osi"},
 // ── 3 · IP Connectivity ───────────────────────────────────
 {dom:'IP Connectivity',q:"A router learns the same prefix via a static route (AD 1) and via OSPF (AD 110). Which is installed?",o:["The static route (lower AD)","The OSPF route (better metric)","Both, load-balanced","Neither — it is a conflict"],c:0,e:"With the same prefix length, the lower administrative distance wins: static (1) beats OSPF (110).",g:"Distanza amministrativa (AD)",s:"cli"},
 {dom:'IP Connectivity',q:"A routing table has /16, /24 and a default route to reach 172.16.10.5. Which entry is used?",o:["The /24 route (longest prefix match)","The /16 route (a shorter prefix)","The default 0.0.0.0/0 route","The route with the highest AD value"],c:0,e:"Routers always pick the most specific match — the longest prefix — regardless of AD or metric.",g:"Default route",s:"cli"},
 {dom:'IP Connectivity',q:"Which command creates a default static route via next hop 203.0.113.1?",o:["ip route 0.0.0.0 0.0.0.0 203.0.113.1","ip default-gateway 203.0.113.1","ip route default 203.0.113.1","default-information originate"],c:0,e:"'ip route 0.0.0.0 0.0.0.0 <next-hop>' sets the gateway of last resort on a router.",g:"Default route",s:"cli"},
 {dom:'IP Connectivity',q:"With no router-id configured, how does an OSPF process choose its router ID?",o:["Highest loopback IP, else highest active interface","The lowest IP among all its interfaces","The burned-in MAC address of the device","It always defaults to 0.0.0.0"],c:0,e:"OSPF prefers the highest loopback IP; without one it uses the highest active interface IP.",g:"OSPF",s:"cli"},
 {dom:'IP Connectivity',q:"An OSPF neighbor is stuck in EXSTART/EXCHANGE and never reaches FULL. What is the most likely cause?",o:["An MTU mismatch between the two interfaces","Different hostnames on the two routers","A crossover cable used on the link","Port security on the connecting switch port"],c:0,e:"Mismatched MTU stops the DBD exchange, so adjacency hangs before FULL. FULL means databases are synced.",g:"OSPF",s:"cli"},
 {dom:'IP Connectivity',q:"What is the correct wildcard mask for 192.168.4.0/24 in an OSPF network statement?",o:["0.0.0.255","255.255.255.0","0.0.255.255","0.0.0.0"],c:0,e:"The wildcard is the inverse of the mask: /24 → 0.0.0.255.",g:"Wildcard mask",s:"subnet"},
 {dom:'IP Connectivity',q:"What is the administrative distance of an internal EIGRP route?",o:["90","110","120","1"],c:0,e:"Internal EIGRP = 90; OSPF 110, RIP 120, static 1, connected 0.",g:"EIGRP",s:"cli"},
 {dom:'IP Connectivity',q:"Refer to the exhibit: 'show ip route' shows 'S* 0.0.0.0/0 [1/0] via 10.1.1.1'. What does S* mean?",o:["A static default route (gateway of last resort)","A directly connected network entry","An OSPF external type-2 (E2) route","A route learned dynamically via DHCP"],c:0,e:"'S' = static, '*' marks it as the default route / gateway of last resort.",g:"Default route",s:"cli"},
 {dom:'IP Connectivity',q:"Which two OSPF parameters must match for two routers to become neighbors?",o:["Hello/Dead timers and area ID","Router ID and hostname","Process ID and bandwidth","MAC address and duplex"],c:0,e:"Timers, area ID, subnet/mask, authentication and stub flags must match; process ID is locally significant.",g:"OSPF",s:"cli"},
 {dom:'IP Connectivity',q:"A point-to-point link between two routers is best addressed with which prefix?",o:["/30 (2 usable hosts)","/24 (254 usable hosts)","/28 (14 usable hosts)","/32 (a single host route)"],c:0,e:"A /30 gives exactly 2 usable addresses — ideal for a router-to-router link (or /31 in modern designs).",g:"VLSM",s:"subnet"},
 // ── 4 · IP Services ───────────────────────────────────────
 {dom:'IP Services',q:"A client ends up with 169.254.10.5. What happened?",o:["It got no reply from any DHCP server (APIPA)","It received a public address from the ISP","The DNS server is currently unreachable","It was manually given a valid static IP"],c:0,e:"169.254.0.0/16 is APIPA: the host self-assigns it when no DHCP server answers.",g:"APIPA",s:"subnet"},
 {dom:'IP Services',q:"Which ports does DHCP use?",o:["UDP 67 (server) and UDP 68 (client)","TCP 53 (server) and TCP 54 (client)","UDP 123 (server) and UDP 124 (client)","TCP 443 (server) and TCP 444 (client)"],c:0,e:"Server listens on UDP 67, client on UDP 68; the DORA exchange starts as a broadcast.",g:"DHCP",s:"cli"},
 {dom:'IP Services',q:"PAT distinguishes sessions from many inside hosts by using which field?",o:["Source port numbers","MAC addresses","The TTL value","The VLAN ID"],c:0,e:"PAT (NAT overload) rewrites source ports to map many private IPs onto one public IP.",g:"PAT",s:"nat"},
 {dom:'IP Services',q:"What is the purpose of NTP?",o:["Synchronize the clocks of network devices","Resolve domain names into IP addresses","Assign IP addresses to LAN clients","Filter unwanted traffic at the edge"],c:0,e:"NTP (UDP 123) keeps time consistent — vital for logs, certificates and troubleshooting.",g:"NTP",s:"cli"},
 {dom:'IP Services',q:"Hosts across the network get an IP but cannot resolve website names. Which service is failing?",o:["DNS","DHCP","NTP","NAT"],c:0,e:"If IPs work but names do not resolve, DNS (UDP/TCP 53) is the problem, not addressing.",g:"DNS",s:"cli"},
 {dom:'IP Services',q:"On a router, which command lets clients on a LAN use it as a DHCP relay toward server 10.1.1.10?",o:["ip helper-address 10.1.1.10","ip dhcp pool 10.1.1.10","ip route 10.1.1.10","service dhcp 10.1.1.10"],c:0,e:"'ip helper-address' on the client-facing interface forwards DHCP broadcasts to the remote server.",g:"DHCP",s:"cli"},
 // ── 5 · Security Fundamentals ─────────────────────────────
 {dom:'Security Fundamentals',q:"Where should an extended ACL ideally be placed?",o:["As close as possible to the source","As close as possible to the destination","Only on a loopback interface","Placement does not matter"],c:0,e:"Extended ACLs go near the source (drop early); standard ACLs go near the destination.",g:"ACL",s:"acl"},
 {dom:'Security Fundamentals',q:"What does 'switchport port-security mac-address sticky' do?",o:["Learns the allowed MAC and saves it to the config","Blocks every port on the entire switch","Encrypts all traffic crossing that port","Creates a brand-new VLAN for the port"],c:0,e:"'sticky' learns the MAC and writes it into the running-config so it survives as a static entry.",g:"Port security",s:"cli"},
 {dom:'Security Fundamentals',q:"Why choose SSH over Telnet for device management?",o:["SSH encrypts the session; Telnet is clear text","SSH is significantly faster than Telnet","Telnet does not support IPv4 addresses","SSH requires no authentication at all"],c:0,e:"SSH (TCP 22) encrypts everything; Telnet (TCP 23) exposes commands and credentials in clear text.",g:"SSH",s:"cli"},
 {dom:'Security Fundamentals',q:"Which command stores the privileged-EXEC password as a strong hash?",o:["enable secret","enable password","service tcp-keepalives","username admin nopassword"],c:0,e:"'enable secret' stores a hash; 'enable password' is weak and reversible.",g:"SSH",s:"cli"},
 {dom:'Security Fundamentals',q:"DHCP snooping protects the network against what?",o:["Rogue (unauthorized) DHCP servers","Layer 2 switching loops on trunks","OSPF routing table corruption","Router control-plane CPU overload"],c:0,e:"DHCP snooping drops DHCP server replies arriving on untrusted ports, blocking rogue servers.",g:"DHCP",s:"cli"},
 {dom:'Security Fundamentals',q:"Which two AAA server protocols are most common on Cisco networks?",o:["RADIUS and TACACS+","HTTP and HTTPS","OSPF and EIGRP","STP and VTP"],c:0,e:"RADIUS (open standard) and TACACS+ (Cisco, encrypts the whole packet) are the typical AAA protocols.",g:"AAA",s:"cli"},
 {dom:'Security Fundamentals',q:"Refer to the config: 'access-list 101 permit tcp any any eq 22' then 'deny ip any any'. What traffic is allowed?",o:["Only SSH (TCP 22)","All TCP traffic","Only ICMP","Everything except SSH"],c:0,e:"The first line permits only TCP/22 (SSH); the explicit deny drops the rest.",g:"ACL",s:"acl"},
 {dom:'Security Fundamentals',q:"What is the effect of the invisible statement at the end of every ACL?",o:["An implicit 'deny any' drops unmatched traffic","An implicit 'permit any' allows what is unmatched","It logs every packet that is evaluated","It has no practical effect on traffic"],c:0,e:"Every ACL ends with an implicit 'deny any', so you must permit the traffic you need.",g:"ACL",s:"acl"},
 // ── 6 · Automation & Programmability ──────────────────────
 {dom:'Automation & Programmability',q:"In a REST API, which HTTP method retrieves data without changing it?",o:["GET","POST","PUT","DELETE"],c:0,e:"GET reads; POST creates, PUT/PATCH update, DELETE removes.",g:"REST API",s:"osi"},
 {dom:'Automation & Programmability',q:"Which data format uses key/value pairs inside braces and is common in REST APIs?",o:["JSON","CSV","Plain text","Binary"],c:0,e:"JSON uses {\"key\":\"value\"} and is the typical payload format for REST APIs.",g:"REST API",s:"osi"},
 {dom:'Automation & Programmability',q:"In SDN, the controller programs the switches (data plane) through which interface?",o:["The southbound API","The northbound API","The RJ-45 console","SNMP traps"],c:0,e:"Southbound APIs (OpenFlow/NETCONF) talk to devices; northbound APIs face applications.",g:"SDN",s:"osi"},
 {dom:'Automation & Programmability',q:"Which configuration-management tool is agentless and uses YAML playbooks over SSH?",o:["Ansible","Puppet","Chef","SNMP"],c:0,e:"Ansible is agentless, pushing YAML playbooks over SSH; Puppet and Chef use agents.",g:"SDN",s:"osi"},
 {dom:'Automation & Programmability',q:"What benefit does SDN's separation of control and data plane provide?",o:["Centralized, programmable network control","Faster physical cabling in the racks","More broadcast domains per access switch","Automatic subnetting of the address space"],c:0,e:"Centralizing the control plane lets a controller program many devices consistently via APIs.",g:"SDN",s:"osi"}
];
// Pesi per un esame da 30 domande, allineati al blueprint 200-301.
const EXAM_WEIGHTS={'Network Fundamentals':6,'Network Access':6,'IP Connectivity':7,'IP Services':3,'Security Fundamentals':5,'Automation & Programmability':3};
function examQuestionsByDomain(){
  // Solo il banco dedicato (in inglese), deduplicato per testo: niente più
  // mescolanza con le domande di allenamento → nessuna domanda ripetuta.
  const map={};const seen={};
  for(const d in EXAM_WEIGHTS)map[d]=[];
  EXAM_BANK.forEach(q=>{if(map[q.dom]&&!seen[q.q]){seen[q.q]=1;map[q.dom].push(q);}});
  return map;
}
function buildExamPool(){
  const by=examQuestionsByDomain();let pool=[];
  for(const d in EXAM_WEIGHTS){pool=pool.concat(qShuffle((by[d]||[]).slice()).slice(0,EXAM_WEIGHTS[d]));}
  // Dedup finale di sicurezza: mai la stessa domanda due volte nel pool.
  const seen={};pool=pool.filter(q=>seen[q.q]?false:(seen[q.q]=1));
  return qShuffle(pool);
}
function startExam(){
  const pool=buildExamPool();
  quizState={source:'exam',topic:'Simulazione CCNA 200-301',mode:'exam',cfg:MODE_CFG.exam,pool,total:Math.min(30,pool.length)||1,cur:0,results:[],xpEarned:0,timer:null,timeLeft:MODE_CFG.exam.t,answered:false,labKey:null};
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  _id('view-quiz').classList.add('active');_id('nb-quiz').classList.add('active');
  _id('quiz-menu').style.display='none';_id('quiz-active').style.display='block';_id('quiz-result').style.display='none';
  buildDots();loadQuestion();
}
function showQuizResult(){
  clearInterval(quizState.timer);
  _id('quiz-active').style.display='none';_id('quiz-result').style.display='block';
  const ok=quizState.results.filter(r=>r.ok).length;
  const tot=quizState.results.length;
  const pct=Math.round(ok/tot*100);
  _id('res-pct').textContent=pct+'%';
  _id('res-ok').textContent=ok;_id('res-ko').textContent=tot-ok;_id('res-xp').textContent=quizState.xpEarned;
  let grade,col;
  if(pct>=90){grade='🏆 ECCELLENTE';col='var(--orange)';}
  else if(pct>=75){grade='✅ PROMOSSO';col='var(--green)';}
  else if(pct>=60){grade='⚠️ BORDERLINE';col='var(--accent)';}
  else{grade='❌ RIPASSA';col='var(--red)';}
  const ge=_id('res-grade');ge.textContent=grade;ge.style.color=col;ge.style.background=col+'22';
  _id('res-pct').style.color=col;
  renderDomainScores();
  renderReviewList();
  // completa il modulo se superato
  if(quizState.source==='module'&&pct>=70&&quizState.moduleId){completeModule(quizState.moduleId);}
  // mostra il lab interattivo abbinato (se presente)
  const lb=_id('res-lab-btn');
  if(lb){
    if(quizState.labKey){lb.style.display='';lb.onclick=()=>openModuleLab(quizState.labKey);}
    else{lb.style.display='none';}
  }
}

// ══════════════════════════════════════
// REVISIONE POST-ESAME · approfondisci ogni risposta (giusta o sbagliata)
//   con spiegazione, glossario e schema collegati. Tutto in un overlay:
//   il resoconto resta sotto, quindi si torna sempre alla schermata risultati.
// ══════════════════════════════════════
let _reviewCur=null,reviewGloss=null,reviewSchemaOpen=false;
function escH(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function glossTermForResult(r){
  if(r.gloss){const g=GLOSSARY.find(x=>x.t===r.gloss);if(g)return g;}
  return glossForQuestion(r.q,moduleOfQuestion(r.q))||null;
}
function schemaIdForResult(r){return r.schema&&SCHEMAS[r.schema]?r.schema:null;}
// Costruisce la lista "Rivedi le risposte" sotto il resoconto.
function renderReviewList(){
  const box=_id('res-review');if(!box)return;
  const rs=quizState.results||[];
  if(!rs.length){box.innerHTML='';return;}
  let h='<div class="sec-title" style="margin:26px 0 4px">Rivedi le risposte</div>'+
    '<div class="review-hint">Tocca una domanda per approfondirla: risposta corretta, spiegazione, glossario e schema collegati. Puoi sempre tornare al resoconto.</div>'+
    '<div class="review-list">';
  rs.forEach((r,i)=>{
    const icon=r.ok?'<span class="rv-ic ok">✓</span>':'<span class="rv-ic ko">✗</span>';
    h+='<button class="review-item '+(r.ok?'ok':'ko')+'" onclick="openExamReview('+i+')">'+icon+
       '<span class="rv-q">'+escH(r.q)+'</span><span class="rvw-arrow">›</span></button>';
  });
  h+='</div>';
  box.innerHTML=h;
}
function openExamReview(i){
  const r=(quizState.results||[])[i];if(!r)return;
  _reviewCur=r;reviewGloss=glossTermForResult(r);reviewSchemaOpen=false;
  renderReviewDetail();
  _id('review-modal').classList.add('show');
}
function swapReviewGloss(term){const g=GLOSSARY.find(x=>x.t===term);if(g){reviewGloss=g;renderReviewDetail();}}
function toggleReviewSchema(){reviewSchemaOpen=!reviewSchemaOpen;renderReviewDetail();}
function closeExamReview(){_id('review-modal').classList.remove('show');}
function renderReviewDetail(){
  const r=_reviewCur;if(!r)return;
  const body=_id('review-modal-body');const L=['A','B','C','D','E','F'];
  let h='<div class="rv-dom">'+escH(r.dom||'')+(r.ok?'<span class="rv-tag ok">Corretta</span>':'<span class="rv-tag ko">Errata</span>')+'</div>';
  h+='<div class="rv-detail-q">'+escH(r.q)+'</div><div class="rv-opts">';
  (r.opts||[]).forEach((o,idx)=>{
    const isC=idx===r.correct,isU=idx===r.chosen;
    let cls='rv-opt'+(isC?' correct':'')+(isU&&!isC?' wrong':'');
    let badge='';
    if(isC)badge='<span class="rv-badge ok">'+(isU?'La tua risposta ✓':'Corretta')+'</span>';
    else if(isU)badge='<span class="rv-badge ko">La tua risposta</span>';
    h+='<div class="'+cls+'"><span class="rv-opt-l">'+L[idx]+'</span><span class="rv-opt-t">'+escH(o)+'</span>'+badge+'</div>';
  });
  if(r.chosen===-1)h+='<div class="rv-timeout">⏱ Tempo scaduto — nessuna risposta data</div>';
  h+='</div>';
  h+='<div class="gloss-sec-h">Spiegazione</div><div class="gloss-detail-def">'+escH(r.exp||'')+'</div>';
  // ── Glossario collegato ──
  const g=reviewGloss;
  if(g){
    const x=GLOSS_MORE[g.t]||{};const dg=x.diag&&DIAGRAM[x.diag];
    h+='<div class="rv-sec"><div class="gloss-sec-h">🔎 Glossario · '+escH(g.t)+'</div>';
    h+='<div class="gloss-detail-def">'+escH(g.d)+'</div>';
    if(x.more)h+='<div class="gloss-detail-more" style="margin-top:8px">'+x.more+'</div>';
    if(dg)h+='<div class="brief-diagram" style="margin-top:12px">'+dg.svg+(dg.cap?'<div class="diag-cap">'+dg.cap+'</div>':'')+'</div>';
    const rel=GLOSSARY.filter(o=>o.t!==g.t&&(GLOSS_MORE[o.t]||{}).diag&&(GLOSS_MORE[o.t]||{}).diag===x.diag).slice(0,5);
    if(rel.length){h+='<div class="gloss-sec-h" style="margin-top:12px">↔ Termini collegati</div><div class="gloss-rel">';
      rel.forEach(o=>{h+='<button class="gloss-rel-chip" onclick="swapReviewGloss(\''+o.t.replace(/'/g,"\\'")+'\')">'+escH(o.t)+'</button>';});
      h+='</div>';}
    h+='</div>';
  }
  // ── Schema collegato ──
  const sid=schemaIdForResult(r);
  if(sid){
    h+='<div class="rv-sec"><div class="gloss-sec-h">📐 Schema collegato</div>';
    h+='<button class="review-schema-btn" onclick="toggleReviewSchema()">'+(reviewSchemaOpen?'▾ Nascondi ':'▸ Mostra ')+escH(SCHEMA_LABEL[sid]||sid)+'</button>';
    if(reviewSchemaOpen)h+='<div class="rvw-schema-card">'+SCHEMAS[sid]+'</div>';
    h+='</div>';
  }
  body.innerHTML=h;
  makeTablesResponsive(body);
}

// ══════════════════════════════════════
// LAB
// ══════════════════════════════════════
function selLabTab(name,btn){
  document.querySelectorAll('.lab-content').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.lab-tab').forEach(x=>x.classList.remove('sel'));
  _id('lab-'+name).classList.add('active');
  if(btn) btn.classList.add('sel');
  else{document.querySelectorAll('.lab-tab').forEach(b=>{if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+name+"'"))b.classList.add('sel');});}
}

// ── OSI DRAG ──
const OSI_PROTS=[
  {name:'HTTP',hint:'Protocollo web',layer:7,explain:'HTTP è al Layer 7 (Application). Porta 80, gestisce comunicazione browser↔server.'},
  {name:'FTP',hint:'Trasferimento file',layer:7,explain:'FTP è al Layer 7. Usa TCP porte 20/21 per trasferire file.'},
  {name:'DNS',hint:'Risoluzione nomi',layer:7,explain:'DNS è al Layer 7, traduce nomi di dominio in IP. UDP porta 53.'},
  {name:'SMTP',hint:'Invio email',layer:7,explain:'SMTP è al Layer 7. Porta 25 per invio email tra server.'},
  {name:'SSL/TLS',hint:'Cifratura',layer:6,explain:'SSL/TLS opera al Layer 6 (Presentation), gestisce cifratura e compressione.'},
  {name:'JPEG/GIF',hint:'Formato immagini',layer:6,explain:'I formati immagini come JPEG e GIF sono gestiti al Layer 6 (Presentation).'},
  {name:'TCP',hint:'Trasporto affidabile',layer:4,explain:'TCP è al Layer 4 (Transport). Garantisce consegna con numeri di sequenza e ACK.'},
  {name:'UDP',hint:'Trasporto veloce',layer:4,explain:'UDP è al Layer 4 (Transport). Più veloce di TCP, nessuna garanzia di consegna.'},
  {name:'IP',hint:'Indirizzamento logico',layer:3,explain:'IP è al Layer 3 (Network). Gestisce indirizzamento logico e routing tra reti.'},
  {name:'ICMP',hint:'Ping e traceroute',layer:3,explain:'ICMP è al Layer 3. Usato per diagnostica (ping, traceroute) e messaggi di errore.'},
  {name:'OSPF',hint:'Routing dinamico',layer:3,explain:'OSPF è al Layer 3. Protocollo di routing link-state con algoritmo Dijkstra.'},
  {name:'Ethernet',hint:'Rete locale',layer:2,explain:'Ethernet è al Layer 2 (Data Link). Usa indirizzi MAC per consegna nella LAN.'},
  {name:'MAC Address',hint:'Indirizzo fisico',layer:2,explain:'I MAC address sono al Layer 2. Identificatori fisici a 48 bit scritti sull\'hardware.'},
  {name:'Wi-Fi 802.11',hint:'Wireless LAN',layer:2,explain:'Wi-Fi 802.11 opera al Layer 2 (Data Link) con elementi fisici al Layer 1.'},
  {name:'Cavo UTP',hint:'Mezzo fisico',layer:1,explain:'I cavi UTP sono al Layer 1 (Physical). Trasmettono bit come segnali elettrici.'},
  {name:'Fibra ottica',hint:'Segnale luminoso',layer:1,explain:'La fibra ottica è al Layer 1. Trasmette bit come impulsi di luce.'},
];
const LAYER_NAMES={7:'Application',6:'Presentation',5:'Session',4:'Transport',3:'Network',2:'Data Link',1:'Physical'};
const LAYER_COLORS={7:'#fca5a5',6:'#fcd34d',5:'#fde047',4:'#6ee7b7',3:'#67e8f9',2:'#93c5fd',1:'#c4b5fd'};
let osiProts=[...OSI_PROTS],osiIdx=0,osiOk=0,osiStreak=0,osiAnswered=false;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function initOsi(){
  shuffle(osiProts);osiIdx=0;osiOk=0;osiStreak=0;
  // build stack
  const stack=_id('osi-stack');stack.innerHTML='';
  [7,6,5,4,3,2,1].forEach(l=>{
    const d=document.createElement('div');
    d.style.cssText='background:rgba('+hexToRgb(LAYER_COLORS[l])+',.1);border:1px solid rgba('+hexToRgb(LAYER_COLORS[l])+',.3);border-radius:6px;padding:9px 13px;margin-bottom:5px;display:flex;align-items:center;gap:10px;font-size:.8rem;font-weight:600;color:'+LAYER_COLORS[l]+';transition:all .2s';
    d.id='osi-layer-'+l;
    const pdu={7:'Data',6:'Data',5:'Data',4:'Segment',3:'Packet',2:'Frame',1:'Bits'}[l];
    d.innerHTML='<span style="font-family:JetBrains Mono,monospace;font-size:.62rem;opacity:.6;min-width:14px">'+l+'</span><span style="flex:1">'+LAYER_NAMES[l]+'</span><span style="font-family:JetBrains Mono,monospace;font-size:.6rem;opacity:.6;background:rgba(0,0,0,.3);padding:2px 6px;border-radius:3px">'+pdu+'</span>';
    stack.appendChild(d);
  });
  renderOsiProt();
}
function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return r+','+g+','+b;}
function renderOsiProt(){
  osiAnswered=false;
  document.querySelectorAll('[id^="osi-layer-"]').forEach(l=>l.style.transform='scaleX(1)');
  const p=osiProts[osiIdx%osiProts.length];
  _id('prot-name').textContent=p.name;_id('prot-hint').textContent=p.hint;
  _id('osi-fb').classList.remove('show','ok','ko');
  _id('osi-expl').classList.remove('show');_id('osi-next').classList.remove('show');
  const choices=new Set([p.layer]);
  while(choices.size<4) choices.add(Math.floor(Math.random()*7)+1);
  const arr=shuffle([...choices]);
  const grid=_id('osi-choices');grid.innerHTML='';
  arr.forEach(l=>{
    const b=document.createElement('button');
    b.style.cssText='padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--panel);color:var(--text);cursor:pointer;font-size:.8rem;font-weight:600;transition:all .15s;font-family:DM Sans,sans-serif;width:100%';
    b.textContent='L'+l+' — '+LAYER_NAMES[l];
    b.onmouseover=()=>{if(!osiAnswered)b.style.borderColor='var(--accent)';};
    b.onmouseout=()=>{if(!osiAnswered)b.style.borderColor='var(--border)';};
    b.onclick=()=>{if(!osiAnswered)checkOsi(l,p,b);};
    grid.appendChild(b);
  });
  _id('osi-ok').textContent=osiOk;_id('osi-streak').textContent=osiStreak;
}
function checkOsi(chosen,prot,btn){
  osiAnswered=true;const ok=chosen===prot.layer;
  _id('osi-choices').querySelectorAll('button').forEach(b=>{
    b.onclick=null;const l=parseInt(b.textContent.match(/L(\d)/)[1]);
    if(l===prot.layer){b.style.background='rgba(16,185,129,.15)';b.style.borderColor='var(--green)';b.style.color='var(--green)';}
  });
  if(!ok){btn.style.background='rgba(239,68,68,.15)';btn.style.borderColor='var(--red)';btn.style.color='var(--red)';}
  const layerEl=_id('osi-layer-'+prot.layer);
  if(layerEl) layerEl.style.transform='scaleX(1.03)';
  const fb=_id('osi-fb');
  fb.className='fb-strip show '+(ok?'ok':'ko');
  fb.textContent=ok?'✓ Corretto! '+prot.name+' è al Layer '+prot.layer+' — '+LAYER_NAMES[prot.layer]:'✗ '+prot.name+' è al Layer '+prot.layer+' — '+LAYER_NAMES[prot.layer];
  _id('osi-expl').textContent=prot.explain;_id('osi-expl').classList.add('show');
  _id('osi-next').classList.add('show');
  if(ok){osiOk++;osiStreak++;addXP(10);}
  else{osiStreak=0;}
  _id('osi-ok').textContent=osiOk;_id('osi-streak').textContent=osiStreak;
  if(osiOk>=5&&!G.modules['osi_mod'].completed) completeModule('osi_mod');
}
function nextProtocol(){osiIdx++;renderOsiProt();}

// ── SUBNET ──
let curSubnet=null,subTimerInt=null,subElapsed=0;
function initSubnet(){newSubnet();}
function newSubnet(){
  clearInterval(subTimerInt);subElapsed=0;
  _id('sub-fb').classList.remove('show','ok','ko');_id('sub-next').classList.remove('show');
  ['mask','net','bcast','first','last','hosts'].forEach(f=>{
    const el=_id('sf-'+f);el.value='';el.className='field-inp';_id('fc-'+f).textContent='';
  });
  const pools=[[10,0],[172,16],[192,168]];
  const [o1,o2]=pools[Math.floor(Math.random()*3)];
  const o3=Math.floor(Math.random()*254);
  const ip=o1+'.'+o2+'.'+o3+'.0';
  const cidrs=[8,16,20,24,25,26,27,28];
  const cidr=cidrs[Math.floor(Math.random()*cidrs.length)];
  curSubnet=calcSubnet(ip,cidr);
  _id('sub-ip').textContent=ip;_id('sub-cidr').textContent='/'+cidr;
  renderBits(ip,cidr);
  subTimerInt=setInterval(()=>{subElapsed++;},1000);
}
function cidrToMask(c){const m=[];for(let i=0;i<4;i++){const b=Math.min(8,Math.max(0,c-i*8));m.push(256-Math.pow(2,8-b));}return m.join('.');}
function calcSubnet(ip,cidr){
  const p=ip.split('.').map(Number);const mp=cidrToMask(cidr).split('.').map(Number);
  const net=p.map((o,i)=>o&mp[i]);const bcast=net.map((o,i)=>o|(~mp[i]&0xFF));
  const first=[...net];first[3]++;const last=[...bcast];last[3]--;
  return{ip,cidr,mask:cidrToMask(cidr),network:net.join('.'),broadcast:bcast.join('.'),
    first:cidr>=31?net.join('.'):first.join('.'),last:cidr>=31?bcast.join('.'):last.join('.'),
    hosts:Math.max(0,Math.pow(2,32-cidr)-2)};
}
function renderBits(ip,cidr){
  const parts=ip.split('.').map(Number);let html='';
  parts.forEach((oct,i)=>{
    oct.toString(2).padStart(8,'0').split('').forEach((b,j)=>{
      const abs=i*8+j;html+='<span class="'+(abs<cidr?'bn':'bh')+'">'+b+'</span>';
    });
    if(i<3) html+='<span class="bs">.</span>';
  });
  _id('bits-disp').innerHTML=html;
  const s=calcSubnet(ip,cidr);
  _id('sub-info').innerHTML=
    '<span style="color:var(--muted)">Mask:</span> <span style="color:var(--cyan)">'+s.mask+'</span><br>'+
    '<span style="color:var(--muted)">Network:</span> <span style="color:var(--accent)">'+s.network+'/'+cidr+'</span><br>'+
    '<span style="color:var(--muted)">Host disponibili:</span> <span style="color:var(--green)">'+s.hosts+'</span>';
}
function checkSubnet(){
  clearInterval(subTimerInt);const s=curSubnet;
  const checks=[['mask',s.mask],['net',s.network],['bcast',s.broadcast],['first',s.first],['last',s.last],['hosts',String(s.hosts)]];
  let allOk=true;
  checks.forEach(([f,correct])=>{
    const val=_id('sf-'+f).value.trim();const ok=val===correct;
    if(!ok){allOk=false;_id('sf-'+f).placeholder=correct;}
    _id('sf-'+f).className='field-inp '+(ok?'ok':'ko');
    _id('fc-'+f).textContent=ok?'✓':'✗';
  });
  const fb=_id('sub-fb');
  if(allOk){
    const pts=Math.max(20,100-subElapsed);
    fb.className='fb-strip show ok';fb.textContent='✓ Perfetto! +'+pts+' pts ('+subElapsed+'s)';
    addXP(pts);
    if(!G.modules['subnetting'].completed) completeModule('subnetting');
  } else {
    fb.className='fb-strip show ko';fb.textContent='✗ Alcuni valori errati — vedi in rosso. Placeholder = risposta corretta.';
  }
  _id('sub-next').classList.add('show');
}

// ── CLI ──
const CLI_MISSIONS=[
  {title:'Missione 1',desc:'Entra in modalità privilegiata poi imposta l\'hostname "R1-LAB".',hints:['enable','configure terminal','hostname R1-LAB'],check:s=>s.hostname==='R1-LAB'},
  {title:'Missione 2',desc:'Configura password "cisco123" sulla console (line console 0, password cisco123, login).',hints:['enable','configure terminal','line console 0','password cisco123','login'],check:s=>s.conPass==='cisco123'},
  {title:'Missione 3',desc:'Assegna IP 192.168.1.1/24 a GigabitEthernet0/0 e attivala (no shutdown).',hints:['enable','configure terminal','interface GigabitEthernet0/0','ip address 192.168.1.1 255.255.255.0','no shutdown'],check:s=>s.g00ip==='192.168.1.1'},
];
let cliSt={mode:'user',hostname:'Router',conPass:null,g00ip:null,curLine:null,curIface:null};
let cliMissionIdx=0;
function initCli(){
  cliSt={mode:'user',hostname:'Router',conPass:null,g00ip:null,curLine:null,curIface:null};
  cliMissionIdx=0;
  _id('cli-out').innerHTML='';
  cliPrint('i','████████████████████████\n  Cisco IOS — Simulator\n  CCNA Quest v1.0\n████████████████████████');
  cliPrint('o','');
  cliPromptUpdate();loadCliMission(0);
  const inp=_id('cli-inp');
  inp.onkeydown=e=>{if(e.key==='Enter'&&inp.value.trim()){cliRun(inp.value.trim());inp.value='';}};
}
function cliPrint(type,text){
  const out=_id('cli-out');
  text.split('\n').forEach(line=>{
    const d=document.createElement('div');d.className='cl cl-'+type;d.textContent=line;out.appendChild(d);
  });
  out.scrollTop=out.scrollHeight;
}
function cliPromptUpdate(){
  const h=cliSt.hostname;
  const p={user:h+'>',privileged:h+'#',config:h+'(config)#','config-if':h+'(config-if)#','config-line':h+'(config-line)#'}[cliSt.mode]||h+'>';
  _id('cli-ps').textContent=p;
}
function cliRun(raw){
  const cmd=raw.toLowerCase().trim();
  cliPrint('p',_id('cli-ps').textContent+' '+raw);
  if(cmd==='exit'||cmd==='end'){
    if(['config-if','config-line'].includes(cliSt.mode)){cliSt.mode='config';cliSt.curLine=null;}
    else if(cliSt.mode==='config'){cliSt.mode='privileged';}
    else if(cliSt.mode==='privileged'){cliSt.mode='user';}
    cliPromptUpdate();return;
  }
  if(cmd==='enable'&&cliSt.mode==='user'){cliSt.mode='privileged';cliPromptUpdate();return;}
  if((cmd==='configure terminal'||cmd==='conf t')&&cliSt.mode==='privileged'){
    cliSt.mode='config';cliPrint('o','Enter configuration commands. End with CNTL/Z.');cliPromptUpdate();return;
  }
  if(cliSt.mode==='config'){
    if(cmd.startsWith('hostname ')){cliSt.hostname=raw.substring(9).trim();cliPromptUpdate();cliCheckMission();return;}
    if(cmd.match(/^int(erface)?\s+/i)){cliSt.mode='config-if';cliSt.curIface=raw.replace(/^int(erface)?\s+/i,'').trim().toLowerCase();cliPromptUpdate();return;}
    if(cmd.startsWith('line ')){cliSt.mode='config-line';cliSt.curLine=raw.split(' ').slice(1).join(' ');cliPromptUpdate();return;}
    if(cmd.startsWith('ip route ')){cliPrint('s','% Static route configured.');cliCheckMission();return;}
  }
  if(cliSt.mode==='config-line'){
    if(cmd.startsWith('password ')){if(cliSt.curLine==='console 0')cliSt.conPass=raw.substring(9).trim();cliCheckMission();return;}
    if(cmd==='login') return;
  }
  if(cliSt.mode==='config-if'){
    if(cmd.startsWith('ip address ')){
      const pts=raw.split(' ');if(cliSt.curIface&&(cliSt.curIface.includes('gig')||cliSt.curIface.includes('g0')))cliSt.g00ip=pts[2];
      cliCheckMission();return;
    }
    if(cmd==='no shutdown'||cmd==='no shut'){
      cliPrint('i','%LINK-5-CHANGED: Interface '+cliSt.curIface+', changed state to up');
      cliPrint('i','%LINEPROTO-5-UPDOWN: Line protocol on '+cliSt.curIface+', changed state to up');
      cliCheckMission();return;
    }
  }
  if(cliSt.mode==='privileged'){
    if(cmd==='show running-config'||cmd==='sh run'){
      cliPrint('o','!\nhostname '+cliSt.hostname);
      if(cliSt.g00ip)cliPrint('o','!\ninterface GigabitEthernet0/0\n ip address '+cliSt.g00ip+' 255.255.255.0\n no shutdown');
      cliPrint('o','!\nend');return;
    }
    if(cmd==='show ip interface brief'||cmd==='sh ip int br'){
      cliPrint('o','Interface              IP-Address      OK? Status');
      cliPrint('o','GigabitEthernet0/0     '+(cliSt.g00ip||'unassigned')+'   YES '+(cliSt.g00ip?'up':'down'));return;
    }
  }
  if(cmd==='cls'||cmd==='clear'){_id('cli-out').innerHTML='';return;}
  cliPrint('e','% Unknown command: "'+raw+'"');
  cliPrint('c','  Hint: controlla la modalità corrente e la sintassi.');
}
function cliCheckMission(){
  const m=CLI_MISSIONS[cliMissionIdx];
  if(m&&m.check(cliSt)){
    cliPrint('s','\n✓ MISSIONE '+( cliMissionIdx+1)+' COMPLETATA! +50 XP\n');
    addXP(50);
    const fb=_id('cli-fb');fb.className='fb-strip show ok';fb.textContent='✓ Missione '+(cliMissionIdx+1)+' completata!';
    if(cliMissionIdx<CLI_MISSIONS.length-1){setTimeout(()=>loadCliMission(cliMissionIdx+1),1200);}
    else{if(!G.modules['routing_s'].completed)completeModule('routing_s');}
  }
}
function loadCliMission(idx){
  cliMissionIdx=idx;const m=CLI_MISSIONS[idx];if(!m) return;
  _id('cli-mission').innerHTML='<strong>'+m.title+':</strong> '+m.desc+
    '<div class="hint-row">'+m.hints.map(h=>'<span class="hint-chip" onclick="cliHint(\''+h+'\')">'+h+'</span>').join('')+'</div>';
}
function cliHint(cmd){_id('cli-inp').value=cmd;_id('cli-inp').focus();}

// ── PACKET SIM ──
const PKT_STEPS=[
  {label:'PC crea il pacchetto',detail:'L\'app genera dati. TCP/IP incapsula: header IP (src/dst), header TCP con porte, frame Ethernet con MAC del gateway.'},
  {label:'Switch riceve il frame',detail:'Lo switch legge il MAC di destinazione. Cerca nella CAM table. Se non trovato: flooding su tutte le porte tranne quella di ingresso.'},
  {label:'Router elabora il pacchetto',detail:'Il router decapsula fino al Layer 3, legge l\'IP destinazione, consulta la routing table per il next-hop. TTL−1.'},
  {label:'Routing verso Internet',detail:'Il router trova una default route. Crea nuovo frame Ethernet col MAC del provider. Il pacchetto continua verso il server.'},
  {label:'Server riceve e risponde',detail:'Il server risale tutti i layer OSI dal fisico all\'applicazione. I dati arrivano all\'app. Risposta in senso inverso.'},
];
let pktRunning=false;
function initPacket(){buildPktSteps();}
function buildPktSteps(){
  const el=_id('pkt-steps');el.innerHTML='';
  PKT_STEPS.forEach((s,i)=>{
    const d=document.createElement('div');d.className='pkt-step';d.id='ps-'+i;
    d.innerHTML='<div class="step-n">'+(i+1)+'</div><div><div style="font-weight:600;margin-bottom:2px;font-size:.82rem">'+s.label+'</div><div style="font-size:.75rem;color:var(--muted)">'+s.detail+'</div></div>';
    el.appendChild(d);
  });
}
function startPacket(){
  if(pktRunning) return;pktRunning=true;resetPacket(true);
  const devs=['dev-pc','dev-sw','dev-rt','dev-srv'];
  const pkts=['pkt0','pkt1','pkt2'];
  let phase=0;
  const run=()=>{
    if(phase>=5){pktRunning=false;addXP(20);if(!G.modules['osi_mod'].completed)completeModule('osi_mod');return;}
    document.querySelectorAll('.pkt-step').forEach(x=>{x.classList.remove('cur');});
    const step=_id('ps-'+phase);if(step)step.classList.add('cur');
    if(phase<devs.length){
      _id(devs[phase]).classList.add(phase>0?'recv':'active');
      if(phase>0&&pkts[phase-1]){
        const p=_id(pkts[phase-1]);if(p){p.classList.remove('go');void p.offsetWidth;p.classList.add('go');}
      }
    }
    setTimeout(()=>{
      if(step){step.classList.remove('cur');step.classList.add('done');}
      phase++;setTimeout(run,200);
    },1600);
  };run();
}
function resetPacket(keepSteps){
  pktRunning=false;
  ['dev-pc','dev-sw','dev-rt','dev-srv'].forEach(d=>{const el=_id(d);if(el)el.className='dev-ico';});
  ['pkt0','pkt1','pkt2'].forEach(p=>{const el=_id(p);if(el)el.className='pkt-dot';});
  if(!keepSteps)buildPktSteps();
}

// ── VLAN ──
const VLAN_DEVS=[
  {name:'PC Vendite 1',vlan:10,icon:'💼'},{name:'PC Vendite 2',vlan:10,icon:'💼'},
  {name:'Server IT',vlan:20,icon:'🖥️'},{name:'PC Admin IT',vlan:20,icon:'⚙️'},
  {name:'Router Mgmt',vlan:30,icon:'📡'},{name:'SW Mgmt',vlan:30,icon:'🔀'},
];
const VLAN_PORTS=[
  {port:'Fa0/1',vlan:10},{port:'Fa0/2',vlan:10},
  {port:'Fa0/3',vlan:20},{port:'Fa0/4',vlan:20},
  {port:'Fa0/5',vlan:30},{port:'Fa0/6',vlan:30},
];
const VCOLS={10:'var(--red)',20:'var(--green)',30:'var(--orange)'};
const VNAMES={10:'Sales',20:'IT',30:'Mgmt'};
let vlanCorrect=0;
function initVlan(){
  vlanCorrect=0;
  _id('vlan-fb').classList.remove('show','ok','ko');
  _id('vlan-next').classList.remove('show');
  const devPool=_id('vlan-devs');const portPool=_id('vlan-ports');
  devPool.innerHTML='';portPool.innerHTML='';
  shuffle([...VLAN_DEVS]).forEach(dev=>{
    const item=document.createElement('div');item.className='drag-item';
    item.draggable=true;item.dataset.vlan=dev.vlan;item.dataset.name=dev.name;
    item.innerHTML=dev.icon+' '+dev.name+' <span style="margin-left:auto;font-family:JetBrains Mono,monospace;font-size:.6rem;padding:2px 6px;border-radius:3px;background:rgba(0,0,0,.3);color:'+VCOLS[dev.vlan]+'">V'+dev.vlan+'</span>';
    item.addEventListener('dragstart',e=>{e.dataTransfer.setData('vlan',dev.vlan);e.dataTransfer.setData('name',dev.name);item.classList.add('dragging');});
    item.addEventListener('dragend',()=>item.classList.remove('dragging'));
    devPool.appendChild(item);
  });
  VLAN_PORTS.forEach(p=>{
    const zone=document.createElement('div');zone.className='drop-zone';
    zone.dataset.vlan=p.vlan;zone.dataset.port=p.port;
    zone.innerHTML='<span class="zone-lbl" style="color:'+VCOLS[p.vlan]+'">'+p.port+' <small style="font-size:.56rem;display:block;color:var(--muted)">VLAN '+p.vlan+' '+VNAMES[p.vlan]+'</small></span><div class="zone-content"><span class="zone-ph">Trascina qui…</span></div>';
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
    zone.addEventListener('drop',e=>{
      e.preventDefault();zone.classList.remove('over');
      if(zone.querySelector('.drag-item')) return;
      const vlan=parseInt(e.dataTransfer.getData('vlan'));
      const name=e.dataTransfer.getData('name');
      const src=devPool.querySelector('[data-name="'+name+'"]');if(!src) return;
      const ok=vlan===parseInt(zone.dataset.vlan);
      const content=zone.querySelector('.zone-content');content.innerHTML='';
      const placed=src.cloneNode(true);placed.draggable=false;content.appendChild(placed);
      src.remove();
      zone.classList.add(ok?'ok-zone':'ko-zone');placed.classList.add(ok?'ok-item':'ko-item');
      if(!ok){
        setTimeout(()=>{
          zone.classList.remove('ko-zone');content.innerHTML='<span class="zone-ph">Trascina qui…</span>';
          const ri=document.createElement('div');ri.className='drag-item';ri.draggable=true;
          ri.dataset.vlan=vlan;ri.dataset.name=name;ri.textContent=name;
          ri.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('vlan',vlan);ev.dataTransfer.setData('name',name);ri.classList.add('dragging');});
          ri.addEventListener('dragend',()=>ri.classList.remove('dragging'));
          devPool.appendChild(ri);
        },600);
      } else {
        addXP(10);vlanCorrect++;
        const fb=_id('vlan-fb');fb.className='fb-strip show ok';fb.textContent='✓ '+name+' → '+p.port+' (VLAN '+vlan+') +10 XP';
        if(devPool.children.length===0){
          addXP(50);showToast('🏆 VLAN completate! +50 XP bonus','var(--orange)');
          _id('vlan-next').classList.add('show');
          if(!G.modules['vlan_mod'].completed) completeModule('vlan_mod');
        }
      }
    });
    portPool.appendChild(zone);
  });
}

// ── AI LAB ──
let labTopic=TOPICS[0];
function initLabTopics(){
  const tg=_id('lab-topic-grid');tg.innerHTML='';
  TOPICS.forEach(t=>{
    const b=document.createElement('button');b.className='topic-btn'+(t===labTopic?' sel':'');
    b.textContent=t;b.onclick=()=>{document.querySelectorAll('#lab-topic-grid .topic-btn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');labTopic=t;};
    tg.appendChild(b);
  });
}
function loadLabAI(){
  _id('lab-ai-err').classList.remove('show');
  _id('lab-loading').classList.remove('show');
  const ids=TOPIC_MAP[labTopic]||ALL_BANK_IDS;
  const pool=collectQ(ids);
  if(!pool.length){
    _id('lab-ai-err').classList.add('show');
    _id('lab-ai-err').textContent='⚠️ Nessuna domanda disponibile per questo argomento.';
    _id('lab-ai-start').style.display='block';
    return;
  }
  const raw=pool[Math.floor(Math.random()*pool.length)];
  const q=prepQuestion(raw,labTopic);
  _id('lab-ai-start').style.display='none';
  _id('lab-ai-panel').style.display='block';
  _id('lab-ai-q').textContent=q.question;
  _id('lab-ai-expl').classList.remove('show');
  _id('lab-ai-next').classList.remove('show');
  const opts=_id('lab-ai-opts');opts.innerHTML='';
  q.options.forEach((opt,i)=>{
    const b=document.createElement('div');b.className='ai-opt';
    b.innerHTML='<span class="opt-l">'+['A','B','C','D'][i]+'</span><span>'+opt.replace(/^[A-D]\)\s*/,'')+'</span>';
    b.onclick=()=>{
      if(b.dataset.answered) return;
      opts.querySelectorAll('.ai-opt').forEach((x,j)=>{x.dataset.answered='1';x.onclick=null;if(j===q.correct)x.classList.add('ok');});
      if(i!==q.correct) b.classList.add('ko');
      _id('lab-ai-expl').textContent=q.explanation;_id('lab-ai-expl').classList.add('show');
      _id('lab-ai-next').classList.add('show');
      if(i===q.correct) addXP(15);
    };
    opts.appendChild(b);
  });
}

// ══════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════
function selSchema(id,btn){
  document.querySelectorAll('.schema-nav-btn').forEach(b=>b.classList.remove('sel'));
  if(btn) btn.classList.add('sel');
  renderSchema(id);
}
const SCHEMAS={
    osi:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">📶</span><h3>I 7 Layer OSI</h3><span style="background:rgba(139,92,246,.15);color:var(--purple);border:1px solid rgba(139,92,246,.3)">DIAGRAMMA</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>N°</th><th>NOME</th><th>PDU</th><th>PROTOCOLLI</th><th>DISPOSITIVO</th></tr><tr><td class="ca">7</td><td style="color:#fca5a5;font-weight:600">Application</td><td class="cm">Data</td><td class="cm">HTTP,FTP,DNS,SMTP,SSH</td><td style="font-size:.75rem;color:var(--muted)">Firewall, Server, PC</td></tr><tr><td class="ca">6</td><td style="color:#fcd34d;font-weight:600">Presentation</td><td class="cm">Data</td><td class="cm">SSL/TLS,JPEG,ASCII</td><td style="font-size:.75rem;color:var(--muted)">Gateway</td></tr><tr><td class="ca">5</td><td style="color:#fde047;font-weight:600">Session</td><td class="cm">Data</td><td class="cm">NetBIOS,RPC,NFS</td><td style="font-size:.75rem;color:var(--muted)">Gateway</td></tr><tr><td class="ca">4</td><td style="color:#6ee7b7;font-weight:600">Transport</td><td class="cm">Segment</td><td class="cm">TCP,UDP</td><td style="font-size:.75rem;color:var(--muted)">Firewall, Load Balancer</td></tr><tr><td class="ca">3</td><td style="color:#67e8f9;font-weight:600">Network</td><td class="cm">Packet</td><td class="cm">IP,ICMP,OSPF,BGP</td><td style="font-size:.75rem;color:var(--muted)">Router, L3 Switch</td></tr><tr><td class="ca">2</td><td style="color:#93c5fd;font-weight:600">Data Link</td><td class="cm">Frame</td><td class="cm">Ethernet,802.11,PPP</td><td style="font-size:.75rem;color:var(--muted)">Switch, Bridge</td></tr><tr><td class="ca">1</td><td style="color:#c4b5fd;font-weight:600">Physical</td><td class="cm">Bits</td><td class="cm">UTP,Fibra,Wi-Fi</td><td style="font-size:.75rem;color:var(--muted)">Hub, Cavi, Repeater</td></tr></table><div class="note">💡 Mnemonico L7→L1: <strong>"All People Seem To Need Data Processing"</strong></div></div></div>`,
    subnet:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">🔢</span><h3>CIDR Cheat Sheet</h3><span style="background:rgba(16,185,129,.15);color:var(--green);border:1px solid rgba(16,185,129,.3)">TABELLA</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>CIDR</th><th>SUBNET MASK</th><th>HOST USABILI</th><th>SUBNET DA /24</th><th>BLOCK SIZE</th></tr><tr><td class="cm">/24</td><td class="cm">255.255.255.0</td><td class="cg">254</td><td class="co">1</td><td class="cm">256</td></tr><tr><td class="cm">/25</td><td class="cm">255.255.255.128</td><td class="cg">126</td><td class="co">2</td><td class="cm">128</td></tr><tr><td class="cm">/26</td><td class="cm">255.255.255.192</td><td class="cg">62</td><td class="co">4</td><td class="cm">64</td></tr><tr><td class="cm">/27</td><td class="cm">255.255.255.224</td><td class="cg">30</td><td class="co">8</td><td class="cm">32</td></tr><tr><td class="cm">/28</td><td class="cm">255.255.255.240</td><td class="cg">14</td><td class="co">16</td><td class="cm">16</td></tr><tr><td class="cm">/29</td><td class="cm">255.255.255.248</td><td class="cg">6</td><td class="co">32</td><td class="cm">8</td></tr><tr><td class="cm">/30</td><td class="cm">255.255.255.252</td><td class="cg">2</td><td class="co">64</td><td class="cm">4</td></tr></table><div class="formula-grid" style="margin-top:16px"><div class="formula-box"><div class="formula-label">Host usabili</div><div class="formula-val">2ʰ − 2</div><div class="formula-sub">h = 32 − CIDR. Si tolgono network e broadcast.</div></div><div class="formula-box"><div class="formula-label">Block size</div><div class="formula-val">256 − valore mask</div><div class="formula-sub">Es: /26 → 256−192=64. Subnet ogni 64.</div></div></div></div></div>`,
    cli:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">💻</span><h3>CLI Cisco — Comandi essenziali</h3><span style="background:rgba(59,130,246,.15);color:var(--accent);border:1px solid rgba(59,130,246,.3)">REFERENCE</span></div><div class="schema-card-body"><div class="two-col"><div><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin-bottom:8px">SHOW COMMANDS</div><table class="ref-table"><tr><td class="cm">show running-config</td><td style="font-size:.75rem;color:var(--muted)">Config in RAM</td></tr><tr><td class="cm">show ip interface brief</td><td style="font-size:.75rem;color:var(--muted)">Stato interfacce</td></tr><tr><td class="cm">show ip route</td><td style="font-size:.75rem;color:var(--muted)">Routing table</td></tr><tr><td class="cm">show vlan brief</td><td style="font-size:.75rem;color:var(--muted)">VLAN configurate</td></tr><tr><td class="cm">show version</td><td style="font-size:.75rem;color:var(--muted)">Info IOS/hardware</td></tr></table></div><div><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin-bottom:8px">CONFIGURAZIONE</div><div class="code-block"><span class="cp">R1#</span> <span class="ck">enable</span><br><span class="cp">R1#</span> <span class="ck">configure terminal</span><br><span class="cp">R1(config)#</span> <span class="ck">hostname R1</span><br><span class="cp">R1(config)#</span> <span class="ck">interface Gi0/0</span><br><span class="cp">R1(config-if)#</span> <span class="ck">ip address</span> <span class="cv">192.168.1.1 255.255.255.0</span><br><span class="cp">R1(config-if)#</span> <span class="ck">no shutdown</span><br><span class="cp">R1(config)#</span> <span class="ck">ip route 0.0.0.0 0.0.0.0</span> <span class="cv">x.x.x.x</span><br><span class="cp">R1#</span> <span class="ck">copy run start</span></div></div></div></div></div>`,
    vlan:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">🔀</span><h3>VLAN — Configurazione completa</h3><span style="background:rgba(59,130,246,.15);color:var(--accent);border:1px solid rgba(59,130,246,.3)">CLI</span></div><div class="schema-card-body"><div class="two-col"><div><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin-bottom:8px">ACCESS PORT</div><div class="code-block"><span class="cc">! Crea VLAN</span><br><span class="cp">SW(config)#</span> <span class="ck">vlan</span> <span class="cv">10</span><br><span class="cp">SW(config-vlan)#</span> <span class="ck">name</span> <span class="cv">Sales</span><br><span class="cc">! Assegna porta</span><br><span class="cp">SW(config)#</span> <span class="ck">interface</span> <span class="cv">Fa0/1</span><br><span class="cp">SW(config-if)#</span> <span class="ck">switchport mode access</span><br><span class="cp">SW(config-if)#</span> <span class="ck">switchport access vlan</span> <span class="cv">10</span></div></div><div><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin-bottom:8px">TRUNK PORT</div><div class="code-block"><span class="cc">! Configura trunk</span><br><span class="cp">SW(config)#</span> <span class="ck">interface</span> <span class="cv">Fa0/24</span><br><span class="cp">SW(config-if)#</span> <span class="ck">switchport mode trunk</span><br><span class="cp">SW(config-if)#</span> <span class="ck">switchport trunk allowed vlan</span> <span class="cv">10,20,30</span><br><span class="cc">! Verifica</span><br><span class="cp">SW#</span> <span class="ck">show vlan brief</span></div></div></div></div></div>`,
    nat:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">🔄</span><h3>NAT & PAT</h3><span style="background:rgba(245,158,11,.15);color:var(--orange);border:1px solid rgba(245,158,11,.3)">TABELLA + CLI</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>TIPO</th><th>DESCRIZIONE</th><th>USO TIPICO</th></tr><tr><td class="ca">Static NAT</td><td style="font-size:.8rem">1 IP privato ↔ 1 IP pubblico fisso</td><td style="font-size:.75rem;color:var(--muted)">Server esposti (web, mail)</td></tr><tr><td class="ca">Dynamic NAT</td><td style="font-size:.8rem">Pool IP pubblici, assegnati on-demand</td><td style="font-size:.75rem;color:var(--muted)">Raro</td></tr><tr><td class="ca">PAT / Overload</td><td style="font-size:.8rem">Molti IP privati → 1 IP pubblico (porta diversa)</td><td style="font-size:.75rem;color:var(--muted)">Home, uffici — il più usato</td></tr></table><div class="code-block" style="margin-top:14px"><span class="cc">! PAT completo</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 1 permit</span> <span class="cv">192.168.1.0 0.0.0.255</span><br><span class="cp">R1(config)#</span> <span class="ck">ip nat inside source list 1 interface Gi0/1 overload</span><br><span class="cp">R1(config-if)#</span> <span class="ck">ip nat inside</span> <span class="cc">! interfaccia LAN</span><br><span class="cp">R1(config-if)#</span> <span class="ck">ip nat outside</span> <span class="cc">! interfaccia WAN</span><br><span class="cp">R1#</span> <span class="ck">show ip nat translations</span></div></div></div>`,
    acl:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">🛡️</span><h3>ACL — Access Control Lists</h3><span style="background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.3)">CLI</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>TIPO</th><th>NUMERI</th><th>FILTRA</th><th>POSIZIONE</th></tr><tr><td class="ca">Standard</td><td class="cm">1–99</td><td>Solo IP sorgente</td><td style="font-size:.75rem;color:var(--muted)">Vicino alla destinazione</td></tr><tr><td class="ca">Extended</td><td class="cm">100–199</td><td>Src/Dst IP, proto, porta</td><td style="font-size:.75rem;color:var(--muted)">Vicino alla sorgente</td></tr></table><div class="two-col" style="margin-top:14px"><div><div class="code-block"><span class="cc">! Standard — blocca rete 10.x</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 10 deny</span> <span class="cv">10.0.0.0 0.255.255.255</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 10 permit any</span><br><span class="cp">R1(config-if)#</span> <span class="ck">ip access-group 10 in</span></div></div><div><div class="code-block"><span class="cc">! Extended — solo HTTP/HTTPS</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 101 permit tcp</span> <span class="cv">192.168.1.0 0.0.0.255 any eq 80</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 101 permit tcp</span> <span class="cv">192.168.1.0 0.0.0.255 any eq 443</span><br><span class="cp">R1(config)#</span> <span class="ck">access-list 101 deny ip any any</span></div></div></div><div class="note">⚠️ <strong>Implicit deny:</strong> alla fine di ogni ACL c\'è sempre un "deny any any" invisibile!</div></div></div>`,
    ipv6:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">6️⃣</span><h3>IPv6 — Riferimento rapido</h3><span style="background:rgba(6,182,212,.15);color:var(--cyan);border:1px solid rgba(6,182,212,.3)">TABELLA</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>TIPO</th><th>PREFISSO</th><th>IPv4 EQUIV.</th><th>NOTE</th></tr><tr><td class="ca">Global Unicast</td><td class="cm">2000::/3</td><td style="font-size:.78rem">IP pubblico</td><td style="font-size:.75rem;color:var(--muted)">Instradabile su Internet</td></tr><tr><td class="ca">Link-Local</td><td class="cm">FE80::/10</td><td style="font-size:.78rem">169.254.x.x</td><td style="font-size:.75rem;color:var(--muted)">Solo subnet locale, autogenerato</td></tr><tr><td class="ca">Unique Local</td><td class="cm">FC00::/7</td><td style="font-size:.78rem">192.168.x.x</td><td style="font-size:.75rem;color:var(--muted)">Privato, non routable Internet</td></tr><tr><td class="ca">Multicast</td><td class="cm">FF00::/8</td><td style="font-size:.78rem">224.x.x.x</td><td style="font-size:.75rem;color:var(--muted)">Gruppo di destinatari</td></tr><tr><td class="ca">Loopback</td><td class="cm">::1</td><td style="font-size:.78rem">127.0.0.1</td><td style="font-size:.75rem;color:var(--muted)">Localhost</td></tr></table><div class="note" style="margin-top:12px">💡 Abbreviazione: rimuovi zeri iniziali per gruppo (0db8→db8) e sostituisci gruppi consecutivi di zero con :: (solo una volta).<br>Es: 2001:0db8:0000:0000:0000:0000:0000:0001 → <strong>2001:db8::1</strong></div></div></div>`,
    exam:`<div class="schema-card"><div class="schema-card-head"><span style="font-size:1.2rem">🎓</span><h3>Guida all'esame CCNA 200-301</h3><span style="background:rgba(16,185,129,.15);color:var(--green);border:1px solid rgba(16,185,129,.3)">PIANO</span></div><div class="schema-card-body"><table class="ref-table"><tr><th>DOMINIO D'ESAME</th><th>PESO</th></tr><tr><td class="ca">1. Network Fundamentals</td><td class="cm">20%</td></tr><tr><td class="ca">2. Network Access (VLAN, trunk, Wi-Fi)</td><td class="cm">20%</td></tr><tr><td class="ca">3. IP Connectivity (routing, OSPF)</td><td class="cm">25%</td></tr><tr><td class="ca">4. IP Services (DHCP, DNS, NAT, NTP)</td><td class="cm">10%</td></tr><tr><td class="ca">5. Security Fundamentals</td><td class="cm">15%</td></tr><tr><td class="ca">6. Automation &amp; Programmability</td><td class="cm">10%</td></tr></table><div class="note">⏱️ Durata <strong>120 minuti</strong> · circa <strong>100-120 domande</strong> (scelta multipla, drag-and-drop e simulazioni) · per passare servono circa <strong>825/1000</strong>.</div><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin:16px 0 8px">PIANO IN 4 SETTIMANE</div><ul class="brief-list"><li><b>Sett. 1 — Fondamenti:</b> OSI/TCP-IP, cavi, binario, indirizzi IP. Gioca i Tier 0-1 e allena il subnetting ogni giorno.</li><li><b>Sett. 2 — Accesso &amp; Switching:</b> VLAN, trunk, STP, EtherChannel, Wi-Fi. Lab VLAN e config a tessere.</li><li><b>Sett. 3 — Routing &amp; Servizi IP:</b> statico, OSPF, NAT, DHCP/DNS/NTP. Lab CLI e Troubleshooting.</li><li><b>Sett. 4 — Sicurezza, Automazione &amp; ripasso:</b> ACL, SSH, port-security, REST/SDN. Mock d'esame + Ripasso errori.</li></ul><div style="font-family:JetBrains Mono,monospace;font-size:.6rem;color:var(--muted);letter-spacing:2px;margin:16px 0 8px">RISORSE CONSIGLIATE</div><ul class="brief-list"><li><b>Cisco Packet Tracer</b> (gratis) — pratica di configurazione e troubleshooting: imprescindibile.</li><li><b>Jeremy's IT Lab</b> (YouTube, gratis) — corso completo allineato al blueprint, con lab.</li><li><b>Boson ExSim-Max</b> — il banco domande più vicino all'esame reale.</li><li><b>Official Cert Guide</b> (Wendell Odom) — testo di riferimento.</li></ul><div class="note">💡 Regola d'oro: <strong>subnetting a colpo d'occhio</strong> (&lt;20s) e <strong>2-3 lab pratici a settimana</strong> in Packet Tracer. Questo gioco copre teoria e ripasso; la pratica su Packet Tracer completa la preparazione.</div></div></div>`,
};
const SCHEMA_LABEL={osi:'📶 OSI',subnet:'🔢 Subnetting',cli:'💻 CLI',vlan:'🔀 VLAN',nat:'🔄 NAT',acl:'🛡️ ACL',ipv6:'6️⃣ IPv6',exam:'🎓 Esame'};
function renderSchema(id){
  const c=_id('schema-content');
  c.innerHTML=SCHEMAS[id]||'<p style="color:var(--muted)">Schema non trovato.</p>';
  makeTablesResponsive(c);
}
// Rende le tabelle di riferimento leggibili su mobile: legge le intestazioni
// e le assegna come data-label a ogni cella (il CSS le impila senza scroll)
function makeTablesResponsive(root){
  root.querySelectorAll('table.ref-table').forEach(tb=>{
    const rows=[...tb.rows];if(!rows.length)return;
    const head=[...rows[0].cells];
    if(!head.some(c=>c.tagName==='TH'))return;
    tb.classList.add('has-head');
    const labels=head.map(c=>c.textContent.trim());
    rows.slice(1).forEach(r=>{[...r.cells].forEach((td,i)=>{if(labels[i])td.setAttribute('data-label',labels[i]);});});
  });
}

// ══════════════════════════════════════
// LEVEL PLAYER — ogni livello è un gioco interattivo
// ══════════════════════════════════════
const LP={mod:null,quiz:null};
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function normCalc(s){return String(s).trim().toLowerCase().replace(/\s+/g,'');}
function normCli(s){return String(s).trim().toLowerCase().replace(/\s+/g,' ');}
// helper subnet
function ipToInt(ip){return ip.split('.').reduce((a,o)=>((a<<8)+(+o))>>>0,0)>>>0;}
function intToIp(n){return [24,16,8,0].map(s=>(n>>>s)&255).join('.');}
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function makeSubnetRound(minC,maxC){
  const c=rnd(minC,maxC);
  const bases=['192.168.'+rnd(0,30)+'.','10.'+rnd(0,60)+'.'+rnd(0,60)+'.','172.'+rnd(16,31)+'.'+rnd(0,60)+'.'];
  const ip=bases[rnd(0,bases.length-1)]+rnd(1,254);
  const ipn=ipToInt(ip),maskn=(0xffffffff<<(32-c))>>>0;
  const net=(ipn&maskn)>>>0,bc=(net|(~maskn>>>0))>>>0;
  const hosts=Math.pow(2,32-c)-2;
  return{prompt:'Indirizzo: '+ip+' /'+c,fields:[
    {label:'Subnet mask',answer:intToIp(maskn),ph:'255.255.255.x'},
    {label:'Network address',answer:intToIp(net)},
    {label:'Broadcast',answer:intToIp(bc)},
    {label:'Primo host',answer:intToIp((net+1)>>>0)},
    {label:'Ultimo host',answer:intToIp((bc-1)>>>0)},
    {label:'N. host validi',answer:String(hosts)}
  ]};
}
// ── MOTORE: SMISTA (abbina interattivo, stile lab · a tocco) ──
function engineMatch(arena,data,onDone){
  arena.innerHTML='';
  arena.appendChild(el('div','game-instr',data.instruction));
  const board=el('div','sort-board');const bins={};
  data.cats.forEach(cat=>{
    const bin=el('div','sort-bin');bin.appendChild(el('div','sort-bin-h',cat));
    const body=el('div','sort-bin-body');bin.appendChild(body);bins[cat]=body;
    bin.onclick=()=>place(cat,bin);
    board.appendChild(bin);
  });
  arena.appendChild(board);
  const poolWrap=el('div','sort-pool-wrap');
  poolWrap.appendChild(el('div','sort-pool-lbl','👆 Tocca un elemento, poi lo scomparto giusto'));
  const pool=el('div','sort-pool');poolWrap.appendChild(pool);
  arena.appendChild(poolWrap);
  const fb=el('div','fb-strip');arena.appendChild(fb);
  const prog=el('div','play-progress');arena.appendChild(prog);
  let selected=null,placed=0,errors=0;const total=data.items.length;
  qShuffle(data.items.slice()).forEach(it=>{
    const chip=el('div','sort-chip',it.n);chip.dataset.cat=it.c;if(it.h)chip.dataset.hint=it.h;
    chip.onclick=()=>{if(chip.classList.contains('locked'))return;if(selected)selected.classList.remove('sel');selected=chip;chip.classList.add('sel');};
    pool.appendChild(chip);
  });
  function upd(){prog.textContent='Smistati: '+placed+'/'+total+(errors?' · errori: '+errors:'');}
  upd();
  function place(cat,bin){
    if(!selected){fb.className='fb-strip show ko';fb.textContent='Prima tocca un elemento da smistare.';return;}
    if(selected.dataset.cat===cat){
      const ch=selected;selected=null;ch.classList.remove('sel');ch.classList.add('locked','placed-ok');ch.onclick=null;
      bins[cat].appendChild(ch);placed++;addXP(4);upd();fb.className='fb-strip';
      if(placed>=total){fb.className='fb-strip show ok';fb.textContent='✓ Tutto smistato correttamente!';addXP(10);setTimeout(onDone,750);}
    }else{
      errors++;upd();bin.classList.add('shake-bin');const ch=selected;ch.classList.add('chip-ko');
      const h=ch.dataset.hint;fb.className='fb-strip show ko';fb.textContent='✗ Scomparto sbagliato'+(h?' — indizio: '+h:'')+'. Riprova.';
      setTimeout(()=>{bin.classList.remove('shake-bin');ch.classList.remove('chip-ko');},420);
    }
  }
}
// ── MOTORE: CALCOLA/DIGITA ──
function engineCalc(arena,data,onDone){
  let rounds=[];if(data.list)rounds=data.list.slice();else for(let k=0;k<(data.count||3);k++)rounds.push(data.gen());
  let idx=0;
  function renderRound(){
    const r=rounds[idx];arena.innerHTML='';
    arena.appendChild(el('div','game-instr',data.instruction+' &nbsp;·&nbsp; <b>Round '+(idx+1)+'/'+rounds.length+'</b>'));
    const card=el('div','match-card');card.appendChild(el('div','match-name',r.prompt));arena.appendChild(card);
    const inputs=[];
    r.fields.forEach(f=>{
      const row=el('div','field-row');row.appendChild(el('span','field-lbl',f.label));
      const inp=document.createElement('input');inp.className='field-inp';inp.placeholder=f.ph||'';row.appendChild(inp);
      const ck=el('span','field-ck','');row.appendChild(ck);arena.appendChild(row);inputs.push({inp,ck,ans:f.answer});
    });
    const btn=el('button','check-btn','Verifica');arena.appendChild(btn);
    const fb=el('div','fb-strip','');arena.appendChild(fb);
    btn.onclick=()=>{
      let allok=true;
      inputs.forEach(o=>{
        if(normCalc(o.inp.value)===normCalc(o.ans)){o.inp.classList.add('ok');o.inp.classList.remove('ko');o.ck.textContent='✓';}
        else{o.inp.classList.add('ko');o.inp.classList.remove('ok');o.ck.textContent='✗';allok=false;}
      });
      fb.className='fb-strip show '+(allok?'ok':'ko');
      fb.textContent=allok?'✓ Corretto!':'✗ Correggi i campi con ✗';
      if(allok){addXP(10);idx++;if(idx>=rounds.length)setTimeout(onDone,500);else setTimeout(renderRound,650);}
    };
  }
  renderRound();
}
// ── MOTORE: ORDINA/SEQUENZA ──
function engineOrder(arena,data,onDone){
  const rounds=data.rounds||[{instruction:data.instruction,steps:data.steps}];let ri=0;
  function render(){
    const r=rounds[ri];arena.innerHTML='';
    arena.appendChild(el('div','game-instr',r.instruction||data.instruction));
    arena.appendChild(el('div','play-progress','✓ Sequenza corretta:'));
    const seq=el('div','order-pool','');arena.appendChild(seq);
    arena.appendChild(el('div','play-progress','Clicca i passi nell\'ordine giusto:'));
    const pool=el('div','order-pool','');arena.appendChild(pool);
    let expected=0;
    qShuffle(r.steps.map((s,idx)=>({s,idx}))).forEach(o=>{
      const item=el('div','order-slot','<span>'+o.s+'</span>');
      item.onclick=()=>{
        if(item.dataset.done)return;
        if(o.idx===expected){
          item.dataset.done='1';item.classList.add('ok');
          item.insertBefore(el('span','order-num',String(expected+1)),item.firstChild);
          pool.removeChild(item);seq.appendChild(item);expected++;addXP(5);
          if(expected>=r.steps.length){ri++;if(ri>=rounds.length)setTimeout(onDone,500);else setTimeout(render,700);}
        }else{item.classList.add('ko');setTimeout(()=>item.classList.remove('ko'),350);}
      };
      pool.appendChild(item);
    });
  }
  render();
}
// ── MOTORE: MISSIONE CLI ──
function engineCli(arena,data,onDone){
  arena.innerHTML='';
  const mis=el('div','cli-mission','<strong>MISSIONE:</strong> '+data.brief);arena.appendChild(mis);
  const wrap=el('div','cli-wrap','<div class="cli-bar"><div class="cli-dot" style="background:#ff5f57"></div><div class="cli-dot" style="background:#ffbd2e"></div><div class="cli-dot" style="background:#28c840"></div><span style="font-family:JetBrains Mono,monospace;font-size:.65rem;color:var(--muted);margin-left:8px;letter-spacing:2px">CISCO IOS</span></div><div class="cli-out"></div><div class="cli-inp"><span class="cli-ps"></span><input class="cli-field" autocomplete="off" spellcheck="false" placeholder="digita un comando..."></div>');
  arena.appendChild(wrap);
  const out=wrap.querySelector('.cli-out'),ps=wrap.querySelector('.cli-ps'),field=wrap.querySelector('.cli-field');
  if(data.hints){const hr=el('div','hint-row','');data.hints.forEach(h=>{const c=el('span','hint-chip',h);c.onclick=()=>{field.value=h;field.focus();};hr.appendChild(c);});mis.appendChild(hr);}
  let step=0;
  function prompt(){const st=data.steps[step]||data.steps[data.steps.length-1];return st.p||'Router>';}
  function log(t,cls){const l=el('div','cl '+(cls||'cl-o'),t);out.appendChild(l);out.scrollTop=out.scrollHeight;}
  function match(cmd,st){const c=normCli(cmd);return st.re?new RegExp(st.re).test(c):c===normCli(st.cmd);}
  ps.textContent=prompt();log('Completa la missione usando i comandi Cisco IOS.','cl-c');
  field.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    const val=field.value;field.value='';if(!val.trim())return;
    log(prompt()+' '+val,'cl-p');
    const st=data.steps[step];
    if(match(val,st)){log(st.msg||'OK','cl-s');step++;addXP(6);
      if(step>=data.steps.length){log('✓ Missione completata!','cl-s');field.disabled=true;setTimeout(onDone,700);}
      else ps.textContent=prompt();
    }else log('% Comando non atteso qui. Riprova (usa i suggerimenti sopra).','cl-e');
  });
  setTimeout(()=>field.focus(),60);
}
// ── MOTORE: BIT BUILDER (binario a interruttori) ──
function engineBits(arena,data,onDone){
  const rounds=data.rounds||[{target:192},{target:224},{target:240},{target:128},{target:255}];
  const weights=[128,64,32,16,8,4,2,1];let idx=0;
  function render(){
    const r=rounds[idx];arena.innerHTML='';
    arena.appendChild(el('div','game-instr',(data.instruction||'Attiva i bit per costruire il valore decimale richiesto.')+' &nbsp;·&nbsp; <b>Round '+(idx+1)+'/'+rounds.length+'</b>'));
    const card=el('div','match-card');card.innerHTML='<div style="font-family:JetBrains Mono,monospace;font-size:.62rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase">Costruisci il valore</div><div class="match-name" style="font-size:2.2rem">'+r.target+'</div>';
    arena.appendChild(card);
    const state=weights.map(()=>0);
    const row=el('div','bits-row'),disp=el('div','bits-disp2'),fb=el('div','fb-strip');
    weights.forEach((w,i)=>{
      const b=el('button','bit-btn','<span class="bit-w">'+w+'</span><span class="bit-v">0</span>');
      b.onclick=()=>{state[i]^=1;b.classList.toggle('on',!!state[i]);b.querySelector('.bit-v').textContent=state[i];upd();};
      row.appendChild(b);
    });
    function upd(){
      const sum=state.reduce((a,s,i)=>a+(s?weights[i]:0),0);
      disp.innerHTML='Binario: <b>'+state.join('')+'</b> &nbsp;=&nbsp; Decimale: <b>'+sum+'</b>';
      if(sum===r.target){
        fb.className='fb-strip show ok';fb.textContent='✓ '+state.join('')+' = '+r.target;
        row.querySelectorAll('.bit-btn').forEach(x=>x.disabled=true);addXP(8);
        idx++;if(idx>=rounds.length)setTimeout(onDone,750);else setTimeout(render,850);
      }
    }
    arena.appendChild(row);arena.appendChild(disp);arena.appendChild(fb);upd();
  }
  render();
}
// ── MOTORE: PACKET FLOW (percorso del pacchetto, animato) ──
function engineFlow(arena,data,onDone){
  arena.innerHTML='';
  arena.appendChild(el('div','game-instr',data.instruction));
  const diag=el('div','net-diag');
  data.devices.forEach((d,i)=>{
    diag.appendChild(el('div','net-dev','<div class="dev-ico'+(i===0?' active':'')+'" id="fdev'+i+'">'+d.ico+'</div><div class="dev-lbl">'+d.lbl+'</div>'));
    if(i<data.devices.length-1) diag.appendChild(el('div','link-seg','<div class="pkt-dot" id="fpkt'+i+'"></div>'));
  });
  arena.appendChild(diag);
  const qbox=el('div');arena.appendChild(qbox);
  const prog=el('div','play-progress');arena.appendChild(prog);
  let si=0;
  function render(){
    if(si>=data.steps.length){addXP(10);setTimeout(onDone,500);return;}
    const s=data.steps[si];qbox.innerHTML='';prog.textContent='Tappa '+(si+1)+'/'+data.steps.length;
    qbox.appendChild(el('div','q-box','<div class="q-text">'+s.q+'</div>'));
    const grid=el('div','ai-opts'),fb=el('div','explainer');
    qShuffle(s.options.map((o,i)=>({o,i}))).forEach(({o,i})=>{
      const b=el('div','ai-opt','<span class="opt-l">'+String.fromCharCode(65+grid.children.length)+'</span><span>'+o+'</span>');
      b.onclick=()=>{
        if(grid.dataset.done)return;
        if(i===s.correct){
          grid.dataset.done='1';b.classList.add('ok');
          const d0=document.getElementById('fdev'+si);if(d0)d0.classList.remove('active');
          const pkt=document.getElementById('fpkt'+si);if(pkt)pkt.classList.add('go');
          const d1=document.getElementById('fdev'+(si+1));if(d1)d1.classList.add('recv');
          addXP(6);if(s.note){fb.className='explainer show';fb.innerHTML=s.note;}
          si++;setTimeout(render,1200);
        }else b.classList.add('ko');
      };
      grid.appendChild(b);
    });
    qbox.appendChild(grid);qbox.appendChild(fb);
  }
  render();
}
// ── MOTORE: SUBNET VISUALIZER (slider CIDR con calcolo live) ──
function engineSubnetViz(arena,data,onDone){
  const rounds=data.rounds||[{need:50},{need:500},{need:2},{need:100},{need:10}];
  const MINC=8,MAXC=30;let ri=0;
  const hosts=c=>Math.pow(2,32-c)-2;
  const maskFor=c=>intToIp((0xffffffff<<(32-c))>>>0);
  const correctFor=need=>{for(let c=MAXC;c>=MINC;c--){if(hosts(c)>=need)return c;}return MINC;};
  function render(){
    if(ri>=rounds.length){addXP(10);setTimeout(onDone,400);return;}
    const r=rounds[ri],target=correctFor(r.need);let cur=24;
    arena.innerHTML='';
    arena.appendChild(el('div','game-instr','🎚️ '+(r.label||('Serve una subnet con almeno <b>'+r.need+'</b> host utili. Trova il CIDR <b>più efficiente</b> (che spreca meno indirizzi).'))+' &nbsp;·&nbsp; Round '+(ri+1)+'/'+rounds.length));
    const card=el('div','match-card');card.innerHTML='<div class="svz-cidr">/<span id="svz-c">24</span></div><div class="svz-bar" id="svz-bar"></div><div class="svz-legend"><span><i class="svz-net"></i> bit rete</span><span><i class="svz-host"></i> bit host</span></div>';
    arena.appendChild(card);
    const slider=document.createElement('input');slider.type='range';slider.min=MINC;slider.max=MAXC;slider.value=24;slider.className='svz-slider';slider.setAttribute('aria-label','CIDR');
    arena.appendChild(slider);
    const grid=el('div','svz-grid');arena.appendChild(grid);
    const btn=el('button','check-btn','Conferma');arena.appendChild(btn);
    const fb=el('div','fb-strip');arena.appendChild(fb);
    function upd(){
      cur=+slider.value;_id('svz-c').textContent=cur;
      _id('svz-bar').innerHTML='<span class="svz-net" style="flex:'+cur+'"></span><span class="svz-host" style="flex:'+(32-cur)+'"></span>';
      grid.innerHTML='<div class="svz-box"><span>Subnet mask</span><b>'+maskFor(cur)+'</b></div>'+
        '<div class="svz-box"><span>Host utili</span><b>'+hosts(cur).toLocaleString('it')+'</b></div>'+
        '<div class="svz-box"><span>Indirizzi totali</span><b>'+Math.pow(2,32-cur).toLocaleString('it')+'</b></div>'+
        '<div class="svz-box"><span>Bit host</span><b>'+(32-cur)+'</b></div>';
    }
    slider.oninput=upd;upd();
    btn.onclick=()=>{
      if(cur===target){fb.className='fb-strip show ok';fb.textContent='✓ Esatto: /'+target+' → '+hosts(target)+' host utili, il più efficiente.';ri++;setTimeout(render,950);}
      else if(hosts(cur)<r.need){fb.className='fb-strip show ko';fb.textContent='✗ Troppo pochi host ('+hosts(cur)+'). Ne servono almeno '+r.need+': allarga la parte host (CIDR più piccolo).';}
      else{fb.className='fb-strip show ko';fb.textContent='✗ Basterebbe ('+hosts(cur)+' host) ma sprechi indirizzi. Cerca il CIDR più grande che è ancora sufficiente.';}
    };
  }
  render();
}
// ── MOTORE: CONFIG ASSEMBLER (comandi a tessere) ──
function engineAssemble(arena,data,onDone){
  const rounds=data.rounds;let ri=0;
  function render(){
    if(ri>=rounds.length){addXP(10);setTimeout(onDone,400);return;}
    const r=rounds[ri];arena.innerHTML='';
    arena.appendChild(el('div','game-instr','🔧 '+r.instruction+' &nbsp;·&nbsp; Round '+(ri+1)+'/'+rounds.length));
    const outBox=el('div','asm-out','<div class="asm-title">CONFIGURAZIONE</div>');arena.appendChild(outBox);
    arena.appendChild(el('div','play-progress','Tocca i comandi nell\'ordine corretto:'));
    const pool=el('div','asm-pool');arena.appendChild(pool);
    const fb=el('div','fb-strip');arena.appendChild(fb);
    let expected=0;
    qShuffle(r.tiles.map((s,idx)=>({s,idx}))).forEach(o=>{
      const t=el('div','asm-tile',o.s);
      t.onclick=()=>{
        if(t.dataset.done)return;
        if(o.idx===expected){
          t.dataset.done='1';t.classList.add('used');
          outBox.appendChild(el('div','asm-line','<span class="asm-ps">R1(config)#</span> '+o.s));
          addXP(4);expected++;
          if(expected>=r.tiles.length){fb.className='fb-strip show ok';fb.textContent='✓ Configurazione corretta!';ri++;setTimeout(render,850);}
        }else{t.classList.add('asm-ko');fb.className='fb-strip show ko';fb.textContent='✗ Non è il comando giusto in questa posizione. Segui l\'ordine logico.';setTimeout(()=>t.classList.remove('asm-ko'),400);}
      };
      pool.appendChild(t);
    });
  }
  render();
}
// ── MOTORE: VERO / FALSO rapido ──
function engineTrueFalse(arena,data,onDone){
  const items=qShuffle(data.items.slice());let i=0,ok=0;
  function render(){
    if(i>=items.length){addXP(10);setTimeout(onDone,400);return;}
    const it=items[i];arena.innerHTML='';
    arena.appendChild(el('div','game-instr',(data.instruction||'Vero o Falso?')+' &nbsp;·&nbsp; '+(i+1)+'/'+items.length+' · Giuste: '+ok));
    arena.appendChild(el('div','tf-card',it.s));
    const row=el('div','tf-row'),fb=el('div','explainer');
    const bt=el('button','tf-btn tf-true','✓ VERO'),bf=el('button','tf-btn tf-false','✗ FALSO');
    function answer(val,btn){
      if(row.dataset.done)return;row.dataset.done='1';
      const correct=(val===it.t);
      [bt,bf].forEach(b=>b.disabled=true);
      (it.t?bt:bf).classList.add('ok');
      if(!correct)btn.classList.add('ko');else{ok++;addXP(6);}
      fb.className='explainer show';fb.innerHTML='<b>'+(correct?'✓ Giusto':'✗ Sbagliato')+'.</b> La frase è <b>'+(it.t?'VERA':'FALSA')+'</b>. '+(it.e||'');
      const nb=el('button','next-small show','Prossima →');nb.onclick=()=>{i++;render();};
      arena.appendChild(nb);
    }
    bt.onclick=()=>answer(true,bt);bf.onclick=()=>answer(false,bf);
    row.appendChild(bt);row.appendChild(bf);arena.appendChild(row);arena.appendChild(fb);
  }
  render();
}
// ══════════════════════════════════════
// DATI DEI 21 LIVELLI (allineati CCNA 200-301)
// ══════════════════════════════════════
const LEVELS={
 net_basics:{engine:"flow",data:{instruction:"Segui il pacchetto dal PC fino al server: scegli cosa accade a ogni tappa.",devices:[{ico:'💻',lbl:'PC'},{ico:'🔀',lbl:'Switch'},{ico:'📡',lbl:'Router'},{ico:'🖥️',lbl:'Server'}],steps:[
   {q:"Il PC deve raggiungere un server su un'altra rete. A chi invia il frame per primo?",options:["Al proprio default gateway (il router), passando dallo switch","Direttamente al server, che è su un'altra rete","In broadcast a tutta Internet"],correct:0,note:"Per uscire dalla propria rete il PC invia il frame al <b>gateway</b>; lo switch lo inoltra verso il router."},
   {q:"Lo switch riceve il frame. Come sceglie la porta di uscita?",options:["Consulta la tabella MAC (CAM) e inoltra solo alla porta giusta","Guarda l'indirizzo IP di destinazione","Invia sempre a tutte le porte"],correct:0,note:"Lo switch lavora a <b>L2</b>: usa la tabella MAC per inoltrare in modo selettivo."},
   {q:"Il router riceve il pacchetto. Come decide dove inoltrarlo?",options:["Consulta la tabella di routing in base all'IP di destinazione","Usa l'indirizzo MAC del PC mittente","Usa il numero di porta TCP"],correct:0,note:"Il router lavora a <b>L3</b>: sceglie il percorso in base all'IP e alla tabella di routing."},
   {q:"Il pacchetto arriva al server. Quale livello legge la porta TCP (es. 443)?",options:["Transport (L4)","Network (L3)","Data Link (L2)"],correct:0,note:"La porta TCP è gestita dal livello <b>Transport (L4)</b>."}
 ]}},
 binary:{engine:"bits",data:{instruction:"Attiva i bit (128 64 32 16 8 4 2 1) per costruire il valore decimale.",rounds:[{target:192},{target:224},{target:240},{target:128},{target:255}]}},
 osi_mod:{engine:"match",data:{instruction:"A quale livello OSI appartiene ciascun protocollo?",cats:["Application (7)","Transport (4)","Network (3)","Data Link (2)","Physical (1)"],items:[
   {n:"HTTP",c:"Application (7)"},{n:"DNS",c:"Application (7)"},{n:"FTP",c:"Application (7)"},{n:"SMTP",c:"Application (7)"},
   {n:"TCP",c:"Transport (4)"},{n:"UDP",c:"Transport (4)"},
   {n:"IP",c:"Network (3)"},{n:"ICMP",c:"Network (3)"},{n:"OSPF",c:"Network (3)"},
   {n:"Ethernet",c:"Data Link (2)"},{n:"Frame / MAC",c:"Data Link (2)"},
   {n:"Cavo UTP",c:"Physical (1)"},{n:"Fibra ottica",c:"Physical (1)"}
 ]}},
 tcpip_mod:{engine:"order",data:{rounds:[
   {instruction:"Ordina le fasi del 3-way handshake TCP:",steps:["SYN","SYN-ACK","ACK"]},
   {instruction:"Ordina l'incapsulamento dei dati (dal livello 7 al livello 1):",steps:["Dati (Application)","Segmento (Transport)","Pacchetto (Network)","Frame (Data Link)","Bit (Physical)"]}
 ]}},
 ip_addr:{engine:"match",data:{instruction:"Classifica ciascun indirizzo IPv4.",cats:["Privato","Pubblico","Loopback","APIPA","Multicast"],items:[
   {n:"10.15.4.9",c:"Privato"},{n:"172.16.30.1",c:"Privato"},{n:"192.168.100.5",c:"Privato"},
   {n:"8.8.8.8",c:"Pubblico"},{n:"172.32.5.1",h:"Fuori dal blocco 172.16-31",c:"Pubblico"},{n:"200.1.1.1",c:"Pubblico"},
   {n:"127.0.0.1",c:"Loopback"},{n:"169.254.10.20",c:"APIPA"},
   {n:"224.0.0.5",c:"Multicast"},{n:"239.1.1.1",c:"Multicast"}
 ]}},
 subnetting:{engine:"subnetviz",data:{rounds:[{need:50},{need:500},{need:2},{need:100},{need:10}]}},
 boss1:{engine:"calc",data:{instruction:"BOSS · Subnet Gauntlet: risolvi 5 subnet.",gen:()=>makeSubnetRound(26,30),count:5}},
 switching:{engine:"truefalse",data:{instruction:"Switching & Ethernet — Vero o Falso?",items:[
   {s:"Uno switch inoltra i frame in base all'indirizzo IP di destinazione.",t:false,e:"Lo switch lavora a L2: usa la MAC e la tabella CAM. L'IP è competenza del router (L3)."},
   {s:"Ogni porta di uno switch è un dominio di collisione separato.",t:true,e:"La micro-segmentazione e il full-duplex eliminano le collisioni su ogni porta."},
   {s:"Lo Spanning Tree Protocol serve a prevenire i loop di livello 2.",t:true,e:"STP/RSTP blocca i percorsi ridondanti per evitare i loop di broadcast."},
   {s:"Un hub inoltra il traffico solo alla porta di destinazione.",t:false,e:"L'hub ripete il segnale a tutte le porte; è lo switch a inoltrare selettivamente."},
   {s:"Se la MAC di destinazione è sconosciuta, lo switch fa flooding su tutte le porte tranne quella d'ingresso.",t:true,e:"È l'unknown unicast flooding: il frame raggiunge comunque il destinatario."},
   {s:"Lo switch impara gli indirizzi MAC dalla MAC di destinazione dei frame.",t:false,e:"Li impara dalla MAC sorgente: associa il mittente alla porta da cui è arrivato."}
 ]}},
 vlan_mod:{engine:"assemble",data:{rounds:[
   {instruction:"Crea la VLAN 10 \"Sales\" e assegna la porta Fa0/1 in modalità accesso.",tiles:["vlan 10","name Sales","interface Fa0/1","switchport mode access","switchport access vlan 10"]},
   {instruction:"Configura la porta Fa0/24 come trunk 802.1Q che trasporta le VLAN 10, 20 e 30.",tiles:["interface Fa0/24","switchport mode trunk","switchport trunk allowed vlan 10,20,30"]}
 ]}},
 routing_s:{engine:"cli",data:{brief:"Su R1: entra in modalità privilegiata e di configurazione, aggiungi una rotta statica verso 10.0.0.0/24 via 192.168.1.2, una default route via 192.168.1.1, poi salva.",hints:["enable","configure terminal","ip route 10.0.0.0 255.255.255.0 192.168.1.2","ip route 0.0.0.0 0.0.0.0 192.168.1.1","end","copy running-config startup-config"],steps:[
   {p:"R1>",cmd:"enable",msg:"Modalità privilegiata."},
   {p:"R1#",cmd:"configure terminal",msg:"Configurazione globale."},
   {p:"R1(config)#",cmd:"ip route 10.0.0.0 255.255.255.0 192.168.1.2",msg:"Rotta statica aggiunta."},
   {p:"R1(config)#",cmd:"ip route 0.0.0.0 0.0.0.0 192.168.1.1",msg:"Default route (gateway of last resort)."},
   {p:"R1(config)#",cmd:"end",msg:"Torni al prompt privilegiato."},
   {p:"R1#",re:"^(copy running-config startup-config|copy run start|write memory|wr)$",msg:"Configurazione salvata in NVRAM."}
 ]}},
 ospf_mod:{engine:"order",data:{instruction:"Ordina gli stati di adiacenza OSPF (dal primo fino a Full):",steps:["Down","Init","2-Way","ExStart","Exchange","Loading","Full"]}},
 eigrp_mod:{engine:"truefalse",data:{instruction:"EIGRP & routing dinamico — Vero o Falso?",items:[
   {s:"EIGRP ha una distanza amministrativa di 90.",t:true,e:"90 (interno). OSPF è 110, RIP 120."},
   {s:"OSPF usa l'algoritmo DUAL.",t:false,e:"DUAL è di EIGRP. OSPF usa SPF (Dijkstra)."},
   {s:"Il feasible successor è un percorso di backup già pronto in EIGRP.",t:true,e:"È il backup precalcolato: se il successor cade, la riconvergenza è quasi istantanea."},
   {s:"EIGRP è un protocollo link-state.",t:false,e:"EIGRP è un advanced distance vector; OSPF è link-state."},
   {s:"In OSPF l'area 0 è la backbone a cui si collegano le altre aree.",t:true,e:"Tutte le aree devono connettersi all'area 0."},
   {s:"EIGRP calcola la metrica di default usando bandwidth e delay.",t:true,e:"Di default usa banda e ritardo (K1 e K3)."}
 ]}},
 boss2:{engine:"cli",data:{brief:"BOSS · Configura OSPF su R1: process 1, annuncia le reti 192.168.1.0/24 e 10.0.0.0/24 in area 0.",hints:["enable","configure terminal","router ospf 1","network 192.168.1.0 0.0.0.255 area 0","network 10.0.0.0 0.0.0.255 area 0","end"],steps:[
   {p:"R1>",cmd:"enable",msg:"OK"},
   {p:"R1#",cmd:"configure terminal",msg:"OK"},
   {p:"R1(config)#",cmd:"router ospf 1",msg:"Processo OSPF 1 avviato."},
   {p:"R1(config-router)#",cmd:"network 192.168.1.0 0.0.0.255 area 0",msg:"Rete annunciata in area 0."},
   {p:"R1(config-router)#",cmd:"network 10.0.0.0 0.0.0.255 area 0",msg:"Rete annunciata in area 0."},
   {p:"R1(config-router)#",cmd:"end",msg:"OSPF configurato."}
 ]}},
 acl_mod:{engine:"assemble",data:{rounds:[
   {instruction:"Crea una ACL estesa 101 che permette solo HTTP e HTTPS dalla LAN 192.168.1.0/24, poi applicala in ingresso su Gi0/0.",tiles:["access-list 101 permit tcp 192.168.1.0 0.0.0.255 any eq 80","access-list 101 permit tcp 192.168.1.0 0.0.0.255 any eq 443","access-list 101 deny ip any any","interface Gi0/0","ip access-group 101 in"]}
 ]}},
 nat_mod:{engine:"flow",data:{instruction:"Un PC privato naviga su Internet: segui la traduzione NAT/PAT.",devices:[{ico:'💻',lbl:'PC 10.0.0.5'},{ico:'📡',lbl:'Router NAT'},{ico:'🌐',lbl:'Web'}],steps:[
   {q:"Il PC 10.0.0.5 (privato) invia una richiesta al web. Può viaggiare così com'è su Internet?",options:["No: l'IP privato va tradotto dal NAT in uno pubblico","Sì, gli indirizzi privati sono instradabili su Internet","Sì, ma solo con IPv6"],correct:0,note:"Gli indirizzi privati (RFC 1918) non sono instradabili: serve il <b>NAT</b>."},
   {q:"Il router applica il PAT. Cosa modifica nel pacchetto?",options:["L'IP sorgente (→ pubblico) e registra la porta nella tabella NAT","L'IP di destinazione","Nulla, lo inoltra così com'è"],correct:0,note:"Il <b>PAT</b> sostituisce l'IP sorgente e usa la porta per distinguere le sessioni."},
   {q:"Il web risponde all'IP pubblico. Come fa il router a consegnare al PC giusto?",options:["Consulta la tabella delle traduzioni (IP+porta → host interno)","Invia in broadcast a tutta la LAN","Chiede al DNS"],correct:0,note:"La <b>tabella NAT</b> riporta la sessione all'host interno corretto."}
 ]}},
 ssh_sec:{engine:"cli",data:{brief:"Metti in sicurezza R1: hostname, password enable cifrata, dominio, chiavi RSA e accesso SSH sulle linee VTY.",hints:["enable","configure terminal","hostname R1","enable secret cisco123","ip domain-name lab.local","crypto key generate rsa","line vty 0 4","transport input ssh","login local"],steps:[
   {p:"Router>",cmd:"enable",msg:"OK"},
   {p:"Router#",cmd:"configure terminal",msg:"OK"},
   {p:"Router(config)#",re:"^hostname .+",msg:"Hostname impostato."},
   {p:"R1(config)#",re:"^enable secret .+",msg:"Password enable cifrata (hash)."},
   {p:"R1(config)#",re:"^ip domain-name .+",msg:"Dominio impostato."},
   {p:"R1(config)#",re:"^crypto key generate rsa.*",msg:"Chiavi RSA generate."},
   {p:"R1(config)#",cmd:"line vty 0 4",msg:"Entri nelle linee VTY."},
   {p:"R1(config-line)#",cmd:"transport input ssh",msg:"Solo SSH ammesso (niente Telnet)."},
   {p:"R1(config-line)#",cmd:"login local",msg:"Autenticazione con utenti locali."}
 ]}},
 boss3:{engine:"assemble",data:{rounds:[
   {instruction:"BOSS · Metti in sicurezza R1: hostname, password enable cifrata e accesso SSH sulle linee VTY.",tiles:["hostname R1","enable secret cisco123","ip domain-name lab.local","crypto key generate rsa","line vty 0 4","transport input ssh","login local"]},
   {instruction:"BOSS · Proteggi una porta access con la port security (max 1 MAC, sticky).",tiles:["interface Fa0/1","switchport mode access","switchport port-security","switchport port-security maximum 1","switchport port-security mac-address sticky"]}
 ]}},
 ipv6_mod:{engine:"calc",data:{instruction:"Comprimi / riconosci gli indirizzi IPv6.",list:[
   {prompt:"Comprimi: 2001:0db8:0000:0000:0000:0000:0000:0001",fields:[{label:"Forma compressa",answer:"2001:db8::1"}]},
   {prompt:"Comprimi: fe80:0000:0000:0000:0000:0000:0000:00a1",fields:[{label:"Forma compressa",answer:"fe80::a1"}]},
   {prompt:"Comprimi: 2001:0db8:0000:00ff:0000:0000:0000:0010",fields:[{label:"Forma compressa",answer:"2001:db8:0:ff::10"}]},
   {prompt:"Indirizzo di loopback IPv6?",fields:[{label:"Loopback",answer:"::1"}]},
   {prompt:"Prefisso degli indirizzi link-local?",fields:[{label:"Prefisso",answer:"fe80::/10"}]}
 ]}},
 wan_mod:{engine:"truefalse",data:{instruction:"WAN & VPN — Vero o Falso?",items:[
   {s:"IPSec fornisce cifratura e autenticazione per le VPN.",t:true,e:"ESP cifra il payload, AH autentica: sicurezza a L3."},
   {s:"GRE cifra il traffico che incapsula.",t:false,e:"GRE incapsula vari protocolli ma NON cifra; spesso si combina con IPSec."},
   {s:"MPLS inoltra i pacchetti in base a etichette (label), non solo all'IP.",t:true,e:"Il label switching abilita VPN L3 performanti e QoS."},
   {s:"Una leased line è un circuito condiviso con altri clienti.",t:false,e:"È un circuito dedicato punto-punto, sempre attivo."},
   {s:"PPP può autenticare il collegamento con PAP o CHAP.",t:true,e:"CHAP (challenge) è più sicuro di PAP (in chiaro)."},
   {s:"Una VPN site-to-site collega due intere reti attraverso Internet.",t:true,e:"Crea un tunnel sicuro tra i gateway di due sedi."}
 ]}},
 auto_mod:{engine:"truefalse",data:{instruction:"Automazione & SDN — Vero o Falso?",items:[
   {s:"SDN separa il control plane dal data plane.",t:true,e:"Il control plane centralizzato decide, il data plane inoltra."},
   {s:"In REST il metodo GET serve a creare una nuova risorsa.",t:false,e:"GET legge; POST crea, PUT aggiorna, DELETE elimina."},
   {s:"JSON e YAML sono formati per rappresentare dati strutturati.",t:true,e:"Usati per configurazioni e payload delle API."},
   {s:"Ansible richiede un agente installato su ogni dispositivo gestito.",t:false,e:"Ansible è agentless: opera via SSH/API."},
   {s:"Un codice di risposta HTTP 200 indica una richiesta andata a buon fine.",t:true,e:"2xx = successo, 4xx = errore client, 5xx = errore server."},
   {s:"L'Infrastructure as Code permette di versionare la configurazione come software.",t:true,e:"Config dichiarata, ripetibile e tracciata (es. in git)."}
 ]}},
 wifi_mod:{engine:"match",data:{instruction:"A quale elemento del wireless si riferisce ciascuna descrizione?",cats:["SSID","Access Point","WLC","Sicurezza"],items:[
   {n:"Nome della rete Wi-Fi visibile ai client",c:"SSID"},
   {n:"Diffonde il segnale radio 802.11",c:"Access Point"},
   {n:"Gestisce centralmente molti AP lightweight",c:"WLC"},
   {n:"WPA3 / WPA2 proteggono l'accesso",c:"Sicurezza"},
   {n:"Il client si associa a questo identificativo",c:"SSID"},
   {n:"Canali 1-6-11 sulla banda 2.4 GHz",c:"Access Point"},
   {n:"Imposta canali e potenza degli AP da un punto unico",c:"WLC"},
   {n:"WEP è obsoleto e insicuro",c:"Sicurezza"}
 ]}},
 redun_mod:{engine:"assemble",data:{rounds:[
   {instruction:"Crea un EtherChannel LACP aggregando le porte Fa0/1 e Fa0/2, poi imposta il canale come trunk.",tiles:["interface range Fa0/1 - 2","channel-group 1 mode active","interface Port-channel 1","switchport mode trunk"]},
   {instruction:"Configura HSRP su Gi0/0: IP virtuale 192.168.1.1, priorità 110 e preemption.",tiles:["interface Gi0/0","standby 1 ip 192.168.1.1","standby 1 priority 110","standby 1 preempt"]}
 ]}},
 ipserv_mod:{engine:"flow",data:{instruction:"Un nuovo dispositivo chiede un indirizzo IP: segui lo scambio DHCP (DORA).",devices:[{ico:'📟',lbl:'Client'},{ico:'🖥️',lbl:'Server DHCP'}],steps:[
   {q:"1) Il client non ha ancora un IP. Come trova il server DHCP?",options:["Invia un DHCP Discover in broadcast","Contatta il server direttamente al suo IP","Interroga il DNS"],correct:0,note:"Senza IP, il client manda un <b>Discover</b> in broadcast."},
   {q:"2) Il server risponde con...",options:["Un DHCP Offer che propone un indirizzo","Un Ack immediato","Un ping di prova"],correct:0,note:"Il server propone un IP con l'<b>Offer</b>."},
   {q:"3) Il client accetta l'offerta inviando...",options:["Un DHCP Request per l'indirizzo proposto","Un nuovo Discover","Un Release"],correct:0,note:"Il <b>Request</b> (in broadcast) conferma la scelta anche agli altri server."},
   {q:"4) Il server chiude lo scambio con...",options:["Un DHCP Ack che assegna il lease (IP, mask, gateway, DNS)","Un altro Offer","Un Discover"],correct:0,note:"L'<b>Ack</b> conferma il lease: la configurazione è completa."}
 ]}}
};
// ══════════════════════════════════════
// BRIEFING PRE-GIOCO — scenario reale + punti chiave d'esame + esempio
// ══════════════════════════════════════
const BRIEF={
 net_basics:{real:"In un ufficio i PC si collegano a uno switch (LAN); per raggiungere altre sedi o Internet si passa da un router verso la WAN del provider.",key:["<b>LAN</b> = area locale · <b>WAN</b> = grandi distanze (provider)","Hub = L1 (1 dominio collisione), Switch = L2, Router = L3","Il <b>full-duplex</b> elimina le collisioni","Fibra: immune alle interferenze, lunghe distanze"],ex:"Straight-through: PC ↔ Switch   ·   Crossover: Switch ↔ Switch"},
 binary:{real:"Ogni indirizzo IP e subnet mask che configuri è, sotto, una sequenza di bit: saper convertire è la base del subnetting.",key:["1 byte = 8 bit · ottetto 0-255","Pesi dei bit: <b>128 64 32 16 8 4 2 1</b>","1 cifra esadecimale = 4 bit (nibble)","La mask separa rete/host con un <b>AND</b> logico"],ex:"11000000 = 128+64 = 192      ·      0xF = 15"},
 osi_mod:{real:"Quando apri un sito, i dati scendono i 7 livelli OSI sul tuo PC e risalgono sul server: ogni livello aggiunge il suo header (incapsulamento).",key:["7 livelli: App · Pres · Sess · Trans · Net · DataLink · Phys","PDU: Segmento (L4) · Pacchetto (L3) · Frame (L2) · Bit (L1)","Router = L3 · Switch = L2 · Hub = L1","Mnemonico: <b>All People Seem To Need Data Processing</b>"],ex:"HTTP = L7   ·   TCP = L4   ·   IP = L3   ·   Ethernet/MAC = L2"},
 tcpip_mod:{real:"Prima di scaricare un file, il tuo PC e il server aprono una connessione TCP affidabile con un 'saluto' in 3 passi.",key:["3-way handshake: <b>SYN → SYN-ACK → ACK</b>","TCP = affidabile (web, file) · UDP = veloce (VoIP, DNS)","Porte a 16 bit: 0-65535 · well-known 0-1023","HTTPS 443 · HTTP 80 · SSH 22 · DNS 53 · DHCP 67/68"],ex:"Incapsulamento: Dati → Segmento → Pacchetto → Frame → Bit"},
 ip_addr:{real:"La tua rete di casa usa 192.168.1.x (privati); per uscire su Internet il router li traduce con il NAT in un IP pubblico.",key:["Privati RFC1918: <b>10/8 · 172.16-31/12 · 192.168/16</b>","127.0.0.1 loopback · 169.254.x APIPA (no DHCP)","Classe D 224-239 = multicast","Host tutti-0 = rete · tutti-1 = broadcast (non assegnabili)"],ex:"8.8.8.8 pubblico   ·   10.0.0.1 privato   ·   169.254.5.5 APIPA"},
 subnetting:{real:"Devi dividere una rete aziendale in reparti isolati (Sales, IT): il subnetting crea sottoreti su misura risparmiando indirizzi.",key:["Host utili = <b>2^h − 2</b> (h = 32 − CIDR)","Block size = 256 − valore della mask","/30 = 2 host (link punto-punto)","<b>VLSM</b> = maschere di lunghezza variabile"],ex:"/26 → mask 255.255.255.192 · block 64 · 62 host utili"},
 boss1:{real:"BOSS · Uno scenario reale di progettazione IP a tempo: calcola le subnet come faresti in un'azienda vera.",key:["Individua il block size dalla CIDR","Network = primo indirizzo del blocco","Broadcast = ultimo indirizzo del blocco","Primo/ultimo host = network+1 / broadcast−1"],ex:"192.168.1.70 /26 → rete .64 · broadcast .127"},
 switching:{real:"Uno switch aziendale impara automaticamente dove si trova ogni dispositivo memorizzando i MAC nella tabella CAM.",key:["Impara la <b>MAC sorgente</b> → tabella CAM","MAC sconosciuta → flooding su tutte le porte","<b>STP</b> (802.1D/802.1w) previene i loop L2","1 porta switch = 1 dominio di collisione"],ex:"MAC a 48 bit   ·   broadcast FFFF.FFFF.FFFF"},
 vlan_mod:{real:"In un edificio, Sales e IT condividono gli stessi switch ma restano reti separate grazie alle VLAN, per sicurezza e ordine.",key:["Ogni VLAN = un dominio di broadcast","Access = 1 VLAN · Trunk = più VLAN (<b>802.1Q</b>)","L'inter-VLAN routing richiede un dispositivo L3","Native VLAN = traffico non taggato sul trunk"],ex:"switchport mode access   ·   switchport access vlan 10"},
 routing_s:{real:"In una piccola rete stabile l'admin scrive a mano le rotte: statiche verso reti note e una default verso Internet.",key:["<b>ip route</b> &lt;rete&gt; &lt;mask&gt; &lt;next-hop&gt;","Default: ip route 0.0.0.0 0.0.0.0 &lt;gw&gt;","AD: connessa 0 · statica 1 · EIGRP 90 · OSPF 110 · RIP 120","Floating static = backup con AD più alta"],ex:"ip route 10.0.0.0 255.255.255.0 192.168.1.2"},
 ospf_mod:{real:"In reti medio-grandi OSPF calcola da solo i percorsi migliori e si adatta in tempo reale se un link cade.",key:["Link-state · algoritmo <b>SPF (Dijkstra)</b> · AD 110","Costo = banda_riferimento / banda interfaccia","Area 0 = backbone · Hello su 224.0.0.5","DR/BDR sulle reti multiaccesso"],ex:"router ospf 1   ·   network 192.168.1.0 0.0.0.255 area 0"},
 eigrp_mod:{real:"EIGRP (Cisco) riconverge quasi istantaneamente perché ha già pronto un percorso di riserva verificato.",key:["Advanced distance vector · algoritmo <b>DUAL</b> · AD 90","Metrica: bandwidth + delay (default)","<b>Successor</b> = migliore · <b>Feasible successor</b> = backup","Multicast 224.0.0.10 · usa Hello"],ex:"Tabelle: Neighbor · Topology · Routing"},
 boss2:{real:"BOSS · Configura il routing dinamico OSPF su un router come in un lab Cisco reale.",key:["Attiva il processo: <b>router ospf</b> &lt;id&gt;","Annuncia le reti con la wildcard mask","area 0 = backbone obbligatoria","Verifica con show ip ospf neighbor"],ex:"network 10.0.0.0 0.0.0.255 area 0"},
 acl_mod:{real:"Un'azienda vuole che solo il web (443) raggiunga un server e blocca il resto: le ACL filtrano il traffico sul router.",key:["Standard 1-99: solo IP sorgente","Extended 100-199: src/dst/protocollo/porta","Standard vicino a destinazione · Extended vicino a sorgente","<b>Deny any implicito</b> alla fine · wildcard mask (inversa)"],ex:"access-list 101 permit tcp any any eq 443"},
 nat_mod:{real:"Il router di casa fa navigare decine di dispositivi con un solo IP pubblico: è il PAT (NAT overload).",key:["Static NAT 1:1 (server esposti)","<b>PAT</b>: molti privati → 1 pubblico via porte","inside = LAN privata · outside = WAN pubblica","inside local (privato) ↔ inside global (pubblico)"],ex:"ip nat inside source list 1 interface g0/1 overload"},
 ssh_sec:{real:"Prima di mettere in produzione un router, l'admin lo mette in sicurezza: SSH al posto di Telnet, password cifrate, porte chiuse.",key:["SSH (22) cifra · Telnet (23) è in chiaro","<b>enable secret</b> = hash (meglio di enable password)","Port security limita i MAC per porta","<b>AAA</b>: Authentication, Authorization, Accounting"],ex:"transport input ssh · login local · service password-encryption"},
 boss3:{real:"BOSS · Security Audit: individua le vulnerabilità di una rete e associa la contromisura giusta, come in un assessment reale.",key:["MAC flooding → <b>Port Security</b>","Telnet in chiaro → <b>SSH</b>","Traffico non voluto → <b>ACL</b>","Porte inutilizzate → <b>shutdown</b>"],ex:"switchport port-security mac-address sticky"},
 ipv6_mod:{real:"Con IPv4 in esaurimento, le reti moderne adottano IPv6: indirizzi enormi e autoconfigurazione (SLAAC).",key:["128 bit · 8 gruppi da 16 bit (hex)","Comprimi: zeri iniziali via · <b>::</b> una sola volta","2000::/3 global · FE80::/10 link-local · ::1 loopback","SLAAC + NDP (sostituisce ARP) · subnet /64"],ex:"2001:0db8:0000:...:0001 → 2001:db8::1"},
 wan_mod:{real:"Per collegare due sedi lontane in sicurezza, l'azienda crea una VPN IPSec su Internet invece di una costosa linea dedicata.",key:["VPN site-to-site / remote access","<b>IPSec</b> (L3): ESP cifra · AH autentica","GRE incapsula ma non cifra · MPLS = label switching","Leased line = circuito dedicato · PPP = seriale con CHAP"],ex:"IPSec opera a L3 e cifra i pacchetti IP end-to-end"},
 auto_mod:{real:"Invece di configurare 100 switch a mano, un team usa Python/Ansible per applicare le stesse config in modo automatico e ripetibile.",key:["<b>SDN</b> separa control plane e data plane","REST usa HTTP: GET/POST/PUT/DELETE","JSON/YAML/XML = formati dati","Ansible (agentless, YAML) · Python (Netmiko)"],ex:"GET 200 = OK   ·   IaC = infrastruttura come codice versionato"},
 ccna_cert:{real:"Simulazione finale: metti alla prova tutto ciò che hai imparato, come nell'esame reale CCNA 200-301.",key:["6 aree: Fondamenti · Accesso · Connettività IP · Servizi IP · Sicurezza · Automazione","120 minuti · circa 100-120 domande","Serve circa 825/1000 per passare","Domande a scelta multipla, drag-and-drop e simulazioni"],ex:"Ripassa: subnetting · OSPF · VLAN · ACL · NAT · IPv6"},
 wifi_mod:{real:"Il Wi-Fi collega senza cavi PC, telefoni e scanner: gli Access Point diffondono il segnale e un WLC li gestisce tutti da un punto solo.",key:["<b>SSID</b> = nome della rete · <b>AP</b> = diffonde il segnale","<b>WLC</b> = gestione centralizzata di molti AP lightweight","2.4 GHz più portata · 5 GHz più velocità · canali 1-6-11","Sicurezza: <b>WPA3</b> > WPA2 ≫ WEP (obsoleto)"],ex:"AP autonomo = config locale · AP lightweight = dipende dal WLC"},
 redun_mod:{real:"Una rete che non deve mai fermarsi ha percorsi e gateway duplicati: STP evita i loop, EtherChannel somma i link, HSRP duplica il gateway.",key:["<b>STP</b> (802.1D/RSTP) blocca i link ridondanti → niente loop L2","<b>EtherChannel</b> (LACP/PAgP) = più link in uno logico","<b>HSRP</b> = gateway virtuale Active/Standby","RSTP (802.1w) converge in secondi"],ex:"HSRP: due router, un IP virtuale · se l'Active cade, subentra lo Standby"},
 ipserv_mod:{real:"Dietro ogni rete funzionante ci sono servizi 'invisibili': DHCP assegna gli IP, DNS risolve i nomi, NTP tiene l'orario, Syslog/SNMP monitorano tutto.",key:["<b>DHCP</b>: Discover → Offer → Request → Ack (<b>DORA</b>) · UDP 67/68","<b>DNS</b>: nome → IP · porta 53","<b>NTP</b>: sincronizza l'orario · UDP 123","<b>Syslog</b> (514) log centralizzati · <b>SNMP</b> (161/162) monitoraggio · <b>QoS</b> = priorità a voce/video"],ex:"DORA: il client trova il server, riceve l'offerta, la richiede e ottiene il lease"}
};
// ══════════════════════════════════════
// APPROFONDIMENTI · esempi Kuehne+Nagel (logistica) + vita quotidiana
// ══════════════════════════════════════
const BRIEF_EXTRA={
 net_basics:{kn:"Nel magazzino di un hub logistico gli scanner RF dei picker, i PC dei reparti e le stampanti di etichette sono tutti su una <b>LAN</b> collegata agli switch. Per raggiungere il datacenter centrale o il sistema di gestione magazzino (WMS) in cloud, il traffico esce dal router sulla <b>WAN</b> aziendale.",home:"A casa TV, telefono e laptop sul Wi-Fi formano una piccola LAN. Quando guardi un film in streaming, i dati escono dal router verso la WAN del tuo provider Internet."},
 binary:{kn:"Ogni scanner che colleghi in magazzino riceve un IP che, sotto, è una sequenza di bit: capire i bit ti dice <b>quanti dispositivi</b> entrano nella subnet di un reparto prima di doverla ampliare.",home:"Il telefono mostra <b>192.168.1.42</b>, ma il router ragiona in binario per decidere chi fa parte della tua rete di casa e chi no."},
 osi_mod:{kn:"Quando un operatore spara un barcode, il dato sale i livelli OSI: l'app WMS (L7) → TCP (L4) → IP verso il server (L3) → Wi-Fi/Ethernet fino allo switch (L2). Se il palmare 'non si connette', l'OSI ti dice <b>a che livello</b> cercare il guasto.",home:"Aprire un sito: il browser (L7) usa TCP (L4), l'IP instrada il pacchetto (L3) e il Wi-Fi trasporta i frame fino al router (L2)."},
 tcpip_mod:{kn:"L'invio di una distinta di spedizione al server centrale usa <b>TCP</b>: handshake e ritrasmissioni garantiscono che nessuna riga si perda. Una telefonata VoIP tra due filiali usa invece <b>UDP</b>, dove conta la velocità.",home:"Scaricare un allegato = TCP (nessun byte perso). Una videochiamata = UDP: meglio perdere un fotogramma che accumulare ritardo."},
 ip_addr:{kn:"Ogni sede usa indirizzi <b>privati</b> (es. 10.x per i magazzini); il NAT li traduce per uscire su Internet. Così migliaia di dispositivi nel mondo riusano gli stessi range senza conflitti.",home:"Il router di casa ti assegna 192.168.1.x (privato). Verso Internet tutti i tuoi dispositivi condividono <b>un solo</b> IP pubblico."},
 subnetting:{kn:"Il /24 di una filiale viene diviso in subnet: <b>Magazzino</b> (scanner), <b>Uffici</b>, <b>VoIP</b>, <b>Gestione</b>. Il subnetting isola i reparti e dimensiona ogni rete sul numero reale di dispositivi.",home:"Separare la 'rete di famiglia' dalla 'rete ospiti/IoT' del router è, di fatto, creare due subnet."},
 boss1:{kn:"Progettazione IP di una <b>nuova filiale</b>: quante subnet servono per magazzino, uffici e telefoni, e con quale block size, senza sprecare indirizzi.",home:"Pianificare quanti indirizzi riservare a ogni zona di casa (smart-home, ospiti, lavoro) prima di configurare il router."},
 switching:{kn:"Lo switch di magazzino impara i <b>MAC</b> dei palmari nella tabella CAM e inoltra i frame solo alla porta giusta; lo <b>STP</b> evita i loop quando gli armadi sono cablati in ridondanza per non fermare mai le operazioni.",home:"Il tuo switch/router impara i MAC dei dispositivi per non 'gridare' ogni pacchetto a tutti in casa."},
 vlan_mod:{kn:"Su un unico switch di filiale, scanner del magazzino (<b>VLAN 10</b>), PC uffici (<b>VLAN 20</b>), telefoni VoIP (<b>VLAN 30</b>) e Wi-Fi ospiti (<b>VLAN 99</b>) restano reti separate: più sicurezza e ordine, senza raddoppiare i cavi.",home:"La <b>rete ospiti</b> del tuo router è una VLAN: gli ospiti navigano ma non vedono la tua stampante o il NAS."},
 routing_s:{kn:"Una piccola filiale con topologia stabile usa una <b>rotta statica di default</b> verso il router che porta alla WAN: semplice, prevedibile, facile da documentare.",home:"Il tuo router ha una sola regola di default: 'tutto ciò che non è locale → mandalo al provider'."},
 ospf_mod:{kn:"Tra i datacenter regionali e le sedi maggiori, <b>OSPF</b> ricalcola da solo il percorso migliore: se un collegamento tra due hub cade, il traffico delle spedizioni devia in automatico senza intervento umano.",home:"È come un navigatore che ricalcola il percorso quando trova traffico o una strada chiusa."},
 eigrp_mod:{kn:"Sulle dorsali Cisco, <b>EIGRP</b> tiene già pronto un percorso di backup verificato: se un link si interrompe la riconvergenza è quasi istantanea e le operazioni non si fermano.",home:"Come avere in testa una strada alternativa <b>prima</b> ancora di incontrare l'ingorgo."},
 boss2:{kn:"Configurare il routing dinamico <b>OSPF</b> sui router che collegano due sedi, come in un vero cambio di topologia di rete aziendale.",home:"Impostare due percorsi verso Internet (fibra + backup 4G) e lasciare che la rete scelga il migliore."},
 acl_mod:{kn:"Un'<b>ACL</b> permette solo agli host autorizzati di raggiungere il server WMS/gestionale sulla porta applicativa e blocca il resto: il reparto magazzino non può toccare i sistemi amministrativi.",home:"Il parental control o il blocco di un servizio sul router di casa è una ACL semplificata."},
 nat_mod:{kn:"Centinaia di scanner e PC di una filiale escono su Internet con pochi IP pubblici grazie al <b>PAT</b>; un portale di tracking esposto usa invece un <b>NAT statico 1:1</b>.",home:"Tutti i tuoi dispositivi navigano dietro un unico IP pubblico: è il PAT del router di casa."},
 ssh_sec:{kn:"Prima di mettere in rete uno switch di filiale, l'IT lo mette in sicurezza: <b>SSH</b> al posto di Telnet, password cifrate e <b>port-security</b> per impedire che qualcuno colleghi un dispositivo abusivo a una porta del magazzino.",home:"Cambiare la password di default del router e disattivare l'accesso remoto in chiaro è esattamente la stessa idea."},
 boss3:{kn:"<b>Security audit</b> di una filiale: individua porte aperte, servizi insicuri e Telnet in chiaro, e associa la contromisura giusta.",home:"Fare il 'giro di controllo' di casa: porte non chiuse, password deboli, accessi da sistemare."},
 ipv6_mod:{kn:"Con la crescita di sensori, telecamere e scanner IoT nei magazzini, <b>IPv6</b> offre indirizzi praticamente illimitati e autoconfigurazione (SLAAC), superando l'esaurimento di IPv4.",home:"Il tuo provider probabilmente ti assegna già un indirizzo IPv6 accanto a quello IPv4, senza che tu te ne accorga."},
 wan_mod:{kn:"Per collegare in sicurezza una nuova filiale alla rete globale si crea una <b>VPN IPSec</b> su Internet invece di una costosa linea dedicata; le sedi principali restano su <b>MPLS</b>.",home:"La VPN aziendale che usi in smart working crea un <b>tunnel cifrato</b> tra casa tua e l'ufficio."},
 auto_mod:{kn:"Con centinaia di sedi, l'IT non configura gli switch a mano: script <b>Python/Ansible</b> applicano le stesse impostazioni ovunque, in modo ripetibile e verificabile.",home:"Le 'scene' e automazioni della tua smart-home sono lo stesso principio: configuri una volta, la regola si applica sempre uguale."},
 ccna_cert:{kn:"Con il <b>CCNA</b> capisci e gestisci la rete che tiene in piedi le operazioni logistiche: dal palmare del magazzino fino al datacenter e alla WAN globale.",home:"Le stesse basi ti fanno padrone della rete di casa: dal Wi-Fi lento al port forwarding per il gaming."},
 wifi_mod:{kn:"In un magazzino, gli scanner RF dei picker si muovono tra le corsie restando sempre connessi: decine di <b>Access Point</b> gestiti da un <b>WLC</b> garantiscono copertura e <b>roaming</b> senza interruzioni durante la raccolta ordini.",home:"Il tuo router di casa è un piccolo AP: cambiare canale (1-6-11) o passare ai 5 GHz risolve i rallentamenti quando i vicini affollano la stessa frequenza."},
 redun_mod:{kn:"In una filiale la rete non può fermare le spedizioni: gli switch degli armadi sono collegati in doppio (STP evita i loop), i link verso il core sono aggregati con <b>EtherChannel</b> e il gateway è duplicato con <b>HSRP</b>. Se un apparato si guasta, le operazioni continuano.",home:"Avere fibra + backup 4G sul router, con passaggio automatico se la linea principale cade, è la stessa idea di ridondanza dell'HSRP."},
 ipserv_mod:{kn:"Quando un nuovo palmare si accende in magazzino, il <b>DHCP</b> gli dà l'IP, il <b>DNS</b> gli fa trovare il server WMS per nome, l'<b>NTP</b> allinea l'orario (fondamentale per tracciare gli eventi di spedizione) e <b>SNMP/Syslog</b> avvisano l'IT se qualcosa non va.",home:"Il router di casa fa da server DHCP e DNS per i tuoi dispositivi: per questo si connettono da soli senza configurare nulla a mano."}
};
// Ricostruzioni grafiche (SVG inline, tema scuro) per i moduli più visivi
const DIAGRAM={
 net_basics:{cap:"I dispositivi locali si parlano tramite lo switch (LAN). Per uscire verso altre sedi o Internet passano dal router alla WAN.",svg:`<svg viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><rect x="6" y="20" width="212" height="168" rx="12" fill="none" stroke="#1f2d3d" stroke-dasharray="4 4"/><text x="18" y="40" fill="#64748b" font-size="11">LAN · sede / casa</text><text x="52" y="84" font-size="24" text-anchor="middle">💻</text><text x="108" y="84" font-size="24" text-anchor="middle">📱</text><text x="164" y="84" font-size="24" text-anchor="middle">🖨️</text><g stroke="#334155" stroke-width="2"><line x1="52" y1="92" x2="92" y2="122"/><line x1="108" y1="92" x2="110" y2="122"/><line x1="164" y1="92" x2="128" y2="122"/></g><rect x="60" y="122" width="100" height="34" rx="7" fill="#0d1117" stroke="#3b82f6"/><text x="110" y="144" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH · L2</text><rect x="250" y="98" width="88" height="42" rx="9" fill="#0d1117" stroke="#f59e0b"/><text x="294" y="123" fill="#f59e0b" font-size="12" text-anchor="middle">ROUTER · L3</text><line x1="160" y1="139" x2="250" y2="121" stroke="#3b82f6" stroke-width="2.5" class="flowline"/><ellipse cx="470" cy="118" rx="76" ry="46" fill="#0d1117" stroke="#06b6d4"/><text x="470" y="114" fill="#06b6d4" font-size="14" text-anchor="middle">WAN</text><text x="470" y="132" fill="#64748b" font-size="10" text-anchor="middle">Internet · MPLS</text><line x1="338" y1="119" x2="396" y2="119" stroke="#06b6d4" stroke-width="2.5" class="flowline"/></svg>`},
 osi_mod:{cap:"I dati scendono i 7 livelli sul mittente e risalgono sul destinatario. Ogni livello ha la sua PDU.",svg:`<svg viewBox="0 0 560 316" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Incapsulamento ↓ — ogni layer aggiunge un header</text><g><rect x="10" y="26" width="470" height="30" rx="6" fill="#0d1117" stroke="#3b82f6"/><text x="22" y="45" fill="#e2e8f0" font-size="12">7 · Application</text><text x="200" y="45" fill="#64748b" font-size="11">HTTP · DNS · DHCP</text><rect x="10" y="66" width="470" height="30" rx="6" fill="#0d1117" stroke="#4d7bd6"/><text x="22" y="85" fill="#e2e8f0" font-size="12">6 · Presentation</text><text x="200" y="85" fill="#64748b" font-size="11">TLS · codifica</text><rect x="10" y="106" width="470" height="30" rx="6" fill="#0d1117" stroke="#3f8fce"/><text x="22" y="125" fill="#e2e8f0" font-size="12">5 · Session</text><text x="200" y="125" fill="#64748b" font-size="11">sessioni</text><rect x="10" y="146" width="470" height="30" rx="6" fill="#0d1117" stroke="#22a5c6"/><text x="22" y="165" fill="#e2e8f0" font-size="12">4 · Transport</text><text x="200" y="165" fill="#64748b" font-size="11">TCP / UDP</text><text x="392" y="165" fill="#06b6d4" font-size="11">Segmento</text><rect x="10" y="186" width="470" height="30" rx="6" fill="#0d1117" stroke="#06b6d4"/><text x="22" y="205" fill="#e2e8f0" font-size="12">3 · Network</text><text x="200" y="205" fill="#64748b" font-size="11">IP · routing</text><text x="392" y="205" fill="#06b6d4" font-size="11">Pacchetto</text><rect x="10" y="226" width="470" height="30" rx="6" fill="#0d1117" stroke="#10b981"/><text x="22" y="245" fill="#e2e8f0" font-size="12">2 · Data Link</text><text x="200" y="245" fill="#64748b" font-size="11">Ethernet · MAC</text><text x="392" y="245" fill="#10b981" font-size="11">Frame</text><rect x="10" y="266" width="470" height="30" rx="6" fill="#0d1117" stroke="#64748b"/><text x="22" y="285" fill="#e2e8f0" font-size="12">1 · Physical</text><text x="200" y="285" fill="#64748b" font-size="11">cavo · onde</text><text x="392" y="285" fill="#94a3b8" font-size="11">Bit</text></g><line x1="498" y1="30" x2="498" y2="292" stroke="#3b82f6" stroke-width="2" marker-end="" class="flowline"/><text x="512" y="165" fill="#3b82f6" font-size="10" transform="rotate(90 512 165)">DISCESA DATI</text></svg>`},
 subnetting:{cap:"Un /24 diviso in quattro /26: ogni reparto ha la sua subnet isolata con 62 host utili.",svg:`<svg viewBox="0 0 560 150" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">192.168.1.0 /24 → 4 subnet /26 · block size 64</text><rect x="10" y="34" width="130" height="46" rx="6" fill="rgba(59,130,246,.10)" stroke="#3b82f6"/><text x="75" y="55" fill="#e2e8f0" font-size="11" text-anchor="middle">.0 – .63</text><text x="75" y="71" fill="#64748b" font-size="9" text-anchor="middle">Magazzino</text><rect x="146" y="34" width="130" height="46" rx="6" fill="rgba(6,182,212,.10)" stroke="#06b6d4"/><text x="211" y="55" fill="#e2e8f0" font-size="11" text-anchor="middle">.64 – .127</text><text x="211" y="71" fill="#64748b" font-size="9" text-anchor="middle">Uffici</text><rect x="282" y="34" width="130" height="46" rx="6" fill="rgba(16,185,129,.10)" stroke="#10b981"/><text x="347" y="55" fill="#e2e8f0" font-size="11" text-anchor="middle">.128 – .191</text><text x="347" y="71" fill="#64748b" font-size="9" text-anchor="middle">VoIP</text><rect x="418" y="34" width="130" height="46" rx="6" fill="rgba(245,158,11,.10)" stroke="#f59e0b"/><text x="483" y="55" fill="#e2e8f0" font-size="11" text-anchor="middle">.192 – .255</text><text x="483" y="71" fill="#64748b" font-size="9" text-anchor="middle">Gestione</text><text x="10" y="104" fill="#10b981" font-size="10">Host utili per subnet: 2⁶ − 2 = 62</text><text x="10" y="122" fill="#64748b" font-size="10">Network = primo indirizzo · Broadcast = ultimo · mask 255.255.255.192</text></svg>`},
 vlan_mod:{cap:"Un solo switch fisico trasporta più reti logiche. Il trunk 802.1Q porta tutte le VLAN al router (inter-VLAN routing).",svg:`<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Un unico switch · reti separate per VLAN</text><rect x="20" y="34" width="150" height="32" rx="7" fill="rgba(239,68,68,.10)" stroke="#ef4444"/><text x="30" y="55" fill="#ef4444" font-size="11">VLAN 10 · Magazzino 📟</text><rect x="20" y="76" width="150" height="32" rx="7" fill="rgba(16,185,129,.10)" stroke="#10b981"/><text x="30" y="97" fill="#10b981" font-size="11">VLAN 20 · Uffici 💻</text><rect x="20" y="118" width="150" height="32" rx="7" fill="rgba(245,158,11,.10)" stroke="#f59e0b"/><text x="30" y="139" fill="#f59e0b" font-size="11">VLAN 30 · VoIP ☎️</text><rect x="215" y="80" width="120" height="40" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="275" y="105" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH</text><g stroke-width="2.5" fill="none"><path d="M170 50 Q205 70 215 90" stroke="#ef4444"/><path d="M170 92 Q200 96 215 100" stroke="#10b981"/><path d="M170 134 Q200 120 215 110" stroke="#f59e0b"/></g><line x1="335" y1="100" x2="430" y2="100" stroke="#8b5cf6" stroke-width="3" class="flowline"/><text x="382" y="92" fill="#8b5cf6" font-size="9" text-anchor="middle">TRUNK 802.1Q</text><rect x="430" y="80" width="118" height="40" rx="8" fill="#0d1117" stroke="#8b5cf6"/><text x="489" y="100" fill="#8b5cf6" font-size="11" text-anchor="middle">ROUTER</text><text x="489" y="114" fill="#64748b" font-size="9" text-anchor="middle">inter-VLAN</text></svg>`},
 nat_mod:{cap:"Molti indirizzi privati escono su Internet dietro un solo IP pubblico: è il PAT (NAT overload).",svg:`<svg viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">PAT · molti IP privati → 1 IP pubblico</text><rect x="10" y="30" width="128" height="26" rx="6" fill="#0d1117" stroke="#10b981"/><text x="20" y="47" fill="#10b981" font-size="11">💻 10.0.0.11</text><rect x="10" y="64" width="128" height="26" rx="6" fill="#0d1117" stroke="#10b981"/><text x="20" y="81" fill="#10b981" font-size="11">📱 10.0.0.12</text><rect x="10" y="98" width="128" height="26" rx="6" fill="#0d1117" stroke="#10b981"/><text x="20" y="115" fill="#10b981" font-size="11">🖨️ 10.0.0.13</text><g stroke="#334155" stroke-width="2"><line x1="138" y1="43" x2="220" y2="80" class="flowline"/><line x1="138" y1="77" x2="220" y2="80" class="flowline"/><line x1="138" y1="111" x2="220" y2="80" class="flowline"/></g><rect x="220" y="58" width="112" height="46" rx="9" fill="#0d1117" stroke="#f59e0b"/><text x="276" y="78" fill="#f59e0b" font-size="12" text-anchor="middle">ROUTER</text><text x="276" y="95" fill="#64748b" font-size="10" text-anchor="middle">NAT / PAT</text><text x="360" y="76" fill="#3b82f6" font-size="12">➜ 203.0.113.5</text><text x="360" y="92" fill="#64748b" font-size="10">IP pubblico</text><line x1="332" y1="81" x2="440" y2="81" stroke="#06b6d4" stroke-width="2.5" class="flowline"/><ellipse cx="500" cy="81" rx="52" ry="32" fill="#0d1117" stroke="#06b6d4"/><text x="500" y="86" fill="#06b6d4" font-size="12" text-anchor="middle">Internet</text></svg>`},
 ospf_mod:{cap:"OSPF usa il percorso a costo minore (verde). Se un link cade, ricalcola e passa al backup (tratteggiato).",svg:`<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">OSPF sceglie il percorso migliore e devia se un link cade</text><g stroke-width="3" fill="none"><line x1="84" y1="98" x2="257" y2="62" stroke="#10b981" class="flowline"/><line x1="303" y1="62" x2="476" y2="98" stroke="#10b981" class="flowline"/></g><g stroke-width="2" fill="none" stroke-dasharray="5 5"><line x1="82" y1="124" x2="258" y2="160" stroke="#64748b"/><line x1="302" y1="160" x2="478" y2="124" stroke="#64748b"/></g><circle cx="60" cy="112" r="26" fill="#0d1117" stroke="#3b82f6"/><text x="60" y="117" fill="#06b6d4" font-size="12" text-anchor="middle">R1</text><circle cx="280" cy="52" r="26" fill="#0d1117" stroke="#3b82f6"/><text x="280" y="57" fill="#06b6d4" font-size="12" text-anchor="middle">R2</text><circle cx="280" cy="170" r="26" fill="#0d1117" stroke="#3b82f6"/><text x="280" y="175" fill="#06b6d4" font-size="12" text-anchor="middle">R3</text><circle cx="500" cy="112" r="26" fill="#0d1117" stroke="#3b82f6"/><text x="500" y="117" fill="#06b6d4" font-size="12" text-anchor="middle">R4</text><text x="150" y="48" fill="#10b981" font-size="10">percorso attivo</text><text x="150" y="198" fill="#64748b" font-size="10">percorso di backup</text></svg>`},
 tcpip_mod:{cap:"TCP apre la connessione con un handshake in 3 passi prima di scambiare dati.",svg:`<svg viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">TCP · apertura connessione (3-way handshake)</text><text x="70" y="42" fill="#06b6d4" font-size="12" text-anchor="middle">CLIENT 💻</text><text x="490" y="42" fill="#f59e0b" font-size="12" text-anchor="middle">SERVER 🖥️</text><line x1="70" y1="50" x2="70" y2="182" stroke="#334155"/><line x1="490" y1="50" x2="490" y2="182" stroke="#334155"/><line x1="70" y1="82" x2="490" y2="102" stroke="#3b82f6" stroke-width="2" class="flowline"/><text x="280" y="80" fill="#3b82f6" font-size="11" text-anchor="middle">SYN →</text><line x1="490" y1="120" x2="70" y2="140" stroke="#10b981" stroke-width="2" class="flowline"/><text x="280" y="118" fill="#10b981" font-size="11" text-anchor="middle">← SYN-ACK</text><line x1="70" y1="160" x2="490" y2="176" stroke="#3b82f6" stroke-width="2" class="flowline"/><text x="280" y="158" fill="#3b82f6" font-size="11" text-anchor="middle">ACK → connessione stabilita</text></svg>`},
 switching:{cap:"Lo switch impara la MAC sorgente su ogni porta (tabella CAM) e da lì inoltra solo alla porta giusta.",svg:`<svg viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Lo switch impara i MAC e inoltra selettivamente</text><text x="60" y="52" font-size="20" text-anchor="middle">💻</text><text x="60" y="70" fill="#64748b" font-size="9" text-anchor="middle">Fa0/1</text><text x="60" y="150" font-size="20" text-anchor="middle">📱</text><text x="60" y="168" fill="#64748b" font-size="9" text-anchor="middle">Fa0/2</text><text x="500" y="52" font-size="20" text-anchor="middle">🖨️</text><text x="500" y="70" fill="#64748b" font-size="9" text-anchor="middle">Fa0/3</text><g stroke="#334155" stroke-width="2"><line x1="74" y1="48" x2="205" y2="84"/><line x1="74" y1="146" x2="205" y2="100"/><line x1="355" y1="90" x2="486" y2="48"/></g><rect x="205" y="72" width="150" height="40" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="280" y="97" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH · L2</text><rect x="185" y="128" width="190" height="60" rx="6" fill="#020408" stroke="#1f2d3d"/><text x="197" y="146" fill="#10b981" font-size="9">MAC            PORTA</text><text x="197" y="162" fill="#94a3b8" font-size="9">aaaa.1111      Fa0/1</text><text x="197" y="177" fill="#94a3b8" font-size="9">bbbb.2222      Fa0/2</text></svg>`},
 ipv6_mod:{cap:"128 bit divisi in prefisso di rete (/64) e Interface ID. La compressione elimina gli zeri.",svg:`<svg viewBox="0 0 560 150" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Struttura di un indirizzo IPv6 (128 bit)</text><rect x="20" y="32" width="245" height="46" rx="6" fill="rgba(59,130,246,.10)" stroke="#3b82f6"/><text x="142" y="53" fill="#3b82f6" font-size="11" text-anchor="middle">Prefisso di rete</text><text x="142" y="70" fill="#64748b" font-size="9" text-anchor="middle">64 bit · routing</text><rect x="272" y="32" width="245" height="46" rx="6" fill="rgba(16,185,129,.10)" stroke="#10b981"/><text x="394" y="53" fill="#10b981" font-size="11" text-anchor="middle">Interface ID</text><text x="394" y="70" fill="#64748b" font-size="9" text-anchor="middle">64 bit · host / SLAAC</text><text x="20" y="104" fill="#94a3b8" font-size="11">2001:0db8:0000:0000 : 0000:0000:0000:0001</text><text x="20" y="126" fill="#06b6d4" font-size="11">→ 2001:db8::1  ·  loopback ::1  ·  link-local fe80::/10</text></svg>`},
 wifi_mod:{cap:"Un WLC gestisce più Access Point; i client si associano allo stesso SSID e passano da un AP all'altro (roaming).",svg:`<svg viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Il WLC gestisce gli AP · i client si associano all'SSID</text><rect x="220" y="28" width="120" height="38" rx="8" fill="#0d1117" stroke="#8b5cf6"/><text x="280" y="52" fill="#8b5cf6" font-size="12" text-anchor="middle">WLC</text><rect x="55" y="100" width="96" height="34" rx="7" fill="#0d1117" stroke="#3b82f6"/><text x="103" y="122" fill="#06b6d4" font-size="12" text-anchor="middle">AP 📡</text><rect x="409" y="100" width="96" height="34" rx="7" fill="#0d1117" stroke="#3b82f6"/><text x="457" y="122" fill="#06b6d4" font-size="12" text-anchor="middle">AP 📡</text><g stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 3"><line x1="235" y1="64" x2="120" y2="100"/><line x1="325" y1="64" x2="440" y2="100"/></g><text x="103" y="172" font-size="17" text-anchor="middle">📱 💻</text><text x="457" y="172" font-size="17" text-anchor="middle">📟 📱</text><g stroke="#10b981" stroke-width="1.5" class="flowline"><line x1="103" y1="136" x2="103" y2="156"/><line x1="457" y1="136" x2="457" y2="156"/></g><text x="280" y="150" fill="#10b981" font-size="11" text-anchor="middle">SSID: "KN-Warehouse" · WPA3</text></svg>`},
 redun_mod:{cap:"HSRP dà un gateway virtuale ridondante (Active/Standby); EtherChannel aggrega più link verso lo switch.",svg:`<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">Gateway ridondante (HSRP) + link aggregati (EtherChannel)</text><rect x="55" y="40" width="125" height="42" rx="8" fill="#0d1117" stroke="#10b981"/><text x="117" y="60" fill="#10b981" font-size="11" text-anchor="middle">R1 · ACTIVE</text><text x="117" y="75" fill="#64748b" font-size="9" text-anchor="middle">HSRP</text><rect x="380" y="40" width="125" height="42" rx="8" fill="#0d1117" stroke="#64748b"/><text x="442" y="60" fill="#94a3b8" font-size="11" text-anchor="middle">R2 · STANDBY</text><text x="442" y="75" fill="#64748b" font-size="9" text-anchor="middle">HSRP</text><rect x="220" y="45" width="120" height="32" rx="16" fill="rgba(59,130,246,.10)" stroke="#3b82f6"/><text x="280" y="65" fill="#3b82f6" font-size="11" text-anchor="middle">IP virtuale .1</text><line x1="180" y1="61" x2="220" y2="61" stroke="#3b82f6" stroke-width="2"/><line x1="340" y1="61" x2="380" y2="61" stroke="#64748b" stroke-width="2" stroke-dasharray="4 3"/><rect x="220" y="152" width="120" height="38" rx="8" fill="#0d1117" stroke="#06b6d4"/><text x="280" y="176" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH</text><g stroke="#f59e0b" stroke-width="2.5" class="flowline"><line x1="252" y1="82" x2="264" y2="152"/><line x1="260" y1="82" x2="272" y2="152"/></g><text x="330" y="120" fill="#f59e0b" font-size="9">EtherChannel</text><line x1="120" y1="82" x2="238" y2="152" stroke="#334155" stroke-width="1.5"/><line x1="440" y1="82" x2="322" y2="152" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 3"/></svg>`},
 ipserv_mod:{cap:"DHCP assegna l'IP in quattro passi: Discover, Offer, Request, Ack (DORA).",svg:`<svg viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="16" fill="#64748b" font-size="11">DHCP · il client ottiene l'IP in 4 passi (DORA)</text><text x="70" y="42" fill="#06b6d4" font-size="12" text-anchor="middle">CLIENT 📟</text><text x="490" y="42" fill="#f59e0b" font-size="12" text-anchor="middle">DHCP 🖥️</text><line x1="70" y1="50" x2="70" y2="172" stroke="#334155"/><line x1="490" y1="50" x2="490" y2="172" stroke="#334155"/><line x1="70" y1="74" x2="490" y2="88" stroke="#3b82f6" stroke-width="2" class="flowline"/><text x="280" y="72" fill="#3b82f6" font-size="11" text-anchor="middle">1. Discover →</text><line x1="490" y1="102" x2="70" y2="114" stroke="#10b981" stroke-width="2" class="flowline"/><text x="280" y="100" fill="#10b981" font-size="11" text-anchor="middle">← 2. Offer</text><line x1="70" y1="128" x2="490" y2="140" stroke="#3b82f6" stroke-width="2" class="flowline"/><text x="280" y="126" fill="#3b82f6" font-size="11" text-anchor="middle">3. Request →</text><line x1="490" y1="154" x2="70" y2="166" stroke="#10b981" stroke-width="2" class="flowline"/><text x="280" y="152" fill="#10b981" font-size="11" text-anchor="middle">← 4. Ack (lease)</text></svg>`},
 duplex:{cap:"Full-duplex: TX e RX viaggiano insieme su coppie separate, senza collisioni.",svg:`<svg viewBox="0 0 560 140" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Full-duplex: invio e ricezione contemporanei, nessuna collisione</text><rect x="30" y="50" width="120" height="46" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="90" y="78" fill="#06b6d4" font-size="13" text-anchor="middle">PC 💻</text><rect x="410" y="50" width="120" height="46" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="470" y="78" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH</text><line x1="150" y1="64" x2="410" y2="64" stroke="#10b981" stroke-width="2.5" class="flowline"/><text x="280" y="56" fill="#10b981" font-size="11" text-anchor="middle">TX →</text><line x1="410" y1="86" x2="150" y2="86" stroke="#06b6d4" stroke-width="2.5" class="flowline"/><text x="280" y="108" fill="#06b6d4" font-size="11" text-anchor="middle">← RX</text></svg>`},
 udp:{cap:"UDP invia i datagram senza connessione né conferme: se uno si perde, non viene ritrasmesso.",svg:`<svg viewBox="0 0 560 155" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">UDP: invio senza connessione, nessuna conferma (ACK)</text><rect x="20" y="52" width="120" height="46" rx="9" fill="#0d1117" stroke="#06b6d4"/><text x="80" y="80" fill="#06b6d4" font-size="12" text-anchor="middle">Mittente</text><rect x="420" y="52" width="120" height="46" rx="9" fill="#0d1117" stroke="#06b6d4"/><text x="480" y="80" fill="#06b6d4" font-size="11" text-anchor="middle">Destinatario</text><line x1="140" y1="64" x2="420" y2="64" stroke="#3b82f6" stroke-width="2" class="flowline"/><line x1="140" y1="80" x2="420" y2="80" stroke="#3b82f6" stroke-width="2" class="flowline"/><line x1="140" y1="96" x2="330" y2="96" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3"/><text x="280" y="46" fill="#3b82f6" font-size="10" text-anchor="middle">datagram →</text><text x="300" y="118" fill="#ef4444" font-size="10">✗ perso: nessuna ritrasmissione</text></svg>`},
 static_route:{cap:"Il routing statico: l'amministratore inserisce a mano la rotta, che compare nella tabella.",svg:`<svg viewBox="0 0 560 150" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Routing statico: la rotta è scritta a mano dall'amministratore</text><rect x="20" y="42" width="86" height="42" rx="9" fill="#0d1117" stroke="#f59e0b"/><text x="63" y="68" fill="#f59e0b" font-size="12" text-anchor="middle">R1 📡</text><rect x="126" y="34" width="424" height="102" rx="8" fill="#020408" stroke="#1f2d3d"/><text x="142" y="58" fill="#06b6d4" font-size="11">R1(config)# ip route 10.0.0.0 255.255.255.0 192.168.1.2</text><text x="142" y="86" fill="#64748b" font-size="11">→ Tabella di routing:</text><text x="142" y="110" fill="#10b981" font-size="12">S  10.0.0.0/24 [1/0] via 192.168.1.2</text></svg>`},
 default_route:{cap:"La default route 0.0.0.0/0 cattura tutto ciò che non ha una rotta più specifica (verso Internet).",svg:`<svg viewBox="0 0 560 175" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Default route: dove va ciò che non ha una rotta specifica</text><rect x="16" y="38" width="310" height="122" rx="8" fill="#020408" stroke="#1f2d3d"/><text x="32" y="60" fill="#64748b" font-size="11">Tabella di routing</text><text x="32" y="86" fill="#10b981" font-size="12">C   192.168.1.0/24  (locale)</text><text x="32" y="110" fill="#94a3b8" font-size="12">S   10.0.0.0/24  via 192.168.1.2</text><text x="32" y="138" fill="#f59e0b" font-size="12">S*  0.0.0.0/0  →  ISP</text><ellipse cx="472" cy="100" rx="66" ry="40" fill="#0d1117" stroke="#06b6d4"/><text x="472" y="104" fill="#06b6d4" font-size="12" text-anchor="middle">Internet</text><line x1="326" y1="132" x2="406" y2="102" stroke="#f59e0b" stroke-width="2.5" class="flowline"/></svg>`},
 admin_distance:{cap:"Distanza amministrativa: se più fonti offrono la stessa rotta, vince quella con AD più bassa.",svg:`<svg viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Distanza amministrativa (AD): più bassa = più affidabile → vince</text><text x="30" y="48" fill="#10b981" font-size="12">Connessa</text><rect x="470" y="36" width="60" height="18" rx="9" fill="rgba(16,185,129,.15)"/><text x="500" y="49" fill="#10b981" font-size="11" text-anchor="middle">AD 0</text><text x="30" y="76" fill="#10b981" font-size="12">Statica</text><rect x="470" y="64" width="60" height="18" rx="9" fill="rgba(16,185,129,.15)"/><text x="500" y="77" fill="#10b981" font-size="11" text-anchor="middle">AD 1</text><text x="30" y="104" fill="#06b6d4" font-size="12">EIGRP</text><rect x="470" y="92" width="60" height="18" rx="9" fill="rgba(6,182,212,.15)"/><text x="500" y="105" fill="#06b6d4" font-size="11" text-anchor="middle">AD 90</text><text x="30" y="132" fill="#3b82f6" font-size="12">OSPF</text><rect x="466" y="120" width="64" height="18" rx="9" fill="rgba(59,130,246,.15)"/><text x="498" y="133" fill="#3b82f6" font-size="11" text-anchor="middle">AD 110</text><text x="30" y="160" fill="#64748b" font-size="12">RIP</text><rect x="466" y="148" width="64" height="18" rx="9" fill="rgba(100,116,139,.2)"/><text x="498" y="161" fill="#94a3b8" font-size="11" text-anchor="middle">AD 120</text><text x="120" y="180" fill="#64748b" font-size="10">↑ preferito</text></svg>`},
 wildcard:{cap:"La wildcard mask è la subnet mask invertita: 0 = 'deve combaciare', 1 = 'qualsiasi'.",svg:`<svg viewBox="0 0 560 160" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Wildcard mask = subnet mask invertita (0 = combacia · 1 = qualsiasi)</text><text x="20" y="52" fill="#94a3b8" font-size="11">Subnet mask</text><g font-size="13" text-anchor="middle" fill="#3b82f6" font-family="JetBrains Mono, monospace"><rect x="150" y="38" width="90" height="26" rx="5" fill="#0d1117" stroke="#3b82f6"/><text x="195" y="56">255</text><rect x="248" y="38" width="90" height="26" rx="5" fill="#0d1117" stroke="#3b82f6"/><text x="293" y="56">255</text><rect x="346" y="38" width="90" height="26" rx="5" fill="#0d1117" stroke="#3b82f6"/><text x="391" y="56">255</text><rect x="444" y="38" width="90" height="26" rx="5" fill="#0d1117" stroke="#3b82f6"/><text x="489" y="56">0</text></g><text x="20" y="98" fill="#94a3b8" font-size="11">Wildcard</text><g font-size="13" text-anchor="middle" fill="#10b981" font-family="JetBrains Mono, monospace"><rect x="150" y="84" width="90" height="26" rx="5" fill="#0d1117" stroke="#10b981"/><text x="195" y="102">0</text><rect x="248" y="84" width="90" height="26" rx="5" fill="#0d1117" stroke="#10b981"/><text x="293" y="102">0</text><rect x="346" y="84" width="90" height="26" rx="5" fill="#0d1117" stroke="#10b981"/><text x="391" y="102">0</text><rect x="444" y="84" width="90" height="26" rx="5" fill="#0d1117" stroke="#10b981"/><text x="489" y="102">255</text></g><text x="20" y="140" fill="#64748b" font-size="11">/24 → wildcard 0.0.0.255 · usata in OSPF (network) e nelle ACL</text></svg>`},
 acl:{cap:"Le regole ACL si valutano in ordine dall'alto: vince la prima corrispondenza; in fondo un deny implicito.",svg:`<svg viewBox="0 0 560 185" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">ACL: valutazione top-down, la prima corrispondenza vince</text><rect x="16" y="34" width="470" height="30" rx="6" fill="rgba(16,185,129,.08)" stroke="#10b981"/><text x="28" y="53" fill="#10b981" font-size="11">1  permit tcp 192.168.1.0/24 any eq 443</text><text x="500" y="53" fill="#10b981" font-size="14">✓</text><rect x="16" y="70" width="470" height="30" rx="6" fill="rgba(16,185,129,.08)" stroke="#10b981"/><text x="28" y="89" fill="#10b981" font-size="11">2  permit tcp 192.168.1.0/24 any eq 80</text><text x="500" y="89" fill="#10b981" font-size="14">✓</text><rect x="16" y="106" width="470" height="30" rx="6" fill="rgba(239,68,68,.08)" stroke="#ef4444" stroke-dasharray="5 4"/><text x="28" y="125" fill="#ef4444" font-size="11">3  deny ip any any   (implicito)</text><text x="500" y="125" fill="#ef4444" font-size="14">✗</text><text x="16" y="160" fill="#64748b" font-size="11">Se nessuna regola combacia, il deny implicito scarta il pacchetto.</text></svg>`},
 ssh_telnet:{cap:"SSH cifra la sessione di gestione (porta 22); Telnet la trasmette in chiaro (porta 23).",svg:`<svg viewBox="0 0 560 165" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Gestione remota: SSH cifrato vs Telnet in chiaro</text><rect x="20" y="60" width="110" height="46" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="75" y="88" fill="#06b6d4" font-size="12" text-anchor="middle">Admin 🧑‍💻</text><rect x="430" y="60" width="110" height="46" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="485" y="88" fill="#06b6d4" font-size="12" text-anchor="middle">Router</text><line x1="130" y1="72" x2="430" y2="72" stroke="#10b981" stroke-width="2.5"/><text x="280" y="66" fill="#10b981" font-size="11" text-anchor="middle">🔒 SSH :22 — cifrato</text><line x1="130" y1="98" x2="430" y2="98" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="5 4"/><text x="280" y="118" fill="#ef4444" font-size="11" text-anchor="middle">🔓 Telnet :23 — in chiaro (evitare)</text></svg>`},
 port_security:{cap:"La port security consente solo i MAC autorizzati su una porta: un dispositivo estraneo fa scattare la violazione.",svg:`<svg viewBox="0 0 560 185" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">Port security: solo i MAC autorizzati; l'intruso viene bloccato</text><rect x="220" y="72" width="120" height="42" rx="8" fill="#0d1117" stroke="#06b6d4"/><text x="280" y="98" fill="#06b6d4" font-size="12" text-anchor="middle">SWITCH</text><rect x="30" y="40" width="130" height="40" rx="8" fill="#0d1117" stroke="#10b981"/><text x="95" y="60" fill="#10b981" font-size="11" text-anchor="middle">PC autorizzato</text><text x="95" y="74" fill="#64748b" font-size="9" text-anchor="middle">MAC aaaa.1111</text><line x1="160" y1="66" x2="220" y2="86" stroke="#10b981" stroke-width="2"/><text x="188" y="80" fill="#10b981" font-size="13">✓</text><rect x="30" y="112" width="130" height="40" rx="8" fill="#0d1117" stroke="#ef4444"/><text x="95" y="132" fill="#ef4444" font-size="11" text-anchor="middle">Intruso</text><text x="95" y="146" fill="#64748b" font-size="9" text-anchor="middle">MAC bbbb.2222</text><line x1="160" y1="132" x2="220" y2="104" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 4"/><text x="188" y="130" fill="#ef4444" font-size="13">✗</text><text x="360" y="90" fill="#ef4444" font-size="11">violazione → shutdown</text></svg>`},
 aaa:{cap:"AAA: il router (NAS) verifica l'utente presso un server RADIUS/TACACS+ per accesso e tracciamento.",svg:`<svg viewBox="0 0 560 165" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">AAA: autenticazione centralizzata via RADIUS / TACACS+</text><rect x="16" y="52" width="120" height="44" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="76" y="79" fill="#06b6d4" font-size="12" text-anchor="middle">Utente 🧑</text><rect x="220" y="52" width="120" height="44" rx="9" fill="#0d1117" stroke="#f59e0b"/><text x="280" y="74" fill="#f59e0b" font-size="12" text-anchor="middle">Router</text><text x="280" y="90" fill="#64748b" font-size="9" text-anchor="middle">NAS</text><rect x="424" y="52" width="120" height="44" rx="9" fill="#0d1117" stroke="#10b981"/><text x="484" y="74" fill="#10b981" font-size="12" text-anchor="middle">Server AAA</text><text x="484" y="90" fill="#64748b" font-size="9" text-anchor="middle">RADIUS/TACACS+</text><line x1="136" y1="74" x2="220" y2="74" stroke="#334155" stroke-width="2" class="flowline"/><line x1="340" y1="74" x2="424" y2="74" stroke="#334155" stroke-width="2" class="flowline"/><text x="280" y="130" fill="#64748b" font-size="11" text-anchor="middle"><tspan fill="#3b82f6">Authentication</tspan> · <tspan fill="#06b6d4">Authorization</tspan> · <tspan fill="#10b981">Accounting</tspan></text></svg>`},
 qos:{cap:"La QoS mette il traffico prioritario (voce/video) in una coda che passa davanti al traffico best-effort.",svg:`<svg viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">QoS: la voce ha priorità e passa davanti al traffico dati</text><rect x="16" y="40" width="250" height="40" rx="8" fill="rgba(239,68,68,.06)" stroke="#ef4444"/><text x="26" y="64" fill="#ef4444" font-size="11">Coda prioritaria: 🎙️ voce · 🎥 video</text><rect x="16" y="96" width="250" height="40" rx="8" fill="rgba(100,116,139,.08)" stroke="#64748b"/><text x="26" y="120" fill="#94a3b8" font-size="11">Best-effort: 📧 email · ⬇️ download</text><path d="M266 60 Q330 60 360 82" fill="none" stroke="#ef4444" stroke-width="2.5" class="flowline"/><path d="M266 116 Q330 116 360 94" fill="none" stroke="#64748b" stroke-width="2"/><rect x="360" y="66" width="80" height="44" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="400" y="92" fill="#06b6d4" font-size="11" text-anchor="middle">Scheduler</text><line x1="440" y1="88" x2="520" y2="88" stroke="#3b82f6" stroke-width="2.5" class="flowline"/><text x="500" y="80" fill="#64748b" font-size="10" text-anchor="middle">link</text><text x="300" y="160" fill="#64748b" font-size="10">Quando la banda è satura, la voce parte per prima.</text></svg>`},
 ipsec:{cap:"IPSec crea un tunnel cifrato tra i gateway di due sedi, attraverso la rete pubblica.",svg:`<svg viewBox="0 0 560 175" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">IPSec: tunnel cifrato tra due sedi attraverso Internet</text><rect x="16" y="60" width="80" height="46" rx="9" fill="#0d1117" stroke="#10b981"/><text x="56" y="82" fill="#10b981" font-size="11" text-anchor="middle">Sede A</text><text x="56" y="98" fill="#64748b" font-size="9" text-anchor="middle">LAN + GW</text><rect x="464" y="60" width="80" height="46" rx="9" fill="#0d1117" stroke="#10b981"/><text x="504" y="82" fill="#10b981" font-size="11" text-anchor="middle">Sede B</text><text x="504" y="98" fill="#64748b" font-size="9" text-anchor="middle">LAN + GW</text><ellipse cx="280" cy="83" rx="120" ry="46" fill="#0d1117" stroke="#06b6d4"/><text x="280" y="60" fill="#06b6d4" font-size="11" text-anchor="middle">Internet</text><line x1="96" y1="83" x2="464" y2="83" stroke="#8b5cf6" stroke-width="3" class="flowline"/><text x="280" y="100" fill="#8b5cf6" font-size="11" text-anchor="middle">🔒 tunnel IPSec (ESP)</text></svg>`},
 mpls:{cap:"In MPLS il provider inoltra in base a un'etichetta: push all'ingresso, swap nel core, pop all'uscita.",svg:`<svg viewBox="0 0 560 160" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">MPLS: inoltro per etichetta (label), non per IP</text><rect x="14" y="62" width="70" height="40" rx="8" fill="#0d1117" stroke="#10b981"/><text x="49" y="86" fill="#10b981" font-size="11" text-anchor="middle">CE</text><rect x="120" y="62" width="90" height="40" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="165" y="80" fill="#06b6d4" font-size="11" text-anchor="middle">PE</text><text x="165" y="95" fill="#64748b" font-size="9" text-anchor="middle">push 17</text><rect x="246" y="62" width="90" height="40" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="291" y="80" fill="#06b6d4" font-size="11" text-anchor="middle">P</text><text x="291" y="95" fill="#64748b" font-size="9" text-anchor="middle">swap 17→22</text><rect x="372" y="62" width="90" height="40" rx="8" fill="#0d1117" stroke="#3b82f6"/><text x="417" y="80" fill="#06b6d4" font-size="11" text-anchor="middle">PE</text><text x="417" y="95" fill="#64748b" font-size="9" text-anchor="middle">pop</text><rect x="476" y="62" width="70" height="40" rx="8" fill="#0d1117" stroke="#10b981"/><text x="511" y="86" fill="#10b981" font-size="11" text-anchor="middle">CE</text><g stroke="#f59e0b" stroke-width="2.5" class="flowline"><line x1="84" y1="82" x2="120" y2="82"/><line x1="210" y1="82" x2="246" y2="82"/><line x1="336" y1="82" x2="372" y2="82"/><line x1="462" y1="82" x2="476" y2="82"/></g></svg>`},
 sdn:{cap:"SDN separa il controller (control plane) dagli switch (data plane), programmati via API.",svg:`<svg viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">SDN: un controller centrale programma gli switch</text><rect x="200" y="30" width="160" height="30" rx="7" fill="#0d1117" stroke="#8b5cf6"/><text x="280" y="50" fill="#8b5cf6" font-size="11" text-anchor="middle">App / Orchestrazione</text><text x="368" y="78" fill="#64748b" font-size="9">Northbound API</text><rect x="200" y="80" width="160" height="34" rx="7" fill="#0d1117" stroke="#06b6d4"/><text x="280" y="101" fill="#06b6d4" font-size="12" text-anchor="middle">Controller SDN</text><text x="368" y="132" fill="#64748b" font-size="9">Southbound API</text><line x1="280" y1="60" x2="280" y2="80" stroke="#334155" stroke-width="2"/><g stroke="#334155" stroke-width="2"><line x1="280" y1="114" x2="120" y2="150"/><line x1="280" y1="114" x2="280" y2="150"/><line x1="280" y1="114" x2="440" y2="150"/></g><g><rect x="80" y="150" width="80" height="28" rx="6" fill="#0d1117" stroke="#3b82f6"/><text x="120" y="169" fill="#06b6d4" font-size="10" text-anchor="middle">Switch</text><rect x="240" y="150" width="80" height="28" rx="6" fill="#0d1117" stroke="#3b82f6"/><text x="280" y="169" fill="#06b6d4" font-size="10" text-anchor="middle">Switch</text><rect x="400" y="150" width="80" height="28" rx="6" fill="#0d1117" stroke="#3b82f6"/><text x="440" y="169" fill="#06b6d4" font-size="10" text-anchor="middle">Switch</text></g></svg>`},
 rest:{cap:"Una REST API automatizza i dispositivi via HTTP: GET legge, POST crea, PUT aggiorna, DELETE elimina.",svg:`<svg viewBox="0 0 560 165" xmlns="http://www.w3.org/2000/svg" font-family="JetBrains Mono, monospace"><text x="10" y="18" fill="#64748b" font-size="11">REST API: automazione via HTTP, dati in JSON</text><rect x="20" y="58" width="130" height="46" rx="9" fill="#0d1117" stroke="#8b5cf6"/><text x="85" y="80" fill="#8b5cf6" font-size="12" text-anchor="middle">Script / Client</text><text x="85" y="96" fill="#64748b" font-size="9" text-anchor="middle">Python · Postman</text><rect x="410" y="58" width="130" height="46" rx="9" fill="#0d1117" stroke="#3b82f6"/><text x="475" y="80" fill="#06b6d4" font-size="12" text-anchor="middle">Dispositivo</text><text x="475" y="96" fill="#64748b" font-size="9" text-anchor="middle">API server</text><line x1="150" y1="72" x2="410" y2="72" stroke="#3b82f6" stroke-width="2" class="flowline"/><text x="280" y="66" fill="#3b82f6" font-size="10" text-anchor="middle">GET / POST / PUT / DELETE →</text><line x1="410" y1="92" x2="150" y2="92" stroke="#10b981" stroke-width="2" class="flowline"/><text x="280" y="112" fill="#10b981" font-size="10" text-anchor="middle">← 200 OK · JSON</text></svg>`}
};
const ENGINES={match:engineMatch,calc:engineCalc,order:engineOrder,cli:engineCli,bits:engineBits,flow:engineFlow,subnetviz:engineSubnetViz,assemble:engineAssemble,truefalse:engineTrueFalse};
// ── FLUSSO LIVELLO ──
function setPlayStep(s){
  const order=['learn','game','quiz','done'];const idx=order.indexOf(s);
  order.forEach((k,i)=>{const e=_id('pstep-'+k);if(!e)return;e.classList.remove('cur','ok');if(i<idx)e.classList.add('ok');else if(i===idx)e.classList.add('cur');});
}
function hidePlayPanels(){['play-learn','play-game','play-quiz','play-done'].forEach(id=>{const e=_id(id);if(e)e.style.display='none';});}
function startLevel(mod){
  LP.mod=mod;
  if(!G.modules[mod.id].completed) G.modules[mod.id].progress=Math.max(G.modules[mod.id].progress||0,10);
  saveG();
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  _id('view-play').classList.add('active');
  _id('play-icon').textContent=mod.icon;_id('play-title').textContent=mod.title;_id('play-sub').textContent=mod.sub;
  hidePlayPanels();
  setPlayStep('learn');
  renderLearn(mod);
}
// FASE 1 · IMPARA — briefing con scenario reale + punti chiave d'esame + esempio
function renderLearn(mod){
  const b=BRIEF[mod.id];const wrap=_id('play-learn');wrap.style.display='block';wrap.innerHTML='';
  if(!b){startGamePhase(mod);return;}
  const dg=DIAGRAM[mod.id];
  if(dg){const cd=el('div','brief-card brief-diagram');cd.appendChild(el('div','brief-label','🖼️ Ricostruzione grafica'));cd.appendChild(el('div','',dg.svg));if(dg.cap)cd.appendChild(el('div','diag-cap',dg.cap));wrap.appendChild(cd);}
  const c1=el('div','brief-card');c1.appendChild(el('div','brief-label','🌍 Nel mondo reale'));c1.style.borderLeftColor='var(--cyan)';
  c1.querySelector('.brief-label').style.color='var(--cyan)';c1.appendChild(el('div','brief-text',b.real));wrap.appendChild(c1);
  const xt=BRIEF_EXTRA[mod.id];
  if(xt&&xt.kn){const ck=el('div','brief-card kn');ck.appendChild(el('div','brief-label','🏢 In Kuehne+Nagel<span class="kn-tag">LOGISTICA</span>'));ck.appendChild(el('div','brief-text',xt.kn));wrap.appendChild(ck);}
  if(xt&&xt.home){const ch=el('div','brief-card home');ch.appendChild(el('div','brief-label','🏠 Nella vita di tutti i giorni'));ch.appendChild(el('div','brief-text',xt.home));wrap.appendChild(ch);}
  const c2=el('div','brief-card');c2.style.borderLeftColor='var(--orange)';const l2=el('div','brief-label','📌 Punti chiave d\'esame');l2.style.color='var(--orange)';c2.appendChild(l2);
  const ul=el('ul','brief-list');b.key.forEach(k=>{const li=document.createElement('li');li.innerHTML=k;ul.appendChild(li);});c2.appendChild(ul);wrap.appendChild(c2);
  if(b.ex){const c3=el('div','brief-card');c3.style.borderLeftColor='var(--green)';const l3=el('div','brief-label','💻 Esempio pratico');l3.style.color='var(--green)';c3.appendChild(l3);c3.appendChild(el('div','brief-code',b.ex));wrap.appendChild(c3);}
  const btn=el('button','hero-cta',LEVELS[mod.id]?'▶ Inizia il gioco':'▶ Vai alla simulazione');btn.onclick=()=>startGamePhase(mod);wrap.appendChild(btn);
}
function startGamePhase(mod){
  hidePlayPanels();
  const cfg=LEVELS[mod.id];
  if(!cfg){setPlayStep('quiz');startConsolidation();return;}
  setPlayStep('game');_id('play-game').style.display='block';
  ENGINES[cfg.engine](_id('play-game'),cfg.data,onGameDone);
}
function onGameDone(){showToast('✓ Gioco completato! Ora il consolidamento','var(--green)');startConsolidation();}
// ── GENERATORI DI DOMANDE A TEMA (varietà infinita, fedeli all'argomento) ──
function shuffleOpts(correct,others){const o=[correct].concat(others);qShuffle(o);return{o:o,c:o.indexOf(correct)};}
function genFromMatch(modId){const d=LEVELS[modId]&&LEVELS[modId].data;if(!d||!d.items||!d.cats)return null;const it=d.items[rnd(0,d.items.length-1)];const b=shuffleOpts(it.c,d.cats.filter(c=>c!==it.c));return{q:'Classifica correttamente: '+it.n+(it.h?' — '+it.h:''),o:b.o,c:b.c,e:it.n+' → '+it.c};}
function genFromTF(modId){const d=LEVELS[modId]&&LEVELS[modId].data;if(!d||!d.items)return null;const it=d.items[rnd(0,d.items.length-1)];return{q:'Vero o Falso: '+it.s,o:['Vero','Falso'],c:it.t?0:1,e:it.e};}
function uniqNums(correct,cands,k){const out=[];for(const c of cands){if(c!==correct&&out.indexOf(c)<0){out.push(c);if(out.length>=k)break;}}return out;}
function genBinaryMCQ(){const d=rnd(1,255);if(rnd(0,1)===0){const bin=d.toString(2).padStart(8,'0'),cor=String(d);const w=uniqNums(cor,[String((d+8)%256),String((d-8+256)%256),String(255-d),String(d^0x0f),String((d+1)%256)],3);const b=shuffleOpts(cor,w);return{q:'Quanto vale in decimale '+bin+'?',o:b.o,c:b.c,e:bin+' = '+d};}const hex='0x'+d.toString(16).toUpperCase(),cor=String(d);const w=uniqNums(cor,[String((d+16)%256),String((d-16+256)%256),String(255-d),String(d^0xff)],3);const b=shuffleOpts(cor,w);return{q:'Quanto vale in decimale '+hex+'?',o:b.o,c:b.c,e:hex+' = '+d};}
function maskOf(c){return intToIp((0xffffffff<<(32-c))>>>0);}
function genSubnetMCQ(){const c=rnd(24,30);if(rnd(0,1)===0){const hosts=Math.pow(2,32-c)-2,cor=String(hosts);const w=uniqNums(cor,[String(Math.pow(2,32-c)),String(Math.pow(2,32-(c-1))-2),String(Math.pow(2,33-c)-2),String(hosts+2)],3);const b=shuffleOpts(cor,w);return{q:'Quanti host utilizzabili offre una /'+c+'?',o:b.o,c:b.c,e:'/'+c+' → 2^'+(32-c)+' − 2 = '+hosts+' host'};}const cor=maskOf(c);const w=uniqNums(cor,[maskOf(c-1),maskOf(c+1),maskOf(c>=29?26:c+2)],3);const b=shuffleOpts(cor,w);return{q:'Qual è la subnet mask di una /'+c+'?',o:b.o,c:b.c,e:'/'+c+' = '+cor};}
const QGEN={osi_mod:genFromMatch,ip_addr:genFromMatch,wifi_mod:genFromMatch,switching:genFromTF,eigrp_mod:genFromTF,wan_mod:genFromTF,auto_mod:genFromTF,binary:genBinaryMCQ,subnetting:genSubnetMCQ,boss1:genSubnetMCQ};
function genQuizFor(modId,k){const f=QGEN[modId];if(!f)return[];const seen={},out=[];let t=0;while(out.length<k&&t<k*6){t++;const q=f(modId);if(q&&!seen[q.q]){seen[q.q]=1;out.push(q);}}return out;}
function moduleOfQuestion(text){for(const k in QBANK){if(QBANK[k].some(q=>q.q===text))return k;}return LP.mod?LP.mod.id:'osi_mod';}
// mappa modulo -> termine del glossario (scheda con definizione, approfondimento e diagramma)
const GLOSS_MAP={net_basics:"LAN",binary:"Subnet mask",osi_mod:"Modello OSI",tcpip_mod:"TCP",ip_addr:"Indirizzo IP privato",subnetting:"CIDR",boss1:"CIDR",switching:"Switch",vlan_mod:"VLAN",routing_s:"Routing statico",ospf_mod:"OSPF",eigrp_mod:"EIGRP",boss2:"OSPF",acl_mod:"ACL",nat_mod:"NAT",ssh_sec:"SSH",boss3:"Port security",ipv6_mod:"IPv6",wan_mod:"IPSec",auto_mod:"SDN",wifi_mod:"SSID",redun_mod:"STP",ipserv_mod:"DHCP",ccna_cert:"Modello OSI"};
function glossForQuestion(text,modId){
  if(text){const lo=text.toLowerCase();const cand=GLOSSARY.filter(g=>lo.indexOf(g.t.toLowerCase())>=0&&g.t.length>=4).sort((a,b)=>b.t.length-a.t.length);if(cand.length)return cand[0];}
  const term=GLOSS_MAP[modId];return term&&GLOSSARY.find(x=>x.t===term);
}
function openTheory(modId,qtext){const g=glossForQuestion(qtext,modId)||(GLOSS_MAP[modId]&&GLOSSARY.find(x=>x.t===GLOSS_MAP[modId]));if(g)openGlossModal(g);}
// mostra la scheda del glossario in un overlay: NON cambia schermata, così il resoconto resta sotto e si può tornare a rivedere gli errori
function openGlossModal(g){
  const x=GLOSS_MORE[g.t]||{};const dg=x.diag&&DIAGRAM[x.diag];
  const body=_id('gloss-modal-body');body.innerHTML=
    '<div class="gloss-detail-term">'+g.t+'</div>'+
    '<div class="gloss-sec-h">Definizione</div><div class="gloss-detail-def">'+g.d+'</div>'+
    (x.more?'<div class="gloss-sec-h">🔎 Approfondimento</div><div class="gloss-detail-more">'+x.more+'</div>':'')+
    (dg?'<div class="gloss-sec-h">🖼️ Esempio grafico</div><div class="brief-diagram">'+dg.svg+(dg.cap?'<div class="diag-cap">'+dg.cap+'</div>':'')+'</div>':'');
  if(x.diag){
    const rel=GLOSSARY.filter(o=>o.t!==g.t&&(GLOSS_MORE[o.t]||{}).diag===x.diag).slice(0,6);
    if(rel.length){const box=document.createElement('div');box.innerHTML='<div class="gloss-sec-h">↔ Termini collegati</div>';const chips=el('div','gloss-rel');rel.forEach(o=>{const b=el('button','gloss-rel-chip',o.t);b.onclick=()=>openGlossModal(o);chips.appendChild(b);});box.appendChild(chips);body.appendChild(box);}
  }
  _id('gloss-modal').classList.add('show');
}
function closeGlossModal(){_id('gloss-modal').classList.remove('show');}
function startConsolidation(){
  setPlayStep('quiz');
  _id('play-game').style.display='none';_id('play-done').style.display='none';
  _id('play-quiz').style.display='block';
  const mod=LP.mod;
  LP.quiz={n:(mod.type==='cert'?20:mod.type==='boss'?6:4),cur:0,ok:0,answered:false,round:1};
  LP.answers=[]; // storico completo di TUTTE le risposte, entrambi i giri
  startRound(1);
}
function buildQuizPool(mod,n){
  const all=questionsForModule(mod);
  const gen=genQuizFor(mod.id,Math.floor(n/2)); // metà generate al volo
  const curatedN=n-gen.length;
  if(!G.seenQ)G.seenQ={};if(!G.seenQ[mod.id])G.seenQ[mod.id]=[];
  let unseen=all.filter(q=>!G.seenQ[mod.id].includes(q.q));
  if(unseen.length<curatedN){G.seenQ[mod.id]=[];unseen=all.slice();}
  const curated=qShuffle(unseen).slice(0,Math.min(curatedN,unseen.length));
  curated.forEach(q=>G.seenQ[mod.id].push(q.q));saveG();
  return qShuffle(curated.concat(gen));
}
function startRound(r){
  const Q=LP.quiz;Q.round=r;Q.cur=0;Q.ok=0;
  Q.pool=buildQuizPool(LP.mod,Q.n); // domande diverse a ogni giro (rotazione + generate)
  renderCons();
}
function renderRoundTransition(){
  const wrap=_id('play-quiz');wrap.innerHTML='';const Q=LP.quiz;
  const c=el('div','q-box');c.style.textAlign='center';
  c.innerHTML='<div class="q-tag" style="color:var(--green)">✓ GIRO 1 — COMPLETATO</div>'+
    '<div class="q-text">Hai totalizzato '+Q.ok+'/'+Q.pool.length+' al primo giro.</div>'+
    '<p style="color:var(--muted);font-size:.85rem;margin-top:10px;line-height:1.6">Ora il <b style="color:var(--cyan)">Giro 2</b>: <b>nuove domande</b> sullo stesso tema. Nel resoconto finale contano <b>tutte</b> le risposte di entrambi i giri.</p>';
  const btn=el('button','hero-cta','▶ Inizia il Giro 2');btn.onclick=()=>startRound(2);
  wrap.appendChild(c);wrap.appendChild(btn);
}
function renderCons(){
  const wrap=_id('play-quiz');wrap.innerHTML='';const Q=LP.quiz,mod=LP.mod;
  if(Q.cur>=Q.pool.length){ if(Q.round===1){renderRoundTransition();}else{finishLevel();} return; }
  Q.answered=false;
  const q=prepQuestion(Q.pool[Q.cur],mod.title);Q.currentQ=q;
  const rlabel=Q.round===1?'Giro 1':'Giro 2';
  wrap.appendChild(el('div','game-instr','🧠 '+rlabel+' · Domanda '+(Q.cur+1)+'/'+Q.pool.length));
  wrap.appendChild(el('div','q-box','<div class="q-text">'+q.question+'</div>'));
  const grid=el('div','opts-grid','');
  const fb=el('div','feedback','');fb.setAttribute('role','status');fb.setAttribute('aria-live','polite');
  const nb=el('button','next-btn','PROSSIMA →');
  q.options.forEach((opt,i)=>{
    const b=el('button','opt','<span class="opt-lbl">'+['A','B','C','D'][i]+'</span><span>'+opt+'</span>');
    b.onclick=()=>{
      if(Q.answered)return;Q.answered=true;
      grid.querySelectorAll('.opt').forEach((x,j)=>{x.disabled=true;if(j===q.correct)x.classList.add('ok');});
      const ok=i===q.correct;
      if(ok){Q.ok++;addXP(8);}else{b.classList.add('ko');}
      LP.answers.push({q:q.question,tua:q.options[i],giusta:q.options[q.correct],ok:ok,perche:q.explanation,mod:moduleOfQuestion(q.question)});
      reviewTrack(ok,q);
      fb.className='feedback show '+(ok?'ok':'ko');
      fb.innerHTML='<div class="feedback-title">'+(ok?'✓ Corretto':'✗ Errato')+'</div>'+
        (ok?'':'<div style="margin-bottom:6px"><b style="color:var(--green)">✓ Risposta corretta:</b> '+q.options[q.correct]+'</div>')+
        '<div>'+q.explanation+'</div>';
      nb.classList.add('show');
    };
    grid.appendChild(b);
  });
  nb.onclick=()=>{Q.cur++;renderCons();};
  wrap.appendChild(grid);wrap.appendChild(fb);wrap.appendChild(nb);
  suppressHover(grid);
}
function finishLevel(){
  const mod=LP.mod;setPlayStep('done');
  hidePlayPanels();_id('play-done').style.display='block';
  const ans=LP.answers||[],tot=ans.length,ok=ans.filter(a=>a.ok).length,ko=tot-ok;
  const passed=tot>0 && ok>=Math.ceil(tot*0.5);
  if(passed&&!G.modules[mod.id].completed) completeModule(mod.id);
  _id('play-done-pct').textContent=passed?'✓':'✗';
  _id('play-done-pct').style.color=passed?'var(--green)':'var(--orange)';
  _id('play-done-msg').innerHTML=(passed?'Livello completato! ':'Ci sei quasi. ')+'Totale (2 giri): '+ok+'/'+tot+' giuste'+(passed?' &nbsp;·&nbsp; +'+mod.xp+' XP':' — ripeti per sbloccare')+
    '<br><span style="font-size:.8rem"><span style="color:var(--green)">'+ok+' corrette</span> &nbsp;·&nbsp; <span style="color:#fca5a5">'+ko+' sbagliate</span></span>';
  const rc=_id('play-recap');rc.innerHTML='';
  // cosa hai imparato
  const b=BRIEF[mod.id];
  if(b&&b.key){
    const card=el('div','brief-card');card.style.borderLeftColor='var(--green)';
    const l=el('div','brief-label','✅ Cosa hai imparato');l.style.color='var(--green)';card.appendChild(l);
    const ul=el('ul','brief-list');b.key.forEach(k=>{const li=document.createElement('li');li.innerHTML=k;ul.appendChild(li);});card.appendChild(ul);
    rc.appendChild(card);
  }
  // resoconto completo di TUTTE le risposte (verdi + rosse), con Approfondisci
  if(tot){
    const card=el('div','brief-card');card.style.borderLeftColor='var(--accent)';
    const l=el('div','brief-label','📋 Resoconto risposte ('+ok+' giuste · '+ko+' sbagliate)');l.style.color='var(--accent)';card.appendChild(l);
    ans.forEach(a=>{
      const it=el('div','recap-err '+(a.ok?'good':'bad'));
      const head=el('div','recap-head','');
      head.appendChild(el('div','recap-q',(a.ok?'🟢 ':'🔴 ')+a.q));
      const btn=el('button','approf-btn','Approfondisci ↗');btn.onclick=()=>openTheory(a.mod,a.q);head.appendChild(btn);
      it.appendChild(head);
      it.appendChild(el('div','recap-line '+(a.ok?'ok':'ko'),(a.ok?'✓':'✗')+' Tua risposta: '+a.tua));
      if(!a.ok) it.appendChild(el('div','recap-line ok','✓ Corretta: '+a.giusta));
      it.appendChild(el('div','recap-why',a.perche));
      card.appendChild(it);
    });
    rc.appendChild(card);
  }
}

// ══════════════════════════════════════
// HOME · CTA + FUN FACTS CAROUSEL
// ══════════════════════════════════════
function continuaPercorso(){
  const next=MODS.find(m=>getStatus(m)==='active');
  if(next){launchModuleGame(next);}
  else{
    const done=MODS.every(m=>G.modules[m.id]&&G.modules[m.id].completed);
    showToast(done?'🏆 Hai completato tutto il percorso!':'Completa i moduli sbloccati per procedere','var(--accent)');
  }
}
function updateHeroProgress(){
  const hp=_id('hero-progress');if(!hp)return;
  const done=MODS.filter(m=>G.modules[m.id]&&G.modules[m.id].completed).length;
  hp.textContent=done+' / '+MODS.length+' moduli';
}
const FUN_FACTS=[
  {i:'🌐',t:"Il primo messaggio inviato su <b>ARPANET</b> nel 1969 doveva essere \"LOGIN\", ma il sistema andò in crash dopo due lettere: <b>LO</b>."},
  {i:'📡',t:"Un indirizzo <b>IPv6</b> ha 128 bit: esistono più indirizzi disponibili che granelli di sabbia sulla Terra."},
  {i:'🔢',t:"La subnet mask <b>/30</b> lascia solo 2 host utilizzabili: perfetta per i link punto-punto tra due router."},
  {i:'🔀',t:"Lo <b>Spanning Tree Protocol</b> fu inventato da Radia Perlman, che lo spiegò persino con una poesia."},
  {i:'🚦',t:"Le porte <b>80</b> (HTTP) e <b>443</b> (HTTPS) rientrano nelle 1.024 \"well-known ports\" riservate ai servizi standard."},
  {i:'💾',t:"Un indirizzo <b>MAC</b> è a 48 bit: i primi 24 identificano il produttore della scheda di rete (OUI)."},
  {i:'⚡',t:"<b>EIGRP</b> riconverge in un lampo perché tiene già pronta una rotta di backup: il <b>feasible successor</b>."},
  {i:'🛡️',t:"Ogni <b>ACL</b> termina con un \"deny any\" invisibile: se nessuna regola fa match, il traffico è bloccato."},
  {i:'🧠',t:"Il modello <b>OSI</b> ha 7 livelli. Mnemonico: <b>All People Seem To Need Data Processing</b>."},
  {i:'🏠',t:"Gli indirizzi <b>192.168.x.x</b> sono privati (RFC 1918): non instradabili su Internet, richiedono il NAT."},
  {i:'🔌',t:"<b>Ping</b> usa il protocollo ICMP e prende il nome dal suono del sonar dei sottomarini."},
  {i:'🤝',t:"<b>TCP</b> apre ogni connessione con un saluto in 3 mosse: SYN → SYN-ACK → ACK."},
  {i:'🎯',t:"L'esame <b>CCNA 200-301</b> dura 120 minuti e copre 6 aree, dal networking di base all'automazione."},
  {i:'🌍',t:"Il <b>DNS</b> è la rubrica di Internet: traduce i nomi (es. google.com) in indirizzi IP. Porta 53."},
  {i:'📮',t:"<b>UDP</b> è \"spara e dimentica\": nessuna conferma di consegna. Ideale per streaming, giochi e VoIP."},
  {i:'🔁',t:"<b>DHCP</b> assegna gli IP in 4 mosse: <b>D</b>iscover, <b>O</b>ffer, <b>R</b>equest, <b>A</b>ck (DORA)."},
  {i:'🕳️',t:"Il <b>NAT</b> permette a decine di dispositivi di navigare con un solo indirizzo IP pubblico."},
  {i:'⏱️',t:"<b>RSTP</b> (802.1w) converge in pochi secondi, contro i ~30-50s dello Spanning Tree classico."},
  {i:'🔐',t:"<b>SSH</b> (porta 22) cifra la sessione; <b>Telnet</b> (23) manda tutto in chiaro, password comprese."},
  {i:'🧩',t:"<b>127.0.0.1</b> è il <b>loopback</b>: il tuo stesso computer. In IPv6 diventa <b>::1</b>."},
  {i:'📶',t:"Il Wi-Fi a <b>5 GHz</b> è più veloce ma copre meno; i <b>2.4 GHz</b> arrivano più lontano."},
  {i:'🚪',t:"Le porte TCP/UDP vanno da 0 a <b>65535</b>: esattamente 16 bit di possibilità."},
  {i:'🧭',t:"La <b>default route</b> 0.0.0.0/0 è il \"gateway of last resort\": dove va ciò che non ha una rotta specifica."},
  {i:'🔗',t:"<b>EtherChannel</b> unisce più cavi in un solo link logico: più banda e ridondanza insieme."},
  {i:'🪞',t:"Un <b>hub</b> ripete tutto a tutte le porte; uno <b>switch</b> impara e inoltra solo dove serve."},
  {i:'🌐',t:"<b>ARP</b> scopre l'indirizzo MAC corrispondente a un IP nella rete locale."},
  {i:'📏',t:"La <b>/24</b> (255.255.255.0) offre 254 host utili: la subnet più comune nelle LAN."},
  {i:'🧷',t:"Il <b>trunk 802.1Q</b> aggiunge un \"tag\" ai frame per trasportare più VLAN su un solo cavo."},
  {i:'♻️',t:"<b>HSRP</b> fa condividere a due router un IP virtuale: se l'attivo cade, subentra lo standby."},
  {i:'🧨',t:"Un <b>loop di livello 2</b> può paralizzare una rete in pochi secondi: per questo esiste lo STP."},
  {i:'🔎',t:"<b>show ip interface brief</b> è il primo comando per capire se le interfacce sono up/up."},
  {i:'📚',t:"La <b>tabella CAM</b> di uno switch associa gli indirizzi MAC alle porte fisiche."},
  {i:'⏰',t:"<b>NTP</b> tiene sincronizzato l'orario dei dispositivi: essenziale per log e certificati."},
  {i:'🧯',t:"<b>Port security</b> blocca la porta se si collega un dispositivo con MAC non autorizzato."},
  {i:'🌉',t:"Il <b>router</b> collega reti diverse e separa i domini di broadcast; lo switch no."},
  {i:'🧠',t:"La <b>wildcard mask</b> è la subnet mask \"al contrario\": /24 → 0.0.0.255 in OSPF e nelle ACL."},
  {i:'📦',t:"<b>Incapsulamento</b>: Dati → Segmento → Pacchetto → Frame → Bit, un header a ogni livello."},
  {i:'🛜',t:"Un <b>WLC</b> gestisce decine di access point da un punto solo: canali, potenza e roaming."},
  {i:'💡',t:"<b>0xFF</b> in esadecimale vale 255: due cifre hex corrispondono a un byte (8 bit)."},
  {i:'🧮',t:"Con <b>8 bit</b> conti da 0 a 255: sono i valori possibili di ogni ottetto di un IPv4."},
  {i:'🛰️',t:"<b>OSPF</b> usa l'algoritmo di Dijkstra (SPF) per calcolare il percorso a costo minore."},
  {i:'🏢',t:"Ogni <b>VLAN</b> è un dominio di broadcast separato: meno traffico inutile e più sicurezza."},
  {i:'🔟',t:"Gli indirizzi <b>10.0.0.0/8</b> danno oltre 16 milioni di host privati: usati dalle grandi reti aziendali."}
];
let FACTS=[],factsIdx=0,factsTimer=null;
function pickFacts(){FACTS=qShuffle(FUN_FACTS.slice()).slice(0,12);}
function buildFactDots(){
  const dots=_id('fact-dots');if(!dots)return;dots.innerHTML='';
  FACTS.forEach((_,i)=>{const d=el('span','facts-dot'+(i===factsIdx?' on':''));d.onclick=()=>{factsIdx=i;renderFact();factsResume();};dots.appendChild(d);});
}
function renderFact(){
  const f=FACTS[factsIdx];if(!f)return;
  const tx=_id('fact-text'),ic=_id('fact-ico');
  if(!tx)return;
  tx.style.opacity=0;ic.style.transform='scale(.6)';
  setTimeout(()=>{tx.innerHTML=f.t;ic.textContent=f.i;tx.style.opacity=1;ic.style.transform='scale(1)';},180);
  document.querySelectorAll('#fact-dots .facts-dot').forEach((d,i)=>d.classList.toggle('on',i===factsIdx));
}
function factsGo(d){
  factsIdx+=d;
  if(factsIdx>=FACTS.length){pickFacts();factsIdx=0;buildFactDots();}   // fine giro → nuovo batch mescolato
  else if(factsIdx<0){factsIdx=FACTS.length-1;}
  renderFact();factsResume();
}
function factsPause(){clearInterval(factsTimer);factsTimer=null;}
function factsResume(){factsPause();factsTimer=setInterval(()=>factsGo(1),6500);}
function initFacts(){
  if(!_id('fact-dots'))return;
  pickFacts();factsIdx=0;buildFactDots();
  renderFact();factsResume();
}

// ══════════════════════════════════════
// CALENDARIO · attività di studio
// ══════════════════════════════════════
function heatLevel(xp){return xp<=0?0:xp<25?1:xp<60?2:xp<120?3:4;}
function buildCells(container,days){
  container.innerHTML='';const today=todayStr();
  const start=new Date();const dow=(start.getDay()+6)%7;// lun=0
  start.setDate(start.getDate()-dow-(days/7-1)*7);
  for(let w=0;w<days/7;w++){
    const col=el('div','heat-col');
    for(let d=0;d<7;d++){
      const cur=new Date(start);cur.setDate(start.getDate()+w*7+d);
      const k=todayStr(cur);const xp=G.days[k]||0;
      const cell=el('div','heat-cell heat-'+heatLevel(xp));
      cell.title=k+' · '+xp+' XP';
      if(k===today)cell.classList.add('heat-today');
      if(cur>new Date())cell.style.visibility='hidden';
      col.appendChild(cell);
    }
    container.appendChild(col);
  }
}
function renderHomeStreak(){
  const num=_id('hs-streak');if(!num)return;
  num.textContent=currentStreak();
  buildCells(_id('hs-mini'),21);
}
const MONTHS_IT=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const MON_ABBR=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const DOW_IT=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
function showHeatDay(date,xp){
  const e=_id('heat-selected');if(!e)return;
  e.innerHTML='📅 <b>'+DOW_IT[date.getDay()]+' '+date.getDate()+' '+MONTHS_IT[date.getMonth()]+' '+date.getFullYear()+'</b> — '+xp+' XP';
}
function renderCalHeatmap(days){
  const grid=_id('heatmap');if(!grid)return;grid.innerHTML='';
  const monthsEl=_id('heat-months');if(monthsEl)monthsEl.innerHTML='';
  const today=todayStr();
  const start=new Date();const dow=(start.getDay()+6)%7;// lun=0
  start.setDate(start.getDate()-dow-(days/7-1)*7);
  let lastMonth=-1;
  for(let w=0;w<days/7;w++){
    const first=new Date(start);first.setDate(start.getDate()+w*7);
    if(monthsEl){const lbl=el('span','heat-mlabel');if(first.getMonth()!==lastMonth){lbl.textContent=MON_ABBR[first.getMonth()];lastMonth=first.getMonth();}monthsEl.appendChild(lbl);}
    const col=el('div','heat-col');
    for(let d=0;d<7;d++){
      const cur=new Date(start);cur.setDate(start.getDate()+w*7+d);
      const k=todayStr(cur);const xp=G.days[k]||0;
      const cell=el('div','heat-cell heat-'+heatLevel(xp));
      cell.title=k+' · '+xp+' XP';
      if(k===today)cell.classList.add('heat-today');
      if(cur>new Date())cell.style.visibility='hidden';
      else{cell.style.cursor='pointer';const cd=new Date(cur);cell.onclick=()=>showHeatDay(cd,xp);}
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }
}
function renderCalendar(){
  const s=_id('cal-stats');if(!s)return;
  const todayXP=G.days[todayStr()]||0;
  s.innerHTML=
    '<div class="cal-stat hot"><b>'+currentStreak()+'</b><span>Streak 🔥</span></div>'+
    '<div class="cal-stat"><b>'+G.bestStreak+'</b><span>Record</span></div>'+
    '<div class="cal-stat"><b>'+activeDays()+'</b><span>Giorni attivi</span></div>'+
    '<div class="cal-stat"><b>'+xpThisWeek()+'</b><span>XP settimana</span></div>'+
    '<div class="cal-stat"><b>'+G.score+'</b><span>XP totali</span></div>';
  const goal=G.dailyGoal||60;const pct=Math.min(100,Math.round(todayXP/goal*100));
  _id('cal-goal').innerHTML='<div class="cal-goal-top"><span>Obiettivo di oggi</span><b>'+todayXP+' / '+goal+' XP</b></div><div class="cal-goal-track"><div class="cal-goal-fill" style="width:'+pct+'%"></div></div>';
  renderCalHeatmap(18*7);
}

// ══════════════════════════════════════
// TROUBLESHOOTING LAB · simulatore IOS con stato reale
//   reti guaste da diagnosticare e riparare (stile esame)
// ══════════════════════════════════════
function tsIsIp(s){return /^\d{1,3}(\.\d{1,3}){3}$/.test(s)&&s.split('.').every(o=>+o<=255);}
function tsMaskLen(m){let n=ipToInt(m),c=0;for(let i=0;i<32;i++){if(n&0x80000000)c++;n<<=1;}return c;}
function tsNet(ip,mask){return intToIp(ipToInt(ip)&ipToInt(mask));}
function tsInSub(ip,net,mask){const m=ipToInt(mask);return (ipToInt(ip)&m)===(ipToInt(net)&m);}
function tsConnected(state){return state.ifaces.filter(i=>i.up&&i.ip&&i.mask);}
function tsReachable(state,dst){
  if(!tsIsIp(dst))return false;
  const conn=tsConnected(state);
  if(conn.some(i=>tsInSub(dst,i.ip,i.mask)))return true;
  const routes=(state.routes||[]).slice().sort((a,b)=>tsMaskLen(b.mask)-tsMaskLen(a.mask));
  for(const r of routes){ if(tsInSub(dst,r.net,r.mask)&&conn.some(i=>tsInSub(r.via,i.ip,i.mask)))return true; }
  return false;
}
function tsNormIf(s){
  s=s.trim().toLowerCase();const m=s.match(/([a-z]+)\s*([\d]+\/[\d]+(?:\/[\d]+)?)/);if(!m)return null;
  const t=m[1];let p= t[0]==='g'?'Gi': t[0]==='f'?'Fa': t[0]==='s'?'Se': t[0]==='e'?'Et':'Gi';
  return p+m[2];
}
const TSHOOT_SCENARIOS=[
 {id:'ts_shut',icon:'🔌',diff:'easy',xp:25,title:'Interfaccia spenta',
  desc:"R1 non raggiunge Internet. Trova l'interfaccia giù e riattivala.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"LAN 192.168.1.0/24 —[Gi0/0] R1 [Gi0/1]— ISP 203.0.113.1",
  symptom:"Il ping da R1 verso 8.8.8.8 fallisce.",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip interface brief','configure terminal','interface Gi0/1','no shutdown','end','ping 8.8.8.8'],
  explain:"L'interfaccia WAN Gi0/1 era in stato 'administratively down'. Senza di essa il router non raggiungeva il next-hop, quindi la default route era inutilizzabile. 'no shutdown' l'ha riattivata.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:false}
  ],routes:[{net:'0.0.0.0',mask:'0.0.0.0',via:'203.0.113.1',type:'S'}]}},
 {id:'ts_defroute',icon:'🧭',diff:'easy',xp:30,title:'Rotta di default mancante',
  desc:"Le interfacce sono su, ma Internet è irraggiungibile. Manca qualcosa nella tabella di routing.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"LAN 192.168.1.0/24 —[Gi0/0] R1 [Gi0/1]— ISP 203.0.113.1",
  symptom:"Il ping verso 8.8.8.8 fallisce anche se le interfacce sono up/up.",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip route','configure terminal','ip route 0.0.0.0 0.0.0.0 203.0.113.1','end','ping 8.8.8.8'],
  explain:"Mancava la rotta di default: il router non sapeva dove instradare il traffico verso reti sconosciute. 'ip route 0.0.0.0 0.0.0.0 203.0.113.1' ha impostato il gateway of last resort.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:true}
  ],routes:[]}},
 {id:'ts_mask',icon:'🎭',diff:'med',xp:35,title:'Subnet mask errata (WAN)',
  desc:"L'interfaccia WAN è su ma il next-hop non risponde. Controlla l'indirizzamento.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"R1 [Gi0/1] 203.0.113.2/30 — ISP 203.0.113.1/30",
  symptom:"Gi0/1 è up/up ma il next-hop 203.0.113.1 non è raggiungibile.",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip interface brief','show ip route','configure terminal','interface Gi0/1','ip address 203.0.113.2 255.255.255.252','end','ping 8.8.8.8'],
  explain:"L'IP dell'interfaccia WAN era 203.0.113.6/30, cioè nella subnet 203.0.113.4/30. Il next-hop 203.0.113.1 sta invece in 203.0.113.0/30: non erano nella stessa rete. Correggendo l'IP a 203.0.113.2/30 il next-hop torna direttamente connesso.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.6',mask:'255.255.255.252',up:true}
  ],routes:[{net:'0.0.0.0',mask:'0.0.0.0',via:'203.0.113.1',type:'S'}]}},
 {id:'ts_nexthop',icon:'➡️',diff:'med',xp:35,title:'Next-hop sbagliato',
  desc:"C'è una rotta di default, ma punta all'indirizzo sbagliato.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"R1 [Gi0/1] 203.0.113.2/30 — ISP 203.0.113.1/30",
  symptom:"La default route esiste ma il ping verso 8.8.8.8 fallisce.",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip route','show ip interface brief','configure terminal','ip route 0.0.0.0 0.0.0.0 203.0.113.1','end','ping 8.8.8.8'],
  explain:"La rotta di default puntava a 203.0.113.9, un next-hop fuori dalla rete WAN (203.0.113.0/30) e quindi irraggiungibile. Impostando il next-hop corretto 203.0.113.1 il traffico trova la strada.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:true}
  ],routes:[{net:'0.0.0.0',mask:'0.0.0.0',via:'203.0.113.9',type:'S'}]}},
 {id:'ts_lanip',icon:'🏷️',diff:'med',xp:35,title:'IP LAN nella subnet sbagliata',
  desc:"Il server del magazzino non risponde. L'interfaccia LAN ha l'indirizzo giusto?",
  goal:"R1 deve raggiungere il server LAN 192.168.10.20.",topo:"Server 192.168.10.20 —[Gi0/0] R1",
  symptom:"Il ping verso il server 192.168.10.20 fallisce.",target:'192.168.10.20',hostname:'R1',
  hints:['enable','show ip interface brief','configure terminal','interface Gi0/0','ip address 192.168.10.1 255.255.255.0','end','ping 192.168.10.20'],
  explain:"L'interfaccia LAN aveva 192.168.1.1/24, ma il server è nella rete 192.168.10.0/24. Riconfigurando Gi0/0 con 192.168.10.1/24 la LAN del server diventa direttamente connessa e raggiungibile.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:true}
  ],routes:[]}},
 {id:'ts_combo',icon:'💥',diff:'hard',xp:45,title:'Doppio guasto',
  desc:"Niente Internet, e i sintomi sono più d'uno. Diagnosi completa richiesta.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"LAN 192.168.1.0/24 —[Gi0/0] R1 [Gi0/1]— ISP 203.0.113.1",
  symptom:"Il ping verso 8.8.8.8 fallisce e la tabella di routing sembra incompleta.",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip interface brief','show ip route','configure terminal','interface Gi0/1','no shutdown','exit','ip route 0.0.0.0 0.0.0.0 203.0.113.1','end','ping 8.8.8.8'],
  explain:"Due problemi insieme: l'interfaccia WAN Gi0/1 era spenta E mancava la rotta di default. Servivano entrambe le correzioni ('no shutdown' + 'ip route 0.0.0.0 0.0.0.0 203.0.113.1').",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:false}
  ],routes:[]}},
 {id:'ts_noip',icon:'🚫',diff:'med',xp:35,title:'Interfaccia senza IP',
  desc:"L'interfaccia WAN è accesa ma non risponde: forse non ha un indirizzo.",
  goal:"R1 deve raggiungere Internet (ping 8.8.8.8).",topo:"R1 [Gi0/1] ?/30 — ISP 203.0.113.1/30",
  symptom:"Gi0/1 è up ma senza indirizzo IP (unassigned).",target:'8.8.8.8',hostname:'R1',
  hints:['enable','show ip interface brief','configure terminal','interface Gi0/1','ip address 203.0.113.2 255.255.255.252','end','ping 8.8.8.8'],
  explain:"L'interfaccia WAN era attiva ma senza indirizzo: senza IP non esiste una rete connessa verso il next-hop, quindi la default route era inutilizzabile. Assegnando 203.0.113.2/30 il collegamento funziona.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:null,mask:null,up:true}
  ],routes:[{net:'0.0.0.0',mask:'0.0.0.0',via:'203.0.113.1',type:'S'}]}},
 {id:'ts_lanshut',icon:'🖧',diff:'easy',xp:25,title:'LAN irraggiungibile',
  desc:"Il server del magazzino non risponde: controlla l'interfaccia della LAN.",
  goal:"R1 deve raggiungere il server LAN 192.168.1.10.",topo:"Server 192.168.1.10 —[Gi0/0] R1",
  symptom:"Il ping verso 192.168.1.10 fallisce.",target:'192.168.1.10',hostname:'R1',
  hints:['enable','show ip interface brief','configure terminal','interface Gi0/0','no shutdown','end','ping 192.168.1.10'],
  explain:"L'interfaccia LAN Gi0/0 era 'administratively down': la rete locale non era raggiungibile. 'no shutdown' l'ha riattivata.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:false},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:true}
  ],routes:[]}},
 {id:'ts_missroute',icon:'🗺️',diff:'med',xp:40,title:'Rotta interna mancante',
  desc:"Una rete interna dietro un altro router non è raggiungibile.",
  goal:"R1 deve raggiungere l'host 10.0.0.10 (rete dietro R2).",topo:"R1 [Gi0/0] 192.168.1.1/24 — R2 .2 — LAN 10.0.0.0/24",
  symptom:"Il ping verso 10.0.0.10 fallisce: manca la rotta.",target:'10.0.0.10',hostname:'R1',
  hints:['enable','show ip route','configure terminal','ip route 10.0.0.0 255.255.255.0 192.168.1.2','end','ping 10.0.0.10'],
  explain:"R1 non aveva alcuna rotta verso 10.0.0.0/24, la rete dietro R2. Aggiungendo la rotta statica via 192.168.1.2 (next-hop direttamente connesso) l'host diventa raggiungibile.",
  state:{ifaces:[
    {name:'Gi0/0',full:'GigabitEthernet0/0',ip:'192.168.1.1',mask:'255.255.255.0',up:true},
    {name:'Gi0/1',full:'GigabitEthernet0/1',ip:'203.0.113.2',mask:'255.255.255.252',up:true}
  ],routes:[]}}
];
function initTshoot(){
  const list=_id('ts-list');if(!list)return;
  _id('ts-arena').innerHTML='';list.style.display='';list.innerHTML='';
  const DIFF={easy:'Facile',med:'Medio',hard:'Difficile'};
  TSHOOT_SCENARIOS.forEach(sc=>{
    const done=G.labs&&G.labs[sc.id];
    const c=el('div','ts-card'+(done?' solved':''));
    c.innerHTML='<div class="ts-card-top"><span style="font-size:1.15rem">'+(done?'✅':sc.icon)+'</span><h4>'+sc.title+'</h4><span class="ts-diff '+sc.diff+'">'+DIFF[sc.diff]+'</span></div><p>'+sc.desc+'</p>';
    c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label',sc.title+' — '+DIFF[sc.diff]);
    c.onclick=()=>launchTshoot(sc);
    c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launchTshoot(sc);}};
    list.appendChild(c);
  });
}
function launchTshoot(sc){
  const list=_id('ts-list'),arena=_id('ts-arena');
  list.style.display='none';arena.innerHTML='';
  const back=el('button','ts-back','‹ Tutti gli scenari');back.onclick=initTshoot;arena.appendChild(back);
  const host=el('div');arena.appendChild(host);
  engineTshoot(host,sc,()=>{
    if(!G.labs)G.labs={};
    if(!G.labs[sc.id]){G.labs[sc.id]=true;saveG();addXP(sc.xp||25);showToast('🧪 Scenario risolto! +'+(sc.xp||25)+' XP','var(--green)');}
    else showToast('✓ Risolto di nuovo','var(--green)');
  });
}
function engineTshoot(arena,sc,onDone){
  const state=JSON.parse(JSON.stringify(sc.state));state.hostname=sc.hostname||'R1';
  let mode='user',curIf=null,solved=false;
  arena.innerHTML='';
  const obj=el('div','ts-obj','<div class="ts-obj-h">🎯 Obiettivo</div><div>'+sc.goal+'</div><div class="ts-topo">'+sc.topo+'</div><div class="ts-sym">⚠️ '+sc.symptom+'</div>');
  arena.appendChild(obj);
  const wrap=el('div','cli-wrap','<div class="cli-bar"><div class="cli-dot" style="background:#ff5f57"></div><div class="cli-dot" style="background:#ffbd2e"></div><div class="cli-dot" style="background:#28c840"></div><span style="font-family:JetBrains Mono,monospace;font-size:.65rem;color:var(--muted);margin-left:8px;letter-spacing:2px">CISCO IOS · '+state.hostname+'</span></div><div class="cli-out"></div><div class="cli-inp"><span class="cli-ps"></span><input class="cli-field" autocomplete="off" spellcheck="false" placeholder="es. show ip interface brief · ping ..."></div>');
  arena.appendChild(wrap);
  const out=wrap.querySelector('.cli-out'),ps=wrap.querySelector('.cli-ps'),field=wrap.querySelector('.cli-field');
  if(sc.hints){const hr=el('div','hint-row');sc.hints.forEach(h=>{const c=el('span','hint-chip',h);c.onclick=()=>{field.value=h;field.focus();};hr.appendChild(c);});obj.appendChild(hr);}
  function pr(){const h=state.hostname;return mode==='priv'?h+'#':mode==='config'?h+'(config)#':mode==='if'?h+'(config-if)#':h+'>';}
  function setPs(){ps.textContent=pr();}
  function P(t,cls){const l=el('div','cl '+(cls||'cl-o'));l.textContent=t;out.appendChild(l);out.scrollTop=out.scrollHeight;}
  function showBrief(){
    P('Interface              IP-Address       OK? Method Status                 Protocol','cl-i');
    state.ifaces.forEach(i=>P((i.full||i.name).padEnd(23)+(i.ip||'unassigned').padEnd(17)+'YES manual '+(i.up?'up':'administratively down').padEnd(24)+(i.up?'up':'down')));
  }
  function showRoute(){
    P('Codes: C - connected, S - static, S* - candidate default','cl-c');P(' ');
    const def=state.routes.find(r=>r.net==='0.0.0.0'&&r.mask==='0.0.0.0');
    P(def&&tsReachable(state,def.via)?('Gateway of last resort is '+def.via+' to network 0.0.0.0'):'Gateway of last resort is not set','cl-i');P(' ');
    tsConnected(state).forEach(i=>P('C    '+tsNet(i.ip,i.mask)+'/'+tsMaskLen(i.mask)+' is directly connected, '+i.name,'cl-s'));
    state.routes.forEach(r=>P((r.net==='0.0.0.0'&&r.mask==='0.0.0.0')?('S*   0.0.0.0/0 [1/0] via '+r.via):('S    '+tsNet(r.net,r.mask)+'/'+tsMaskLen(r.mask)+' [1/0] via '+r.via)));
  }
  function showRun(){
    P('!','cl-c');P('hostname '+state.hostname);
    state.ifaces.forEach(i=>{P('!','cl-c');P('interface '+(i.full||i.name));P(i.ip?(' ip address '+i.ip+' '+i.mask):' no ip address');P(i.up?' no shutdown':' shutdown');});
    P('!','cl-c');state.routes.forEach(r=>P('ip route '+r.net+' '+r.mask+' '+r.via));P('!','cl-c');P('end');
  }
  function win(){
    P(' ');P('✓ CONNETTIVITÀ RIPRISTINATA — scenario risolto!','cl-s');
    if(sc.explain){const e=el('div','cl');e.style.whiteSpace='normal';e.style.color='#93c5fd';e.style.lineHeight='1.6';e.style.marginTop='6px';e.textContent='ℹ '+sc.explain;out.appendChild(e);out.scrollTop=out.scrollHeight;}
    onDone&&onDone();
  }
  function doPing(dst){
    if(!tsIsIp(dst)){P('% Bad IP address','cl-e');return;}
    const ok=tsReachable(state,dst);
    P('Type escape sequence to abort.','cl-c');
    P('Sending 5, 100-byte ICMP Echos to '+dst+', timeout is 2 seconds:','cl-c');
    P(ok?'!!!!!':'.....',ok?'cl-s':'cl-e');
    P('Success rate is '+(ok?'100':'0')+' percent ('+(ok?'5':'0')+'/5)',ok?'cl-s':'cl-e');
    if(ok&&dst===sc.target&&!solved){solved=true;win();}
  }
  function handle(raw){
    const c=raw.replace(/\s+/g,' ').trim(),lc=c.toLowerCase();
    if(lc==='cls'||lc==='clear'){out.innerHTML='';return;}
    if(lc==='?'||lc==='help'){P('Comandi: show ip interface brief · show ip route · show running-config · ping <ip> · enable · configure terminal · interface <if> · no shutdown / shutdown · ip address <ip> <mask> · ip route <net> <mask> <nexthop> · exit · end','cl-c');return;}
    if(lc.startsWith('ping ')){if(mode==='config'||mode==='if'){P('% Esci dalla configurazione per usare ping (end).','cl-e');return;}doPing(c.split(' ')[1]);return;}
    if(/^(sh|show) ip int(erface)? br(ief)?$/.test(lc)){showBrief();return;}
    if(/^(sh|show) ip rou(te)?$/.test(lc)){showRoute();return;}
    if(/^(sh|show) run(ning-config)?$/.test(lc)){showRun();return;}
    if(lc==='enable'||lc==='en'){if(mode==='user')mode='priv';setPs();return;}
    if(lc==='disable'){mode='user';setPs();return;}
    if(lc==='configure terminal'||lc==='conf t'||lc==='config t'){if(mode==='priv'){mode='config';P('Enter configuration commands, one per line. End with CNTL/Z.','cl-c');setPs();}else P('% Prima entra in modalità privilegiata: enable','cl-e');return;}
    if(lc==='end'){if(mode==='config'||mode==='if'){mode='priv';setPs();}return;}
    if(lc==='exit'){if(mode==='if')mode='config';else if(mode==='config')mode='priv';else if(mode==='priv')mode='user';setPs();return;}
    if(mode==='config'||mode==='if'){
      if(lc.startsWith('interface ')||lc.startsWith('int ')){const nm=tsNormIf(c.replace(/^interface\s+|^int\s+/i,''));const f=nm&&state.ifaces.find(i=>i.name.toLowerCase()===nm.toLowerCase());if(f){curIf=f;mode='if';setPs();}else P('% Interfaccia non valida','cl-e');return;}
      if(lc.startsWith('ip route ')){const p=c.split(' ');if(p.length>=5&&tsIsIp(p[2])&&tsIsIp(p[3])&&tsIsIp(p[4])){state.routes.push({net:p[2],mask:p[3],via:p[4],type:'S'});}else P('% Incomplete command.','cl-e');return;}
      if(lc.startsWith('no ip route ')){const p=c.split(' ');state.routes=state.routes.filter(r=>!(r.net===p[3]&&r.mask===p[4]&&(!p[5]||r.via===p[5])));return;}
    }
    if(mode==='if'){
      if(lc==='no shutdown'||lc==='no shut'){curIf.up=true;P('%LINK-3-UPDOWN: Interface '+curIf.name+', changed state to up','cl-i');P('%LINEPROTO-5-UPDOWN: Line protocol on Interface '+curIf.name+', changed state to up','cl-i');return;}
      if(lc==='shutdown'||lc==='shut'){curIf.up=false;P('%LINK-5-CHANGED: Interface '+curIf.name+', changed state to administratively down','cl-i');return;}
      if(lc.startsWith('ip address ')){const p=c.split(' ');if(p.length>=4&&tsIsIp(p[2])&&tsIsIp(p[3])){curIf.ip=p[2];curIf.mask=p[3];}else P('% Incomplete command.','cl-e');return;}
      if(lc==='no ip address'){curIf.ip=null;return;}
    }
    if(lc==='write'||lc==='wr'||lc==='copy run start'||lc==='copy running-config startup-config'){P('Building configuration...','cl-c');P('[OK]','cl-s');return;}
    P('% Comando non riconosciuto in questa modalità. Digita ? per l\'aiuto.','cl-e');
  }
  setPs();P("Diagnostica il guasto: parti da 'show ip interface brief' e 'show ip route'.",'cl-c');
  field.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const v=field.value;field.value='';if(!v.trim())return;P(pr()+' '+v,'cl-p');handle(v);});
  setTimeout(()=>field.focus(),60);
}
// ══════════════════════════════════════
// GLOSSARIO · ricerca rapida dei termini
// ══════════════════════════════════════
const GLOSSARY=[
 {t:"LAN",d:"Local Area Network — rete locale ad alta velocità in un'area ristretta (ufficio, casa, magazzino)."},
 {t:"WAN",d:"Wide Area Network — rete che collega sedi distanti, spesso tramite un service provider (Internet, MPLS)."},
 {t:"Switch",d:"Dispositivo L2 che inoltra i frame in base alla MAC usando la tabella CAM; una porta = un dominio di collisione."},
 {t:"Router",d:"Dispositivo L3 che instrada i pacchetti tra reti IP diverse e separa i domini di broadcast."},
 {t:"Hub",d:"Ripetitore L1 obsoleto: rigenera il segnale su tutte le porte (un solo dominio di collisione)."},
 {t:"Full-duplex",d:"Invio e ricezione simultanei sullo stesso link, senza collisioni (tipico switch–dispositivo)."},
 {t:"Modello OSI",d:"7 livelli: Application, Presentation, Session, Transport, Network, Data Link, Physical."},
 {t:"PDU",d:"Protocol Data Unit: Segmento (L4), Pacchetto (L3), Frame (L2), Bit (L1)."},
 {t:"Incapsulamento",d:"Aggiunta di un header a ogni livello mentre i dati scendono lo stack OSI/TCP-IP."},
 {t:"TCP",d:"Protocollo di trasporto affidabile e orientato alla connessione (handshake, ritrasmissioni). Es. web, file."},
 {t:"UDP",d:"Protocollo di trasporto veloce e senza connessione, senza garanzie. Es. VoIP, DNS, streaming."},
 {t:"3-way handshake",d:"Apertura connessione TCP in tre passi: SYN → SYN-ACK → ACK."},
 {t:"MAC address",d:"Indirizzo fisico a 48 bit di una scheda di rete; usato a livello 2 per l'inoltro dei frame."},
 {t:"CAM table",d:"Tabella MAC–porta che lo switch impara automaticamente dalla MAC sorgente dei frame."},
 {t:"Indirizzo IP privato",d:"RFC 1918: 10/8, 172.16–31/12, 192.168/16. Non instradabili su Internet: servono il NAT."},
 {t:"APIPA",d:"169.254.x.x — indirizzo auto-assegnato quando il client non riceve risposta dal DHCP."},
 {t:"Subnet mask",d:"Separa la parte rete dalla parte host di un indirizzo IP tramite un AND logico."},
 {t:"CIDR",d:"Notazione /n che indica quanti bit compongono il prefisso di rete (es. /24)."},
 {t:"Block size",d:"256 − valore della mask nell'ottetto interessato; l'incremento tra una subnet e la successiva."},
 {t:"VLSM",d:"Variable Length Subnet Mask: maschere di lunghezza diversa per dimensionare ogni subnet."},
 {t:"Network address",d:"Primo indirizzo di una subnet (tutti bit host a 0); identifica la rete, non assegnabile."},
 {t:"Broadcast address",d:"Ultimo indirizzo di una subnet (tutti bit host a 1); raggiunge tutti gli host della rete."},
 {t:"VLAN",d:"Virtual LAN: segmenta uno switch in più domini di broadcast logici e separati."},
 {t:"Trunk / 802.1Q",d:"Link che trasporta più VLAN aggiungendo un tag 802.1Q a ogni frame."},
 {t:"Access port",d:"Porta switch che appartiene a una sola VLAN, tipicamente collegata a un PC o dispositivo."},
 {t:"Native VLAN",d:"VLAN il cui traffico viaggia non taggato su un trunk (default VLAN 1)."},
 {t:"Inter-VLAN routing",d:"Instradamento tra VLAN diverse tramite un dispositivo L3 (router o switch multilayer)."},
 {t:"STP",d:"Spanning Tree Protocol (802.1D/RSTP): previene i loop L2 bloccando i percorsi ridondanti."},
 {t:"RSTP",d:"Rapid Spanning Tree (802.1w): variante di STP con convergenza in pochi secondi."},
 {t:"EtherChannel",d:"Aggregazione di più link fisici in uno logico (LACP/PAgP): più banda e ridondanza."},
 {t:"HSRP",d:"First Hop Redundancy Protocol Cisco: gateway virtuale ridondante Active/Standby."},
 {t:"SSID",d:"Nome identificativo di una rete wireless a cui i client si associano."},
 {t:"Access Point (AP)",d:"Dispositivo che diffonde il segnale wireless 802.11 e collega i client alla rete cablata."},
 {t:"WLC",d:"Wireless LAN Controller: gestisce centralmente molti AP lightweight (canali, potenza, SSID, roaming)."},
 {t:"WPA2 / WPA3",d:"Standard di sicurezza wireless; WPA3 è il più recente e robusto. WEP è obsoleto."},
 {t:"Routing statico",d:"Rotte configurate manualmente dall'amministratore (ip route ...)."},
 {t:"Default route",d:"Rotta 0.0.0.0/0 usata per tutto il traffico verso destinazioni non presenti in tabella."},
 {t:"Distanza amministrativa (AD)",d:"Affidabilità di una fonte di routing: Connessa 0, Statica 1, EIGRP 90, OSPF 110, RIP 120."},
 {t:"OSPF",d:"Protocollo link-state (algoritmo SPF/Dijkstra), AD 110, aree con backbone area 0."},
 {t:"EIGRP",d:"Protocollo Cisco advanced distance vector (algoritmo DUAL), AD 90, con feasible successor."},
 {t:"Wildcard mask",d:"Maschera inversa usata in OSPF e nelle ACL (es. 0.0.0.255 = /24)."},
 {t:"ACL",d:"Access Control List: filtra il traffico. Standard (1-99) solo sorgente; Extended (100-199) src/dst/porta."},
 {t:"NAT",d:"Network Address Translation: traduce indirizzi privati in pubblici per l'accesso a Internet."},
 {t:"PAT",d:"NAT overload: molti host privati condividono un solo IP pubblico distinti dai numeri di porta."},
 {t:"SSH",d:"Accesso remoto cifrato (porta 22), sostituisce Telnet che viaggia in chiaro."},
 {t:"Port security",d:"Limita quali/quanti MAC possono usare una porta switch; blocca dispositivi non autorizzati."},
 {t:"AAA",d:"Authentication, Authorization, Accounting: framework per il controllo degli accessi ai dispositivi."},
 {t:"DHCP",d:"Assegna automaticamente IP, mask, gateway e DNS con lo scambio DORA (Discover, Offer, Request, Ack)."},
 {t:"DORA",d:"Le quattro fasi del DHCP: Discover → Offer → Request → Ack."},
 {t:"DNS",d:"Domain Name System: traduce i nomi di dominio in indirizzi IP (porta 53)."},
 {t:"NTP",d:"Network Time Protocol (UDP 123): sincronizza l'orario dei dispositivi di rete."},
 {t:"Syslog",d:"Invio centralizzato dei messaggi di log (UDP 514), con livelli di severità 0–7."},
 {t:"SNMP",d:"Simple Network Management Protocol (161/162): monitoraggio di dispositivi e invio di trap."},
 {t:"QoS",d:"Quality of Service: classifica e dà priorità al traffico sensibile (voce, video)."},
 {t:"IPv6",d:"Indirizzi a 128 bit in 8 gruppi esadecimali; prefisso /64 + Interface ID, con autoconfigurazione SLAAC."},
 {t:"SLAAC",d:"StateLess Address AutoConfiguration: l'host IPv6 si genera l'indirizzo da solo tramite NDP."},
 {t:"Link-local",d:"Indirizzo IPv6 fe80::/10 valido solo sul segmento locale."},
 {t:"IPSec",d:"Suite di sicurezza L3 per VPN: ESP cifra il payload, AH autentica."},
 {t:"MPLS",d:"Label switching usato dai provider per VPN L3 performanti e con QoS."},
 {t:"SDN",d:"Software-Defined Networking: separa il control plane (decisioni) dal data plane (inoltro)."},
 {t:"REST API",d:"Interfaccia basata su HTTP (GET/POST/PUT/DELETE) per automatizzare la configurazione."}
];
// Approfondimenti + diagramma collegato (chiave in DIAGRAM) per ogni termine
const GLOSS_MORE={
 "LAN":{more:"Tipicamente Ethernet cablata o Wi-Fi, gestita da switch. Alta velocità (1-10 Gbps) e bassa latenza perché tutto è locale.",diag:"net_basics"},
 "WAN":{more:"Non possiedi l'infrastruttura: ti appoggi a un provider (fibra, MPLS, Internet). Più lenta e costosa della LAN, con latenza maggiore.",diag:"net_basics"},
 "Switch":{more:"Costruisce la tabella CAM imparando i MAC sorgente. Ogni porta è un dominio di collisione separato; di default tutte le porte sono nello stesso dominio di broadcast (una VLAN).",diag:"switching"},
 "Router":{more:"Ogni interfaccia sta in una rete IP diversa e separa i domini di broadcast. Usa la tabella di routing per scegliere il percorso ed è il default gateway degli host.",diag:"net_basics"},
 "Hub":{more:"Dispositivo legacy: crea un unico dominio di collisione condiviso, quindi half-duplex e collisioni. Sostituito ovunque dagli switch.",diag:"net_basics"},
 "Full-duplex":{more:"Invio e ricezione contemporanei, senza collisioni: standard tra switch e dispositivi moderni. L'half-duplex (hub) invece condivide il mezzo."},
 "Modello OSI":{more:"Modello di riferimento a 7 livelli per capire e diagnosticare le reti. Mnemonico dal 7 all'1: All People Seem To Need Data Processing.",diag:"osi_mod"},
 "PDU":{more:"Il nome dell'unità dati cambia per livello: L4 Segmento, L3 Pacchetto, L2 Frame, L1 Bit. Aiuta a indicare a che livello avviene un problema.",diag:"osi_mod"},
 "Incapsulamento":{more:"Scendendo lo stack ogni livello aggiunge il proprio header (e L2 anche un trailer). In ricezione avviene il processo inverso: de-incapsulamento.",diag:"osi_mod"},
 "TCP":{more:"Affidabile: numeri di sequenza, ACK e ritrasmissioni garantiscono consegna ordinata. Apre la sessione con il 3-way handshake. Web, email, file.",diag:"tcpip_mod"},
 "UDP":{more:"Senza connessione e senza garanzie, ma con pochissimo overhead e bassa latenza. Ideale per VoIP, streaming, DNS e giochi online."},
 "3-way handshake":{more:"SYN (il client propone), SYN-ACK (il server conferma e propone), ACK (il client conferma). Solo dopo inizia lo scambio dei dati.",diag:"tcpip_mod"},
 "MAC address":{more:"48 bit in esadecimale (es. 00:1A:2B:...). I primi 24 bit sono l'OUI del produttore. Ha valore solo nella rete locale (L2).",diag:"switching"},
 "CAM table":{more:"Associa MAC ↔ porta. Se la destinazione non è in tabella lo switch fa flooding su tutte le porte tranne quella d'ingresso.",diag:"switching"},
 "Indirizzo IP privato":{more:"Non instradabile su Internet: per uscire serve il NAT. Range RFC 1918: 10/8, 172.16-31/12, 192.168/16.",diag:"nat_mod"},
 "APIPA":{more:"169.254.0.0/16: se il client non riceve risposta dal DHCP se lo auto-assegna. Vederlo segnala quasi sempre un problema DHCP.",diag:"ipserv_mod"},
 "Subnet mask":{more:"I bit a 1 indicano la parte rete, i bit a 0 la parte host. Con un AND logico tra IP e mask si ottiene l'indirizzo di rete.",diag:"subnetting"},
 "CIDR":{more:"La /n conta i bit di rete: /24 = 255.255.255.0. Più alto il numero, più piccola la rete (meno host disponibili).",diag:"subnetting"},
 "Block size":{more:"256 − valore della mask nell'ottetto interessante. È l'intervallo tra una subnet e la successiva (es. /26 → 64).",diag:"subnetting"},
 "VLSM":{more:"Usare maschere diverse per subnet diverse, dimensionando ciascuna sul numero reale di host. Evita lo spreco di indirizzi.",diag:"subnetting"},
 "Network address":{more:"Bit host tutti a 0. Identifica la rete e non è assegnabile a un host.",diag:"subnetting"},
 "Broadcast address":{more:"Bit host tutti a 1. Raggiunge tutti gli host della subnet; non assegnabile a un singolo host.",diag:"subnetting"},
 "VLAN":{more:"Segmenta logicamente uno switch in reti separate. Ogni VLAN è un dominio di broadcast; per comunicare tra VLAN serve un dispositivo L3.",diag:"vlan_mod"},
 "Trunk / 802.1Q":{more:"Link che trasporta più VLAN aggiungendo un tag da 4 byte a ogni frame (tranne la native VLAN). Usato tra switch o verso il router.",diag:"vlan_mod"},
 "Access port":{more:"Appartiene a una sola VLAN e invia frame non taggati verso il dispositivo finale (PC, stampante, telefono).",diag:"vlan_mod"},
 "Native VLAN":{more:"L'unica VLAN che viaggia non taggata su un trunk (default VLAN 1). Deve coincidere ai due capi del trunk.",diag:"vlan_mod"},
 "Inter-VLAN routing":{more:"Instradamento tra VLAN diverse tramite router (router-on-a-stick con subinterfacce) o switch multilayer con interfacce SVI.",diag:"vlan_mod"},
 "STP":{more:"Elegge un Root Bridge e mette in blocco le porte ridondanti, lasciando una sola via attiva. Evita i loop di broadcast a L2.",diag:"redun_mod"},
 "RSTP":{more:"Evoluzione di STP (802.1w): converge in pochi secondi grazie a nuovi ruoli e stati delle porte. Retrocompatibile con STP.",diag:"redun_mod"},
 "EtherChannel":{more:"Aggrega 2-8 link fisici in uno logico (Port-channel); STP lo vede come un unico link. Negoziato con LACP (standard) o PAgP (Cisco).",diag:"redun_mod"},
 "HSRP":{more:"Più router condividono un IP e un MAC virtuale: l'Active inoltra, lo Standby subentra se cade. Per gli host il gateway non cambia mai.",diag:"redun_mod"},
 "SSID":{more:"Il nome della rete wireless annunciato dagli AP. Più AP possono condividere lo stesso SSID per permettere il roaming senza riconnessioni.",diag:"wifi_mod"},
 "Access Point (AP)":{more:"Ponte tra il wireless (802.11) e la rete cablata. In modalità lightweight è gestito da un WLC; autonomo ha configurazione locale.",diag:"wifi_mod"},
 "WLC":{more:"Configura e coordina molti AP lightweight: canali, potenza, SSID, sicurezza e roaming, tutto da un punto centrale.",diag:"wifi_mod"},
 "WPA2 / WPA3":{more:"Cifratura del Wi-Fi: WPA2 (AES/CCMP) è lo standard diffuso, WPA3 è più robusto. WEP è insicuro e da non usare.",diag:"wifi_mod"},
 "Routing statico":{more:"Rotte scritte a mano dall'amministratore. Semplici e prevedibili ma non si adattano ai cambiamenti: ideali per reti piccole o stub."},
 "Default route":{more:"0.0.0.0/0: usata quando nessuna rotta più specifica corrisponde. È il 'gateway of last resort', tipicamente verso Internet."},
 "Distanza amministrativa (AD)":{more:"Se più fonti offrono la stessa rotta vince l'AD più bassa: Connessa 0, Statica 1, EIGRP 90, OSPF 110, RIP 120."},
 "OSPF":{more:"Link-state open standard: ogni router costruisce la mappa della rete e con SPF (Dijkstra) calcola i percorsi. Organizzato in aree attorno all'area 0.",diag:"ospf_mod"},
 "EIGRP":{more:"Advanced distance vector Cisco: algoritmo DUAL, con successor (miglior percorso) e feasible successor (backup pronto) per riconvergere subito.",diag:"ospf_mod"},
 "Wildcard mask":{more:"La mask invertita (0 = 'deve corrispondere', 1 = 'ignora'). /24 → 0.0.0.255. Usata in OSPF (network) e nelle ACL."},
 "ACL":{more:"Elenco ordinato di regole permit/deny valutate dall'alto; in fondo c'è un deny implicito. Standard filtra la sorgente, Extended anche dst/protocollo/porta."},
 "NAT":{more:"Traduce indirizzi tra 'inside' (privato) e 'outside' (pubblico). Permette di riusare gli indirizzi privati e nasconde la rete interna.",diag:"nat_mod"},
 "PAT":{more:"NAT overload: un solo IP pubblico per molti host, distinti dal numero di porta sorgente. È ciò che fa il router di casa.",diag:"nat_mod"},
 "SSH":{more:"Accesso remoto cifrato alla CLI (porta 22). Richiede hostname, ip domain-name e chiavi RSA. Sostituisce Telnet, che è in chiaro."},
 "Port security":{more:"Limita quali e quanti MAC possono usare una porta access. Con 'sticky' impara il MAC; in violazione può spegnere la porta."},
 "AAA":{more:"Authentication (chi sei), Authorization (cosa puoi fare), Accounting (cosa hai fatto). Spesso centralizzato con RADIUS o TACACS+."},
 "DHCP":{more:"Assegna automaticamente IP, mask, gateway e DNS con lo scambio DORA. Server su UDP 67, client su UDP 68.",diag:"ipserv_mod"},
 "DORA":{more:"Discover (broadcast del client) → Offer (proposta del server) → Request → Ack (assegnazione del lease).",diag:"ipserv_mod"},
 "DNS":{more:"Risolve i nomi in IP con un sistema gerarchico (root, TLD, autoritativi). Porta 53. Senza DNS navigheresti solo per indirizzo.",diag:"ipserv_mod"},
 "NTP":{more:"Sincronizza l'orologio dei dispositivi (UDP 123) con una gerarchia di stratum. Orari coerenti sono vitali per log e certificati.",diag:"ipserv_mod"},
 "Syslog":{more:"Invia i messaggi di log a un server centrale (UDP 514), con severità da 0 (emergency) a 7 (debug). Fondamentale nel troubleshooting.",diag:"ipserv_mod"},
 "SNMP":{more:"Monitoraggio: un NMS interroga i dispositivi (UDP 161) e riceve trap non sollecitate (UDP 162). La v3 aggiunge autenticazione e cifratura.",diag:"ipserv_mod"},
 "QoS":{more:"Classifica e marca il traffico (es. DSCP) per dare priorità a voce e video quando la banda è congestionata, riducendo ritardo e jitter."},
 "IPv6":{more:"128 bit in 8 gruppi esadecimali. Compressione: togli gli zeri iniziali di ogni gruppo e sostituisci UNA sequenza di zeri con ::.",diag:"ipv6_mod"},
 "SLAAC":{more:"L'host IPv6 si genera l'indirizzo da solo usando il prefisso annunciato dal router (RA) + Interface ID, senza server DHCP.",diag:"ipv6_mod"},
 "Link-local":{more:"fe80::/10, valido solo sul segmento locale e generato automaticamente su ogni interfaccia IPv6. Usato da NDP e OSPFv3.",diag:"ipv6_mod"},
 "IPSec":{more:"Protegge le VPN a L3: ESP cifra il payload, AH autentica. Negozia chiavi e parametri con IKE. Spesso combinato con GRE per il multicast."},
 "MPLS":{more:"Il provider inoltra in base a etichette invece che all'IP: percorsi più rapidi e prevedibili, con supporto a VPN L3 e QoS."},
 "SDN":{more:"Separa il control plane (le decisioni, in un controller centrale) dal data plane (l'inoltro). Programmabile via API northbound/southbound."},
 "REST API":{more:"Interfaccia web (HTTP) per automatizzare i dispositivi: GET legge, POST crea, PUT aggiorna, DELETE elimina. Dati in JSON; 2xx=OK, 4xx/5xx=errore."}
};
// collega i diagrammi dedicati ai termini che ne erano privi
[["Full-duplex","duplex"],["UDP","udp"],["Routing statico","static_route"],["Default route","default_route"],["Distanza amministrativa (AD)","admin_distance"],["Wildcard mask","wildcard"],["ACL","acl"],["SSH","ssh_telnet"],["Port security","port_security"],["AAA","aaa"],["QoS","qos"],["IPSec","ipsec"],["MPLS","mpls"],["SDN","sdn"],["REST API","rest"]].forEach(p=>{if(GLOSS_MORE[p[0]])GLOSS_MORE[p[0]].diag=p[1];});
function renderGlossary(q){
  const list=_id('gloss-list');if(!list)return;
  const det=_id('gloss-detail');if(det)det.style.display='none';
  _id('gloss-search').style.display='';const cnt0=_id('gloss-count');if(cnt0)cnt0.style.display='';list.style.display='';
  q=(q||'').trim().toLowerCase();
  const items=GLOSSARY.filter(g=>!q||g.t.toLowerCase().includes(q)||g.d.toLowerCase().includes(q))
    .sort((a,b)=>a.t.localeCompare(b.t,'it'));
  const cnt=_id('gloss-count');if(cnt)cnt.textContent=items.length+' termini'+(q?' · filtro "'+q+'"':'');
  list.innerHTML='';
  if(!items.length){list.innerHTML='<div class="gloss-empty">Nessun termine trovato. Prova un\'altra parola.</div>';return;}
  items.forEach(g=>{
    const x=GLOSS_MORE[g.t]||{};
    const it=el('div','gloss-item');
    it.innerHTML='<div class="gloss-item-main"><div class="gloss-term">'+g.t+(x.diag?' <span class="gloss-badge">📊</span>':'')+'</div><div class="gloss-def">'+g.d+'</div></div><span class="gloss-chev">›</span>';
    it.tabIndex=0;it.setAttribute('role','button');it.setAttribute('aria-label',g.t+' — apri approfondimento');
    it.onclick=()=>openGloss(g);
    it.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGloss(g);}};
    list.appendChild(it);
  });
}
function openGloss(g){
  const x=GLOSS_MORE[g.t]||{};
  _id('gloss-search').style.display='none';
  const cnt=_id('gloss-count');if(cnt)cnt.style.display='none';
  _id('gloss-list').style.display='none';
  let d=_id('gloss-detail');
  if(!d){d=el('div');d.id='gloss-detail';_id('view-gloss').appendChild(d);}
  d.style.display='block';
  const dg=x.diag&&DIAGRAM[x.diag];
  d.innerHTML='<button class="ts-back" onclick="closeGloss()">‹ Torna al glossario</button>'+
    '<div class="gloss-detail-card">'+
      '<div class="gloss-detail-term">'+g.t+'</div>'+
      '<div class="gloss-sec-h">Definizione</div><div class="gloss-detail-def">'+g.d+'</div>'+
      (x.more?'<div class="gloss-sec-h">🔎 Approfondimento</div><div class="gloss-detail-more">'+x.more+'</div>':'')+
      (dg?'<div class="gloss-sec-h">🖼️ Esempio grafico</div><div class="brief-diagram">'+dg.svg+(dg.cap?'<div class="diag-cap">'+dg.cap+'</div>':'')+'</div>':'')+
    '</div>';
  // termini collegati (stesso diagramma)
  if(x.diag){
    const rel=GLOSSARY.filter(o=>o.t!==g.t&&(GLOSS_MORE[o.t]||{}).diag===x.diag).slice(0,6);
    if(rel.length){
      const box=el('div');box.innerHTML='<div class="gloss-sec-h">↔ Termini collegati</div>';
      const chips=el('div','gloss-rel');
      rel.forEach(o=>{const b=el('button','gloss-rel-chip',o.t);b.onclick=()=>openGloss(o);chips.appendChild(b);});
      box.appendChild(chips);d.appendChild(box);
    }
  }
  const v=document.getElementById('view-gloss');if(v)v.scrollIntoView({block:'start'});
}
function closeGloss(){
  const d=_id('gloss-detail');if(d)d.style.display='none';
  _id('gloss-search').style.display='';
  const cnt=_id('gloss-count');if(cnt)cnt.style.display='';
  _id('gloss-list').style.display='';
}
// ══════════════════════════════════════
// VIDEO · playlist NetworkChuck (spunta i visti)
// ══════════════════════════════════════
const VIDEO_PL='PLIhvC56v63IJVXv0GJcl9vO5Z6znCVb1P';
const VIDEOS=[
 {id:"S7MNX_UD7vY",t:"FREE CCNA // What is a Network? // Day 0"},
 {id:"9eH16Fxeb9o",t:"What is a SWITCH? // FREE CCNA // Day 1"},
 {id:"p9ScLm9S3B4",t:"What is a ROUTER? // FREE CCNA // EP 2"},
 {id:"CRdL1PcherM",t:"what is TCP/IP and OSI? // FREE CCNA // EP 3"},
 {id:"3kfO61Mensg",t:"REAL LIFE example!! (TCP/IP and OSI layers) // FREE CCNA // EP 4"},
 {id:"oIRkXulqJA4",t:"how the OSI model works on YouTube (Application and Transport Layers) // FREE CCNA // EP 5"},
 {id:"wwwAXlE4OtU",t:"DO NOT design your network like this!! // FREE CCNA // EP 6"},
 {id:"6-66D9J5PkY",t:"Data Center NETWORKS (what do they look like??) // FREE CCNA // EP 7"},
 {id:"xPi4uZu4uF0",t:"WAN....it's not the internet!! (sometimes) // FREE CCNA // EP 8"},
 {id:"80vIin4xGp8",t:"let's hack your home network // FREE CCNA // EP 9"},
 {id:"37tyxaQbtN4",t:"you need to learn Hybrid-Cloud RIGHT NOW!! // FREE CCNA // EP 10"},
 {id:"y8h5qY3zwic",t:"forcing my kids to make Ethernet cables // FREE CCNA // EP 11"},
 {id:"MLxgmkRzgIQ",t:"why Power over Ethernet (PoE) is amazing!! // FREE CCNA // EP 12"},
 {id:"E3DEJ7odWq0",t:"fiber optic cables (what you NEED to know) // FREE CCNA // EP 13"},
 {id:"0W4JZIWtjLQ",t:"you NEED to learn Port Security RIGHT NOW!! // FREE CCNA // EP 14"},
 {id:"5WfiTHiU4x8",t:"what is an IP Address? // You SUCK at Subnetting // EP 1"},
 {id:"tcae4TSSMo8",t:"we ran OUT of IP Addresses!!"},
 {id:"8bhvn9tQk8o",t:"we're out of IP Addresses but this saved us (Private IP Addresses)"},
 {id:"2-i5x8KCfII",t:"i bet you can't do this (because you still suck at subnetting)"},
 {id:"oZGZRtaGyG8",t:"What is a Subnet Mask??? (you NEED to know it!!)"},
 {id:"mJ_5qeqGOaI",t:"let's subnet your home network // You SUCK at subnetting // EP 6"},
 {id:"B1vqKQIPxr0",t:"subnetting my coffee shop"},
 {id:"6zopTcQFhqM",t:"Subnetting but in reverse"},
 {id:"OD2vG5st4zI",t:"Do you STILL suck at subnetting?? (THE FINAL TEST) // EP 9"}
];
function vidUrl(id){return 'https://www.youtube.com/watch?v='+id+'&list='+VIDEO_PL;}
function toggleVideo(id){
  if(!G.watched)G.watched={};
  G.watched[id]=!G.watched[id];if(!G.watched[id])delete G.watched[id];
  saveG();renderVideos();
}
function resetVideos(){G.watched={};saveG();renderVideos();}
function renderVideos(){
  const list=_id('vid-list');if(!list)return;
  if(!G.watched)G.watched={};
  const d=_id('vid-detail');if(d)d.style.display='none';list.style.display='';
  list.innerHTML='';
  let done=0;
  VIDEOS.forEach((v,i)=>{
    const seen=!!G.watched[v.id];if(seen)done++;
    const note=VIDEO_NOTES[v.id];
    const row=el('div','vid-item'+(seen?' seen':''));
    const ck=el('button','vid-check',seen?'✓':'');ck.title=seen?'Segna come non visto':'Segna come visto';ck.onclick=()=>toggleVideo(v.id);
    const num=el('span','vid-num',(i+1<10?'0':'')+(i+1));
    const a=el('a','vid-link','<span class="vid-name">'+v.t+(note?' <span class="vid-badge">📄 riassunto</span>':'')+'</span>');a.href=vidUrl(v.id);a.target='_blank';a.rel='noopener';
    row.appendChild(ck);row.appendChild(num);row.appendChild(a);
    if(note){const rb=el('button','vid-riass','📄 Riassunto');rb.onclick=()=>openVideoNote(v.id);row.appendChild(rb);}
    const play=el('a','vid-play','▶');play.href=vidUrl(v.id);play.target='_blank';play.rel='noopener';play.title='Guarda su YouTube';row.appendChild(play);
    list.appendChild(row);
  });
  const pct=Math.round(done/VIDEOS.length*100);
  _id('vid-count').textContent=done+' / '+VIDEOS.length+' visti ('+pct+'%)';
  _id('vid-progress-fill').style.width=pct+'%';
}
// ── Riassunti interattivi dei video (si integrano nei quiz dei livelli) ──
const VIDEO_NOTES={
 "wwwAXlE4OtU":{ep:"EP 6",mod:"net_basics",sections:[
   {h:"🚫 La rete sbagliata",b:"Molte piccole aziende partono con una rete 'da casa': un unico dispositivo che fa router + switch + modem + access point, e switch collegati a catena (daisy-chain). Ogni collegamento diventa un single point of failure: se un cavo o uno switch cade, tutto ciò che sta a valle va giù."},
   {h:"🔁 Ridondanza",b:"Regola d'oro: elimina più single point of failure possibile. Devi poter perdere un cavo, uno switch o un router e restare operativo. La ridondanza costa (più dispositivi = più spesa), quindi si bilancia col budget."},
   {h:"🏗️ Design a 2 livelli (collapsed core)",b:"Access layer = switch di accesso a cui si collegano PC, server e AP. Distribution layer (o aggregation) = switch multilayer (L3) potenti che fanno inter-VLAN routing, ACL, routing, summarization. Si aggiungono distribution e router ridondanti per togliere i SPOF. Le funzioni del core sono 'collassate' nel distribution → collapsed core."},
   {h:"🧠 Switch multilayer (Layer 3)",b:"Uno switch L3 gestisce sia MAC (L2) sia IP (L3): fa switching e routing insieme, velocissimo. È il cuore del distribution layer."},
   {h:"🏛️ Design a 3 livelli",b:"Access + Distribution + Core. Il Core è il backbone: velocissimo, bassa latenza, altissima affidabilità, gestisce enormi volumi di traffico. Serve nei campus grandi con più edifici: i distribution di ogni edificio si collegano al core (non full mesh tra edifici), rendendo la rete scalabile."}
 ],key:[
   "Single point of failure = se un elemento cade, gran parte della rete va giù → si evita con la ridondanza",
   "Two-tier (collapsed core) = Access + Distribution (che assume anche i compiti del core)",
   "Three-tier = Access + Distribution + Core (backbone), per campus grandi",
   "Distribution/Core usano switch multilayer L3: inter-VLAN routing, ACL, routing",
   "Non fare daisy-chain degli switch: crea catene di single point of failure",
   "Catalyst = switch da campus (access/distribution/core)"
 ],quiz:[
   {q:"Cos'è un 'single point of failure' in una rete?",o:["Un elemento il cui guasto fa cadere gran parte della rete","Un cavo di riserva","Un tipo di indirizzo IP","Una porta dello switch"],c:0,e:"Un SPOF è un componente non ridondato: se si guasta, tutto ciò che dipende da esso va offline. Si elimina con link e dispositivi ridondanti."},
   {q:"Nel design gerarchico Cisco, quali sono i tre livelli?",o:["Access, Distribution, Core","Leaf, Spine, Backbone","LAN, WAN, MAN","Fisico, Dati, Rete"],c:0,e:"Il modello a 3 livelli è Access (accesso ai dispositivi), Distribution (aggregazione/routing/ACL) e Core (backbone velocissimo)."},
   {q:"Come si chiama il design a due livelli (Access + Distribution)?",o:["Collapsed core","Spine-leaf","Full mesh","Bus"],c:0,e:"Nel two-tier le funzioni del core sono 'collassate' nel distribution layer: da qui il nome collapsed core."},
   {q:"Quale dispositivo gestisce sia MAC (L2) sia IP (L3)?",o:["Switch multilayer (Layer 3)","Hub","Modem","Access point"],c:0,e:"Uno switch multilayer/L3 unisce switching e routing: tipico del distribution e del core layer."},
   {q:"Quale compito NON appartiene tipicamente al distribution layer?",o:["Collegare direttamente i singoli PC e telefoni","Inter-VLAN routing","Applicare le ACL","Summarization delle rotte"],c:0,e:"Collegare i dispositivi finali è compito dell'access layer; il distribution aggrega, instrada tra VLAN e applica le policy."},
   {q:"Perché NON conviene collegare gli switch a catena (daisy-chain)?",o:["Crea una serie di single point of failure","È troppo veloce","Consuma troppa corrente","Richiede il cloud"],c:0,e:"Nel daisy-chain la caduta di un cavo/switch isola tutti quelli a valle: meglio collegamenti ridondanti verso il distribution."}
 ,
   {q:"Nel design gerarchico, cosa fa l'access layer?",o:["Collega i dispositivi finali come PC, telefoni e AP", "Fa da backbone ad altissima velocità della rete", "Instrada tra le VLAN e applica le policy ACL", "Collega le sedi remote attraverso il collegamento WAN"],c:0,e:"L'access layer è il punto in cui si connettono i dispositivi finali; l'aggregazione e il routing sono compito del distribution."},
   {q:"Cosa caratterizza il core layer in un design a 3 livelli?",o:["È il backbone: velocissimo, bassa latenza, affidabile", "Collega direttamente i singoli PC e le stampanti", "Assegna gli indirizzi IP a tutti i client della rete", "Filtra il traffico degli utenti applicando le ACL"],c:0,e:"Il core è il backbone che sposta enormi volumi di traffico con bassa latenza e massima affidabilità."},
   {q:"Quando conviene un design a 3 livelli invece del collapsed core?",o:["In campus grandi con più edifici e molto traffico", "In una piccola rete con un solo switch di accesso", "In una tipica rete domestica con pochi dispositivi", "Solo nei data center con topologia spine-leaf"],c:0,e:"Il three-tier serve nei campus estesi: i distribution di ogni edificio si collegano al core, rendendo la rete scalabile."},
   {q:"Qual è il compromesso principale della ridondanza?",o:["Aumenta l'affidabilità ma costa di più", "Riduce sempre le prestazioni della rete", "Elimina la necessità di usare switch", "Rende la rete complessivamente meno sicura"],c:0,e:"Più dispositivi e link ridondanti tolgono i single point of failure, ma aumentano la spesa: va bilanciata col budget."},
   {q:"Quale funzione è tipica del distribution layer?",o:["Inter-VLAN routing, ACL e summarization delle rotte", "Collegare i singoli PC alle prese a muro dell'ufficio", "Trasmettere il segnale Wi-Fi ai dispositivi client", "Fornire l'alimentazione PoE ai telefoni IP aziendali"],c:0,e:"Il distribution aggrega gli access, instrada tra VLAN, applica le policy (ACL) e riassume le rotte."},
   {q:"A quale ambito sono destinati gli switch Cisco Catalyst?",o:["Al campus: access, distribution e core", "Esclusivamente ai grandi data center", "Soltanto alle piccole reti domestiche", "Solo ai collegamenti WAN tra sedi"],c:0,e:"I Catalyst sono gli switch da campus; i Nexus sono la linea pensata per il data center."},
   {q:"In un grande campus, come si collegano i distribution dei vari edifici?",o:["Al core centrale, non a maglia completa tra loro", "In full mesh diretto tra tutti gli edifici", "Passando attraverso gli access switch", "Con una daisy-chain di router in serie"],c:0,e:"Collegare ogni distribution al core (invece di un full mesh tra edifici) mantiene la rete semplice e scalabile."},
   {q:"Qual è l'obiettivo pratico della ridondanza nel design?",o:["Poter perdere un cavo o un dispositivo restando operativi", "Ridurre al minimo il numero totale di dispositivi di rete", "Eliminare del tutto la necessità degli indirizzi IP", "Aumentare la dimensione dei domini di broadcast"],c:0,e:"La ridondanza serve a sopravvivere al guasto di un singolo elemento senza interrompere il servizio."},
   {q:"Dove si trovano tipicamente gli switch multilayer (L3)?",o:["Nel distribution e nel core layer", "Soltanto nell'access layer", "Soltanto negli access point", "Solo sui collegamenti in fibra"],c:0,e:"Gli switch L3 (switching + routing) sono il cuore del distribution e del core."}
 ]},
 "6-66D9J5PkY":{ep:"EP 7",mod:"switching",sections:[
   {h:"🏢 Dove vivono i server",b:"Quasi ogni risorsa online sta in un data center. Un'azienda può avere un DC proprio (anche un solo rack), affittare spazio/rack (colocation) o usare il cloud (AWS/Azure/GCP = data center di altri). Spesso un mix = hybrid cloud."},
   {h:"🏛️ Vecchio modello: 3-tier (campus)",b:"Access = switch Top-of-Rack (ToR) in cima al rack → Distribution/Aggregation → Core (switch multi-chassis, in coppia per ridondanza). Ottimizzato per il traffico North-South (utente ↔ Internet ↔ server)."},
   {h:"⚠️ Il problema",b:"Con la virtualizzazione il traffico dominante è diventato East-West (server ↔ server), ~70-80% del totale. Nel 3-tier servono troppi hop e latenza imprevedibile; lo Spanning Tree blocca metà dei link ridondanti."},
   {h:"🌿 Nuovo modello: Spine-Leaf (Clos)",b:"Leaf = accesso (ex ToR); Spine = backbone. Full mesh leaf↔spine; mai leaf-leaf né spine-spine. Sempre esattamente 2 hop tra due server qualsiasi → prevedibile e velocissimo."},
   {h:"🔀 Link L3 e hardware",b:"I link leaf↔spine sono Layer 3 (routed): niente blocco da Spanning Tree, load-balancing su tutti i collegamenti con banda piena. Cisco: Nexus per il data center, Catalyst per il campus; i Nexus 9300 fanno da leaf o spine. Sopra l'underlay spine-leaf si costruisce un overlay (Cisco ACI, VXLAN)."}
 ],key:[
   "East-West (server↔server) ≈ 70-80% del traffico nei data center moderni",
   "Spine-Leaf: leaf↔spine full mesh, mai leaf-leaf/spine-spine, sempre max 2 hop",
   "Link leaf-spine = L3 routed → niente STP blocking, load-balancing su tutti i link",
   "Nexus = data center · Catalyst = campus",
   "3-tier = Access (ToR) / Distribution / Core"
 ],quiz:[
   {q:"In una topologia data center spine-leaf, quanti hop separano al massimo due server qualsiasi?",o:["2","1","3","Variabile"],c:0,e:"Ogni leaf è connesso a ogni spine: il percorso server→leaf→spine→leaf→server è sempre di 2 hop, quindi prevedibile."},
   {q:"Quale tipo di traffico costituisce circa il 70-80% in un data center moderno?",o:["East-West (server-server)","North-South (utente-Internet)","Broadcast","Multicast"],c:0,e:"Con la virtualizzazione i server comunicano molto tra loro (east-west), rendendo obsoleto il vecchio design orientato al north-south."},
   {q:"Perché nella spine-leaf i link leaf-spine sono di Livello 3 (routed)?",o:["Per evitare il blocco da STP e fare load-balancing su tutti i link","Perché il L2 è più veloce","Per usare gli indirizzi MAC","Perché lo richiede il cloud"],c:0,e:"Instradando a L3 non serve lo Spanning Tree (che bloccherebbe i link ridondanti) e si bilancia il carico su tutti i collegamenti."},
   {q:"Nella spine-leaf, quali dispositivi NON si collegano tra loro?",o:["Leaf con leaf e spine con spine","Leaf con spine","Server con leaf","Spine con i router"],c:0,e:"Il full mesh è solo tra leaf e spine; i leaf non si collegano tra loro e nemmeno gli spine tra loro."},
   {q:"Quale famiglia di switch Cisco è progettata per i data center?",o:["Nexus","Catalyst","Meraki","Aironet"],c:0,e:"I Nexus sono per il data center (throughput elevatissimo); i Catalyst per il campus/accesso."},
   {q:"Nel design a 3 livelli, come si chiama lo switch in cima a ogni rack?",o:["Top-of-Rack (ToR) / Access","Core","Spine","Distribution"],c:0,e:"Il ToR è lo switch di accesso in cima al rack a cui si collegano i server; nel modello spine-leaf diventa il 'leaf'."}
 ,
   {q:"Dove risiede quasi ogni risorsa online?",o:["In un data center", "Dentro un access point", "In un singolo cavo in fibra", "Nel BIOS del computer"],c:0,e:"Server, siti e servizi vivono nei data center, propri, in colocation o nel cloud."},
   {q:"Come si chiama affittare spazio o rack in un data center di altri?",o:["Colocation", "Cloud pubblico", "On-premises", "Spine-leaf"],c:0,e:"La colocation è affittare spazio/rack in un DC altrui; il cloud è affittare direttamente i server."},
   {q:"Cosa si intende per traffico north-south?",o:["Utente ↔ Internet ↔ server", "Server ↔ server nello stesso data center", "Traffico tra due leaf adiacenti", "Traffico broadcast interno alla VLAN"],c:0,e:"Il north-south è il traffico verso/da l'esterno; l'east-west è quello tra server interni."},
   {q:"Perché il vecchio 3-tier è poco adatto al traffico moderno?",o:["Troppi hop, latenza variabile e STP blocca metà dei link", "È troppo veloce per i moderni server virtualizzati", "Non supporta in alcun modo gli indirizzi IP", "Funziona soltanto insieme al cloud pubblico"],c:0,e:"Il 3-tier è ottimizzato per il north-south; con l'east-west dominante crea troppi hop e lo STP spreca i link ridondanti."},
   {q:"Nel modello spine-leaf, cosa rappresenta lo spine?",o:["Il backbone a cui si collegano tutti i leaf", "Lo switch di accesso diretto ai server", "Il router che porta verso Internet", "Il firewall del perimetro esterno"],c:0,e:"Lo spine è il backbone; ogni leaf si collega a ogni spine in full mesh."},
   {q:"Nel modello spine-leaf, a cosa corrisponde il leaf?",o:["Allo switch di accesso, l'ex Top-of-Rack (ToR)", "Al backbone centrale ad alta velocità della rete", "Al core multi-chassis ridondante del data center", "Al router di bordo che porta verso la WAN"],c:0,e:"Il leaf è lo switch di accesso ai server (prima chiamato Top-of-Rack)."},
   {q:"Cosa ha fatto crescere il traffico east-west nei data center?",o:["La virtualizzazione, con i server che dialogano tra loro", "L'aumento degli utenti che navigano su Internet", "Il passaggio dai cavi in rame alla fibra ottica", "La diffusione delle reti Wi-Fi negli uffici"],c:0,e:"Con la virtualizzazione i server si scambiano moltissimo traffico tra loro (east-west), fino al 70-80%."},
   {q:"Cosa si costruisce sopra l'underlay spine-leaf?",o:["Un overlay come Cisco ACI o VXLAN", "Una semplice VLAN di gestione", "Una leased line dedicata", "Un tunnel MPLS del provider"],c:0,e:"Sull'underlay fisico spine-leaf si costruisce un overlay logico (ACI, VXLAN)."},
   {q:"Come sono collegati leaf e spine tra loro?",o:["In full mesh: ogni leaf a ogni spine", "Ogni leaf a un solo spine dedicato", "In daisy-chain uno dopo l'altro", "Solo attraverso il core layer"],c:0,e:"Il full mesh leaf↔spine garantisce sempre esattamente 2 hop tra due server qualsiasi."}
 ]},
 "xPi4uZu4uF0":{ep:"EP 8",mod:"wan_mod",sections:[
   {h:"🌐 LAN vs WAN",b:"La LAN è la rete interna di un singolo sito (ufficio, data center, casa). La WAN collega tra loro siti geograficamente separati: filiali, sede centrale, data center. Serve perché i servizi sono centralizzati: telefonia (es. CUCM), email, database, siti web, gestionali e POS vivono nel data center/sede, e le filiali devono raggiungerli in modo affidabile."},
   {h:"🧵 Vecchie tecnologie: Leased line",b:"La leased line è un collegamento dedicato punto-punto, privato e sempre attivo. Velocità storiche: T1 ≈ 1,5 Mbps, T3 ≈ 45 Mbps (in Europa E1/E3). Vantaggio: banda garantita solo per te. Svantaggi: costosa e difficile collegare molti siti a maglia. Frame Relay e ATM erano alternative più vecchie (non più nel CCNA)."},
   {h:"🏷️ MPLS",b:"MPLS (Multiprotocol Label Switching) collega tutti i tuoi siti tramite la rete del carrier con una sola connessione per sito. È privato grazie ai circuiti virtuali basati su etichette (label), NON sulla cifratura → per questo si parla di 'MPLS VPN' (virtuale e privata, ma non cifrata). Opera a 'Layer 2.5'. Il router del cliente è il CE (Customer Edge), quello del provider il PE (Provider Edge). Supporta la QoS per dare priorità al traffico (es. voce)."},
   {h:"🚇 Metro Ethernet",b:"Metro E è come un cavo tra due siti nell'area metropolitana, su fibra del provider sotto la città. Opera a Layer 2, velocità 1/10 Gbps, spesso con 2 link ridondanti. Varianti: E-Line = punto-punto (EVC, Ethernet Virtual Circuit), E-LAN = full mesh multipunto ('switch nel cielo'), E-Tree = hub-and-spoke. Tipica per data center↔sede o data center↔data center (disaster recovery)."},
   {h:"🔒 Internet + VPN e SD-WAN",b:"Per le piccole filiali la via economica è una normale connessione Internet pubblica + una VPN site-to-site che cifra il traffico. Svantaggi: Internet è meno affidabile e senza QoS garantita. SD-WAN (Software-Defined WAN) è il rimpiazzo moderno di MPLS: usa le connessioni Internet standard ottimizzandole, ottimo anche per il traffico verso il cloud. MPLS sta calando ma non è morto."}
 ],key:[
   "LAN = rete di un sito · WAN = collega siti geograficamente separati",
   "Leased line = collegamento dedicato punto-punto privato (T1 ≈1,5 Mbps · T3 ≈45 Mbps)",
   "MPLS = label switching ('Layer 2.5'), privato via circuiti virtuali (NON cifrato), supporta QoS",
   "Router WAN: CE = Customer Edge (cliente) · PE = Provider Edge (carrier)",
   "Metro Ethernet = L2: E-Line (punto-punto), E-LAN (full mesh), E-Tree (hub-and-spoke)",
   "Filiali economiche: Internet pubblica + VPN site-to-site (cifrata) · SD-WAN sostituisce MPLS"
 ],quiz:[
   {q:"Qual è la differenza tra LAN e WAN?",o:["La LAN è la rete interna di un sito; la WAN collega siti geograficamente separati","La LAN è sempre più lenta della WAN","La WAN funziona solo via fibra","La LAN è sempre pubblica"],c:0,e:"La LAN copre un singolo sito (ufficio, data center); la WAN collega sedi, filiali e data center distanti tra loro."},
   {q:"Cos'è una leased line?",o:["Un collegamento dedicato punto-punto privato, sempre attivo","Una connessione Internet condivisa","Un tunnel cifrato su Internet","Una VLAN estesa"],c:0,e:"La leased line è un circuito dedicato solo per te (es. T1 ~1,5 Mbps): banda garantita ma costosa e difficile da estendere a molti siti."},
   {q:"In MPLS, come resta separato e privato il traffico di ogni cliente?",o:["Con circuiti virtuali basati su etichette (label), non con la cifratura","Cifrando tutto con IPSec","Con indirizzi MAC dedicati","Con una VLAN per cliente"],c:0,e:"MPLS usa il label switching per creare circuiti virtuali privati: il traffico è isolato ('MPLS VPN') ma non necessariamente cifrato."},
   {q:"Come si chiama il router del cliente al confine con la rete MPLS del provider?",o:["CE (Customer Edge)","PE (Provider Edge)","Core router","Router-on-a-stick"],c:0,e:"Il CE (Customer Edge) è dal lato cliente; il PE (Provider Edge) è il router del carrier a cui il CE si collega."},
   {q:"Quale variante di Metro Ethernet è un collegamento punto-punto?",o:["E-Line","E-LAN","E-Tree","E-Mesh"],c:0,e:"E-Line = punto-punto (EVC). E-LAN = full mesh multipunto ('switch nel cielo'); E-Tree = hub-and-spoke."},
   {q:"Per collegare una piccola filiale in modo economico su Internet pubblico, cosa serve?",o:["Una VPN site-to-site che cifra il traffico","Una leased line dedicata","Una connessione Metro Ethernet","Un circuito MPLS"],c:0,e:"Su Internet pubblico il traffico va cifrato con una VPN site-to-site tra filiale e data center: economico ma senza QoS garantita."}
 ,
   {q:"Perché un'azienda ha bisogno di una WAN?",o:["Per raggiungere da più sedi i servizi centralizzati", "Per velocizzare il traffico della rete locale interna", "Per assegnare gli indirizzi IP ai PC delle filiali", "Per creare e gestire le VLAN sugli switch di sede"],c:0,e:"Email, database, telefonia e gestionali vivono centralizzati: le filiali li raggiungono tramite la WAN."},
   {q:"Qual è la velocità approssimativa di una leased line T1?",o:["Circa 1,5 Mbps", "Circa 45 Mbps", "Circa 1 Gbps", "Circa 100 Mbps"],c:0,e:"Il T1 è circa 1,5 Mbps; il T3 circa 45 Mbps (in Europa E1/E3)."},
   {q:"A quale 'livello' si dice che operi MPLS?",o:["Layer 2.5, tra Data Link e Network", "Layer 7, quello applicativo", "Layer 1, quello fisico", "Layer 4, quello di trasporto"],c:0,e:"MPLS lavora a 'Layer 2.5', tra il L2 e il L3, usando le etichette (label)."},
   {q:"Quale funzione supporta MPLS per dare priorità alla voce?",o:["La QoS", "La cifratura IPSec", "Lo spanning tree", "Il NAT overload"],c:0,e:"MPLS supporta la QoS per dare priorità al traffico sensibile come la voce."},
   {q:"Come si chiama il router del provider al confine col cliente?",o:["PE (Provider Edge)", "CE (Customer Edge)", "Lo switch di accesso", "Il default gateway"],c:0,e:"Il PE è il router del carrier; il CE è quello del cliente che vi si collega."},
   {q:"A quale livello opera Metro Ethernet?",o:["Layer 2", "Layer 3", "Layer 4", "Layer 7"],c:0,e:"Metro Ethernet è un servizio di Livello 2, come un lungo cavo Ethernet tra due siti."},
   {q:"Quale servizio Metro Ethernet realizza un full mesh multipunto?",o:["E-LAN", "E-Line", "E-Tree", "E-Ring"],c:0,e:"E-LAN è full mesh ('switch nel cielo'); E-Line è punto-punto ed E-Tree è hub-and-spoke."},
   {q:"Quale tecnologia moderna sta sostituendo l'MPLS?",o:["SD-WAN", "Frame Relay", "ATM", "Token Ring"],c:0,e:"SD-WAN usa e ottimizza le normali connessioni Internet, sostituendo progressivamente l'MPLS."},
   {q:"Perché si parla di 'MPLS VPN' pur senza cifratura?",o:["È privato grazie ai circuiti virtuali a etichette", "Perché cifra tutto il traffico usando il protocollo IPSec", "Perché usa una VLAN separata per ogni singolo cliente", "Perché il traffico viaggia comunque su Internet pubblico"],c:0,e:"L'isolamento è dato dai circuiti virtuali basati su label, non dalla cifratura: privato ma non cifrato."}
 ]},
 "80vIin4xGp8":{ep:"EP 9",mod:"ssh_sec",sections:[
   {h:"🏠 Rete SOHO",b:"SOHO = Small Office / Home Office: la classica rete di casa dove un unico dispositivo all-in-one fa router + switch + access point + modem e collega tutti i dispositivi (PC, telefoni, TV, Alexa, lampadine smart) a Internet. Più piccola e semplice di una rete enterprise, ma proprio per questo spesso poco sicura."},
   {h:"🎯 4 punti deboli",b:"1) L'esterno (Internet): qualcuno può entrare? 2) I dispositivi interni, soprattutto IoT. 3) Il wireless: chiunque passi può vedere e tentare la tua Wi-Fi. 4) La connessione verso l'azienda (smart working). Il tuo IP pubblico (assegnato dall'ISP) non va condiviso: rivela la posizione approssimativa ed è un bersaglio per le scansioni. Strumenti come nmap scansionano le porte ('buchi') aperte in cerca di vulnerabilità."},
   {h:"🔧 Hardening del router (6+ mosse)",b:"1) Firewall attivo. 2) Disattiva il port forwarding (chiudi tutte le porte). 3) Disabilita il remote management. 4) Cambia username/password di default. 5) Aggiorna il firmware (le patch chiudono le vulnerabilità). 6) Wireless: usa WPA2/WPA3, password forte, non lasciare l'SSID di default (rivela marca/modello → war driving) e usa una rete guest separata. Bonus: non rispondere ai ping dalla WAN per 'volare sotto i radar'."},
   {h:"💡 Il pericolo IoT",b:"I dispositivi interni possono uscire liberamente su Internet: una lampadina o TV smart compromessa diventa un piede dell'hacker dentro la tua rete, e sul firewall sembra traffico legittimo. Soluzione: segmentare gli IoT su VLAN separate, con client/device isolation (impedisce a un dispositivo di parlare con gli altri) e livelli di fiducia diversi."},
   {h:"🛡️ Apparati e VPN",b:"Per queste funzioni servono apparati adeguati: firmware custom (DD-WRT), apparati Cisco (ottimi per fare lab CCNA) o soluzioni prosumer come Ubiquiti/UniFi (controller-based, con IDS/IPS: l'IDS rileva, l'IPS blocca). Per lo smart working si usa una VPN: remote access (software sul PC, es. Cisco AnyConnect) oppure site-to-site (l'azienda fornisce un'appliance/firewall come un Cisco ASA che mantiene un tunnel sicuro). Per accedere da fuori alla tua rete di casa: abilita un server VPN sul router."}
 ],key:[
   "SOHO = rete casa/piccolo ufficio con un dispositivo all-in-one (router+switch+AP)",
   "Non condividere l'IP pubblico; nmap scansiona le porte aperte in cerca di vulnerabilità",
   "Hardening router: firewall on, no port forwarding, no remote management, cambia credenziali di default, aggiorna firmware",
   "Wireless: WPA2/WPA3, password forte, SSID non di default (war driving), rete guest separata",
   "IoT su VLAN separate + client isolation; una lampadina smart compromessa = hacker in rete",
   "VPN: remote access (software sul PC) vs site-to-site (appliance/firewall, es. Cisco ASA) · IDS rileva, IPS blocca"
 ],quiz:[
   {q:"Cos'è una rete SOHO?",o:["La rete di casa/piccolo ufficio con un dispositivo all-in-one (router+switch+AP)","Una rete di data center","Una WAN aziendale","Un protocollo di routing"],c:0,e:"SOHO = Small Office/Home Office: rete piccola dove un unico apparato fa router, switch, access point e modem."},
   {q:"Quale di queste NON è una buona pratica di hardening del router?",o:["Lasciare attivo il remote management con credenziali di default","Aggiornare il firmware","Disattivare il port forwarding","Usare WPA2/WPA3"],c:0,e:"Il remote management con credenziali di default è pericolosissimo: va disabilitato e le credenziali di default vanno sempre cambiate."},
   {q:"Cosa comporta il port forwarding dal punto di vista della sicurezza?",o:["Apre 'buchi' (porte) nel firewall verso l'interno della rete","Cifra il traffico","Aggiorna il firmware","Crea una VLAN"],c:0,e:"Ogni regola di port forwarding espone una porta verso l'esterno: la best practice è chiudere tutte le porte non necessarie."},
   {q:"Come si mettono in sicurezza i dispositivi IoT non fidati?",o:["Su una VLAN separata con client/device isolation","Dando loro l'IP pubblico","Aprendo le porte sul firewall","Disattivando il firewall"],c:0,e:"Gli IoT vanno isolati su VLAN dedicate con client isolation, così una lampadina smart compromessa non raggiunge il resto della rete."},
   {q:"Perché non lasciare l'SSID di default sulla Wi-Fi?",o:["Rivela marca/modello del router e facilita attacchi mirati (war driving)","Rallenta la connessione","Consuma più energia","Impedisce la cifratura"],c:0,e:"Un SSID come 'TP-Link' dice all'attaccante che router usi; meglio un nome personalizzato + WPA2/WPA3 e password forte."},
   {q:"Quale tipo di VPN usa un software installato sul PC per lo smart working?",o:["Remote access VPN","Site-to-site VPN","MPLS VPN","VLAN"],c:0,e:"La remote access VPN (es. Cisco AnyConnect) gira sul PC dell'utente; nel site-to-site è un'appliance/firewall (es. Cisco ASA) a mantenere il tunnel."}
 ,
   {q:"A cosa serve uno strumento come nmap a un attaccante?",o:["A scansionare le porte aperte in cerca di vulnerabilità", "A cifrare il proprio traffico di rete in uscita", "Ad assegnare gli indirizzi IP ai dispositivi", "A creare nuove VLAN separate sullo switch"],c:0,e:"nmap scandaglia le porte ('buchi') aperte alla ricerca di servizi vulnerabili da sfruttare."},
   {q:"Perché non conviene condividere il proprio IP pubblico?",o:["Rivela la posizione approssimativa ed è bersaglio di scansioni", "Rallenta parecchio la connessione a Internet di casa", "Impedisce di collegarsi alla rete Wi-Fi domestica", "Blocca del tutto il funzionamento del server DHCP"],c:0,e:"L'IP pubblico rivela la zona geografica e diventa un bersaglio per le scansioni degli attaccanti."},
   {q:"Perché è importante aggiornare il firmware del router?",o:["Le patch chiudono le vulnerabilità di sicurezza note", "Aumenta la larghezza di banda della connessione", "Crea in automatico nuove VLAN sulla rete di casa", "Assegna gli indirizzi IP a tutti i dispositivi"],c:0,e:"Gli aggiornamenti firmware correggono le falle di sicurezza scoperte nel tempo."},
   {q:"A cosa serve una rete Wi-Fi guest separata?",o:["A isolare gli ospiti dalla rete principale", "A rendere più veloce la Wi-Fi", "A cifrare l'indirizzo IP pubblico", "A disattivare il firewall del router"],c:0,e:"La rete guest tiene gli ospiti (e i loro dispositivi) separati dalla rete di casa."},
   {q:"Perché una lampadina smart compromessa è pericolosa?",o:["Diventa un punto d'appoggio dell'hacker dentro la rete", "Consuma troppa banda della connessione Internet", "Spegne fisicamente lo switch a cui è collegata", "Blocca la risoluzione dei nomi tramite il DNS"],c:0,e:"Un IoT compromesso apre un varco interno e il suo traffico sembra legittimo al firewall."},
   {q:"Qual è la differenza tra IDS e IPS?",o:["L'IDS rileva, l'IPS rileva e blocca", "L'IDS blocca, l'IPS solo rileva", "Sono esattamente la stessa cosa", "Entrambi assegnano gli indirizzi IP"],c:0,e:"L'IDS individua le minacce e segnala; l'IPS va oltre e le blocca attivamente."},
   {q:"Nel VPN site-to-site aziendale, cosa mantiene il tunnel sicuro?",o:["Un'appliance o firewall, ad esempio un Cisco ASA", "Un software installato sul PC dell'utente", "Il router del provider Internet", "Il server DHCP dell'ufficio"],c:0,e:"Nel site-to-site è un'appliance/firewall (es. Cisco ASA) a tenere il tunnel; nel remote access è un software sul PC."},
   {q:"Perché disabilitare il remote management del router?",o:["Evita che qualcuno lo amministri da remoto via Internet", "Aumenta la velocità della rete wireless di casa", "È un passaggio necessario per il port forwarding", "Serve ad attivare il servizio DHCP del router"],c:0,e:"Il remote management esposto è un facile bersaglio: va disattivato se non indispensabile."},
   {q:"Quale NON è uno dei quattro punti deboli di una rete SOHO?",o:["Il numero di VLAN configurate sullo switch di casa", "L'esterno, cioè la connessione verso Internet", "I dispositivi IoT interni poco affidabili", "La connessione wireless aperta agli estranei"],c:0,e:"I quattro punti deboli sono: l'esterno, i dispositivi interni (IoT), il wireless e il collegamento verso l'azienda."}
 ]},
 "37tyxaQbtN4":{ep:"EP 10",mod:"auto_mod",sections:[
   {h:"🏢 On-prem vs Cloud",b:"Ogni app ha bisogno di infrastruttura (server, router, switch, database, firewall). Tradizionalmente questa vive nel tuo data center: è l'on-premises (on-prem). Vantaggio: pieno controllo. Svantaggio: costi iniziali altissimi (acquisto hardware). Il cloud (AWS, Azure, Google Cloud) è invece 'affittare i server di qualcun altro', pagando a consumo (es. pochi centesimi l'ora)."},
   {h:"💸 Capex vs Opex",b:"Comprare hardware on-prem è una spesa in conto capitale (capex). Il cloud sposta tutto su spesa operativa (opex): paghi solo ciò che usi, quando lo usi. Oltre al costo, il cloud brilla per l'elasticità: crei o elimini server in pochi click, scalando su/giù in base al traffico."},
   {h:"📦 Cloud-native: microservizi, container, Kubernetes",b:"Invece di un'unica app monolitica su VM, si spezza l'app in piccoli servizi (microservizi) distribuiti in container, gestiti e orchestrati con Kubernetes (k8s). Sono feature 'cloud-native': tradizionalmente si facevano meglio nel cloud, dove gli strumenti sono già pronti."},
   {h:"🔒 Perché restare on-prem",b:"Non tutto deve andare nel cloud: vincoli di compliance e normative (es. GDPR, dati governativi), enormi requisiti di storage costosi nel cloud, oppure app che richiedono bassa latenza vicino agli utenti. Queste convengono in-house."},
   {h:"🔀 Hybrid cloud e Multi-cloud",b:"Hybrid cloud = mix: app nel cloud quando conviene, on-prem quando no (lo fanno la maggior parte delle aziende). Multi-cloud = usare più provider insieme (in media ~5) per sfruttare feature e costi diversi. Il rovescio della medaglia è la gestione: portali diversi, competenze diverse, interoperabilità. Soluzioni come VMware Cloud Foundation puntano a gestire on-prem e cloud con gli stessi strumenti."}
 ],key:[
   "On-prem = infrastruttura propria nel tuo data center (controllo, ma capex alto)",
   "Cloud = affitti server altrui a consumo (opex, elasticità, scala on-demand)",
   "Cloud-native: microservizi in container orchestrati da Kubernetes (invece delle VM)",
   "Hybrid cloud = mix on-prem + cloud secondo convenienza",
   "Multi-cloud = più provider (AWS, Azure, GCP) insieme",
   "Si resta on-prem per compliance (GDPR), bassa latenza o costi di storage"
 ],quiz:[
   {q:"Cosa significa 'on-premises' (on-prem)?",o:["Infrastruttura di tua proprietà nel tuo data center","Server affittati nel cloud","Una VPN aziendale","Un protocollo di routing"],c:0,e:"On-prem = hardware e servizi che possiedi e gestisci nel tuo data center: massimo controllo ma costi iniziali elevati."},
   {q:"Nel cloud, il modello di spesa passa da capex a…?",o:["Opex (paghi a consumo)","Un costo fisso una tantum","Nessun costo","Solo capex"],c:0,e:"Il cloud trasforma l'acquisto di hardware (capex) in spesa operativa (opex): paghi solo ciò che usi."},
   {q:"Qual è un vantaggio chiave del cloud oltre al costo?",o:["Elasticità: scalare su/giù in pochi click on-demand","Non richiede rete","Elimina la sicurezza","Funziona senza Internet"],c:0,e:"L'elasticità permette di creare/rimuovere risorse rapidamente per seguire i picchi di traffico."},
   {q:"Con quali tecnologie si distribuiscono i microservizi cloud-native?",o:["Container orchestrati da Kubernetes","Solo macchine virtuali","Leased line","Frame Relay"],c:0,e:"I microservizi girano in container gestiti/orchestrati da Kubernetes (k8s), il modo moderno di deploy delle app."},
   {q:"Cos'è l'hybrid cloud?",o:["Un mix di risorse on-prem e cloud pubblico secondo convenienza","Solo cloud pubblico","Solo on-prem","Due data center on-prem"],c:0,e:"L'hybrid cloud combina on-prem e cloud: si mette nel cloud ciò che conviene e si tiene on-prem il resto."},
   {q:"Perché alcune applicazioni restano on-prem invece che nel cloud?",o:["Per compliance/normative, bassa latenza o costi di storage","Perché il cloud è sempre più lento","Perché il cloud non ha server","Per usare indirizzi privati"],c:0,e:"Vincoli normativi (es. GDPR/dati sensibili), esigenze di bassa latenza o costi elevati di storage spingono a tenere certe app in-house."}
 ,
   {q:"In sostanza, cos'è il cloud?",o:["Affittare i server di qualcun altro pagando a consumo", "Un data center interamente di tua proprietà in sede", "Un particolare tipo di VPN aziendale cifrata", "Un moderno protocollo di routing dinamico"],c:0,e:"Il cloud (AWS/Azure/GCP) è affittare l'infrastruttura di altri, pagando solo per ciò che si usa."},
   {q:"Cosa significa 'multi-cloud'?",o:["Usare più provider cloud insieme", "Un solo provider con più regioni", "Solo data center on-premises", "Due VPN site-to-site collegate"],c:0,e:"Il multi-cloud combina più provider (in media circa 5) per sfruttarne feature e costi diversi."},
   {q:"Qual è lo svantaggio principale del multi-cloud?",o:["La gestione: portali, competenze e interoperabilità diverse", "Costa sempre molto di più della soluzione on-premises", "Non permette in alcun modo di avere della ridondanza", "Elimina completamente l'elasticità delle risorse cloud"],c:0,e:"Usare più provider complica la gestione: strumenti, competenze e integrazione diversi."},
   {q:"L'acquisto di hardware on-prem è un esempio di…?",o:["Spesa in conto capitale (capex)", "Spesa operativa a consumo (opex)", "Un costo che non esiste", "Un canone mensile del cloud"],c:0,e:"Comprare hardware è capex; il cloud sposta la spesa su opex (paghi ciò che usi)."},
   {q:"Quali sono i tre principali provider di cloud pubblico?",o:["AWS, Azure e Google Cloud", "Cisco, Juniper e Arista", "TP-Link, Netgear e Asus", "DD-WRT, UniFi e ASA"],c:0,e:"Amazon AWS, Microsoft Azure e Google Cloud sono i tre grandi provider di cloud pubblico."},
   {q:"Cosa si intende per applicazione 'cloud-native'?",o:["Progettata in microservizi dentro container orchestrati", "Un'unica applicazione monolitica su una sola VM", "Un'app che può girare soltanto on-premises in sede", "Un particolare tipo di collegamento leased line"],c:0,e:"Le app cloud-native sono spezzate in microservizi in container, orchestrati (es. Kubernetes)."},
   {q:"A cosa puntano soluzioni come VMware Cloud Foundation?",o:["Gestire on-prem e cloud con gli stessi strumenti", "A sostituire tutti gli switch fisici del data center", "A cifrare la rete Wi-Fi delle abitazioni private", "A creare in automatico le VLAN sulla rete"],c:0,e:"Puntano a unificare la gestione di on-premises e cloud con un'unica cassetta degli attrezzi."},
   {q:"Con il modello a consumo (opex), cosa paghi nel cloud?",o:["Solo le risorse che usi, quando le usi", "Un grande costo iniziale una tantum", "Un canone fisso indipendente dall'uso", "Nulla, perché è sempre gratuito"],c:0,e:"L'opex del cloud significa pagare le risorse in base all'uso effettivo."},
   {q:"Quale approccio adotta la maggior parte delle aziende?",o:["L'hybrid cloud, un mix di on-prem e cloud", "Soltanto il cloud pubblico", "Soltanto l'on-premises", "Solo un multi-cloud a cinque provider"],c:0,e:"La maggioranza sceglie l'hybrid cloud: nel cloud ciò che conviene, on-prem il resto."}
 ]},
 "S7MNX_UD7vY":{ep:"Day 0",mod:"net_basics",sections:[
   {h:"🎯 A cosa serve una rete",b:"Una rete nasce per far comunicare e condividere dati tra computer (e stampanti, telefoni…). L'obiettivo è sempre lo stesso da decenni: collegare dispositivi per scambiare informazioni."},
   {h:"🔀 Switch",b:"Lo switch collega più dispositivi tra loro formando una rete locale (LAN). Quando i dispositivi sono troppi si aggiungono altri switch. Dietro c'è molto altro (MAC, domini di broadcast, VLAN) che vedrai più avanti."},
   {h:"📡 Router e Internet",b:"Il router collega reti diverse e permette loro di parlarsi. Internet non è altro che tantissimi router che si passano i pacchetti, 'saltando' da router a router attraverso grandi distanze fino alla destinazione."},
   {h:"🛡️ Firewall e 📶 Access Point",b:"Il firewall protegge la rete: blocca il traffico non autorizzato (in ingresso e in uscita) e lascia passare solo quello buono. L'access point (WAP) diffonde la rete via onde radio (Wi-Fi) per i dispositivi wireless."},
   {h:"🏠 Casa vs Azienda",b:"A casa un unico dispositivo fa router + switch + modem + firewall + access point. In azienda ci sono apparati separati e più grandi (switch, router, firewall, più access point) con più funzionalità, perché ci sono più utenti e dispositivi."}
 ],key:[
   "Switch = collega dispositivi nella stessa rete locale (LAN)",
   "Router = collega reti diverse; Internet = tanti router che instradano i pacchetti",
   "Firewall = blocca il traffico non autorizzato, in ingresso e in uscita",
   "Access Point (WAP) = diffonde la rete via Wi-Fi",
   "A casa un apparato all-in-one; in azienda dispositivi separati e più grandi"
 ],quiz:[
   {q:"A cosa serve principalmente uno switch?",o:["Collegare più dispositivi nella stessa rete locale","Collegare reti diverse tra loro","Proteggere la rete dagli attacchi","Diffondere il Wi-Fi"],c:0,e:"Lo switch collega i dispositivi di una LAN; è il router a collegare reti diverse."},
   {q:"Qual è il compito del router?",o:["Collegare reti diverse e instradare i pacchetti tra di esse","Collegare i PC nella stessa rete","Cifrare il traffico","Assegnare i MAC"],c:0,e:"Il router mette in comunicazione reti diverse; Internet è fatto di tanti router che instradano i pacchetti."},
   {q:"Cos'è, in sostanza, Internet?",o:["Un'enorme quantità di router che instradano i pacchetti tra reti","Un unico grande computer","Una singola rete locale","Un tipo di switch"],c:0,e:"Internet è l'insieme di innumerevoli router (e switch, firewall…) che fanno 'saltare' i pacchetti da rete a rete fino a destinazione."},
   {q:"Qual è la funzione di un firewall?",o:["Bloccare il traffico non autorizzato e lasciar passare solo quello legittimo","Collegare due reti diverse","Diffondere il Wi-Fi","Assegnare gli IP"],c:0,e:"Il firewall filtra il traffico in ingresso e in uscita, proteggendo la rete."},
   {q:"Cosa fa un Wireless Access Point (WAP)?",o:["Diffonde la rete via onde radio per i dispositivi wireless","Instrada tra reti diverse","Blocca gli attacchi","Converte i segnali in fibra"],c:0,e:"L'access point trasmette la rete via Wi-Fi, permettendo ai dispositivi senza cavo di connettersi."}
 ,
   {q:"A cosa serve fondamentalmente una rete?",o:["A far comunicare e condividere dati tra i dispositivi", "A cifrare i file salvati sul disco del computer", "A produrre e distribuire l'energia elettrica", "A stampare i documenti in modo più veloce"],c:0,e:"Lo scopo di una rete è collegare i dispositivi per scambiare informazioni."},
   {q:"Cosa si fa quando i dispositivi da collegare sono troppi per uno switch?",o:["Si aggiungono altri switch", "Si sostituisce lo switch con un hub", "Si spegne il router principale", "Si riduce la banda disponibile"],c:0,e:"Quando le porte non bastano si aggiungono altri switch per estendere la LAN."},
   {q:"Il router mette in comunicazione…",o:["Reti diverse tra loro", "I PC della stessa rete locale", "Soltanto i dispositivi Wi-Fi", "Soltanto le stampanti di rete"],c:0,e:"Il router collega reti diverse; a collegare i dispositivi di una stessa rete pensa lo switch."},
   {q:"Come arrivano a destinazione i pacchetti su Internet?",o:["Saltando da un router all'altro", "Attraverso un unico grande switch", "In broadcast a tutti gli host", "Via un cavo diretto punto-punto"],c:0,e:"Internet è fatto di tantissimi router che si passano i pacchetti fino alla destinazione."},
   {q:"Il firewall controlla il traffico…",o:["Sia in ingresso sia in uscita", "Soltanto quello in ingresso", "Soltanto quello in uscita", "Soltanto quello interno alla LAN"],c:0,e:"Il firewall filtra il traffico in entrambe le direzioni, lasciando passare solo quello autorizzato."},
   {q:"Con cosa diffonde la rete un access point?",o:["Con onde radio (Wi-Fi)", "Con impulsi di luce", "Con segnali elettrici nel rame", "Con il campo magnetico"],c:0,e:"L'access point trasmette la rete via onde radio, il Wi-Fi."},
   {q:"In una casa, quante 'scatole' fanno router, switch, AP e firewall?",o:["Un unico dispositivo all-in-one", "Quattro dispositivi separati", "Solo il modem del provider", "Nessuna, serve il cloud"],c:0,e:"A casa un solo apparato integra router, switch, modem, firewall e access point."},
   {q:"Perché in azienda si usano apparati separati e più grandi?",o:["Ci sono più utenti, dispositivi e funzioni richieste", "Perché nel complesso costano parecchio di meno", "Perché in ufficio non è disponibile Internet", "Per poter eliminare del tutto la rete Wi-Fi"],c:0,e:"Più utenti e dispositivi richiedono apparati dedicati, più grandi e con più funzionalità."},
   {q:"Lo switch, collegando i dispositivi vicini, crea una…",o:["Rete locale (LAN)", "Rete geografica (WAN)", "Rete cellulare mobile", "VPN cifrata su Internet"],c:0,e:"Collegando i dispositivi di un'area ristretta lo switch forma una LAN."},
   {q:"Quale dispositivo blocca il traffico non autorizzato?",o:["Il firewall", "Lo switch di accesso", "L'access point Wi-Fi", "Il modem del provider"],c:0,e:"È il firewall a filtrare e bloccare il traffico non autorizzato."}
 ]},
 "9eH16Fxeb9o":{ep:"Day 1",mod:"switching",sections:[
   {h:"🔌 Cos'è uno switch",b:"Lo switch collega i dispositivi tramite cavi Ethernet nelle sue porte (8, 24, 48…): i computer comunicano con segnali elettrici che viaggiano nei cavi. Serve a far parlare tra loro i dispositivi della stessa rete locale."},
   {h:"🙈 Hub: il predecessore 'stupido'",b:"Prima degli switch c'erano gli hub. L'hub non ha intelligenza: ripete ogni segnale ricevuto su TUTTE le porte, come se un messaggio a un amico arrivasse a tutti gli amici. È uno spreco di banda e un problema di sicurezza: chiunque (anche un attaccante) può vedere il traffico altrui."},
   {h:"🧠 Switch: intelligente",b:"Lo switch invia il frame solo alla porta del destinatario giusto. Per farlo impara gli indirizzi MAC dei dispositivi (dalla MAC sorgente dei frame) e li memorizza nella tabella CAM. Più efficiente e più sicuro dell'hub."},
   {h:"🏷️ Indirizzi Layer 2 e Layer 3",b:"Un indirizzo identifica in modo univoco un dispositivo. L'indirizzo di Livello 2 è il MAC (fisico); quello di Livello 3 è l'IP. Lo switch lavora con i MAC (L2); l'IP (L3) è competenza del router. Il comando ping serve a verificare se un dispositivo è raggiungibile."}
 ],key:[
   "Hub = ripete il segnale a TUTTE le porte (insicuro, un solo dominio di collisione)",
   "Switch = invia il frame solo alla porta del destinatario",
   "Lo switch impara i MAC (dalla sorgente) e li salva nella tabella CAM",
   "Layer 2 = indirizzo MAC · Layer 3 = indirizzo IP",
   "ping = verifica se un dispositivo è raggiungibile"
 ],quiz:[
   {q:"Qual è la differenza principale tra hub e switch?",o:["L'hub ripete a tutte le porte; lo switch invia solo alla porta del destinatario","L'hub è più veloce","Lo switch opera a Livello 3","L'hub crea le VLAN"],c:0,e:"L'hub è 'stupido' e inoltra a tutte le porte; lo switch usa la MAC per inviare solo al destinatario giusto."},
   {q:"Perché un hub è meno sicuro di uno switch?",o:["Ripete il traffico a tutti, così chiunque può vederlo","Cifra male i dati","Non ha porte","Blocca il ping"],c:0,e:"Poiché l'hub inoltra a tutte le porte, un attaccante collegato può intercettare il traffico degli altri."},
   {q:"Come fa lo switch a sapere su quale porta si trova un dispositivo?",o:["Impara la MAC sorgente dei frame e la salva nella tabella CAM","Interroga il DNS","Usa l'indirizzo IP","Chiede al router"],c:0,e:"Lo switch costruisce la tabella CAM associando ogni MAC sorgente alla porta da cui è arrivata."},
   {q:"A quale livello appartiene l'indirizzo MAC?",o:["Livello 2 (Data Link)","Livello 3 (Network)","Livello 4 (Transport)","Livello 1 (Physical)"],c:0,e:"Il MAC è l'indirizzo di Livello 2; l'IP è di Livello 3 ed è competenza del router."},
   {q:"A cosa serve il comando ping?",o:["Verificare se un dispositivo è raggiungibile","Assegnare un indirizzo IP","Creare una VLAN","Cifrare il traffico"],c:0,e:"Il ping invia un messaggio e attende la risposta per capire se l'host di destinazione è attivo e raggiungibile."}
 ,
   {q:"A cosa serve principalmente uno switch?",o:["A far comunicare i dispositivi della stessa rete locale", "A collegare tra loro reti IP completamente diverse", "A cifrare i frame Ethernet mentre sono in transito", "A diffondere il segnale wireless ai dispositivi"],c:0,e:"Lo switch fa parlare i dispositivi della stessa LAN; a collegare reti diverse pensa il router."},
   {q:"Con quali cavi i dispositivi si collegano alle porte dello switch?",o:["Cavi Ethernet", "Cavi coassiali della TV", "Cavi seriali console", "Cavi di alimentazione"],c:0,e:"I dispositivi si collegano alle porte dello switch tramite cavi Ethernet."},
   {q:"Tipicamente quante porte ha uno switch?",o:["8, 24 o 48", "Sempre e solo 2", "Sempre esattamente 100", "Una sola porta"],c:0,e:"Gli switch hanno tipicamente 8, 24 o 48 porte."},
   {q:"Cosa fa un hub con un segnale che riceve?",o:["Lo ripete su tutte le altre porte", "Lo invia solo al destinatario giusto", "Lo scarta senza inoltrarlo", "Lo cifra prima di inoltrarlo"],c:0,e:"L'hub è 'stupido': ripete ogni segnale su tutte le porte, sprecando banda e riducendo la sicurezza."},
   {q:"A chi invia il frame uno switch?",o:["Solo alla porta del destinatario", "A tutte le porte contemporaneamente", "Soltanto verso il router", "Al server DNS della rete"],c:0,e:"Grazie alla tabella CAM lo switch invia il frame solo alla porta del destinatario."},
   {q:"Da cosa impara lo switch gli indirizzi MAC?",o:["Dalla MAC sorgente dei frame che riceve in ingresso", "Interrogando ogni volta il server DNS della rete", "Leggendo l'indirizzo IP di destinazione del pacchetto", "Chiedendo l'informazione direttamente al server DHCP"],c:0,e:"Lo switch legge la MAC sorgente dei frame e la associa alla porta nella tabella CAM."},
   {q:"Qual è l'indirizzo di Livello 3?",o:["L'indirizzo IP", "L'indirizzo MAC", "Il numero di porta TCP", "Il nome host del PC"],c:0,e:"L'IP è l'indirizzo di Livello 3; il MAC è di Livello 2."},
   {q:"Di chi è competenza l'indirizzo IP (Livello 3)?",o:["Del router", "Dello switch", "Dell'hub", "Dell'access point"],c:0,e:"Il router lavora con gli IP (L3); lo switch lavora con i MAC (L2)."},
   {q:"Come viaggiano i dati nei cavi tra i dispositivi?",o:["Come segnali elettrici", "Come impulsi di luce", "Come onde radio", "Come pacchetti postali"],c:0,e:"Nei cavi in rame i dati viaggiano come segnali elettrici."},
   {q:"A cosa serve un indirizzo, MAC o IP?",o:["A identificare in modo univoco un dispositivo di rete", "A cifrare i dati mentre vengono trasmessi in rete", "A velocizzare le prestazioni della rete locale", "A creare in automatico le VLAN sullo switch"],c:0,e:"Un indirizzo identifica in modo univoco un dispositivo sulla rete."}
 ]},
 "p9ScLm9S3B4":{ep:"EP 2",mod:"routing_s",sections:[
   {h:"📡 Cos'è un router",b:"Il router collega reti diverse e ci connette a Internet. Lo switch fa parlare i dispositivi della stessa rete; quando la destinazione è su un'altra rete (es. un server web) serve il router, il cui compito è instradare il traffico tra reti."},
   {h:"🔢 Cos'è una 'rete'",b:"Una rete è un gruppo di indirizzi IP. Dispositivi con IP nello stesso intervallo (es. 10.1.1.0–10.1.1.255) sono sulla stessa rete; un intervallo diverso è un'altra rete. Non basta collegare due switch: a separare le reti sono gli indirizzi IP, quindi serve un router per farle comunicare."},
   {h:"🔎 ARP (Address Resolution Protocol)",b:"Per inviare un frame, l'host deve conoscere il MAC del destinatario (lo switch parla solo 'MAC'). ARP scopre il MAC associato a un IP: l'host manda una richiesta in broadcast (MAC destinazione FFFF.FFFF.FFFF) 'chi ha questo IP?'; solo il proprietario risponde con il suo MAC."},
   {h:"🚪 Default gateway",b:"Se la destinazione è su un'altra rete, l'host non fa ARP per il server remoto: manda il frame al proprio default gateway (il router), che poi instrada verso la rete di destinazione. Senza router, host su reti IP diverse non possono comunicare."}
 ],key:[
   "Il router collega reti IP diverse e ci porta su Internet",
   "Una 'rete' = un gruppo di indirizzi IP (stesso intervallo = stessa rete)",
   "ARP scopre il MAC associato a un IP (richiesta in broadcast FFFF.FFFF.FFFF)",
   "Per un'altra rete l'host invia al default gateway (il router)",
   "Lo switch non instrada tra reti IP diverse: serve il router"
 ],quiz:[
   {q:"Qual è il compito principale di un router?",o:["Collegare e instradare il traffico tra reti IP diverse","Collegare i dispositivi della stessa rete","Assegnare i MAC","Cifrare il traffico"],c:0,e:"Il router connette reti diverse (e Internet); lo switch invece collega i dispositivi della stessa rete."},
   {q:"Cosa identifica una 'rete' a livello IP?",o:["Un gruppo di indirizzi IP nello stesso intervallo","Il numero di switch collegati","Il tipo di cavo","Il modello del router"],c:0,e:"Dispositivi con IP nello stesso intervallo sono sulla stessa rete; intervalli diversi = reti diverse."},
   {q:"A cosa serve il protocollo ARP?",o:["A scoprire il MAC associato a un indirizzo IP","A cifrare i pacchetti","A instradare tra VLAN","Ad assegnare gli IP"],c:0,e:"ARP risolve un IP nel corrispondente MAC, inviando una richiesta in broadcast a cui risponde solo il proprietario dell'IP."},
   {q:"Quale indirizzo MAC di destinazione usa una richiesta ARP?",o:["Broadcast FFFF.FFFF.FFFF","L'indirizzo del router","000000000000","Quello del DNS"],c:0,e:"La richiesta ARP va in broadcast (FFFF.FFFF.FFFF) così tutti la ricevono, ma solo il proprietario dell'IP risponde."},
   {q:"Se la destinazione è su un'altra rete, a chi invia il frame l'host?",o:["Al proprio default gateway (il router)","Direttamente al server remoto","In broadcast su Internet","Al server DNS"],c:0,e:"Per uscire dalla propria rete l'host consegna il frame al default gateway, che instrada verso la rete di destinazione."}
 ,
   {q:"Quando serve il router invece dello switch?",o:["Quando la destinazione è su un'altra rete IP", "Quando i dispositivi sono nella stessa rete", "Quando bisogna cifrare i dati", "Quando si devono assegnare i MAC"],c:0,e:"Se la destinazione è su un'altra rete serve il router; nella stessa rete basta lo switch."},
   {q:"Due dispositivi sono sulla stessa rete quando…",o:["I loro IP sono nello stesso intervallo", "Hanno lo stesso indirizzo MAC", "Sono collegati con lo stesso cavo", "Hanno lo stesso nome host"],c:0,e:"Appartengono alla stessa rete gli host con IP nello stesso intervallo (es. 10.1.1.0-10.1.1.255)."},
   {q:"Cosa NON è in grado di fare uno switch?",o:["Instradare tra reti IP diverse", "Inoltrare i frame nella LAN", "Imparare gli indirizzi MAC", "Collegare i PC tra loro"],c:0,e:"Lo switch non instrada tra reti IP diverse: quello è compito del router."},
   {q:"Il protocollo ARP risolve…",o:["Un indirizzo IP nel corrispondente indirizzo MAC", "Un nome DNS nel corrispondente indirizzo IP", "Un indirizzo MAC in un numero di porta TCP", "Un IP pubblico nel corrispondente IP privato"],c:0,e:"ARP trova il MAC associato a un IP, indispensabile perché lo switch lavora coi MAC."},
   {q:"Chi risponde a una richiesta ARP?",o:["Soltanto il dispositivo proprietario dell'IP richiesto", "Tutti i dispositivi collegati alla rete locale", "Sempre e in ogni caso soltanto il router", "Il server DHCP che ha assegnato gli indirizzi"],c:0,e:"La richiesta va a tutti in broadcast, ma solo il proprietario dell'IP risponde col proprio MAC."},
   {q:"Perché la richiesta ARP viaggia in broadcast?",o:["Non si conosce ancora il MAC del destinatario", "Per cifrare il messaggio prima di inviarlo in rete", "Per risparmiare banda sulla rete locale", "Per creare in automatico una nuova VLAN"],c:0,e:"Non conoscendo il MAC di destinazione, l'host chiede a tutti in broadcast 'chi ha questo IP?'."},
   {q:"Il default gateway è…",o:["Il router a cui inviare il traffico per altre reti", "Il server DNS che è configurato sul computer", "Lo switch di accesso della rete locale", "Un altro PC che si trova nella stessa rete"],c:0,e:"Il default gateway è il router che inoltra il traffico verso le reti diverse dalla propria."},
   {q:"Cosa succede senza un router tra reti IP diverse?",o:["Gli host su reti diverse non riescono a comunicare", "Comunicano ugualmente passando dallo switch", "Il traffico viene inviato in broadcast su Internet", "Viene creata automaticamente una VLAN condivisa"],c:0,e:"A separare le reti sono gli IP: senza router gli host di reti diverse non si raggiungono."},
   {q:"Oltre a collegare reti tra loro, il router ci porta…",o:["Su Internet", "Nel BIOS del PC", "In una nuova VLAN", "In un dominio di collisione"],c:0,e:"Il router collega reti diverse e ci dà accesso a Internet."},
   {q:"Su cosa basa le sue decisioni uno switch?",o:["Sugli indirizzi MAC (Livello 2)", "Sugli indirizzi IP (Livello 3)", "Sui nomi DNS", "Sui numeri di porta TCP"],c:0,e:"Lo switch inoltra in base ai MAC (L2); il router in base agli IP (L3)."}
 ]},
 "CRdL1PcherM":{ep:"EP 3",mod:"osi_mod",sections:[
   {h:"📜 Perché serve un modello",b:"Agli albori (ARPANET, 1969) le reti erano proprietarie: computer di aziende diverse 'parlavano lingue diverse' e non comunicavano. Servivano regole comuni: nascono i modelli di rete, standard condivisi che permettono a dispositivi di produttori diversi di comunicare."},
   {h:"🧱 Il modello TCP/IP",b:"È il modello realmente usato ('stack TCP/IP'), implementato in ogni computer. Divide la comunicazione in livelli, ciascuno con i suoi protocolli: Physical (cavi, segnali), Data Link (MAC, switch), Network (IP, router), Transport (TCP/UDP, porte), Application (HTTP, DNS…). Nel CCNA lo si vede spesso a 4-5 livelli."},
   {h:"📚 Il modello OSI",b:"L'OSI è il modello di riferimento a 7 livelli. Condivide i primi con TCP/IP (Physical, Data Link, Network, Transport) ma aggiunge in alto due livelli: Session e Presentation. La differenza principale tra OSI e TCP/IP sono proprio questi due livelli extra."},
   {h:"🔁 A cosa servono i livelli",b:"Suddividere le funzioni in livelli rende tutto più semplice e modulare: ogni livello ha un compito e un protocollo standard. Grazie a questi standard un PC può inviare una foto a un Mac: usano tutti le stesse tecnologie di rete."}
 ],key:[
   "I modelli di rete = standard comuni che fanno comunicare dispositivi di produttori diversi",
   "TCP/IP = il modello realmente usato (Physical, Data Link, Network, Transport, Application)",
   "OSI = modello di riferimento a 7 livelli",
   "OSI aggiunge a TCP/IP i livelli Session (5) e Presentation (6)",
   "L1 = cavi/segnali · L2 = MAC/switch · L3 = IP/router · L4 = TCP/UDP/porte"
 ],quiz:[
   {q:"Perché sono nati i modelli di rete (TCP/IP, OSI)?",o:["Per far comunicare dispositivi di produttori diversi con standard comuni","Per rendere le reti più lente","Per usare solo hardware di una marca","Per eliminare gli indirizzi IP"],c:0,e:"Prima le reti erano proprietarie e incompatibili; i modelli definiscono standard condivisi che permettono l'interoperabilità."},
   {q:"Quale modello è quello realmente implementato nei computer?",o:["TCP/IP","OSI","ARPANET","IPX/SPX"],c:0,e:"Il modello TCP/IP (lo 'stack') è quello effettivamente usato; l'OSI resta un modello di riferimento."},
   {q:"Quali livelli aggiunge l'OSI rispetto al TCP/IP?",o:["Session e Presentation","Physical e Data Link","Network e Transport","Nessuno"],c:0,e:"L'OSI ha 7 livelli: rispetto al TCP/IP aggiunge in alto Session (5) e Presentation (6)."},
   {q:"A quale livello appartengono gli indirizzi IP e i router?",o:["Network (Livello 3)","Data Link (Livello 2)","Transport (Livello 4)","Physical (Livello 1)"],c:0,e:"Gli IP e l'instradamento dei router sono di Livello 3 (Network)."},
   {q:"Cosa si trova al livello Transport?",o:["TCP, UDP e i numeri di porta","Gli indirizzi MAC","I cavi Ethernet","Gli indirizzi IP"],c:0,e:"Il Transport (L4) gestisce TCP/UDP e le porte, cioè l'affidabilità e l'identificazione dei servizi."}
 ,
   {q:"Com'erano le prime reti, come ARPANET?",o:["Proprietarie e incompatibili tra produttori diversi", "Già standardizzate, aperte e interoperabili", "Basate fin dall'inizio sul protocollo IPv6", "Interamente wireless e del tutto senza cavi"],c:0,e:"All'inizio ogni produttore aveva la sua rete proprietaria: dispositivi diversi non si parlavano."},
   {q:"Quanti livelli ha il modello OSI?",o:["7", "4", "5", "6"],c:0,e:"L'OSI è il modello di riferimento a 7 livelli."},
   {q:"Cosa gestisce il livello Physical?",o:["I cavi e i segnali", "Gli indirizzi IP", "I numeri di porta", "La cifratura dei dati"],c:0,e:"Il Physical (L1) riguarda i mezzi fisici: cavi, segnali, tensioni."},
   {q:"Cosa opera al livello Data Link?",o:["I MAC e gli switch", "Gli IP e i router", "TCP, UDP e le porte", "HTTP e DNS"],c:0,e:"Il Data Link (L2) usa i MAC ed è il livello degli switch."},
   {q:"Quali livelli condividono OSI e TCP/IP?",o:["Physical, Data Link, Network e Transport", "Soltanto i livelli Session e Presentation", "Soltanto il livello Application in cima", "Nessun livello davvero in comune tra i due"],c:0,e:"I due modelli condividono i primi quattro livelli; l'OSI aggiunge Session e Presentation."},
   {q:"Perché suddividere la comunicazione in livelli?",o:["Rende tutto più semplice e modulare", "Rende la rete più lenta", "Elimina la necessità dei protocolli", "Obbliga a usare una sola marca"],c:0,e:"A livelli, ogni strato ha un compito e un protocollo standard: più semplice e modulare."},
   {q:"Grazie a cosa un PC può inviare una foto a un Mac?",o:["Usano gli stessi standard di rete", "Hanno lo stesso sistema operativo", "Sono della stessa marca", "Condividono lo stesso cavo"],c:0,e:"Gli standard comuni (i modelli di rete) permettono a dispositivi diversi di comunicare."},
   {q:"In quanti livelli si vede spesso il TCP/IP nel CCNA?",o:["In 4-5 livelli", "In 7 livelli", "In 2 livelli", "In 10 livelli"],c:0,e:"Nel CCNA il TCP/IP si presenta spesso in 4 o 5 livelli."},
   {q:"Quale modello è quello 'di riferimento'?",o:["OSI", "TCP/IP", "ARPANET", "Ethernet"],c:0,e:"L'OSI è il modello di riferimento; il TCP/IP è quello realmente implementato."},
   {q:"Qual è la differenza principale tra OSI e TCP/IP?",o:["I due livelli extra Session e Presentation dell'OSI", "Il numero massimo di indirizzi IP supportati", "La velocità con cui trasmettono i dati in rete", "Il tipo di cavo fisico che i due utilizzano"],c:0,e:"La differenza chiave sono i livelli Session (5) e Presentation (6), presenti solo nell'OSI."}
 ]},
 "3kfO61Mensg":{ep:"EP 4",mod:"tcpip_mod",sections:[
   {h:"📦 Incapsulamento",b:"Quando invii dati, il computer li fa scendere lungo i livelli: a ogni livello aggiunge un header, come mettere una lettera dentro buste sempre più grandi. Application (dati) → Transport (header L4) → Network (header L3) → Data Link (frame) → Physical (bit)."},
   {h:"🏷️ Le PDU a ogni livello",b:"Scendendo, il messaggio cambia nome (PDU): al Transport è un Segmento (header TCP/UDP + porta), al Network un Pacchetto (con IP sorgente/destinazione), al Data Link un Frame (con i MAC), al Physical dei Bit."},
   {h:"🔓 Decapsulamento",b:"Sul dispositivo che riceve avviene il processo inverso: da Frame a Pacchetto a Segmento fino ai dati (decapsulamento). Ogni livello 'apre la sua busta' e passa il contenuto al livello superiore."},
   {h:"🌐 Esempio pratico (web)",b:"Aprendo un sito: L7 usa HTTP/HTTPS (richiesta al server), L4 usa TCP con la porta 443 (HTTPS) o 80 (HTTP), L3 aggiunge gli IP sorgente/destinazione per il router, L2 i MAC, L1 i segnali. È l'incapsulamento in azione."}
 ],key:[
   "Incapsulamento = ogni livello aggiunge un header scendendo lo stack",
   "PDU: Dati (L7) → Segmento (L4) → Pacchetto (L3) → Frame (L2) → Bit (L1)",
   "Decapsulamento = processo inverso in ricezione (frame→pacchetto→segmento→dati)",
   "Web: HTTP/HTTPS (L7) · TCP porta 443/80 (L4) · IP (L3) · MAC (L2)",
   "L'header L4 porta il protocollo (TCP/UDP) e il numero di porta"
 ],quiz:[
   {q:"Come si chiama il processo di aggiunta di un header a ogni livello scendendo lo stack?",o:["Incapsulamento","Decapsulamento","Frammentazione","Instradamento"],c:0,e:"Scendendo i livelli ogni strato aggiunge il proprio header (incapsulamento); in ricezione avviene il decapsulamento."},
   {q:"Qual è l'ordine corretto delle PDU dall'alto verso il basso?",o:["Dati → Segmento → Pacchetto → Frame → Bit","Bit → Frame → Pacchetto → Segmento → Dati","Segmento → Frame → Pacchetto → Bit","Pacchetto → Segmento → Dati → Frame"],c:0,e:"Application=Dati, Transport=Segmento, Network=Pacchetto, Data Link=Frame, Physical=Bit."},
   {q:"Come si chiama il messaggio con l'header di Livello 4 (Transport)?",o:["Segmento","Pacchetto","Frame","Bit"],c:0,e:"Con l'header L4 (TCP/UDP + porta) il messaggio è un Segmento; al L3 diventa Pacchetto, al L2 Frame."},
   {q:"Nel decapsulamento (lato ricevente), l'ordine è:",o:["Frame → Pacchetto → Segmento → Dati","Dati → Segmento → Pacchetto → Frame","Bit → Segmento → Dati","Pacchetto → Frame → Bit"],c:0,e:"In ricezione si risale lo stack: ogni livello rimuove il suo header, da Frame fino ai Dati."},
   {q:"Aprendo un sito HTTPS, quale porta e livello sono coinvolti nel Transport?",o:["TCP porta 443 al Livello 4","UDP porta 80 al Livello 3","TCP porta 22 al Livello 2","IP porta 443 al Livello 1"],c:0,e:"HTTPS usa TCP sulla porta 443 al livello Transport (L4)."}
 ,
   {q:"A cosa è paragonabile l'incapsulamento?",o:["A mettere una lettera in buste sempre più grandi", "A tagliare i dati esattamente a metà", "A cifrare per intero il messaggio inviato", "A cancellare tutti gli header aggiunti prima"],c:0,e:"Scendendo lo stack ogni livello aggiunge un header, come buste una dentro l'altra."},
   {q:"Cosa contiene un Pacchetto (Livello 3)?",o:["Gli indirizzi IP sorgente e di destinazione", "Gli indirizzi MAC sorgente e destinazione", "I numeri di porta TCP di origine e arrivo", "I singoli bit grezzi del segnale fisico"],c:0,e:"Al Network il messaggio è un Pacchetto con IP sorgente e destinazione."},
   {q:"Cosa aggiunge il Data Link creando il Frame?",o:["Gli indirizzi MAC", "Gli indirizzi IP", "I numeri di porta", "La cifratura del payload"],c:0,e:"Il Frame (L2) porta gli indirizzi MAC sorgente e destinazione."},
   {q:"Come si chiama la PDU al livello Physical?",o:["Bit", "Frame", "Pacchetto", "Segmento"],c:0,e:"Al Physical il messaggio è ridotto ai Bit trasmessi sul mezzo."},
   {q:"Su quale dispositivo avviene il decapsulamento?",o:["Su quello che riceve i dati", "Su quello che invia i dati", "Solo nel router intermedio", "Non avviene mai"],c:0,e:"Il decapsulamento è il processo inverso, eseguito dal dispositivo ricevente."},
   {q:"Quale porta usa HTTP (non sicuro) al Transport?",o:["80", "443", "22", "53"],c:0,e:"HTTP usa la porta 80; HTTPS la 443."},
   {q:"Cosa porta l'header di Livello 4?",o:["Il protocollo (TCP/UDP) e il numero di porta", "Gli indirizzi IP sorgente e destinazione", "Gli indirizzi MAC dei due dispositivi vicini", "I singoli bit fisici trasmessi sul mezzo"],c:0,e:"L'header L4 indica TCP o UDP e la porta del servizio."},
   {q:"Aprendo un sito, cosa aggiunge il livello Network?",o:["Gli IP sorgente e destinazione per il router", "Gli indirizzi MAC sorgente e destinazione", "La porta TCP del servizio applicativo usato", "I segnali elettrici che viaggiano sul cavo"],c:0,e:"Il Network (L3) aggiunge gli IP necessari al router per instradare."},
   {q:"Il Segmento appartiene a quale livello?",o:["Transport (Livello 4)", "Network (Livello 3)", "Data Link (Livello 2)", "Application (Livello 7)"],c:0,e:"Con l'header L4 (TCP/UDP + porta) il messaggio è un Segmento."},
   {q:"L'incapsulamento avviene mentre i dati…",o:["Scendono lo stack, dall'alto verso il basso", "Risalgono lo stack, dal basso verso l'alto", "Restano fermi su un livello", "Vengono cancellati progressivamente"],c:0,e:"Incapsulare significa aggiungere header scendendo dall'Application al Physical."}
 ]},
 "oIRkXulqJA4":{ep:"EP 5",mod:"osi_mod",sections:[
   {h:"🖥️ Application (7)",b:"È l'interfaccia tra un programma che ha bisogno della rete (browser, gioco online) e la rete stessa. Definisce i protocolli applicativi come HTTP/HTTPS e DNS. È la 'porta d'ingresso' verso i livelli sottostanti."},
   {h:"🎨 Presentation (6)",b:"Rende i dati 'presentabili': gestisce il formato (es. HTML, XML, JPG — tipi che tutti sanno interpretare) e la cifratura (es. SSL/TLS) per proteggere i dati in transito."},
   {h:"🔗 Session (5)",b:"Apre, mantiene e chiude la 'conversazione' (sessione) tra l'applicazione e il server, e gestisce l'autenticazione. Coordina più sessioni contemporanee (es. browser + Spotify). Protocolli tipici: L2TP (VPN), RTCP, H.245 (chiamate/video), proxy SOCKS."},
   {h:"🚚 Transport (4)",b:"Trasporta i dati con TCP (affidabile, con ritrasmissioni) o UDP (veloce, senza garanzie) e usa i numeri di porta per identificare il servizio. Nel modello TCP/IP i livelli 5-6-7 sono raggruppati nell'Application, ma i loro concetti restano validi."}
 ],key:[
   "Application (7) = interfaccia app↔rete (HTTP, DNS…)",
   "Presentation (6) = formato dati (HTML, JPG) e cifratura (SSL/TLS)",
   "Session (5) = apre/gestisce/chiude la conversazione (es. L2TP)",
   "Transport (4) = TCP (affidabile) / UDP (veloce) + numeri di porta",
   "Nel TCP/IP i livelli 5-6-7 sono uniti nell'Application"
 ],quiz:[
   {q:"Cosa fa il livello Application (7)?",o:["Fa da interfaccia tra i programmi (es. browser) e la rete","Instrada i pacchetti","Assegna i MAC","Trasmette i bit sul cavo"],c:0,e:"L'Application layer è il punto d'accesso alla rete per le applicazioni, con protocolli come HTTP/HTTPS e DNS."},
   {q:"Di cosa si occupa il livello Presentation (6)?",o:["Formato dei dati (HTML, JPG) e cifratura (SSL/TLS)","Instradamento IP","Numeri di porta","Indirizzi MAC"],c:0,e:"Il Presentation rende i dati leggibili da tutti (formati standard) e li può cifrare."},
   {q:"Qual è il compito del livello Session (5)?",o:["Aprire, mantenere e chiudere la conversazione tra le applicazioni","Cifrare i dati","Instradare tra reti","Assegnare gli IP"],c:0,e:"Il Session gestisce l'inizio, il mantenimento e la fine dei dialoghi (sessioni) tra host."},
   {q:"Nel modello TCP/IP, dove finiscono i livelli Session e Presentation?",o:["Sono raggruppati nel livello Application","Nel livello Transport","Nel livello Network","Vengono eliminati del tutto"],c:0,e:"Il TCP/IP unisce Application, Presentation e Session in un unico livello Application, ma i concetti restano."},
   {q:"Quale protocollo di trasporto scegli per affidabilità garantita?",o:["TCP","UDP","IP","ICMP"],c:0,e:"TCP garantisce consegna affidabile con ritrasmissioni; UDP è più veloce ma senza garanzie."}
 ,
   {q:"Quali protocolli definisce il livello Application (7)?",o:["HTTP/HTTPS e DNS", "IP e ICMP", "Ethernet e MAC", "TCP e UDP"],c:0,e:"L'Application definisce i protocolli applicativi come HTTP/HTTPS e DNS."},
   {q:"Quale protocollo di cifratura opera al Presentation (6)?",o:["SSL/TLS", "OSPF", "DHCP", "ARP"],c:0,e:"Il Presentation gestisce la cifratura (es. SSL/TLS) e il formato dei dati."},
   {q:"Quali formati gestisce il livello Presentation?",o:["HTML, XML e JPG", "IP e MAC", "TCP e UDP", "OSPF e BGP"],c:0,e:"Il Presentation rende i dati 'presentabili' in formati standard come HTML, XML, JPG."},
   {q:"Oltre ad aprire e chiudere la sessione, il Session gestisce…",o:["L'autenticazione", "L'instradamento IP", "L'assegnazione dei MAC", "La trasmissione dei bit"],c:0,e:"Il Session apre, mantiene e chiude il dialogo e gestisce l'autenticazione."},
   {q:"Cosa coordina il Session quando più app sono aperte?",o:["Più sessioni contemporanee (es. browser e Spotify)", "Gli indirizzi IP dei server da raggiungere", "Le porte fisiche presenti sullo switch", "Le VLAN in cui è suddivisa la rete"],c:0,e:"Il Session coordina più conversazioni contemporanee tra applicazioni diverse."},
   {q:"Quale protocollo di trasporto è veloce ma senza garanzie?",o:["UDP", "TCP", "IP", "HTTP"],c:0,e:"UDP è veloce e senza connessione; TCP è affidabile con ritrasmissioni."},
   {q:"Cosa usa il Transport per identificare il servizio?",o:["I numeri di porta", "Gli indirizzi MAC", "Gli indirizzi IP", "I nomi DNS"],c:0,e:"Il Transport identifica il servizio tramite i numeri di porta."},
   {q:"Quale protocollo è tipico del livello Session?",o:["L2TP", "HTTP", "IP", "Ethernet"],c:0,e:"Tra i protocolli del Session ci sono L2TP, RTCP, H.245 e il proxy SOCKS."},
   {q:"Il livello Application fa da…",o:["Interfaccia tra i programmi e la rete", "Trasporto affidabile dei dati", "Instradamento tra reti diverse", "Trasmissione dei bit sul cavo"],c:0,e:"L'Application è la porta d'accesso alla rete per i programmi."},
   {q:"Nel modello TCP/IP, i livelli 5, 6 e 7 sono…",o:["Uniti in un solo livello Application", "Tenuti separati come nell'OSI", "Del tutto eliminati", "Spostati nel Transport"],c:0,e:"Il TCP/IP raggruppa Session, Presentation e Application in un unico livello."}
 ]},
 "y8h5qY3zwic":{ep:"EP 11",mod:"net_basics",sections:[
   {h:"🧵 Doppino intrecciato (twisted pair)",b:"Un cavo Ethernet UTP (cat5e) ha 4 coppie di fili di rame intrecciati. L'intreccio protegge dai due nemici del segnale: l'EMI (interferenza elettromagnetica) e il crosstalk (interferenza tra i fili vicini). UTP = Unshielded Twisted Pair; l'STP (Shielded) aggiunge una schermatura, usata dove c'è molta EMI (es. fabbriche)."},
   {h:"🧥 Guaina e cavi plenum",b:"La guaina esterna protegge i fili. In certi ambienti (controsoffitti, aree a rischio incendio) si usano cavi plenum, con guaina che non emette fumi tossici bruciando. La categoria (cat3, cat5, cat5e, cat6) si riferisce ai fili di rame, non a tutto il cavo."},
   {h:"⚡ Velocità e standard",b:"I dati viaggiano come variazioni di tensione (binario). Standard: 10BASE-T (10 Mbps, cat3, 2 coppie), 100BASE-TX 'Fast Ethernet' (100 Mbps, cat5, 2 coppie), 1000BASE-T 'Gigabit' (cat5e, tutte e 4 le coppie). La 'T' sta per twisted pair (rame)."},
   {h:"🔌 Straight-through vs Crossover",b:"Il NIC di un PC trasmette sui pin 1-2 e riceve sui 3-6; lo switch fa l'opposto. Perciò tra dispositivi diversi (PC↔switch) si usa un cavo straight-through (pin uguali ai due capi). Tra dispositivi uguali (PC↔PC, switch↔switch) serve un crossover, che incrocia TX e RX (1→3, 2→6). Il connettore è l'RJ45; l'ordine dei colori (standard T568) è fondamentale."}
 ],key:[
   "UTP = doppino intrecciato non schermato; l'intreccio riduce EMI e crosstalk",
   "STP = schermato (ambienti con molta interferenza) · plenum = guaina anti-incendio",
   "10BASE-T (10 Mbps), 100BASE-TX Fast Ethernet (100 Mbps), 1000BASE-T Gigabit (cat5e)",
   "La categoria (cat5e, cat6) si riferisce ai fili di rame",
   "Straight-through: PC↔switch · Crossover: PC↔PC / switch↔switch · connettore RJ45"
 ],quiz:[
   {q:"Perché i fili di un cavo Ethernet sono intrecciati a coppie?",o:["Per ridurre EMI e crosstalk","Per aumentare la lunghezza","Per risparmiare rame","Per cifrare i dati"],c:0,e:"L'intreccio (twisted pair) riduce l'interferenza elettromagnetica (EMI) e il crosstalk tra i fili."},
   {q:"Cosa significa UTP?",o:["Unshielded Twisted Pair (doppino non schermato)","Universal Transport Protocol","Ultra Thin Pair","Unified TCP"],c:0,e:"UTP = doppino intrecciato non schermato; l'STP è la versione schermata per ambienti con molta EMI."},
   {q:"Quale standard raggiunge 1 Gbps usando tutte e 4 le coppie (cat5e)?",o:["1000BASE-T","10BASE-T","100BASE-TX","10GBASE-SR"],c:0,e:"1000BASE-T (Gigabit Ethernet) usa tutte e 4 le coppie del cat5e; 10BASE-T=10 Mbps, 100BASE-TX=100 Mbps."},
   {q:"Quale cavo collega due dispositivi dello stesso tipo (es. switch↔switch) senza auto-MDIX?",o:["Crossover","Straight-through","Coassiale","Seriale"],c:0,e:"Il crossover incrocia TX e RX; lo straight-through (pin uguali ai due capi) si usa tra dispositivi diversi (PC↔switch)."},
   {q:"A cosa si riferisce la 'categoria' (cat5e, cat6) di un cavo?",o:["Ai fili di rame interni","Al connettore RJ45","Alla guaina esterna","Alla velocità della porta"],c:0,e:"La categoria indica la qualità dei fili di rame, non l'intero cavo né il connettore."}
 ,
   {q:"Quante coppie di fili ha un cavo Ethernet UTP?",o:["4 coppie", "2 coppie", "8 coppie", "1 coppia"],c:0,e:"Un cavo UTP cat5e ha 4 coppie di fili di rame intrecciati."},
   {q:"Quali due 'nemici' del segnale combatte l'intreccio dei fili?",o:["EMI e crosstalk", "Calore e umidità", "Peso e lunghezza", "Luce e rumore ambientale"],c:0,e:"L'intreccio riduce l'interferenza elettromagnetica (EMI) e il crosstalk tra i fili."},
   {q:"Dove si usa il cavo STP (schermato)?",o:["Dove c'è molta EMI, come nelle fabbriche", "Nelle case prive di qualsiasi interferenza", "Soltanto nelle dorsali realizzate in fibra", "Nei data center basati interamente sul cloud"],c:0,e:"Lo STP aggiunge una schermatura, utile in ambienti con forte interferenza elettromagnetica."},
   {q:"A cosa serve un cavo plenum?",o:["Bruciando non emette fumi tossici", "Va più veloce degli altri cavi", "Costa meno del cavo normale", "Non richiede alcun connettore"],c:0,e:"I cavi plenum hanno una guaina che non rilascia fumi tossici, usata nei controsoffitti/aree a rischio."},
   {q:"Come viaggiano i dati in un cavo di rame?",o:["Come variazioni di tensione elettrica (binario)", "Come impulsi di luce che rimbalzano nel core", "Come onde radio trasmesse a corto raggio", "Come un campo magnetico che ruota nel cavo"],c:0,e:"Nel rame i bit viaggiano come variazioni di tensione elettrica."},
   {q:"Quale standard è la 'Fast Ethernet' a 100 Mbps?",o:["100BASE-TX", "10BASE-T", "1000BASE-T", "10GBASE-SR"],c:0,e:"100BASE-TX (Fast Ethernet) va a 100 Mbps; 10BASE-T a 10 Mbps, 1000BASE-T a 1 Gbps."},
   {q:"Cosa indica la lettera 'T' nello standard (es. 1000BASE-T)?",o:["Twisted pair, cioè il rame", "Transport, il livello 4", "Terabit al secondo", "Trunk tra switch"],c:0,e:"La 'T' sta per twisted pair (doppino di rame)."},
   {q:"Tra quali dispositivi si usa un cavo straight-through?",o:["Tra dispositivi diversi, come PC e switch", "Tra dispositivi uguali, come switch e switch", "Solo tra due PC collegati", "Solamente nei tratti in fibra"],c:0,e:"Lo straight-through (pin uguali ai due capi) collega dispositivi diversi (PC↔switch)."},
   {q:"Qual è il connettore tipico di un cavo Ethernet?",o:["RJ45", "BNC", "LC", "USB-C"],c:0,e:"Il connettore Ethernet standard è l'RJ45."},
   {q:"Perché conta l'ordine dei colori (standard T568)?",o:["Determina il corretto abbinamento dei pin ai due capi", "Modifica la velocità di elaborazione del computer", "Serve soltanto per ragioni puramente estetiche", "Definisce il tipo di cifratura usata sul cavo"],c:0,e:"L'ordine dei fili (T568) garantisce che i pin corrispondano correttamente ai due estremi."}
 ]},
 "MLxgmkRzgIQ":{ep:"EP 12",mod:"switching",sections:[
   {h:"💡 Cos'è il PoE",b:"Power over Ethernet (PoE) porta alimentazione e dati sullo stesso cavo Ethernet. Utile per alimentare telefoni IP, access point e telecamere di sicurezza con un solo cavo, senza bisogno di un elettricista: il network engineer fa tutto, e spostare un AP significa solo spostare il cavo."},
   {h:"🔌 PSE e PD",b:"Chi fornisce la corrente (tipicamente lo switch) è il PSE (Power Sourcing Equipment); il dispositivo alimentato (telefono, AP, telecamera) è il PD (Powered Device). All'inizio Cisco usava le coppie di fili non utilizzate (pin 4-5 e 7-8) dei cavi cat5."},
   {h:"📈 Standard e potenza",b:"Cisco lo inventò nel 2000 (Cisco Inline Power). Poi gli standard IEEE: 802.3af (2003, PoE, Type 1, 15,4 W), 802.3at (2009, PoE+, Type 2, 30 W — il più diffuso), 802.3bt (PoE++/4PPoE, ancora più potenza, usa tutte e 4 le coppie)."},
   {h:"🎯 Perché usarlo",b:"Ogni dispositivo di rete ha bisogno di due cose: alimentazione e dati. Con il PoE le unisci in un solo cavo: meno cablaggio, meno costi (niente elettricista), massima flessibilità nel posizionare AP e telecamere per una buona copertura."}
 ],key:[
   "PoE = alimentazione + dati sullo stesso cavo Ethernet",
   "PSE = fornisce la corrente (lo switch) · PD = dispositivo alimentato (telefono/AP/telecamera)",
   "802.3af (PoE, 15,4 W) · 802.3at (PoE+, 30 W, il più comune) · 802.3bt (PoE++)",
   "Ideale per telefoni IP, access point e telecamere",
   "Vantaggio: un solo cavo, niente elettricista, posizionamento flessibile"
 ],quiz:[
   {q:"Cosa permette il Power over Ethernet (PoE)?",o:["Portare alimentazione e dati sullo stesso cavo Ethernet","Cifrare il traffico","Creare VLAN","Aumentare la velocità a 10 Gbps"],c:0,e:"Il PoE alimenta il dispositivo e trasmette i dati con un unico cavo, utile per telefoni IP, AP e telecamere."},
   {q:"Nel PoE, come si chiama il dispositivo che fornisce la corrente (di solito lo switch)?",o:["PSE (Power Sourcing Equipment)","PD (Powered Device)","PoE controller","NIC"],c:0,e:"Il PSE fornisce l'alimentazione (spesso lo switch); il PD è il dispositivo alimentato (telefono, AP, telecamera)."},
   {q:"Quale standard è il PoE+ da 30 W, oggi il più diffuso?",o:["802.3at","802.3af","802.3bt","802.11ac"],c:0,e:"802.3at (PoE+, Type 2) fornisce 30 W per porta; l'802.3af (PoE) ne dava 15,4 W, l'802.3bt (PoE++) di più."},
   {q:"Perché usare il PoE per un access point?",o:["Un solo cavo per dati e alimentazione, senza elettricista","Perché cifra il Wi-Fi","Perché aumenta la banda","Perché crea le VLAN"],c:0,e:"Con il PoE l'AP riceve dati e corrente da un unico cavo: meno cablaggio, niente elettricista e posizionamento flessibile."},
   {q:"Come si chiama il dispositivo alimentato via PoE (telefono, telecamera, AP)?",o:["PD (Powered Device)","PSE","Gateway","Repeater"],c:0,e:"Il PD (Powered Device) è il dispositivo che riceve alimentazione via PoE dal PSE."}
 ,
   {q:"Cosa combina il PoE su un unico cavo?",o:["Alimentazione e dati", "Voce e video", "Rame e fibra", "Due VLAN diverse"],c:0,e:"Il Power over Ethernet porta corrente e dati sullo stesso cavo Ethernet."},
   {q:"Chi introdusse per primo il PoE, nel 2000?",o:["Cisco, con la sua tecnologia Inline Power", "L'ente di standardizzazione internazionale IEEE", "Microsoft con il suo Windows Server", "Intel con le sue schede di rete Ethernet"],c:0,e:"Cisco lo inventò nel 2000 (Inline Power); poi arrivarono gli standard IEEE."},
   {q:"Quanta potenza fornisce l'802.3af, il PoE originale?",o:["15,4 W", "30 W", "90 W", "5 W"],c:0,e:"L'802.3af (PoE) dà 15,4 W; l'802.3at (PoE+) 30 W; l'802.3bt (PoE++) di più."},
   {q:"Quale standard PoE usa tutte e 4 le coppie per più potenza?",o:["802.3bt (PoE++)", "802.3af (PoE)", "802.3at (PoE+)", "802.11ac"],c:0,e:"L'802.3bt (PoE++/4PPoE) sfrutta tutte e 4 le coppie per erogare più potenza."},
   {q:"Per quali dispositivi è ideale il PoE?",o:["Telefoni IP, access point e telecamere", "Soltanto i server dei data center", "Soltanto i router di bordo", "Soltanto i PC desktop"],c:0,e:"Il PoE è perfetto per telefoni IP, AP e telecamere di sicurezza."},
   {q:"Qual è un vantaggio pratico del PoE nell'installazione?",o:["Non serve un elettricista per l'alimentazione", "Aumenta la velocità della porta a 10 Gbps", "Cifra automaticamente il traffico", "Crea le VLAN sullo switch"],c:0,e:"Con un solo cavo per dati e corrente si evita l'intervento dell'elettricista."},
   {q:"Con il PoE, spostare un access point significa…",o:["Spostare semplicemente il cavo", "Chiamare ogni volta un elettricista", "Sostituire lo switch di rete", "Riconfigurare da capo il DHCP"],c:0,e:"Alimentazione e dati sullo stesso cavo: per spostare un AP basta spostare il cavo."},
   {q:"Di quali due cose ha bisogno ogni dispositivo di rete?",o:["Alimentazione e dati", "Un IP e un MAC", "Rame e fibra", "Un firewall e un router"],c:0,e:"Ogni dispositivo ha bisogno di corrente e di connettività dati: il PoE le unisce."},
   {q:"Il PSE è il dispositivo che…",o:["Fornisce la corrente, di solito è lo switch", "Riceve l'alimentazione tramite il cavo Ethernet", "Instrada i pacchetti tra reti IP diverse", "Assegna gli indirizzi IP ai dispositivi"],c:0,e:"Il PSE (Power Sourcing Equipment) eroga l'alimentazione; il PD la riceve."},
   {q:"Quanta potenza dà l'802.3at (PoE+), il più diffuso?",o:["30 W", "15,4 W", "5 W", "100 W"],c:0,e:"L'802.3at (PoE+) fornisce 30 W per porta ed è oggi lo standard più comune."}
 ]},
 "E3DEJ7odWq0":{ep:"EP 13",mod:"net_basics",sections:[
   {h:"💡 Luce invece di elettricità",b:"La fibra ottica trasmette i dati con impulsi di luce, non con segnali elettrici come il rame. La luce viaggia velocissima (nel vetro circa il 31% più lenta rispetto al vuoto, ma comunque enorme) e permette banda altissima."},
   {h:"🚀 Perché è fantastica",b:"Tre vantaggi: velocità (banda enorme, quasi illimitata in teoria), distanza (bassa attenuazione: la single-mode arriva fino a ~100 km senza degradare, contro i ~100 m del rame), e nessuna EMI (la luce non genera campo elettromagnetico → niente interferenze/crosstalk)."},
   {h:"🔬 Come funziona: core, cladding, riflessione",b:"La luce viaggia nel core; il cladding attorno la mantiene dentro grazie alla riflessione interna totale (la luce 'rimbalza' restando nel core). All'esterno ci sono guaine di protezione. La fibra è delicata: non va mai piegata bruscamente, altrimenti si rompe."},
   {h:"🔀 Single-mode vs Multimode",b:"Multimode: core più grande (50-62,5 µm), la luce rimbalza in più 'modi', distanze più brevi (es. ~300 m), tipica in campus/data center. Single-mode: core minuscolo (5-9 µm), un solo percorso di luce (laser), distanze lunghissime (fino a ~100 km), usata sulle lunghe tratte."}
 ],key:[
   "La fibra usa impulsi di luce (niente EMI, distanze lunghe, banda enorme)",
   "Bassa attenuazione: single-mode fino a ~100 km · rame ~100 m",
   "Struttura: core (luce) + cladding (riflessione interna totale) + guaina",
   "Multimode = core grande, distanze brevi (~300 m) · Single-mode = core piccolo, lunghe distanze",
   "La fibra è fragile: non piegarla mai bruscamente"
 ],quiz:[
   {q:"Come trasmette i dati la fibra ottica?",o:["Con impulsi di luce","Con segnali elettrici","Con onde radio","Con il campo magnetico"],c:0,e:"La fibra usa impulsi di luce nel core, non elettricità come il rame."},
   {q:"Qual è un vantaggio della fibra rispetto al rame?",o:["Nessuna EMI e distanze molto maggiori","È più economica","È più facile da terminare","Trasporta corrente"],c:0,e:"La luce non genera EMI e ha bassissima attenuazione: la fibra va molto più lontano del rame (fino a ~100 km single-mode)."},
   {q:"Quale tipo di fibra copre le distanze più lunghe (fino a ~100 km)?",o:["Single-mode (core piccolo, laser)","Multimode (core grande)","UTP","STP"],c:0,e:"La single-mode ha un core minuscolo (5-9 µm) con un solo percorso di luce: raggiunge distanze lunghissime; la multimode ha core più grande e distanze più brevi."},
   {q:"Cosa trattiene la luce all'interno del core della fibra?",o:["La riflessione interna totale grazie al cladding","Il campo magnetico","La guaina esterna","Il connettore"],c:0,e:"Il cladding attorno al core provoca la riflessione interna totale, facendo 'rimbalzare' la luce e mantenendola nel core."},
   {q:"Rispetto al rame (limitato a ~100 m), la fibra:",o:["Ha bassa attenuazione e copre distanze molto maggiori","Si degrada prima","Ha più EMI","È più lenta"],c:0,e:"La bassissima attenuazione permette alla fibra di andare molto oltre i ~100 m del rame senza perdere segnale."}
 ,
   {q:"Quali sono i tre grandi vantaggi della fibra?",o:["Velocità, distanza e nessuna EMI", "Prezzo, peso e colore", "Cifratura, VLAN e QoS", "Alimentazione, dati e voce"],c:0,e:"La fibra offre banda enorme, lunghe distanze (bassa attenuazione) e immunità all'EMI."},
   {q:"Quale distanza copre tipicamente la fibra multimode?",o:["Circa 300 m", "Fino a 100 km", "Sempre 10 km", "Circa 1 m"],c:0,e:"La multimode copre distanze brevi (~300 m); la single-mode arriva fino a ~100 km."},
   {q:"Com'è fatto il core della fibra multimode?",o:["Più grande (50-62,5 µm), con più 'modi' di luce", "Minuscolo (5-9 µm), con un solo percorso", "Interamente in rame", "Del tutto assente"],c:0,e:"La multimode ha un core largo in cui la luce rimbalza in più modi, riducendo la distanza utile."},
   {q:"Quale sorgente di luce usa la fibra single-mode?",o:["Un laser, con un unico percorso di luce", "Un LED che genera molti percorsi di luce", "Un normale segnale elettrico come nel rame", "Delle onde radio a bassa frequenza"],c:0,e:"La single-mode usa un laser e un core minuscolo: un unico percorso, distanze lunghissime."},
   {q:"Qual è la struttura di una fibra ottica?",o:["Core, cladding e guaina di protezione", "Un singolo filo di rame nudo", "Due coppie di fili intrecciati", "Un tubo completamente vuoto"],c:0,e:"La luce viaggia nel core, il cladding la trattiene, la guaina protegge il tutto."},
   {q:"Perché non bisogna piegare bruscamente la fibra?",o:["È fragile e si può spezzare", "Perde la sua cifratura", "Cambierebbe colore", "Aumenterebbe l'EMI"],c:0,e:"La fibra è delicata: una piega brusca può romperla interrompendo il segnale."},
   {q:"Perché la fibra non subisce EMI?",o:["La luce non genera alcun campo elettromagnetico", "Perché è schermata da un rivestimento in metallo", "Perché viaggia molto più lentamente del rame", "Perché al suo interno scorre comunque del rame"],c:0,e:"Trasmettendo luce e non elettricità, la fibra non genera né subisce interferenze elettromagnetiche."},
   {q:"Fino a che distanza arriva tipicamente il rame?",o:["Circa 100 m", "Circa 100 km", "Circa 10 km", "Circa 1 km"],c:0,e:"Il rame è limitato a ~100 m; la fibra single-mode arriva a ~100 km."},
   {q:"Cosa permette la fibra in termini di banda?",o:["Banda altissima, quasi illimitata in teoria", "Banda molto ridotta rispetto al rame", "Al massimo 10 Mbps", "La stessa banda del rame"],c:0,e:"La fibra offre una banda enorme, teoricamente quasi illimitata."},
   {q:"Dove si usa tipicamente la fibra multimode?",o:["In campus e data center, sulle brevi distanze", "Sulle lunghissime tratte transoceaniche", "Nelle case al posto della rete Wi-Fi", "Nei cavi che portano l'alimentazione elettrica"],c:0,e:"La multimode è comune in campus e data center per collegamenti brevi."}
 ]},
 "0W4JZIWtjLQ":{ep:"EP 14",mod:"ssh_sec",sections:[
   {h:"🎯 La porta come superficie d'attacco",b:"Una presa Ethernet esposta (ufficio, aeroporto, ristorante) è un punto d'attacco: un dispositivo malevolo collegato può ottenere un IP via DHCP, scoprire subnet mask, gateway e DNS, e poi scansionare la rete (es. con nmap) alla ricerca di host e porte da sfruttare."},
   {h:"🧩 Cosa serve all'attacco (e come spezzarlo)",b:"Perché l'attacco funzioni servono tre condizioni: la porta deve essere attiva (up), deve esserci un DHCP che assegna l'IP, e il dispositivo deve poter raggiungere gli altri host. Togliendo anche solo una di queste condizioni si blocca l'attacco."},
   {h:"🔒 Passo 1: spegnere le porte inutilizzate",b:"La prima difesa: disabilitare (shutdown) tutte le porte non usate. Con 'show ip interface brief | include down' individui le porte spente; poi 'interface <id>' + 'shutdown' le tieni giù, così che se qualcuno le collega non si attivino."},
   {h:"🛡️ Port security",b:"Sulle porte access si abilita la port security per limitare quali/quanti MAC possono usare la porta: 'switchport mode access', 'switchport port-security', 'maximum N' e 'mac-address sticky' (impara e salva il MAC). Alla violazione la porta reagisce: shutdown (err-disabled, default), restrict o protect (scartano il traffico)."}
 ],key:[
   "Una porta Ethernet esposta è una superficie d'attacco (IP via DHCP + scan nmap)",
   "L'attacco richiede: porta up + DHCP + raggiungibilità → toglierne una lo blocca",
   "Spegni (shutdown) tutte le porte inutilizzate",
   "Port security: limita i MAC per porta (maximum, mac-address sticky)",
   "Violazione: shutdown (err-disabled, default), restrict, protect"
 ],quiz:[
   {q:"Perché una porta switch inutilizzata ma attiva è un rischio?",o:["Un dispositivo collegato può ottenere un IP e scansionare la rete","Rallenta lo switch","Consuma troppa corrente","Crea loop STP"],c:0,e:"Una porta up permette a un dispositivo malevolo di prendere un IP via DHCP e scansionare la rete: meglio spegnerla."},
   {q:"Qual è la prima difesa per le porte non usate?",o:["Disabilitarle con shutdown","Aprirle tutte","Attivare il DHCP su di esse","Metterle in trunk"],c:0,e:"Spegnere (shutdown) le porte inutilizzate impedisce che si attivino se qualcuno le collega."},
   {q:"Cosa fa la port security su una porta access?",o:["Limita quali/quanti indirizzi MAC possono usarla","Cifra il traffico","Assegna gli IP","Crea le VLAN"],c:0,e:"La port security restringe i MAC ammessi su una porta (maximum, sticky), bloccando dispositivi non autorizzati."},
   {q:"Quale comando salva automaticamente il MAC appreso nella configurazione?",o:["switchport port-security mac-address sticky","switchport mode trunk","shutdown","ip dhcp snooping"],c:0,e:"Con 'mac-address sticky' lo switch impara il MAC del dispositivo e lo memorizza nel running-config."},
   {q:"Alla violazione, quale modalità (default) mette la porta in err-disabled?",o:["shutdown","protect","restrict","permit"],c:0,e:"La modalità di default 'shutdown' disabilita la porta (err-disabled); 'restrict' e 'protect' scartano solo il traffico."}
 ,
   {q:"Collegandosi a una porta esposta, cosa scopre un attaccante via DHCP?",o:["IP, subnet mask, gateway e DNS", "Le password del Wi-Fi", "Il firmware del router", "I numeri di serie dei dispositivi"],c:0,e:"Il DHCP consegna IP, maschera, gateway e DNS: informazioni preziose per scansionare la rete."},
   {q:"Quali tre condizioni servono perché l'attacco alla porta funzioni?",o:["Porta up, un DHCP che assegna l'IP e raggiungibilità", "La presenza insieme di fibra, rame e Wi-Fi", "Almeno tre VLAN diverse già configurate", "Router, switch e firewall collegati insieme"],c:0,e:"Servono porta attiva, un DHCP che dia l'IP e la possibilità di raggiungere altri host."},
   {q:"Come si blocca l'attacco alla porta esposta?",o:["Togliendo anche una sola delle tre condizioni", "Aumentando la larghezza di banda della porta", "Aprendo un maggior numero di porte sullo switch", "Attivando il servizio DHCP su tutte le porte"],c:0,e:"Basta eliminare una delle tre condizioni (porta up, DHCP, raggiungibilità) per fermare l'attacco."},
   {q:"Quale comando aiuta a individuare le porte spente?",o:["show ip interface brief | include down", "Un semplice ping verso il default gateway", "Un traceroute verso un sito su Internet", "Il comando show running-config completo"],c:0,e:"'show ip interface brief | include down' elenca le interfacce in stato down."},
   {q:"Cosa imposta 'switchport port-security maximum N'?",o:["Il numero massimo di MAC ammessi sulla porta", "La velocità in Mbps a cui lavora la porta", "Il numero di VLAN consentite sul trunk", "La quantità di potenza PoE che viene erogata"],c:0,e:"'maximum N' limita quanti indirizzi MAC possono usare quella porta."},
   {q:"Su quale tipo di porta si abilita la port security?",o:["Su una porta access", "Su una porta trunk", "Su un'interfaccia loopback", "Sul default gateway"],c:0,e:"La port security si configura sulle porte access ('switchport mode access')."},
   {q:"Cosa fanno le modalità 'restrict' e 'protect' alla violazione?",o:["Scartano il traffico senza spegnere la porta", "Spengono subito la porta (err-disabled)", "Aprono tutte le porte dello switch", "Cifrano il traffico della porta"],c:0,e:"'restrict' e 'protect' scartano il traffico in eccesso; solo 'shutdown' mette la porta in err-disabled."},
   {q:"Perché tenere in shutdown le porte inutilizzate?",o:["Così non si attivano se qualcuno le collega", "Per risparmiare un po' di corrente elettrica", "Per velocizzare il funzionamento dello switch", "Per poter creare nuove VLAN sulla rete"],c:0,e:"Una porta in shutdown non si attiva anche se vi si collega un dispositivo: niente accesso."},
   {q:"Cosa fa 'switchport port-security mac-address sticky'?",o:["Impara il MAC del dispositivo e lo salva in config", "Cifra tutto il traffico che passa dalla porta", "Assegna un indirizzo IP statico al dispositivo", "Crea in automatico un collegamento trunk"],c:0,e:"'sticky' apprende il MAC del dispositivo collegato e lo memorizza nel running-config."},
   {q:"Ottenuto un IP, cosa fa l'attaccante con nmap?",o:["Scansiona la rete in cerca di host e porte aperte", "Cifra i propri dati prima di trasmetterli", "Aggiorna il firmware del router di casa", "Crea una VPN sicura verso l'azienda"],c:0,e:"Con un IP valido, nmap serve a mappare host e porte aperte da attaccare."}
 ]}
};
function openVideoNote(id){
  const n=VIDEO_NOTES[id];if(!n)return;
  const v=VIDEOS.find(x=>x.id===id)||{t:''};
  _id('vid-list').style.display='none';
  const head=document.querySelector('#view-video .vid-head');if(head)head.style.display='none';
  const pw=document.querySelector('#view-video .vid-progress-wrap');if(pw)pw.style.display='none';
  const sc=document.querySelector('#view-video .sec-title');if(sc)sc.style.display='none';
  const d=_id('vid-detail');d.style.display='block';d.innerHTML='';
  const back=el('button','ts-back','‹ Torna ai video');back.onclick=closeVideoNote;d.appendChild(back);
  d.appendChild(el('div','vid-note-title','📄 '+(n.ep?n.ep+' · ':'')+v.t));
  const open=el('a','vid-open-pl',"▶ Guarda l'episodio ↗");open.href=vidUrl(id);open.target='_blank';open.rel='noopener';open.style.display='inline-block';open.style.marginBottom='14px';d.appendChild(open);
  n.sections.forEach(s=>{const c=el('div','brief-card');c.style.borderLeftColor='var(--cyan)';const l=el('div','brief-label',s.h);l.style.color='var(--cyan)';c.appendChild(l);c.appendChild(el('div','brief-text',s.b));d.appendChild(c);});
  if(n.key){const c=el('div','brief-card');c.style.borderLeftColor='var(--orange)';const l=el('div','brief-label',"📌 Punti chiave d'esame");l.style.color='var(--orange)';c.appendChild(l);const ul=el('ul','brief-list');n.key.forEach(k=>{const li=document.createElement('li');li.innerHTML=k;ul.appendChild(li);});c.appendChild(ul);d.appendChild(c);}
  if(n.quiz&&n.quiz.length){d.appendChild(el('div','sec-title','Mettiti alla prova'));const qbox=el('div');renderNoteQuiz(qbox,n.quiz);d.appendChild(qbox);d.appendChild(el('div','vid-note-info','💡 Queste domande fanno parte anche del quiz di consolidamento del livello collegato.'));}
  try{window.scrollTo(0,0);}catch(e){}
}
function closeVideoNote(){
  _id('vid-detail').style.display='none';
  const head=document.querySelector('#view-video .vid-head');if(head)head.style.display='';
  const pw=document.querySelector('#view-video .vid-progress-wrap');if(pw)pw.style.display='';
  const sc=document.querySelector('#view-video .sec-title');if(sc)sc.style.display='';
  _id('vid-list').style.display='';
}
function renderNoteQuiz(box,quiz){
  quiz.forEach((raw,qi)=>{
    const q=prepQuestion(raw,'');
    const card=el('div','brief-card');
    card.appendChild(el('div','q-text','<b>'+(qi+1)+'.</b> '+q.question));
    const grid=el('div','opts-grid','');grid.style.marginTop='10px';
    const fb=el('div','feedback','');
    q.options.forEach((opt,i)=>{
      const b=el('button','opt','<span class="opt-lbl">'+['A','B','C','D'][i]+'</span><span>'+opt+'</span>');
      b.onclick=()=>{
        if(card.dataset.done)return;card.dataset.done='1';
        grid.querySelectorAll('.opt').forEach((x,j)=>{x.disabled=true;if(j===q.correct)x.classList.add('ok');});
        if(i!==q.correct)b.classList.add('ko');else addXP(5);
        fb.className='feedback show '+(i===q.correct?'ok':'ko');
        fb.innerHTML='<div class="feedback-title">'+(i===q.correct?'✓ Corretto':'✗ Errato')+'</div><div>'+q.explanation+'</div>';
      };
      grid.appendChild(b);
    });
    card.appendChild(grid);card.appendChild(fb);suppressHover(grid);
    box.appendChild(card);
  });
}
// integra le domande dei riassunti video nei banchi dei moduli (quiz dei livelli)
function integrateVideoQuizzes(){
  Object.keys(VIDEO_NOTES).forEach(function(vid){
    var n=VIDEO_NOTES[vid];if(!n.mod||!n.quiz)return;
    if(!QBANK[n.mod])QBANK[n.mod]=[];
    n.quiz.forEach(function(q){if(!QBANK[n.mod].some(function(x){return x.q===q.q;}))QBANK[n.mod].push(q);});
  });
}

// ══════════════════════════════════════
// IMPOSTAZIONI
// ══════════════════════════════════════
function openSettings(){
  _id('set-goal').value=G.dailyGoal||60;_id('set-goal-v').textContent=G.dailyGoal||60;
  _id('set-export').value=JSON.stringify(G);
  _id('set-import').value='';_id('set-fb').className='fb-strip';
  _id('settings-ov').classList.add('show');
  const c=_id('settings-ov').querySelector('.modal-card');if(c)c.focus();
}
function closeSettings(){_id('settings-ov').classList.remove('show');}
function saveGoal(){G.dailyGoal=+_id('set-goal').value||60;saveG();showToast('🎯 Obiettivo: '+G.dailyGoal+' XP/giorno','var(--accent)');if(_id('view-cal').classList.contains('active'))renderCalendar();}
function copySave(){const ta=_id('set-export');ta.select();try{navigator.clipboard.writeText(ta.value);}catch(e){try{document.execCommand('copy');}catch(_){}}showToast('📋 Backup copiato','var(--green)');}
function importSave(){
  const fb=_id('set-fb');
  try{const s=JSON.parse(_id('set-import').value);if(!s||!s.modules)throw 0;
    localStorage.setItem(SAVE,JSON.stringify(s));
    fb.className='fb-strip show ok';fb.textContent='✓ Backup ripristinato. Ricarico...';
    setTimeout(()=>location.reload(),750);
  }catch(e){fb.className='fb-strip show ko';fb.textContent='✗ Codice non valido: controlla di aver incollato tutto il backup.';}
}
function resetProgress(){
  if(!confirm('Azzerare tutti i progressi? XP, moduli e cronologia saranno cancellati. Operazione irreversibile.'))return;
  try{localStorage.removeItem(SAVE);}catch(e){}
  location.reload();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSettings();});
// ══════════════════════════════════════
// RIPASSO ERRORI (ripetizione dilazionata)
// ══════════════════════════════════════
let RV={};
function reviewTrack(ok,q){
  if(!G.review)G.review=[];const key=q.question;
  if(ok){G.review=G.review.filter(r=>r.q!==key);}
  else if(!G.review.some(r=>r.q===key)){G.review.push({q:q.question,o:q.options.slice(),c:q.correct,e:q.explanation});if(G.review.length>80)G.review.shift();}
  saveG();
}
function renderReviewCard(){
  const c=_id('review-card');if(!c)return;
  const n=(G.review||[]).length;
  if(!n){c.innerHTML='';c.style.display='none';return;}
  c.style.display='block';
  c.innerHTML='<div class="review-card-inner"><div class="rv-left"><div class="rv-ico">🔁</div><div><div class="rv-title">Ripasso errori</div><div class="rv-sub">'+n+' domand'+(n===1?'a':'e')+' da consolidare</div></div></div><button class="rv-go" onclick="openReview()">Ripassa →</button></div>';
}
function openReview(){
  const pool=(G.review||[]).slice();
  if(!pool.length){showToast('Nessun errore da ripassare 🎉','var(--green)');return;}
  RV={pool:qShuffle(pool),cur:0,ok:0};
  _id('review-ov').classList.add('show');renderReview();
  const c=_id('review-ov').querySelector('.modal-card');if(c)c.focus();
}
function closeReview(){_id('review-ov').classList.remove('show');renderReviewCard();}
function renderReview(){
  const wrap=_id('review-body');wrap.innerHTML='';
  if(RV.cur>=RV.pool.length){finishReview();return;}
  const raw=RV.pool[RV.cur],q=prepQuestion(raw,'');
  wrap.appendChild(el('div','game-instr','Domanda '+(RV.cur+1)+'/'+RV.pool.length));
  wrap.appendChild(el('div','q-box','<div class="q-text">'+q.question+'</div>'));
  const grid=el('div','opts-grid'),fb=el('div','feedback'),nb=el('button','next-btn','PROSSIMA →');
  fb.setAttribute('role','status');fb.setAttribute('aria-live','polite');
  let answered=false;
  q.options.forEach((opt,i)=>{
    const b=el('button','opt','<span class="opt-lbl">'+['A','B','C','D'][i]+'</span><span>'+opt+'</span>');
    b.onclick=()=>{
      if(answered)return;answered=true;
      grid.querySelectorAll('.opt').forEach((x,j)=>{x.disabled=true;if(j===q.correct)x.classList.add('ok');});
      const ok=i===q.correct;
      if(ok){RV.ok++;addXP(5);G.review=(G.review||[]).filter(r=>r.q!==raw.q);saveG();}else b.classList.add('ko');
      fb.className='feedback show '+(ok?'ok':'ko');
      fb.innerHTML='<div class="feedback-title">'+(ok?'✓ Corretto — tolto dal ripasso':'✗ Errato — resta nel ripasso')+'</div>'+(ok?'':'<div style="margin-bottom:6px"><b style="color:var(--green)">✓ Risposta corretta:</b> '+q.options[q.correct]+'</div>')+'<div>'+q.explanation+'</div>';
      nb.classList.add('show');
    };
    grid.appendChild(b);
  });
  nb.onclick=()=>{RV.cur++;renderReview();};
  wrap.appendChild(grid);wrap.appendChild(fb);wrap.appendChild(nb);
  if(typeof suppressHover==='function')suppressHover(grid);
}
function finishReview(){
  const wrap=_id('review-body'),rem=(G.review||[]).length;
  wrap.innerHTML='<div class="q-box" style="text-align:center"><div class="q-tag" style="color:var(--green)">RIPASSO COMPLETATO</div><div class="q-text">'+RV.ok+'/'+RV.pool.length+' corrette</div><p style="color:var(--muted);font-size:.85rem;margin-top:10px;line-height:1.6">'+(rem?('Restano <b>'+rem+'</b> domande da ripassare.'):'🎉 Hai svuotato la lista degli errori!')+'</p></div>';
  const row=el('div','result-btns');row.style.marginTop='14px';
  if(rem){const b1=el('button','rbtn rbtn-retry','↻ Continua');b1.onclick=()=>openReview();row.appendChild(b1);}
  const b2=el('button','rbtn rbtn-home','Chiudi');b2.onclick=()=>closeReview();row.appendChild(b2);
  wrap.appendChild(row);updateUI();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReview();});
// ══════════════════════════════════════
// VERSIONE & NOVITÀ · badge cliccabile con changelog in linguaggio semplice
// ══════════════════════════════════════
const APP_VERSION='1.3';
const CHANGELOG=[
 {v:'1.3',d:'4 ago 2026',t:'Domande più oneste',items:[
   "Le domande sono più corrette: prima la risposta giusta era quasi sempre la più lunga e articolata, così si indovinava a occhio. Ora tutte le opzioni si somigliano — conta davvero solo sapere la materia.",
   "Aggiunto questo contatore di versione: tocca il numero in alto a sinistra per vedere le novità."
 ]},
 {v:'1.2',d:'3 ago 2026',t:'Esame come quello vero',items:[
   "La simulazione d'esame è ora in inglese, come l'esame reale Cisco.",
   "Niente più domande ripetute nella stessa simulazione.",
   "Alla fine dell'esame puoi rivedere ogni risposta (giusta o sbagliata) con spiegazione, voce del glossario e schema collegati — e tornare quando vuoi al riepilogo."
 ]},
 {v:'1.1',d:'2 ago 2026',t:"Simulazione d'esame e app installabile",items:[
   "Aggiunta la simulazione d'esame CCNA 200-301 a tempo, con punteggio per area.",
   "Ora puoi installare l'app sul telefono e usarla anche senza connessione.",
   "Nuova guida all'esame con piano di studio di 4 settimane."
 ]},
 {v:'1.0',d:'2 ago 2026',t:'Prima versione',items:[
   "Percorso di livelli dal networking di base fino all'automazione.",
   "Quiz a tempo, laboratori interattivi, glossario e schemi di riferimento."
 ]}
];
function initVersionBadge(){const b=_id('nav-ver');if(b)b.textContent='v'+APP_VERSION;}
function openChangelog(){
  const body=_id('changelog-body');
  let h='<div class="cl-title">✨ Novità dell\'app</div><div class="cl-sub">Versione attuale <b>v'+APP_VERSION+'</b> · ecco cosa è cambiato di recente.</div>';
  CHANGELOG.forEach((r,i)=>{
    h+='<div class="cl-entry"><div class="cl-head"><span class="cl-ver">v'+r.v+'</span>'+(i===0?'<span class="cl-now">ATTUALE</span>':'')+'<span class="cl-date">'+r.d+'</span></div>'+
       '<div class="cl-h">'+escH(r.t)+'</div><ul class="cl-list">';
    r.items.forEach(it=>{h+='<li>'+escH(it)+'</li>';});
    h+='</ul></div>';
  });
  body.innerHTML=h;
  _id('changelog-modal').classList.add('show');
}
function closeChangelog(){_id('changelog-modal').classList.remove('show');}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
initVersionBadge();
integrateVideoQuizzes();
updateUI();
renderTree();
initQuizMenu();
initFacts();
updateHeroProgress();
renderHomeStreak();
// PWA: offline + installabile (attivo solo se servito via http/https)
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
