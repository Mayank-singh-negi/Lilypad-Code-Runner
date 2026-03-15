const frog=document.getElementById("frog");
const game=document.getElementById("gameArea");
const status=document.getElementById("status");
const codeInput=document.getElementById("codeInput");
const tokens=document.getElementById("tokens");
const parseTree=document.getElementById("parseTree");
const irPanel=document.getElementById("irPanel");
const execLog=document.getElementById("execLog");
const logStatus=document.getElementById("logStatus");
const optPanel=document.getElementById("optimizePanel");

let x=200,y=300;

function clamp(){
x=Math.max(0,Math.min(x,game.clientWidth-50));
y=Math.max(0,Math.min(y,game.clientHeight-50));
}

function update(){
clamp();
frog.style.left=x+"px";
frog.style.top=y+"px";
}

async function runCode(){

status.innerText="Running...";
parseTree.innerText="";
irPanel.innerText="";
document.getElementById("semanticChecks").innerHTML="";
document.querySelector("#symbolTable tbody").innerHTML="";
document.querySelector("#symbolTable tbody").innerHTML="";
execLog.innerText="";
logStatus.innerText="RUNNING";
logStatus.style.color="orange";
optPanel.innerHTML="";

const code = codeInput.value;
try {
  ['lexical', 'syntax', 'semantic', 'symbol', 'ir', 'opt', 'exec'].forEach(id => {
    document.getElementById("pill-" + id).className = "pill pill-amber"; 
  });

  const res = await fetch('/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  
  if (data.tokens && data.ast) {
    document.getElementById("pill-lexical").className = "pill pill-green";
    document.getElementById("pill-syntax").className = "pill pill-green";
  }
  
  if (data.symbols) document.getElementById("pill-symbol").className = "pill pill-green";
  if (data.actions) document.getElementById("pill-ir").className = "pill pill-green";
  if (data.optimization) document.getElementById("pill-opt").className = "pill pill-green";
  
  if (!data.error) document.getElementById("pill-semantic").className = "pill pill-green";
  else document.getElementById("pill-semantic").className = "pill pill-red";

  // Phase 1: Lexical - Token Stream
  tokens.innerHTML = "";
  if (data.tokens) {
    data.tokens.forEach(t => {
      const span = document.createElement("span");
      span.className = `token token-${t.type}`;
      span.innerText = t.value;
      const typeLabel = document.createElement("small");
      typeLabel.innerText = t.type;
      span.appendChild(typeLabel);
      tokens.appendChild(span);
    });
  }

  // Phase 2: Syntax - Parse Tree
  parseTree.innerHTML = "";
  if (data.ast) {
    const root = document.createElement("div");
    root.innerHTML = `<strong>${data.ast.type}</strong>`;
    
    data.ast.statements.forEach(stmt => {
      const stmtDiv = document.createElement("div");
      stmtDiv.style.marginLeft = "20px";
      stmtDiv.style.borderLeft = "1px dashed #ccc";
      stmtDiv.style.paddingLeft = "10px";
      
      let color = stmt.error ? "red" : "var(--green-main)";
      stmtDiv.innerHTML = `<span style="color:#666">Statement</span>`;
      
      const cmdDiv = document.createElement("div");
      cmdDiv.style.marginLeft = "20px";
      cmdDiv.style.borderLeft = "1px dashed #ccc";
      cmdDiv.style.paddingLeft = "10px";
      cmdDiv.innerHTML = `<span style="color:${color}">Command "${stmt.command}"</span>`;
      
      if (stmt.args) {
        const argDiv = document.createElement("div");
        argDiv.style.marginLeft = "20px";
        argDiv.style.borderLeft = "1px dashed #ccc";
        argDiv.style.paddingLeft = "10px";
        argDiv.innerHTML = `<span style="color:#999">Args</span>`;
        
        const valDiv = document.createElement("div");
        valDiv.style.marginLeft = "20px";
        valDiv.style.borderLeft = "1px dashed #ccc";
        valDiv.style.paddingLeft = "10px";
        if (stmt.args && stmt.args.type === "Assignment") {
          valDiv.innerHTML = `<span style="color:#b87a00">Assignment -> ${stmt.args.name} = ${stmt.args.value}</span>`;
        } else if (stmt.args && stmt.args.type === "Variable") {
          valDiv.innerHTML = `<span style="color:#b87a00">Variable -> ${stmt.args.name} (Resolved: ${stmt.args.resolved_value !== undefined ? stmt.args.resolved_value : "ERROR"})</span>`;
        } else {
          valDiv.innerHTML = `<span style="color:#b87a00">${stmt.args.type} -> ${stmt.args.value}</span>`;
        }
        
        argDiv.appendChild(valDiv);
        cmdDiv.appendChild(argDiv);
      } else {
        cmdDiv.innerHTML += ` <span style="color:#999; font-size:0.85em;">(no args)</span>`;
      }
      
      stmtDiv.appendChild(cmdDiv);
      root.appendChild(stmtDiv);
    });
    parseTree.appendChild(root);
  }

  // Phase 3: Semantic Checks
  const semanticList = document.getElementById("semanticChecks");
  if (data.semantics) {
    data.semantics.forEach(check => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${check.rule}</strong><br>
          <small style="color:#666">${check.desc}</small>
        </div>
        <span class="status-${check.status.replace(" ", "-")}">${check.status}</span>
      `;
      semanticList.appendChild(li);
    });
  }

  // Phase 4: Symbol Table
  const tbody = document.querySelector("#symbolTable tbody");
  if (data.symbols) {
    for (const [name, sym] of Object.entries(data.symbols)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${name}</td><td>${sym.type}</td><td>${sym.value}</td><td>${sym.scope}</td>`;
      tbody.appendChild(tr);
    }
  }

  if (data.error) {
    status.innerText = "Error";
    const errDiv = document.createElement("div");
    errDiv.style.color = "red";
    errDiv.style.marginTop = "10px";
    errDiv.innerText = data.error;
    tokens.appendChild(errDiv);
    return;
  }

  // Phase 6: Code Optimization
  if (data.optimization) {
    const formatAction = (a) => {
      if (a.type === "move") return `move${a.direction.charAt(0).toUpperCase() + a.direction.slice(1)}(${a.steps});`;
      if (a.type === "wait") return `wait(${a.time});`;
      return `${a.type}();`;
    };
    
    if (!data.optimization.optimized) {
      optPanel.innerHTML = "<span style='color:gray; font-style:italic;'>No sequential commands to optimize.</span>";
    } else {
      let beforeHTML = data.optimization.before.map(a => `<div style="text-decoration:line-through;color:#aaa">${formatAction(a)}</div>`).join("");
      let afterHTML = data.optimization.after.map(a => `<div style="color:var(--green-main);font-weight:bold">${formatAction(a)} <span style="font-size:0.8em;color:#666;font-weight:normal;">${a._merged?'// '+a._merged+' cmds merged':''}</span></div>`).join("");
      optPanel.innerHTML = `
        <div style="display:flex; gap:20px;">
          <div style="flex:1"><strong>Before</strong><br>${beforeHTML}</div>
          <div style="flex:1"><strong>After</strong><br>${afterHTML}</div>
        </div>
      `;
    }
  }

  // Phase 5: Intermediate Representation (Uses Post-Optimization)
  irPanel.innerText = "[\n  " + data.actions.map(a => JSON.stringify(a)).join(",\n  ") + "\n]";

  let delay = 0;
  let totalMs = 0;
  let cmdCount = 0;

  data.actions.forEach((a, i) => {
    let actionDuration = a.type === "wait" ? (a.time * 1000) : 600;
    
    setTimeout(() => {
      exec(a);
      let cmdStr = "";
      if (a.type === "move") cmdStr = `move${a.direction.charAt(0).toUpperCase() + a.direction.slice(1)}(${a.steps})`;
      else if (a.type === "wait") cmdStr = `wait(${a.time})`;
      else cmdStr = `${a.type}()`;
      
      execLog.innerText += `✔️ ${cmdStr} → ${actionDuration}ms\n`;
    }, delay);
    
    delay += actionDuration;
    totalMs += actionDuration;
    cmdCount++;
  });

  setTimeout(() => {
    status.innerText = "Ready";
    logStatus.innerText = "COMPLETE";
    logStatus.style.color = "var(--green-main)";
    document.getElementById("pill-exec").className = "pill pill-green";
    if (cmdCount > 0) {
      execLog.innerText += `-----------------------\nTotal: ${(totalMs / 1000).toFixed(1)}s   (${cmdCount} commands)\n`;
    }
  }, delay);
} catch(e) {
  status.innerText = "Network Error";
  console.error(e);
}
}

function exec(a){

if(a.type === "move"){
  if(a.direction === "right") x += 40 * a.steps;
  if(a.direction === "left") x -= 40 * a.steps;
}

if(a.type === "jump"){
  y -= 60;
  setTimeout(()=>{y+=60;update()},300);
}

if(a.type === "glow") frog.style.filter="drop-shadow(0 0 15px lime)";
if(a.type === "spin") frog.style.transform="rotate(360deg)";
if(a.type === "dash") x += 80;
if(a.type === "float") frog.style.transform="translateY(-20px)";

setTimeout(()=>{
  frog.style.filter="";
  frog.style.transform="";
},400);

update();
}

function addCommand(c){codeInput.value+=c+"\n";}
function undoLastCommand(){
let l=codeInput.value.trim().split("\n");
l.pop();codeInput.value=l.join("\n")+"\n";
}
function clearCode(){codeInput.value="";}

function resetWorkspace(){
  clearCode();
  status.innerText = "Ready";
  logStatus.innerText = "";
  
  // Reset Frog Position
  x = 200;
  y = 300;
  update();
  
  // Clear Panels
  tokens.innerHTML = "";
  parseTree.innerHTML = "";
  irPanel.innerHTML = "";
  document.getElementById("semanticChecks").innerHTML = "";
  document.querySelector("#symbolTable tbody").innerHTML = "";
  execLog.innerHTML = "";
  optPanel.innerHTML = "";
  
  // Reset Pills
  ['lexical', 'syntax', 'semantic', 'symbol', 'ir', 'opt', 'exec'].forEach(id => {
    document.getElementById("pill-" + id).className = "pill pill-amber"; 
  });
}

update();
