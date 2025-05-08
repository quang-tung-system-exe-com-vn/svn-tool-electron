## 📝 Changelog / 変更履歴 / Thay đổi

### English (en)

- Added layout toggle button to `ShowlogToolbar` for switching between horizontal and vertical layouts.
- Updated `SpotBugs` component to manage panel sizes using `localStorage`, enabling persistent panel size across sessions.
- Integrated `OverlayLoader` in `SpotBugs` for improved loading experience during data fetching.
- Modified `SpotbugsAIChat` to save AI responses for selected source lines, enhancing context retention.
- Updated `SpotbugsToolbar` to disable refresh button while loading is in progress.
- Enhanced configuration store with mail and Microsoft Teams notification settings.
- Improved logging in `useHistoryStore` for better tracking and debugging of history actions.

---

### Japanese (ja)

- `ShowlogToolbar` にレイアウト切り替えボタンを追加し、横向きと縦向きのレイアウトを切り替え可能にしました。
- `SpotBugs` コンポーネントでパネルサイズを `localStorage` に保存するようにし、セッション間でサイズを保持できるようにしました。
- データ取得中の読み込み体験を向上させるため、`SpotBugs` に `OverlayLoader` を統合しました。
- `SpotbugsAIChat` を変更し、選択されたソース行に対して AI の応答を保存し、コンテキストを保持できるようにしました。
- 読み込み中にリフレッシュボタンを無効にするよう `SpotbugsToolbar` を更新しました。
- 設定ストアにメールと Microsoft Teams 通知設定を追加しました。
- `useHistoryStore` のログ出力を改善し、履歴操作の追跡とデバッグがしやすくなりました。

---

### Vietnamese (vi)

- Thêm nút chuyển đổi bố cục vào `ShowlogToolbar` để chuyển giữa bố cục ngang và dọc.
- Cập nhật component `SpotBugs` để lưu kích thước panel bằng `localStorage`, cho phép giữ nguyên kích thước qua các phiên làm việc.
- Tích hợp `OverlayLoader` trong `SpotBugs` nhằm cải thiện trải nghiệm khi đang tải dữ liệu.
- Sửa đổi `SpotbugsAIChat` để lưu phản hồi AI theo từng dòng mã được chọn, giúp giữ ngữ cảnh tốt hơn.
- Cập nhật `SpotbugsToolbar` để vô hiệu hóa nút làm mới khi đang tải.
- Nâng cấp kho cấu hình để bao gồm thiết lập thông báo qua email và Microsoft Teams.
- Cải thiện ghi log trong `useHistoryStore` nhằm hỗ trợ theo dõi và debug các thao tác lịch sử hiệu quả hơn.
