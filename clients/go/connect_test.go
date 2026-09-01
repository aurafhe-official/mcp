package afhe

import "testing"

func TestTrustTLS(t *testing.T) {
	cases := []struct {
		url  string
		want bool
	}{
		{"https://localhost:8443", true},
		{"https://127.0.0.1:8443", true},
		{"https://api.afhe.io:8443", true},
		{"https://example.com:8443", false},
	}
	for _, c := range cases {
		if got := trustTLS(c.url); got != c.want {
			t.Fatalf("trustTLS(%s)=%v want %v", c.url, got, c.want)
		}
	}
}
