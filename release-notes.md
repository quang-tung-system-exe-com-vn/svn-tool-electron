## Refactor SVN and UI components for improved functionality and user experience
### English
```
- Moved the retrieval of `sourceFolder` from the global scope to within the `revert`, `getStatistics`, and `runSpotBugs` functions to ensure proper context usage.
- Updated the AboutDialog component to enhance the layout and added a logo, developer information, and source code link.
- Added loading states and improved user feedback in the NewRevisionDialog during SVN updates.
- Enhanced the StatisticDialog with additional descriptions and improved layout for better readability.
- Updated various dialog components to include 'use client' directive for Next.js compatibility.
- Improved the handling of commit messages in the MainPage by ensuring proper data retrieval and logging.
- Refined the SpotBugs component's UI for better clarity and usability, including adjustments to table layouts and styles.
- Added new translations for updated UI elements in English, Japanese, and Vietnamese.
```
---

### 日本語
```
- グローバルスコープからの`sourceFolder`の取得を`revert`、`getStatistics`、`runSpotBugs`各関数内に移動し、適切なコンテキストで使えるようにしました。
- AboutDialogコンポーネントのレイアウトを改善し、ロゴ・開発者情報・ソースコードリンクを追加しました。
- NewRevisionDialogにSVNアップデート中のローディング状態とユーザーフィードバックを追加しました。
- StatisticDialogには追加説明とレイアウトの改良を行い、読みやすさを向上させました。
- 複数のダイアログコンポーネントにNext.js互換性のための'use client'ディレクティブを追加しました。
- MainPageでのコミットメッセージの処理を改善し、データ取得とログ記録の正確性を確保しました。
- SpotBugsコンポーネントのUIをより明確に使いやすくするため、テーブルレイアウトやスタイルを調整しました。
- 更新されたUI要素に対する英語・日本語・ベトナム語での新しい翻訳を追加しました。
```
---

### Tiếng Việt
```
- Di chuyển việc lấy `sourceFolder` từ phạm vi toàn cục vào bên trong các hàm `revert`, `getStatistics` và `runSpotBugs` để đảm bảo sử dụng đúng ngữ cảnh.
- Cập nhật thành phần AboutDialog để cải tiến bố cục, đồng thời thêm logo, thông tin nhà phát triển và liên kết mã nguồn.
- Thêm trạng thái tải và cải thiện phản hồi người dùng trong NewRevisionDialog khi thực hiện cập nhật SVN.
- Nâng cấp StatisticDialog với mô tả bổ sung và bố cục được cải thiện giúp dễ đọc hơn.
- Cập nhật nhiều dialog component để bổ sung chỉ thị 'use client', đảm bảo tương thích với Next.js.
- Cải thiện xử lý commit message trong MainPage nhằm đảm bảo thu thập và ghi log dữ liệu chính xác.
- Tinh chỉnh giao diện SpotBugs cho rõ ràng và dễ sử dụng hơn, bao gồm điều chỉnh bố cục và style của bảng.
- Thêm bản dịch mới cho các thành phần UI đã cập nhật bằng tiếng Anh, tiếng Nhật và tiếng Việt.
```
