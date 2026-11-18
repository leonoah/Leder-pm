# לדר – ניהול ופיקוח פרויקטים (Demo)

React + Vite + Tailwind, Firestore כבסיס נתונים, פריסה ל-Vercel.

## הרצה מקומית
    npm install
    npm run dev

בלי משתני סביבה האפליקציה רצה על נתוני דוגמה שנשמרים בדפדפן (localStorage).

## חיבור ל-Firebase
1. ב-Firebase Console: יצירת פרויקט, הפעלת Firestore Database, והוספת Web app.
2. להעתיק את `.env.example` ל-`.env.local` ולמלא את ארבעת הערכים מה-config של ה-Web app
   (ב-Vercel: Project Settings > Environment Variables, אותם שמות).
3. לפרסם את `firestore.rules` (Firestore > Rules). **הכללים פתוחים לגמרי – ל-demo בלבד, עם נתונים בדויים.**
4. בטעינה הראשונה האפליקציה כותבת את נתוני הדוגמה ל-Firestore. "איפוס נתוני דוגמה" בתפריט מוחק וכותב מחדש.

תמונות נשמרות דחוסות בתוך מסמכי Firestore (בלי Firebase Storage). קבצים מצורפים מוגבלים ל-400KB.

## מבנה
- `src/lib/db.js` – שכבת הנתונים (Firestore או localStorage, אותו API)
- `src/lib/seed.js` – נתוני הדוגמה
- `src/pages/` – מסכים ראשיים; `src/pages/project/` – לשוניות כרטיס הפרויקט
- `src/pages/ChannelPublic.jsx` – ערוץ הפרויקט לאורחים (`#/c/<projectId>` + קוד גישה)
