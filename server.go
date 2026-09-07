package imgpdf

import (
	"io/fs"
	"net/http"
	"strings"
)

// Handler отдаёт статику из content и /healthz. В dev-режиме кеш
// отключается целиком, чтобы правки на диске были видны по F5.
func Handler(content fs.FS, dev bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("OK"))
	})
	mux.Handle("/", cacheHeaders(dev, http.FileServer(http.FS(content))))
	return mux
}

func cacheHeaders(dev bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case dev:
			w.Header().Set("Cache-Control", "no-cache")
		case strings.HasPrefix(r.URL.Path, "/vendor/"):
			// vendor-файлы не хешированы по содержимому, поэтому кеш
			// ограничен неделей; новая версия библиотеки = новое имя файла.
			w.Header().Set("Cache-Control", "public, max-age=604800")
		default:
			w.Header().Set("Cache-Control", "no-cache")
		}
		next.ServeHTTP(w, r)
	})
}
