# 🚀 MUREN AI: Presentation & Run Guide (2 Mahine Baad Kaise Run Karein)

Yeh guide aapko yaad dilayegi ki **2 mahine baad** jab aapko viva, final presentation ya evaluation me yeh project dikhana ho, toh bina kisi confusion ke **1 minute ke andar** sab kuch kaise run aur live karna hai.

---

## ⚡ Option 1: Sabse Fast Tarika (1-Click Run - RECOMMENDED)

Aapko koi command yaad rakhne ya terminal me type karne ki zarurat nahi hai:

1. Apne project folder (`E:\5th_SEM\Computer Vision\Project\MUREN`) me jayein.
2. **`start_demo.bat`** file par **Double-Click** karein.
3. **Kya hoga:**
   - Ek minimized window me FastAPI backend aur AI model load hona shuru hoga (~5 seconds).
   - Ek black terminal window khulegi jiska naam hoga **"Cloudflare Live Link"**.
   - Wahan ek box me aapko **naya live link** mil jayega:
     ```text
     https://xxxx-xxxx-xxxx.trycloudflare.com
     ```
4. **Is link ko browser me open kijiye** (apne laptop ya phone par). Aapka pura project live hoga!

---

## 🛠️ Option 2: Manual Tarika (Agar `start_demo.bat` na chale)

Agar kisi reason se aap manually run karna chahein:

### Step 1: Backend Server Start Karein
Terminal ya PowerShell kholein project folder me:
```powershell
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
> Terminal me aayega: `[MUREN AI] Starting up – loading model …` aur `Uvicorn running on http://0.0.0.0:8000`.

### Step 2: Public Online Link Generate Karein
Ek doosra terminal kholein aur chalayein:
```powershell
C:\Users\dell\cloudflared.exe tunnel --url http://localhost:8000
```
> Screen par fresh `https://.....trycloudflare.com` link aa jayega.

---

## ❓ Online Link Ke Bare Me Important Baat (Samajh Lijiye)

* **Kya 2 mahine purana wala link chalega?**
  * Nahi, Cloudflare ke quick free tunnels jab band ho jaate hain to agli baar naya link generate hota hai.
  * Jab aap `start_demo.bat` double click karenge, to **5 seconds ke andar ek FRESH working HTTPS link** ban jayega.
* **Kya phone par khul sakta hai?**
  * Haan! Wo link poori duniya me kahin se bhi kisi bhi phone, tablet ya dusre laptop par open ho sakta hai jab tak aapka laptop on hai aur script chal rahi hai.
* **Bina internet ke chalana ho toh?**
  * Agar college me internet nahi hai ya slow hai, to browser me seedha kholiye:
    👉 **`http://localhost:8000`**
  * Localhost par bina kisi internet ke pura project 100% offline chalega!

---

## 🎯 Demo / Viva Me Kya-Kya Dikhana Hai (Step-by-Step Flow)

Jab professor ya examiner samne ho, to is order me demo dijiye (Maximum Impact):

1. **Model & Architecture Overview (1st Tab)**:
   - Dikhao ki model **MUREN (CVPR 2023)** architecture par based hai (ResNet-50 + Relation Transformer).
   - Folder me bani **`MUREN_HOI_Detectable_Actions_and_Objects.pdf`** dikhayein (117 Verbs, 80 Objects, 600 Interactions).

2. **Single Image Interaction Detection**:
   - Sample images (`test1.jpg` se `test8.jpg`) me se koi select karein ya nayi image upload karein.
   - Screen par **Human bounding box (Blue)** aur **Object bounding box (Green)** ke beech action connection line dikhegi (e.g. `<person, ride, bicycle>`, `<person, eat, pizza>`).
   - Confidence threshold sliders (Action Score: 0.20, Object: 0.50) change karke dikhayein.

3. **Real-Time Webcam Mode**:
   - Webcam tab me jayein, "Start Camera" karein.
   - Apne hath me **Phone**, **Bottle**, **Cup** ya **Book** pakad kar live camera ke samne aayein.
   - Model real-time me `<person, hold, bottle>` ya `<person, talk_on, cell phone>` live frame-by-frame detect karega!

4. **Video Processing & Object Tracking**:
   - Project me padi sample video (`video1.mp4` ya `test_sample_video.mp4`) upload karein.
   - Temporal Action intervals aur continuous interaction tracking dikhayein.

5. **Batch Processing & Report Generation**:
   - Ek sath 4-5 images upload karein.
   - Result table aur **Download HTML / CSV Audit Report** par click karke professional report generate karke dikhayein.

---

## ⚠️ Troubleshooting (Agar koi problem aaye to kya karein)

1. **"Address already in use / Port 8000 busy":**
   - Iska matlab purana server pehle se background me chal raha hai.
   - PowerShell me ye chala kar band kar dein:
     ```powershell
     Stop-Process -Name python -Force
     ```
   - Fir wapas `start_demo.bat` run karein.

2. **Webcam access nahi ho raha:**
   - Browser me camera permission allow kijiye.
   - Note: Webcam browser security ki wajah se sirf **HTTPS (Cloudflare link)** ya **`http://localhost:8000`** par hi chalta hai.

3. **Cloudflare tool check:**
   - `cloudflared.exe` aapke computer me `C:\Users\dell\cloudflared.exe` par save hai. Ise delete mat kariyega.

---
*Created for: 5th Semester Computer Vision Project • Ashish Badal*
