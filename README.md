# imgpdf

Статическое браузерное приложение для преобразования изображений в PDF. Файлы обрабатываются локально в браузере и не отправляются на сервер.

## Локальный запуск

```bash
go run ./cmd/imgpdf -dev
```

После запуска приложение доступно по адресу `http://localhost:8080`.

## Проверка

```bash
npm test
go test ./...
```

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` публикует содержимое каталога `web` при каждом push в ветку `master`. Все ресурсы используют относительные пути, поэтому приложение работает как в корне домена, так и по адресу вида `https://<user>.github.io/<repository>/`.

Для первой публикации:

1. Отправьте репозиторий на GitHub.
2. Откройте **Settings → Pages**.
3. В поле **Source** выберите **GitHub Actions**.
4. Запустите workflow **Deploy to GitHub Pages** вручную или сделайте push в `master`.

Адрес опубликованного сайта появится в environment `github-pages` и на странице завершённого workflow.
