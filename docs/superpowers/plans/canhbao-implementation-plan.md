# KẾ HOẠCH TRIỂN KHAI CHI TIẾT (BITE-SIZED TDD IMPLEMENTATION PLAN)
## DỰ ÁN: HỆ THỐNG CẢNH BÁO SỚM CHÁY RỪNG VÀ GIÁM SÁT THỦY VĂN XÃ EA SÚP
- **Tài liệu tham chiếu đặc tả**: `docs/superpowers/specs/canhbao-easupso-spec.md`
- **Mỏ neo quy chuẩn**: `AGENTS.md`
- **Tên miền**: `https://canhbao.easupso.com`
- **Tiêu chuẩn thực thi**: TDD (Test-Driven Development), Bite-sized Tasks (2 - 5 phút/task), Không code nghiệp vụ khi chưa có test fail.

---

## TỔNG QUAN CÁC GÓI CÔNG VIỆC (TASK BREAKDOWN)

| Mã Task | Tên Phân hệ | Mục tiêu chính | Thời lượng ước tính |
|---|---|---|---|
| **DB-1** | Geo Data & Boundaries | Bộ dữ liệu GeoJSON 20 thôn buôn, Tiểu khu 277, Hồ Thượng, Hồ Hạ, Sông Ea Súp, 4 xã vùng đệm | 3 phút |
| **DB-2** | Spatial Query & Buffer Engine | Module Turf.js kiểm tra điểm tọa độ thuộc thôn/buôn nào, tính toán bán kính đệm 5km liên xã | 4 phút |
| **SAT-1** | NASA FIRMS Raw Ingestion | Bộ nạp & chuẩn hóa dữ liệu vệ tinh VIIRS 375m & MODIS từ API/Mock CSV sang JSON | 3 phút |
| **SAT-2** | Multi-tier FIRMS Filtering | Động cơ lọc đa tầng (Confidence >= Nominal, FRP >= 5MW, gán cờ vùng đệm 5km) | 4 phút |
| **IOT-1** | Forest IoT Telemetry Engine | Bộ xử lý dữ liệu trạm quan trắc Tiểu khu 277 (Nhiệt độ > 55°C, Khói MQ-2, Ẩm độ) | 3 phút |
| **IOT-2** | Hydro IoT & Hồ Hạ Guard | Động cơ 3 Cấp Thủy văn (Hồ Thượng, Sông Ea Súp, Hồ cá Đoàn Kết) & Bất biến Cấm nuôi cá Hồ Hạ | 4 phút |
| **TTS-1** | AI Voice Broadcast Scripting | Trình sinh nội dung phát thanh cứu hộ khẩn cấp tự động theo thôn buôn và cấp độ | 3 phút |
| **TTS-2** | Audio Siren & Web Audio Synth | Bộ phát âm thanh còi hú báo động PCTT đa âm tần số (Web Audio API) | 3 phút |
| **UI-1** | Dark Command Center Base | Khung giao diện trung tâm chỉ huy Dark Mode, Slate Theme, Glassmorphism & Header | 4 phút |
| **UI-2** | Leaflet WebGIS Canvas | Bản đồ GIS tương tác đa lớp (Ranh giới 20 thôn buôn, Lớp nhiệt FIRMS, Trạm thủy văn) | 5 phút |
| **UI-3** | Alert Console & Simulation Mode | Bảng điều khiển cảnh báo phân cấp 3 màu, nút kích hoạt diễn tập xả lũ & cháy rừng | 4 phút |
| **UI-4** | PWA Offline-First & Service Worker | Cấu hình Web App Manifest, Service Worker cache bản đồ và danh bạ hỗ trợ vùng sóng yếu | 3 phút |
| **SEC-1** | Alert Verification & Rate Limiting | Kiểm tra hợp lệ dữ liệu IoT, chống spam telemetry, ghi nhật ký chỉ huy PCTT | 3 phút |

---

## CHI TIẾT TỪNG TASK THỰC THI (TDD SPECIFICATION)

### [DB-1] Xây dựng Bộ Dữ liệu Địa không gian (GeoJSON 20 Thôn Buôn & Thủy Hệ)
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/data/easup_geojson.js`
- **File kiểm thử**: `tests/unit/db_geo.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('phải chứa đầy đủ chính xác 20 thôn buôn xã Ea Súp')`: Kiểm tra thuộc tính `features` có đủ Thôn 1 đến 13, Thắng Lợi, Đoàn Kết, Hòa Bình, Bình Lợi, Buôn A, Buôn B, Buôn C.
  - `test('phải định nghĩa vùng Tiểu khu 277 với loại FOREST_ZONE')`.
  - `test('phải định nghĩa Hồ Ea Súp Hạ có cờ strict_aquaculture_prohibited = true')`.
  - `test('phải định nghĩa Hồ Ea Súp Thượng, Hồ cá Đoàn Kết, Sông Ea Súp')`.
  - `test('phải chứa ranh giới vùng đệm 4 xã Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/db_geo.test.js`

---

### [DB-2] Xây dựng Module Phân tích Không gian & Vùng đệm 5km (Spatial Engine)
- **Thời lượng**: 4 phút.
- **File triển khai**: `src/services/spatial_engine.js`
- **File kiểm thử**: `tests/unit/spatial_engine.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('locatePointInEaSup(lat, lng) trả về chính xác tên thôn/buôn hoặc tiểu khu')`.
  - `test('isWithinBuffer5km(lat, lng) trả về true khi điểm nằm trong bán kính 5km giáp Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê')`.
  - `test('isWithinBuffer5km(lat, lng) trả về false khi tọa độ nằm ngoài vùng đệm')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/spatial_engine.test.js`

---

### [SAT-1] Module Thu nạp Dữ liệu Vệ tinh NASA FIRMS
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/services/firms_ingestion.js`
- **File kiểm thử**: `tests/unit/firms_ingestion.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('parseFirmsCsvOrJson() chuyển đổi dữ liệu thô VIIRS/MODIS sang danh sách Hotspot chuẩn hóa')`.
  - `test('parseFirmsCsvOrJson() ném lỗi hoặc bỏ qua các dòng thiếu trường tọa độ/FRP/confidence')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/firms_ingestion.test.js`

---

### [SAT-2] Động cơ Lọc Điểm Cháy Đa Tầng (Multi-tier FIRMS Filter)
- **Thời lượng**: 4 phút.
- **File triển khai**: `src/services/firms_filter.js`
- **File kiểm thử**: `tests/unit/firms_filter.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('bỏ qua điểm FIRMS có confidence = low và FRP < 5.0')`.
  - `test('giữ lại điểm FIRMS có confidence in [nominal, high] VÀ FRP >= 5.0')`.
  - `test('gán cờ CROSS_BORDER_BUFFER nếu điểm cháy nằm trong 4 xã lân cận Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê')`.
  - `test('kích hoạt trạng thái cảnh báo MỨC CAM khi điểm nhiệt nằm trong ranh giới 20 thôn buôn hoặc Tiểu khu 277')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/firms_filter.test.js`

---

### [IOT-1] Động cơ Thu nạp & Cảnh báo Cháy Rừng Trạm IoT Tiểu khu 277
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/services/iot_forest.js`
- **File kiểm thử**: `tests/unit/iot_forest.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('processForestTelemetry() phát hiện nhiệt độ > 55°C -> Kích hoạt BÁO ĐỘNG ĐỎ Tiểu khu 277')`.
  - `test('processForestTelemetry() phát hiện khói MQ-2 vượt ngưỡng -> Kích hoạt Báo động khói')`.
  - `test('kết hợp điểm nhiệt FIRMS + IoT vượt ngưỡng -> Kích hoạt BÁO ĐỘNG ĐỎ TỐI CẤP')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/iot_forest.test.js`

---

### [IOT-2] Động cơ 3 Cấp Thủy văn & Bất biến Bảo vệ Nguồn nước Hồ Ea Súp Hạ
- **Thời lượng**: 4 phút.
- **File triển khai**: `src/services/iot_hydro.js`
- **File kiểm thử**: `tests/unit/iot_hydro.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('Hồ Ea Súp Thượng > 80% dung tích -> Phát cảnh báo CẤP 1 (Vàng)')`.
  - `test('Hồ Ea Súp Thượng > 92% dung tích -> Phát cảnh báo CẤP 2 (Cam)')`.
  - `test('Hồ Ea Súp Thượng xả tràn tự do / mực nước > 210.0m -> Phát cảnh báo CẤP 3 (Đỏ) hạ lưu và Hồ cá Thôn Đoàn Kết')`.
  - `test('Hồ Ea Súp Hạ cạn kiệt < 30% -> Cảnh báo hạn hán nguồn nước sinh hoạt')`.
  - `test('BẤT BIẾN: Phát hiện hoạt động nuôi cá tại Hồ Ea Súp Hạ -> Kích hoạt ngay VIOLATION_AQUACULTURE_DETECTED cấm nuôi cá')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/iot_hydro.test.js`

---

### [TTS-1] Trình Sinh Bản Tin Phát Thanh Cứu Hộ Tự Động (AI TTS Broadcast Script)
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/services/tts_dispatcher.js`
- **File kiểm thử**: `tests/unit/tts_dispatcher.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('generateAlertScript() tạo chuẩn nội dung tiếng Việt có tên thôn/buôn cụ thể, cấp độ báo động')`.
  - `test('generateAlertScript() hỗ trợ mẫu thông điệp ngắn gọn cho Buôn A, Buôn B, Buôn C')`.
  - `test('generateAlertScript() tạo thông điệp khẩn cấp khi Hồ Hạ bị đe dọa ô nhiễm hoặc Hồ Thượng xả lũ')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/tts_dispatcher.test.js`

---

### [TTS-2] Bộ Tạo Còi Hú Cảnh Báo PCTT (Audio Siren Web Audio Synthesizer)
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/audio/siren_synth.js`
- **File kiểm thử**: `tests/unit/siren_synth.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('khởi tạo AudioContext và tạo dao động tần số kép (Dual-frequency wail: 440Hz -> 880Hz)')`.
  - `test('hỗ trợ các chế độ âm thanh: CẢNH BÁO NHẸ (Chirp), BÁO ĐỘNG LŨ (Continuous Wail), BÁO CHÁY KHẨN CẤP (Fast Pulsing)')`.
  - `test('hàm stopSiren() dừng phát âm thanh an toàn không gây leak bộ nhớ')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/siren_synth.test.js`

---

### [UI-1] Xây dựng Khung Giao diện Trung tâm Chỉ huy (Dark Command Center)
- **Thời lượng**: 4 phút.
- **File triển khai**: `index.html`, `src/styles/command_center.css`, `src/ui/header.js`
- **File kiểm thử**: `tests/unit/ui_render.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('renderHeader() hiển thị đúng tiêu đề xã Ea Súp, đồng hồ thời gian thực và 3 widget thống kê (Cháy, Lũ, Hồ Hạ)')`.
  - `test('chứa các nút chuyển đổi chế độ xem: Bản đồ, Danh sách Cảnh báo, Diễn tập PCTT')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/ui_render.test.js`

---

### [UI-2] Tích hợp Bản đồ Tương tác Không gian WebGIS Leaflet
- **Thời lượng**: 5 phút.
- **File triển khai**: `src/ui/map_gis.js`
- **File kiểm thử**: `tests/unit/map_gis.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('initMap() khởi tạo Leaflet map căn giữa tọa độ trung tâm xã Ea Súp (13.23°N, 107.88°E)')`.
  - `test('renderBoundaries() vẽ đúng 20 polygon thôn buôn và viền đệm 5km')`.
  - `test('renderHotspots() tạo marker điểm lửa FIRMS kèm tooltip thông số FRP và độ tin cậy')`.
  - `test('renderHydroStations() hiển thị phao Hồ Thượng, Hồ Hạ (với biểu tượng cấm nuôi cá) và Sông Ea Súp')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/map_gis.test.js`

---

### [UI-3] Bảng Điều khiển Cảnh báo & Mô-đun Diễn tập Tình huống PCTT (Simulation)
- **Thời lượng**: 4 phút.
- **File triển khai**: `src/ui/alert_console.js`, `src/services/simulation_runner.js`
- **File kiểm thử**: `tests/unit/simulation.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('triggerSimulation("FIRE_TK277") mô phỏng chuỗi sự kiện cháy rừng tại Tiểu khu 277 và kích hoạt thông báo Đỏ')`.
  - `test('triggerSimulation("FLOOD_EASUP_THUONG") mô phỏng lũ tràn hồ Thượng và cảnh báo ngập hồ cá Đoàn Kết')`.
  - `test('triggerSimulation("HOHA_POLLUTION_VIOLATION") mô phỏng phát hiện vi phạm lồng bè nuôi cá tại Hồ Hạ')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/simulation.test.js`

---

### [UI-4] Hỗ trợ PWA Offline-First & Service Worker
- **Thời lượng**: 3 phút.
- **File triển khai**: `public/manifest.json`, `public/sw.js`, `src/pwa/register_sw.js`
- **File kiểm thử**: `tests/unit/pwa.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('manifest.json hợp lệ với scope /, start_url, theme_color và icon')`.
  - `test('sw.js cache danh sách tài nguyên tĩnh chính và GeoJSON 20 thôn buôn')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/pwa.test.js`

---

### [SEC-1] Kiểm soát Dữ liệu Đầu vào & Nhật ký Vận hành Chỉ huy
- **Thời lượng**: 3 phút.
- **File triển khai**: `src/security/validator.js`, `src/services/audit_logger.js`
- **File kiểm thử**: `tests/unit/security_audit.test.js`
- **Cấu trúc kiểm thử TDD**:
  - `test('validateTelemetryPayload() từ chối các gói tin IoT có giá trị ngoại lai bất thường (Nhiệt độ > 150°C hoặc âm vô lý)')`.
  - `test('logCommandAction() ghi lại lịch sử các thao tác phát lệnh phát thanh, xác nhận cảnh báo của cán bộ chỉ huy')`.
- **Lệnh kiểm tra**: `npx vitest run tests/unit/security_audit.test.js`
