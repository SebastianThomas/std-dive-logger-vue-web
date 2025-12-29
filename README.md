# Dive Together Log Frontend

## Dev Server 

To run the dev server with `https`, we use mkcert. First install it,

```bash
# macOS
brew install mkcert

# Windows (choco)
choco install mkcert

# Linux
sudo apt install libnss3-tools
```

then 

```bash
mkcert -install
```

Then you can go ahead with `yarn dev` inside the `./vue/` directory
