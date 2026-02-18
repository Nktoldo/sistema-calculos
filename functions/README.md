# Cloud Functions - Sistema de Cálculos

Este diretório contém as Cloud Functions do Firebase para o Sistema de Cálculos.

## Funções Disponíveis

### `createEmployee`
Cria um novo usuário/funcionário no sistema usando o Firebase Admin SDK. Esta função garante que o administrador que está criando o usuário não seja deslogado.

**Parâmetros:**
- `email` (string): Email do novo usuário
- `password` (string): Senha do novo usuário (mínimo 6 caracteres)
- `nome` (string): Nome do usuário
- `role` (string): Role do usuário ('admin' ou 'func')
- `empresa` (string): Empresa do usuário

**Retorno:**
```json
{
  "success": true,
  "uid": "user-id",
  "email": "email@exemplo.com",
  "nome": "Nome do Usuário",
  "role": "func",
  "empresa": "nome-da-empresa"
}
```

**Validações:**
- Verifica se o usuário está autenticado
- Verifica se o usuário é admin
- Valida formato de email
- Valida senha (mínimo 6 caracteres)
- Verifica se o email já está em uso

## Instalação

```bash
cd functions
npm install
```

## Desenvolvimento Local

Para testar as funções localmente, você precisa do Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase emulators:start --only functions
```

## Deploy

Para fazer deploy das funções para produção:

```bash
firebase deploy --only functions
```

## Configuração

Certifique-se de que o Firebase Admin SDK está configurado corretamente. O Admin SDK será inicializado automaticamente quando a função for executada no ambiente do Firebase.

