const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSION_COOKIE = 'dsa_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-this-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);
let pool = null;
let storePromise = null;

const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCCQA4TC2-QkfwIEYNEY-WBvndjk63d9wjmpcsE_BTdKL7ArcJfx-o9BO4zKLmiYkcjkpr2BFnZtds/pubhtml';

const days = [
  { day: 1, topic: 'Arrays', questions: ['Two Sum', 'Contains Duplicate', 'Best Time to Buy/Sell', 'Maximum Subarray'], links: ['https://leetcode.com/problems/two-sum/', 'https://leetcode.com/problems/contains-duplicate/', 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', 'https://leetcode.com/problems/maximum-subarray/'] },
  { day: 2, topic: 'Arrays', questions: ['Product Except Self', 'Subarray Sum Equals K', 'Maximum Product Subarray'], links: ['https://leetcode.com/problems/product-of-array-except-self/', 'https://leetcode.com/problems/subarray-sum-equals-k/', 'https://leetcode.com/problems/maximum-product-subarray/'] },
  { day: 3, topic: 'Arrays', questions: ['3Sum', 'Container With Most Water', 'Trapping Rain Water'], links: ['https://leetcode.com/problems/3sum/', 'https://leetcode.com/problems/container-with-most-water/', 'https://leetcode.com/problems/trapping-rain-water/'] },
  { day: 4, topic: 'Sliding Window', questions: ['Longest Substring Without Repeating', 'Character Replacement', 'Permutation in String'], links: ['https://leetcode.com/problems/longest-substring-without-repeating-characters/', 'https://leetcode.com/problems/longest-repeating-character-replacement/', 'https://leetcode.com/problems/permutation-in-string/'] },
  { day: 5, topic: 'Arrays', questions: ['Minimum Size Subarray Sum', 'Sliding Window Max', 'Find Peak Element'], links: ['https://leetcode.com/problems/minimum-size-subarray-sum/', 'https://leetcode.com/problems/sliding-window-maximum/', 'https://leetcode.com/problems/find-peak-element/'] },
  { day: 6, topic: 'Strings', questions: ['Valid Anagram', 'Group Anagrams', 'Valid Palindrome'], links: ['https://leetcode.com/problems/valid-anagram/', 'https://leetcode.com/problems/group-anagrams/', 'https://leetcode.com/problems/valid-palindrome/'] },
  { day: 7, topic: 'Strings', questions: ['Minimum Window Substring', 'Longest Palindromic Substring'], links: ['https://leetcode.com/problems/minimum-window-substring/', 'https://leetcode.com/problems/longest-palindromic-substring/'] },
  { day: 8, topic: 'Strings', questions: ['Longest Repeating Character Replacement', 'Encode Decode Strings'], links: ['https://leetcode.com/problems/longest-repeating-character-replacement/', 'https://leetcode.com/problems/encode-and-decode-strings/'] },
  { day: 9, topic: 'Strings', questions: ['Palindromic Substrings', 'String Compression'], links: ['https://leetcode.com/problems/palindromic-substrings/', 'https://leetcode.com/problems/string-compression/'] },
  { day: 10, topic: 'Revision', questions: ['Revise all above'], links: [] },
  { day: 11, topic: 'Linked List', questions: ['Reverse LL', 'Middle LL', 'Remove Nth Node'], links: ['https://leetcode.com/problems/reverse-linked-list/', 'https://leetcode.com/problems/middle-of-the-linked-list/', 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/'] },
  { day: 12, topic: 'Linked List', questions: ['Cycle Detection', 'Linked List Cycle II'], links: ['https://leetcode.com/problems/linked-list-cycle/', 'https://leetcode.com/problems/linked-list-cycle-ii/'] },
  { day: 13, topic: 'Linked List', questions: ['Merge Two Lists', 'Reorder List'], links: ['https://leetcode.com/problems/merge-two-sorted-lists/', 'https://leetcode.com/problems/reorder-list/'] },
  { day: 14, topic: 'Linked List', questions: ['LRU Cache', 'Copy List with Random Pointer'], links: ['https://leetcode.com/problems/lru-cache/', 'https://leetcode.com/problems/copy-list-with-random-pointer/'] },
  { day: 15, topic: 'Revision', questions: ['Revise LL'], links: [] },
  { day: 16, topic: 'Stack', questions: ['Valid Parentheses', 'Min Stack', 'Evaluate RPN'], links: ['https://leetcode.com/problems/valid-parentheses/', 'https://leetcode.com/problems/min-stack/', 'https://leetcode.com/problems/evaluate-reverse-polish-notation/'] },
  { day: 17, topic: 'Stack', questions: ['Daily Temperatures', 'Next Greater Element'], links: ['https://leetcode.com/problems/daily-temperatures/', 'https://leetcode.com/problems/next-greater-element-i/'] },
  { day: 18, topic: 'Queue', questions: ['Implement Queue', 'Design Circular Queue'], links: ['https://leetcode.com/problems/implement-queue-using-stacks/', 'https://leetcode.com/problems/design-circular-queue/'] },
  { day: 19, topic: 'Queue', questions: ['Sliding Window Maximum', 'Task Scheduler'], links: ['https://leetcode.com/problems/sliding-window-maximum/', 'https://leetcode.com/problems/task-scheduler/'] },
  { day: 20, topic: 'Revision', questions: ['Revise Stack/Queue'], links: [] },
  { day: 21, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 22, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 23, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 24, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 25, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 26, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 27, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 28, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 29, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 30, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 31, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 32, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 33, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 34, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 35, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 36, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 37, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 38, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 39, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 40, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 41, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] },
  { day: 42, topic: 'Trees', questions: ['Inorder', 'Level Order', 'Validate BST'], links: ['https://leetcode.com/problems/binary-tree-inorder-traversal/', 'https://leetcode.com/problems/binary-tree-level-order-traversal/', 'https://leetcode.com/problems/validate-binary-search-tree/'] },
  { day: 43, topic: 'Graph', questions: ['Number of Islands', 'Course Schedule', 'Clone Graph'], links: ['https://leetcode.com/problems/number-of-islands/', 'https://leetcode.com/problems/course-schedule/', 'https://leetcode.com/problems/clone-graph/'] },
  { day: 44, topic: 'DP', questions: ['Climbing Stairs', 'House Robber', 'Coin Change'], links: ['https://leetcode.com/problems/climbing-stairs/', 'https://leetcode.com/problems/house-robber/', 'https://leetcode.com/problems/coin-change/'] },
  { day: 45, topic: 'Binary Search', questions: ['Binary Search', 'Search Rotated', 'Find Min Rotated'], links: ['https://leetcode.com/problems/binary-search/', 'https://leetcode.com/problems/search-in-rotated-sorted-array/', 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/'] }
].map((item) => ({
  ...item,
  sourceSheetUrl: sheetUrl,
  problems: item.questions.map((title, index) => ({
    title,
    url: item.links[index] || null
  }))
}));

function emptyDb() {
  return {
    meta: {
      sourceSheetUrl: sheetUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    days,
    progressByClient: {},
    users: {}
  };
}

async function readDb() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    db.days = days;
    db.meta = { ...db.meta, sourceSheetUrl: sheetUrl };
    db.progressByClient ||= {};
    db.users ||= {};
    return db;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const db = emptyDb();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db) {
  db.meta.updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function clientIdFrom(req) {
  const id = String(req.header('x-client-id') || req.query.clientId || 'default').trim();
  return id.slice(0, 80) || 'default';
}

function cookieFrom(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

function sessionUserFrom(req) {
  const token = cookieFrom(req, SESSION_COOKIE);
  if (!token) return null;
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }
}

function viewerFrom(req) {
  const user = sessionUserFrom(req);
  if (user && user.sub) {
    return { key: `google:${user.sub}`, clientId: null, user };
  }
  const clientId = clientIdFrom(req);
  return { key: `client:${clientId}`, clientId, user: null };
}

function publicUser(user) {
  if (!user) return null;
  return {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign(publicUser(user), SESSION_SECRET, { expiresIn: '30d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

function normalizeProgress(db, key) {
  db.progressByClient[key] ||= { completedDays: [], updatedAt: new Date().toISOString() };
  return db.progressByClient[key];
}

function isValidDay(day) {
  return Number.isInteger(day) && day >= 1 && day <= days.length;
}

async function initStore() {
  if (!process.env.DATABASE_URL) {
    await readDb();
    return 'file';
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
  });

  await pool.query(`
    create table if not exists users (
      google_sub text primary key,
      email text,
      name text,
      picture text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists progress (
      owner_key text not null,
      day integer not null check (day between 1 and 45),
      completed boolean not null default true,
      updated_at timestamptz not null default now(),
      primary key (owner_key, day)
    );
  `);
  return 'postgres';
}

function ensureStore() {
  if (!storePromise) storePromise = initStore();
  return storePromise;
}

async function saveUser(user) {
  if (pool) {
    await pool.query(
      `insert into users (google_sub, email, name, picture, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (google_sub)
       do update set email = excluded.email, name = excluded.name, picture = excluded.picture, updated_at = now()`,
      [user.sub, user.email, user.name, user.picture]
    );
    return;
  }

  const db = await readDb();
  db.users[user.sub] = { ...user, updatedAt: new Date().toISOString() };
  await writeDb(db);
}

async function getCompletedDays(ownerKey) {
  if (pool) {
    const result = await pool.query(
      'select day from progress where owner_key = $1 and completed = true order by day',
      [ownerKey]
    );
    return result.rows.map((row) => row.day);
  }

  const db = await readDb();
  return normalizeProgress(db, ownerKey).completedDays;
}

async function setDayProgress(ownerKey, day, done) {
  if (pool) {
    if (done) {
      await pool.query(
        `insert into progress (owner_key, day, completed, updated_at)
         values ($1, $2, true, now())
         on conflict (owner_key, day)
         do update set completed = true, updated_at = now()`,
        [ownerKey, day]
      );
    } else {
      await pool.query('delete from progress where owner_key = $1 and day = $2', [ownerKey, day]);
    }
    return getCompletedDays(ownerKey);
  }

  const db = await readDb();
  const progress = normalizeProgress(db, ownerKey);
  const completed = new Set(progress.completedDays);
  if (done) completed.add(day);
  else completed.delete(day);
  progress.completedDays = [...completed].sort((a, b) => a - b);
  progress.updatedAt = new Date().toISOString();
  await writeDb(db);
  return progress.completedDays;
}

async function resetProgress(ownerKey) {
  if (pool) {
    await pool.query('delete from progress where owner_key = $1', [ownerKey]);
    return [];
  }

  const db = await readDb();
  db.progressByClient[ownerKey] = { completedDays: [], updatedAt: new Date().toISOString() };
  await writeDb(db);
  return [];
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(async (req, res, next) => {
  try {
    await ensureStore();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, totalDays: days.length, database: pool ? 'postgres' : 'file' });
});

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

app.post('/api/auth/google', async (req, res, next) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured.' });
    }
    const credential = String(req.body.credential || '');
    if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || ''
    };

    await saveUser(user);
    setSessionCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: publicUser(sessionUserFrom(req)) });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/days', async (req, res, next) => {
  try {
    const db = await readDb();
    res.json({ sourceSheetUrl: db.meta.sourceSheetUrl, days: db.days });
  } catch (error) {
    next(error);
  }
});

app.get('/api/progress', async (req, res, next) => {
  try {
    const viewer = viewerFrom(req);
    const completedDays = await getCompletedDays(viewer.key);
    res.json({ clientId: viewer.clientId, user: publicUser(viewer.user), completedDays });
  } catch (error) {
    next(error);
  }
});

app.put('/api/progress/:day', async (req, res, next) => {
  try {
    const day = Number(req.params.day);
    if (!isValidDay(day)) return res.status(400).json({ error: 'Invalid day number.' });

    const viewer = viewerFrom(req);
    const completedDays = await setDayProgress(viewer.key, day, Boolean(req.body.done));
    res.json({ clientId: viewer.clientId, user: publicUser(viewer.user), completedDays });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/progress', async (req, res, next) => {
  try {
    const viewer = viewerFrom(req);
    const completedDays = await resetProgress(viewer.key);
    res.json({ clientId: viewer.clientId, user: publicUser(viewer.user), completedDays });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error.' });
});

if (require.main === module) {
  ensureStore().then((storeType) => {
    app.listen(PORT, () => {
      console.log(`DSA tracker backend running at http://localhost:${PORT} using ${storeType} storage`);
    });
  }).catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
}

module.exports = app;
