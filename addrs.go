package imgpdf

import "net"

// LANAddrs отбирает из addrs не-loopback IPv4-адреса.
func LANAddrs(addrs []net.Addr) []string {
	var out []string
	for _, a := range addrs {
		ipNet, ok := a.(*net.IPNet)
		if !ok {
			continue
		}
		ip := ipNet.IP.To4()
		if ip == nil || ip.IsLoopback() {
			continue
		}
		out = append(out, ip.String())
	}
	return out
}

// FirstPrivate возвращает первый RFC 1918-адрес из ips или "".
func FirstPrivate(ips []string) string {
	for _, s := range ips {
		if ip := net.ParseIP(s); ip != nil && ip.IsPrivate() {
			return s
		}
	}
	return ""
}

// AllLANAddrs перечисляет не-loopback IPv4-адреса всех поднятых интерфейсов.
func AllLANAddrs() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var out []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		out = append(out, LANAddrs(addrs)...)
	}
	return out
}
