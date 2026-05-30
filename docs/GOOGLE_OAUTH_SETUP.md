# Đăng nhập Google (OAuth)

## 1. Tạo OAuth Client ID

1. Vào https://console.cloud.google.com/
2. Tạo project (hoặc chọn project có sẵn).
3. **APIs & Services** → **OAuth consent screen** → External → điền tên app, email hỗ trợ → Save.
4. **Credentials** → **Create Credentials** → **OAuth client ID**.
5. Application type: **Web application**.
6. **Authorized JavaScript origins** (thêm đủ cả hai nếu hay đổi URL):
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
7. Application type phải là **Web application** (không dùng Android/iOS Client ID).
8. Tạo → copy **Client ID** (dạng `xxxxx.apps.googleusercontent.com`).

## 2. Cấu hình `.env`

**Backend** (`E-commerce_Server/.env`):

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

**Frontend** (`Project_Ecommerce/.env`):

```env
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Dùng **cùng một Client ID**.

## 3. Khởi động lại BE + FE

Đăng nhập / Đăng ký → bấm nút Google.

Tài khoản Google được tạo tự động, **không cần** mã OTP email.
