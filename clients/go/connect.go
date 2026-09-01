package afhe

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// ConnectOptions configures Connect. All fields are optional.
type ConnectOptions struct {
	// BaseURL overrides the server URL. Defaults to $AFHE_API_URL or
	// "https://localhost:8443".
	BaseURL string

	// InsecureTLS accepts self-signed certificates. When zero, it is
	// inferred: true for localhost and genesis (api.afhe.io).
	// Use a *bool to distinguish "unset" from "explicitly false".
	InsecureTLS *bool

	// AutoLoad tells the server to load the standard key block paths
	// before returning. Defaults to true.
	AutoLoad *bool

	// Keys overrides the key block paths sent to the server's POST /load.
	// Defaults match the standard Aura FHE server layout.
	Keys *LoadOptions

	// HealthCheck pings the server before returning. Defaults to true.
	HealthCheck *bool

	// Timeout for every HTTP request. Defaults to 600s.
	Timeout time.Duration

	// ExtraHeaders are added to every request.
	ExtraHeaders map[string]string
}

// Connect creates a Client and (by default) loads the standard key blocks.
// One-liner usage:
//
//	c, _ := afhe.Connect(ctx)
//
// Reads $AFHE_API_URL if BaseURL is empty. Relaxes TLS for localhost
// and genesis (api.afhe.io).
func Connect(ctx context.Context, opts ...ConnectOptions) (*Client, error) {
	o := ConnectOptions{}
	if len(opts) > 0 {
		o = opts[0]
	}

	baseURL := o.BaseURL
	if baseURL == "" {
		if env := os.Getenv("AFHE_API_URL"); env != "" {
			baseURL = env
		} else {
			baseURL = "https://localhost:8443"
		}
	}

	insecure := false
	if o.InsecureTLS != nil {
		insecure = *o.InsecureTLS
	} else {
		insecure = trustTLS(baseURL)
	}

	timeout := o.Timeout
	if timeout == 0 {
		timeout = 600 * time.Second
	}

	tr := &http.Transport{}
	if insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} // #nosec G402 — localhost or genesis
	}

	c, err := NewClient(ClientOptions{
		BaseURL:      baseURL,
		HTTPClient:   &http.Client{Transport: tr, Timeout: timeout},
		ExtraHeaders: o.ExtraHeaders,
	})
	if err != nil {
		return nil, err
	}

	if o.HealthCheck == nil || *o.HealthCheck {
		if _, err := c.Health(ctx); err != nil {
			return nil, fmt.Errorf("afhe: cannot reach coprocessor at %s: %w", baseURL, err)
		}
	}

	if o.AutoLoad == nil || *o.AutoLoad {
		keys := LoadOptions{SKB: "file/skb", PKB: "file/pkb", DictB: "file/dictb"}
		if o.Keys != nil {
			if o.Keys.SKB != "" {
				keys.SKB = o.Keys.SKB
			}
			if o.Keys.PKB != "" {
				keys.PKB = o.Keys.PKB
			}
			if o.Keys.DictB != "" {
				keys.DictB = o.Keys.DictB
			}
		}
		if _, err := c.Load(ctx, keys); err != nil {
			return nil, fmt.Errorf("afhe: load keys: %w", err)
		}
	}

	return c, nil
}

// Bool is a tiny helper for ConnectOptions's *bool fields.
//
//	afhe.Connect(ctx, afhe.ConnectOptions{InsecureTLS: afhe.Bool(false)})
func Bool(v bool) *bool { return &v }

func trustTLS(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	host := u.Hostname()
	return host == "localhost" ||
		host == "127.0.0.1" ||
		host == "::1" ||
		host == "api.afhe.io" ||
		strings.HasSuffix(host, ".localhost")
}
