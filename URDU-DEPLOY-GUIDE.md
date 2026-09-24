# MIZANORA — Vercel + Firebase Setup Guide (Urdu)

## Pehle ye samjho: project ka structure kya hai

Aap ka poora e-commerce app **7 phases** mein mukammal (complete) bana hua hai — Home, Shop, Cart, Checkout, Account, Admin Panel, sab kuch. Ye 2 hisson mein bataa hai:

1. **Frontend (`public/` folder)** — plain HTML/CSS/JS hai, koi build step nahi. **Yehi hissa Vercel par host hoga.**
2. **Backend (`functions/` folder)** — Firebase Cloud Functions hain (order banana, coupon check karna, review approve karna waghera). **Ye Vercel par nahi chalega — ye hamesha Firebase par hi deploy hoga.** Vercel sirf website dikhayega; order process karna, database, login — ye sab Firebase ka kaam hai, chahe website kahin bhi host ho.

Matlab: **Vercel = sirf hosting (website dikhana). Firebase = database, login, orders, sab asli kaam.** Dono zaroori hain, ek doosre ka replacement nahi.

---

## "Zoom" wale masle ke baare mein

Maine code check kiya — aap ki site mein viewport (mobile scaling) sahi set hai (`width=device-width, initial-scale=1`), koi galat `zoom` CSS bhi nahi mili jo poori site ko bada/chhota kar rahi ho. Jo `scale()` code mile hain wo sirf button click aur product image zoom-in jaisi normal design cheezein hain, bug nahi.

Agar aap ko koi specific page ya device par zoom ka masla nazar aa raha hai, to mujhe **screenshot + page ka naam** bata dein — main exact fix kar dunga. Filhaal poori site ki responsiveness theek hai.

---

## Step 1 — Firebase Project banao (agar pehle se nahi bana)

1. https://console.firebase.google.com par jao → **Add project**
2. Project ka naam do (e.g. `mizanora-market`)
3. Project ke andar ye 4 cheezein **on/enable** karo:
   - **Firestore Database** → Build mode: production
   - **Realtime Database**
   - **Authentication** → Sign-in method mein **Email/Password** on karo (Google optional)
   - **Functions** (Blaze/paid plan chahiye hoga functions ke liye)

## Step 2 — Firebase Config values nikalo

Firebase Console → ⚙️ **Project Settings** → **General** → neeche scroll karo → **Your apps** → web app (</>) add karo agar nahi hai → wahan ek `firebaseConfig` object milega jaisa ye:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mizanora-market.firebaseapp.com",
  projectId: "mizanora-market",
  storageBucket: "mizanora-market.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
  databaseURL: "https://mizanora-market-default-rtdb.firebaseio.com"
};
```

### ⚠️ Ye values Vercel "Environment Variables" mein NAHI jaati

Ye important baat hai: chunke ye site **plain HTML/JS** hai (React/Next.js jaisa build step nahi), Vercel ke Environment Variables browser tak automatically nahi pahunchte. Isliye ye values seedha file mein likhni hain:

**File:** `public/js/services/firebase-init.js`

Is file mein `YOUR_FIREBASE_API_KEY` waghera placeholders ko apni asal values se replace karo. Ye keys public hone se koi masla nahi — ye sirf project ko identify karti hain, asli security `firestore.rules` aur `database.rules.json` se aati hai (jo pehle se is project mein maujood hai).

## Step 3 — ImgBB key (product images upload ke liye)

1. https://api.imgbb.com/ par free account banao, API key lo
2. `public/js/env.example.js` ko copy karke `public/js/env.js` naam se save karo, us mein apni key daal do:
   ```js
   window.__MIZANORA_ENV__ = { IMGBB_API_KEY: "aap_ki_asal_key" };
   ```
   (Ye file `.gitignore` mein hai — GitHub par upload nahi hogi, jo sahi hai kyunke ye asal secret key hai.)

## Step 4 — Firebase Rules + Functions + Indexes deploy karo

Apne computer par (Vercel se pehle, ek hi baar):

```bash
npm install -g firebase-tools
firebase login
firebase init        # existing project select karo, sirf hosting mat select karna
firebase deploy --only firestore:rules,firestore:indexes,database,functions
```

## Step 5 — Pehla Admin banao

App mein koi bhi normal account admin nahi ban sakta khud se — pehla admin manually banana parta hai:

1. Live site par normal account banao (wahi email jo admin banana hai)
2. Firebase Console → Project Settings → Service Accounts → **Generate new private key** → file ko `scripts/service-account.json` naam se save karo
3. `cd scripts && npm install firebase-admin --no-save`
4. `node bootstrap-first-admin.js you@example.com`
5. Site se logout/login karo → ab `/admin` khul jayega

---

## Step 6 — Vercel par deploy karo

1. Apna poora project GitHub par push karo (ek naya repo bana lo)
2. https://vercel.com par jao → **Add New Project** → apna GitHub repo select karo
3. **Project Settings** mein:
   - **Root Directory** → `public` set karo (kyunke asal website is folder ke andar hai)
   - **Framework Preset** → **Other**
   - Build command khali chhod do (kuch build nahi karna, ye plain HTML hai)
4. **Deploy** dabao — 1-2 minute mein live ho jayega, `.vercel.app` wala link mil jayega
5. Baad mein apna khud ka domain bhi Project Settings → Domains mein add kar sakte ho

Is repo mein maine `vercel.json` file bana kar di hai jo aap ki old `firebase.json` ke URLs (jaise `/shop`, `/cart`, `/product/xyz`) ko sahi HTML file tak route karti hai — bas GitHub par push karo, Vercel khud utha lega.

---

## Khulasa (Summary)

| Cheez | Kahan chalti hai |
|---|---|
| Website ka look (HTML/CSS/JS) | **Vercel** |
| Login, Database, Orders | **Firebase** (hamesha) |
| Product images | **ImgBB** |
| Domain, SSL, speed (CDN) | **Vercel** khud deta hai, fast hi rahega |

Firebase config = `firebase-init.js` file mein seedha likho.
ImgBB key = `public/js/env.js` file mein (Vercel env vars use nahi hongi kyunke build step nahi hai).
