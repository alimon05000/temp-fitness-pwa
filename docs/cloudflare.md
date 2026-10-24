# Cloudflare Workers для ИИ

Сайт размещается на GitHub Pages. Cloudflare запускает только backend, ключ не попадает в статические файлы. Vercel не нужен.

Регистрация Cloudflare предусмотрена по email/паролю с подтверждением email, также поддерживается GitHub-вход. Аккаунт владельца уже авторизован для размещения Worker. См. [официальный порядок регистрации](https://developers.cloudflare.com/fundamentals/account/create-account/).

## Устройство

`wrangler.jsonc` объявляет Worker `temp-fitness-coach`, переменные модели/origin и SQLite-backed Durable Object `CoachQuota`. Объект хранит только четыре числа текущего минутного/суточного счётчика. Атомарная транзакция разрешает не более 5 запросов в минуту и 50 в сутки. Счётчики сохраняются после остановки процесса и нового deploy. Никаких тренировок, имён, сообщений или IP в объекте нет.

SQLite Durable Objects доступны на Workers Free: [условия и лимиты](https://developers.cloudflare.com/durable-objects/platform/pricing/). При превышении лимитов Free операции прекращаются; не включайте платный план без решения владельца.

## Размещение и смена ключа

В каталоге репозитория:

```powershell
npm ci
npx wrangler login
npm run worker:check
npm run worker:deploy
npx wrangler secret put TOOKEN_API_KEY
npx wrangler secret put COACH_ACCESS_CODE
```

Секреты вводятся в скрытом prompt. `COACH_ACCESS_CODE` — отдельная случайная строка не меньше 32 символов. Это код доступа к серверу, не Tooken key. Не добавляйте его в исходники или `VITE_*`. В приложении код запрашивается в чате и не хранится после перезагрузки вкладки.

`ALLOWED_ORIGIN` должен совпадать с origin Pages: `https://alimon05000.github.io` (без пути репозитория). `TOOKEN_BASE_URL` и `TOOKEN_MODEL` не секретны, находятся в Wrangler vars. Установка `TOOKEN_API_KEY` и `COACH_ACCESS_CODE` через secret put создаёт новую серверную версию.

Текущий endpoint: `https://temp-fitness-coach.temp-fitness-pwa.workers.dev/api/coach`. Публичный `GET /health` показывает только статус конфигурации и модель, без ключей.

В GitHub repository variable `VITE_COACH_API_URL` установлен URL endpoint. Следующий push пересобирает Pages с этим адресом. В уже существующей локальной базе пустое поле адреса подхватывает адрес сборки; явно заданный свой адрес сохраняется.

## HTTPS

После первой регистрации `workers.dev` может требоваться активация сертификата. При первоначальной проверке внешний TLS handshake не проходил (`ERR_SSL_VERSION_OR_CIPHER_MISMATCH`). После активации нового адреса ошибка исчезла: `/health` отвечает 200 и `ready`, реальный вызов ИИ через endpoint прошёл с HTTP 200 и валидным планом. Защита сертификатов не отключалась.

Общие причины такой ошибки описаны в [документации SSL Cloudflare](https://developers.cloudflare.com/ssl/troubleshooting/version-cipher-mismatch/). Этот разовый случай не означает гарантированный срок выдачи сертификата для новых аккаунтов. Если ошибка сохраняется, проверьте в Dashboard Workers & Pages → `temp-fitness-coach` → Settings → Domains & Routes и обращайтесь в поддержку Cloudflare.

Для восстановления доступа владельца в этой Windows-сессии отдельный скрипт вне репозитория копирует код из Windows DPAPI-хранилища в буфер. Секрет не включён в GitHub. На другом компьютере задайте новый код через Workers Secrets и вводите его вручную.
