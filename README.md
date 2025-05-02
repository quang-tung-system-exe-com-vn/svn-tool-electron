# SVNTool

<!-- Optional: Badges -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-2C2E3B?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-0f172a?logo=tailwindcss&logoColor=white)](https://ui.shadcn.dev/)
[![Biome](https://img.shields.io/badge/Biome-00C292?logo=data&logoColor=white)](https://biomejs.dev/)
[![SVN](https://img.shields.io/badge/SVN-809CC9?logo=subversion&logoColor=white)](https://subversion.apache.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Microsoft Teams](https://img.shields.io/badge/MS%20Teams-6264A7?logo=microsoft-teams&logoColor=white)](https://teams.microsoft.com/)
[![Email Support](https://img.shields.io/badge/Email-red?logo=gmail&logoColor=white)](mailto:quang-tung@system-exe.com.vn)

<!-- Add other relevant badges if available/desired -->

## Giới thiệu

SVNTool là một ứng dụng desktop mạnh mẽ được xây dựng bằng Electron, được thiết kế để giúp mọi người trong công ty quản lý quy trình làm việc với SVN một cách hiệu quả và dễ dàng. Ứng dụng cung cấp đầy đủ các tính năng cần thiết như **tạo commit và hỗ trợ kiểm tra coding rule bằng AI**, xem lịch sử (log), dọn dẹp (cleanup), xem thay đổi (diff) theo thời gian thực, tích hợp phân tích mã SpotBugs.

## Đối tượng sử dụng

Công cụ này được thiết kế cho **mọi nhân viên trong công ty** có nhu cầu làm việc với kho mã nguồn SVN.

## Tính năng chính
- **Tích hợp AI:**
  - Sử dụng AI để  tạo message commit theo nội dung file được chọn(diff content).
  - Sử dụng AI để check coding rules.
- **Quản lý SVN:**
  - Xem lịch sử commit (SVN Log) với bộ lọc và tìm kiếm nâng cao.
  - Xem chi tiết thay đổi giữa các phiên bản (Diff Viewer) trực quan, hỗ trợ syntax highlighting.
- **Tích hợp SpotBugs:** Phân tích mã nguồn Java để tìm lỗi tiềm ẩn trực tiếp từ ứng dụng.
- **Thông báo:** Gửi thông báo tự động qua Email và Microsoft Teams khi có sự kiện quan trọng (ví dụ: commit thành công, có lỗi xảy ra).
- **Thống kê:** Xem biểu đồ và số liệu thống kê về hoạt động commit, thay đổi file,...
- **Giao diện:**
  - Giao diện người dùng hiện đại, dễ sử dụng (React, Shadcn/ui).
  - Hỗ trợ đa ngôn ngữ: Tiếng Anh, Tiếng Nhật, Tiếng Việt.
  - Chế độ Sáng/Tối (Theme) tùy chỉnh.
- **Cấu hình:** Lưu trữ và quản lý cấu hình người dùng (đường dẫn working copy, thông tin máy chủ mail, webhook Teams,...).

## Giao diện
<div align="center">
  <div style="margin-bottom: 35px;">
    <div><strong>Giao diện chính</strong></div>
    <img src="https://github.com/user-attachments/assets/fe280726-6d64-40fa-ab74-d17586af8464" width="500" />
  </div>
  <div style="margin-bottom: 35px;">
    <div><strong>Spotbugs Dialog</strong></div>
    <img src="https://github.com/user-attachments/assets/50263b2d-3808-4c36-a8a5-fd276121f0f0" width="500" />
    <div><strong>Spotbugs Analysis</strong></div>
    <img src="https://github.com/user-attachments/assets/0d3ea1cb-3a9a-4a24-8b3a-c41bc83f647b" width="500" />
  </div>
  <div style="margin-bottom: 35px;">
    <div><strong>Show Log SVN Dialog</strong></div>
    <img src="https://github.com/user-attachments/assets/43821a39-37b5-4e21-be2e-db6025561143" width="500" />
  </div>
  <div style="margin-bottom: 35px;">
    <div><strong>Statistic Dialog (SVN Log Analysis)</strong></div>
    <img src="https://github.com/user-attachments/assets/a57dbe2c-f578-4441-8b5e-f7b568bcc0c7" width="500" />
  </div>
  <div style="margin-bottom: 35px;">
    <div><strong>Check coding rule Dialog</strong></div>
    <img src="https://github.com/user-attachments/assets/682a8fe2-7edf-4311-9114-83a686982d6a" width="500" />
  </div>
</div>

## Yêu cầu cài đặt

**Đối với người dùng cuối (sử dụng bản build):**

- Hệ điều hành: Windows (khuyến nghị), macOS, Linux (cần kiểm tra bản build tương ứng).
- **SVN command-line client:** Cần được cài đặt trên máy và **đảm bảo có thể truy cập được từ Command Prompt/Terminal** (thường là đã được thêm vào biến môi trường PATH).

**Đối với nhà phát triển (chạy từ mã nguồn):**

- Node.js (phiên bản >= 18.x được khuyến nghị).
- pnpm (phiên bản >= 10.9.0 như trong \`package.json\`).
- SVN command-line client (như trên).
- (Tùy chọn) Java Runtime Environment (JRE) phiên bản 11 trở lên nếu muốn chạy/debug tính năng SpotBugs từ môi trường phát triển.

## Cài đặt dự án (Dành cho nhà phát triển)

1.  Sao chép mã nguồn dự án:
    \`\`\`bash
    git clone <URL_repository_cua_ban>
    cd svn-tool-electron
    \`\`\`
2.  Cài đặt các dependencies:
    ```bash
    pnpm install
    ```

## Chạy ứng dụng (Môi trường phát triển)

```bash
pnpm dev
```

## Build ứng dụng (Dành cho nhà phát triển)

1.  Biên dịch mã nguồn:
    ```bash
    pnpm compile:app
    ```
2.  Chuẩn bị `package.json` cho bản build:
    ```bash
    pnpm compile:packageJSON
    ```
3.  Tạo bộ cài đặt (ví dụ: file .exe cho Windows):
    ```bash
    pnpm build
    ```
    _(Kết quả sẽ nằm trong thư mục \`dist\` hoặc tương tự, tùy cấu hình \`electron-builder\`)_
4.  Release source lên github
    ```bash
    pnpm make:release
    pnpm release
    ```

## Hướng dẫn sử dụng cơ bản

1.  **Khởi động:** Chạy file thực thi SVNTool (ví dụ: \`SVNTool.exe\`) sau khi cài đặt từ bộ cài, hoặc chạy \`pnpm dev\` nếu bạn là nhà phát triển.
2.  **Cấu hình ban đầu:**
    - Lần đầu khởi động, ứng dụng có thể yêu cầu bạn cấu hình đường dẫn đến **Working Copy** SVN chính mà bạn muốn làm việc.
    - Truy cập mục **Settings** (Cài đặt) trên thanh sidebar hoặc menu.
    - Trong Settings, cấu hình các mục cần thiết:
      - **SVN:** Đường dẫn đến thư mục Working Copy chính.
      - **Mail Server:** Thông tin máy chủ SMTP để gửi mail thông báo (nếu sử dụng).
      - **Webhook:** URL Webhook của kênh Microsoft Teams để gửi thông báo (nếu sử dụng).
      - **Appearance:** Chọn ngôn ngữ (Việt/Anh/Nhật), chế độ Sáng/Tối.
    - Lưu lại cấu hình.
3.  **Xem trạng thái và thay đổi:**
    - Màn hình chính (Main Page) sẽ hiển thị danh sách các file đã thay đổi trong Working Copy đã cấu hình.
    - Bạn có thể thấy trạng thái của từng file (Modified, Added, Deleted,...).
4.  **Xem lịch sử (Show Log):**
    - Chọn mục **Show Log** từ sidebar.
    - Ứng dụng sẽ tải và hiển thị lịch sử commit của Working Copy.
    - Sử dụng các bộ lọc (theo tác giả, ngày tháng, từ khóa) để tìm kiếm commit cụ thể.
    - Click vào một commit để xem chi tiết các file đã thay đổi trong commit đó.
5.  **Xem chi tiết thay đổi (Diff Viewer):**
    - Từ màn hình chính hoặc màn hình Show Log, chọn một file đã thay đổi.
    - Click vào nút "View Diff" hoặc tương tự.
    - Một cửa sổ/tab mới sẽ hiển thị nội dung thay đổi dạng side-by-side hoặc inline.
6.  **Commit thay đổi:**
    - Quay lại màn hình chính.
    - Chọn (tick vào checkbox) các file bạn muốn commit.
    - Nhập thông điệp commit rõ ràng vào ô "Commit Message".
    - Nhấn nút **Commit**. Ứng dụng sẽ thực hiện \`svn commit\` và hiển thị kết quả (thành công hoặc lỗi). Có thể có thông báo qua Mail/Teams nếu đã cấu hình.
7.  **Cập nhật (Update):**
    - Chọn mục **Update** từ menu hoặc toolbar.
    - Ứng dụng sẽ thực hiện \`svn update\` cho Working Copy và hiển thị kết quả.
8.  **Hoàn tác (Revert):**
    - Chọn một hoặc nhiều file đã thay đổi trên màn hình chính.
    - Click chuột phải hoặc tìm nút **Revert**.
    - Xác nhận thao tác hoàn tác.
9.  **Dọn dẹp (Cleanup):**
    - Chọn mục **Cleanup** từ menu hoặc toolbar.
    - Ứng dụng sẽ thực hiện \`svn cleanup\` cho Working Copy.
10. **Chạy SpotBugs:**
    - Chọn mục **SpotBugs** từ sidebar.
    - Cấu hình đường dẫn đến mã nguồn Java cần phân tích (thường là trong Working Copy).
    - Chọn các tùy chọn phân tích (nếu có).
    - Nhấn nút **Run Analysis**.
    - Kết quả phân tích (danh sách lỗi tiềm ẩn) sẽ được hiển thị trong giao diện.
11. **Xem thống kê (Statistics):**
    - Chọn mục **Statistics** từ sidebar.
    - Xem các biểu đồ và số liệu về hoạt động SVN.

## Công nghệ sử dụng
- **Framework:** Electron
- **Frontend:** React, TypeScript, Vite
- **UI Components:** Shadcn/ui, Radix UI, Lucide Icons
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Routing:** electron-router-dom, react-router-dom
- **Build/Packaging:** electron-vite, electron-builder
- **Linting/Formatting:** Biome
- **SVN Interaction:** Node.js \`child_process\`
- **SpotBugs Integration:** Java execution via \`child_process\`
- **Notifications:** Nodemailer (Mail), Axios/fetch (Teams Webhook)
- **Data Handling:** fast-xml-parser (for SVN XML output)
- **Charting:** Recharts
- **Code Editor (Diff):** Monaco Editor
- ... (Các thư viện khác từ \`package.json\`)

## Giấy phép
Dự án này được cấp phép theo giấy phép [MIT](LICENSE).

## Tác giả
- **Tên:** Nguyễn Quang Tùng
- **Email:** quang-tung@system-exe.com.vn

