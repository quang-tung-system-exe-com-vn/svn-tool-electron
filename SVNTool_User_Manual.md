# Hướng dẫn sử dụng SVNTool

## 1. Giới thiệu

SVNTool là một công cụ desktop nội bộ được thiết kế để đơn giản hóa và quản lý các quy trình làm việc với SVN (Subversion). Ứng dụng này cung cấp một giao diện đồ họa thân thiện để thực hiện các tác vụ SVN phổ biến, giúp tăng năng suất và giảm thiểu lỗi trong quá trình quản lý mã nguồn.

**Mục đích và lợi ích:**

- **Quản lý thay đổi hiệu quả:** Dễ dàng xem các file đã thay đổi, xem chi tiết khác biệt (diff) và hoàn tác các thay đổi không mong muốn.
- **Commit thông minh:** Hỗ trợ tạo commit message tự động bằng AI dựa trên nội dung thay đổi, giúp đảm bảo tính nhất quán và chất lượng của lịch sử commit.
- **Theo dõi lịch sử dễ dàng:** Xem lịch sử commit (log), xem nội dung file ở các phiên bản cũ và xác định ai đã thay đổi dòng code nào (blame).
- **Kiểm tra chất lượng mã:** Tích hợp kiểm tra vi phạm coding rule bằng AI dựa trên diff và phân tích lỗi mã Java với SpotBugs.
- **Tự động hóa thông báo:** Gửi thông báo qua Email hoặc Microsoft Teams về các sự kiện quan trọng (ví dụ: sau khi commit).
- **Thao tác SVN cơ bản:** Hỗ trợ cập nhật (update), dọn dẹp (cleanup), xem thông tin (info) và thống kê (statistics).

**Đối tượng người dùng mục tiêu:**

- Các nhà phát triển phần mềm, kỹ sư QA, và bất kỳ ai làm việc với SVN trong quy trình phát triển nội bộ cần một công cụ đồ họa để quản lý mã nguồn hiệu quả hơn.

## 2. Bắt đầu

Phần này hướng dẫn các bước cơ bản để cài đặt và khởi chạy SVNTool.

**Yêu cầu hệ thống:**

- Hệ điều hành: Windows (phiên bản cụ thể nếu có), macOS, Linux (nếu được hỗ trợ).
- SVN client: Cần cài đặt SVN command-line client trên máy của bạn để SVNTool có thể thực thi các lệnh SVN.
- (Các yêu cầu khác nếu có, ví dụ: .NET Framework, Java Runtime Environment cho SpotBugs).

**Hướng dẫn cài đặt:**

1.  Tải về bộ cài đặt SVNTool phù hợp với hệ điều hành của bạn (thường là file `.exe` cho Windows, `.dmg` cho macOS, `.deb` hoặc `.AppImage` cho Linux).
2.  Chạy file cài đặt và làm theo các bước hướng dẫn trên màn hình.
3.  Sau khi cài đặt hoàn tất, bạn có thể tìm thấy biểu tượng SVNTool trên Desktop hoặc trong menu Start (Windows) / Applications (macOS).

**Khởi chạy ứng dụng lần đầu:**

- Nhấp đúp vào biểu tượng SVNTool hoặc chạy file thực thi của ứng dụng.
- Lần đầu khởi chạy, bạn có thể cần cấu hình đường dẫn đến thư mục làm việc SVN chính và các thông tin cần thiết khác trong phần Cài đặt (Xem mục 5).

## 3. Tổng quan giao diện

Giao diện chính của SVNTool được chia thành các khu vực chính sau đây để dễ dàng điều hướng và sử dụng:

- **Thanh tiêu đề (Title Bar):**

  - Nằm ở phía trên cùng của cửa sổ ứng dụng.
  - Chứa các nút điều khiển cửa sổ tiêu chuẩn (Thu nhỏ, Phóng to/Khôi phục, Đóng).
  - Có thể chứa logo ứng dụng và tên thư mục làm việc hiện tại.
  - Thường có menu chính (File, Edit, View, Settings, Help - tùy thuộc vào thiết kế) để truy cập các chức năng và cài đặt.

- **Khu vực chính (Main Area / Main Page):**

  - Là phần lớn nhất của giao diện, nơi hiển thị thông tin và thực hiện các thao tác chính.
  - **Bảng hiển thị file thay đổi (Data Table):** Thường chiếm vị trí trung tâm, liệt kê các file đã được sửa đổi, thêm mới, xóa hoặc có xung đột trong thư mục làm việc. Bảng này có thể bao gồm các cột như Tên file, Trạng thái, Đường dẫn. Người dùng có thể chọn các file trong bảng này để thực hiện các hành động tiếp theo.
  - **Thanh công cụ (Toolbar):** (Có thể nằm phía trên hoặc tích hợp vào các phần khác) Chứa các nút bấm cho các hành động thường dùng như Commit, Update, Revert, Show Log, Check Coding Rules, Refresh, v.v.

- **Thanh trạng thái / Chân trang (Footer Bar):**
  - Nằm ở phía dưới cùng của cửa sổ.
  - Hiển thị thông tin trạng thái hiện tại (ví dụ: đang cập nhật, sẵn sàng, phiên bản SVN).
  - Có thể chứa các nút hoặc thông tin bổ sung như nút mở Settings, thông tin về phiên bản ứng dụng.

_(Lưu ý: Mô tả này dựa trên cấu trúc file và các thành phần UI phổ biến. Giao diện thực tế có thể có các biến thể nhỏ. Nên bổ sung ảnh chụp màn hình để minh họa rõ hơn)_.

## 4. Các chức năng chính

Phần này mô tả chi tiết các chức năng cốt lõi của SVNTool.

### 4.1. Quản lý thay đổi

SVNTool giúp bạn dễ dàng theo dõi và quản lý các thay đổi trong thư mục làm việc của mình.

- **Xem danh sách file đã thay đổi:**

  - Màn hình chính (Main Page) sẽ tự động quét và hiển thị danh sách các file đã được sửa đổi, thêm mới, xóa, hoặc bị xung đột trong bảng dữ liệu (Data Table).
  - Bạn có thể làm mới (Refresh) danh sách này bất cứ lúc nào bằng nút tương ứng trên thanh công cụ.
  - Trạng thái của mỗi file (ví dụ: Modified, Added, Deleted, Conflicted) sẽ được hiển thị rõ ràng.

- **Xem chi tiết thay đổi (Diff Viewer):**

  - Chọn một hoặc nhiều file trong bảng danh sách thay đổi.
  - Nhấp vào nút "Show Diff" (hoặc tương tự) trên thanh công cụ hoặc nhấp đúp vào file.
  - Một cửa sổ hoặc khu vực mới (Diff Viewer) sẽ hiển thị sự khác biệt chi tiết giữa phiên bản hiện tại trong thư mục làm việc và phiên bản gốc trên repository (BASE).
  - Giao diện diff thường hiển thị song song (side-by-side) hoặc inline, làm nổi bật các dòng đã thêm, xóa hoặc sửa đổi.

- **Mở Diff bằng công cụ bên ngoài:**

  - Nếu bạn muốn sử dụng công cụ so sánh file yêu thích của mình (ví dụ: WinMerge, Beyond Compare, KDiff3), SVNTool cung cấp tùy chọn để mở diff bằng công cụ đó.
  - Chọn file(s) và tìm nút "Open External Diff" (hoặc tương tự). Bạn có thể cần cấu hình đường dẫn đến công cụ diff bên ngoài trong phần Cài đặt.

- **Hoàn tác thay đổi (Revert):**
  - Nếu bạn muốn hủy bỏ các thay đổi đã thực hiện trên một hoặc nhiều file và quay lại phiên bản gốc từ repository (BASE).
  - Chọn các file cần hoàn tác trong bảng danh sách.
  - Nhấp vào nút "Revert" trên thanh công cụ.
  - Ứng dụng sẽ yêu cầu xác nhận trước khi thực hiện hoàn tác, vì hành động này không thể phục hồi dễ dàng.

### 4.2. Commit thay đổi

Sau khi bạn đã hoàn thành các thay đổi và muốn lưu chúng lên SVN repository, hãy sử dụng chức năng commit.

- **Chuẩn bị commit:**

  - Trong bảng danh sách file thay đổi, chọn (đánh dấu tick) những file bạn muốn đưa vào lần commit này.
  - Nhập một commit message rõ ràng và súc tích vào ô nhập liệu dành riêng cho commit message. Mô tả ngắn gọn mục đích của các thay đổi này.

- **Tạo commit message tự động bằng AI (Generate with AI):**

  - Để tiết kiệm thời gian và đảm bảo commit message chất lượng, SVNTool cung cấp tính năng tạo message tự động bằng AI.
  - Sau khi chọn các file cần commit, nhấp vào nút "Generate with AI" (hoặc tương tự).
  - Ứng dụng sẽ phân tích nội dung thay đổi (diff) của các file đã chọn và gửi đến mô hình AI (ví dụ: GPT-4o mini) để tạo ra một commit message gợi ý.
  - Commit message được tạo ra sẽ xuất hiện trong ô nhập liệu. Bạn có thể chỉnh sửa lại nếu cần trước khi commit.
  - _Lưu ý: Chức năng này yêu cầu cấu hình OpenAI API Key trong phần Cài đặt._

- **Thực hiện commit:**

  - Sau khi đã chọn file và có commit message phù hợp, nhấp vào nút "Commit".
  - Ứng dụng sẽ thực hiện lệnh `svn commit` với các file và message đã chọn.
  - Quá trình commit có thể mất vài giây hoặc lâu hơn tùy thuộc vào số lượng file và tốc độ mạng. Thanh trạng thái sẽ hiển thị tiến trình.
  - Sau khi commit thành công, danh sách file thay đổi sẽ được cập nhật.

- **Xem lịch sử commit message (Commit Message History):**
  - SVNTool có thể lưu lại lịch sử các commit message bạn đã sử dụng.
  - Tìm nút hoặc menu "Commit Message History" để mở cửa sổ hoặc danh sách hiển thị các message cũ.
  - Bạn có thể chọn lại một message cũ để tái sử dụng cho lần commit hiện tại.

### 4.3. Xem lịch sử (SVN Log)

Việc xem lại lịch sử thay đổi là rất quan trọng để hiểu quá trình phát triển và tìm kiếm các thay đổi cụ thể.

- **Duyệt lịch sử commit:**

  - Nhấp vào nút "Show Log" trên thanh công cụ hoặc chọn từ menu.
  - Một cửa sổ hoặc tab mới (Show Log) sẽ hiển thị danh sách các phiên bản (revisions) đã được commit lên repository, thường được sắp xếp theo thứ tự thời gian giảm dần.
  - Mỗi mục trong danh sách thường bao gồm số phiên bản (revision number), tác giả (author), ngày giờ commit và commit message.
  - Bạn có thể cuộn qua danh sách hoặc sử dụng các bộ lọc (ví dụ: theo tác giả, ngày tháng, nội dung message) để tìm kiếm các commit cụ thể.

- **Xem chi tiết một commit cụ thể:**

  - Chọn một phiên bản trong danh sách lịch sử log.
  - Khu vực chi tiết (thường ở phía dưới hoặc bên cạnh danh sách log) sẽ hiển thị:
    - Commit message đầy đủ.
    - Danh sách các file đã thay đổi trong phiên bản đó (bao gồm trạng thái: Added, Modified, Deleted).
  - Bạn có thể chọn một file trong danh sách này để xem diff của file đó tại phiên bản đã chọn so với phiên bản trước đó.

- **Xem nội dung file tại một phiên bản cũ (Cat):**

  - Trong cửa sổ Show Log, chọn một phiên bản và một file đã thay đổi trong phiên bản đó.
  - Tìm tùy chọn "View content at this revision" hoặc "SVN Cat".
  - SVNTool sẽ lấy và hiển thị nội dung của file đó chính xác như lúc nó được commit ở phiên bản đã chọn.

- **Xem ai đã thay đổi dòng code nào (Blame):**
  - Chức năng "Blame" (còn gọi là "Annotate" hoặc "Praise") cho phép bạn xem thông tin về tác giả và phiên bản commit cuối cùng đã sửa đổi từng dòng trong một file.
  - Trong cửa sổ Show Log hoặc từ menu ngữ cảnh của file, chọn tùy chọn "Blame" hoặc "Annotate".
  - SVNTool sẽ hiển thị nội dung file, kèm theo thông tin về số phiên bản và tác giả ở bên cạnh mỗi dòng code. Điều này rất hữu ích để tìm hiểu nguồn gốc của một đoạn mã hoặc liên hệ với người đã viết nó.

### 4.4. Cập nhật và Dọn dẹp

Để đảm bảo thư mục làm việc của bạn luôn đồng bộ với repository và hoạt động ổn định, SVNTool cung cấp các chức năng cập nhật và dọn dẹp.

- **Cập nhật mã nguồn (Update):**

  - Chức năng này đồng bộ thư mục làm việc của bạn với phiên bản mới nhất (HEAD) trên repository hoặc một phiên bản cụ thể bạn chọn.
  - Nhấp vào nút "Update" trên thanh công cụ.
  - SVNTool sẽ thực hiện lệnh `svn update`. Mọi thay đổi từ repository sẽ được tải về và hợp nhất vào thư mục làm việc của bạn.
  - Nếu có xung đột (conflicts) xảy ra trong quá trình cập nhật, SVNTool sẽ thông báo và đánh dấu các file bị xung đột để bạn giải quyết.

- **Dọn dẹp thư mục làm việc (Cleanup):**
  - Đôi khi, thư mục làm việc SVN có thể rơi vào trạng thái không nhất quán do các thao tác bị gián đoạn (ví dụ: mất kết nối mạng khi đang update/commit).
  - Chức năng "Cleanup" giúp giải quyết các vấn đề này bằng cách loại bỏ các khóa (locks) cũ và hoàn tất các thao tác còn dang dở.
  - Tìm nút "Cleanup" (thường trong menu hoặc thanh công cụ).
  - Nhấp vào nút này để thực hiện lệnh `svn cleanup` trên thư mục làm việc. Thao tác này thường nhanh chóng và giúp thư mục làm việc trở lại trạng thái bình thường.

### 4.5. Kiểm tra chất lượng mã

SVNTool tích hợp các công cụ giúp bạn đảm bảo chất lượng mã nguồn trước khi commit.

- **Kiểm tra vi phạm coding rule dựa trên nội dung thay đổi (Diff) bằng AI:**

  - Chức năng này sử dụng trí tuệ nhân tạo để phân tích các thay đổi (diff) bạn sắp commit và chỉ ra các vi phạm tiềm ẩn đối với các quy tắc code (coding conventions, best practices).
  - Chọn các file bạn muốn kiểm tra trong bảng danh sách thay đổi.
  - Nhấp vào nút "Check Coding Rules" (hoặc tương tự).
  - SVNTool sẽ lấy nội dung diff, gửi đến mô hình AI (đã cấu hình) và hiển thị kết quả phân tích. Kết quả có thể bao gồm danh sách các vi phạm được phát hiện, vị trí trong code và gợi ý sửa lỗi.
  - Điều này giúp phát hiện sớm các vấn đề về phong cách code, các lỗi tiềm ẩn hoặc các đoạn mã không tuân thủ chuẩn mực chung.
  - _Lưu ý: Chức năng này yêu cầu cấu hình OpenAI API Key trong phần Cài đặt._

- **Phân tích lỗi với SpotBugs (SpotBugs Integration):**
  - Đối với các dự án Java, SVNTool tích hợp với SpotBugs, một công cụ phân tích tĩnh mã nguồn phổ biến để tìm các lỗi (bugs) tiềm ẩn.
  - Tìm chức năng "Run SpotBugs" (có thể trong menu hoặc thanh công cụ riêng).
  - Bạn có thể cần chỉ định đường dẫn đến mã nguồn Java hoặc các file `.class`/`.jar` cần phân tích.
  - SVNTool sẽ chạy SpotBugs và hiển thị báo cáo kết quả, liệt kê các lỗi tiềm ẩn được tìm thấy, mức độ nghiêm trọng và vị trí trong mã nguồn.
  - _Lưu ý: Chức năng này yêu cầu cài đặt Java Runtime Environment (JRE) và có thể cần cấu hình đường dẫn đến thư mục cài đặt SpotBugs._

### 4.6. Thống kê

SVNTool cung cấp chức năng thống kê để bạn có cái nhìn tổng quan về hoạt động trong repository.

- **Xem thống kê repository (Statistics):**
  - Tìm nút hoặc menu "Statistics".
  - Một cửa sổ hoặc tab mới sẽ hiển thị các thông tin thống kê về repository, ví dụ như:
    - Số lượng commit theo từng tác giả.
    - Số lượng commit theo thời gian (ngày, tuần, tháng).
    - Biểu đồ thể hiện hoạt động commit.
    - (Các loại thống kê khác tùy thuộc vào cách triển khai).
  - Chức năng này hữu ích để theo dõi tiến độ dự án, đánh giá đóng góp của các thành viên hoặc xác định các giai đoạn hoạt động cao điểm.

### 4.7. Gửi thông báo (Notifications)

SVNTool có thể tự động gửi thông báo về các sự kiện quan trọng đến các kênh liên lạc của bạn hoặc nhóm của bạn.

- **Gửi thông báo qua Email:**

  - Sau khi một hành động được cấu hình (ví dụ: commit thành công), SVNTool có thể tự động soạn và gửi email thông báo đến danh sách địa chỉ email đã định sẵn.
  - Nội dung email thường bao gồm thông tin về sự kiện (ví dụ: số phiên bản commit, tác giả, commit message, danh sách file thay đổi).
  - _Lưu ý: Chức năng này yêu cầu cấu hình thông tin Mail Server trong phần Cài đặt._

- **Gửi thông báo qua Microsoft Teams:**

  - Tương tự như email, SVNTool có thể gửi thông báo đến một kênh Microsoft Teams cụ thể thông qua Webhook.
  - Thông báo trên Teams thường được định dạng dưới dạng thẻ (Card) để dễ đọc, chứa các thông tin tương tự như thông báo email.
  - _Lưu ý: Chức năng này yêu cầu cấu hình Teams Incoming Webhook URL trong phần Cài đặt._

- **Các sự kiện kích hoạt thông báo (Ví dụ):**
  - Commit thành công.
  - Phát hiện xung đột khi cập nhật.
  - Hoàn thành việc chạy SpotBugs hoặc kiểm tra coding rule.
  - (Các sự kiện khác tùy thuộc vào cấu hình và thiết kế ứng dụng).

## 5. Cấu hình ứng dụng (Settings)

Cửa sổ Cài đặt (Settings) cho phép bạn tùy chỉnh hoạt động và giao diện của SVNTool cho phù hợp với nhu cầu cá nhân và môi trường làm việc. Bạn thường có thể truy cập Cài đặt thông qua menu chính hoặc một nút bấm trên giao diện.

- **Cấu hình thông tin SVN:**

  - **Working Copy Path:** Đường dẫn đến thư mục làm việc SVN chính mà bạn muốn SVNTool quản lý.
  - **SVN Credentials:** (Tùy chọn) Nếu repository yêu cầu xác thực, bạn có thể cần nhập tên người dùng (username) và mật khẩu (password) hoặc cấu hình phương thức xác thực khác (ví dụ: SSH key). SVNTool có thể lưu trữ thông tin này một cách an toàn (thường được mã hóa).
  - **External Diff Tool Path:** Đường dẫn đến file thực thi của công cụ so sánh file bên ngoài bạn muốn sử dụng.

- **Cấu hình OpenAI API Key:**

  - Để sử dụng các chức năng AI (tạo commit message, kiểm tra coding rule), bạn cần cung cấp khóa API (API Key) của OpenAI.
  - Nhập API Key của bạn vào trường tương ứng. Khóa này sẽ được lưu trữ cục bộ.

- **Cấu hình giao diện (Appearance):**

  - **Theme/Chủ đề:** Chọn giao diện sáng (Light) hoặc tối (Dark), hoặc các chủ đề màu sắc khác nếu có.
  - **Language/Ngôn ngữ:** Thay đổi ngôn ngữ hiển thị của ứng dụng (ví dụ: Tiếng Anh, Tiếng Việt, Tiếng Nhật).
  - **Font Size/Cỡ chữ:** Điều chỉnh cỡ chữ chung của giao diện.
  - **Font Family/Phông chữ:** Chọn phông chữ hiển thị (nếu ứng dụng hỗ trợ).
  - (Các tùy chọn giao diện khác).

- **Cấu hình thông báo (Notifications):**

  - **Mail Server:**
    - Địa chỉ máy chủ SMTP (SMTP Server Address).
    - Cổng (Port).
    - Bảo mật (Security: None, SSL/TLS, STARTTLS).
    - Tên người dùng (Username) và Mật khẩu (Password) để xác thực với máy chủ mail.
    - Địa chỉ email người gửi (Sender Email Address).
    - Danh sách địa chỉ email người nhận (Recipient Email Addresses), cách nhau bằng dấu phẩy hoặc chấm phẩy.
  - **Microsoft Teams:**
    - Incoming Webhook URL: URL của Webhook được tạo trong kênh Teams bạn muốn nhận thông báo.

- **Cấu hình Webhook (khác):**
  - Nếu ứng dụng hỗ trợ gửi thông báo đến các dịch vụ khác qua Webhook (ví dụ: Slack, Discord), bạn sẽ cấu hình URL Webhook tương ứng tại đây.
  - Có thể có tùy chọn để thêm, sửa, xóa các cấu hình Webhook.

_(Lưu ý: Các tùy chọn cấu hình cụ thể có thể khác nhau tùy thuộc vào phiên bản và thiết kế của SVNTool)._

## 6. Các chức năng khác

Ngoài các chức năng chính đã nêu, SVNTool còn cung cấp một số tiện ích và thông tin bổ sung.

- **Giới thiệu về ứng dụng (About):**

  - Thường được truy cập qua menu Help -> About.
  - Hiển thị thông tin về phiên bản hiện tại của SVNTool, tên tác giả, thông tin bản quyền và có thể có liên kết đến trang web hoặc repository của dự án.

- **Gửi phản hồi/hỗ trợ (Support/Feedback):**

  - Cung cấp cách để người dùng gửi phản hồi, báo lỗi hoặc yêu cầu hỗ trợ.
  - Có thể là một biểu mẫu trong ứng dụng, liên kết đến hệ thống quản lý issue (ví dụ: Jira, GitHub Issues) hoặc địa chỉ email hỗ trợ.

- **Kiểm tra cập nhật (Check for Updates):**

  - Ứng dụng có thể tự động kiểm tra phiên bản mới khi khởi động hoặc người dùng có thể kích hoạt kiểm tra thủ công (thường trong menu Help).
  - Nếu có phiên bản mới, ứng dụng sẽ thông báo và có thể cung cấp tùy chọn để tải về và cài đặt bản cập nhật.

## 7. Câu hỏi thường gặp (FAQ)

Phần này sẽ trả lời các câu hỏi phổ biến mà người dùng có thể gặp phải khi sử dụng SVNTool.

- **(Thêm các câu hỏi và trả lời khác tại đây)**

## 8. Phụ lục

Phần này cung cấp thông tin bổ sung hoặc giải thích các thuật ngữ.

- **Giải thích thuật ngữ SVN:**
  - **Repository:** Nơi lưu trữ tập trung mã nguồn và lịch sử thay đổi.
  - **Working Copy:** Bản sao cục bộ của repository trên máy tính của bạn, nơi bạn thực hiện các thay đổi.
  - **Commit:** Hành động gửi các thay đổi từ Working Copy lên Repository.
  - **Update:** Hành động cập nhật Working Copy với các thay đổi mới nhất từ Repository.
  - **Revision:** Một phiên bản cụ thể của mã nguồn trong lịch sử Repository, được đánh số tăng dần.
  - **HEAD:** Phiên bản mới nhất trong Repository.
  - **BASE:** Phiên bản của file trong Working Copy trước khi bạn thực hiện các thay đổi cục bộ (tương ứng với lần Update cuối cùng).
  - **Conflict:** Tình trạng xảy ra khi thay đổi cục bộ của bạn xung đột với thay đổi trên Repository trong quá trình Update.
  - **Revert:** Hoàn tác các thay đổi cục bộ trong Working Copy, quay về trạng thái của phiên bản BASE.
  - **Blame/Annotate:** Hiển thị thông tin về người và phiên bản đã thay đổi từng dòng code.
  - **Cleanup:** Lệnh để sửa lỗi hoặc trạng thái không nhất quán trong Working Copy.
  - **(Thêm các thuật ngữ khác nếu cần)**
