package utils

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

func ParseAuthfile(authfile io.Reader) (username, password string, err error) {
	scanner := bufio.NewScanner(authfile)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			return "", "", fmt.Errorf("wrong syntax (expected `username:password`)")
		}
		username = parts[0]
		password = parts[1]
		break
	}
	return username, password, nil
}

func GetPocketAuth() (key, token string, err error) {
	var pocketfile string
	configPath, err := os.UserConfigDir()

	storagePath := filepath.Join(configPath, "yarr")
	pocketfile = filepath.Join(storagePath, "pocket.txt")
	f, err := os.Open(pocketfile)
	if err != nil {
		log.Fatal("Failed to open auth file: ", err)
	}
	defer f.Close()

	key, token, err = ParseAuthfile(f)

	if err != nil {
		log.Fatal("Failed to parse auth file: ", err)
	}

	return key, token, err
}
