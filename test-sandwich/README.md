# Сэндвич — тест приёма с euveka.com

Строка текста **поверх** объекта, строка — **за** ним. Объект — секвенция кадров с альфой на `<canvas>` в `position: fixed` слое, скраб по скроллу.

## Как устроено

```
z 4   .line.back    — строка за монеткой        (position: relative)
z 5   .stage        — fixed, inset 0, pointer-events: none, внутри <canvas>
z 6   .line.front   — строка поверх монетки     (position: relative)
```

Все три живут в корневом stacking context: у общих предков нет `transform / opacity / filter / will-change`, иначе z-index не «прошьёт» слои. Медиа обязано быть с альфой — mp4 с запечённым фоном закрыл бы нижнюю строку целиком.

## Кадры

`frames/000..119.webp` — 120 кадров, 1024×1024, WebP с альфой. Пайплайн: стил монетки (gpt-image) → Seedance 2.5 i2v, оборот 360° на нейтральном сером → Higgsfield remove_background (video) → ffmpeg → PNG RGBA → `tools/make-frames.py` (единый кроп по объединённому bbox альфы, квадрат, WebP).

## Сейчас на странице

Хиро «Still / unspent.» (первая строка за монетой, вторая над ней) с броском монеты (.5 → 1 → .5 по скроллу); стори обтекает монету; два блока-иконы Struck / Refused, где монета делает ровно один оборот и замирает лицом в центре арки; финал «It came / back.» — тот же сэндвич. Подробно: `../docs/concept.md`.

## Запуск

Любой статический сервер из корня репо, затем `/test-sandwich/`. `?cdn=1` — кадры с jsDelivr вместо локальных (проверка CDN-варианта). Готовые копии для передачи: `../../new-15-offline` и `../../new-15-cdn` (`python3 tools/build-siblings.py`).

## Адреса

- Страница: https://roninsegun.github.io/new-15/test-sandwich/
- CDN-вариант: https://roninsegun.github.io/new-15/test-sandwich/?cdn=1
- Кадры на jsDelivr: `https://cdn.jsdelivr.net/gh/roninsegun/new-15@main/test-sandwich/frames/000.webp`
