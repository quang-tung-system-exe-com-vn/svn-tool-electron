## feat: unify button variants, add UpdateDialog modal

This commit introduces several improvements for UI consistency and feature enhancement:

```
♻️ Refactored all dialogs and key components to use a unified button variant, driven by the user's appearance settings via `useButtonVariant`. This ensures a consistent look and feel across dialogs such as AddNewWebhookDialog, CleanDialog, NewRevisionDialog, SettingsDialog, SupportFeedbackDialog, and pages like DataTable and more.

✨ Added a new `UpdateDialog` modal to handle application updates gracefully, providing a better UX around version checking and upgrade prompts.

🧹 Minor code cleanup and structure improvements to simplify props management in affected dialogs and components.
```

---

## feat: ボタンのバリアントを統一し、UpdateDialog モーダルを追加

このコミットは、UI の一貫性と機能強化のためにいくつかの改善を導入します：

```
♻️ すべてのダイアログと主要コンポーネントを、`useButtonVariant` を介してユーザーの外観設定に基づいた統一されたボタンバリアントを使用するようにリファクタリングしました。これにより、AddNewWebhookDialog、CleanDialog、NewRevisionDialog、SettingsDialog、SupportFeedbackDialog などのダイアログや、DataTable などのページにおいて一貫した外観と操作感を提供します。

✨ アプリケーションのアップデートを適切に処理する新しい `UpdateDialog` モーダルを追加し、バージョン確認やアップグレードプロンプトの周りでより良い UX を提供します。

🧹 影響を受けたダイアログとコンポーネントのプロパティ管理を簡素化するためのコードのクリーンアップと構造改善を行いました。
```

---

## feat: thống nhất các biến thể nút, thêm modal UpdateDialog

Commit này giới thiệu một số cải tiến để đồng nhất UI và nâng cao tính năng:

```
♻️ Đã tái cấu trúc tất cả các dialog và các component chính để sử dụng một biến thể nút thống nhất, điều khiển theo cài đặt giao diện của người dùng qua `useButtonVariant`. Điều này đảm bảo một giao diện và cảm giác nhất quán trên các dialog như AddNewWebhookDialog, CleanDialog, NewRevisionDialog, SettingsDialog, SupportFeedbackDialog, và các trang như DataTable và nhiều hơn nữa.

✨ Thêm một modal `UpdateDialog` mới để xử lý việc cập nhật ứng dụng một cách linh hoạt, cung cấp trải nghiệm người dùng tốt hơn khi kiểm tra phiên bản và hiển thị các thông báo nâng cấp.

🧹 Dọn dẹp mã nguồn và cải thiện cấu trúc để đơn giản hóa việc quản lý các props trong các dialog và component bị ảnh hưởng.

```
