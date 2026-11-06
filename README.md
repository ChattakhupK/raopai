# RaoPai ♥

แผนที่ความทรงจำ — ปักหมุดที่ที่ไปเที่ยวด้วยกัน พร้อมวันที่ โน้ต และรูปภาพ
Next.js 16 (App Router) · Leaflet + OpenStreetMap · Supabase (ข้อมูล) · Cloudinary (รูป) · PWA

## ฟีเจอร์
- ค้นหาสถานที่ (OpenStreetMap Nominatim, รองรับภาษาไทย) แล้วปักหมุดได้ทันที
- ปักหมุดเองด้วยการเลื่อนแผนที่ / แตะบนแผนที่ระหว่างกรอกฟอร์มเพื่อย้ายหมุด
- วันที่ไป, โน้ต, อัปโหลดหลายรูป (ย่อขนาดในเครื่องก่อนอัปโหลด)
- ไทม์ไลน์จัดกลุ่มตามเดือน + กรองตามปี, ดูรูปเต็มจอ (ปัดซ้าย/ขวา)
- หมุดที่มีรูปจะแสดงรูปแรกเป็นหมุดบนแผนที่
- ติดตั้งเป็นแอปบนมือถือได้ (PWA) และเปิดดูแบบออฟไลน์ได้
- ล็อกด้วยรหัสลับร่วมกัน (`APP_PASSCODE`)

## ตั้งค่า (ครั้งแรก)

### 1. Supabase — เก็บข้อมูลหมุด
1. สร้างโปรเจกต์ที่ https://supabase.com (เลือก region Singapore จะเร็วสุด)
2. เมนู **SQL Editor** → วางเนื้อหาไฟล์ [`supabase/schema.sql`](supabase/schema.sql) → Run
3. **Project Settings › Data API** → คัดลอก Project URL → `SUPABASE_URL`
4. **Project Settings › API Keys** → คัดลอก secret key (`sb_secret_…`) → `SUPABASE_SECRET_KEY`
   (ใช้ legacy `service_role` key ก็ได้ ใส่ใน `SUPABASE_SECRET_KEY` เหมือนกัน)

### 2. Cloudinary — เก็บรูป
1. สมัครที่ https://cloudinary.com (ฟรี)
2. **Settings › API Keys** → คัดลอก Cloud name, API Key, API Secret

### 3. ใส่ค่าใน `.env.local`
```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
APP_PASSCODE=รหัสลับของเรา   # เว้นว่าง = ไม่ล็อก
```
แล้ว `npm run dev` → http://localhost:3000

> Secret key ทั้งสองตัวใช้เฉพาะฝั่ง server เท่านั้น ไม่ถูกส่งไปเบราว์เซอร์ — ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`

## Deploy ขึ้น Vercel
```bash
npm i -g vercel@latest
vercel login
vercel link --yes
# ใส่ env ทั้ง 6 ตัวข้างบน (ทำทีละตัว หรือใส่ใน Dashboard › Settings › Environment Variables)
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SECRET_KEY production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
vercel env add APP_PASSCODE production
vercel --prod
```

ติดตั้งบนมือถือ: iPhone → Safari › แชร์ › "เพิ่มไปยังหน้าจอโฮม" · Android → Chrome › "ติดตั้งแอป"
