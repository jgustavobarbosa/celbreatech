# CELBREA.IA: guia de instalação (acesso sem conta Claude)

O CELBREA.IA independente tem duas partes:

- **Banco de dados e login (Supabase):** guarda os cadastros, os aceites LGPD e os testes, com servidor em São Paulo.
- **Site (Netlify):** é o link que a equipe abre no computador, no tablet e no celular.

Tempo estimado: 20 a 30 minutos. Não é preciso programar.

## Arquivos desta pasta

| Arquivo | Para que serve |
|---|---|
| `index.html` | O aplicativo |
| `config.js` | Onde você cola os dados de conexão do Supabase (passo 4) |
| `schema.sql` | Cria as tabelas e as regras de segurança do banco (passo 2) |
| `_headers` | Regras de segurança do site (lidas pela Netlify) |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Ícone para “Adicionar à tela inicial” |

---

## 1. Criar o banco de dados no Supabase

1. Acesse **supabase.com** e crie uma conta (pode entrar com o e-mail).
2. Clique em **New project**.
   - **Name:** `celbrea-ia`
   - **Database password:** crie uma senha forte e guarde-a.
   - **Region:** **South America (São Paulo)**. Isso mantém os dados no Brasil.
3. Aguarde a criação, que leva 1 a 2 minutos.

## 2. Criar as tabelas e a segurança

1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Abra o arquivo `schema.sql`, copie todo o conteúdo, cole no editor e clique em **Run**.
3. Deve aparecer “Success”. O script pode ser rodado de novo sem perder dados.

## 3. Configurar o login por e-mail

1. Abra **Authentication** e depois **Sign In / Providers** (ou **Providers**) e **Email**.
2. Deixe **Enable Email provider** e **Confirm email** ligados.
3. Em **Minimum password length**, coloque **8**.

## 4. Ligar o aplicativo ao banco

1. Abra **Project Settings** e depois **API** (ou o botão **Connect** no topo).
2. Copie a **Project URL** e a chave **anon public**.
3. Abra o arquivo `config.js` num editor de texto (Bloco de Notas, TextEdit) e cole os dois valores no lugar de `COLE_AQUI_...`. Mantenha as aspas.
4. **Nunca** use a chave `service_role` no aplicativo.

## 5. Publicar o site

1. Acesse **app.netlify.com/drop** e crie uma conta gratuita.
2. Arraste **a pasta inteira** `celbrea-ia`, já com o `config.js` preenchido, para a área indicada.
3. Em segundos você recebe um link como `https://nome-aleatorio.netlify.app`.
4. Para trocar o nome, vá em **Site configuration** → **Change site name** (por exemplo, `celbrea-ia` → `https://celbrea-ia.netlify.app`).

Para atualizar o site no futuro, vá em **Deploys** e arraste a pasta de novo.

## 6. Informar o link ao Supabase

No Supabase, abra **Authentication** → **URL Configuration**:

- **Site URL:** o link da Netlify (ex.: `https://celbrea-ia.netlify.app`).
- **Redirect URLs:** adicione o mesmo link.

Sem esse passo, os links de confirmação de e-mail e de nova senha não abrem o aplicativo.

## 7. Criar o primeiro administrador (você)

1. Abra o link do site, toque em **Criar cadastro**, preencha os dados e aceite o termo LGPD.
2. Confirme pelo link que chega no seu e-mail.
3. No Supabase, abra **SQL Editor** → **New query**, cole a linha abaixo com o seu e-mail e clique em **Run**:

   ```sql
   update public.profissionais set ativo = true, papel = 'admin' where email = 'seu-email@exemplo.com';
   ```

4. Volte ao site e entre. Você verá “administrador” ao lado do seu nome.

## 8. Liberar a equipe

1. Envie o link do site para cada profissional. Cada um cria o próprio cadastro, com e-mail, senha e aceite LGPD, e confirma o e-mail.
2. Na aba **Registros**, em **Profissionais cadastrados**, toque em **Liberar** para cada pessoa.
3. Só profissionais liberados veem e salvam dados de pacientes. Use **Bloquear** para retirar o acesso de quem sai da equipe.

## 9. Usar no computador, no tablet e no celular

- **Computador:** abra o link no navegador.
- **iPhone ou iPad:** abra o link no Safari → **Compartilhar** → **Adicionar à Tela de Início**.
- **Android:** abra o link no Chrome → menu **⋮** → **Adicionar à tela inicial**.

A sessão fica aberta só até fechar o navegador e é encerrada após 15 minutos sem uso.

---

## Segurança e LGPD: o que já está pronto

- Login individual com e-mail confirmado. As senhas ficam criptografadas pelo Supabase.
- Aceite do termo LGPD obrigatório e registrado com data e hora (tabela `aceites_lgpd` e planilha “Aceites LGPD” no Excel do administrador).
- Consentimento da paciente obrigatório para salvar o teste.
- Novos cadastros não acessam nada até o administrador liberar.
- Regras de segurança no próprio banco (Row Level Security):
  - quem não está liberado não lê nem grava testes;
  - ninguém grava em nome de outra pessoa;
  - só administradores excluem testes e veem a lista de profissionais e de aceites;
  - ninguém consegue se promover a administrador sozinho.
- Banco de dados em São Paulo e conexão sempre criptografada (HTTPS).

## Recomendações antes do uso clínico

- **Plano do Supabase.** No plano gratuito, o projeto é pausado depois de alguns dias sem uso e não há backup diário. Para uso com pacientes, considere o plano pago, que mantém o projeto sempre ativo e inclui backups (confira o preço atual no site).
- **Envio de e-mails.** O envio de e-mails de confirmação do Supabase tem limite baixo por hora. Para uma equipe maior, configure um SMTP próprio em **Authentication** → **Emails** → **SMTP Settings**.
- **Revisão jurídica.** Revise o Termo de uso e privacidade com o jurídico ou o encarregado (DPO) da instituição. A instituição é a controladora dos dados.
- **Proteção das contas.** Ative a verificação em duas etapas na sua conta do Supabase e na da Netlify.
- **Leitura por foto.** Funciona no próprio aparelho, sem enviar as fotos para nenhum servidor. As fotos não são salvas.
