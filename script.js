let db = {};
let userId = null;
let isLoggedIn = false;
let CLOUD_DOC = null;

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "hogwarts-a0821",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbCloud = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        isLoggedIn = true;
        userId = user.uid;

        document.getElementById("user-info").innerText =
            `已登入：${user.displayName}`;

        await setupUserDoc(user.uid);
        init();
    } else {
        isLoggedIn = false;
        userId = null;

        document.getElementById("user-info").innerText = "未登入";
    }
});



const provider = new GoogleAuthProvider();

window.loginWithGoogle = async function () {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log("登入成功：", user.displayName);
        isLoggedIn = true;
        

        document.getElementById("user-info").innerText =
            `已登入：${user.displayName}`;

        await setupUserDoc(user.uid);
        init();

    } catch (error) {
        console.error("登入失敗", error);
    }

    
};

async function setupUserDoc(uid) {
    // 👉 用 Firebase UID 當作真正的 cloud id
    userId = uid;

    // 👉 重新綁定 Firestore 文件
    CLOUD_DOC = doc(dbCloud, "users", userId, "data", "class");

    const snap = await getDoc(CLOUD_DOC);

    const defaultDb = {
    total: 0,
    houses: [],
    students: [],
    rules: [],
    customNames: {},
    soundOn: true
};


    if (snap.exists()) {
    db = {
        total: 0,
        houses: [],
        students: [],
        rules: [],
        customNames: {},
        soundOn: true,
        maxStageIdx: 0,
        ...snap.data()
    };
} else {
    db = defaultDb;
    await setDoc(CLOUD_DOC, db);
}

onSnapshot(CLOUD_DOC, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    db = data;

    requestAnimationFrame(render); // 比直接 render 穩
});

}

// 紀錄已經被火盃抽中的學生 ID
let drawnStudentIds = [];
let lastEmojiTargetId = 'rule-n';
let activeTarget = null;
let audioCtx = null;
let currentPopTab = 'pos'; 
let currentLBTab = 'house';
let lastStage = null; // 紀錄上一次的進化狀態
const scrollSfx = new Audio('https://www.soundjay.com/misc/sounds/paper-flutter-1.mp3'); 

const emojiLibrary = {
    magic: ["🏰", "🦁", "🐍", "🦅", "🦡", "🧙", "🎓", "🪄", "🧹", "🔮", "🌿", "🧪", "⚗️", "⚖️", "🗡️", "👑", "🏆", "💍", "📓", "⚡", "🎫", "📜", "✒️", "⏳", "🕯️", "💎", "🌟", "✨", "⚔️", "🛡️", "💣", "🦉", "🕷️", "🐉", "🦄", "💀"],
    class: ["🏫", "🙋‍♂️", "🙋‍♀️", "🏃‍♂️", "🛌", "💨", "🤝", "👏", "👍", "✅", "❌", "💯", "👑", "🏆", "🏅", "🎖️", "🥇", "🥈", "🥉", "⭐", "🌟", "✨", "⏳", "🕗", "🔔", "🎒", "💻", "✏️", "🖋️", "🖍️", "🖌️", "📖", "📓", "📕", "📗", "📘", "📙", "📜", "🎫", "📐", "📏", "🔬", "⚖️", "➕", "➖", "✖️", "➗"],
    face: ["😊", "☺️", "🤗", "😁", "😄", "😆", "😂", "🤣", "😅", "😎", "😍", "🤩", "🥰",  "🥳", "😙", "😲", "😱", "🤯", "🤨", "🤔", "🧐", "🥺", "🤫", "😴", "🤯", "😡", "🥶", "😈", "🤡", "👽", "🤖", "💀", "☠️", "👾", "👻", "🧙‍♂️", "🧙‍♀️", "🧛", "🧟", "👍", "👎", "🤝"  ],
    animal: ["🦁", "🐍", "🦅", "🦡", "🐀", "🐈", "🐕", "🐎", "🦌", "🦒", "🐘", "🐉", "🦇", "🦦", "🐬", "🐢", "🐊", "🦖", "🦂", "🐜", "🐝", "🦋", "🕷️", "🕸️", "🐲", "🦄", "🐺", "🦊", "🦝", "🦉", "🐸"],
    nature: ["🌟", "✨", "🌠", "☀️", "🌕", "🌙", "🌑", "🌍", "🌤️", "🌦️", "☁️", "🌧️", "⛈️", "🌩️", "❄️", "☃️", "⛄", "💨", "🌪️", "🔥", "💧", "⚡", "💦", "🌀", "🌈", "🌊", "☄️", "🌌", "🪐", "🍀", "🌲", "🍄"],
    food: ["🍎", "🍊", "🍋", "🍓", "🍑", "🍒", "🍍", "🍉", "🍞", "🧀", "🍰", "🍩", "🍪", "🍫", "🍦", "🍿", "🍭", "🍗", "🥩", "🍔", "🍕", "🥛", "☕", "🍺", "🍳"],
    activity: ["⚽", "🏀", "⚾", "🏈", "🎾", "🏓", "🎳", "🏹", "🎯", "⛸️", "🥋", "🦾", "🎼", "🎹", "🥁", "🎸", "🎻", "🎤", "🎧", "🎨", "🖌️", "🖍️", "🎬", "🎭", "🔭", "🔬", "🧩", "🎮"],
    travel: ["🚇", "🛤️", "🛶", "⛵", "✈️", "🚀", "🚁", "🛸", "🗺️", "🏝️", "🏔️", "🌋", "⛺", "🛖", "⛪", "🏰", "🏛️", "🌉", "🎡"],
    object: ["💡", "🔦", "🕯️", "🔨", "🪛", "🔧", "🪚", "🗝️", "🧲", "⛓️", "🗡️", "⚔️", "🛡️", "🔬", "🔭", "💊"],
    symbol: ["✅", "❌", "⚠️", "🚫", "💯", "💤", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣","🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩","🟦", "🟪", "🟫", "⬛", "⬜", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "💖", "💘", "🉑", "🈶", "🈚", "🈲", "🚹", "🚺"],
    flag: ["🏆", "👑", "🥇", "🥈", "🥉", "🏅", "🎖️", "🚩", "🏴", "🏳️", "🎌", "🏴‍☠️"]
};


const creatures = [
    {id:"001", n:"玻璃獸", g:[{t:0,l:"蛋期",i:"玻璃獸蛋.png",d:"閃爍光芒的神祕金蛋，周圍還散落著一些金幣。"},{t:150,l:"幼年期",i:"玻璃獸.png",d:"熱愛蒐集閃亮物品的小淘氣。"},{t:300,l:"成年期",i:"玻璃獸突破.png",d:"掌管財富的財神，有著無底洞空間的口袋。"}]},
    {id:"002", n:"爆角怪", g:[{t:450,l:"蛋期",i:"爆角怪蛋.png",d:"外殼堅硬的蛋，周圍散發高溫。"},{t:600,l:"幼年期",i:"爆角怪.png",d:"角內含爆炸液，受到衝擊會引爆。"},{t:750,l:"成年期",i:"爆角怪突破.png",d:"頭上的角又更大了些，看起來極度危險。"}]},
    {id:"003", n:"雷鳥", g:[{t:900,l:"蛋期",i:"雷鳥蛋.png",d:"帶有雷電紋路的蛋，周遭天氣極度不穩。"},{t:1050,l:"幼年期",i:"雷鳥.png",d:"能創造微小風暴，呼風喚雨。"},{t:1200,l:"成年期",i:"雷鳥突破.png",d:"天空的主宰，擁有掌管天氣的能力。"}]},
    {id:"004", n:"鷹馬", g:[{t:1350,l:"蛋期",i:"鷹馬蛋.png",d:"覆蓋著羽毛的蛋，靠近能感受到陣陣微風。"},{t:1500,l:"幼年期",i:"鷹馬.png",d:"鷹爪馬腿，衝刺能日行千里。"},{t:1650,l:"成年期",i:"鷹馬突破.png",d:"掌管風的使者，搧翅能飛上雲霄。"}]}
];

function requireLogin() {
    if (!userId) {
        alert("⚠️ 請先登入");
        return false;
    }
    return true;
}

async function init() {

    if (!CLOUD_DOC) {
        console.log("尚未登入，不載入資料");
        return;
    }

    const snapshot = await getDoc(CLOUD_DOC);

    const defaultDb = {
        total: 0,
        houses: [],
        students: [],
        edit: false,
        rules: [
            {t:"✨ 表現優異", v:5, target:"both"},
            {t:"🚫 違反校規", v:-5, target:"both"}
        ],
        customNames: {},
        soundOn: true
    };

    if (snapshot.exists()) {
    db = snapshot.data();
} else {
    db = defaultDb;
    await setDoc(CLOUD_DOC, db);
}

    if (!db.rules) db.rules = defaultDb.rules;
    if (!db.customNames) db.customNames = {};
    if (db.soundOn === undefined) db.soundOn = true;

    updateSoundIcon();
    filterEmoji('magic', document.querySelector('.emoji-tab'));
    checkEditBtn('h');
    render();

    setTimeout(checkPeevesTrigger, 1500);

    window.addEventListener('mousedown', function(e) {
        const picker = document.getElementById('emoji-selector');
        if (picker && !e.target.closest('.btn-emoji-toggle') && !e.target.closest('#emoji-selector')) {
            picker.style.display = 'none';
        }
    });
}

function playSfx(type) {
    if(!db.soundOn) return;
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if(type === 'up') { osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); gain.gain.setValueAtTime(0.1, now); } 
    else if(type === 'down') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.1); gain.gain.setValueAtTime(0.05, now); } 
    else { osc.frequency.setValueAtTime(600, now); gain.gain.setValueAtTime(0.05, now); }
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(); osc.stop(now + 0.2);
}

function toggleSound() { db.soundOn = !db.soundOn; updateSoundIcon(); playSfx('click'); }
function updateSoundIcon() { document.getElementById('sound-toggle').innerText = db.soundOn ? "🔊" : "🔇"; }

function showPage(p) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-center button').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + p).classList.add('active');
    document.getElementById('nav-' + p).classList.add('active');
    playSfx('click');
    checkEditBtn(p);

    // 當切換到大廳 (h) 時觸發檢查
    if (p === 'h') {
        // 延遲一點點時間，讓頁面切換完再飛出來
        setTimeout(checkPeevesTrigger, 600);
    }
}

function checkEditBtn(p) {
    const editBtn = document.getElementById('edit-btn');
    if (p === 'h' || p === 's') { editBtn.style.visibility = 'visible'; } 
    else { editBtn.style.visibility = 'hidden'; db.edit = false; }
    render();
}

function toggleEdit() { db.edit = !db.edit; playSfx('click'); render(); }

function openPop(type, id, extra = null) {
    if(db.edit && type === 's') { editStudentInfo(id); return; }
    if(db.edit && type === 'h') return;
    
    playSfx('click');
    activeTarget = {type, id}; 
    const pop = document.getElementById('pop');
    const titleEl = document.getElementById('pop-title');
    const tabArea = document.querySelector('.pop-tabs');

    if (type === 'beast_info') {
        if(tabArea) tabArea.style.display = 'none';
        titleEl.innerText = extra.label;
        document.getElementById('pop-list').innerHTML = `
            <div style="text-align:center; margin-bottom:15px;"><img src="${extra.img}" style="max-width:150px;"></div>
            <p>${extra.desc}</p>
        `;
    } else {
        if(tabArea) tabArea.style.display = 'flex';
        titleEl.innerText = (type === 'h' ? `學院：${id}` : `學生：${db.students[id].n}`) + " 評分";
        switchPopTab('pos'); 
    }
    document.getElementById('mask').style.display = 'block';
    pop.style.display = 'block';
}

function switchPopTab(tab) {
    currentPopTab = tab;
    const tPos = document.getElementById('tab-pos');
    const tNeg = document.getElementById('tab-neg');
    if(tPos) tPos.classList.toggle('active', tab === 'pos');
    if(tNeg) tNeg.classList.toggle('active', tab === 'neg');
    renderPopList();
}

function renderPopList() {
    const listEl = document.getElementById('pop-list');
    const { type, id } = activeTarget;
    let filteredRules = db.rules.filter(r => {
        if (type === 'h') return r.target === 'house' || r.target === 'both';
        if (type === 's') return r.target === 'student' || r.target === 'both';
        return true;
    });
    filteredRules = filteredRules.filter(r => currentPopTab === 'pos' ? r.v >= 0 : r.v < 0);
    listEl.innerHTML = filteredRules.map(r => `
        <button class="pop-btn ${r.v >= 0 ? 'btn-pos' : 'btn-neg'}" onclick="submitScore(${r.v})">
            ${r.t} (${r.v >= 0 ? '+' : ''}${r.v})
        </button>
    `).join('');
    if (filteredRules.length === 0) listEl.innerHTML = `<div style="text-align:center; padding:20px; opacity:0.5;">尚無此類校規</div>`;
}

function submitScore(v) {
    if (!requireLogin()) return;
    if(activeTarget.type === 's') {
        // 單人加分：直接針對該學生，不論狀態
        db.students[activeTarget.id].s += v;
        let hObj = db.houses.find(h => h.name === db.students[activeTarget.id].h);
        if(hObj) hObj.s += v;
        db.total += v;
    } else if(activeTarget.type === 'h') {
        const houseName = activeTarget.id;
        
        // 【核心邏輯】：過濾掉 status 是 'away' (請假) 的學生
        // 只有「在線」的學生會被選入這個 list
        let activeStudents = db.students.filter(s => s.h === houseName && s.status !== 'away');
        
        // 只有這些 activeStudents 會加個人分
        activeStudents.forEach(s => {
            s.s += v;
        });

        // 學院總分 = 實際加分的人數 * 分值
        // 這樣就不會發生「全班加分但總分對不起來」的問題
        let totalChange = activeStudents.length * v;
        
        let hObj = db.houses.find(h => h.name === houseName);
        if(hObj) hObj.s += totalChange;
        db.total += totalChange;
    }
    
    if(db.soundOn) playSfx(v >= 0 ? 'up' : 'down');
    showBeastFeedback(v); 
    closePop(); 
    render();
    saveCloud();
}

function closePop() { document.getElementById('mask').style.display='none'; document.getElementById('pop').style.display='none'; }

function addRule() { 
    if (!requireLogin()) return;
    let tn = document.getElementById('rule-n'), tv = document.getElementById('rule-v'), tt = document.getElementById('rule-target'), t = tn.value, v = parseInt(tv.value), target = tt.value;
    if(t) { db.rules.push({t, v, target}); tn.value = ""; playSfx('up'); render(); } 
saveCloud();
}
function editRule(i) {
    const r = db.rules[i];
    const newT = prompt("修改校規名稱：", r.t);
    if (newT === null) return; 
    const newV = prompt("修改分數：", r.v);
    if (newV === null) return;
    db.rules[i].t = newT;
    db.rules[i].v = parseInt(newV) || 0;
    render(); 
    saveCloud();
}
function delRule(idx) { db.rules.splice(idx, 1); playSfx('down'); render(); }

function addH() { 
    if (!requireLogin()) return;
    let hn = document.getElementById('in-h-n'), n = hn.value, c = document.getElementById('in-h-c').value; 
    if(n) { db.houses.push({ name: n, s: 0, c: c }); hn.value = ""; playSfx('up'); render(); 
saveCloud();
} 
}
function delHouse(idx) { db.houses.splice(idx, 1); playSfx('down'); render(); 
    saveCloud();
}

function addS() { 
    if (!requireLogin()) return;
    let sn = document.getElementById('in-s-n'), n = sn.value, h = document.getElementById('sel-h').value; 
    if(n && h) { db.students.push({ 
    id: crypto.randomUUID(),
    n, 
    h, 
    s: 0, 
    status: 'normal' 
});
 sn.value = ""; playSfx('up'); render();
saveCloud();
 } 
}
function editStudentInfo(idx) {
    const s = db.students[idx];
    const newName = prompt("修改學生姓名：", s.n);
    if(newName === null) return;
    const newHouse = prompt(`修改所屬學院 (目前: ${s.h})：`, s.h);
    if(newHouse && db.houses.find(h => h.name === newHouse)) {
        let oldH = db.houses.find(h => h.name === s.h);
        let newH = db.houses.find(h => h.name === newHouse);
        if(oldH) oldH.s -= s.s;
        s.h = newHouse;
        if(newH) newH.s += s.s;
    }
    s.n = newName || s.n; render();
}
function delStudent(idx) { 
    const student = db.students[idx]; 
    db.total -= student.s; 
    let targetH = db.houses.find(h => h.name === student.h);
    if (targetH) targetH.s -= student.s; 
    db.students.splice(idx, 1); playSfx('down'); render(); 
saveCloud();
}

function moveItem(list, idx, dir) {
    let target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    render();
}

function getActiveCreature() {
    let curC = creatures[0];

    for (const c of creatures) {
        const maxT = c.g?.[c.g.length - 1]?.t || 0;
        if (db.total >= maxT) {
            curC = c;
        }
    }

    
    return curC;
}

function showBeastFeedback(val) {
    const container = document.getElementById('beast-display-area');
    const ft = document.createElement('div');
    ft.className = 'feedback-text';
    ft.innerText = (val >= 0 ? '+' : '') + val;
    ft.style.color = val >= 0 ? '#2ecc71' : '#e74c3c';
    ft.style.left = (Math.random() * 60 + 20) + "%"; ft.style.top = (Math.random() * 40 + 30) + "%";
    container.appendChild(ft);
    const mood = document.createElement('div');
    mood.className = 'mood-emoji';
    const happy = ["😄", "✨", "🌟", "💖", "🥳"]; const sad = ["😟", "💢", "☁️", "💧", "🥀"];
    mood.innerText = val >= 0 ? happy[Math.floor(Math.random()*happy.length)] : sad[Math.floor(Math.random()*sad.length)];
    container.appendChild(mood);
    setTimeout(() => { ft.remove(); mood.remove(); }, 1200);
}

function filterEmoji(category, el) {
    document.querySelectorAll('.emoji-tab').forEach(tab => tab.classList.remove('active'));
    if(el) el.classList.add('active');
    const container = document.getElementById('emoji-container');
    container.innerHTML = emojiLibrary[category].map(e => `<div class="emoji-item" onclick="pickEmoji('${e}')">${e}</div>`).join('');
}
function pickEmoji(e) { 
    const input = document.getElementById(lastEmojiTargetId); 
    input.value = e + input.value; input.focus(); 
    document.getElementById('emoji-selector').style.display = 'none'; 
}

function render() {
    // --- 1. 決定奇獸狀態與形態 ---
    let curC = getActiveCreature();
    if (db.maxStageIdx === undefined) db.maxStageIdx = 0;
    // 更新最高形態索引
    curC.g.forEach((g, index) => {
        if (db.total >= g.t && index > db.maxStageIdx) {
            db.maxStageIdx = index;
        }
    });

    let curG = curC.g[Math.min(db.maxStageIdx, curC.g.length - 1)];

    // 進化通知
    if (lastStage && lastStage !== curG.l) {
        showEvolutionPop(curG, "✨ 奇獸進化！");
    }
    lastStage = curG.l;

    // --- 2. 更新 UI 與圖片邏輯 (核心修正區) ---
    const imgEl = document.getElementById('c-img');
    const stageEl = document.getElementById('c-stage');
const nameEl = document.getElementById('c-name');
if (nameEl) {
    const currentName = db.customNames[curC.id] || curC.n;
    // 統一佈局，確保筆在右方不遮擋名字
    nameEl.style.display = "flex";
    nameEl.style.alignItems = "center";
    nameEl.style.justifyContent = "center";
    nameEl.style.gap = "8px"; 
    
    nameEl.innerHTML = `
        <span>${currentName}</span>
        <span id="rename-btn" onclick="renameBeast('${curC.id}')" title="賦予新名字">✒️</span>
    `;
}
    if (imgEl) {
        // 先換圖片路徑
        imgEl.src = encodeURI(curG.i);
        
        // 判斷當前濾鏡：是否能量不足？
        let statusFilter = "";
        if (db.total < curG.t) {
            statusFilter = "grayscale(1) opacity(0.4) blur(1px)";
            stageEl.innerText = `(${curG.l} - 能量不足)`;
            stageEl.style.color = "#e74c3c"; 
        } else {
            statusFilter = "none";
            stageEl.innerText = `(${curG.l})`;
            stageEl.style.color = "inherit";
        }

        // 實作存檔特效 + 保持黑白狀態
        imgEl.style.transition = 'none'; 
        // 這裡同時套用「金光」和「原本的狀態濾鏡」
        imgEl.style.filter = `brightness(1.8) drop-shadow(0 0 15px gold) ${statusFilter}`;
        
        setTimeout(() => {
            imgEl.style.transition = 'filter 0.5s ease-out';
            // 特效結束後，恢復成應有的狀態（彩色或黑白）
            imgEl.style.filter = statusFilter;
        }, 150);
        
        imgEl.style.opacity = '1';
    }

    // --- 3. 更新其餘分數 UI ---
    document.getElementById('score-total').innerText = db.total;
    

    let currentStageScore = 0, targetStageScore = 2000;
    for (let i = 0; i < curC.g.length; i++) {
        if (db.total >= curC.g[i].t) {
            currentStageScore = curC.g[i].t;
            targetStageScore = curC.g[i+1] ? curC.g[i+1].t : currentStageScore + 500;
        }
    }

    let progressPercent = Math.max(0, Math.min(((db.total - currentStageScore) / (targetStageScore - currentStageScore)) * 100, 100));
    document.getElementById('p-fill').style.width = progressPercent + "%";

    // 3. 學院與下拉選單
    const selH = document.getElementById('sel-h');
    if(selH) selH.innerHTML = db.houses.map(h => `<option value="${h.name}">${h.name}</option>`).join('');
    document.getElementById('hg-list').innerHTML = db.houses.map((h, i) => `
        <div class="hg-box" onclick="openPop('h','${h.name}')">
            ${db.edit ? `<div class="abolish-btn" onclick="event.stopPropagation(); delHouse(${i});">廢除</div>` : ''}
            <div class="hg-score">${h.s}</div>
            <div class="hg-shape">
                <div class="hg-sand" style="background:${h.c}; height:${Math.min(Math.max(h.s / 10, 0), 100)}%"></div>
                ${db.edit ? `<div class="arrow-container">
                    <div class="tri-arrow left" onclick="event.stopPropagation(); moveItem(db.houses, ${i}, -1)"></div>
                    <div class="tri-arrow right" onclick="event.stopPropagation(); moveItem(db.houses, ${i}, 1)"></div>
                </div>` : ''}
            </div>
            <div class="hg-name">${h.name}</div>
        </div>`).join('');

// --- 第三步：替換學生名單渲染邏輯 ---
    const listSEl = document.getElementById('list-s');
    if (listSEl) {
listSEl.innerHTML = db.students.map((s, i) => {
            const hObj = db.houses.find(h => h.name === s.h);
            const borderColor = hObj ? hObj.c : '#ccc';
            const sClass = s.status || 'normal';
            const scoreText = (s.s >= 0 ? '+' : '') + s.s;
            
            // 決定狀態圖示
            let sIcon = '🧙‍♂️'; 
            if (s.status === 'away') sIcon = '🌙';      
            else if (s.status === 'detention') sIcon = '🔒';

            // 構建 HTML
            let html = `<div class="card ${sClass}" onclick="cycleStudentStatus(${i})" style="border-color: ${borderColor}; position: relative;">`;
            
            // 左上角狀態標籤 (加入 Inline Style 確保它漂亮地浮在左上角)
            html += `<div class="status-badge" style="position:absolute; top:4px; left:4px; background:rgba(255,255,255,0.9); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 1px 3px rgba(0,0,0,0.2); z-index:5;">${sIcon}</div>`;
            
            if (db.edit) {
                html += `<div class="del-x" onclick="event.stopPropagation(); delStudent(${i});">×</div>`;
                html += `<div class="edit-pen">✎</div>`;
            }
            
            // 分數數字：注意這裡加入了 event.stopPropagation()，這樣點數字加分時，才不會觸發「請假狀態切換」
            html += `<div class="score-num" onclick="event.stopPropagation(); openPop('s', ${i})">${scoreText}</div>`;
            
            html += `<div class="student-name">${s.n}</div>`;
            html += `<div style="font-size:11px; color:#666;">${s.h}</div>`;
            
            if (db.edit) {
                html += `<div class="arrow-container">
                    <div class="tri-arrow left" onclick="event.stopPropagation(); moveItem(db.students, ${i}, -1)"></div>
                    <div class="tri-arrow right" onclick="event.stopPropagation(); moveItem(db.students, ${i}, 1)"></div>
                </div>`;
            }
            
            html += `</div>`;
            return html;
        }).join('');
    }

    const posRules = db.rules.filter(r => r.v >= 0);
    const negRules = db.rules.filter(r => r.v < 0);
const ruleDisplayEl = document.getElementById('rule-display');
if (ruleDisplayEl) {
    const posHtml = db.rules
        .map((r, i) => (r.v >= 0 ? renderSingleRule(r, i) : ""))
        .join("");
    const negHtml = db.rules
        .map((r, i) => (r.v < 0 ? renderSingleRule(r, i) : ""))
        .join("");

ruleDisplayEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:25px; width:100%;">
        <div>
            <span style="color:#2ecc71; font-weight:bold; margin-bottom:12px; display:block; font-size:16px;">● 獎勵項目</span>
            <div style="display:flex; flex-wrap:wrap; gap:12px; width:100%;">
                ${posHtml}
            </div>
        </div>
        <div>
            <span style="color:#e74c3c; font-weight:bold; margin-bottom:12px; display:block; font-size:16px;">● 處罰項目</span>
            <div style="display:flex; flex-wrap:wrap; gap:12px; width:100%; padding-bottom: 20px;">
                ${negHtml}
            </div>
        </div>
    </div>
`;
}
    document.getElementById('book-list').innerHTML = creatures.map(c => {
        let isOwned = db.total >= c.g[0].t;
        return `<div style="display:flex; align-items:center; background:white; padding:15px; border-radius:12px; margin-bottom:10px; border:1px solid #ddd; opacity: ${isOwned ? 1 : 0.4}">
            <div style="flex:1"><b>${c.id} ${isOwned ? (db.customNames[c.id] || c.n) : '???'}</b></div>
            <div style="display:flex; gap:10px;">
                ${c.g.map(g => `<div style="width:50px; height:50px; background:#eee; border-radius:8px; overflow:hidden; cursor:pointer;" onclick="${db.total >= g.t ? `openPop('beast_info',null,{label:'${c.n}',img:'${g.i}',desc:'${g.d}'})`:''}">
                <img src="${g.i}" style="width:100%; height:100%; object-fit:contain; filter:${db.total>=g.t?'none':'brightness(0) opacity(0.2)'}"></div>`).join('')}
            </div>
        </div>`;
    }).join('');
}

function renderSingleRule(r, originalIdx) {
    const targetLabel = r.target === 'both' ? '全體' : (r.target === 'house' ? '學院' : '學生');
    const scoreColor = r.v >= 0 ? '#2ecc71' : '#e74c3c';
    const scorePrefix = r.v >= 0 ? '+' : '';

    return `
        <div class="rule-item-card">
            ${db.edit ? `<div onclick="event.stopPropagation(); delRule(${originalIdx})" style="cursor:pointer; color:var(--red); font-weight:bold; margin-right:8px; font-size:18px;">×</div>` : ''}
            
            <div class="rule-content-box" ${db.edit ? `onclick="event.stopPropagation(); editRule(${originalIdx})" style="cursor:pointer;"` : ''}>
                <div class="rule-main-text">
                    ${r.icon ? `<span style="margin-right:4px;">${r.icon}</span>` : ''}
                    <span>${r.t}</span>
                </div>
                <span class="rule-score-tag" style="color: ${scoreColor};">
                    (${scorePrefix}${r.v})
                </span>
            </div>

            <span class="rule-target-tag">${targetLabel}</span>

            ${db.edit ? `
                <div style="display: flex; flex-direction: column; gap: 2px; margin-left: 8px; opacity: 0.3;">
                    <div style="cursor: pointer; font-size: 10px;" onclick="event.stopPropagation(); moveItem(db.rules, ${originalIdx}, -1)">▲</div>
                    <div style="cursor: pointer; font-size: 10px;" onclick="event.stopPropagation(); moveItem(db.rules, ${originalIdx}, 1)">▼</div>
                </div>
            ` : ''}
        </div>
    `;
}



document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-emoji-toggle');
    const selector = document.getElementById('emoji-selector');
    
    if (btn) {
        e.stopPropagation();
        e.preventDefault();

        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes("'")) {
            lastEmojiTargetId = onclickAttr.split("'")[1];
        } else {
            lastEmojiTargetId = 'rule-n'; 
        }

        if (selector.style.display === 'block') {
            selector.style.display = 'none';
            return;
        }

        selector.style.display = 'block';
        
        const rect = btn.getBoundingClientRect();
        const selectorHeight = 320; 
        const spaceBelow = window.innerHeight - rect.bottom;
        
        if (spaceBelow < selectorHeight && rect.top > selectorHeight) {
            selector.style.top = (rect.top - selectorHeight - 5) + 'px';
        } else {
            selector.style.top = (rect.bottom + 5) + 'px';
        }
        
        let left = rect.left;
        if (left + 300 > window.innerWidth) {
            left = window.innerWidth - 310;
        }
        selector.style.left = Math.max(10, left) + 'px';

    } else if (selector && !e.target.closest('#emoji-selector')) {
        selector.style.display = 'none';
    }
});

function toggleEmojiPicker(event, targetId) { 
}


// --- 整合後的排行榜功能 ---

function openLeaderboard() {
    // 1. 播放羊皮紙音效
    if (db.soundOn && scrollSfx) {
        scrollSfx.currentTime = 0;
        scrollSfx.play().catch(e => console.log("音效播放受阻，需先與頁面互動"));
    }
    playSfx('click');

    // 2. 顯示遮罩與卷軸
    const mask = document.getElementById('scroll-mask');
    const el = document.getElementById('leaderboard-scroll');
    
    if(mask && el) {
        mask.style.display = 'block';
        el.style.display = 'block';
        setTimeout(() => el.classList.add('active'), 10);
        
        // 3. 預設顯示學院排行
        renderLBContent('house'); 
    }
}

function closeLeaderboard() {
    const el = document.getElementById('leaderboard-scroll');
    const mask = document.getElementById('scroll-mask');
    if(el) el.classList.remove('active');
    setTimeout(() => {
        if(el) el.style.display = 'none';
        if(mask) mask.style.display = 'none';
    }, 300);
}

function renderLBContent(type) {
    currentLBTab = type;

    // 切換分頁按鈕的高亮狀態
    const tabHouse = document.getElementById('lb-tab-house');
    const tabStudent = document.getElementById('lb-tab-student');
    if(tabHouse) tabHouse.classList.toggle('active', type === 'house');
    if(tabStudent) tabStudent.classList.toggle('active', type === 'student');
    
    const container = document.getElementById('lb-main-content');
    if(!container) return;

    let html = `<table class="scroll-table"><tr><th>排名</th><th>名稱</th><th>總分</th></tr>`;

    if (type === 'house') {
        const sortedHouses = [...db.houses].sort((a, b) => b.s - a.s);
        sortedHouses.forEach((h, i) => {
            html += `<tr>
                <td class="rank-icon">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                <td style="color:${h.c}; font-weight:bold;">${h.name}</td>
                <td>${h.s}</td>
            </tr>`;
        });
    } else {
        const sortedStudents = [...db.students].sort((a, b) => b.s - a.s).slice(0, 10);
        sortedStudents.forEach((s, i) => {
            const hColor = db.houses.find(h => h.name === s.h)?.c || '#000';
            html += `<tr>
                <td class="rank-icon">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                <td>${s.n}<br><small style="color:${hColor}">${s.h}</small></td>
                <td>${s.s}</td>
            </tr>`;
        });

    }
    html += `</table>`;
    container.innerHTML = html;
}

// 僅重設分數，保留學生與學院名單
function resetScoresOnly() {
    if(!confirm("確定要施展「復復原」嗎？這將會把所有分數歸零，但保留學生名單。")) return;
    
    db.total = 0;
    db.houses.forEach(h => h.s = 0);
    db.students.forEach(s => s.s = 0);
    
    playSfx('click');
    render();
    alert("✨ 惡作劇完成！新的旅程開始了。");
}

// 原本的完全清除功能
function fullReset() {
    if(!confirm("確定要施展「啊哇呾喀呾啦」嗎？這將徹底清除所有紀錄（包含學生名單）！")) return;

    location.reload();
}
// --- 在檔案最末端補上這個函式 ---

function renameBeast(creatureId) {
    // 取得目前的名稱（優先使用自定義名稱，若無則用預設名稱）
    const creature = creatures.find(c => c.id === creatureId);
    const oldName = db.customNames[creatureId] || (creature ? creature.n : "");
    
    // 跳出輸入視窗
    const newName = prompt("請輸入這隻奇獸的新名字：", oldName);
    
    // 如果使用者有輸入且不是空白
    if (newName && newName.trim() !== "") {
        db.customNames[creatureId] = newName.trim();
        
        // 儲存並更新畫面
        if (db.soundOn) playSfx('up');
        render(); 
    }
}

function showEvolutionPop(stageInfo, titleText) { // 增加 titleText 參數
    const overlay = document.createElement('div');
    overlay.className = 'evo-overlay';
    overlay.innerHTML = `
        <div class="evo-card">
            <h2 style="color:var(--gold)">${titleText}</h2>
            <div class="evo-img-container">
                <img src="${encodeURI(stageInfo.i)}" style="width:150px;">
            </div>
            <h3>當前形態：${stageInfo.l}</h3>
            <p>${stageInfo.d}</p>
            <button class="btn-3d" onclick="this.parentElement.parentElement.remove()">確認</button>
        </div>
    `;
    document.body.appendChild(overlay);
    playSfx('up');
}

// --- 皮皮鬼事件系統設定 ---

// --- 皮皮鬼事件系統核心 ---

function checkPeevesTrigger() {
    // Math.random() < 0.1 代表只有 10% 的機率觸發
    // 如果你想要 20% 觸發，就改為 < 0.2
    if (Math.random() < 0.1) { 
        startPeevesAnimation();
    }
}
// 補上遺失的動畫啟動函式
function startPeevesAnimation() {
    // 檢查是否已經有皮皮鬼在飛，避免重複觸發
    if (document.getElementById('peeves-ghost')) return;

    const peeves = document.createElement('div');
    peeves.id = 'peeves-ghost';
    peeves.innerHTML = '👻';
    document.body.appendChild(peeves);

    // 播放音效
    if (typeof playSfx === 'function') playSfx('down');

    // 等動畫飛完（2.5秒）後顯示事件視窗
    setTimeout(() => {
        if (peeves.parentNode) peeves.remove();
        executePeevesEvent();
    }, 2500);
}

function executePeevesEvent() {
    const events = [
        {
            t: "哇哇……皮皮鬼又來惡作劇了，誰是那個倒楣鬼呢？",
            act: () => {
                // 過濾請假學生
                let pool = db.students.filter(s => s.status !== 'away');
                if (pool.length === 0) return "結果大家都躲起來了，沒人被抓到！";

                const count = Math.min(pool.length, Math.floor(Math.random() * 5) + 1);
                let targets = [];
                let shuffled = [...pool].sort(() => 0.5 - Math.random());

                for(let i=0; i<count; i++) {
                    const s = shuffled[i];
                    const loss = Math.floor(Math.random() * 5) + 1;
                    s.s -= loss;
                    let h = db.houses.find(house => house.name === s.h);
                    if(h) h.s -= loss;
                    db.total -= loss;
                    targets.push(`${s.n}(-${loss})`);
                }
                return `皮皮鬼絆倒了：${targets.join('、')}`;
            }
        },
        {
            t: "嘻嘻！皮皮鬼的惡作劇被施法打斷了！",
            act: () => {
                let pool = db.students.filter(s => s.status !== 'away');
                if (pool.length === 0) return "可惜現場沒有半個學生可以領賞。";
                
                pool.forEach(s => {
                    s.s += 1;
                    let h = db.houses.find(house => house.name === s.h);
                    if(h) h.s += 1;
                    db.total += 1;
                });
                return "在場學生避開了墨水彈，每人加 1 分！";
            }
        },
        {
            t: "第一名太囂張了！看我的！",
            act: () => {
                let pool = db.students.filter(s => s.status !== 'away');
                if (pool.length < 2) return "皮皮鬼發現在場學生太少，惡作劇不起來。";
                
                let sorted = [...pool].sort((a, b) => b.s - a.s);
                let winner = sorted[0];
                let loser = sorted[sorted.length - 1];
                const transfer = 3; 
                
                winner.s -= transfer;
                loser.s += transfer;
                let winHouse = db.houses.find(h => h.name === winner.h);
                if (winHouse) winHouse.s -= transfer;
                let loseHouse = db.houses.find(h => h.name === loser.h);
                if (loseHouse) loseHouse.s += transfer;

                return `皮皮鬼從 ${winner.n} 摸走了 ${transfer} 分，塞進了 ${loser.n} 的口袋！`;
            }
        },
        {
            t: "大家來跳舞吧！停不下來的那種！",
            act: () => {
                let pool = db.students.filter(s => s.status !== 'away');
                if (pool.length === 0) return "教室空蕩蕩的，皮皮鬼只能自己跳舞。";

                pool.forEach(s => {
                    const change = Math.random() > 0.5 ? 1 : -1;
                    s.s += change;
                    db.total += change;
                    let h = db.houses.find(house => house.name === s.h);
                    if(h) h.s += change;
                });
                return "皮皮鬼施了強制跳舞咒，在場學生分數隨機變動了！";
            }
        },
        {
            t: "嘻嘻嘻！接住我的混亂藥水！哎呀……砸碎了！",
            act: () => {
                let pool = db.students.filter(s => s.status !== 'away');
                if (pool.length < 3) return "皮皮鬼發現在場人太少，藥水砸不中半個人！";

                const count = Math.min(pool.length, Math.floor(Math.random() * 5) + 3);
                let sortedPool = [...pool].sort((a, b) => a.s - b.s);
                let startIdx = Math.floor(Math.random() * (sortedPool.length - count + 1));
                let candidates = sortedPool.slice(startIdx, startIdx + count);

                const originalScores = candidates.map(s => s.s);
                let shuffledScores = [...originalScores].sort(() => 0.5 - Math.random());

                candidates.forEach((student, index) => {
                    const diff = shuffledScores[index] - student.s;
                    student.s = shuffledScores[index];
                    let h = db.houses.find(house => house.name === student.h);
                    if (h) h.s += diff;
                });

                const names = candidates.map(s => s.n).join('、');
                return `藥水潑到了：${names}，他們的分數發生了神祕位移！`;
            }
        },
        {
            t: "皮皮鬼大放送！準備好接招了嗎？",
            act: () => {
                const isPos = Math.random() > 0.5;
                const change = (Math.floor(Math.random() * 3) + 1) * (isPos ? 1 : -1);
                const hCount = Math.min(db.houses.length, Math.floor(Math.random() * 2) + 1);
                let targetHouses = [...db.houses].sort(() => 0.5 - Math.random()).slice(0, hCount);
                
                targetHouses.forEach(h => {
                    let activeStudents = db.students.filter(s => s.h === h.name && s.status !== 'away');
                    activeStudents.forEach(s => { s.s += change; });
                    let totalChange = activeStudents.length * change;
                    h.s += totalChange;
                    db.total += totalChange;
                });
                const hNames = targetHouses.map(h => h.name).join('、');
                return `${hNames} 的學生每人${isPos ? '加' : '扣'}了 ${Math.abs(change)} 分！（請假除外）`;
            }
        }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    const resultMsg = event.act();

    const pop = document.createElement('div');
    pop.className = 'peeves-pop';
    pop.innerHTML = `
        <div class="peeves-content" style="background:white; padding:20px; border-radius:15px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.3); max-width:300px;">
            <h2 style="color:#8e44ad; margin-top:0;">👻 皮皮鬼現身！</h2>
            <p style="font-style: italic; color: #555;">「${event.t}」</p>
            <div style="background:#f3e5f5; padding:12px; border-radius:10px; margin: 15px 0; border: 1px dashed #8e44ad; font-weight: bold; font-size: 0.9em;">
                ${resultMsg}
            </div>
            <button class="btn-3d" onclick="this.parentElement.parentElement.remove()" 
                    style="width:100%; background:#8e44ad; color:white; border:none; padding:10px; cursor:pointer; border-radius:8px;">
                可惡的皮皮鬼！
            </button>
        </div>
    `;
    pop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:2000;";
    document.body.appendChild(pop);
    render(); 
}


// 切換學生狀態函式
function cycleStudentStatus(idx) {
    if (db.edit) return; // 編輯模式下不切換狀態

    const s = db.students[idx];
    const states = ['normal', 'away', 'detention'];
    
    // 循環切換：正常 -> 請假 -> 留察
    let currentIdx = states.includes(s.status) 
    ? states.indexOf(s.status)
    : 0;
    s.status = states[(currentIdx + 1) % states.length];
    
    if(db.soundOn) playSfx('click'); 
    render(); // 重新渲染畫面
}

// 🏆 魔法抽籤函式
// 🏆 水晶球占卜：從在線學生中隨機點名

// --- 請確保這行在 script.js 的最上方，不要動它 ---

function drawLuckyStudent() {
    if (!requireLogin()) return;
    // 1. 初始化名單（確保它存在且是陣列）
    if (typeof drawnStudentIds === 'undefined') window.drawnStudentIds = [];

    // 2. 篩選：沒請假 (away) 且 名字不在「已抽過名單」中的學生
    const activeStudents = db.students.filter(s => s.status !== 'away');
    
    // 改用「姓名 (s.n)」來比對，避免 ID 缺失的問題
let pool = activeStudents.filter(s => s.id && !drawnStudentIds.includes(s.id));

    // 抓鬼除錯訊息
    console.log("--- 火盃抽選中 ---");
    console.log("已抽過名單(姓名):", drawnStudentIds);
    console.log("目前池子裡的候選人:", pool.map(p => p.n));

    // 3. 判斷是否抽完
    if (pool.length === 0) {
        alert(`🔥 巫師名單已空！\n目前在線的 ${activeStudents.length} 位巫師都已出戰。`);
        return;
    }


const luckyOne = pool[Math.floor(Math.random() * pool.length)];
if (!luckyOne || !luckyOne.id) return;

    // 5. 存入名單（存入名字 s.n）
    if (luckyOne && luckyOne.n) {
        drawnStudentIds.push(luckyOne.id);
    } else {
        alert("❌ 巫師資料發生錯誤，請檢查名單！");
        return;
    }

    // --- 以下為你原本的視覺代碼（保留所有圖示與文字） ---
    const hObj = db.houses.find(h => h.name === luckyOne.h);
    const themeColor = hObj ? hObj.c : '#f1c40f';

    const pop = document.createElement('div');
    pop.id = "draw-pop";
    pop.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:3000; backdrop-filter: blur(15px); cursor: pointer;";
    
    pop.innerHTML = `
        <div id="magic-ball-container" style="text-align:center;">
            <div class="shaking-ball" style="font-size: 100px; filter: hue-rotate(180deg) brightness(1.5);">🏆</div>
            <h2 style="color:#3498db; letter-spacing: 5px; text-shadow: 0 0 10px #3498db;">藍色火焰搖曳...</h2>
            <p style="color:rgba(255,255,255,0.6); font-size:14px; margin-top:10px;">目前剩餘巫師人數：${pool.length - 1}</p>
            <p style="color:rgba(255,255,255,0.4); font-size:12px;">(點擊發動速速前)</p>
        </div>
    `;
    document.body.appendChild(pop);

   
pop.onclick = () => {
    const container = document.getElementById('magic-ball-container');
    container.innerHTML = `
        <div class="reveal-name" style="
            background: #fdf5e6;
            padding:30px;
            border-radius:10px;
            text-align:center;
            border-left: 15px solid ${themeColor};
            box-shadow: 5px 5px 20px rgba(0,0,0,0.3);
        ">
            <h1 style="margin:0; font-size:40px;">${luckyOne.n}</h1>
            <p style="margin-top:10px; color:#555;">${luckyOne.h}</p>
        </div>
    `;

    setTimeout(() => {
        pop.remove();
    }, 3000);
};

    let isRevealed = false; 
    const reveal = () => {
        if (isRevealed) return;
        isRevealed = true;
        clearTimeout(timer); 

// ... 找到 reveal 函式內部 ...
const container = document.getElementById('magic-ball-container');
container.innerHTML = `
    <div class="reveal-name" style="
        background: #fdf5e6;
        padding:30px;
        border-radius:10px;
        text-align:center;
        border-left: 15px solid ${themeColor};
        box-shadow: 5px 5px 20px rgba(0,0,0,0.3);
    ">
        <h1 style="margin:0; font-size:40px;">${luckyOne.n}</h1>
        <p style="margin-top:10px; color:#555;">${luckyOne.h}</p>
    </div>
`;

setTimeout(() => {
    pop.remove();
}, 3000);

    
}

// 🏆 專門處理抽籤答對加分的函式
function luckyAddPoint(studentName, val = 1) {
    const student = db.students.find(s => s.n === studentName);
    if (!student) return;

    student.s += val;

    const house = db.houses.find(h => h.name === student.h);
    if (house) house.s += val;

    db.total += val;

    if (db.soundOn) playSfx('up');

    render();

    alert(`✨ ${student.n} +${val} 分！`);
}

    const pop = document.getElementById('draw-pop');
    if (pop) pop.remove();
}
// 🔄 重置名單的函式 (請確保這段也有貼入 script.js)
function resetDrawList() {
    drawnStudentIds = []; // 確保這行有確實執行，將陣列清空
    console.log("名單已清空");
    alert("🔄 巫師名單已重置！");
}



async function saveCloud() {
    if (!CLOUD_DOC) return;

    try {
        await setDoc(CLOUD_DOC, db);
        console.log("☁️ 已同步雲端");
    } catch (e) {
        console.error("同步失敗", e);
    }
}


