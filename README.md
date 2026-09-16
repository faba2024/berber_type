# Barber Prime

Aplicativo web de barbearia com agendamento e painel administrativo.

## Abrir no computador

Requer Node.js 24 ou superior. Depois de extrair o ZIP, clique duas vezes em **INICIAR-BARBER.cmd**. Não é necessário executar npm install para usar o aplicativo local.

Se preferir o terminal, abra-o nesta pasta e execute:

```
node server/local.mjs
```

Acesse http://127.0.0.1:5173 e clique em “Acessar painel”. No primeiro acesso, cadastre seu e-mail e uma senha de pelo menos 10 caracteres. Não existe senha padrão. Depois, o painel exige esse login, com sessão de até 8 horas e botão para sair. A senha é armazenada com salt e hash scrypt, nunca em texto puro. O servidor aceita apenas conexões locais; não exponha o servidor local na internet.

Na pasta original do projeto, http://127.0.0.1:5173/baixar oferece um botão de download do ZIP atualizado. Esse endereço funciona apenas no computador onde o servidor está aberto.

Os registros são salvos em `work/barber.sqlite`. O banco é criado automaticamente e não acompanha o pacote de entrega. Faça backup desse arquivo com o servidor parado. Os testes usam banco separado em memória.

## Funcionalidades

- Agendamento com nome, celular com DDD, serviço, profissional, data, horário, observações e autorização opcional para lembretes.
- Validação de celular, disponibilidade e bloqueio transacional de horários sobrepostos.
- Agenda com busca, filtro por data/status, confirmação, conclusão, cancelamento e falta.
- Painel Meu dia com agenda semanal por profissional, confirmações pendentes, visão compacta no celular e resumo financeiro da data selecionada.
- Clientes agrupados por telefone e histórico de atendimentos.
- Cadastro e edição de serviços, preços, duração, profissionais e comissões.
- Cadastro de produtos, preço e saldo de estoque informado manualmente.
- Despesas, receita de serviços concluídos, comissões e resultado operacional mensal.
- Exportação CSV de agenda, clientes e despesas.
- Preparação de lembretes autorizados com revisão antes de abrir WhatsApp.
- Configuração da barbearia e telefone comercial 55 77 98138-8366.

## O que ainda precisa ser conectado

O envio de WhatsApp é manual: abrir a conversa não comprova envio. Envio automático exige WhatsApp Business Platform, modelo aprovado, credenciais de servidor e um agendador. Nenhuma mensagem é enviada por este código em segundo plano.

Pagamento online, vendas com baixa automática de estoque e assinaturas do Clube Prime não estão integrados. Receita exibida corresponde aos serviços marcados como concluídos, não à conciliação bancária. Cadastros iniciais de profissionais, serviços e produtos são exemplos editáveis; a agenda e o financeiro começam vazios.

## Hospedagem

Para publicar na **Vercel com banco Turso/libSQL**, siga [PUBLICAR-VERCEL.md](PUBLICAR-VERCEL.md). A configuração está incluída em `vercel.json`. O primeiro cadastro administrativo exige o código secreto de instalação e o e-mail configurados na Vercel. As sessões online são persistidas no banco.

Esta entrega contém o código adaptado e testado localmente. O banco online ainda precisa ser criado e as variáveis precisam ser preenchidas na sua conta antes da publicação. Os dados do banco local não são enviados automaticamente.

## Desenvolvimento

O servidor local utiliza APIs nativas do Node. `npm install` instala também o cliente libSQL para a versão online. `npm run build:vercel` aplica as migrações no Turso e prepara os arquivos públicos; exige as variáveis do banco. `npm run build` mantém o build legado de Worker. Migrações são geradas por Drizzle e ficam em `drizzle/`.

As imagens principais foram geradas para esta apresentação; não representam o estabelecimento real. As miniaturas de catálogo usam recortes da referência fornecida. Substitua por fotos reais antes da divulgação comercial.
