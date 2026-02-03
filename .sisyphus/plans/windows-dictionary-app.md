# Windows Dictionary App - Tauri + React Implementation

## TL;DR

> **Quick Summary**: Build a Windows desktop dictionary/translator app using Tauri (Rust + React), replicating Easydict's core features with high-precision OCR and multiple AI translation services.
>
> **Deliverables**:
> - Windows desktop application (.exe installer)
> - Multi-service translation (OpenAI, DeepL, Google, etc.)
> - High-precision OCR (Windows OCR API)
> - Global hotkeys for input/select/screenshot translation
> - History and favorites management
> - TTS voice playback
>
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Project setup → UI framework → Translation services → OCR integration

---

## Context

### Original Request
Reference Easydict (macOS) project to build a Windows desktop dictionary/translator application with high precision OCR and multiple AI model support.

### Interview Summary
**Key Discussions**:
- **Technology Choice**: Tauri preferred over Electron for better performance, smaller size, and long-term maintainability
- **Scope**: Replicate core features, not every detail from Easydict
- **OCR Requirement**: High precision needed - Windows OCR API selected as primary solution
- **Test Strategy**: No automated tests required (manual verification)
- **AI Services**: Multiple services in parallel (OpenAI, DeepL, Google, etc.)
- **Project Type**: Personal project, has some API keys available

**Technical Decisions**:
- **Desktop Framework**: Tauri 2.x (Rust + React)
- **Frontend**: React 19 + TypeScript + Vite
- **UI Components**: Shadcn/ui + Tailwind CSS
- **State Management**: Zustand
- **OCR**: Windows OCR API (primary) + Tesseract.js (fallback)
- **Translation APIs**: OpenAI, DeepL, Google Translate (multiple services)
- **Hotkeys**: Rust global-hotkey
- **Build Tool**: Cargo + Vite

---

## Work Objectives

### Core Objective
Build a performant, lightweight Windows desktop application for dictionary lookup and text translation, replicating Easydict's core user experience with modern web technologies.

### Concrete Deliverables
- Windows installer (.msi/.exe) for distribution
- Floating translation window with minimal design
- Input translation (Ctrl+Alt+A)
- Select text translation (Ctrl+Alt+D)
- Screenshot translation (Ctrl+Alt+S)
- Silent screenshot OCR (Ctrl+Alt+Shift+S)
- Multi-service parallel translation results
- History and favorites functionality
- TTS voice playback
- Settings/configuration interface

### Definition of Done
- [ ] Application builds successfully for Windows x64
- [ ] All core translation flows work (input, select, screenshot)
- [ ] OCR recognition works with high accuracy (>95%)
- [ ] At least 3 translation services are functional
- [ ] Global hotkeys work system-wide
- [ ] Settings can be saved and loaded
- [ ] Application runs without crashes for 1-hour continuous use

### Must Have
- Tauri 2.x framework with React frontend
- Windows OCR API integration for high-precision text recognition
- At least 3 translation services (OpenAI, DeepL, Google)
- Global hotkey system for quick access
- Floating window UI similar to Easydict
- Basic history and favorites storage (local)
- TTS playback functionality

### Must NOT Have (Guardrails)
- **No Electron** - Must use Tauri for performance and size reasons
- **No unnecessary dependencies** - Keep bundle size minimal
- **No complex database** - Use Tauri Store or simple JSON files for storage
- **No cloud sync** - MVP should work offline for configuration/history
- **No AI-generated slop** - Avoid over-engineering, over-validating, or excessive error messages
- **No premature abstraction** - Keep code simple and straightforward for initial MVP

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.
>
> **FORBIDDEN** — acceptance criteria that require:
> - "User manually tests..." / "用户手动测试..."
> - "User visually confirms..." / "用户视觉确认..."
> - "User interacts with..." / "用户交互..."
> - "Ask user to verify..." / "询问用户确认..."
> - ANY step where a human must perform an action
>
> **ALL verification is executed by the agent** using tools (Playwright, interactive_bash, curl, etc.). No exceptions.

### Test Decision
- **Infrastructure exists**: NO (new project)
- **Automated tests**: None
- **Framework**: None
- **Verification Method**: Agent-executed QA scenarios (manual testing via tools)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Since automated tests are not required, EVERY task MUST include Agent-Executed QA Scenarios.
> These describe how the executing agent DIRECTLY verifies the deliverable
> by running it — launching the app, interacting with UI, triggering actions, observing outputs.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Desktop App** | Bash + PowerShell | Run executable, trigger actions, observe logs |
| **UI Interaction** | Playwright (if accessible) or manual observation | Open app, click elements, verify behavior |
| **API Integration** | Bash (curl) | Send test requests, parse responses |
| **Rust Backend** | Bash (cargo test) | Run unit tests, verify output |
| **Config/Storage** | Bash (file read) | Check JSON/config files for expected data |

**Each Scenario MUST Follow This Format:**

```
Scenario: [Descriptive name — what feature/flow is being verified]
  Tool: [Bash / PowerShell / Playwright]
  Preconditions: [What must be true before this scenario runs]
  Steps:
    1. [Exact action with specific command/key/endpoint]
    2. [Next action with expected intermediate state]
    3. [Assertion with exact expected value]
  Expected Result: [Concrete, observable outcome]
  Failure Indicators: [What would indicate failure]
  Evidence: [Log path / screenshot path / output capture]
```

**Scenario Detail Requirements:**
- **Commands**: Exact PowerShell/bash commands (`npm run dev`, `cargo build`, etc.)
- **Hotkeys**: Specific key combinations (`Ctrl+Alt+A`, etc.)
- **Assertions**: Exact values (text content, status codes, file contents)
- **Timing**: Include wait conditions where relevant
- **Negative Scenarios**: At least ONE failure scenario per critical feature
- **Evidence Paths**: Specific file paths (`.sisyphus/evidence/task-N-{name}.txt`)

**Anti-patterns (NEVER write scenarios like this):**
- ❌ "Verify the translation works correctly"
- ❌ "Check that OCR recognizes text"
- ❌ "Test the hotkey functionality"
- ❌ "User should confirm the UI renders"

**Write scenarios like this instead:**
- ✅ `Run npm run tauri dev → Press Ctrl+Alt+A → Type "hello world" → Press Enter → Assert translation window shows Chinese translation`
- ✅ `Start app → Press Ctrl+Alt+S → Draw rectangle selection → Assert OCR result text contains expected words`
- ✅ `Run cargo test → Assert all tests pass with 0 failures`

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.

```
Wave 1 (Project Foundation):
├── Task 1: Tauri project setup with React
└── Task 2: Development environment setup

Wave 2 (UI Framework):
├── Task 3: Main window and UI structure
├── Task 4: Translation result display component
└── Task 5: Settings interface

Wave 3 (Backend Services):
├── Task 6: Translation API clients (multiple services)
├── Task 7: Windows OCR integration
└── Task 8: Global hotkey manager

Wave 4 (Integration):
├── Task 9: Input translation flow
├── Task 10: Select text translation flow
├── Task 11: Screenshot translation flow
└── Task 12: History and favorites

Wave 5 (Refinement):
├── Task 13: TTS integration
├── Task 14: Performance optimization
└── Task 15: Windows build and packaging

Critical Path: 1 → 3 → 6 → 9 → 11 → 15
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 6, 7, 8 | 1 |
| 3 | 1 | 9, 10, 11 | 4, 5 |
| 4 | 1 | 9 | 3, 5 |
| 5 | 1 | 9 | 3, 4 |
| 6 | 2 | 9, 10, 11 | 7, 8 |
| 7 | 2 | 11 | 6, 8 |
| 8 | 2 | 9, 10, 11 | 6, 7 |
| 9 | 3, 4, 6 | 12 | 10, 11 |
| 10 | 3, 8 | 12 | 9, 11 |
| 11 | 3, 6, 7 | 12 | 9, 10 |
| 12 | 9, 10, 11 | 13 | None (end of wave) |
| 13 | 6, 12 | 14 | None |
| 14 | All previous | 15 | None |
| 15 | All previous | None | None |

---

## TODOs

> Implementation + Verification = ONE Task. Every task MUST have:
> - Recommended Agent Profile
> - Parallelization info
> - References (pattern/API/docs)
> - Acceptance Criteria (agent-executable)
> - Agent-Executed QA Scenarios (MANDATORY)

- [ ] 1. Initialize Tauri project with React

  **What to do**:
  - Create new Tauri 2.x project using `npm create tauri-app`
  - Configure React 19 + TypeScript + Vite
  - Set up project structure (src/, src-tauri/)
  - Configure Tailwind CSS
  - Add basic dependencies (shadcn/ui, zustand)
  - Verify dev server runs successfully

  **Must NOT do**:
  - No Electron or other desktop frameworks
  - No unnecessary dependencies yet
  - No UI implementation beyond boilerplate

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `quick`
    - Reason: Straightforward project initialization using official scaffolding tools
  - **Skills**: []
    - No specific domain skills needed for project setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5 (UI framework tasks)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - None (new project)

  **API/Type References** (contracts to implement against):
  - Tauri 2.x API: https://v2.tauri.app/start/
  - React 19 API: https://react.dev/

  **Test References**:
  - None (no automated tests)

  **Documentation References** (specs and requirements):
  - Tauri Getting Started: https://v2.tauri.app/start/
  - React + TypeScript Guide: https://react.dev/learn/typescript

  **External References** (libraries and frameworks):
  - Tauri official docs: https://v2.tauri.app/
  - Vite guide: https://vitejs.dev/guide/
  - Tailwind CSS: https://tailwindcss.com/docs/installation
  - Zustand: https://zustand-demo.pmnd.rs/

  **WHY Each Reference Matters**:
  - Tauri official docs provides the correct initialization command for v2.x
  - React 19 docs ensures we use latest features
  - Vite guide explains configuration for TypeScript
  - Tailwind docs shows CSS framework setup
  - Zustand docs provides state management patterns

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Project directory created with src/ and src-tauri/ structure
  - [ ] package.json contains tauri@^2.x, react@^19, typescript, vite dependencies
  - [ ] npm run tauri dev → App window opens, shows "Hello Tauri" or similar
  - [ ] npm run tauri build → Compiles without errors (may not produce final installer yet)

  **Agent-Executed QA Scenarios (MANDATORY — per-scenario, ultra-detailed):**

  \`\`\`
  Scenario: Tauri project initializes and runs
    Tool: Bash
    Preconditions: Node.js 20+ installed, Rust toolchain installed
    Steps:
      1. npm create tauri-app@latest dict-win -- --template react-ts
      2. cd dict-win
      3. npm install
      4. npm run tauri dev
      5. Wait 15 seconds for window to open
      6. Assert process is running (check for "Tauri" or app window title in process list)
      7. Press Ctrl+C to stop
    Expected Result: Tauri development server starts, app window opens
    Failure Indicators: Build errors, "command not found", process exits immediately
    Evidence: Terminal output captured to .sisyphus/evidence/task-1-init.txt
  \`\`\`

  \`\`\`
  Scenario: Project structure is correct
    Tool: Bash
    Preconditions: Project initialized
    Steps:
      1. ls -la
      2. Assert directory "src" exists
      3. Assert directory "src-tauri" exists
      4. Assert file "package.json" exists
      5. cat package.json | grep -q '"tauri"'
      6. cat package.json | grep -q '"react"'
      7. cat package.json | grep -q '"typescript"'
    Expected Result: All expected directories and files present with correct dependencies
    Failure Indicators: Missing directories, missing dependencies in package.json
    Evidence: Directory listing captured to .sisyphus/evidence/task-1-structure.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Terminal output from initialization and dev server
  - [ ] Directory listing showing project structure
  - [ ] package.json content for verification

  **Commit**: NO
  - (Will commit after Task 2 environment setup)

- [ ] 2. Set up development environment and dependencies

  **What to do**:
  - Install Rust toolchain (if not present)
  - Install Node.js dependencies from package.json
  - Configure Windows SDK for OCR access
  - Set up ESLint and Prettier for code formatting
  - Configure Git (initialize repository, .gitignore)
  - Verify all tooling works (cargo, node, npm)

  **Must NOT do**:
  - No production build yet
  - No UI implementation
  - No external API keys (use placeholders)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `quick`
    - Reason: Standard environment setup, well-documented process
  - **Skills**: []
    - No specialized skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 6, 7, 8 (backend services require tooling)
  - **Blocked By**: None (can run independently of Task 1)

  **References**:

  **Pattern References**:
  - None (new project)

  **API/Type References**:
  - Rust toolchain: https://www.rust-lang.org/tools/install
  - Windows SDK: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

  **Documentation References**:
  - Tauri Prerequisites: https://v2.tauri.app/start/prerequisites
  - Windows 10/11 SDK requirements for OCR

  **External References**:
  - Rust installation guide
  - ESLint configuration guide
  - Prettier configuration guide

  **WHY Each Reference Matters**:
  - Rust toolchain guide ensures correct installation for Windows
  - Windows SDK docs explain which components needed for OCR
  - Tauri prerequisites list ensures all required tools present
  - ESLint/Prettier guides provide standard linting configurations

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] rustc --version shows installed version (1.75+)
  - [ ] cargo --version shows installed version
  - [ ] npm --version shows installed version (20+)
  - [ ] node --version shows installed version (20+)
  - [ ] .gitignore file exists with appropriate exclusions
  - [ ] npm install completes without errors
  - [ ] cargo build in src-tauri/ completes without errors

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Development tools are installed
    Tool: Bash
    Preconditions: None
    Steps:
      1. rustc --version
      2. Assert output matches format "rustc X.Y.Z"
      3. cargo --version
      4. Assert output matches format "cargo X.Y.Z"
      5. node --version
      6. Assert output matches format "vX.Y.Z"
      7. npm --version
      8. Assert output matches format "X.Y.Z"
    Expected Result: All tools show version numbers, no "command not found" errors
    Failure Indicators: Any command returns "not found" or error
    Evidence: Version outputs captured to .sisyphus/evidence/task-2-tools.txt
  \`\`\`

  \`\`\`
  Scenario: Dependencies install successfully
    Tool: Bash
    Preconditions: Project initialized (Task 1)
    Steps:
      1. npm install
      2. Assert exit code is 0
      3. Assert node_modules/ directory exists
      4. cd src-tauri
      5. cargo build
      6. Assert exit code is 0
      7. Assert target/ directory exists
    Expected Result: All npm and cargo dependencies install successfully
    Failure Indicators: Install errors, missing directories
    Evidence: Build logs captured to .sisyphus/evidence/task-2-install.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Tool version outputs
  - [ ] npm install logs
  - [ ] cargo build logs
  - [ ] .gitignore content

  **Commit**: YES
  - Message: `chore: initialize project and setup environment`
  - Files: All initial project files
  - Pre-commit: `npm run tauri build` (dry run check)

- [ ] 3. Build main application window and UI structure

  **What to do**:
  - Create main App.tsx with floating window design
  - Implement window controls (minimize, close)
  - Set up window positioning and sizing (floating, resizable)
  - Create basic layout structure (header, content, footer)
  - Configure Tauri window properties (transparent, always-on-top option)
  - Implement window theme (dark/light mode support)

  **Must NOT do**:
  - No translation logic yet
  - No OCR functionality
  - No API integration

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `visual-engineering`
    - Reason: UI/UX design, floating window, window behavior
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Expertise in creating polished, production-grade UI
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for UI construction, only for testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 9, 10, 11 (translation flows depend on UI)
  - **Blocked By**: Task 1 (needs Tauri project setup)

  **References**:

  **Pattern References**:
  - Easydict design inspiration: https://github.com/tisfeng/Easydict
  - Tauri window API: https://v2.tauri.app/reference/javascript/api/namespacewindow/

  **API/Type References**:
  - Tauri Window API: window positioning, transparency, always-on-top
  - React hooks: useState, useEffect for window management

  **Documentation References**:
  - Tauri Window configuration: https://v2.tauri.app/reference/javascript/api/namespacewindow/
  - Tailwind CSS for styling

  **External References**:
  - Shadcn/ui components: https://ui.shadcn.com/
  - React window management patterns

  **WHY Each Reference Matters**:
  - Easydict provides visual reference for floating window design
  - Tauri window API docs show correct properties for floating window
  - Tailwind enables responsive, styled UI quickly
  - Shadcn/ui provides pre-built components for modern UI

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] App launches with floating window (not maximized)
  - [ ] Window is resizable and draggable
  - [ ] Window has minimal header (or no header borderless)
  - [ ] Window displays "Dictionary App" or similar title
  - [ ] Close button works (window closes)
  - [ ] Window has basic layout structure (header/content areas visible)
  - [ ] npm run tauri dev shows window with all UI elements

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Main window opens and displays
    Tool: Bash
    Preconditions: Project setup complete, dev server ready
    Steps:
      1. npm run tauri dev
      2. Wait 15 seconds for window to appear
      3. Assert window process is running
      4. Take screenshot (if possible) or verify window exists in process list
      5. Press Ctrl+C to stop dev server
    Expected Result: Window opens, displays basic UI structure
    Failure Indicators: Window doesn't open, crash on startup
    Evidence: Screenshot or process list captured to .sisyphus/evidence/task-3-window.png
  \`\`\`

  \`\`\`
  Scenario: Window is interactive
    Tool: Manual observation (since Playwright may not access Tauri window)
    Tool fallback: Bash (process verification)
    Preconditions: App window is open
    Steps:
      1. Verify window is visible on screen
      2. Verify window can be dragged (if test allows)
      3. Verify window can be resized (if test allows)
      4. Close window using X button
      5. Assert process exits cleanly
    Expected Result: Window responds to user interactions
    Failure Indicators: Window frozen, can't close, crashes
    Evidence: Notes captured to .sisyphus/evidence/task-3-interaction.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Screenshot of main window
  - [ ] Window property verification logs

  **Commit**: NO
  - (Will commit after completing Wave 2 tasks)

- [ ] 4. Create translation result display component

  **What to do**:
  - Build TranslationResult component to display translated text
  - Support multiple translation services (show results side-by-side)
  - Include source text display
  - Add copy-to-clipboard button
  - Add TTS button (placeholder for now)
  - Implement loading states for translation in progress
  - Style with Shadcn/ui components and Tailwind CSS

  **Must NOT do**:
  - No actual API calls yet (use mock data)
  - No OCR integration
  - No hotkey handling

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `visual-engineering`
    - Reason: UI component design, React components, styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Expertise in creating polished UI components

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Tasks 9, 10, 11 (translation flows need display component)
  - **Blocked By**: Task 1 (needs React setup)

  **References**:

  **Pattern References**:
  - Easydict translation display: https://github.com/tisfeng/Easydict
  - Shadcn/ui components: Card, Button, Badge

  **API/Type References**:
  - React component patterns: props, state, useEffect
  - Zustand for translation results state management

  **Documentation References**:
  - React component best practices
  - Tailwind CSS utility classes

  **External References**:
  - Shadcn/ui component library: https://ui.shadcn.com/
  - React component examples from Easydict

  **WHY Each Reference Matters**:
  - Easydict provides visual reference for translation result layout
  - Shadcn/ui gives pre-built, styled components
  - React patterns show proper state management for async results
  - Tailwind enables consistent styling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] TranslationResult component exists in src/components/
  - [ ] Component displays source text and translated text
  - [ ] Component supports multiple service results (at least 2 mock services)
  - [ ] Copy button exists and copies text to clipboard
  - [ ] TTS button exists (placeholder behavior)
  - [ ] Loading state displays during mock translation
  - [ ] Component renders without errors in dev server

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Translation result component renders
    Tool: Bash
    Preconditions: App running with TranslationResult component added
    Steps:
      1. npm run tauri dev
      2. Wait for window to open
      3. Verify component appears in window (inspect DOM if possible)
      4. Assert no console errors in dev server output
      5. Press Ctrl+C to stop
    Expected Result: Component renders without errors
    Failure Indicators: Console errors, component not visible
    Evidence: Console output captured to .sisyphus/evidence/task-4-render.txt
  \`\`\`

  \`\`\`
  Scenario: Component displays mock data
    Tool: Manual verification + Bash
    Preconditions: Component with mock data rendered
    Steps:
      1. Verify source text displays correctly
      2. Verify translation text displays correctly
      3. Verify multiple services show (mock OpenAI, mock DeepL)
      4. Click copy button
      5. Verify clipboard contains translation (check via PowerShell: Get-Clipboard)
      6. Click TTS button (verify it doesn't crash)
    Expected Result: All UI elements functional with mock data
    Failure Indicators: Missing elements, copy fails, crashes
    Evidence: Notes and clipboard content captured to .sisyphus/evidence/task-4-mock.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Component screenshot
  - [ ] Console output for errors
  - [ ] Clipboard content after copy action

  **Commit**: NO
  - (Will commit after completing Wave 2 tasks)

- [ ] 5. Implement settings and configuration interface

  **What to do**:
  - Create Settings component with tabs/sections
  - Add translation service configuration (API key inputs, enable/disable toggles)
  - Add hotkey configuration (editable shortcuts)
  - Add language selection preferences
  - Add app appearance settings (theme, window opacity)
  - Integrate Tauri Store for saving/loading settings
  - Create default configuration

  **Must NOT do**:
  - No actual API validation yet
  - No hotkey registration (UI only)
  - No external service connections

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `visual-engineering`
    - Reason: Settings UI design, form handling, state management
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Expertise in creating polished UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Tasks 9, 10, 11 (translation flows may need config)
  - **Blocked By**: Task 1 (needs React setup)

  **References**:

  **Pattern References**:
  - Easydict settings: https://github.com/tisfeng/Easydict
  - Tauri Store API: https://v2.tauri.app/plugin/store/

  **API/Type References**:
  - Tauri Store plugin: get(), set(), save()
  - React Hook Form: form handling (if used)

  **Documentation References**:
  - Tauri Store plugin documentation
  - Form validation patterns (React Hook Form or similar)

  **External References**:
  - Shadcn/ui form components: Input, Toggle, Select, Tabs

  **WHY Each Reference Matters**:
  - Tauri Store provides persistent storage for settings
  - Easydict settings shows common configuration patterns
  - React Hook Form or similar handles form state and validation
  - Shadcn/ui provides styled form components

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Settings component exists in src/components/Settings/
  - [ ] Settings can be opened (via menu or button)
  - [ ] API key input fields exist for at least 2 services
  - [ ] Toggle switches for enabling/disabling services
  - [ ] Hotkey configuration displays (Ctrl+Alt+A, etc.)
  - [ ] Settings persist to Tauri Store and reload on app restart
  - [ ] Default configuration applied on first run

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Settings UI renders and functions
    Tool: Bash + Manual verification
    Preconditions: App running
    Steps:
      1. Open settings (via menu button or shortcut)
      2. Verify API key input field is visible
      3. Enter test API key "sk-test-12345"
      4. Click save
      5. Restart app
      6. Open settings
      7. Verify API key is still present
    Expected Result: Settings persist across app restarts
    Failure Indicators: Settings lost on restart, UI errors
    Evidence: Screenshot and notes captured to .sisyphus/evidence/task-5-settings.txt
  \`\`\`

  \`\`\`
  Scenario: Default configuration applied
    Tool: Bash
    Preconditions: Fresh app installation (or clear Tauri Store)
    Steps:
      1. Delete Tauri Store data (if exists)
      2. Start app
      3. Open settings
      4. Verify default hotkeys are set (Ctrl+Alt+A, etc.)
      5. Verify default services are enabled
    Expected Result: Default configuration applied correctly
    Failure Indicators: Empty settings, wrong defaults
    Evidence: Settings content captured to .sisyphus/evidence/task-5-defaults.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Settings screenshots
  - [ ] Tauri Store file content (for verification)

  **Commit**: YES
  - Message: `feat: implement UI framework (main window, translation display, settings)`
  - Files: src/components/, src/App.tsx
  - Pre-commit: `npm run tauri dev` (brief smoke test)

- [ ] 6. Implement translation API clients (multiple services)

  **What to do**:
  - Create translation service layer in Rust (src-tauri/src/translate/)
  - Implement OpenAI API client (GPT-4, GPT-3.5)
  - Implement DeepL API client
  - Implement Google Translate API client
  - Create translation service trait/interface for extensibility
  - Add error handling and rate limiting
  - Implement parallel translation requests (call all enabled services)
  - Create Tauri command to expose translation to frontend

  **Must NOT do**:
  - No hardcoded API keys (use config from settings)
  - No blocking synchronous calls (all async)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: Multiple API integrations, async Rust code, error handling
  - **Skills**: [`senior-backend`]
    - `senior-backend`: Expertise in API clients, async programming, error handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Tasks 9, 10, 11 (translation flows depend on API clients)
  - **Blocked By**: Task 2 (needs Rust toolchain and dependencies)

  **References**:

  **Pattern References**:
  - Easydict translation service: https://github.com/tisfeng/Easydict/tree/main/Easydict/Service
  - Rust async patterns: tokio, reqwest

  **API/Type References**:
  - OpenAI API: https://platform.openai.com/docs/api-reference/chat
  - DeepL API: https://www.deepl.com/docs-api/
  - Google Translate API: https://cloud.google.com/translate/docs/reference/rest

  **Documentation References**:
  - Tokio async runtime: https://tokio.rs/
  - Reqwest HTTP client: https://docs.rs/reqwest/

  **External References**:
  - OpenAI API examples (Rust)
  - DeepL API examples (Rust)
  - Google Translate API examples (Rust)

  **WHY Each Reference Matters**:
  - Easydict shows translation service architecture patterns
  - OpenAI/DeepL/Google docs specify API contracts and authentication
  - Tokio and reqwest are standard Rust async tools
  - Examples show correct request/response handling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Translation service module exists in src-tauri/src/translate/
  - [ ] OpenAI API client implemented and compiles
  - [ ] DeepL API client implemented and compiles
  - [ ] Google Translate API client implemented and compiles
  - [ ] Cargo test passes for translation module
  - [ ] Tauri command "translate" exposes translation function to frontend
  - [ ] Parallel translation works (all services called simultaneously)

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Translation clients compile successfully
    Tool: Bash
    Preconditions: Rust toolchain installed
    Steps:
      1. cd src-tauri
      2. cargo build
      3. Assert exit code is 0
      4. Assert no compilation errors in translate/ module
    Expected Result: All translation clients compile without errors
    Failure Indicators: Compilation errors, missing dependencies
    Evidence: Build output captured to .sisyphus/evidence/task-6-compile.txt
  \`\`\`

  \`\`\`
  Scenario: Translation command exists and callable
    Tool: Bash
    Preconditions: App running with translation module
    Steps:
      1. npm run tauri dev
      2. Open browser console (if frontend accessible) or check logs
      3. Invoke translate command from frontend (or via test)
      4. Assert command executes without error
      5. Assert response structure matches expected format
    Expected Result: Translation command is callable and returns valid response
    Failure Indicators: Command not found, malformed response
    Evidence: Logs captured to .sisyphus/evidence/task-6-command.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Cargo build output
  - [ ] Translation command invocation logs
  - [ ] Test results (if cargo test implemented)

  **Commit**: NO
  - (Will commit after completing Wave 3 tasks)

- [ ] 7. Integrate Windows OCR API

  **What to do**:
  - Add Windows OCR dependencies to Cargo.toml (windows-rs crate)
  - Create OCR module in Rust (src-tauri/src/ocr/)
  - Implement screenshot capture using Windows APIs
  - Implement Windows OCR API integration for text recognition
  - Support language detection (auto-detect Chinese/English)
  - Add Tesseract.js as fallback (via npm package in frontend)
  - Create Tauri command to expose OCR to frontend
  - Implement error handling (OCR fails → fallback to Tesseract)

  **Must NOT do**:
  - No hardcoded file paths
  - No blocking UI during OCR processing

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: Windows-specific APIs, FFI, system integration
  - **Skills**: [`senior-backend`]
    - `senior-backend`: Expertise in system integration, API handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: Task 11 (screenshot translation depends on OCR)
  - **Blocked By**: Task 2 (needs Windows SDK and Rust toolchain)

  **References**:

  **Pattern References**:
  - Easydict OCR: https://github.com/tisfeng/Easydict/tree/main/Easydict/ObjectManager
  - Windows OCR API samples

  **API/Type References**:
  - Windows OCR API: https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine
  - windows-rs crate: https://docs.rs/windows/latest/windows/
  - Tesseract.js: https://tesseract.projectnaptha.com/

  **Documentation References**:
  - Windows OCR API guide
  - windows-rs documentation
  - Tesseract.js API reference

  **External References**:
  - Rust Windows API examples
  - Tesseract.js usage examples

  **WHY Each Reference Matters**:
  - Windows OCR API docs show correct initialization and usage
  - windows-rs provides Rust bindings for Windows APIs
  - Tesseract.js is fallback solution
  - Examples show correct error handling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] OCR module exists in src-tauri/src/ocr/
  - [ ] Windows OCR dependencies added to Cargo.toml
  - [ ] Screenshot capture function implemented
  - [ ] Windows OCR API integration implemented
  - [ ] Tesseract.js npm package added as fallback
  - [ ] Tauri command "ocr" exposes OCR function
  - [ ] OCR recognizes text from screenshot with >90% accuracy (basic test)

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: OCR module compiles
    Tool: Bash
    Preconditions: Windows SDK installed
    Steps:
      1. cd src-tauri
      2. cargo build
      3. Assert exit code is 0
      4. Assert no compilation errors in ocr/ module
    Expected Result: OCR module compiles successfully
    Failure Indicators: Compilation errors, missing Windows APIs
    Evidence: Build output captured to .sisyphus/evidence/task-7-compile.txt
  \`\`\`

  \`\`\`
  Scenario: OCR recognizes text from screenshot
    Tool: Bash
    Preconditions: App running with OCR module
    Steps:
      1. Create a test image with known text (e.g., "Hello World 123")
      2. Invoke OCR command from frontend or test
      3. Assert recognized text contains "Hello" and "World"
      4. Assert accuracy > 80% for basic test
    Expected Result: OCR recognizes text from test image
    Failure Indicators: Empty result, very low accuracy
    Evidence: OCR result captured to .sisyphus/evidence/task-7-result.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Cargo build output
  - [ ] OCR recognition results
  - [ ] Screenshot of test image (if applicable)

  **Commit**: NO
  - (Will commit after completing Wave 3 tasks)

- [ ] 8. Implement global hotkey manager

  **What to do**:
  - Add global hotkey dependencies to Cargo.toml (global-hotkey crate)
  - Create hotkey module in Rust (src-tauri/src/hotkey/)
  - Implement default hotkeys:
    - Ctrl+Alt+A: Input translation
    - Ctrl+Alt+D: Select text translation
    - Ctrl+Alt+S: Screenshot translation
    - Ctrl+Alt+Shift+S: Silent screenshot OCR
  - Add hotkey registration/unregistration functions
  - Allow hotkey customization from settings
  - Create Tauri command to set hotkey bindings
  - Ensure hotkeys work when app is in background (global)

  **Must NOT do**:
  - No hardcoded hotkeys (all configurable)
  - No conflicts with system hotkeys

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: System-level hotkey registration, event handling
  - **Skills**: [`senior-backend`]
    - `senior-backend`: Expertise in system integration, event handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocks**: Tasks 9, 10, 11 (all translation flows need hotkeys)
  - **Blocked By**: Task 2 (needs Rust toolchain)

  **References**:

  **Pattern References**:
  - Easydict hotkey implementation: https://github.com/tisfeng/Easydict
  - Rust global-hotkey crate examples

  **API/Type References**:
  - global-hotkey crate: https://docs.rs/global-hotkey/
  - Tauri global shortcut: https://v2.tauri.app/plugin/global-shortcut/

  **Documentation References**:
  - global-hotkey crate documentation
  - Windows hotkey registration patterns

  **External References**:
  - Rust hotkey handling examples
  - Easydict hotkey configuration

  **WHY Each Reference Matters**:
  - global-hotkey crate provides cross-platform hotkey registration
  - Easydict shows hotkey UX patterns
  - Windows hotkey docs explain system-level registration
  - Examples show correct event handling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Hotkey module exists in src-tauri/src/hotkey/
  - [ ] global-hotkey dependency added to Cargo.toml
  - [ ] Default hotkeys are registered on app start
  - [ ] Tauri command "set_hotkey" allows customization
  - [ ] Hotkeys trigger when app is in background
  - [ ] Hotkeys unregistered correctly when disabled

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Hotkeys are registered and trigger
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Start app with dev server
      2. Press Ctrl+Alt+A (input translation hotkey)
      3. Assert app window appears or activates
      4. Press Ctrl+Alt+S (screenshot hotkey)
      5. Assert screenshot mode activates
    Expected Result: Hotkeys trigger correct actions
    Failure Indicators: Hotkeys don't trigger, crashes
    Evidence: Logs captured to .sisyphus/evidence/task-8-hotkey.txt
  \`\`\`

  \`\`\`
  Scenario: Hotkeys work when app is in background
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Start app
      2. Minimize or switch to another window
      3. Press Ctrl+Alt+A
      4. Assert app window comes to foreground
      5. Assert translation input is ready
    Expected Result: Global hotkeys work system-wide
    Failure Indicators: Hotkeys only work when app is focused
    Evidence: Notes captured to .sisyphus/evidence/task-8-background.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Hotkey registration logs
  - [ ] Hotkey trigger events

  **Commit**: YES
  - Message: `feat: implement backend services (translation, OCR, hotkeys)`
  - Files: src-tauri/src/translate/, src-tauri/src/ocr/, src-tauri/src/hotkey/
  - Pre-commit: `cargo test` (verify all modules compile)

- [ ] 9. Implement input translation flow

  **What to do**:
  - Create InputTranslation component
  - On hotkey trigger (Ctrl+Alt+A), show input window
  - Add text input field for user to enter text
  - Add language detection (auto-detect Chinese/English)
  - Add target language selector (default to opposite of detected)
  - Call translation API(s) on Enter key
  - Display results in TranslationResult component
  - Add to translation history
  - Close input window on escape or click outside

  **Must NOT do**:
  - No blocking UI during translation (show loading state)
  - No hardcoded API keys (use from settings)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: Integration of multiple systems (UI + API + state)
  - **Skills**: [`frontend-ui-ux`, `senior-backend`]
    - `frontend-ui-ux`: Input UI design, user interactions
    - `senior-backend`: API integration, state management

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential with Tasks 10, 11)
  - **Blocks**: Task 12 (history needs input translations)
  - **Blocked By**: Tasks 3, 4, 6 (UI, display, API clients)

  **References**:

  **Pattern References**:
  - Easydict input translation: https://github.com/tisfeng/Easydict
  - React form handling patterns

  **API/Type References**:
  - Tauri translate command (from Task 6)
  - Zustand state for input flow

  **Documentation References**:
  - React event handling (onChange, onSubmit)
  - Language detection libraries

  **External References**:
  - Easydict input translation UI reference
  - LangDetect or similar for language detection

  **WHY Each Reference Matters**:
  - Easydict shows correct UX pattern for input translation
  - Tauri translate command is the backend service to call
  - React event patterns ensure correct form handling
  - Language detection library provides accurate language detection

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] InputTranslation component exists
  - [ ] Ctrl+Alt+A triggers input window
  - [ ] Text input field accepts user input
  - [ ] Language auto-detection works (detects Chinese vs English)
  - [ ] Target language selector defaults correctly
  - [ ] Enter key triggers translation
  - [ ] Translation results display in TranslationResult component
  - [ ] Translation added to history
  - [ ] Escape key or click outside closes input window

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Input translation flow works end-to-end
    Tool: Bash + Manual verification
    Preconditions: App running, API keys configured
    Steps:
      1. Start app
      2. Press Ctrl+Alt+A
      3. Assert input window appears
      4. Type "Hello, world!" in input field
      5. Press Enter
      6. Wait for translation (up to 10 seconds)
      7. Assert Chinese translation appears in results
      8. Assert translation result component is visible
    Expected Result: Input text is translated and displayed
    Failure Indicators: Translation fails, no result displayed, crash
    Evidence: Screenshot and notes captured to .sisyphus/evidence/task-9-input.txt
  \`\`\`

  \`\`\`
  Scenario: Language auto-detection works
    Tool: Manual verification
    Preconditions: App running
    Steps:
      1. Press Ctrl+Alt+A
      2. Type "你好世界" (Chinese)
      3. Press Enter
      4. Assert target language is English
      5. Assert translation is in English
      6. Press Ctrl+Alt+A again
      7. Type "Hello world" (English)
      8. Press Enter
      9. Assert target language is Chinese
    Expected Result: Language is correctly detected and translation direction set
    Failure Indicators: Wrong language detection, wrong translation direction
    Evidence: Notes captured to .sisyphus/evidence/task-9-language.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Screenshots of input window and results
  - [ ] Translation history entries

  **Commit**: NO
  - (Will commit after completing Wave 4 tasks)

- [ ] 10. Implement select text translation flow

  **What to do**:
  - Implement clipboard monitoring (background check for changes)
  - When text is selected and copied, detect selection
  - Show floating "Translate" button near cursor (optional) OR
  - Use hotkey (Ctrl+Alt+D) to translate selected text
  - Read clipboard content
  - Detect language and determine target
  - Call translation API(s)
  - Display results in TranslationResult component
  - Add to translation history
  - Handle different text lengths (short words vs paragraphs)

  **Must NOT do**:
  - No excessive clipboard polling (respect system resources)
  - No interfering with other clipboard operations

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: System-level clipboard monitoring, event coordination
  - **Skills**: [`senior-backend`]
    - `senior-backend`: System integration, clipboard handling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential with Tasks 9, 11)
  - **Blocks**: Task 12 (history needs select translations)
  - **Blocked By**: Tasks 3, 8 (UI, hotkey manager)

  **References**:

  **Pattern References**:
  - Easydict select translation: https://github.com/tisfeng/Easydict
  - Rust clipboard monitoring patterns

  **API/Type References**:
  - Rust clipboard crate: https://docs.rs/clipboard/
  - Tauri translate command

  **Documentation References**:
  - Clipboard monitoring best practices
  - Windows clipboard API usage

  **External References**:
  - Rust clipboard crate examples
  - Easydict select translation UX

  **WHY Each Reference Matters**:
  - Easydict shows correct UX for select translation
  - Clipboard crate provides cross-platform clipboard access
  - Windows clipboard API shows efficient monitoring patterns
  - Examples show correct event handling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Clipboard monitoring implemented
  - [ ] Ctrl+Alt+D triggers translation of clipboard content
  - [ ] Selected text (copied) is translated correctly
  - [ ] Language detection works for clipboard text
  - [ ] Translation results display correctly
  - [ ] Translation added to history
  - [ ] No performance issues (app remains responsive)

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Select translation works with hotkey
    Tool: Bash + Manual verification
    Preconditions: App running, API keys configured
    Steps:
      1. Copy text "Hello, world!" to clipboard (Ctrl+C)
      2. Press Ctrl+Alt+D
      3. Wait for translation (up to 10 seconds)
      4. Assert translation window appears
      5. Assert Chinese translation is displayed
    Expected Result: Clipboard content is translated
    Failure Indicators: Translation fails, no window appears, crash
    Evidence: Screenshot and notes captured to .sisyphus/evidence/task-10-select.txt
  \`\`\`

  \`\`\`
  Scenario: Clipboard monitoring doesn't interfere
    Tool: Manual verification
    Preconditions: App running in background
    Steps:
      1. Copy various texts to clipboard (short, long, Chinese, English)
      2. Verify no lag or performance issues
      3. Verify other clipboard operations work (paste in other apps)
      4. Verify app doesn't constantly show translation window
    Expected Result: Clipboard monitoring is non-intrusive
    Failure Indicators: Lag, frequent popups, other apps affected
    Evidence: Notes captured to .sisyphus/evidence/task-10-clipboard.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Screenshots of translation window
  - [ ] Clipboard test notes
  - [ ] Performance observations

  **Commit**: NO
  - (Will commit after completing Wave 4 tasks)

- [ ] 11. Implement screenshot translation flow

  **What to do**:
  - Create screenshot capture UI (region selection overlay)
  - On hotkey trigger (Ctrl+Alt+S), show selection overlay
  - Allow user to drag and select region
  - Capture screenshot of selected region
  - Pass screenshot to OCR service
  - Receive OCR text
  - Call translation API(s) with OCR text
  - Display OCR text and translation in TranslationResult component
  - Add to translation history
  - Implement silent screenshot OCR (Ctrl+Alt+Shift+S) - copy to clipboard only

  **Must NOT do**:
  - No blocking UI during OCR (show loading state)
  - No failing silently if OCR errors

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: Complex UI + OCR + translation integration
  - **Skills**: [`frontend-ui-ux`, `senior-backend`]
    - `frontend-ui-ux`: Selection overlay UI design
    - `senior-backend`: OCR and API integration

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential with Tasks 9, 10)
  - **Blocks**: Task 12 (history needs screenshot translations)
  - **Blocked By**: Tasks 3, 6, 7 (UI, API clients, OCR)

  **References**:

  **Pattern References**:
  - Easydict screenshot translation: https://github.com/tisfeng/Easydict
  - Screenshot capture UI patterns

  **API/Type References**:
  - Tauri OCR command (from Task 7)
  - Tauri translate command (from Task 6)

  **Documentation References**:
  - Windows screenshot capture APIs
  - Selection overlay UI patterns

  **External References**:
  - Easydict screenshot UI reference
  - Rust screenshot capture examples

  **WHY Each Reference Matters**:
  - Easydict shows correct UX for screenshot translation
  - Tauri OCR command provides text recognition
  - Screenshot capture patterns show efficient region selection
  - Examples show correct overlay UI implementation

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Screenshot capture UI exists
  - [ ] Ctrl+Alt+S triggers selection overlay
  - [ ] User can drag to select region
  - [ ] Screenshot is captured of selected region
  - [ ] OCR recognizes text from screenshot
  - [ ] OCR text is translated correctly
  - [ ] OCR text and translation are both displayed
  - [ ] Translation added to history
  - [ ] Ctrl+Alt+Shift+S copies OCR text to clipboard silently

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Screenshot translation works end-to-end
    Tool: Bash + Manual verification
    Preconditions: App running, API keys configured, screen has text
    Steps:
      1. Prepare screen with text (e.g., open browser with "Hello World")
      2. Press Ctrl+Alt+S
      3. Assert selection overlay appears
      4. Drag to select text region
      5. Release mouse
      6. Wait for OCR and translation (up to 15 seconds)
      7. Assert translation window appears
      8. Assert OCR text is displayed
      9. Assert translation is displayed
    Expected Result: Screenshot OCR + translation work correctly
    Failure Indicators: OCR fails, translation fails, UI errors, crash
    Evidence: Screenshot and notes captured to .sisyphus/evidence/task-11-screenshot.txt
  \`\`\`

  \`\`\`
  Scenario: Silent screenshot OCR copies to clipboard
    Tool: Bash + Manual verification
    Preconditions: App running, screen has text
    Steps:
      1. Prepare screen with text
      2. Press Ctrl+Alt+Shift+S
      3. Assert selection overlay appears
      4. Drag to select text region
      5. Release mouse
      6. Wait for OCR (up to 10 seconds)
      7. Paste into text editor (Ctrl+V)
      8. Assert OCR text is pasted
      9. Assert no translation window appears
    Expected Result: Silent OCR copies text to clipboard, no popup
    Failure Indicators: Translation window appears, text not copied
    Evidence: Notes captured to .sisyphus/evidence/task-11-silent.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Screenshots of selection overlay and results
  - [ ] Clipboard content after silent OCR

  **Commit**: YES
  - Message: `feat: implement translation flows (input, select, screenshot)`
  - Files: src/components/InputTranslation/, src/components/SelectTranslation/, src/components/ScreenshotTranslation/
  - Pre-commit: `npm run tauri dev` (smoke test all flows)

- [ ] 12. Implement history and favorites management

  **What to do**:
  - Create history store using Tauri Store
  - Store translation history (source, target, timestamp, service)
  - Create History component to display past translations
  - Add search/filter functionality for history
  - Implement favorites/bookmark feature
  - Create Favorites component
  - Allow re-translation from history/favorites
  - Add delete individual items and clear all
  - Persist history and favorites across app restarts

  **Must NOT do**:
  - No unbounded history growth (limit to e.g., 1000 items)
  - No slow history lookup (use efficient data structures)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-low`
    - Reason: Standard CRUD operations, UI display
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: History/favorites UI design

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential, depends on all translation flows)
  - **Blocks**: Tasks 13, 14 (refinement tasks)
  - **Blocked By**: Tasks 9, 10, 11 (need translation data to store)

  **References**:

  **Pattern References**:
  - Easydict history: https://github.com/tisfeng/Easydict
  - React state management with Zustand

  **API/Type References**:
  - Tauri Store API: get(), set(), save()
  - Zustand store patterns

  **Documentation References**:
  - Tauri Store plugin docs
  - React local storage patterns

  **External References**:
  - Easydict history UI reference

  **WHY Each Reference Matters**:
  - Easydict shows history/favorites UX patterns
  - Tauri Store provides persistent storage
  - Zustand manages client-side state efficiently

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] History store implemented with Tauri Store
  - [ ] History component displays past translations
  - [ ] History persists across app restarts
  - [ ] History is limited (e.g., 1000 items max)
  - [ ] Favorites feature works (add/remove)
  - [ ] Search/filter functionality works
  - [ ] Delete individual items works
  - [ ] Clear all history works

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: History persists and displays correctly
    Tool: Bash + Manual verification
    Preconditions: App running, some translations done
    Steps:
      1. Perform 3-5 translations using different flows
      2. Open history component
      3. Assert all translations appear in history
      4. Close and restart app
      5. Open history component again
      6. Assert history items still present
    Expected Result: History persists across restarts
    Failure Indicators: History lost on restart, missing items
    Evidence: Screenshot and notes captured to .sisyphus/evidence/task-12-history.txt
  \`\`\`

  \`\`\`
  Scenario: Favorites functionality works
    Tool: Manual verification
    Preconditions: App running, history has items
    Steps:
      1. Open history component
      2. Click "favorite" icon on 2-3 items
      3. Open favorites component
      4. Assert favorited items appear
      5. Click "unfavorite" on 1 item
      6. Assert item removed from favorites
    Expected Result: Favorites add/remove works correctly
    Failure Indicators: Favorites don't persist, wrong items
    Evidence: Notes captured to .sisyphus/evidence/task-12-favorites.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] History screenshots
  - [ ] Favorites screenshots
  - [ ] Tauri Store data file content (for verification)

  **Commit**: YES
  - Message: `feat: implement history and favorites`
  - Files: src/components/History/, src/components/Favorites/, src/stores/
  - Pre-commit: None (no automated tests)

- [ ] 13. Integrate TTS (Text-to-Speech) functionality

  **What to do**:
  - Implement TTS in Rust using Windows Speech API
  - Add TTS command to Tauri backend
  - Add TTS button to TranslationResult component
  - Support multiple voices (English, Chinese)
  - Allow voice selection in settings
  - Add play/pause/stop controls
  - Handle TTS errors gracefully

  **Must NOT do**:
  - No blocking UI during TTS playback
  - No hardcoded voice selection (use settings)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-low`
    - Reason: Standard Windows API integration
  - **Skills**: [`senior-backend`]
    - `senior-backend`: Windows API integration, async audio handling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential)
  - **Blocks**: Task 14 (optimization may need TTS stable)
  - **Blocked By**: Tasks 4, 6 (display component, translation API)

  **References**:

  **Pattern References**:
  - Easydict TTS: https://github.com/tisfeng/Easydict
  - Windows Speech API examples

  **API/Type References**:
  - Windows Speech API: https://learn.microsoft.com/en-us/uwp/api/windows.media.speechsynthesis.speechsynthesizer

  **Documentation References**:
  - Windows Speech Synthesis documentation
  - Rust Windows API bindings

  **External References**:
  - Rust Windows Speech API examples
  - TTS integration patterns

  **WHY Each Reference Matters**:
  - Windows Speech API provides native TTS capabilities
  - Easydict shows correct TTS UX patterns
  - Rust examples show correct async audio handling

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] TTS module exists in src-tauri/src/tts/
  - [ ] Windows Speech API dependency added
  - [ ] TTS command exposed to frontend
  - [ ] TTS button visible in TranslationResult component
  - [ ] TTS plays English text correctly
  - [ ] TTS plays Chinese text correctly
  - [ ] Voice selection works in settings
  - [ ] Play/pause/stop controls work

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: TTS plays translated text
    Tool: Manual verification
    Preconditions: App running, translation result displayed
    Steps:
      1. Perform a translation (e.g., English to Chinese)
      2. Click TTS button on translation result
      3. Assert audio plays (can hear Chinese speech)
      4. Assert play button changes to stop button
      5. Click stop button
      6. Assert audio stops
    Expected Result: TTS plays translation correctly
    Failure Indicators: No audio, crashes, button doesn't change
    Evidence: Notes captured to .sisyphus/evidence/task-13-tts.txt
  \`\`\`

  \`\`\`
  Scenario: Voice selection works
    Tool: Manual verification
    Preconditions: App running
    Steps:
      1. Open settings
      2. Navigate to TTS voice selection
      3. Select English voice (e.g., "Microsoft David")
      4. Save settings
      5. Translate English text
      6. Click TTS
      7. Assert selected voice is heard
      8. Change to Chinese voice
      9. Translate Chinese text
      10. Assert Chinese voice is heard
    Expected Result: Selected voices are used for TTS
    Failure Indicators: Wrong voice, voice doesn't change
    Evidence: Notes captured to .sisyphus/evidence/task-13-voice.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] TTS audio playback notes
  - [ ] Voice selection settings screenshot

  **Commit**: NO
  - (Will commit after completing Wave 5 tasks)

- [ ] 14. Performance optimization and polish

  **What to do**:
  - Profile app performance (memory usage, CPU usage)
  - Optimize translation API calls (caching, batching)
  - Optimize OCR performance (reduce recognition time)
  - Reduce bundle size (tree-shaking, code splitting)
  - Optimize hotkey registration/unregistration
  - Add loading indicators for all async operations
  - Improve error messages (user-friendly)
  - Add keyboard shortcuts for common actions
  - Polish UI animations and transitions
  - Test on lower-end hardware (if possible)

  **Must NOT do**:
  - No premature optimization (profile first)
  - No breaking existing functionality

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `unspecified-high`
    - Reason: Performance analysis, optimization across multiple areas
  - **Skills**: [`senior-backend`]
    - `senior-backend`: Performance analysis, optimization techniques

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential)
  - **Blocks**: Task 15 (final build needs optimized code)
  - **Blocked By**: All previous tasks (needs complete functionality)

  **References**:

  **Pattern References**:
  - Tauri performance best practices
  - React performance optimization

  **API/Type References**:
  - Tauri performance guidelines
  - React Profiler API

  **Documentation References**:
  - Tauri optimization guide
  - React performance documentation

  **External References**:
  - Vite bundle optimization
  - Rust performance tips

  **WHY Each Reference Matters**:
  - Tauri performance docs show platform-specific optimizations
  - React Profiler identifies performance bottlenecks
  - Vite optimization reduces bundle size
  - Rust tips improve backend performance

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] App memory usage < 100MB (idle)
  - [ ] Translation completes within 5 seconds (OpenAI, DeepL)
  - [ ] OCR completes within 10 seconds (typical screenshot)
  - [ ] Hotkeys respond within 100ms
  - [ ] App startup time < 3 seconds
  - [ ] Bundle size < 10MB (uncompressed)
  - [ ] No obvious UI lag during operations
  - [ ] Loading indicators show during async operations

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: App performance meets targets
    Tool: Bash
    Preconditions: App running
    Steps:
      1. Start app and measure startup time
      2. Check idle memory usage (via Task Manager or similar)
      3. Perform translation and measure time
      4. Perform OCR and measure time
      5. Test hotkey responsiveness
      6. Verify loading indicators appear
    Expected Result: Performance meets all targets
    Failure Indicators: Slow startup, high memory, slow operations
    Evidence: Performance metrics captured to .sisyphus/evidence/task-14-perf.txt
  \`\`\`

  \`\`\`
  Scenario: Bundle size is optimized
    Tool: Bash
    Preconditions: Build complete
    Steps:
      1. npm run tauri build
      2. Navigate to build output directory
      3. Check app.asar or bundle size
      4. Assert size < 10MB (uncompressed)
    Expected Result: Bundle is within size limits
    Failure Indicators: Bundle too large
    Evidence: Bundle size recorded to .sisyphus/evidence/task-14-bundle.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Performance metrics (memory, CPU, timings)
  - [ ] Bundle size measurement
  - [ ] Before/after optimization comparison

  **Commit**: NO
  - (Will commit after completing Wave 5 tasks)

- [ ] 15. Windows build and packaging

  **What to do**:
  - Configure Tauri build settings for Windows x64
  - Set up app metadata (name, version, description, icon)
  - Configure Windows-specific settings (installer, file associations)
  - Build production release
  - Test installer installation
  - Verify app runs from installed location
  - Test all core flows after installation
  - Create release notes
  - Prepare for distribution (GitHub Releases or other platform)

  **Must NOT do**:
  - No shipping debug builds
  - No incomplete feature sets

  **Recommended Agent Profile**:
  > Select category + skills based on task domain.
  - **Category**: `quick`
    - Reason: Standard build and packaging process
  - **Skills**: []
    - No specialized skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final task)
  - **Blocks**: None (final deliverable)
  - **Blocked By**: All previous tasks (needs complete app)

  **References**:

  **Pattern References**:
  - Tauri build configuration examples

  **API/Type References**:
  - Tauri configuration: tauri.conf.json

  **Documentation References**:
  - Tauri building for Windows: https://v2.tauri.app/build/
  - Windows installer configuration

  **External References**:
  - Tauri CLI build commands
  - Windows installer tools (NSIS, WiX)

  **WHY Each Reference Matters**:
  - Tauri build docs show correct configuration
  - Windows installer tools create proper .msi/.exe installers
  - Build commands produce release artifacts

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] Production build completes without errors
  - [ ] Installer (.msi or .exe) generated
  - [ ] Installer runs successfully
  - [ ] App installs to correct location
  - [ ] App launches from start menu/shortcut
  - [ ] All core flows work after installation (input, select, screenshot)
  - [ ] App is stable (no crashes during 1-hour continuous use)
  - [ ] Release notes prepared

  **Agent-Executed QA Scenarios**:

  \`\`\`
  Scenario: Build and install Windows app
    Tool: Bash
    Preconditions: All tasks completed
    Steps:
      1. npm run tauri build
      2. Assert build completes with exit code 0
      3. Navigate to src-tauri/target/release/bundle/
      4. Assert installer file exists (.msi or .exe)
      5. Run installer (silent mode if possible)
      6. Assert installation completes successfully
      7. Launch installed app
      8. Assert app opens without errors
    Expected Result: Build and installation work correctly
    Failure Indicators: Build errors, installer fails, app won't launch
    Evidence: Build logs and installation notes captured to .sisyphus/evidence/task-15-build.txt
  \`\`\`

  \`\`\`
  Scenario: All core flows work in installed app
    Tool: Manual verification
    Preconditions: App installed
    Steps:
      1. Launch installed app
      2. Test input translation (Ctrl+Alt+A)
      3. Test select translation (Ctrl+Alt+D)
      4. Test screenshot translation (Ctrl+Alt+S)
      5. Test silent OCR (Ctrl+Alt+Shift+S)
      6. Verify history saves
      7. Verify settings persist
      8. Close and reopen app
      9. Verify history and settings still present
    Expected Result: All features work in installed app
    Failure Indicators: Features fail, settings lost, crashes
    Evidence: Notes captured to .sisyphus/evidence/task-15-install-test.txt
  \`\`\`

  **Evidence to Capture**:
  - [ ] Build logs
  - [ ] Installer screenshots
  - [ ] Installed app screenshots
  - [ ] Test results for all core flows

  **Commit**: YES
  - Message: `feat: complete MVP (TTS, optimizations, Windows build)`
  - Files: All project files
  - Pre-commit: `npm run tauri build` (verify build succeeds)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `chore: initialize project and setup environment` | package.json, Cargo.toml, .gitignore | npm run tauri dev |
| 5 | `feat: implement UI framework (main window, translation display, settings)` | src/components/, src/App.tsx | npm run tauri dev (smoke test) |
| 8 | `feat: implement backend services (translation, OCR, hotkeys)` | src-tauri/src/translate/, ocr/, hotkey/ | cargo test |
| 11 | `feat: implement translation flows (input, select, screenshot)` | src/components/*Translation/ | npm run tauri dev |
| 12 | `feat: implement history and favorites` | src/components/History/, Favorites/, stores/ | None (no automated tests) |
| 15 | `feat: complete MVP (TTS, optimizations, Windows build)` | All project files | npm run tauri build |

---

## Success Criteria

### Verification Commands
```bash
# Build verification
npm run tauri build
# Expected: Successful build with installer generated

# Rust compilation
cd src-tauri && cargo build
# Expected: Compiles without errors

# TypeScript type check
npx tsc --noEmit
# Expected: No type errors

# Lint check (if configured)
npm run lint
# Expected: No linting errors
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" (guardrails) absent
- [ ] App builds successfully for Windows x64
- [ ] Installer creates working installation
- [ ] Input translation flow works (Ctrl+Alt+A)
- [ ] Select translation flow works (Ctrl+Alt+D)
- [ ] Screenshot translation flow works (Ctrl+Alt+S)
- [ ] Silent screenshot OCR works (Ctrl+Alt+Shift+S)
- [ ] At least 3 translation services functional
- [ ] OCR accuracy > 90% (basic test)
- [ ] History and favorites persist across restarts
- [ ] Settings save and load correctly
- [ ] TTS plays audio for both English and Chinese
- [ ] Performance targets met (memory < 100MB, translation < 5s)
- [ ] Bundle size < 10MB (uncompressed)
- [ ] No crashes during 1-hour continuous use
- [ ] All hotkeys work system-wide
- [ ] All core flows tested in installed app

### Optional Stretch Goals (post-MVP)
- [ ] Offline dictionary data integration
- [ ] Cloud sync for history/favorites
- [ ] Additional translation services (Baidu, Youdao, etc.)
- [ ] Web-based translation fallback
- [ ] Dark/light theme switching
- [ ] Customizable hotkeys
- [ ] Translation comparison side-by-side
- [ ] Export history to file

---

## Notes for Executor

### Getting Started
1. Ensure Node.js 20+ and Rust 1.75+ are installed
2. Run `npm install` to install dependencies
3. Run `npm run tauri dev` to start development server
4. Follow wave-by-wave execution strategy

### Key Considerations
- **API Keys**: User has some API keys, but use placeholders in code. User will configure in settings.
- **OCR Priority**: Windows OCR API is primary, Tesseract.js is fallback. Focus on Windows OCR first.
- **Parallel Execution**: Waves 1-3 have parallelizable tasks. Execute in parallel where possible.
- **Testing Strategy**: No automated tests required. All verification via manual testing and agent-executed QA scenarios.
- **Bundle Size**: Keep app lightweight (<10MB uncompressed) as per Tauri advantage over Electron.
- **Performance**: Optimize for responsiveness. Translation and OCR should not block UI.

### Known Challenges
- **Windows OCR API**: May require Windows 10/11 SDK. Ensure proper installation.
- **Rust Learning Curve**: If unfamiliar with Rust, focus on async patterns and error handling.
- **Hotkey Conflicts**: Test on different Windows systems to ensure no system conflicts.
- **API Rate Limits**: Implement basic rate limiting for translation APIs.

### References During Implementation
- Easydict source code: https://github.com/tisfeng/Easydict
- Tauri 2.x docs: https://v2.tauri.app/
- Shadcn/ui components: https://ui.shadcn.com/
- Windows OCR API: https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine

---

**Plan Status**: Ready for execution

**Next Step**: Run `/start-work` to begin implementation with Sisyphus orchestrator.
