"""03-hello-fhe-python — encrypt, compute, decrypt.

    pip install aura-fhe
    python hello.py
"""

from aura_fhe import connect

fhe = connect()

print("health:", fhe.health())

a = fhe.encrypt_int(2)
b = fhe.encrypt_int(1)
print("2 + 1 =", fhe.decrypt_int(fhe.add_int(a, b)))

f1 = fhe.encrypt_float(2.5)
f2 = fhe.encrypt_float(1.5)
print("2.5 + 1.5 =", fhe.decrypt_float(fhe.add_float(f1, f2)))

x = fhe.encrypt_binary(25)
y = fhe.encrypt_binary(10)
print("25 XOR 10 =", fhe.decrypt_binary(fhe.xor(x, y)))
