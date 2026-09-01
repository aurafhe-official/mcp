// 02-hello-fhe-go — encrypt, compute, decrypt.
//
//	go run main.go
package main

import (
	"context"
	"fmt"
	"log"

	afhe "github.com/aurafhe-official/mcp/clients/go"
)

func main() {
	ctx := context.Background()
	fhe, err := afhe.Connect(ctx)
	if err != nil {
		log.Fatal(err)
	}

	hp, _ := fhe.Health(ctx)
	fmt.Println("health:", hp)

	a, _ := fhe.EncryptInt(ctx, "2")
	b, _ := fhe.EncryptInt(ctx, "1")
	sum, _ := fhe.AddInt(ctx, a, b)
	pt, _ := fhe.DecryptInt(ctx, sum)
	fmt.Println("2 + 1 =", pt)

	f1, _ := fhe.EncryptFloat(ctx, "2.5")
	f2, _ := fhe.EncryptFloat(ctx, "1.5")
	fSum, _ := fhe.AddFloat(ctx, f1, f2)
	fPt, _ := fhe.DecryptFloat(ctx, fSum)
	fmt.Println("2.5 + 1.5 =", fPt)

	x, _ := fhe.EncryptBinary(ctx, "25")
	y, _ := fhe.EncryptBinary(ctx, "10")
	xor, _ := fhe.Xor(ctx, x, y)
	xPt, _ := fhe.DecryptBinary(ctx, xor)
	fmt.Println("25 XOR 10 =", xPt)
}
