package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	qrcode "github.com/skip2/go-qrcode"

	"imgpdf"
)

func main() {
	host := flag.String("host", "0.0.0.0", "адрес, на котором слушать")
	port := flag.Int("port", 8080, "порт")
	dev := flag.Bool("dev", false, "раздавать web/ с диска вместо встроенной копии")
	flag.Parse()

	var content fs.FS = imgpdf.WebFS()
	if *dev {
		content = os.DirFS("web")
	}

	srv := &http.Server{
		Addr:    net.JoinHostPort(*host, strconv.Itoa(*port)),
		Handler: imgpdf.Handler(content, *dev),
	}

	printStartup(*host, *port)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()

	select {
	case err := <-errCh:
		log.Fatal(err)
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func printStartup(host string, port int) {
	fmt.Println("imgpdf — фото в PDF, всё в браузере")

	// Конкретный (не wildcard) host: печатаем только его, интерфейсы не перечисляем.
	if host != "0.0.0.0" && host != "::" && host != "" {
		fmt.Printf("  http://%s\n", net.JoinHostPort(host, strconv.Itoa(port)))
		return
	}

	ips := imgpdf.AllLANAddrs()
	if len(ips) == 0 {
		fmt.Printf("  http://localhost:%d\n", port)
		return
	}
	for _, ip := range ips {
		fmt.Printf("  http://%s:%d\n", ip, port)
	}

	if priv := imgpdf.FirstPrivate(ips); priv != "" {
		url := fmt.Sprintf("http://%s:%d", priv, port)
		if q, err := qrcode.New(url, qrcode.Medium); err == nil {
			fmt.Println(q.ToSmallString(false))
		}
	}
}
