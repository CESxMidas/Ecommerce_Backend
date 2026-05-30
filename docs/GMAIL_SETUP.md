# Cấu hình Gmail cá nhân (đồ án)

## Bước 1: Bật xác minh 2 bước

1. Vào https://myaccount.google.com/security
2. Bật **Xác minh 2 bước** cho tài khoản Gmail.

## Bước 2: Tạo App Password

1. Vào https://myaccount.google.com/apppasswords
2. Chọn app: **Mail**, thiết bị: **Other** (đặt tên ví dụ `Ecommerce Do An`).
3. Google tạo mật khẩu 16 ký tự (dạng `abcd efgh ijkl mnop`).

## Bước 3: Thêm vào file `.env` (thư mục `E-commerce_Server`)

```env
GMAIL_USER=email.cua.ban@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

- `GMAIL_USER`: đúng địa chỉ Gmail của bạn.
- `GMAIL_APP_PASSWORD`: dán App Password (có thể bỏ dấu cách).

## Bước 4: Khởi động lại server

```powershell
npm run dev
```

Đăng ký lại → kiểm tra **Hộp thư đến** và **Spam** của Gmail đã đăng ký.

Nếu chưa cấu hình `.env`, mã vẫn hiện trên trang verify (chế độ dev).
