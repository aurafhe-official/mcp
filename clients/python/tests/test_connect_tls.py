from aura_fhe import connect


def test_genesis_tls_trusted_without_network():
    fhe = connect(base_url="https://api.afhe.io:8443", health_check=False, auto_load=False)
    assert fhe.insecure_tls is True


def test_localhost_tls_trusted_without_network():
    fhe = connect(health_check=False, auto_load=False)
    assert fhe.insecure_tls is True


def test_other_hosts_require_explicit_tls_opt_in():
    fhe = connect(base_url="https://example.com:8443", health_check=False, auto_load=False)
    assert fhe.insecure_tls is False
