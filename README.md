# SmartBiz · Frontend

Interface web do SmartBiz hospedada via GitHub Pages.

## 🚀 Setup rápido

### 1. Instalar ngrok
```bash
# Linux/Pop!_OS
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```
Crie conta em https://ngrok.com e autentique:
```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

### 2. Subir o backend + ngrok
```bash
# Terminal 1 — backend Spring Boot
./mvnw spring-boot:run

# Terminal 2 — túnel HTTPS
ngrok http 8080
```
Copie a URL do ngrok (ex: `https://abc-12-34-56.ngrok-free.app`)

### 3. Atualizar a URL no frontend
No arquivo `api.js`, linha 10, troque:
```js
var BACKEND_URL = 'https://COLE-SUA-URL-NGROK-AQUI.ngrok-free.app';
```
Pela URL atual do ngrok. Depois:
```bash
git add api.js
git commit -m "chore: update ngrok URL"
git push
```

### 4. Atualizar o backend (só na primeira vez)
Em `application.properties`:
```properties
smartbiz.frontend-url=https://dvx0exe.github.io/smartbiz-frontend
```

## ⚠️ Limitações (ngrok grátis)
- A URL muda toda vez que reiniciar o ngrok → atualizar `api.js` e dar push
- Login com Google requer que a URL do ngrok esteja cadastrada no Google Cloud Console
- Login com e-mail/senha funciona normalmente sem configuração extra

## 📁 Estrutura
```
├── api.js          ← configuração do backend URL (atualizar aqui)
├── index.html
├── login.html
├── login-success.html
├── admin-dashboard.html
├── admin-cadastro.html
├── estoque.html
├── clientes.html
├── pdv.html
├── caixa.html
├── pagamentos.html
├── nfe.html
├── style.css
└── favicon.svg
```
