package imgpdf

import (
	"embed"
	"io/fs"
)

// Директива embed не разрешает "..", поэтому живёт в корне модуля,
// рядом с web/, а не в cmd/imgpdf (см. design.md, D1).
//
//go:embed web
var webFS embed.FS

// WebFS возвращает встроенную web/ с корнем на её верхнем уровне.
func WebFS() fs.FS {
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		panic(err) // web/ гарантирована самой директивой embed
	}
	return sub
}
