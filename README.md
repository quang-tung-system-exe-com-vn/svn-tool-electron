
# <p align="center">SVN Tool</p>
# Preview
<table width="100%">
  <tr >
      <td align="center" colspan="3"><b>Giao diện</b></td>
<!--       <td align="center"><b>Mail template</b></td>
      <td align="center"><b>Adaptive Card MS Teams</b></td> -->
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/05c0844f-9d67-4a3f-9bde-122371d8070f"><br>
    </td>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/59a77558-706e-450e-a6ed-6d5c81738c25"><br>
    </td>
    <td align="center" width="33%">
      <img src="https://github.com/user-attachments/assets/cdf1fb14-4ee3-43c0-b8e2-5bcbd1e98d42"><br>
    </td>
  </tr>
</table>


## 🛠️ **Giới thiệu về SVN Tool**

**SVN Tool** là một ứng dụng giao diện đồ họa (GUI) được xây dựng trên nền tảng **Tkinter**, giúp người dùng quản lý việc **commit** các thay đổi trong mã nguồn **SVN** một cách dễ dàng và trực quan. Công cụ này không chỉ hỗ trợ thao tác commit thông thường mà còn tích hợp các tính năng (tích hợp AI) như:

- **Kiểm tra coding rule**
- **Tự động sinh commit message theo chuẩn (Conventional Commits)**

Nhờ đó, quá trình phát triển và duy trì code trở nên **hiệu quả hơn**, tiết kiệm thời gian và giảm thiểu sai sót khi kiểm tra các thay đổi.

---

## ⚙ **Các chức năng chính của SVN Tool**

### ⚙️ **Cấu hình và cài đặt**
- Cung cấp giao diện để nhập và lưu trữ các thông tin quan trọng như:
  - **OpenAI API Key**
  - **Đường dẫn đến SVN (`svn.exe`)**
  - **Thư mục chứa mã nguồn**
  - **File chứa quy tắc coding**
- Giao diện cài đặt trực quan, dễ dàng điều chỉnh khi cần thiết.

---

### 📄 **Xem thông tin SVN**
- Hiển thị **trạng thái repository** và thông tin SVN của thư mục chứa mã nguồn.

---

### 📂 **Quản lý danh sách các file đã thay đổi**
- **Tự động cập nhật danh sách file đã chỉnh sửa** trong SVN.
- Cho phép **chọn/bỏ chọn** file để commit.
- Hỗ trợ tùy chọn **“Check/Uncheck All”** giúp chọn tất cả file nhanh chóng.

---

### 🔍 **Tích hợp SVN Diff**
- **Hiển thị nội dung diff** của các file được chọn.
- Cho phép mở **TortoiseSVN Diff** để so sánh trực quan giữa các phiên bản file.

---

### 🚀 **Sinh commit message tự động**
- **Tích hợp OpenAI ChatGPT** để **tự động tạo commit message** dựa trên nội dung diff.
- Hỗ trợ **đa ngôn ngữ**:
  - **English**
  - **日本語**
  - **Tiếng Việt**
- Giúp lập trình viên tiết kiệm thời gian khi viết commit message.

---

### ✅ **Kiểm tra coding rule**
- So sánh nội dung diff với quy tắc coding được định nghĩa trước.
- Sử dụng AI để phát hiện các vi phạm coding rule.
- Hiển thị chi tiết các lỗi cần sửa trên giao diện.

---

### 🔄 **Thực hiện commit**
- Sau khi kiểm tra và điều chỉnh, công cụ cho phép **commit** các file đã chọn với commit message được tạo.
- Thực hiện commit thông qua lệnh SVN và hiển thị phản hồi trực quan trên giao diện.

---

### 🚀 **Tích hợp webhook để thông báo commit (Hoàn thành)**
- Gửi thông báo đến **Slack, Discord, Email hoặc Microsoft Teams** khi có commit mới.
- Giúp team theo dõi thay đổi mã nguồn theo thời gian thực.

---

## 🌟 **Tổng kết**
**SVN Tool** giúp tối ưu hóa quá trình quản lý mã nguồn bằng cách kết hợp khả năng **tự động sinh commit message**, **kiểm tra coding rule**, và **thực hiện SVN commit trực quan**. Công cụ này giúp lập trình viên tiết kiệm thời gian và nâng cao hiệu suất trong phát triển phần mềm.


### <p align="center"><br>========== 🔹🔹🔹 ==========</p><br>

## 🔮 **Tính năng dự kiến trong tương lai**
### 🗄️ **Tích hợp database**
- Lưu thông tin commit vào database mỗi khi lập trình viên commit code.
- **Dữ liệu lưu gồm:**
  - Username của người commit
  - Ngày giờ commit
  - Nội dung commit message
  - Kết quả kiểm tra coding rules
- Hỗ trợ trưởng nhóm dễ dàng quản lý lịch sử commit và đánh giá chất lượng code.

### 📜 **Lưu history commit & coding rule check**
- Lưu lịch sử commit message để có thể xem lại.
- Lưu lịch sử nội dung kiểm tra coding rules, giúp theo dõi lỗi coding theo thời gian.
- Giao diện hiển thị lịch sử commit và coding check theo dạng bảng hoặc dashboard trực quan.

### 📊 **Thống kê và báo cáo commit**
- Hiển thị biểu đồ thống kê commit theo từng lập trình viên.
- Theo dõi số lượng commit theo **ngày/tuần/tháng**.
- Phân tích **tỷ lệ commit pass/fail** dựa trên coding rule check.


##### <p align="center"><br>quang-tung@system-exe.com.vn</p><br>
