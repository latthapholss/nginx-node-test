# 🚀 CI/CD Pipeline: GitHub Actions to Harbor (UAT & PRD)
โปรเจกต์ตัวอย่างการทำ CI/CD ด้วย **GitHub Actions (Self-Hosted Runner)** เพื่อ Build Docker Image และ Push ไปยัง **Harbor UAT** เมื่อผ่านการทดสอบจะทำการ Promote Image ต่อไปยัง **Harbor PRD** โดยอัตโนมัติ
---
## 🏗 Architecture Workflow

  

[ Git Push (main) ]
│
▼
[ GitHub Actions (Self-Hosted Runner on Mac) ]
│
├── 1. Build Docker Image (Single Build)
│
├── 2. Push Image ────────► [ Harbor UAT (Port 443) ]
│                                   │
│ (If UAT Push OK)                  │
│                                   ▼
├── 3. Retag & Push ──────► [ Harbor PRD (Port 8443) ]
│                                   │
│ (If Both OK)                      │
│                                   ▼
└── 4. Notify / Trigger ──► [ Ready to Deploy! 🚀 ]


  
---
## 📁 โครงสร้างโปรเจกต์ (Repository Structure)
```text
├── .github/
│   └── workflows/
│       └── ci.yml            # ไฟล์คำสั่ง CI/CD Pipeline
├── Dockerfile                # ไฟล์สำหรับสร้าง Docker Image
├── README.md                 # เอกสารอธิบายระบบ
└── ... (โค้ดของแอปพลิเคชัน)
🔐 1. การตั้งค่า GitHub Secrets

ก่อนเริ่มรัน ให้ไปที่ Settings > Secrets and variables > Actions > New repository secret ใน GitHub Repo และใส่ค่าดังนี้:

Secret Name	Value (ค่าที่ใส่)	คำอธิบาย
HARBOR_UAT_URL	10.5.3.56	URL/IP ของ Harbor UAT
HARBOR_UAT_USER	admin	Username สำหรับ UAT
HARBOR_UAT_SECRET	Harbor12345	Password สำหรับ UAT
HARBOR_PRD_URL	10.5.3.56:8443	URL/IP และ Port ของ Harbor PRD
HARBOR_PRD_USER	admin	Username สำหรับ PRD
HARBOR_PRD_SECRET	HarborPrd12345	Password สำหรับ PRD
🐳 2. ตัวอย่างไฟล์ Dockerfile

สร้างไฟล์ Dockerfile ไว้ที่ Root ของโปรเจกต์:

dockerfile
FROM alpine:latest
RUN echo "App version: 1.0.0 built for Harbor UAT & PRD" > /app.txt
CMD ["cat", "/app.txt"]
⚙️ 3. ตัวอย่างไฟล์ .github/workflows/ci.yml
```yaml
name: Build and Push to Harbor (UAT & PRD)
on:
  push:
    branches: [ "main", "master" ]
jobs:
  build-and-promote:
    runs-on: self-hosted  # รันผ่าน Self-Hosted Runner บนเครื่อง Mac
    env:
      APP_NAME: nginx-node-test
      TAG: ${{ github.sha }}
    steps:
      - name: 1. Checkout Code
        uses: actions/checkout@v4

      # ==========================================
      # STEP 1: Login & Push ไปยัง Harbor UAT
      # ==========================================
      - name: 2. Login to Harbor UAT
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.HARBOR_UAT_URL }}
          username: ${{ secrets.HARBOR_UAT_USER }}
          password: ${{ secrets.HARBOR_UAT_SECRET }}
      - name: 3. Build and Push to UAT
        run: |
          UAT_IMG="${{ secrets.HARBOR_UAT_URL }}/library/${{ env.APP_NAME }}:${{ env.TAG }}"
          UAT_LATEST="${{ secrets.HARBOR_UAT_URL }}/library/${{ env.APP_NAME }}:latest"
          echo "🔨 กำลัง Build Docker Image..."
          docker build -t "$UAT_IMG" -t "$UAT_LATEST" .
          echo "📤 กำลัง Push Image ไปยัง Harbor UAT..."
          docker push "$UAT_IMG"
          docker push "$UAT_LATEST"
          echo "✅ Push เข้า Harbor UAT สำเร็จ!"

      # ==========================================
      # STEP 2: Retag & Push ไปยัง Harbor PRD
      # ==========================================
      - name: 4. Login to Harbor PRD
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.HARBOR_PRD_URL }}
          username: ${{ secrets.HARBOR_PRD_USER }}
          password: ${{ secrets.HARBOR_PRD_SECRET }}
      - name: 5. Retag and Push to PRD
        run: |
          UAT_IMG="${{ secrets.HARBOR_UAT_URL }}/library/${{ env.APP_NAME }}:${{ env.TAG }}"
          PRD_IMG="${{ secrets.HARBOR_PRD_URL }}/library/${{ env.APP_NAME }}:${{ env.TAG }}"
          PRD_LATEST="${{ secrets.HARBOR_PRD_URL }}/library/${{ env.APP_NAME }}:latest"
          echo "📦 กำลังโปรโมต Image จาก UAT ไป PRD..."
          docker tag "$UAT_IMG" "$PRD_IMG"
          docker tag "$UAT_IMG" "$PRD_LATEST"
          docker push "$PRD_IMG"
          docker push "$PRD_LATEST"
          echo "✅ Push เข้า Harbor PRD สำเร็จ!"

      # ==========================================
      # STEP 3: แจ้งเตือนเมื่อทั้งคู่สำเร็จ
      # ==========================================
      - name: 6. Notify Success
        if: success()
        run: |
          echo "🎉 CI สำเร็จทั้งสองฝั่ง (UAT & PRD) แล้ว!"
          echo "🚀 Image Tag '${{ env.TAG }}' พร้อมนำไป Deploy บน Production ได้ทันที"
```
🚢 4. วิธีดึง Image จาก Harbor ไป Deploy

บนเซิร์ฟเวอร์ปลายทาง สั่งดึง Image เพื่อ Deploy:

สำหรับ UAT:

  
bash
echo "Harbor12345" | docker login 10.5.3.56 -u admin --password-stdin
docker pull 10.5.3.56/library/nginx-node-test:latest
docker run -d --name my-app-uat 10.5.3.56/library/nginx-node-test:latest
สำหรับ PRD:

  
bash
echo "HarborPrd12345" | docker login 10.5.3.56:8443 -u admin --password-stdin
docker pull 10.5.3.56:8443/library/nginx-node-test:latest
docker run -d --name my-app-prd 10.5.3.56:8443/library/nginx-node-test:latest
🛠️ 5. ข้อมูลการดูแลระบบ Harbor ในเครื่อง

  

  
Harbor UAT Web UI: https://localhost (Port 443)

  
Harbor PRD Web UI: https://localhost:8443 (Port 8443)

  
คำสั่งเปิด Runner รับงาน (Terminal):
  
bash
cd ~/Desktop/actions-runner && ./run.sh