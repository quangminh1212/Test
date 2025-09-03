# Tìm kiếm tần suất từ với React + Node (SSE, streaming)

Ứng dụng giúp đếm số lần xuất hiện của một từ trong nhiều file văn bản rất lớn (mỗi file ~1GB), các từ được phân tách bởi dấu phẩy `,`.
- Frontend: React (UMD qua CDN, không cần build tool)
- Backend: Node.js thuần (http/fs), đọc file theo streaming; trả tiến độ qua Server-Sent Events (SSE) mỗi 5 giây
- Tối ưu: Không load toàn bộ file vào RAM; xử lý token biên giữa các chunk

## Tính năng
- Form gồm 1 ô nhập và 1 nút Search; tìm kiếm từ nhập trong tất cả file `F*.txt` trong thư mục `data/`
- Hiển thị kết quả tạm thời sau mỗi 5 giây cho đến khi hoàn tất
- Hủy tác vụ khi đóng tab

## Yêu cầu
- Windows 10+ (đã test), Node.js v18+ (đã test v20)

## Khởi chạy nhanh
Cách 1 (khuyên dùng):
1) Double-click `run.bat` (hoặc chạy trong terminal)
2) Mở trình duyệt: http://localhost:3000

Cách 2 (thủ công):
```
node server.js
```

Mặc định dùng cổng 3000. Có thể đổi cổng:
```
set PORT=4000 && run.bat
```

`run.bat` sẽ tự động kill tiến trình đang chiếm cổng trước khi chạy.

## Sinh dữ liệu mẫu lớn
Có 2 lựa chọn tiện dụng:

- generate.bat (có xác nhận, cho phép chỉ định bias):
```
# Mặc định: 10 file x 300MB, target=banana, bias=0.15
generate.bat

# Tuỳ chọn: 20 file x 500MB, target=apple, bias=0.2
generate.bat 20 500 apple 0.2
```

- generate-data.bat (tham số cơ bản):
```
# 3 file x 50MB, target=banana
generate-data.bat 3 50 banana
```

Hoặc gọi trực tiếp script Node:
```
node generate-data.js --files 5 --sizeMB 200 --target apple --bias 0.2
```
Các file được tạo vào thư mục `data/` với tên `F1.txt`, `F2.txt`, ...

Lưu ý: dữ liệu rất lớn (ví dụ 100×1024MB ≈ 100GB). Hãy đảm bảo còn đủ dung lượng ổ đĩa.

## Sử dụng
1) Mở http://localhost:3000
2) Nhập từ cần tìm (so khớp chính xác theo token trong file) → bấm Search
3) Theo dõi:
   - Trạng thái: running → done
   - Kết quả tạm thời mỗi 5 giây
   - Số tệp đã xử lý / tổng số

## Cấu trúc thư mục
```
.
├─ index.html          # UI React (UMD), lắng nghe SSE và cập nhật progress
├─ server.js           # Node server, SSE endpoint: /search-stream
├─ run.bat             # Khởi chạy server, auto-free cổng
├─ generate-data.js    # Script Node sinh dữ liệu lớn (comma-separated)
├─ generate.bat        # Sinh dữ liệu (mặc định 10×300MB) có confirm & bias
├─ generate-data.bat   # Sinh dữ liệu nhanh (3 tham số)
└─ data/               # Thư mục chứa F1.txt..F*.txt
```

## API
- GET `/search-stream?term=<từ>`
  - Trả về Stream (SSE)
  - Sự kiện:
    - `started`: `{ term, totalFiles }`
    - `progress` (mỗi 5 giây): `{ count, processedFiles, totalFiles }`
    - `done`: `{ count }`
    - `error`: `{ message }`

Ví dụ bằng curl:
```
curl -N "http://localhost:3000/search-stream?term=banana"
```

## Chi tiết triển khai
- Đọc file theo `fs.createReadStream()` (UTF-8), ghép `leftover` để tránh vỡ token giữa các chunk
- Token hóa theo dấu phẩy `,` và `trim()` mỗi token
- So khớp chính xác `token === term` (case-sensitive)
- Phát SSE `progress` theo chu kỳ 5 giây (cấu hình bằng hằng số trên server)
- Hủy xử lý khi client đóng kết nối (req 'close')

## Tùy chỉnh
- Đổi chu kỳ progress: sửa `PROGRESS_INTERVAL_MS` trong `server.js` (mặc định 5000ms)
- Đổi cổng: đặt biến môi trường `PORT`
- Không phân biệt hoa thường: có thể chuẩn hóa về lowercase ở cả token và term (chưa bật mặc định)

## Gợi ý kiểm thử
- Dùng dữ liệu nhỏ để sanity check (đã có ví dụ `F1.txt`, `F2.txt`, `F3.txt` có thể bị ghi đè khi sinh lớn)
- Kiểm thử E2E (tuỳ chọn): Playwright
  - Cần cài đặt: `npm init -y && npm i -D @playwright/test && npx playwright install`
  - Viết test mở trang, nhập từ, bấm Search, chờ `done`, assert count > 0
  - Lưu ý: đừng chạy test với bộ dữ liệu quá lớn nếu không cần, để tránh tốn thời gian CI

## Giới hạn & lưu ý
- So khớp chính xác theo token, không tách theo từ (word boundary)
- Case-sensitive (có thể bật tùy chọn nếu cần)
- Streaming theo thứ tự tệp; có thể mở rộng xử lý song song nếu I/O/CPU cho phép

## Bản quyền
- Mã nguồn mẫu dùng nội bộ để minh hoạ kỹ thuật xử lý file lớn với streaming và SSE.

