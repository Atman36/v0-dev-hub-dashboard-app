# Suggested Improvements (Updated)

Обновлено: 2026-02-19

## Проверка анализа

Проверка `AUDIT.md` показала, что часть пунктов уже неактуальна:
- Markdown-рендер описания уже реализован (`react-markdown` + `remark-gfm`).
- Сжатие/ресайз изображений перед сохранением уже реализованы (`lib/image-processing.ts`).

Ниже — актуальный статус улучшений.

## Выполнено в этой итерации

- [x] Валидация импорта через Zod и безопасная нормализация данных (`lib/project-exchange.ts`).
- [x] Fallback-рендер для битых/повреждённых изображений в карточках и деталке (`components/image-with-fallback.tsx`).
- [x] Индикатор использования local storage в хедере (`components/header.tsx`, `app/page.tsx`).

## Рекомендуемые следующие шаги

### High
- [ ] Перенос хранения проектов с `localStorage` в `IndexedDB`.
- [ ] Декомпозиция `ProjectDetail` на подкомпоненты (header/info/images/tasks).

### Medium
- [ ] Перевод формы добавления проекта на `react-hook-form` + schema validation.
- [ ] Drag-and-drop сортировка задач в проекте.
- [ ] Добавить поле пользовательских тегов для гибкой фильтрации.

### Low
- [ ] Улучшить hydration-стратегию без полного `mounted` gate для всей страницы.
