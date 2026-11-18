// Demo data. Client and project names come from leder-projects.co.il; everything else
// (people, statuses, amounts, defects, messages, coordinates) is fictional / approximate.
import { addDays, escortFromTemplate } from './util'

const ago = (days, h = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, 15, 0, 0); return d.getTime() }

export function buildSeed() {
  const users = [
    { id: 'u1', name: 'אדם לדר', role: 'admin' },
    { id: 'u2', name: 'יעל כהן', role: 'pm' },
    { id: 'u3', name: 'רועי מזרחי', role: 'pm' },
    { id: 'u4', name: 'דני אברהם', role: 'inspector' },
    { id: 'u5', name: 'סאמר חטיב', role: 'inspector' },
  ]
  const clients = [
    { id: 'c1', name: 'מקורות', type: 'חברה ממשלתית', notes: 'מרחב דרום – רוב הפרויקטים', contacts: [
      { name: 'אבי שגב', role: 'מהנדס מרחב', phone: '050-0000001', email: 'avi@example.com' },
      { name: 'נועה ברק', role: 'רכזת פרויקטים', phone: '050-0000002', email: 'noa@example.com' } ] },
    { id: 'c2', name: 'מעיינות השרון', type: 'תאגיד מים', notes: '', contacts: [
      { name: 'מיכל לוי', role: 'מהנדסת התאגיד', phone: '050-0000003', email: 'michal@example.com' } ] },
    { id: 'c3', name: 'מי מודיעין', type: 'תאגיד מים', notes: '', contacts: [
      { name: 'עומר דיין', role: 'מנהל תפעול', phone: '050-0000004', email: 'omer@example.com' } ] },
  ]
  const templates = [
    { id: 't1', kind: 'defects', name: 'קו מים – סיור פיקוח', ptypes: ['קו מים', 'העתקת קו', 'פיתוח שכונה'], sections: [
      { name: 'חפירה ומצע', items: ['עומק ורוחב חפירה', 'מצע חול', 'ריפוד ועטיפת חול'] },
      { name: 'צנרת', items: ['ריתוך / חיבור צנרת', 'עטיפה והגנה קתודית', 'אביזרים ומגופים', 'גושי עיגון'] },
      { name: 'כיסוי', items: ['סרט סימון', 'מילוי חוזר והידוק', 'החזרת מצב לקדמותו'] },
      { name: 'בדיקות', items: ['בדיקת לחץ', 'חיטוי'] },
      { name: 'בטיחות', items: ['גידור ושילוט', 'הסדרי תנועה'] } ] },
    { id: 't2', kind: 'defects', name: 'מתקן נקודתי – סיור פיקוח', ptypes: ['תחנת שאיבה', 'בריכה', 'ציוד קידוח'], sections: [
      { name: 'עבודות אזרחיות', items: ['יציקות ובטונים', 'איטום', 'מסגרות ופתחים'] },
      { name: 'מכני', items: ['התקנת משאבות', 'צנרת ואביזרים', 'תמיכות ועיגונים'] },
      { name: 'חשמל ובקרה', items: ['לוחות חשמל', 'הארקות', 'מכשור ובקרה'] },
      { name: 'בטיחות', items: ['גידור האתר', 'עבודה בגובה / חלל מוקף'] } ] },
    { id: 't3', kind: 'escort', name: 'ליווי הנדסי – קו מים / העתקת קו', ptypes: ['קו מים', 'העתקת קו', 'פיתוח שכונה'], sections: [
      { name: 'תכנון', items: ['קבלת הזמנת עבודה', 'סיור שטח ראשוני', 'תיאום תשתיות מול בעלי תשתיות', 'אישור תוכניות לביצוע'] },
      { name: 'טרום ביצוע', items: ['היתרי חפירה', 'הסדרי תנועה', 'אישור חומרים וצנרת', 'צו התחלת עבודה'] },
      { name: 'ביצוע', items: ['סימון תוואי', 'חפירה והנחה', 'קידוח אופקי', 'בדיקת לחץ', 'חיטוי', 'חיבור לקו הקיים וניתוק הישן'] },
      { name: 'מסירה', items: ['תוכנית עדות (As-Made)', 'סיור מסירה ורשימת ליקויים', 'תיק מסירה', 'חשבון סופי'] } ] },
    { id: 't4', kind: 'escort', name: 'ליווי הנדסי – מתקן נקודתי', ptypes: ['תחנת שאיבה', 'בריכה', 'ציוד קידוח'], sections: [
      { name: 'תכנון', items: ['קבלת הזמנת עבודה', 'סיור שטח ראשוני', 'אישור תוכניות לביצוע', 'תיאום חיבור חשמל'] },
      { name: 'טרום ביצוע', items: ['היתר בנייה', 'אישור ציוד וספקים', 'צו התחלת עבודה'] },
      { name: 'ביצוע', items: ['עבודות אזרחיות', 'התקנות מכניות', 'חשמל ובקרה', 'הרצה'] },
      { name: 'מסירה', items: ['תוכנית עדות (As-Made)', 'סיור מסירה ורשימת ליקויים', 'תיק מסירה', 'חשבון סופי'] } ] },
  ]
  const escort = (tid, nDone, by) => escortFromTemplate(templates.find((t) => t.id === tid)).map((it, i) =>
    i < nDone ? { ...it, status: 'done', history: [{ at: ago(60 - i * 4), by, text: 'הושלם', status: 'done' }] }
    : i === nDone ? { ...it, status: 'doing', history: [{ at: ago(3), by, text: 'בטיפול – ממתין להשלמת מסמכים', status: 'doing' }] } : it)
  const seg = (id, name, from, to, status, pct = 0) => ({ id, name, from, to, status, pct })
  const ms = (id, name, weight, status, pct = 0) => ({ id, name, weight, status, pct })
  const inv = (id, num, days, amount, status) => ({ id, num, date: addDays(-days), amount, status })

  const projects = [
    { id: 'p1', name: 'קו מחבר קד\' שוקת 5 – בר\' שוקת', clientId: 'c1', initiator: '', service: ['mgmt', 'insp'], geometry: 'line', type: 'קו מים', stage: 'ביצוע',
      pmId: 'u2', inspectorId: 'u4', contractor: 'א.ב. תשתיות (בדוי)', designer: 'תכנון מים בע"מ (בדוי)', channelCode: '4821',
      tech: { diameter: '16"', length: 1900, material: 'פלדה', notes: 'כולל חציית ואדי' }, startDate: addDays(-95), endDate: addDays(60),
      route: [{ lat: 31.2995, lng: 34.8935 }, { lat: 31.3012, lng: 34.8968 }, { lat: 31.3031, lng: 34.8989 }, { lat: 31.3046, lng: 34.9025 }, { lat: 31.3071, lng: 34.9048 }, { lat: 31.3089, lng: 34.9085 }, { lat: 31.3112, lng: 34.9108 }],
      segments: [seg('s1', 'מקטע 1', 0, 300, 'done'), seg('s2', 'מקטע 2', 300, 650, 'done'), seg('s3', 'מקטע 3', 650, 1000, 'done'), seg('s4', 'מקטע 4 – חציית ואדי', 1000, 1300, 'progress', 60), seg('s5', 'מקטע 5', 1300, 1600, 'progress', 20), seg('s6', 'מקטע 6 – חיבור לבריכה', 1600, 1900, 'todo')],
      escort: escort('t3', 10, 'יעל כהן'),
      finance: { contract: 240000, billing: 'אבני דרך', milestones: [{ name: 'תכנון ואישורים', pct: 20, done: true }, { name: 'תחילת ביצוע', pct: 20, done: true }, { name: '50% ביצוע', pct: 25, done: true }, { name: 'סיום ביצוע', pct: 25, done: false }, { name: 'מסירה', pct: 10, done: false }],
        invoices: [inv('i1', '1041', 80, 48000, 'paid'), inv('i2', '1052', 45, 48000, 'paid'), inv('i3', '1067', 12, 60000, 'submitted')] } },
    { id: 'p2', name: 'תחנת שאיבה עידן הנגב', clientId: 'c1', initiator: '', service: ['mgmt'], geometry: 'point', type: 'תחנת שאיבה', stage: 'ביצוע',
      pmId: 'u3', inspectorId: '', contractor: 'נגב הנדסה (בדוי)', designer: 'תכנון מים בע"מ (בדוי)', channelCode: '7350',
      tech: { capacity: '400 מק"ש', notes: 'שלוש יחידות שאיבה' }, startDate: addDays(-140), endDate: addDays(120), location: { lat: 31.365, lng: 34.77 },
      milestones: [ms('m1', 'עבודות אזרחיות', 30, 'done'), ms('m2', 'צנרת ואביזרים', 25, 'progress', 50), ms('m3', 'חשמל ובקרה', 20, 'progress', 10), ms('m4', 'ציוד שאיבה', 15, 'todo'), ms('m5', 'הרצה ומסירה', 10, 'todo')],
      escort: escort('t4', 8, 'רועי מזרחי'),
      finance: { contract: 380000, billing: 'אבני דרך', milestones: [{ name: 'תכנון', pct: 20, done: true }, { name: 'סיום אזרחי', pct: 30, done: true }, { name: 'סיום התקנות', pct: 30, done: false }, { name: 'הרצה ומסירה', pct: 20, done: false }],
        invoices: [inv('i1', '1038', 100, 76000, 'paid'), inv('i2', '1061', 20, 114000, 'approved')] } },
    { id: 'p3', name: 'העתקת קו – כביש 90, פונדק 101', clientId: 'c1', initiator: 'נתיבי ישראל', service: ['mgmt'], geometry: 'line', type: 'העתקת קו', stage: 'תכנון',
      pmId: 'u2', inspectorId: '', contractor: '', designer: 'ערבה מהנדסים (בדוי)', channelCode: '1196',
      tech: { diameter: '8"', length: 400, material: 'PE-100', notes: 'חציית כביש 40 מ\' בקידוח HDD 315 מ"מ' }, startDate: addDays(-30), endDate: addDays(200),
      route: [{ lat: 30.3712, lng: 35.1482 }, { lat: 30.3725, lng: 35.1489 }, { lat: 30.3738, lng: 35.1501 }, { lat: 30.3747, lng: 35.1506 }],
      segments: [seg('s1', 'מקטע דרומי', 0, 180, 'todo'), seg('s2', 'חציית כביש – HDD', 180, 220, 'todo'), seg('s3', 'מקטע צפוני', 220, 400, 'todo')],
      escort: escort('t3', 2, 'יעל כהן'),
      finance: { contract: 95000, billing: 'אבני דרך', milestones: [{ name: 'תכנון ואישורים', pct: 30, done: false }, { name: 'ביצוע', pct: 50, done: false }, { name: 'מסירה', pct: 20, done: false }], invoices: [inv('i1', '1070', 8, 19000, 'draft')] } },
    { id: 'p4', name: 'החלפת קווי מים – רחוב הבשן, כפר יונה', clientId: 'c2', initiator: '', service: ['mgmt', 'insp'], geometry: 'line', type: 'קו מים', stage: 'מסירה',
      pmId: 'u3', inspectorId: 'u5', contractor: 'שרון צנרת (בדוי)', designer: '', channelCode: '3307',
      tech: { diameter: '6"', length: 420, material: 'PE-100', notes: '' }, startDate: addDays(-180), endDate: addDays(10),
      route: [{ lat: 32.3158, lng: 34.9322 }, { lat: 32.3166, lng: 34.9341 }, { lat: 32.3171, lng: 34.9362 }, { lat: 32.3179, lng: 34.9378 }],
      segments: [seg('s1', 'מקטע א', 0, 140, 'done'), seg('s2', 'מקטע ב', 140, 280, 'done'), seg('s3', 'מקטע ג', 280, 420, 'done')],
      escort: escort('t3', 15, 'רועי מזרחי'),
      finance: { contract: 68000, billing: 'אחוז מהיקף הביצוע', milestones: [{ name: 'ביצוע', pct: 80, done: true }, { name: 'מסירה וחשבון סופי', pct: 20, done: false }], invoices: [inv('i1', '1019', 120, 27200, 'paid'), inv('i2', '1049', 50, 27200, 'paid')] } },
    { id: 'p5', name: 'בור חירום – תחנת שאיבה 7', clientId: 'c3', initiator: '', service: ['insp'], geometry: 'point', type: 'תחנת שאיבה', stage: 'ביצוע',
      pmId: 'u1', inspectorId: 'u5', contractor: 'מודיעין בינוי (בדוי)', designer: '', channelCode: '9014',
      tech: { capacity: '130 מ"ק', notes: 'בור חירום לגלישת ביוב' }, startDate: addDays(-70), endDate: addDays(40), location: { lat: 31.9012, lng: 35.0085 },
      milestones: [ms('m1', 'חפירה ודיפון', 25, 'done'), ms('m2', 'יציקות', 35, 'done'), ms('m3', 'צנרת וחיבור לתחנה', 25, 'progress', 40), ms('m4', 'פיתוח ומסירה', 15, 'todo')],
      escort: escort('t4', 9, 'אדם לדר'),
      finance: { contract: 42000, billing: 'שעות', milestones: [{ name: 'תחילת עבודה', pct: 20, done: true }, { name: 'סיום יציקות', pct: 40, done: true }, { name: 'מסירה', pct: 40, done: false }], invoices: [inv('i1', '1055', 40, 8400, 'paid')] } },
  ]

  const visits = [
    { id: 'v1', projectId: 'p1', date: addDays(-9), at: ago(9), inspectorId: 'u4', inspectorName: 'דני אברהם', attendees: 'מנהל עבודה מטעם הקבלן', summary: 'העבודה במקטע 3 הושלמה. במקטע 4 נמצא חוסר בעטיפת חול.',
      items: [{ cat: 'חפירה ומצע', name: 'עומק ורוחב חפירה', result: 'ok' }, { cat: 'חפירה ומצע', name: 'ריפוד ועטיפת חול', result: 'defect' }, { cat: 'צנרת', name: 'ריתוך / חיבור צנרת', result: 'ok' }, { cat: 'בטיחות', name: 'גידור ושילוט', result: 'defect' }] },
    { id: 'v2', projectId: 'p1', date: addDays(-2), at: ago(2), inspectorId: 'u4', inspectorName: 'דני אברהם', attendees: 'מנהל עבודה, מודד', summary: 'התקדמות טובה בחציית הואדי. נדרש תיקון עטיפה קתודית בריתוך 14.',
      items: [{ cat: 'צנרת', name: 'עטיפה והגנה קתודית', result: 'defect' }, { cat: 'צנרת', name: 'גושי עיגון', result: 'ok' }, { cat: 'כיסוי', name: 'סרט סימון', result: 'ok' }, { cat: 'בטיחות', name: 'גידור ושילוט', result: 'ok' }] },
    { id: 'v3', projectId: 'p4', date: addDays(-5), at: ago(5), inspectorId: 'u5', inspectorName: 'סאמר חטיב', attendees: 'נציג התאגיד, מנהל עבודה', summary: 'סיור מסירה ראשון. נותרו שני ליקויים בהחזרת מצב לקדמותו.',
      items: [{ cat: 'כיסוי', name: 'החזרת מצב לקדמותו', result: 'defect' }, { cat: 'בדיקות', name: 'בדיקת לחץ', result: 'ok' }, { cat: 'בדיקות', name: 'חיטוי', result: 'ok' }] },
  ]
  const def = (id, projectId, visitId, desc, cat, severity, loc, status, dueIn, days) => ({ id, projectId, visitId, desc, cat, severity, loc, status, owner: 'קבלן', due: addDays(dueIn), imgs: [], createdAt: ago(days) })
  const defects = [
    def('d1', 'p1', 'v1', 'חוסר בעטיפת חול מעל הצינור, כ-12 מ\'', 'חפירה ומצע', 'high', 'מקטע 4 – חציית ואדי', 'fixed', -2, 9),
    def('d2', 'p1', 'v1', 'גידור חסר לאורך החפירה הפתוחה', 'בטיחות', 'high', 'מקטע 4 – חציית ואדי', 'closed', -6, 9),
    def('d3', 'p1', 'v2', 'עטיפה קתודית פגומה בריתוך מס\' 14', 'צנרת', 'med', 'מקטע 4 – חציית ואדי', 'open', 3, 2),
    def('d4', 'p4', 'v3', 'אבני שפה לא הוחזרו בכניסה לבית מס\' 12', 'כיסוי', 'med', 'מקטע ב', 'open', -1, 5),
    def('d5', 'p4', 'v3', 'שקיעת אספלט מעל התעלה', 'כיסוי', 'low', 'מקטע ג', 'doing', 4, 5),
  ]
  const task = (id, title, assigneeId, dueIn, status, projectId, priority = 'med', source = null) => ({ id, title, desc: '', assigneeId, due: addDays(dueIn), status, projectId, priority, source, createdAt: ago(10) })
  const tasks = [
    task('k1', 'לקבל היתר חפירה מהמועצה למקטע 6', 'u2', -3, 'waiting', 'p1', 'high', { type: 'escort', label: 'ליווי הנדסי' }),
    task('k2', 'לאשר תוכנית הסדרי תנועה מעודכנת', 'u2', 2, 'doing', 'p1'),
    task('k3', 'לאמת תיקון עטיפת חול במקטע 4', 'u4', 0, 'open', 'p1', 'high', { type: 'defect', id: 'd1', label: 'ליקוי' }),
    task('k4', 'לתאם מועד בדיקת לחץ עם הקבלן', 'u4', 5, 'open', 'p1', 'med', { type: 'protocol', id: 'r1', label: 'פרוטוקול' }),
    task('k5', 'לקבל הצעות מחיר לציוד שאיבה', 'u3', -5, 'doing', 'p2', 'high'),
    task('k6', 'תיאום חיבור חשמל מול חברת החשמל', 'u3', 9, 'waiting', 'p2'),
    task('k7', 'סיור תיאום תשתיות עם נתיבי ישראל', 'u2', 4, 'open', 'p3'),
    task('k8', 'להכין תיק מסירה לתאגיד', 'u3', 6, 'doing', 'p4'),
    task('k9', 'סיור מסירה חוזר – אימות ליקויים', 'u5', 1, 'open', 'p4'),
    task('k10', 'להוציא חשבון חלקי – סיום יציקות', 'u1', -7, 'open', 'p5', 'high'),
    task('k11', 'חידוש ביטוח אחריות מקצועית', 'u1', 14, 'open', '', 'med'),
    task('k12', 'הגשת מסמכים למאגר יועצים – תאגיד מים', 'u1', 20, 'open', '', 'low'),
    task('k13', 'עדכון יומן סיורים שבועי', 'u5', -1, 'done', 'p5'),
  ]
  const protocols = [
    { id: 'r1', projectId: 'p1', kind: 'site', title: 'ישיבת אתר מס\' 6', date: addDays(-7), place: 'אתר העבודה', status: 'sent', sentAt: ago(7),
      attendees: ['יעל כהן', 'דני אברהם', 'אבי שגב', 'מנהל עבודה – א.ב. תשתיות'],
      topics: [{ title: 'סטטוס ביצוע', text: 'מקטעים 1–3 הושלמו. חציית הואדי בביצוע.' }, { title: 'לוח זמנים', text: 'צפי לסיום הנחה: שישה שבועות.' }],
      decisions: ['בדיקת לחץ תבוצע למקטעים 1–3 בנפרד, לפני השלמת הקו.', 'הקבלן יגיש תוכנית הסדרי תנועה מעודכנת למקטע 6.'],
      actions: [{ what: 'לתאם מועד בדיקת לחץ עם הקבלן', who: 'u4', due: addDays(5), taskId: 'k4' }] },
    { id: 'r2', projectId: 'p1', kind: 'site', title: 'ישיבת אתר מס\' 7', date: addDays(0), place: 'אתר העבודה', status: 'draft',
      attendees: ['יעל כהן', 'דני אברהם', 'אבי שגב'],
      topics: [{ title: 'סטטוס ביצוע', text: '' }, { title: 'ליקויים פתוחים', text: '' }, { title: 'לוח זמנים', text: '' }], decisions: [], actions: [] },
  ]
  const msg = (id, projectId, days, h, by, role, internal, text, extra = {}) => ({ id, projectId, at: ago(days, h), by, role, internal, text, ...extra })
  const messages = [
    msg('g1', 'p1', 9, 14, 'דני אברהם', 'מפקח', true, 'דוח סיור הועלה. שני ליקויים לטיפול הקבלן.', { card: { type: 'visit', id: 'v1', title: 'דוח סיור פיקוח' } }),
    msg('g2', 'p1', 8, 9, 'מנהל עבודה – א.ב. תשתיות', 'קבלן', false, 'קיבלנו. הגידור יושלם היום, עטיפת החול עד יום חמישי.'),
    msg('g3', 'p1', 7, 16, 'יעל כהן', 'מנהל פרויקט', true, 'פרוטוקול ישיבת אתר 6 מצורף.', { card: { type: 'protocol', id: 'r1', title: 'ישיבת אתר מס\' 6' } }),
    msg('g4', 'p1', 6, 11, 'אבי שגב', 'לקוח', false, 'תודה. מתי צפויה בדיקת הלחץ למקטעים 1–3?'),
    msg('g5', 'p1', 6, 12, 'יעל כהן', 'מנהל פרויקט', true, 'מתואמת לשבוע הבא, אעדכן מועד סופי כאן.'),
    msg('g6', 'p1', 2, 15, 'דני אברהם', 'מפקח', true, 'דוח סיור מהיום. ליקוי אחד חדש בעטיפה הקתודית.', { card: { type: 'visit', id: 'v2', title: 'דוח סיור פיקוח' } }),
  ]
  return { users, clients, templates, projects, visits, defects, tasks, protocols, messages }
}
