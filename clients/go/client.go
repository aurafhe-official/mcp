// Package afhe provides a Go client SDK for the afhe.api HTTPS web service.
// It covers every endpoint exposed by the Go service and provides typed
// helpers for all supported SDK functions.
package afhe

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Domain is a plaintext domain for encrypt/decrypt operations.
type Domain = string

const (
	DomainInt    Domain = "int"
	DomainFloat  Domain = "float"
	DomainString Domain = "string"
	DomainBinary Domain = "binary"
)

// Ciphertext is an opaque ciphertext string returned by the server.
type Ciphertext = string

// ClientOptions configures the AfheClient.
type ClientOptions struct {
	// BaseURL is the server URL, e.g. "https://localhost:8443".
	BaseURL string
	// HTTPClient overrides the default http.Client. Useful for custom TLS settings.
	HTTPClient *http.Client
	// ExtraHeaders are added to every request.
	ExtraHeaders map[string]string
}

// KeygenOptions is the body for POST /keygen.
type KeygenOptions struct {
	M         *int     `json:"m,omitempty"`
	N         *int     `json:"n,omitempty"`
	Q         *int     `json:"q,omitempty"`
	P         *int     `json:"p,omitempty"`
	Delta     *float64 `json:"delta,omitempty"`
	SKBFile   *string  `json:"skb_file,omitempty"`
	PKBFile   *string  `json:"pkb_file,omitempty"`
	DictBFile *string  `json:"dictb_file,omitempty"`
	Force     *bool    `json:"force,omitempty"`
}

// KeygenResult is the response from POST /keygen.
type KeygenResult struct {
	Skipped   bool   `json:"skipped"`
	SKBFile   string `json:"skb_file"`
	PKBFile   string `json:"pkb_file"`
	DictBFile string `json:"dictb_file"`
}

// LoadOptions is the body for POST /load.
type LoadOptions struct {
	SKB   string `json:"skb,omitempty"`
	PKB   string `json:"pkb,omitempty"`
	DictB string `json:"dictb,omitempty"`
}

// LoadResult is the response from POST /load.
type LoadResult struct {
	Loaded []string `json:"loaded"`
}

// FunctionsList is the response from GET /functions.
type FunctionsList struct {
	Arity1 []string `json:"arity1"`
	Arity2 []string `json:"arity2"`
	Arity3 []string `json:"arity3"`
}

// CallResult is the response from POST /call.
type CallResult struct {
	Result string `json:"result"`
}

// VerifyResult is the response from POST /verify.
type VerifyResult struct {
	Valid bool `json:"valid"`
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

// ApiError is returned when the server responds with a non-2xx status.
type ApiError struct {
	Status  int
	Message string
	Body    []byte
}

func (e *ApiError) Error() string {
	return fmt.Sprintf("afhe.api error status=%d: %s", e.Status, e.Message)
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

// Client is a Go SDK client for afhe.api.
type Client struct {
	baseURL    string
	httpClient *http.Client
	headers    map[string]string
}

// NewClient creates a new afhe.api client.
func NewClient(opts ClientOptions) (*Client, error) {
	if opts.BaseURL == "" {
		return nil, fmt.Errorf("afhe: BaseURL is required")
	}
	c := &Client{
		baseURL: opts.BaseURL,
		headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
	if opts.HTTPClient != nil {
		c.httpClient = opts.HTTPClient
	} else {
		c.httpClient = &http.Client{
			Timeout: 120 * time.Second,
		}
	}
	for k, v := range opts.ExtraHeaders {
		c.headers[k] = v
	}
	return c, nil
}

func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("afhe: marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("afhe: new request: %w", err)
	}
	for k, v := range c.headers {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("afhe: do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("afhe: read body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := extractError(respBody)
		return &ApiError{
			Status:  resp.StatusCode,
			Message: msg,
			Body:    respBody,
		}
	}

	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			return fmt.Errorf("afhe: unmarshal body: %w", err)
		}
	}
	return nil
}

func extractError(data []byte) string {
	var m map[string]any
	if json.Unmarshal(data, &m) == nil {
		if s, ok := m["error"].(string); ok {
			return s
		}
	}
	return string(data)
}

// ---------------------------------------------------------------------------
// Health / Discovery
// ---------------------------------------------------------------------------

// Health checks server liveness.
func (c *Client) Health(ctx context.Context) (map[string]string, error) {
	var out map[string]string
	err := c.do(ctx, "GET", "/health", nil, &out)
	return out, err
}

// Functions lists all SDK functions accepted by the /call router.
func (c *Client) Functions(ctx context.Context) (*FunctionsList, error) {
	var out FunctionsList
	err := c.do(ctx, "GET", "/functions", nil, &out)
	return &out, err
}

// ---------------------------------------------------------------------------
// Init / Keys
// ---------------------------------------------------------------------------

// Init calls the SDK's Init() (usually unnecessary; server auto-inits).
func (c *Client) Init(ctx context.Context) (map[string]bool, error) {
	var out map[string]bool
	err := c.do(ctx, "POST", "/init", map[string]any{}, &out)
	return out, err
}

// Keygen requests key generation.
// NOTE: keyxx-core-c does not support key generation; this will return a 500 error.
func (c *Client) Keygen(ctx context.Context, opts KeygenOptions) (*KeygenResult, error) {
	var out KeygenResult
	err := c.do(ctx, "POST", "/keygen", opts, &out)
	return &out, err
}

// Load loads key blocks into the SDK runtime.
func (c *Client) Load(ctx context.Context, opts LoadOptions) (*LoadResult, error) {
	var out LoadResult
	err := c.do(ctx, "POST", "/load", opts, &out)
	return &out, err
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

// Encrypt encrypts a plaintext value.
func (c *Client) Encrypt(ctx context.Context, domain Domain, value string, public bool) (Ciphertext, error) {
	var out struct {
		Ciphertext string `json:"ciphertext"`
	}
	err := c.do(ctx, "POST", "/encrypt/"+domain, map[string]any{
		"value":  value,
		"public": public,
	}, &out)
	return out.Ciphertext, err
}

// Decrypt decrypts a ciphertext.
func (c *Client) Decrypt(ctx context.Context, domain Domain, ciphertext Ciphertext) (string, error) {
	var out struct {
		Plaintext string `json:"plaintext"`
	}
	err := c.do(ctx, "POST", "/decrypt/"+domain, map[string]any{
		"ciphertext": ciphertext,
	}, &out)
	return out.Plaintext, err
}

// ---------------------------------------------------------------------------
// Generic /call dispatch
// ---------------------------------------------------------------------------

// Call is the generic dispatcher for any SDK function.
func (c *Client) Call(ctx context.Context, fn string, args []string) (string, error) {
	var out CallResult
	err := c.do(ctx, "POST", "/call", map[string]any{
		"fn":   fn,
		"args": args,
	}, &out)
	return out.Result, err
}

// Verify requests signature verification.
// NOTE: keyxx-core-c does not support signing; this will return a 500 error.
func (c *Client) Verify(ctx context.Context, input, sign string) (bool, error) {
	var out VerifyResult
	err := c.do(ctx, "POST", "/verify", map[string]any{
		"input": input,
		"sign":  sign,
	}, &out)
	return out.Valid, err
}

// ---------------------------------------------------------------------------
// Typed helpers for every supported SDK function.
// ---------------------------------------------------------------------------

// ---- encryption (private key) ---------------------------------------------

// EncryptInt encrypts an integer.
func (c *Client) EncryptInt(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainInt, value, false)
}

// EncryptFloat encrypts a float.
func (c *Client) EncryptFloat(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainFloat, value, false)
}

// EncryptString encrypts a string.
func (c *Client) EncryptString(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainString, value, false)
}

// EncryptBinary encrypts a binary value.
func (c *Client) EncryptBinary(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainBinary, value, false)
}

// ---- encryption (public key) ----------------------------------------------

// EncryptPublicInt encrypts an integer with the public key.
func (c *Client) EncryptPublicInt(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainInt, value, true)
}

// EncryptPublicFloat encrypts a float with the public key.
func (c *Client) EncryptPublicFloat(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainFloat, value, true)
}

// EncryptPublicString encrypts a string with the public key.
func (c *Client) EncryptPublicString(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainString, value, true)
}

// EncryptPublicBinary encrypts a binary value with the public key.
func (c *Client) EncryptPublicBinary(ctx context.Context, value string) (Ciphertext, error) {
	return c.Encrypt(ctx, DomainBinary, value, true)
}

// ---- decryption -----------------------------------------------------------

// DecryptInt decrypts an integer ciphertext.
func (c *Client) DecryptInt(ctx context.Context, ciphertext Ciphertext) (string, error) {
	return c.Decrypt(ctx, DomainInt, ciphertext)
}

// DecryptFloat decrypts a float ciphertext.
func (c *Client) DecryptFloat(ctx context.Context, ciphertext Ciphertext) (string, error) {
	return c.Decrypt(ctx, DomainFloat, ciphertext)
}

// DecryptString decrypts a string ciphertext.
func (c *Client) DecryptString(ctx context.Context, ciphertext Ciphertext) (string, error) {
	return c.Decrypt(ctx, DomainString, ciphertext)
}

// DecryptBinary decrypts a binary ciphertext.
func (c *Client) DecryptBinary(ctx context.Context, ciphertext Ciphertext) (string, error) {
	return c.Decrypt(ctx, DomainBinary, ciphertext)
}

// ---- Int arithmetic (need DictB + opt-dict) -------------------------------

// AddInt adds two integer ciphertexts.
func (c *Client) AddInt(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "AddCipherInt", []string{a, b})
}

// SubInt subtracts two integer ciphertexts.
func (c *Client) SubInt(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "SubstractCipherInt", []string{a, b})
}

// MulInt multiplies two integer ciphertexts.
func (c *Client) MulInt(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "MultiplyCipherInt", []string{a, b})
}

// DivInt divides two integer ciphertexts.
func (c *Client) DivInt(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "DivideCipherInt", []string{a, b})
}

// ModInt computes the modulus of two integer ciphertexts.
func (c *Client) ModInt(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "ModCipherInt", []string{a, b})
}

// CompareInt compares two integer ciphertexts. Returns "-1", "0", or "1".
func (c *Client) CompareInt(ctx context.Context, a, b Ciphertext) (string, error) {
	return c.Call(ctx, "CompareCipherInt", []string{a, b})
}

// MapInt maps an integer ciphertext to a deterministic value.
func (c *Client) MapInt(ctx context.Context, a Ciphertext) (string, error) {
	return c.Call(ctx, "MapCipherInt", []string{a})
}

// ---- Float arithmetic (need DictB) ----------------------------------------

// AddFloat adds two float ciphertexts.
func (c *Client) AddFloat(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "AddCipherFloat", []string{a, b})
}

// SubFloat subtracts two float ciphertexts.
func (c *Client) SubFloat(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "SubstractCipherFloat", []string{a, b})
}

// MulFloat multiplies two float ciphertexts.
func (c *Client) MulFloat(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "MultiplyCipherFloat", []string{a, b})
}

// DivFloat divides two float ciphertexts.
func (c *Client) DivFloat(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "DivideCipherFloat", []string{a, b})
}

// ---- Bitwise (Binary only, need DictB) ------------------------------------

// Xor computes XOR of two binary ciphertexts.
func (c *Client) Xor(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "XORCipher", []string{a, b})
}

// And computes AND of two binary ciphertexts.
func (c *Client) And(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "ANDCipher", []string{a, b})
}

// Or computes OR of two binary ciphertexts.
func (c *Client) Or(ctx context.Context, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "ORCipher", []string{a, b})
}

// Not computes NOT of a binary ciphertext.
func (c *Client) Not(ctx context.Context, a Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "NOTCipher", []string{a})
}

// ---- Shift / Rotate -------------------------------------------------------

// ShiftLeft shifts a binary ciphertext left by a plaintext bias.
func (c *Client) ShiftLeft(ctx context.Context, a Ciphertext, bias string) (Ciphertext, error) {
	return c.Call(ctx, "ShiftLeft", []string{a, bias})
}

// ShiftRight shifts a binary ciphertext right by a plaintext bias.
func (c *Client) ShiftRight(ctx context.Context, a Ciphertext, bias string) (Ciphertext, error) {
	return c.Call(ctx, "ShiftRight", []string{a, bias})
}

// RotateLeft rotates a binary ciphertext left by a plaintext bias.
func (c *Client) RotateLeft(ctx context.Context, a Ciphertext, bias string) (Ciphertext, error) {
	return c.Call(ctx, "RotateLeft", []string{a, bias})
}

// RotateRight rotates a binary ciphertext right by a plaintext bias.
func (c *Client) RotateRight(ctx context.Context, a Ciphertext, bias string) (Ciphertext, error) {
	return c.Call(ctx, "RotateRight", []string{a, bias})
}

// ---- String ops -----------------------------------------------------------

// CompareString compares two string ciphertexts. Returns "-1", "0", or "1".
func (c *Client) CompareString(ctx context.Context, a, b Ciphertext) (string, error) {
	return c.Call(ctx, "CompareCipherString", []string{a, b})
}

// SubstringString extracts a substring from an encrypted string.
func (c *Client) SubstringString(ctx context.Context, a Ciphertext, start, end string) (Ciphertext, error) {
	return c.Call(ctx, "SubstringCipherString", []string{a, start, end})
}

// ToUpperString converts an encrypted string to upper case.
func (c *Client) ToUpperString(ctx context.Context, a Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "ToUpperCipherString", []string{a})
}

// ToLowerString converts an encrypted string to lower case.
func (c *Client) ToLowerString(ctx context.Context, a Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "ToLowerCipherString", []string{a})
}

// MapSm3String computes the SM3 hash of an encrypted string. Returns a base64-encoded hash.
func (c *Client) MapSm3String(ctx context.Context, a Ciphertext) (string, error) {
	return c.Call(ctx, "MapSm3CipherString", []string{a})
}

// ---- CMux -----------------------------------------------------------------

// CMux is an encrypted ternary: sel ? a : b. All three args are Binary ciphertexts.
func (c *Client) CMux(ctx context.Context, sel, a, b Ciphertext) (Ciphertext, error) {
	return c.Call(ctx, "CMux", []string{sel, a, b})
}
