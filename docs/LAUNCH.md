# Release gate

The diagnostic preview can be installed from source using [QUICKSTART.md](QUICKSTART.md). It must not be promoted as a production privacy product while `release-status.json` says `productionReady:false`.

Required next milestone: repair or replace the native cryptographic engine; independently assess confidentiality with public/evaluation material and no secret key; then rerun functional and adversarial tests. Hosted HTTP, package-registry publication, secure multi-party products and real-data deployment are not enabled by this change.
