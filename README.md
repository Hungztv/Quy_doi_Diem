# Tính Điểm Xét Tuyển Đại Học (Thang 30)

Dự án công cụ web giúp các sĩ tử tính điểm xét tuyển đại học tổng hợp từ nhiều nguồn: **Điểm Học Bạ**, **Điểm thi Đánh Giá Năng Lực (HSA / V-SAT)** và **Điểm ưu tiên/khuyến khích**. Hỗ trợ tự động lưu thông tin của học sinh về Google Sheets để thuận tiện cho việc tư vấn tuyển sinh.

![Giao diện chính](public/preview.png) *(Hình ảnh minh họa giao diện)*

## 🌟 Tính Năng Nổi Bật

- **Tính điểm Học Bạ**: Áp dụng công thức `((Môn 1 * 2) + Môn 2 + Môn 3) * 3 / 4`.
- **Quy đổi điểm ĐGNL**: Tự động nội suy điểm từ bài thi HSA (ĐHQG Hà Nội) và V-SAT sang thang 30.
- **Tích hợp Điểm Cộng & Ưu Tiên**: Tự động cộng dồn vào kết quả xét tuyển cuối cùng.
- **Lưu trữ dữ liệu tự động**: Gửi thông tin người dùng (Họ tên, các đầu điểm, Link Facebook) thẳng về Google Sheets qua API Webhook.
- **Giao diện hiện đại, thân thiện**: Thiết kế UI/UX theo chuẩn Mobile-First bằng Tailwind CSS, mượt mà trên mọi thiết bị từ điện thoại đến PC.

## 🛠 Công Nghệ Sử Dụng

- **Frontend**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS (CSS modules / gradients hiện đại).
- **Backend / Database**: Next.js API Routes, Google Apps Script (Webhook gửi vào Google Sheets).
- **Deploy**: Vercel.

## 🚀 Hướng Dẫn Cài Đặt (Chạy Local)

1. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

2. **Cấu hình Biến môi trường**:
   Tạo file `.env.local` ở thư mục gốc và cấu hình đường dẫn API Google Sheets của bạn:
   ```env
   GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/ID_CUA_BAN/exec
   ```

3. **Khởi động Server Dev**:
   ```bash
   npm run dev
   ```
   Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để xem kết quả.

## 📊 Hướng Dẫn Tích Hợp Google Sheets

Dự án này sử dụng Google Apps Script để bắt request và ghi vào Sheet. 
1. Mở file Google Sheets, chọn **Extensions > Apps Script**.
2. Dán đoạn mã sau:
   ```javascript
   function doPost(e) {
     try {
       var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
       var data = JSON.parse(e.postData.contents);
       var timestamp = new Date();
       
       var rowData = [
         timestamp, data.fullName || "", data.hocBaM1 || 0, data.hocBaM2 || 0, data.hocBaM3 || 0, 
         data.examType || "", data.examScore || 0, data.bonusPoints || 0, data.priorityPoints || 0, 
         data.finalScore || 0, data.facebookLink || ""
       ];
       
       sheet.appendRow(rowData);
       return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
     } catch (error) {
       return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```
3. Nhấn **Deploy > New deployment**, chọn loại **Web app**, quyền truy cập (Who has access) là **Anyone**.
4. Lấy Web app URL dán vào file `.env.local` của dự án.

## ☁️ Hướng Dẫn Triển Khai Lên Vercel

1. Đẩy mã nguồn lên GitHub.
2. Đăng nhập [Vercel](https://vercel.com/) và **Import** Repository GitHub.
3. Ở bước cấu hình dự án trên Vercel, mở mục **Environment Variables**, thêm biến:
   - Key: `GOOGLE_SCRIPT_URL`
   - Value: `[Link Web app URL của bạn]`
4. Nhấn **Deploy**.

## 📄 Giấy phép (License)
Dự án được xây dựng phục vụ mục đích tư vấn tuyển sinh đại học. Vui lòng không thương mại hóa mã nguồn nếu không có sự cho phép.

---
*Bản quyền nội dung thuộc về: **Chị Thái Bảo — Đại sứ Cham Toeic***
