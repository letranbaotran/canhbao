# AGENTS.md - Mỏ neo Ngữ cảnh & Hồ sơ Nghiệm thu Dự án

## 1. TỔNG QUAN HỆ THỐNG & ĐỊA BÀN BẤT BIẾN
- **Tên dự án**: Hệ thống Tích hợp Ảnh vệ tinh NASA FIRMS và Cảm biến IoT Cảnh báo sớm Cháy rừng, Giám sát Mặt phủ Đất lâm nghiệp; Theo dõi Mực nước Hồ Ea Súp Thượng, Hồ Ea Súp Hạ, Sông Ea Súp, Cảnh báo Khô hạn, Lũ lụt.
- **Tên miền sản xuất**: `https://canhbao.easupso.com` (Hệ sinh thái Chuyển đổi số xã Ea Súp, tỉnh Đắk Lắk).
- **Cơ quan đồng chủ trì**: Ủy ban nhân dân và Ủy ban MTTQ Việt Nam xã Ea Súp (vận hành theo mô hình chính quyền 2 cấp: cấp xã trực thuộc tỉnh, không còn cấp huyện).
- **Phạm vi địa lý trọng điểm**:
  - **20 thôn, buôn trực thuộc xã Ea Súp**: Thôn 1, Thôn 2, Thôn 3, Thôn 4, Thôn 5, Thôn 6, Thôn 7, Thôn 8, Thôn 9, Thôn 10, Thôn 11, Thôn 12, Thôn 13, Thôn Thắng Lợi, Thôn Đoàn Kết, Thôn Hòa Bình, Thôn Bình Lợi, Buôn A, Buôn B, Buôn C.
  - **Khu vực rừng trọng điểm**: Lâm phần Tiểu khu 293 (tọa độ: 12.982216, 107.886961 - vùng rừng khộp dễ cháy mùa khô giáp ranh nương rẫy).
  - **Thủy hệ trọng điểm**:
    - Hồ Ea Súp Thượng (tọa độ: 13.043116, 107.937218): Công trình đại thủy nông dung tích 146 triệu m³, đập chính và tràn xả lũ tự do.
    - Hồ Ea Súp Hạ (tọa độ: 13.056850, 107.894562): Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt - **QUY TẮC BẤT BIẾN: TUYỆT ĐỐI CẤM NUÔI TRỒNG THỦY SẢN LỒNG BÈ**.
    - Hồ Trung Chuyển (tọa độ: 13.069298, 107.881527 - Thôn Đoàn Kết): Khu vực hồ trung chuyển điều tiết nước và nuôi thủy sản, có cảm biến IoT giám sát Oxy hòa tan DO, pH và cảnh báo ngập bờ.
    - Tuyến sông & kênh: Toàn tuyến Sông Ea Súp, Kênh chính Đông, Kênh chính Tây.
  - **Vùng đệm sinh thái liên xã (bán kính 5km)**: Xã Ea Bung, Xã Ea Rốk, Xã Ia Lốp, Xã Ia Rvê.

---

## 2. KẾT QUẢ NGHIỆM THU THỰC TẾ (100% PASS - EXIT CODE = 0)

### 2.1. Bảng Tổng Hợp Kiểm Thử Đơn Vị (Vitest - `npm test`)
- **Trạng thái**: PASS (100% GREEN)
- **Mã thoát (Exit Code)**: `0`
- **Thời lượng thực thi**: `2.52s`

| STT | Test Suite | Số test | Kết quả | Trọng tâm kiểm thử |
|---|---|---|---|---|
| 1 | `tests/unit/hydro_levels.test.ts` | 5/5 | **PASS** | Phân loại Báo động I/II/III Hồ Thượng, cảnh báo lũ dâng >30cm/h, cấm nuôi cá Hồ Hạ |
| 2 | `tests/unit/forest_fire_detection.test.ts` | 3/3 | **PASS** | Bounding box Ea Súp, lọc đa tầng FIRMS (FRP >= 5MW), trạm IoT TK 277 <30s |
| 3 | `tests/unit/abac_auth.test.ts` | 5/5 | **PASS** | Ma trận 5 tầng Zero-Trust (Public, Trưởng thôn, Xã lân cận, Chuyên trách, Chỉ huy) |
| 4 | `tests/unit/geo_boundaries.test.ts` | 4/4 | **PASS** | Kiểm chứng 20 thôn buôn, 4 xã biên giới, bất biến cấm lồng bè Hồ Hạ |
| 5 | `tests/unit/seed_verification.test.ts` | 5/5 | **PASS** | Dữ liệu khởi tạo Seed Data nạp đủ 20 thôn buôn, 4 xã lân cận, 4 trạm thủy văn |
| 6 | `tests/unit/tts_normalizer.test.ts` | 5/5 | **PASS** | Bung từ viết tắt UBMTTQ, UBND, PCTT & TKCN, TK 277, chuyển ngày tiếng Việt, băm SHA-256 |
| 7 | `tests/unit/iot_security.test.ts` | 4/4 | **PASS** | Xác thực chữ ký HMAC-SHA256, chống sửa đổi gói tin, chống Replay attack 5 phút |
| 8 | `tests/unit/delta_ndvi.test.ts` | 3/3 | **PASS** | Tính Delta-NDVI, cảnh báo mất rừng diện tích >= 500m² và lọc nhiễu bóng mây |
| 9 | `tests/unit/land_measurement.test.ts` | 3/3 | **PASS** | Đo diện tích Geodesic (m², Sào Tây Nguyên 1.000m², Ha), lọc nhiễu GPS <12m / >=2.5m, xuất GeoJSON/KML |
| 10 | `tests/unit/hydro_piecewise_interpolation.test.ts` | 5/5 | **PASS** | Đồng bộ 11 mốc thực tế Chi nhánh Thủy lợi, nội suy 2 chiều Z <-> Q, an toàn Q < 100 m³/s, cấm lồng bè Hồ Hạ |
| **Tổng** | **10 Test Suites** | **42/42** | **100% PASS** | **Hoàn thành toàn diện mọi quy chuẩn TDD** |

### 2.2. Bảng Tổng Hợp Đóng Gói Sản Xuất (Next.js 15 - `npm run build`)
- **Trạng thái**: Compiled successfully in 1.83s
- **Mã thoát (Exit Code)**: `0`
- **Cấu hình**: Standalone output cho Docker container
- **Tối ưu hóa**: Toàn bộ Route tĩnh (Static) & API động (Dynamic) đạt chuẩn không cảnh báo:
  - `○ /` (Static Command Center): `541 kB` (First load: `643 kB`)
  - `ƒ /api/auth/users` (Dynamic API): `135 B`
  - `ƒ /api/iot/telemetry` (Dynamic API): `135 B`
  - `ƒ /api/tts/generate` (Dynamic API): `135 B`
  - `ƒ /api/kml/layers` (Dynamic API): `135 B`
  - `ƒ /api/villages/coordinates` (Dynamic API): `135 B`

---

## 3. CẤU TRÚC API & ĐẶC TẢ GIAO DIỆN KẾT NỐI

### 3.1. Cổng Thu Nhận Telemetry Cảm Biến IoT
- **Endpoint**: `POST /api/iot/telemetry`
- **Xác thực An ninh**: Header `X-IoT-Signature` chứa mã băm HMAC-SHA256.
- **Chống Replay**: Kiểm tra độ lệch thời gian `timestamp` không vượt quá 300 giây (5 phút).
- **Quy tắc Kích hoạt Tự động**:
  - Lâm nghiệp (Tiểu khu 277): Nhiệt độ `> 45°C` hoặc khói `> 50 ppm` ➔ Kích hoạt Báo động đỏ < 30 giây, đẩy tin khẩn cấp Telegram.
  - Thủy văn: Tốc độ nước dâng `> 30 cm/h` HOẶC Hồ Thượng `>= 210.0m` ➔ Báo động Cấp 3, tự động xuất danh sách thôn buôn sơ tán.

### 3.2. Cổng Sinh Phát Thanh Truyền Thanh Số AI
- **Endpoint**: `POST /api/tts/generate`
- **Cơ chế**: Render-Once & Lưu trữ vĩnh viễn trên VPS tại `/public/storage/tts/{bulletin_id}.mp3`.
- **Giọng đọc**: 'An Nhiên' (Vbee AI) kèm cơ chế Fallback Edge-TTS (`vi-VN-HoaiMyNeural`).
- **Từ điển Hành chính**: Bung toàn bộ `UBND` ➔ Ủy ban nhân dân, `UBMTTQ` ➔ Ủy ban Mặt trận Tổ quốc, `TK 277` ➔ Tiểu khu 277.

---

## 4. MA TRẬN PHÂN QUYỀN 5 TẦNG ZERO-TRUST (ABAC + RBAC)

| Tầng | Vai trò | Phạm vi Quyền hạn | Cơ chế Cách ly Dữ liệu |
|---|---|---|---|
| **Tầng 1** | `PUBLIC` | Xem bản đồ cảnh báo công khai, nghe loa AI An Nhiên, gửi phản ánh SOS | Bị chặn toàn bộ dữ liệu nội bộ điều tra và danh bạ |
| **Tầng 2** | `VILLAGE_LEADER` | Quản lý hộ dân và xác minh hiện trường trong đúng thôn buôn của mình | Cách ly theo `villageCode` (không xem thôn khác) |
| **Tầng 3** | `NEIGHBOR_COMMUNE` | Xem bản đồ radar liên xã (Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê) | Cách ly hoàn toàn hồ sơ dân cư xã Ea Súp |
| **Tầng 4** | `SPECIALIST_FORCE` | Kiểm lâm, Quân sự, Công an, Thủy nông xã điều tra Tiểu khu 277 | Truy cập cấu hình ngưỡng IoT và hồ sơ vi phạm |
| **Tầng 5** | `EXECUTIVE_COMMAND` | Lãnh đạo Đảng ủy, HĐND, UBND, UBMTTQ xã Ea Súp | Toàn quyền phát lệnh xả lũ, báo cháy và khóa sổ báo cáo |

---

## 5. HƯỚNG DẪN VẬN HÀNH HỆ THỐNG SẢN XUẤT

### 5.1. Khởi chạy Cụm Dịch vụ Docker Compose
Đóng gói hoàn chỉnh 5 container đồng bộ trong file `docker-compose.yml`:
```bash
# 1. Khởi động toàn bộ cụm dịch vụ nền
docker compose up -d

# 2. Kiểm tra trạng thái 5 dịch vụ (web, db postgis, redis, mosquitto, nginx)
docker compose ps

# 3. Nạp dữ liệu khởi tạo địa giới 20 thôn buôn và 4 trạm trọng điểm
docker compose exec web npx prisma db push
docker compose exec web npx ts-node prisma/seed.ts
```

### 5.2. Chế độ Ngoại tuyến PWA Phục vụ Tuần tra Rừng
- Service Worker `public/sw.js` tự động lưu đệm lớp bản đồ vector và ranh giới Tiểu khu 277.
- Lực lượng Kiểm lâm và Dân quân khi tuần tra vào rừng sâu giáp ranh vùng mất sóng 4G vẫn định vị được tọa độ GPS và xem ranh giới tiểu khu.

### 5.3. Phân hệ Công cụ Đo Diện Tích Đất & Khoanh Ranh Thửa Thực Địa (`LandMeasureFloatingCard`)
- **Vị trí kích hoạt**: Nút tròn nổi **"Đo Đất"** (biểu tượng thước đo) nằm ngay cạnh nút **"Kiểm tra vị trí của tôi"** ở góc dưới bên trái bản đồ vệ tinh.
- **2 Chế độ đo đạc chuyên dụng**:
  1. **Chấm điểm trên bản đồ vệ tinh (Thủ công)**: Tích hợp `@geoman-io/leaflet-geoman-free` (`snappable: true, snapDistance: 20`), hỗ trợ kéo sửa đỉnh trực tiếp và 4 thao tác: *Hoàn tác 1 điểm*, *Đóng ranh thửa*, *Xóa đo lại*, *Lưu thửa đất*.
  2. **Đi bộ đo bằng GPS (Thực địa)**: Sử dụng `navigator.geolocation.watchPosition` (`enableHighAccuracy: true, maximumAge: 1000, timeout: 5000`) với bộ lọc khử nhiễu chỉ nhận tín hiệu `accuracy < 12m` và tự động chấm đỉnh mới khi di chuyển `>= 2.5m`.
- **Quy đổi đơn vị chuẩn Đắk Lắk & Tây Nguyên (`@turf/area`, `@turf/length`)**:
  - Hiển thị song song: **Mét vuông (`m²`)**, **Sào Tây Nguyên (`1 Sào = 1.000 m²`)**, **Hecta (`1 Ha = 10.000 m²`)**, và **Chu vi bờ rào (`m`)**.
- **Tiện ích xuất dữ liệu & Bảo vệ tài nguyên**:
  - Đặt tên thửa đất/vườn cây, chụp ảnh kết quả `.png` qua `html2canvas`, xuất file `.geojson` / `.kml`, và gửi phản ánh ranh đất sang Cổng ý kiến cử tri `https://ykien.easupso.com`.
  - Tự động gọi `clearWatch` GPS và `map.pm.disableDraw()` khi đóng công cụ; khóa cứng cổng nội bộ Docker Compose `127.0.0.1:8066:3000`.

### 5.4. Đồng bộ Thủy văn Thực tế Chi nhánh Ea Súp & Mô hình Thủy lực 2D MIKE FLOOD
- **Thông số vận hành chuẩn mực (Quyết định 1694/QĐ-UBND, TB 130, 131, 135/TB-TL & BC 1775/BC-CTTL)**:
  - **Hồ Ea Súp Thượng**: Cao trình mặc định $Z = 216.30\text{ m}$, Lưu lượng xả $Q = 45\text{ m}^3\text{/s}$ (mở 01 cửa tràn điều tiết), Dung tích $W = 120.5 / 146.9\text{ triệu m}^3$, Tốc độ dâng $+2\text{ cm/h}$.
  - **Hồ Ea Súp Hạ**: Cao trình mặc định $Z = 196.35\text{ m}$, Lưu lượng xả $Q = 15\text{ m}^3\text{/s}$, Dung tích $W = 8.85 / 9.25\text{ triệu m}^3$ ($95.7\%$), Độ đục $4.3\text{ NTU}$, Lồng bè vi phạm $0$.
  - **4 Nút mốc Đồng bộ Loa AI trên Bảng 1**:
    1. `216.30m (45 m³/s)` — Trạng thái An toàn (Dưới Báo động I).
    2. `217.54m (100 m³/s)` — Bắt đầu Cảnh báo Cấp 1 (Báo động I - theo TB 135/TB-TL).
    3. `217.85m (600 m³/s)` — Xả lũ khẩn cấp Cấp 3 (Báo động III - mở 03 cửa tràn theo BC 1775/BC-CTTL).
    4. `218.62m (792 m³/s)` — Lưu lượng xả thiết kế tràn cửa van P=1% (theo TB 131/TB-TL).
- **Thuật toán Nội suy Tuyến tính Từng đoạn 2 chiều ($Z \leftrightarrow Q \leftrightarrow W$) qua 11 điểm mốc**:
  - $Q < 100\text{ m}^3\text{/s}$: Nút trạng thái `TẮT CẢNH BÁO` (xanh/xám), MBL Ea Súp $< 185.00\text{ m}$, 5 mức ngập đều $0\text{ ha}$ ($0.0\%$), Dân cư $0$ hộ, Giao thông $0\text{ km}$.
  - $Q \ge 100\text{ m}^3\text{/s}$: Nút chuyển sang `ĐANG CẢNH BÁO TRỰC CHIẾN` (Vàng $\rightarrow$ Cam $\rightarrow$ Đỏ), kích hoạt giọng đọc AI An Nhiên và biểu đồ 5 mức ngập nội suy tương thích MIKE FLOOD 4 cấp độ.
