package imgpdf

import (
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

var testContent = fstest.MapFS{
	"index.html":            {Data: []byte("<html>app</html>")},
	"vendor/pdf-lib.min.js": {Data: []byte("// lib")},
}

func get(t *testing.T, dev bool, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", path, nil)
	Handler(testContent, dev).ServeHTTP(rec, req)
	return rec
}

func TestHealthz(t *testing.T) {
	rec := get(t, false, "/healthz")
	if rec.Code != 200 || rec.Body.String() != "OK" {
		t.Fatalf("healthz: код %d, тело %q", rec.Code, rec.Body.String())
	}
}

func TestIndexNoCache(t *testing.T) {
	rec := get(t, false, "/")
	if rec.Code != 200 {
		t.Fatalf("/: код %d", rec.Code)
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "no-cache" {
		t.Fatalf("/: Cache-Control %q, ожидался no-cache", cc)
	}
}

func TestVendorCached(t *testing.T) {
	rec := get(t, false, "/vendor/pdf-lib.min.js")
	if rec.Code != 200 {
		t.Fatalf("/vendor: код %d", rec.Code)
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=604800" {
		t.Fatalf("/vendor: Cache-Control %q", cc)
	}
}

func TestDevDisablesCache(t *testing.T) {
	rec := get(t, true, "/vendor/pdf-lib.min.js")
	if cc := rec.Header().Get("Cache-Control"); cc != "no-cache" {
		t.Fatalf("dev /vendor: Cache-Control %q, ожидался no-cache", cc)
	}
}

func TestUnknownPath404(t *testing.T) {
	rec := get(t, false, "/api/anything")
	if rec.Code != 404 {
		t.Fatalf("/api/anything: код %d, ожидался 404", rec.Code)
	}
}
