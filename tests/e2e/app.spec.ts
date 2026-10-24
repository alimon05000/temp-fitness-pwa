import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Продолжить без аккаунта" }).click();
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("temp-fitness-v1");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const data = await new Promise<unknown>((resolve, reject) => {
      const r = db
        .transaction("snapshots")
        .objectStore("snapshots")
        .get("main");
      r.onsuccess = () => resolve(r.result?.data);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return data as {
      goals: { baseline: number; target: number }[];
      sessions: {
        status: string;
        results: { seconds: number; reps: number }[];
      }[];
      schedule: unknown[];
      templates: unknown[];
      exercises: { name: string }[];
    };
  });
}
async function stored(page: Page) {
  await expect(page.locator(".page-footer")).not.toContainText("Сохраняем");
}

test("goal, 3:58 record, analytics and persistence", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Добавить цель" }).click();
  await page.getByLabel("Исходный результат", { exact: true }).fill("4:03");
  await page.getByLabel("Целевой результат", { exact: true }).fill("3:30");
  await page.getByRole("button", { name: "Сохранить цель" }).click();
  await expect(page.locator(".goal-card")).toContainText("4:03");
  await page.getByRole("button", { name: /Записать результат/ }).click();
  await page.getByLabel("Время, мин:сек").fill("3:58");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await stored(page);
  await expect(page.locator(".goal-card")).toContainText("3:58");
  const state = await snapshot(page);
  expect(state.sessions[0].results[0].seconds).toBe(238);
  expect(state.goals[0]).toMatchObject({ baseline: 243, target: 210 });
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Прогресс" })
    .click();
  await expect(page.locator(".chart-best")).toContainText("3:58");
  await page.reload();
  await expect(page.locator(".chart-best")).toContainText("3:58");
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Главная" })
    .click();
  await page.locator(".goal-card").click();
  await page.getByLabel("Целевой результат", { exact: true }).fill("3:20");
  await page.getByRole("button", { name: "Сохранить цель" }).click();
  await expect(page.locator(".goal-card")).toContainText("3:20");
  await page.locator(".goal-card").click();
  await page.getByRole("button", { name: "Удалить цель" }).click();
  await expect(page.locator(".goal-card")).toHaveCount(0);
});

test("four pull-up sets, rest reload, honest maximum and finish", async ({
  page,
}) => {
  await open(page);
  await page.locator(".quick-card.green").click();
  const values = [11, 10, 9, 9];
  for (let i = 0; i < values.length; i++) {
    await page
      .getByLabel("Фактические повторения", { exact: true })
      .fill(String(values[i]));
    await page
      .getByRole("button", { name: "Подход завершён", exact: true })
      .click();
    if (i === 0) {
      await stored(page);
      await page.reload();
      await expect(page.getByRole("timer")).toContainText("2:");
    }
    if (i < 3)
      await page.getByRole("button", { name: "Закончить отдых" }).click();
  }
  await expect(page.locator(".session-summary")).toContainText("39");
  await expect(page.locator(".session-summary")).toContainText("11");
  await page.getByRole("button", { name: "Подвести итог" }).click();
  await page.getByRole("button", { name: "Сохранить тренировку" }).click();
  await stored(page);
  const state = await snapshot(page);
  expect(state.sessions[0].status).toBe("completed");
  expect(state.sessions[0].results.map((r) => r.reps)).toEqual(values);
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Прогресс" })
    .click();
  await page.getByLabel("Показатель графика").selectOption("pullup");
  await expect(page.locator(".chart-best")).toContainText("11");
});

test("five 400m intervals record independent results and total 2000m", async ({
  page,
}) => {
  await open(page);
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Тренировка" })
    .click();
  await page
    .locator(".mode-card")
    .filter({ hasText: "Интервалы" })
    .getByRole("button", { name: "Начать", exact: true })
    .click();
  for (let i = 0; i < 5; i++) {
    await page
      .getByLabel("Фактическое время", { exact: true })
      .fill(`1:${30 + i}`);
    await page
      .getByRole("button", { name: "Записать этап", exact: true })
      .click();
    if (i < 4)
      await page.getByRole("button", { name: "Закончить отдых" }).click();
  }
  await expect(page.locator(".session-summary")).toContainText("2000");
  await page.getByRole("button", { name: "Подвести итог" }).click();
  await page.getByRole("button", { name: "Сохранить тренировку" }).click();
  await stored(page);
  const state = await snapshot(page);
  expect(state.sessions[0].results.map((r) => r.seconds)).toEqual([
    90, 91, 92, 93, 94,
  ]);
});

test("custom exercise and mixed template, schedule and move", async ({
  page,
}) => {
  await open(page);
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Каталог" })
    .click();
  await page
    .locator(".page-heading")
    .getByRole("button", { name: "Своё упражнение" })
    .click();
  await page.getByLabel("Название упражнения").fill("Моя растяжка");
  await page.getByLabel("Метрика", { exact: true }).selectOption("time");
  await page.getByRole("button", { name: "Сохранить упражнение" }).click();
  await page
    .locator(".catalog-card")
    .filter({ hasText: "Моя растяжка" })
    .click();
  await page.getByRole("button", { name: "Собрать тренировку" }).click();
  await page
    .getByLabel("Название тренировки", { exact: true })
    .fill("Утренний комплекс");
  await page
    .getByRole("button", { name: "Добавить упражнение / этап" })
    .click();
  await page.getByRole("button", { name: "Сохранить шаблон" }).click();
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Тренировка" })
    .click();
  await page
    .getByRole("button", { name: "В календарь: Утренний комплекс" })
    .click();
  await page.getByRole("button", { name: "Сохранить в календарь" }).click();
  await page.getByRole("button", { name: "Открыть календарь" }).click();
  await expect(
    page.getByRole("heading", { name: "Календарь.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mode-card")).toContainText("Утренний комплекс");
  await page.getByRole("button", { name: "Перенести / заменить" }).click();
  await page.getByLabel("Время", { exact: true }).fill("19:15");
  await page.getByRole("button", { name: "Сохранить в календарь" }).click();
  await stored(page);
  expect((await snapshot(page)).schedule).toHaveLength(1);
});

test("offline shell, record creation and reload while offline", async ({
  page,
  context,
}) => {
  await open(page);
  await expect(page.locator(".offline-status")).toContainText(
    "Готов к работе офлайн",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".connection")).toContainText("Офлайн");
  await page.getByRole("button", { name: /Записать результат/ }).click();
  await page.getByLabel("Время, мин:сек").fill("3:58");
  await page.getByRole("button", { name: "Сохранить результат" }).click();
  await stored(page);
  await page.reload();
  expect((await snapshot(page)).sessions[0].results[0].seconds).toBe(238);
  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Прогресс" })
    .click();
  await expect(page.locator(".chart-best")).toContainText("3:58");
});

test("AI config is honest, privacy consent and plan acceptance boundaries", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Открыть ИИ-тренера" }).click();
  await expect(
    page.getByText("Тренер ещё не подключён", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Настроить подключение" }).click();
  await page
    .getByLabel("Адрес защищённого API")
    .fill("https://coach.example/api/coach");
  await page
    .getByText("Разрешаю отправлять тренеру цели и предпочтения", {
      exact: false,
    })
    .click();
  await page.getByRole("button", { name: "Сохранить настройки" }).click();
  await page.route("https://coach.example/api/coach", async (route) => {
    await route.fulfill({
      json: {
        text: "Тестовый ответ провайдера",
        model: "mock-test-only",
        proposal: {
          name: "Проверочный план",
          explanation: "Только тест",
          days: [
            {
              offset: 1,
              name: "Подтягивания",
              kind: "pullup",
              blocks: [
                {
                  id: "test-block",
                  exerciseId: "pullup",
                  name: "Подтягивания",
                  metric: "reps",
                  reps: 8,
                  weight: 0,
                  distance: 0,
                  duration: 0,
                  targetPace: 0,
                  rest: 180,
                },
              ],
            },
          ],
        },
      },
    });
  });
  await page.getByLabel("Сообщение тренеру").fill("Составь тренировку");
  await page.getByRole("button", { name: "Отправить тренеру" }).click();
  await expect(page.getByText("Проверочный план")).toBeVisible();
  await stored(page);
  expect((await snapshot(page)).schedule).toHaveLength(0);
  await page.getByRole("button", { name: "Принять план" }).click();
  await stored(page);
  expect((await snapshot(page)).schedule).toHaveLength(1);
  await expect(page.getByText("План принят", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Принять план" })).toHaveCount(
    0,
  );
});

test("responsive navigation has no horizontal overflow at 320, 390, 768 and 1440px", async ({
  page,
}) => {
  await open(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of [
      "home",
      "workout",
      "progress",
      "catalog",
      "calendar",
      "coach",
    ]) {
      await page.evaluate((v) => {
        location.hash = v;
      }, view);
      await expect(page.locator("h1")).toHaveText(
        (
          {
            home: "Мой прогресс.",
            workout: "Тренировка.",
            progress: "Аналитика.",
            catalog: "Упражнения.",
            calendar: "Календарь.",
            coach: "Ваш ИИ-тренер.",
          } as Record<string, string>
        )[view],
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
    }
  }
});
