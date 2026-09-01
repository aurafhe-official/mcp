# Changelog

All notable changes to `@aura/fhe-client` will be documented in this file.

## [0.2.0] - 2026-04-07

### Added
- `AfheClient` class — zero-dependency HTTPS client for the Aura FHE service
- Typed helpers for all encrypt, decrypt, arithmetic, bitwise, string, scientific, and signing operations
- `AfheApiError` class for structured error handling
- Configurable timeout, custom fetch, and abort signal support
- Unit tests with mock-based validation

### Changed
- Streamlined SDK to a clean HTTPS client
- Simplified API surface to typed helpers over REST endpoints

### Removed
- Legacy modules superseded by server-side processing
