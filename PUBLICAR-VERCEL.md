# Publicar o Barber Prime

Esta versão inclui a adaptação para Vercel e banco Turso/libSQL. A publicação depende de criar o banco e configurar as quatro variáveis abaixo. Nenhuma senha vem no projeto.

## 1. Atualizar o seu GitHub

Extraia o ZIP. Copie seu conteúdo para a pasta do projeto que você já enviou ao GitHub, substituindo os arquivos. Preserve a pasta `.git` e a pasta `work` do seu computador. Não envie o ZIP como um arquivo dentro do repositório.

No terminal do VS Code, dentro dessa pasta:

```sh
git add .
git status
git commit -m "Adapta Barber Prime para Vercel e banco online"
git push origin main
```

Confira no `git status` que não há `.env`, banco `.sqlite`, senhas ou dados de clientes sendo enviados. O `.gitignore` incluído protege os arquivos locais novos, mas não remove arquivos já rastreados anteriormente.

## 2. Criar o banco

Acesse https://turso.tech e crie um banco compatível com **libSQL**. Copie a URL do banco e gere um token de acesso. Guarde ambos nas variáveis da Vercel; não coloque o token no código nem neste chat.

O banco online começará com serviços e profissionais de exemplo. Os agendamentos do banco local não são transferidos automaticamente. Ajuste os cadastros antes de entregar ao cliente.

## 3. Configurar a Vercel

Importe `faba2024/barber_new26`. Na tela Novo Projeto:

| Campo | Valor |
| --- | --- |
| Preset de aplicação | Other |
| Diretório Root | ./ |
| Comando de construção | npm run build:vercel |
| Diretório de saída | vercel-public |
| Comando de instalação | npm ci |
| Node.js | 24.x |

O arquivo `vercel.json` já define o comando e a saída. Se você tiver preenchido outros valores na tela, altere-os para estes.

Em **Environment Variables / Variáveis de ambiente**, configure para **Production**:

| Nome | Conteúdo |
| --- | --- |
| TURSO_DATABASE_URL | URL do banco libSQL, iniciada por libsql:// |
| TURSO_AUTH_TOKEN | Token gerado no Turso |
| ADMIN_EMAIL | E-mail real do proprietário que terá acesso |
| ADMIN_SETUP_KEY | Código secreto aleatório de instalação, com pelo menos 32 caracteres |

Para gerar o código, execute no terminal local:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie a saída para ADMIN_SETUP_KEY. Guarde esse código com segurança. Não é a senha de login. Use outro banco e outras credenciais caso habilite ambientes Preview; não compartilhe o banco de produção com versões de teste.

Clique **Deploy / Implantar**. O build cria as tabelas uma única vez no banco e prepara os arquivos públicos. Sem as variáveis do Turso, o build falhará de propósito. Se alterar variáveis depois, faça um novo deployment.

## 4. Criar o acesso do proprietário

Abra o endereço HTTPS fornecido pela Vercel e acrescente `/admin`.
No primeiro acesso, informe o código ADMIN_SETUP_KEY, o mesmo e-mail de ADMIN_EMAIL e uma senha de pelo menos 10 caracteres. Depois, basta e-mail e senha. Não altere ADMIN_EMAIL após criar o acesso sem planejar a troca da conta. Ainda não há recuperação de senha por e-mail.

As sessões duram oito horas e ficam no banco. O botão Sair encerra a sessão. Após dez tentativas de autenticação por janela de quinze minutos, o acesso é temporariamente limitado.

## 5. Conferir antes de entregar

Faça um agendamento de teste com telefone; abra o painel e confirme que aparece. Saia e entre novamente. Teste em outro dispositivo. Ajuste endereço, expediente, serviços, preços e equipe. Entregue o endereço público e o acesso ao proprietário.

Os lembretes de WhatsApp continuam sendo preparados para envio manual. Envio automático exige integração adicional com um provedor WhatsApp Business. Publicar na Vercel não ativa esse serviço.

O código foi testado localmente; a conexão com seu Turso e a publicação precisam ser verificadas após preencher as credenciais. Para uso comercial, confira o plano aplicável da hospedagem. Configure backups do banco antes do uso real.

## Rodar no computador

Instale Node.js 24 e execute `npm install` e `npm run dev`, ou abra INICIAR-BARBER.cmd. O modo local continua usando seu próprio banco em `work/barber.sqlite`, separado do banco online.

Referências: https://vercel.com/docs/functions/runtimes/node-js e https://docs.turso.tech/sdk/ts/reference.
