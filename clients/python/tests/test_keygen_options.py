from typing import Optional, get_type_hints

from aura_fhe import KeygenOptions


def test_keygen_options_delta_type_allows_fractional_values():
    hints = get_type_hints(KeygenOptions)
    assert hints["delta"] == Optional[float]


def test_keygen_options_preserve_fractional_delta():
    assert KeygenOptions(delta=0.001).to_dict()["delta"] == 0.001
