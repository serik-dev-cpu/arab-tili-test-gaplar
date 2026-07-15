// ═══════════════════════════════════════════════════════════════
// core.js — Al-Manhajul A'lamiy A1 platformasi uchun umumiy modul
// ═══════════════════════════════════════════════════════════════
// Bu fayl barcha bo'lim (1-12) sahifalarida <script src="core.js"></script>
// orqali ulanadi. Faqat barcha fayllarda bayt-baayt bir xil bo'lgan,
// tekshirilgan funksiyalar shu yerga ko'chirildi:
//   - XP / yutuq (achievement) tizimi
//   - Hamyon XP (wallet_xp) tizimi — kelajakdagi do'kon uchun
//   - Unvon (rank) hisoblash
//   - Ovoz sozlamasi (sound on/off)
//
// E'TIBOR: toLatin/dtxt (Kirill<->Lotin) va awardSessionXP har bir
// bo'limda o'ziga xos farq bilan yozilgan (masalan, bo'lim raqamiga
// bog'liq localStorage kaliti), shuning uchun ular bu yerga
// ko'chirilmadi — har bir faylda o'z holicha qoldi.
// ═══════════════════════════════════════════════════════════════

var SHARED_NAME_KEY = 'arabic_student_name';
var ACH_KEY = 'arabic_achievements_v1';
var ALIFBO_KEY = 'arabic_alifbo_pref';

// ─────────────── XP / Yutuq tizimi ───────────────
// ─────────────── Kunlik Streak (zanjir) tizimi ───────────────
// Har safar XP olinganda (haqiqiy faollik belgisi sifatida) chaqiriladi.
// Streak Freeze (Do'kondan sotib olingan bayroq) - aynan 1 kun o'tkazib
// yuborilganda streakni saqlab qoladi, keyin o'zi sarflanadi.
function updateDailyStreak(){
  try{
    const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    const today = new Date();
    const todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    if(d.lastActiveDate === todayStr){
      return; // Bugun allaqachon hisoblangan
    }
    if(!d.lastActiveDate){
      d.streak = 1;
    } else {
      const last = new Date(d.lastActiveDate + 'T00:00:00');
      const todayMid = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.round((todayMid - last) / 86400000);
      if(diffDays === 1){
        d.streak = (Number(d.streak)||0) + 1;
      } else if(diffDays === 2 && d.streak_freeze){
        // Aynan 1 kun o'tkazib yuborilgan va himoya bor - streak saqlanadi, bayroq sarflanadi
        d.streak_freeze = false;
        d.streak = (Number(d.streak)||0) + 1;
      } else if(diffDays > 1){
        d.streak = 1; // Zanjir uzilgan - qaytadan boshlaymiz
      }
      // diffDays <= 0 bo'lsa (soat farqi) - hech narsa qilinmaydi
    }
    d.lastActiveDate = todayStr;
    localStorage.setItem(ACH_KEY, JSON.stringify(d));
  }catch(e){}
}

function addAchievementXP(xp){
  try{
    const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    // Eski bir-hisobli formatdan (d.xp) migratsiya - faqat bir marta, xavfsiz
    if(d.total_xp === undefined){
      d.total_xp = Number(d.xp)||0;
      d.wallet_xp = Number(d.xp)||0;
    }
    d.total_xp = (Number(d.total_xp)||0) + xp;
    d.wallet_xp = (Number(d.wallet_xp)||0) + xp;
    localStorage.setItem(ACH_KEY, JSON.stringify(d));
  }catch(e){}
  updateDailyStreak();
}
function getAchievementXP(){
  // Unvon va "Umumiy XP" uchun - total_xp (hech qachon kamaymaydi)
  try{
    const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    if(d.total_xp === undefined) return Number(d.xp)||0;
    return Number(d.total_xp)||0;
  }catch(e){ return 0; }
}
function getWalletXP(){
  // Kelajakdagi do'kon uchun - sarflanadigan hamyon
  try{
    const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    if(d.wallet_xp === undefined) return Number(d.xp)||0;
    return Number(d.wallet_xp)||0;
  }catch(e){ return 0; }
}
function spendWalletXP(amount, label){
  // Kelajakdagi do'kon uchun - hamyondan xarid, total_xp o'zgarmaydi (unvon buzilmaydi)
  try{
    const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    var wallet = d.wallet_xp === undefined ? (Number(d.xp)||0) : (Number(d.wallet_xp)||0);
    if(wallet < amount) return false;
    d.wallet_xp = wallet - amount;
    if(d.total_xp === undefined) d.total_xp = Number(d.xp)||0;
    if(label){
      if(!Array.isArray(d.spend_log)) d.spend_log = [];
      d.spend_log.unshift({label: label, amount: amount, date: new Date().toISOString()});
      if(d.spend_log.length > 50) d.spend_log = d.spend_log.slice(0, 50);
    }
    localStorage.setItem(ACH_KEY, JSON.stringify(d));
    return true;
  }catch(e){ return false; }
}
function getSpendLog(){
  try{ const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}'); return Array.isArray(d.spend_log) ? d.spend_log : []; }catch(e){ return []; }
}

// ─────────────── Unvon (rank) ───────────────
function getRank(xp){
  // Maxsus unvon: A1 yakuniy imtihonini topshirganlar uchun (faqat shu yo'l bilan, XP dan ustun)
  try{
    var d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    if(d.manhaj_fotihi_a1) return {label:'🏆 Al-Manhaj Fotihi — A1', cls:'rank-sultan'};
  }catch(e){}
  if(xp >= 6001) return {label:'👑 Sulton', cls:'rank-sultan'};
  if(xp >= 3501) return {label:'🦅 Lochin', cls:'rank-neon'};
  if(xp >= 1501) return {label:'📜 Bilimdon', cls:'rank-gold'};
  if(xp >= 501)  return {label:'⚔️ Intiluvchi', cls:'rank-silver'};
  return {label:'🌟 Navqiron', cls:'rank-bronze'};
}

// ─────────────── Kunlik Streak (o'qish uchun) ───────────────
function getStreak(){
  try{ const d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}'); return Number(d.streak)||0; }catch(e){ return 0; }
}

// ─────────────── Hadiqatul-Ilm (xato so'zlar / bilim bog'i) — markazlashtirilgan ───────────────
// Har bo'limning Test rejimida xato javob berilgan savol shu yerga (barcha
// bo'limlar uchun UMUMIY kalitga) o'z-o'zidan yetarli (self-contained) holda
// saqlanadi — index.html qayta ishlash uchun boshqa fayldan hech narsa
// so'ramaydi, faqat shu yozuvning o'zidan foydalanadi.
var MISTAKES_KEY = 'arabic_mistakes_v1';
var MISTAKE_CLEAR_PRICES = [50, 75, 100, 150]; // oxirgisida qotib qoladi (cheksiz takror)

function addMistake(entry){
  // entry: {qid, bolim, kind, question, questionIsArabic, correct, correctIsArabic, options, sub}
  try{
    var arr = JSON.parse(localStorage.getItem(MISTAKES_KEY) || '[]');
    if(!Array.isArray(arr)) arr = [];
    var idx = -1;
    for(var i=0;i<arr.length;i++){ if(arr[i].qid === entry.qid && arr[i].bolim === entry.bolim){ idx = i; break; } }
    entry.addedDate = new Date().toISOString();
    if(idx === -1){ arr.push(entry); } else { arr[idx] = entry; }
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(arr));
  }catch(e){}
}
function getMistakes(){
  try{ var arr = JSON.parse(localStorage.getItem(MISTAKES_KEY) || '[]'); return Array.isArray(arr) ? arr : []; }catch(e){ return []; }
}
function removeMistakesByIndex(indices){
  // indices — getMistakes() natijasidagi massiv indekslari (qaysi yozuvlar o'chsin)
  try{
    var arr = getMistakes();
    var keep = arr.filter(function(_, i){ return indices.indexOf(i) === -1; });
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(keep));
  }catch(e){}
}
function getMistakeClearCount(){
  try{ var d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}'); return Number(d.mistake_clear_count)||0; }catch(e){ return 0; }
}
function incMistakeClearCount(){
  try{
    var d = JSON.parse(localStorage.getItem(ACH_KEY)||'{}');
    d.mistake_clear_count = (Number(d.mistake_clear_count)||0) + 1;
    localStorage.setItem(ACH_KEY, JSON.stringify(d));
  }catch(e){}
}
function getMistakeClearPrice(){
  var c = getMistakeClearCount();
  var idx = Math.min(c, MISTAKE_CLEAR_PRICES.length-1);
  return MISTAKE_CLEAR_PRICES[idx];
}

// ─────────────── Ovoz sozlamasi ───────────────
function soundEnabled(){
  return localStorage.getItem('arabic_sound_off') !== '1';
}
function toggleSound(){
  var off = localStorage.getItem('arabic_sound_off') === '1';
  localStorage.setItem('arabic_sound_off', off ? '0' : '1');
  return !off; // yangi holat: true = o'chirildi
}
