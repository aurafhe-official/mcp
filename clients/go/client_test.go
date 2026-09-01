package afhe

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"
)

var (
	baseURL = getEnv("AFHE_API_URL", "https://localhost:8443")
	// Paths are relative to the server working directory (project root).
	skb   = getEnv("AFHE_SKB", "file/skb")
	pkb   = getEnv("AFHE_PKB", "file/pkb")
	dictb = getEnv("AFHE_DICTB", "file/dictb")
)

func getEnv(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

func newTestClient(t *testing.T) *Client {
	t.Helper()
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	c, err := NewClient(ClientOptions{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{Transport: tr, Timeout: 120 * time.Second},
	})
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	return c
}

func TestHealth(t *testing.T) {
	c := newTestClient(t)
	res, err := c.Health(context.Background())
	if err != nil {
		t.Fatalf("Health: %v", err)
	}
	if res["status"] != "ok" {
		t.Fatalf("unexpected status: %v", res)
	}
}

func TestFunctions(t *testing.T) {
	c := newTestClient(t)
	fns, err := c.Functions(context.Background())
	if err != nil {
		t.Fatalf("Functions: %v", err)
	}
	if len(fns.Arity1) == 0 {
		t.Fatal("arity1 is empty")
	}
	found := false
	for _, n := range fns.Arity1 {
		if n == "EncryptInt" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("EncryptInt not in arity1 list")
	}
}

func TestInit(t *testing.T) {
	c := newTestClient(t)
	res, err := c.Init(context.Background())
	if err != nil {
		t.Fatalf("Init: %v", err)
	}
	if !res["ok"] {
		t.Fatal("Init returned ok=false")
	}
}

func TestKeygenNotSupported(t *testing.T) {
	c := newTestClient(t)
	_, err := c.Keygen(context.Background(), KeygenOptions{})
	if err == nil {
		t.Fatal("expected Keygen to fail")
	}
	apiErr, ok := err.(*ApiError)
	if !ok {
		t.Fatalf("expected ApiError, got %T: %v", err, err)
	}
	if apiErr.Status != 500 {
		t.Fatalf("expected status 500, got %d", apiErr.Status)
	}
}

func TestKeygenOptionsMarshalFractionalDelta(t *testing.T) {
	delta := 0.001
	body, err := json.Marshal(KeygenOptions{Delta: &delta})
	if err != nil {
		t.Fatalf("marshal keygen options: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatalf("unmarshal keygen options: %v", err)
	}

	if got["delta"] != 0.001 {
		t.Fatalf("expected delta=0.001, got %#v", got["delta"])
	}
}

func TestLoad(t *testing.T) {
	c := newTestClient(t)
	res, err := c.Load(context.Background(), LoadOptions{
		SKB:   skb,
		PKB:   pkb,
		DictB: dictb,
	})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(res.Loaded) != 3 {
		t.Fatalf("expected 3 loaded, got %d", len(res.Loaded))
	}
}

func TestIntEncryptDecrypt(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb}); err != nil {
		t.Fatalf("Load: %v", err)
	}
	// Plaintext modulus t=5; valid range is [0,4]
	for _, v := range []string{"0", "2", "4"} {
		ct, err := c.EncryptInt(ctx, v)
		if err != nil {
			t.Fatalf("EncryptInt(%s): %v", v, err)
		}
		pt, err := c.DecryptInt(ctx, ct)
		if err != nil {
			t.Fatalf("DecryptInt(%s): %v", v, err)
		}
		if pt != v {
			t.Fatalf("round-trip failed: %s -> %s", v, pt)
		}
	}
}

func TestFloatEncryptDecrypt(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb}); err != nil {
		t.Fatalf("Load: %v", err)
	}
	ct, err := c.EncryptFloat(ctx, "3.14")
	if err != nil {
		t.Fatalf("EncryptFloat: %v", err)
	}
	pt, err := c.DecryptFloat(ctx, ct)
	if err != nil {
		t.Fatalf("DecryptFloat: %v", err)
	}
	if pt == "" {
		t.Fatal("decrypted float is empty")
	}
	t.Logf("Float round-trip: 3.14 -> %s", pt)
}

func TestBinaryEncryptDecrypt(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb}); err != nil {
		t.Fatalf("Load: %v", err)
	}
	ct, err := c.EncryptBinary(ctx, "42")
	if err != nil {
		t.Fatalf("EncryptBinary: %v", err)
	}
	pt, err := c.DecryptBinary(ctx, ct)
	if err != nil {
		t.Fatalf("DecryptBinary: %v", err)
	}
	if pt != "42" {
		t.Fatalf("round-trip failed: 42 -> %s", pt)
	}
}

func TestFloatArithmetic(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	c1, _ := c.EncryptFloat(ctx, "2.5")
	c2, _ := c.EncryptFloat(ctx, "1.5")

	sum, err := c.AddFloat(ctx, c1, c2)
	if err != nil {
		t.Fatalf("AddFloat: %v", err)
	}
	pt, _ := c.DecryptFloat(ctx, sum)
	t.Logf("2.5 + 1.5 = %s", pt)

	diff, err := c.SubFloat(ctx, c1, c2)
	if err != nil {
		t.Fatalf("SubFloat: %v", err)
	}
	pt, _ = c.DecryptFloat(ctx, diff)
	t.Logf("2.5 - 1.5 = %s", pt)

	prod, err := c.MulFloat(ctx, c1, c2)
	if err != nil {
		t.Fatalf("MulFloat: %v", err)
	}
	pt, _ = c.DecryptFloat(ctx, prod)
	t.Logf("2.5 * 1.5 = %s", pt)

	quot, err := c.DivFloat(ctx, c1, c2)
	if err != nil {
		t.Fatalf("DivFloat: %v", err)
	}
	pt, _ = c.DecryptFloat(ctx, quot)
	t.Logf("2.5 / 1.5 = %s", pt)
}

func TestBinaryBitwise(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	c1, _ := c.EncryptBinary(ctx, "1")
	c2, _ := c.EncryptBinary(ctx, "2")

	cx, _ := c.Xor(ctx, c1, c2)
	pt, _ := c.DecryptBinary(ctx, cx)
	t.Logf("1 XOR 2 = %s", pt)

	ca, _ := c.And(ctx, c1, c2)
	pt, _ = c.DecryptBinary(ctx, ca)
	t.Logf("1 AND 2 = %s", pt)

	co, _ := c.Or(ctx, c1, c2)
	pt, _ = c.DecryptBinary(ctx, co)
	t.Logf("1 OR 2 = %s", pt)

	cn, _ := c.Not(ctx, c1)
	pt, _ = c.DecryptBinary(ctx, cn)
	t.Logf("NOT 1 = %s", pt)
}

func TestBinaryShift(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	cb, _ := c.EncryptBinary(ctx, "1000")

	cs, _ := c.ShiftLeft(ctx, cb, "2")
	pt, _ := c.DecryptBinary(ctx, cs)
	t.Logf("1000 << 2 = %s", pt)

	cs, _ = c.ShiftRight(ctx, cb, "2")
	pt, _ = c.DecryptBinary(ctx, cs)
	t.Logf("1000 >> 2 = %s", pt)

	cs, _ = c.RotateLeft(ctx, cb, "2")
	pt, _ = c.DecryptBinary(ctx, cs)
	t.Logf("1000 rotL 2 = %s", pt)

	cs, _ = c.RotateRight(ctx, cb, "2")
	pt, _ = c.DecryptBinary(ctx, cs)
	t.Logf("1000 rotR 2 = %s", pt)
}

func TestCMux(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	sel, _ := c.EncryptBinary(ctx, "1")
	a, _ := c.EncryptBinary(ctx, "1111")
	b, _ := c.EncryptBinary(ctx, "0000")

	res, err := c.CMux(ctx, sel, a, b)
	if err != nil {
		t.Fatalf("CMux: %v", err)
	}
	pt, _ := c.DecryptBinary(ctx, res)
	t.Logf("CMux(1, 1111, 0000) = %s", pt)
}

func TestCallUnknownFn(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	_, err := c.Call(ctx, "NotARealFunction", []string{"x"})
	if err == nil {
		t.Fatal("expected error for unknown function")
	}
	apiErr, ok := err.(*ApiError)
	if !ok || apiErr.Status != 400 {
		t.Fatalf("expected 400 ApiError, got %T: %v", err, err)
	}
}

func TestCallWrongArity(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}
	c1, _ := c.EncryptFloat(ctx, "1.0")
	_, err := c.Call(ctx, "AddCipherFloat", []string{c1}) // needs 2 args
	if err == nil {
		t.Fatal("expected error for wrong arity")
	}
	apiErr, ok := err.(*ApiError)
	if !ok || apiErr.Status != 400 {
		t.Fatalf("expected 400 ApiError, got %T: %v", err, err)
	}
}

func TestPublicKeyEncrypt(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}
	ct, err := c.EncryptPublicInt(ctx, "3")
	if err != nil {
		t.Fatalf("EncryptPublicInt: %v", err)
	}
	pt, err := c.DecryptInt(ctx, ct)
	if err != nil {
		t.Fatalf("DecryptInt: %v", err)
	}
	if pt != "3" {
		t.Fatalf("public-key round-trip failed: 3 -> %s", pt)
	}
}

// ---------------------------------------------------------------------------
// New API tests (keyxx-core v6)
// ---------------------------------------------------------------------------

func TestIntArithmeticV6(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	i2, _ := c.EncryptInt(ctx, "2")
	i3, _ := c.EncryptInt(ctx, "3")
	i5, _ := c.EncryptInt(ctx, "5")
	i7, _ := c.EncryptInt(ctx, "7")

	sum, err := c.AddInt(ctx, i2, i3)
	if err != nil {
		t.Fatalf("AddInt: %v", err)
	}
	pt, _ := c.DecryptInt(ctx, sum)
	if pt != "5" {
		t.Fatalf("2+3 expected 5, got %s", pt)
	}

	diff, err := c.SubInt(ctx, i5, i3)
	if err != nil {
		t.Fatalf("SubInt: %v", err)
	}
	pt, _ = c.DecryptInt(ctx, diff)
	if pt != "2" {
		t.Fatalf("5-3 expected 2, got %s", pt)
	}

	prod, err := c.MulInt(ctx, i2, i3)
	if err != nil {
		t.Fatalf("MulInt: %v", err)
	}
	pt, _ = c.DecryptInt(ctx, prod)
	if pt != "6" {
		t.Fatalf("2*3 expected 6, got %s", pt)
	}

	quot, err := c.DivInt(ctx, i7, i3)
	if err != nil {
		t.Fatalf("DivInt: %v", err)
	}
	pt, _ = c.DecryptInt(ctx, quot)
	if pt != "2" {
		t.Fatalf("7/3 expected 2, got %s", pt)
	}

	mod, err := c.ModInt(ctx, i7, i3)
	if err != nil {
		t.Fatalf("ModInt: %v", err)
	}
	pt, _ = c.DecryptInt(ctx, mod)
	if pt != "1" {
		t.Fatalf("7%%3 expected 1, got %s", pt)
	}

	cmp, err := c.CompareInt(ctx, i2, i3)
	if err != nil {
		t.Fatalf("CompareInt: %v", err)
	}
	if cmp != "-1" {
		t.Fatalf("Compare(2,3) expected -1, got %s", cmp)
	}

	m, err := c.MapInt(ctx, i2)
	if err != nil {
		t.Fatalf("MapInt: %v", err)
	}
	if m == "" {
		t.Fatal("MapInt returned empty")
	}
}

func TestStringOps(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	if _, err := c.Load(ctx, LoadOptions{SKB: skb, PKB: pkb, DictB: dictb}); err != nil {
		t.Fatalf("Load: %v", err)
	}

	// encrypt/decrypt (private key)
	sHello, err := c.EncryptString(ctx, "hello")
	if err != nil {
		t.Fatalf("EncryptString: %v", err)
	}
	pt, err := c.DecryptString(ctx, sHello)
	if err != nil {
		t.Fatalf("DecryptString: %v", err)
	}
	if pt != "hello" {
		t.Fatalf("String round-trip failed: expected 'hello', got '%s'", pt)
	}

	// encrypt/decrypt (public key)
	sWorld, err := c.EncryptPublicString(ctx, "world")
	if err != nil {
		t.Fatalf("EncryptPublicString: %v", err)
	}
	pt, _ = c.DecryptString(ctx, sWorld)
	if pt != "world" {
		t.Fatalf("Public string round-trip failed: expected 'world', got '%s'", pt)
	}

	// compare
	res, err := c.CompareString(ctx, sHello, sWorld)
	if err != nil {
		t.Fatalf("CompareString: %v", err)
	}
	if res != "-1" {
		t.Fatalf("Compare('hello','world') expected -1, got %s", res)
	}

	// substring
	sub, err := c.SubstringString(ctx, sHello, "1", "4")
	if err != nil {
		t.Fatalf("SubstringString: %v", err)
	}
	pt, _ = c.DecryptString(ctx, sub)
	if pt != "ell" {
		t.Fatalf("Substring expected 'ell', got '%s'", pt)
	}

	// to upper
	up, err := c.ToUpperString(ctx, sHello)
	if err != nil {
		t.Fatalf("ToUpperString: %v", err)
	}
	pt, _ = c.DecryptString(ctx, up)
	if pt != "HELLO" {
		t.Fatalf("ToUpper expected 'HELLO', got '%s'", pt)
	}

	// to lower
	lo, err := c.ToLowerString(ctx, up)
	if err != nil {
		t.Fatalf("ToLowerString: %v", err)
	}
	pt, _ = c.DecryptString(ctx, lo)
	if pt != "hello" {
		t.Fatalf("ToLower expected 'hello', got '%s'", pt)
	}

	// map sm3
	hash, err := c.MapSm3String(ctx, sHello)
	if err != nil {
		t.Fatalf("MapSm3String: %v", err)
	}
	if hash == "" {
		t.Fatal("MapSm3String returned empty")
	}
}

func ExampleClient() {
	// This example is not run as a test (no server). It demonstrates usage.
	_ = func() {
		c, _ := NewClient(ClientOptions{BaseURL: "https://localhost:8443"})
		ctx := context.Background()
		fmt.Println(c.Health(ctx))
	}
}
