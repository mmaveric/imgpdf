package imgpdf

import (
	"net"
	"reflect"
	"testing"
)

func ipNet(cidr string) net.Addr {
	_, n, err := net.ParseCIDR(cidr)
	if err != nil {
		panic(err)
	}
	// ParseCIDR обнуляет host-биты; для теста нужен полный адрес.
	ip, _, _ := net.ParseCIDR(cidr)
	n.IP = ip
	return n
}

func TestLANAddrs(t *testing.T) {
	addrs := []net.Addr{
		ipNet("127.0.0.1/8"),     // loopback — отброшен
		ipNet("192.168.1.10/24"), // берётся
		ipNet("fe80::1/64"),      // IPv6 — отброшен
		ipNet("10.0.0.5/8"),      // берётся
	}
	got := LANAddrs(addrs)
	want := []string{"192.168.1.10", "10.0.0.5"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("LANAddrs = %v, ожидалось %v", got, want)
	}
}

func TestLANAddrsEmpty(t *testing.T) {
	if got := LANAddrs(nil); len(got) != 0 {
		t.Fatalf("LANAddrs(nil) = %v, ожидался пустой результат", got)
	}
}

func TestFirstPrivate(t *testing.T) {
	if got := FirstPrivate([]string{"8.8.8.8", "192.168.1.10", "10.0.0.5"}); got != "192.168.1.10" {
		t.Fatalf("FirstPrivate = %q, ожидался 192.168.1.10", got)
	}
	if got := FirstPrivate([]string{"8.8.8.8"}); got != "" {
		t.Fatalf("FirstPrivate без приватных = %q, ожидалась пустая строка", got)
	}
}
