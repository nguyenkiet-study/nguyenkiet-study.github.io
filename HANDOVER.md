# Kelvin: bàn giao cho Claude Code

Cập nhật: 19/11/2026. File này tóm tắt dự án và việc đang dở để phiên Claude Code mới làm tiếp. Quy tắc làm việc chi tiết nằm trong `CLAUDE.md` (Claude Code tự đọc file đó).

## 1. Kelvin là gì
- Web app học tiếng Anh bằng AI, dùng riêng cho chủ dự án (Nguyễn Anh Kiệt) và một nhóm bạn. Đa số người dùng mở trên điện thoại.
- 4 kỹ năng Speaking, Listening, Reading, Writing theo CEFR A1–C2, có placement test, kế hoạch tuần, Words (từ vựng Oxford, ôn ngắt quãng 5 hộp), Grammar (33 chủ đề + Sentences), Conversation (bài nghe hội thoại), Community + Messages, History, My progress.
- Giao diện tiếng Anh. Trao đổi với chủ dự án bằng tiếng Việt, xưng "mình" và "bạn".

## 2. Kiến trúc và tài khoản
| Phần | Ở đâu | Tài khoản |
|---|---|---|
| Code nguồn + web | GitHub `nguyenkiet-study/nguyenkiet-study.github.io`, nhánh `main` | GitHub nguyenkiet-study (đăng nhập bằng Google mail B) |
| Web (frontend) | GitHub Pages: https://nguyenkiet-study.github.io/ | như trên |
| Backend | Google Apps Script, một file `Backend.gs`, link /exec cố định | Google mail B |
| Database | Google Sheet gắn với Apps Script | Google mail B |
| AI | Gemini, gói miễn phí (gemini-3.8-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite) | key nằm trong Apps Script |

- Tài khoản Claude của chủ dự án là mail A, khác mail B. Claude không cần đăng nhập mail B: mọi thay đổi đi qua GitHub.
- Có thêm tài khoản GitHub anhkiet-pro, không dùng cho Kelvin.

## 3. Cách đưa thay đổi lên app
1. Sửa trong `source/` (không sửa tay `apps_script/`, `index.html` ở gốc, `config.js`).
2. Chạy test phù hợp trong `source/tools/` (xem mục 5).
3. Ở gốc repo: `python3 source/tools/release.py` (build `apps_script/Backend.js`, `apps_script/Index.html`, `index.html`, copy sticker).
4. Commit và push lên `main`.
   - GitHub Action `Deploy Apps Script` tự `clasp push` + `clasp deploy` lên đúng deployment cũ, link /exec giữ nguyên.
   - GitHub Pages tự cập nhật web.
5. Kiểm tra cả hai lần chạy đều `success`: `gh api repos/nguyenkiet-study/nguyenkiet-study.github.io/actions/runs?per_page=2`.
6. Nếu thêm cột mới vào Sheet: nhắc chủ dự án chạy menu **Kelvin > Set up database** một lần.

Secrets `CLASPRC_JSON` và `DEPLOYMENT_ID` chỉ nằm trong GitHub Actions secrets. Không in ra, không commit.

## 4. Thay đổi gần đây (17–19/11/2026)
- **My progress làm lại toàn bộ** (`a356841`):
  - 4 số chính, Your skills (có Focus + nút Practise).
  - Level trend: bấm tên kỹ năng để xem riêng; dưới 3 tuần dữ liệu thì hiện bảng "lúc đầu → bây giờ".
  - Weekly goal thay cho lưới Practice days; thêm Time by skill, Words, Grammar, Next goals.
  - Backend `ProgressTracker.overview` trả thêm `stats`.
  - Màu kỹ năng toàn app: Speaking cam `#F2711C`, Listening xanh lá `#0FA37F`, Reading xanh dương `#2864E8`, Writing tím `#8B5CF6`.
- **Sticker** (`a418f2b`, `2432d9c`):
  - 41 sticker Kelvin vai trò/hoạt động lấy từ bộ đã xoá nền của chủ dự án (256 px). Dùng hình chủ dự án gửi, không tự xoá nền.
  - Daily mix dùng `kel-party`.
  - Sticker trên các màn hình kết quả (Practice, Words, Study, Grammar, placement) và màn hình trống (History, Community, Messages).
  - Helper chung `stk(name, cls)` / `Kelvin.stk`.
- **Words, Fill in the blank** (`f4b7f46`): chỉ dạng từ câu cần mới đúng (means, không phải mean). Gõ dạng gốc thì báo "Almost" và vẫn tính là nhớ từ.
- `df20437`: màn hình chờ khi lưu Words, list, quick words, nộp Grammar, kết thúc Drill.

## 5. Test
- Backend (Node, chạy từ `source/`): `node tools/learning_test.js`, `grammar_test.js`, `gas_test.js`, `history_test.js`, `drill_test.js`, `community_test.js`, `conversation_test.js`, `placement_test.js`.
- Trình duyệt (Playwright, từ `source/`): `python3 tools/build_preview.py` rồi `python3 tools/<tên>_e2e.py`.
  - Các script e2e mở `/home/claude/prism/preview.html` và lưu ảnh vào `/home/claude/logo_work/`. Trên máy khác cần tạo symlink `prism` trỏ tới `source/` và tạo thư mục ảnh, hoặc sửa đường dẫn.
- Gemini chỉ được test bằng `tools/fake_gemini.js`. Phần AI cần chủ dự án thử trên app thật.
- Chưa chạy lại sau đợt sticker: `community_e2e`, `conversation_e2e`, `wait_e2e`, `learning_e2e` (bị dừng giữa chừng).

## 6. Việc đang dở / ý tưởng chờ
- **Words chưa đủ chuyên nghiệp**: chủ dự án muốn thêm từ loại, phiên âm IPA, từ đồng nghĩa thông dụng. Đang bàn, chưa code. Bàn trước khi code.
- **Grammar content**: đã có batch 1 (17 chủ đề A2 + B1). Còn A1, B2, C1.
- **Grammar "All topics"**: đã gợi ý cho học cả chủ đề ngoài lỗi của mình, chủ dự án chưa trả lời.
- **Ảnh nền thiết kế**: chủ dự án định nhờ AI khác vẽ 4 vùng (login, lời chào dashboard, banner hoàn thành, popup mở đầu), chưa gửi lại.
- Chạy nốt các e2e ở mục 5 và kiểm tra sticker trên điện thoại.

## 7. Quy tắc từ chủ dự án
- Việc lớn: bàn trước khi code khi chủ dự án nói vậy; việc rõ ràng thì làm luôn.
- Trả lời ngắn gọn, không dán code dài hay danh sách file dài vào chat (điện thoại từng bị treo vì output dài). Code nằm trên GitHub.
- Khi chủ dự án xin code: gửi trọn file đã đổi, không gửi đoạn vá.
- Hiện tên thành viên bằng họ tên, không hiện username. Giữ dấu "niulai.wiki" trên sticker bò (bộ "Niu Lai").
- Admin Community: tài khoản "ADMIN" (username kelvin). Tài khoản "Kelvin" (username kel) của chủ dự án là thành viên thường.
- Giữ riêng tư email của chủ dự án.
