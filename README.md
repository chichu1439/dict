# dict-win

一个基于 Tauri + React 的桌面翻译 / 词典工具，专门为 Windows 优化，支持：
- 输入翻译：直接在主窗口输入文本，一次获取多服务翻译结果
- 划词翻译：在应用内选中文本，快速弹出「Translate」按钮
- 截图 OCR 翻译：系统级透明 Overlay，框选屏幕任意区域进行文字识别并翻译
- 静默 OCR：后台识别文字，仅把结果送入主窗口，不打断当前工作
- 历史记录与收藏：保存常用内容，方便再次查看
- 可配置快捷键、界面语言、主题与 OCR 行为

## 功能概览

- 多标签界面：
  - 翻译：输入文本，选择源语言 / 目标语言，查看多路翻译结果
  - 历史：查看历史翻译记录，并可重新发送到输入框
  - 收藏：管理收藏的文本
  - 设置：配置翻译服务、全局快捷键、OCR 选项、界面语言与主题
- OCR 截图翻译：
  - 使用原生 Windows GDI / OCR 能力，从显存截取选中区域
  - 通过独立的 Overlay 窗口全屏覆盖当前显示器，背景透明
  - 框选区域后自动截图 + 预处理（放大、补白）再进行 OCR，提高识别准确度
  - 识别完成后通过事件把文本发送到主窗口进行翻译
- 快捷键系统（默认值，可在设置中修改）：
  - 输入翻译：`Ctrl + Alt + A`
  - 划词翻译：`Ctrl + Alt + D`
  - 截图 OCR：`Ctrl + Alt + S`
  - 静默 OCR：`Ctrl + Shift + Alt + S`
- 设置与持久化：
  - 使用 `@tauri-apps/plugin-store` 持久化服务配置、快捷键、窗口位置和大小等
  - 支持中英文 UI
  - 支持深色模式、主题预设（黑金 / 暖石）、窗口透明度

## 运行与开发

### 环境要求

- Node.js (建议 18+)
- Rust 稳定工具链
- Tauri 2.x 相关依赖（详见官方文档）
- Windows 10/11（OCR 与原生截图在 Windows 下有最佳体验）

### 本地开发

```bash
pnpm install # 或 npm install / yarn install
npm run tauri dev
```

启动后会同时运行前端（Vite）与 Tauri 后端，打开主窗口进行调试。

### 构建发布

```bash
npm run tauri build
```

构建完成后会在 `src-tauri/target` 下生成安装包 / 可执行文件。

## 项目结构（简要）

- `src/`
  - `App.tsx`：主窗口入口，负责标签切换、接收 OCR 结果并触发翻译
  - `components/InputTranslation.tsx`：输入翻译界面
  - `components/SelectTranslation.tsx`：应用内划词翻译的浮动按钮
  - `components/ScreenshotTranslation.tsx`：截图 OCR Overlay 前端逻辑
  - `components/Settings.tsx`：设置界面（服务、快捷键、OCR、外观等）
  - `components/History.tsx` / `Favorites.tsx`：历史与收藏
  - `stores/settingsStore.ts`：使用 Zustand 管理全局设置并持久化
  - `locales/`：中英文文案
- `src-tauri/`
  - `src/main.rs`：Tauri 入口，注册命令与插件（翻译、OCR、TTS、快捷键等）
  - `src/ocr/`：原生截图与 OCR 逻辑（Windows 实现、图像预处理等）
  - `src/hotkey/`：全局快捷键配置与处理
  - `src/tts/`：文本转语音相关逻辑
  - `tauri.conf.json`：Tauri 配置、窗口、权限与默认快捷键

## 使用说明（典型流程）

1. 启动应用，首次可在「设置」中：
   - 选择翻译服务并配置 API Key（如需要）
   - 确认或修改全局快捷键
   - 设置 OCR 识别语言、是否自动显示结果等
2. 常规翻译：
   - 切换到「翻译」标签，输入文本后点击翻译按钮
3. 划词翻译：
   - 在应用内选中文本，松开鼠标后会出现「Translate」按钮
   - 点击按钮即可把选中文本发送到主窗口并翻译
4. 截图 OCR 翻译：
   - 使用快捷键（默认 `Ctrl + Alt + S`）
   - 屏幕上出现十字光标，拖动框选区域
   - 松开后会看到「Processing…」提示，完成后主窗口自动显示翻译结果
5. 静默 OCR：
   - 使用快捷键（默认 `Ctrl + Shift + Alt + S`）
   - 在后台完成识别并把文本发送到主窗口，可结合设置决定是否自动弹出结果

## 调试与故障排查

- 应用内有调试面板（在设置或调试入口中），包括：
  - Test OCR / Test Select / Test Focus / Clear Logs 等按钮
- 常见问题：
  - 快捷键无响应：检查是否与其他应用冲突，或在设置中重新注册
  - 截图出现白屏：确认 Overlay 窗口透明度设置正确，建议使用最新构建
  - OCR 识别不准确：尝试缩小区域或在设置中调整 OCR 模式与增强选项

## 许可

暂未声明具体协议，可根据实际需求补充 License 信息。
