## 📝 Changelog / 変更履歴 / Thay đổi

### English (en)

- Added IPC handlers for coding rules management in the main process.
- Created a new store to manage coding rules.
- Implemented dialogs for adding and editing coding rules.
- Integrated coding rules with OpenAI message handling.
- Updated the settings dialog to support coding rules management.
- Refactored webhook management to allow updates and deletions.
- Enhanced the main page to apply selected coding rules during checks.
- Removed the unused `AddNewWebhookDialog` component.

---

### Japanese (ja)

- コーディングルール管理のために、メインプロセスに IPC ハンドラーを追加しました。
- コーディングルールを管理するための新しいストアを作成しました。
- コーディングルール追加・編集用のダイアログを実装しました。
- OpenAI メッセージ処理にコーディングルールを統合しました。
- 設定ダイアログを更新し、コーディングルールの管理をサポートしました。
- Webhook 管理をリファクタリングし、更新と削除をサポートしました。
- メインページを強化し、チェック時に選択されたコーディングルールを利用できるようにしました。
- 未使用の `AddNewWebhookDialog` コンポーネントを削除しました。

---

### Vietnamese (vi)

- Thêm các handler IPC cho quản lý quy tắc kiểm tra code ở main process.
- Tạo store mới để quản lý các quy tắc coding.
- Triển khai dialog cho thao tác thêm/sửa quy tắc coding.
- Tích hợp các quy tắc coding vào xử lý message của OpenAI.
- Cập nhật dialog cài đặt để hỗ trợ quản lý quy tắc coding.
- Refactor phần quản lý webhook để hỗ trợ cập nhật và xóa.
- Nâng cấp trang chính để áp dụng quy tắc kiểm tra code được chọn trong quá trình kiểm tra.
- Xóa component `AddNewWebhookDialog` không còn sử dụng.
