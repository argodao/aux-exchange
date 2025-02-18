package cmd

import (
	"fmt"
	"os"
	"path"

	"github.com/aux-exchange/aux-exchange/go-util/aptos"
)

func getConfigFileLocation() (string, bool) {
	home := getOrPanic(os.UserHomeDir())

	dir := path.Join(home, ".aptos")

	if _, err := os.Stat(path.Join(dir, "config.yaml")); !os.IsNotExist(err) {
		return path.Join(dir, "config.yaml"), true
	}
	if _, err := os.Stat(path.Join(dir, "config.yml")); !os.IsNotExist(err) {
		return path.Join(dir, "config.yml"), true
	}

	return path.Join(dir, "config.yaml"), false
}

func getProfile(network string) string {
	switch network {
	case aptos.Mainet:
		return "mainnet"
	case aptos.Devnet:
		return "devnet"
	case aptos.Testnet:
		return "testnet"
	case aptos.Localnet:
		return "localnet"
	default:
		orPanic(fmt.Errorf("unrecognized network: %s", network))
		return ""
	}
}
