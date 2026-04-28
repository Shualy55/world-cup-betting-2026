// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, Info, Edit2, CheckCircle2, Grid, Star, LogIn, UserCheck, Shield, Clock, Sparkles, Bot, Lock, Save } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

// --- הגדרות פיירבייס מותאמות אישית ---
const customFirebaseConfig = {
  apiKey: "AIzaSyAAfiztqPR4xmQIknLpu_zOvV6AWEBcW5I",
  authDomain: "worldcup2026-bet.firebaseapp.com",
  projectId: "worldcup2026-bet",
  storageBucket: "worldcup2026-bet.firebasestorage.app",
  messagingSenderId: "5025503677",
  appId: "1:5025503677:web:9f353305fe17d6b4855ad4"
};

// תמיכה חכמה: משתמש בהגדרות התצוגה המקדימה כשאנחנו פה, ובהגדרות שלך כשאתה ב-StackBlitz
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : customFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// מזהה האפליקציה (שומר על שלך כשזה רץ בחוץ)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'worldcup2026-bet'; 

// --- הגדרות Gemini API ---
const apiKey = ""; // API Key provided by runtime environment

const callGemini = async (prompt, systemPrompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };
  
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      if (i === 4) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
};

// --- נתונים סטטיים (104 משחקים + בתים) ---
const GROUP_TEAMS = {
  'בית א': ['מקסיקו', 'דרום אפריקה', 'דרום קוריאה', 'צ\'כיה'],
  'בית ב': ['קנדה', 'בוסניה', 'קטאר', 'שוויץ'],
  'בית ג': ['ברזיל', 'מרוקו', 'האיטי', 'סקוטלנד'],
  'בית ד': ['ארה"ב', 'פרגוואי', 'אוסטרליה', 'טורקיה'],
  'בית ה': ['גרמניה', 'קוראסאו', 'חוף השנהב', 'אקוודור'],
  'בית ו': ['הולנד', 'יפן', 'שבדיה', 'תוניסיה'],
  'בית ז': ['בלגיה', 'מצרים', 'איראן', 'ניו זילנד'],
  'בית ח': ['ספרד', 'כף ורדה', 'ערב הסעודית', 'אורוגוואי'],
  'בית ט': ['צרפת', 'סנגל', 'עיראק', 'נורווגיה'],
  'בית י': ['ארגנטינה', 'אלג\'יריה', 'אוסטריה', 'ירדן'],
  'בית י"א': ['פורטוגל', 'קונגו', 'אוזבקיסטן', 'קולומביה'],
  'בית י"ב': ['אנגליה', 'קרואטיה', 'גאנה', 'פנמה']
};

// --- אווטארים לבחירה ---
const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nala',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jude',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mia'
];

// מיפוי נבחרות לקודי מדינות כדי להציג דגלים
const TEAM_FLAGS = {
  'מקסיקו': 'mx', 'דרום אפריקה': 'za', 'דרום קוריאה': 'kr', 'צ\'כיה': 'cz',
  'קנדה': 'ca', 'בוסניה': 'ba', 'קטאר': 'qa', 'שוויץ': 'ch',
  'ברזיל': 'br', 'מרוקו': 'ma', 'האיטי': 'ht', 'סקוטלנד': 'gb-sct',
  'ארה"ב': 'us', 'פרגוואי': 'py', 'אוסטרליה': 'au', 'טורקיה': 'tr',
  'גרמניה': 'de', 'קוראסאו': 'cw', 'חוף השנהב': 'ci', 'אקוודור': 'ec',
  'הולנד': 'nl', 'יפן': 'jp', 'שבדיה': 'se', 'תוניסיה': 'tn',
  'בלגיה': 'be', 'מצרים': 'eg', 'איראן': 'ir', 'ניו זילנד': 'nz',
  'ספרד': 'es', 'כף ורדה': 'cv', 'ערב הסעודית': 'sa', 'אורוגוואי': 'uy',
  'צרפת': 'fr', 'סנגל': 'sn', 'עיראק': 'iq', 'נורווגיה': 'no',
  'ארגנטינה': 'ar', 'אלג\'יריה': 'dz', 'אוסטריה': 'at', 'ירדן': 'jo',
  'פורטוגל': 'pt', 'קונגו': 'cd', 'אוזבקיסטן': 'uz', 'קולומביה': 'co',
  'אנגליה': 'gb-eng', 'קרואטיה': 'hr', 'גאנה': 'gh', 'פנמה': 'pa'
};

// רשימה חלקית להדגמה
const INITIAL_MATCHES = [
  // מחזור 1
  { id: 1, date: '11/06/2026', time: '22:00', team1: 'מקסיקו', team2: 'דרום אפריקה', group: 'בית א', stage: 'group' },
  { id: 2, date: '11/06/2026', time: '01:00', team1: 'דרום קוריאה', team2: 'צ\'כיה', group: 'בית א', stage: 'group' },
  { id: 3, date: '12/06/2026', time: '19:00', team1: 'קנדה', team2: 'בוסניה', group: 'בית ב', stage: 'group' },
  { id: 4, date: '12/06/2026', time: '22:00', team1: 'ארה"ב', team2: 'פרגוואי', group: 'בית ד', stage: 'group' },
  { id: 5, date: '13/06/2026', time: '01:00', team1: 'האיטי', team2: 'סקוטלנד', group: 'בית ג', stage: 'group' },
  { id: 6, date: '13/06/2026', time: '04:00', team1: 'אוסטרליה', team2: 'טורקיה', group: 'בית ד', stage: 'group' },
  { id: 7, date: '13/06/2026', time: '19:00', team1: 'ברזיל', team2: 'מרוקו', group: 'בית ג', stage: 'group' },
  { id: 8, date: '13/06/2026', time: '22:00', team1: 'קטאר', team2: 'שוויץ', group: 'בית ב', stage: 'group' },
  { id: 9, date: '14/06/2026', time: '19:00', team1: 'חוף השנהב', team2: 'אקוודור', group: 'בית ה', stage: 'group' },
  { id: 10, date: '14/06/2026', time: '22:00', team1: 'גרמניה', team2: 'קוראסאו', group: 'בית ה', stage: 'group' },
  { id: 11, date: '14/06/2026', time: '01:00', team1: 'הולנד', team2: 'יפן', group: 'בית ו', stage: 'group' },
  { id: 12, date: '14/06/2026', time: '04:00', team1: 'שבדיה', team2: 'תוניסיה', group: 'בית ו', stage: 'group' },
  { id: 13, date: '15/06/2026', time: '19:00', team1: 'ערב הסעודית', team2: 'אורוגוואי', group: 'בית ח', stage: 'group' },
  { id: 14, date: '15/06/2026', time: '22:00', team1: 'ספרד', team2: 'כף ורדה', group: 'בית ח', stage: 'group' },
  { id: 15, date: '15/06/2026', time: '01:00', team1: 'איראן', team2: 'ניו זילנד', group: 'בית ז', stage: 'group' },
  { id: 16, date: '15/06/2026', time: '04:00', team1: 'בלגיה', team2: 'מצרים', group: 'בית ז', stage: 'group' },
  { id: 17, date: '16/06/2026', time: '19:00', team1: 'צרפת', team2: 'סנגל', group: 'בית ט', stage: 'group' },
  { id: 18, date: '16/06/2026', time: '22:00', team1: 'עיראק', team2: 'נורווגיה', group: 'בית ט', stage: 'group' },
  { id: 19, date: '16/06/2026', time: '01:00', team1: 'ארגנטינה', team2: 'אלג\'יריה', group: 'בית י', stage: 'group' },
  { id: 20, date: '16/06/2026', time: '04:00', team1: 'אוסטריה', team2: 'ירדן', group: 'בית י', stage: 'group' },
  // מחזור 2 (מדגם)
  { id: 21, date: '17/06/2026', time: '19:00', team1: 'גאנה', team2: 'פנמה', group: 'בית י"ב', stage: 'group' },
  { id: 22, date: '17/06/2026', time: '22:00', team1: 'אנגליה', team2: 'קרואטיה', group: 'בית י"ב', stage: 'group' },
  { id: 23, date: '18/06/2026', time: '19:00', team1: 'צ\'כיה', team2: 'דרום אפריקה', group: 'בית א', stage: 'group' },
  { id: 24, date: '18/06/2026', time: '22:00', team1: 'מקסיקו', team2: 'דרום קוריאה', group: 'בית א', stage: 'group' },
  // שלבי נוקאאוט
  { id: 73, date: '28/06/2026', time: '23:00', team1: 'סגנית בית א\'', team2: 'סגנית בית ב\'', group: '32 האחרונות', stage: 'knockout' },
  { id: 89, date: '04/07/2026', time: '23:00', team1: 'מנצחת 74', team2: 'מנצחת 77', group: 'שמינית גמר', stage: 'knockout' },
  { id: 97, date: '09/07/2026', time: '02:00', team1: 'מנצחת 89', team2: 'מנצחת 90', group: 'רבע גמר', stage: 'knockout' },
  { id: 101, date: '14/07/2026', time: '02:00', team1: 'מנצחת 97', team2: 'מנצחת 98', group: 'חצי גמר', stage: 'knockout' },
  { id: 104, date: '19/07/2026', time: '22:00', team1: 'מנצחת 101', team2: 'מנצחת 102', group: 'גמר', stage: 'knockout' },
].map(m => ({ ...m, score1: null, score2: null, status: 'pending' }));

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState(INITIAL_MATCHES); 
  const [allUsers, setAllUsers] = useState({});
  const [allPredictions, setAllPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [editingMatch, setEditingMatch] = useState(null);
  const [tempScore, setTempScore] = useState({ s1: 0, s2: 0 });
  const [isAdminMode, setIsAdminMode] = useState(false); 

  // שגיאות וטעינה למסך ההרשמה
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ניחושי בונוס אישיים
  const [myBonus, setMyBonus] = useState({ champion: '', topScorer: '' });

  // Gemini State
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState({});

  // --- פונקציות נעילת זמן ---
  const isBonusLocked = new Date() > new Date('2026-06-11T21:00:00+03:00');

  const checkIsMatchLocked = (dateStr, timeStr = '22:00') => {
    try {
      const [day, month, year] = dateStr.split('/');
      const [hours, minutes] = timeStr.split(':');
      const matchTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00+03:00`);
      const lockTime = new Date(matchTime.getTime() - 60 * 60 * 1000); // שעה לפני המשחק
      return new Date() > lockTime;
    } catch (err) {
      return false;
    }
  };

  // --- התחברות לפיירבייס ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // תמיכה בסביבת התצוגה המקדימה שלנו
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // אכיפת התחברות עם גוגל בלבד (ניתוק אנונימיים מהגרסאות הקודמות)
      if (currentUser && currentUser.isAnonymous && typeof __initial_auth_token === 'undefined') {
        console.log("משתמש אנונימי ישן זוהה, מנתק...");
        await signOut(auth);
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // --- התחברות עם גוגל ---
  const handleGoogleLogin = async () => {
    setFormError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        setFormError("הדומיין אינו מאושר בפיירבייס. הוסף אותו ב-Authorized domains.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setFormError("חלון ההתחברות נסגר לפני סיום התהליך.");
      } else {
        setFormError("שגיאה בהתחברות לגוגל: " + error.message);
      }
    }
  };

  // --- משיכת נתונים מהרשת (Real-time) ---
  useEffect(() => {
    if (!user) {
      setIsDataLoaded(true);
      return;
    }

    const publicRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);

    const unsubUsers = onSnapshot(publicRef('users'), (snapshot) => {
      const usersData = {};
      snapshot.forEach(doc => { usersData[doc.id] = { id: doc.id, ...doc.data() }; });
      setAllUsers(usersData);
      if (usersData[user.uid]) {
        setProfile(usersData[user.uid]);
        setMyBonus({ 
          champion: usersData[user.uid].champion || '', 
          topScorer: usersData[user.uid].topScorer || '' 
        });
      } else {
        setProfile(null);
      }
      setIsDataLoaded(true);
    }, console.error);

    const unsubMatches = onSnapshot(publicRef('matches'), (snapshot) => {
      if (!snapshot.empty) {
        const updates = {};
        snapshot.forEach(doc => { updates[doc.id] = doc.data(); });
        
        setMatches(prev => prev.map(m => {
          const up = updates[m.id.toString()];
          return up ? { ...m, score1: up.score1, score2: up.score2, status: up.status } : m;
        }));
      }
    }, console.error);

    const unsubPredictions = onSnapshot(publicRef('predictions'), (snapshot) => {
      const predsData = {};
      snapshot.forEach(doc => { predsData[doc.id] = doc.data(); });
      setAllPredictions(predsData);
    }, console.error);

    return () => { unsubUsers(); unsubMatches(); unsubPredictions(); };
  }, [user]);

  // --- חישוב טבלת מובילים ---
  useEffect(() => {
    if (!Object.keys(allUsers).length) return;

    let scores = Object.values(allUsers)
      .filter(u => u.isApproved)
      .map(u => ({ ...u, points: 0, exactHits: 0, correctWinners: 0 }));

    matches.forEach(match => {
      if (match.status === 'finished') {
        const actual1 = match.score1;
        const actual2 = match.score2;
        const actualDiff = actual1 - actual2;

        scores.forEach(participant => {
          const pred = allPredictions[participant.id]?.[match.id];
          if (pred) {
            const predDiff = pred.t1 - pred.t2;
            if (pred.t1 === actual1 && pred.t2 === actual2) {
              participant.points += 3;
              participant.exactHits += 1;
            } else if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
              participant.points += 1;
              participant.correctWinners += 1;
            }
          }
        });
      }
    });

    const sorted = scores.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.exactHits - a.exactHits;
    });

    setLeaderboard(sorted);
  }, [matches, allPredictions, allUsers]);

  // --- Gemini AI Actions ---
  const handleAnalyzeMatch = async (matchId, team1, team2) => {
    setIsAnalyzing(prev => ({ ...prev, [matchId]: true }));
    try {
      const prompt = `כתוב תחזית משעשעת וקצרה (עד 3 משפטים) למשחק במונדיאל 2026 בין נבחרת ${team1} לנבחרת ${team2}.`;
      const sysPrompt = "אתה פרשן כדורגל ישראלי, ציני אבל מבין עניין. אתה זורק הערות מצחיקות על הנבחרות, הסטוריית המונדיאל שלהן, ונותן רמז להימור מעניין. תכתוב בצורה קלילה שמתאימה לחבר'ה.";
      
      const analysisText = await callGemini(prompt, sysPrompt);
      setAiAnalysis(prev => ({ ...prev, [matchId]: analysisText }));
    } catch (error) {
      console.error("AI Error:", error);
      setAiAnalysis(prev => ({ ...prev, [matchId]: "הפרשן שלנו יצא להפסקת פלאפל, נסה שוב מאוחר יותר." }));
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [matchId]: false }));
    }
  };


  // --- פעולות משתמש ---
  const handleSaveProfile = async (name) => {
    if (!user) {
      setFormError("שגיאת חיבור 🛑");
      return;
    }
    if (!name) return;
    
    setIsSubmitting(true);
    setFormError("");
    
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      const newProfile = { 
        name, 
        avatar: selectedAvatar,
        isApproved: profile?.isApproved || false 
      };
      
      await setDoc(userRef, newProfile, { merge: true });
      setProfile(prev => ({ ...prev, ...newProfile })); 

      // שליחת התראה למייל רק לנרשמים חדשים (אם לא היה להם פרופיל קודם)
      if (!profile) {
        fetch("https://formsubmit.co/ajax/shualy55@gmail.com", {
          method: "POST",
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: JSON.stringify({
              _subject: "מונדיאל 2026 - בקשת הצטרפות חדשה!",
              "שם המשתתף": name,
              "הודעה": "משתתף חדש נרשם לאפליקציה וממתין לאישור שלך כדי להתחיל לשחק."
          })
        }).catch(err => console.error("שגיאה בשליחת התראה למייל:", err));
      }

    } catch (err) {
      console.error(err);
      setFormError("שגיאה בשמירת הנתונים: " + err.message);
    }
    setIsSubmitting(false);
  };

  const handleSaveBonus = async () => {
    if (!user || isBonusLocked) return;
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      await updateDoc(userRef, { 
        champion: myBonus.champion, 
        topScorer: myBonus.topScorer 
      });
      alert("בחירות הבונוס נשמרו בהצלחה! 🎉");
    } catch (error) {
      alert("שגיאה בשמירת הבונוס: " + error.message);
    }
  };

  // מנגנון סיסמת מנהל
  const handleAdminClick = () => {
    if (isAdminMode) {
      setIsAdminMode(false); // כיבוי מצב מנהל
      return;
    }
    
    const password = prompt("הכנס סיסמת מנהל:");
    if (password === "5555") {
      setIsAdminMode(true);
      alert("ברוך הבא מנהל! כעת תוכל לאשר משתתפים ולעדכן תוצאות אמת.");
    } else if (password !== null) { // null אומר שהמשתמש לחץ 'ביטול'
      alert("סיסמה שגויה! הגישה נדחתה.");
    }
  };

  const handleToggleApproval = async (userId, currentStatus) => {
    if (!user || !isAdminMode) return;
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
    await updateDoc(userRef, { isApproved: !currentStatus });
  };

  const handlePredict = async (matchId, t1, t2) => {
    if (!user) return;
    const predRef = doc(db, 'artifacts', appId, 'public', 'data', 'predictions', user.uid);
    const currentPreds = allPredictions[user.uid] || {};
    await setDoc(predRef, {
      ...currentPreds,
      [matchId]: { t1: parseInt(t1), t2: parseInt(t2) }
    });
  };

  const handleAdminUpdateRealScore = async (matchId) => {
    if (!user) return;
    const matchRef = doc(db, 'artifacts', appId, 'public', 'data', 'matches', matchId.toString());
    await setDoc(matchRef, {
      score1: tempScore.s1,
      score2: tempScore.s2,
      status: 'finished'
    }, { merge: true });
    setEditingMatch(null);
  };

  const getGroupStandings = (groupName) => {
    const teams = GROUP_TEAMS[groupName];
    if (!teams) return [];
    
    const table = teams.map(team => ({
      team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
    }));

    const groupMatches = matches.filter(m => m.group === groupName && m.status === 'finished');
    
    groupMatches.forEach(m => {
      const t1 = table.find(t => t.team === m.team1);
      const t2 = table.find(t => t.team === m.team2);
      if (!t1 || !t2) return;

      t1.p++; t2.p++;
      t1.gf += m.score1; t1.ga += m.score2;
      t2.gf += m.score2; t2.ga += m.score1;
      
      if (m.score1 > m.score2) { t1.w++; t1.pts += 3; t2.l++; }
      else if (m.score1 < m.score2) { t2.w++; t2.pts += 3; t1.l++; }
      else { t1.d++; t2.d++; t1.pts += 1; t2.pts += 1; }
    });

    table.forEach(t => t.gd = t.gf - t.ga);

    return table.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  };

  if (isAuthChecking || (user && !isDataLoaded)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
         <div className="text-emerald-400 font-bold text-xl flex items-center gap-3 animate-pulse">
            <Clock className="animate-spin" /> טוען נתונים...
         </div>
      </div>
    );
  }

  // --- מסך פתיחה (התחברות לגוגל) ---
  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} className="text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">מונדיאל 2026</h1>
          <p className="text-slate-400 mb-8">התחבר עם חשבון הגוגל שלך כדי שהניחושים יישמרו מכל מכשיר!</p>

          {formError && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 text-sm p-3 rounded-xl mb-4 text-center font-medium">
              {formError}
            </div>
          )}

          <button onClick={handleGoogleLogin} className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold p-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            המשך עם Google
          </button>
        </div>
      </div>
    );
  }

  // --- מסך הרשמה (השלמת פרופיל) ---
  if (!profile) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <div className="w-20 h-20 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} className="text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">השלמת הרשמה</h1>
          <p className="text-slate-400 mb-8">איזה יופי שהצטרפת! רק שם ואווטאר וסיימנו.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveProfile(e.target.name.value);
          }} className="space-y-4">
            <div>
              <p className="text-emerald-400 text-xs font-bold mb-1 text-right px-2">איך תרצה להופיע בטבלה?</p>
              <input name="name" defaultValue={user.displayName || ''} required placeholder="איך קוראים לך?" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white text-center focus:border-emerald-500 focus:outline-none" />
            </div>
            
            <div className="pt-2">
              <p className="text-emerald-400 text-sm font-bold mb-2">בחר דמות (אווטאר):</p>
              <div className="flex flex-wrap justify-center gap-3">
                {AVATARS.map(av => (
                  <img 
                    key={av} 
                    src={av} 
                    alt="avatar option" 
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-12 h-12 rounded-full cursor-pointer transition-all border-2 ${selectedAvatar === av ? 'border-emerald-500 scale-110 bg-emerald-900/30' : 'border-transparent bg-slate-700 hover:scale-105'}`} 
                  />
                ))}
              </div>
            </div>

            {formError && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 text-sm p-3 rounded-xl mb-4 text-center font-medium">
                {formError}
              </div>
            )}

            <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold p-4 rounded-xl mt-6 flex items-center justify-center gap-2 transition-colors">
              {isSubmitting ? <span className="animate-pulse">שומר נתונים...</span> : <><LogIn size={20} /> שלח בקשת הצטרפות</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- מסך המתנה לאישור מנהל ---
  if (!profile.isApproved && !isAdminMode) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full text-center relative overflow-hidden">
          <button onClick={handleAdminClick} className="absolute top-4 left-4 text-slate-600 hover:text-emerald-400 transition-colors"><Shield size={20}/></button>
          
          <div className="w-24 h-24 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
             <img src={profile.avatar} alt="avatar" className="w-20 h-20 rounded-full border-2 border-emerald-500/50" />
             <div className="absolute -bottom-2 -right-2 bg-yellow-500 p-1.5 rounded-full border-2 border-slate-800"><Clock size={16} className="text-white"/></div>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">היי {profile.name}!</h1>
          <p className="text-slate-400 mb-6">הפרטים שלך נשמרו בהצלחה. כעת עליך להמתין לאישור מנהל התחרות כדי להיכנס למערכת ולהתחיל לנחש.</p>
          <p className="text-emerald-400 font-bold text-sm bg-emerald-900/20 py-2 rounded-lg border border-emerald-500/20">שלח הודעה למנהל שיאשר אותך 😉</p>
        </div>
      </div>
    );
  }

  // --- האפליקציה המרכזית ---
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      <header className="bg-emerald-800 text-white p-6 rounded-b-3xl shadow-lg mb-6 border-b-4 border-emerald-500 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-1">מונדיאל 2026</h1>
            <p className="text-emerald-200 font-medium text-xs flex items-center gap-1">התחרות של החבר'ה • שלום {profile.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleAdminClick} className={`text-xs px-2 py-1 rounded border transition-colors ${isAdminMode ? 'bg-red-500 border-red-400 text-white' : 'bg-transparent border-emerald-400 text-emerald-200 hover:bg-emerald-700'}`}>
              {isAdminMode ? 'מצב מנהל דולק' : 'מנהל?'}
            </button>
            <img src={profile.avatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-slate-800" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* Navigation */}
        <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl mb-8 shadow-inner gap-1">
          {[
            { id: 'matches', icon: Calendar, text: 'משחקים' },
            { id: 'groups', icon: Grid, text: 'בתים' },
            { id: 'leaderboard', icon: Users, text: 'הטבלה' },
            { id: 'bonuses', icon: Star, text: 'בונוס' },
            ...(isAdminMode ? [{ id: 'admin', icon: Shield, text: 'ניהול' }] : [])
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg font-bold transition-all text-xs sm:text-sm ${activeTab === tab.id ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <tab.icon size={18} /> {tab.text}
            </button>
          ))}
        </div>

        {/* --- Tab: Matches --- */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {matches.map(match => {
              const myPrediction = allPredictions[user.uid]?.[match.id];
              const isMatchStarted = match.status === 'finished'; 
              const isMatchLocked = checkIsMatchLocked(match.date, match.time);
              const isAIActive = isAnalyzing[match.id];
              const aiResult = aiAnalysis[match.id];
              
              return (
                <div key={match.id} className="bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700 relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 bg-slate-700 text-[10px] px-3 py-1 rounded-bl-lg text-slate-300 font-bold z-10 flex items-center gap-1">
                    {match.group} | {match.date} {match.time && `- ${match.time}`}
                    {isMatchLocked && !isMatchStarted && <Lock size={10} className="text-red-400" />}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    {/* Team 1 */}
                    <div className="flex-1 text-center flex flex-col items-center">
                      {TEAM_FLAGS[match.team1] ? (
                        <img src={`https://flagcdn.com/w80/${TEAM_FLAGS[match.team1]}.png`} alt={match.team1} className="w-12 h-8 rounded shadow-sm object-cover mb-2 border border-slate-600" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-2 text-xl font-bold border-2 border-slate-600">
                          {match.team1.substring(0, 2)}
                        </div>
                      )}
                      <h3 className="font-bold text-sm sm:text-base">{match.team1}</h3>
                    </div>

                    {/* Central Area (Score / Prediction) */}
                    <div className="flex-1 text-center px-2">
                      {isAdminMode && editingMatch === match.id ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" className="w-10 h-10 bg-slate-900 border border-emerald-500 rounded text-center font-bold text-white" value={tempScore.s1} onChange={(e) => setTempScore({...tempScore, s1: parseInt(e.target.value)||0})} />
                            <span>-</span>
                            <input type="number" min="0" className="w-10 h-10 bg-slate-900 border border-emerald-500 rounded text-center font-bold text-white" value={tempScore.s2} onChange={(e) => setTempScore({...tempScore, s2: parseInt(e.target.value)||0})} />
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleAdminUpdateRealScore(match.id)} className="bg-emerald-500 text-white px-2 py-1 rounded text-xs">שמור אמיתי</button>
                            <button onClick={() => setEditingMatch(null)} className="bg-slate-600 text-white px-2 py-1 rounded text-xs">בטל</button>
                          </div>
                        </div>
                      ) : match.status === 'finished' ? (
                        <div className="bg-emerald-900/40 py-2 rounded-xl border border-emerald-500/30">
                          <span className="text-2xl font-black text-white">{match.score1} - {match.score2}</span>
                          <div className="text-emerald-400 text-[10px] font-bold mt-1">תוצאת סיום</div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-slate-500 font-black text-xl">VS</div>
                          {!isMatchStarted && (
                            isMatchLocked && !isAdminMode ? (
                              <div className="flex items-center justify-center gap-2 bg-slate-900/80 px-4 py-1.5 rounded-lg border border-slate-700">
                                <span className="text-white font-bold text-lg">{myPrediction?.t1 ?? '-'}</span>
                                <span className="text-slate-500">-</span>
                                <span className="text-white font-bold text-lg">{myPrediction?.t2 ?? '-'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 shadow-inner">
                                <input type="number" min="0" placeholder="?" className="w-8 h-8 bg-transparent text-center text-white font-bold focus:outline-none" 
                                  value={myPrediction?.t1 ?? ''} 
                                  onChange={(e) => handlePredict(match.id, e.target.value, myPrediction?.t2 ?? 0)} />
                                <span className="text-slate-500">-</span>
                                <input type="number" min="0" placeholder="?" className="w-8 h-8 bg-transparent text-center text-white font-bold focus:outline-none" 
                                  value={myPrediction?.t2 ?? ''} 
                                  onChange={(e) => handlePredict(match.id, myPrediction?.t1 ?? 0, e.target.value)} />
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {isAdminMode && !editingMatch && (
                        <button onClick={() => { setEditingMatch(match.id); setTempScore({ s1: match.score1||0, s2: match.score2||0 }); }} className="mt-2 text-emerald-400 text-[10px] underline hover:text-emerald-300">
                          עדכן תוצאת אמת
                        </button>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 text-center flex flex-col items-center">
                      {TEAM_FLAGS[match.team2] ? (
                        <img src={`https://flagcdn.com/w80/${TEAM_FLAGS[match.team2]}.png`} alt={match.team2} className="w-12 h-8 rounded shadow-sm object-cover mb-2 border border-slate-600" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-2 text-xl font-bold border-2 border-slate-600">
                          {match.team2.substring(0, 2)}
                        </div>
                      )}
                      <h3 className="font-bold text-sm sm:text-base">{match.team2}</h3>
                    </div>
                  </div>

                  {/* AI Match Analyst Feature ✨ */}
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col items-center">
                    {!aiResult && !isAIActive && (
                      <button 
                        onClick={() => handleAnalyzeMatch(match.id, match.team1, match.team2)}
                        className="bg-slate-900/50 hover:bg-purple-900/40 text-purple-300 text-xs px-3 py-1.5 rounded-full border border-purple-500/30 flex items-center gap-1 transition-all"
                      >
                        <Sparkles size={12} className="text-purple-400" />
                        בקש תחזית מהפרשן (AI) ✨
                      </button>
                    )}
                    
                    {isAIActive && (
                      <div className="flex items-center gap-2 text-purple-400 text-xs animate-pulse">
                        <Bot size={14} /> הפרשן חושב על המשחק...
                      </div>
                    )}

                    {aiResult && !isAIActive && (
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 text-sm text-purple-200 mt-2 relative w-full text-center">
                        <Bot size={16} className="absolute top-2 right-2 text-purple-400 opacity-50" />
                        <span className="font-bold text-purple-400">פרשן הבית: </span>
                        {aiResult}
                      </div>
                    )}
                  </div>

                  {/* ניחושי החברים */}
                  <div className="mt-4 pt-3 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-400 mb-2 flex items-center gap-1"><Users size={12} /> ניחושי החברים:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(allUsers).filter(u => u.isApproved).map(u => {
                        const pred = allPredictions[u.id]?.[match.id];
                        const hidePrediction = !isMatchStarted && u.id !== user.uid;
                        
                        return (
                          <div key={u.id} className="bg-slate-900/80 px-2 py-1.5 rounded text-xs flex items-center gap-1 border border-slate-800">
                            <img src={u.avatar} alt="" className="w-4 h-4 rounded-full" />
                            <span className="text-slate-300 max-w-[50px] truncate">{u.name}:</span>
                            <span className={`font-bold ${pred ? 'text-white' : 'text-slate-600'}`}>
                              {pred ? (hidePrediction ? '?' : `${pred.t1}-${pred.t2}`) : '-'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Tab: Group Standings --- */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg text-sm text-emerald-300 mb-4 flex items-start gap-2">
              <Info size={18} className="shrink-0 mt-0.5" />
              <p>הטבלאות מתעדכנות אוטומטית ברגע שתוצאת אמת מוזנת במערכת.</p>
            </div>
            
            {Object.keys(GROUP_TEAMS).map(groupName => {
              const table = getGroupStandings(groupName);
              return (
                <div key={groupName} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                  <div className="bg-slate-700 py-2 px-4 font-bold text-white text-sm">{groupName}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-slate-900/50 text-slate-400 text-xs">
                        <tr>
                          <th className="py-2 px-3 font-medium">נבחרת</th>
                          <th className="py-2 px-2 text-center font-medium">מש'</th>
                          <th className="py-2 px-2 text-center font-medium">נצ'</th>
                          <th className="py-2 px-2 text-center font-medium">תיקו</th>
                          <th className="py-2 px-2 text-center font-medium">הפ'</th>
                          <th className="py-2 px-2 text-center font-medium">הפ' שערים</th>
                          <th className="py-2 px-3 text-center font-bold text-emerald-400">נק'</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {table.map((row, idx) => (
                          <tr key={row.team} className={`${idx < 2 ? 'bg-emerald-900/10' : ''} hover:bg-slate-700/30 transition-colors`}>
                            <td className="py-3 px-3 font-bold text-slate-200 flex items-center gap-2">
                              <span className="text-slate-500 text-xs w-3">{idx + 1}</span> 
                              {TEAM_FLAGS[row.team] && <img src={`https://flagcdn.com/w40/${TEAM_FLAGS[row.team]}.png`} alt="" className="w-5 h-3.5 rounded-sm object-cover border border-slate-600" />}
                              {row.team}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-400">{row.p}</td>
                            <td className="py-3 px-2 text-center text-slate-400">{row.w}</td>
                            <td className="py-3 px-2 text-center text-slate-400">{row.d}</td>
                            <td className="py-3 px-2 text-center text-slate-400">{row.l}</td>
                            <td className="py-3 px-2 text-center text-slate-400" dir="ltr">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            <td className="py-3 px-3 text-center font-black text-emerald-400">{row.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* --- Tab: Leaderboard --- */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
              <div className="grid grid-cols-12 bg-slate-900/80 text-slate-400 font-bold text-xs sm:text-sm py-3 px-2 sm:px-4 border-b border-slate-700">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">משתתף</div>
                <div className="col-span-2 text-center" title="פגיעה בול (3 נק')">בול</div>
                <div className="col-span-2 text-center" title="כיוון מנצחת (1 נק')">כיוון</div>
                <div className="col-span-2 text-center text-emerald-400">סה"כ</div>
              </div>
              
              <div className="divide-y divide-slate-700/50">
                {leaderboard.map((participant, index) => (
                  <div key={participant.id} className={`grid grid-cols-12 items-center py-4 px-2 sm:px-4 transition-colors ${index === 0 && participant.points > 0 ? 'bg-emerald-900/20' : ''}`}>
                    <div className="col-span-1 text-center font-black text-slate-500">
                      {index === 0 && participant.points > 0 ? <Trophy size={18} className="text-yellow-400 mx-auto" /> : index + 1}
                    </div>
                    <div className="col-span-5 flex items-center gap-2 sm:gap-3">
                      <div className="relative">
                        <img src={participant.avatar} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-slate-600 bg-slate-700" />
                      </div>
                      <span className={`font-bold text-sm sm:text-base ${participant.id === user.uid ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {participant.name} {participant.id === user.uid && '(אתה)'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center font-medium text-slate-300 text-sm">{participant.exactHits}</div>
                    <div className="col-span-2 text-center font-medium text-slate-300 text-sm">{participant.correctWinners}</div>
                    <div className="col-span-2 text-center font-black text-base sm:text-lg text-emerald-400">{participant.points}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 mt-6 text-xs sm:text-sm text-slate-400 border border-slate-700/50">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2"><Info size={16}/> כללי הניקוד:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="text-emerald-400 font-bold">3 נק'</span> על ניחוש תוצאה מדויקת ("בול").</li>
                <li><span className="text-emerald-400 font-bold">1 נק'</span> על ניחוש המנצחת או תיקו (ללא בול).</li>
                <li>במקרה של שוויון נקודות, מי שיש לו יותר "בולים" מנצח.</li>
              </ul>
            </div>
          </div>
        )}

        {/* --- Tab: Bonuses --- */}
        {activeTab === 'bonuses' && (
          <div className="space-y-6">
            
            {/* אזור העריכה האישי */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
              <h3 className="font-black text-white text-lg mb-2 flex items-center gap-2">
                <Star size={20} className="text-yellow-400" /> הבונוס שלי
              </h3>
              
              {isBonusLocked ? (
                <div className="bg-red-900/20 border border-red-500/30 text-red-300 text-xs p-2 rounded-lg mb-4 flex items-center gap-2">
                  <Lock size={14} /> אפשרות העריכה ננעלה (הטורניר החל).
                </div>
              ) : (
                <div className="bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 text-xs p-2 rounded-lg mb-4 flex items-center gap-2">
                  <Clock size={14} /> פתוח לשינויים עד 11/06/2026 בשעה 21:00
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">מי תזכה במונדיאל?</label>
                  <input 
                    type="text" 
                    value={myBonus.champion}
                    onChange={e => setMyBonus(prev => ({...prev, champion: e.target.value}))}
                    disabled={isBonusLocked}
                    placeholder="לדוגמה: ארגנטינה" 
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-yellow-500 focus:outline-none disabled:opacity-60" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">מי יהיה מלך השערים?</label>
                  <input 
                    type="text" 
                    value={myBonus.topScorer}
                    onChange={e => setMyBonus(prev => ({...prev, topScorer: e.target.value}))}
                    disabled={isBonusLocked}
                    placeholder="לדוגמה: אמבפה" 
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-yellow-500 focus:outline-none disabled:opacity-60" 
                  />
                </div>
                
                {!isBonusLocked && (
                  <button onClick={handleSaveBonus} className="w-full bg-slate-700 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Save size={18} /> שמור ניחושי בונוס
                  </button>
                )}
              </div>
            </div>

            <hr className="border-slate-700" />

            <div>
              <h2 className="text-lg font-bold text-emerald-400 mb-4 px-2">בחירות הבונוס של החבר'ה</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(allUsers).filter(u => u.isApproved).map(u => (
                  <div key={u.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4 hover:border-slate-500 transition-colors">
                    <img src={u.avatar} alt="" className="w-12 h-12 rounded-full bg-slate-700 border-2 border-slate-600" />
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg mb-2">{u.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between bg-slate-900/50 px-2 py-1 rounded">
                          <span className="text-slate-400">אלופה:</span>
                          <span className="font-bold text-yellow-400">
                            {u.id === user.uid ? (u.champion || 'לא הזין') : (!isBonusLocked ? '❓ חסוי עד לנעילה' : (u.champion || 'לא הזין'))}
                          </span>
                        </div>
                        <div className="flex justify-between bg-slate-900/50 px-2 py-1 rounded">
                          <span className="text-slate-400">מלך השערים:</span>
                          <span className="font-bold text-emerald-400">
                            {u.id === user.uid ? (u.topScorer || 'לא הזין') : (!isBonusLocked ? '❓ חסוי עד לנעילה' : (u.topScorer || 'לא הזין'))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Tab: Admin --- */}
        {activeTab === 'admin' && isAdminMode && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-emerald-400 mb-4 px-2 flex items-center gap-2"><Shield size={20} /> ניהול משתתפים</h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-700/50">
                {Object.values(allUsers).map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-700" />
                      <div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className={`text-xs ${u.isApproved ? 'text-emerald-400' : 'text-yellow-500'}`}>
                          {u.isApproved ? 'מאושר פעיל' : 'ממתין לאישור'}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleApproval(u.id, u.isApproved)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${u.isApproved ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                    >
                      <UserCheck size={16} />
                      {u.isApproved ? 'בטל אישור' : 'אשר משתתף'}
                    </button>
                  </div>
                ))}
                {Object.keys(allUsers).length === 0 && (
                  <div className="p-6 text-center text-slate-500">אין משתמשים רשומים עדיין.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}