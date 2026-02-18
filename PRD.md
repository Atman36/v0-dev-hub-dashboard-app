# PRD — DevHub (MVP)

## 1) Цель продукта
DevHub — это персональный дашборд разработчика для ведения собственных проектов GitHub в одном месте: статус, локальный путь, ссылки, скриншоты и ближайшие задачи.

## 2) Целевая аудитория
- Solo-разработчик / indie maker.
- Инженер, ведущий несколько pet/startup/бот-проектов параллельно.
- Пользователь без потребности в backend и командной коллаборации.

## 3) Проблема
Текущий процесс отслеживания проектов разрознен (GitHub, заметки, мессенджеры, локальные папки), из-за чего теряется контекст, история прогресса и фокус на next steps.

## 4) MVP-объем
### 4.1 Dashboard (основной экран)
- Sticky header: логотип, поиск, фильтры (All/Web/Mobile/Telegram), кнопка создания проекта.
- 2 секции карточек:
  - Web & Presentations (1→2→3 колонки).
  - Mobile & Telegram (2→3→4 колонки, portrait).
- Карточка проекта: обложка/плейсхолдер, название, category, status, быстрые действия (GitHub/Live/Detail).
- Empty state при отсутствии данных.

### 4.2 Project Detail
- Назад к списку проектов.
- Большое изображение + полоса миниатюр при нескольких скриншотах.
- Инфо-блок: title, badges, описание, ссылки.
- Local Access: отображение localPath, Copy Path, Open in VS Code.
- Status: изменение статуса, lastReviewDate, кнопка “Mark Reviewed Today”.
- Next Steps: добавление/чек/удаление задач, done внизу списка.

### 4.3 Add Project Modal
- Форма создания (title/type/category/urls/localPath/status/description/images).
- Загрузка изображений с превью.

### 4.4 Хранение данных
- Только `localStorage`, ключ `devhub_projects`.
- Автосохранение на каждое изменение.

## 5) Данные
```ts
interface Project {
  id: string
  title: string
  type: 'web' | 'mobile' | 'telegram' | 'presentation'
  category: 'startup' | 'site' | 'app' | 'bot' | 'other'
  images: string[]
  githubUrl: string
  liveUrl: string
  localPath: string
  description: string
  status: 'idea' | 'in-progress' | 'mvp' | 'live' | 'archived'
  lastReviewDate: string
  tasks: Task[]
  createdAt: string
}
interface Task {
  id: string
  text: string
  isDone: boolean
}
```

## 6) UX/UI требования
- Dark theme only.
- Эстетика: Vercel × Linear × Raycast, монохромная база + аккуратные акценты.
- Шрифты: Geist + Geist Mono.
- Микроанимации: hover scale `1.01`, мягкие opacity-переходы.
- Состояния статусов с цветовой индикацией.

## 7) Нефункциональные требования
- Без backend, auth, API.
- Производительность: мгновенная фильтрация и локальные CRUD-операции без перезагрузки страницы.
- Поддержка keyboard shortcuts: Cmd/Ctrl+K (поиск), Cmd/Ctrl+N (новый проект).

## 8) Критерии приемки MVP
- Пользователь может создать, отредактировать и просматривать проект(ы) без сервера.
- Данные сохраняются после перезапуска вкладки/браузера.
- Поиск и фильтры работают в реальном времени.
- Можно вести задачи по каждому проекту.
- Можно копировать локальный путь и открыть путь через `vscode://file/...`.
