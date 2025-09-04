Database Giải pháp cho Flash Sale đơn giản

 Vấn đề: Web bị sập khi nhiều người mua cùng lúc

 Giải pháp cơ bản:

 1. Chia tải (Load Balancer)
- Nginx: Chia request cho nhiều server
- Mục đích: 1 server chết, còn server khác chạy

 2. Lưu tạm (Cache) 
- Redis: Lưu tạm thông tin sản phẩm
- CDN: Lưu hình ảnh, CSS, JS
- Mục đích: Giảm gánh nặng cho server chính

 3. Hàng đợi (Queue)
- RabbitMQ: Xếp hàng xử lý đơn hàng
- Mục đích: Xử lý từng đơn một, không bị loạn

 4. Database
- MySQL: Database chính
- Redis: Lưu tạm dữ liệu nhanh
- Mục đích: Đọc/ghi nhanh hơn

 5. Giám sát (Monitoring)
- Grafana: Xem biểu đồ server
- Mục đích: Biết khi nào hệ thống có vấn đề

 6. Kỹ thuật bảo vệ
- Rate Limit: Giới hạn 1 người chỉ được gửi 10 request/giây
- Captcha: Chặn bot spam
- Queue: Ai đến trước mua trước
