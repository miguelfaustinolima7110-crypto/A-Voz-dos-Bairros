# A Voz dos Bairros — projeto Android

Este é o código-fonte inicial do aplicativo, reconstruído a partir das informações e referências visuais fornecidas na conversa. A interface usa fundo bege, verde-escuro, cartões claros, títulos serifados e barra de navegação inferior.

## O que já está no projeto

- Navegação inferior: Início, Bairro, Mapa, Profissionais e Prioridades.
- Visitantes conseguem navegar e consultar os conteúdos.
- Formulário de cadastro com nome, endereço, CEP, e-mail e senha.
- Formulário de registro de problemas.
- Lista de relatos, filtros e busca.
- Tela de prioridades com ação de voto.
- Mapa OpenStreetMap com pontos demonstrativos.
- Estrutura de banco de dados Supabase com regras de acesso (RLS).
- Configuração inicial do Capacitor para Android.

## O que ainda precisa ser configurado

O projeto ainda **não é um APK pronto**. Para ter contas reais e dados compartilhados, é necessário criar um projeto Supabase e inserir as chaves públicas de conexão. Para gerar o APK, é necessário compilar a parte Android em um computador com Node.js, Android Studio e SDK Android instalados.

Os profissionais e pontos do mapa atualmente exibidos são exemplos demonstrativos. Não representam pessoas ou ocorrências reais.

## 1. Configurar o banco online

1. Crie um projeto no Supabase.
2. Abra `supabase/schema.sql` e execute o conteúdo no SQL Editor do Supabase.
3. Em Authentication > Providers, habilite Email.
4. Copie a Project URL e a chave `anon`/publishable do projeto.
5. Faça uma cópia de `.env.example` com o nome `.env` e preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Nunca coloque a chave `service_role` no aplicativo.

**Privacidade:** a tabela de perfis restringe a leitura do endereço e CEP ao próprio usuário. Não publique endereços residenciais em relatos ou no mapa. Antes de usar com moradores reais, defina um aviso de privacidade e peça somente os dados necessários.

## 2. Testar no navegador

Instale Node.js LTS. Na pasta do projeto, execute:

```bash
npm install
npm run dev
```

Abra o endereço local mostrado pelo Vite.

Sem configurar Supabase, a interface pode ser explorada, mas cadastro, login, envio e votos reais ficam desativados.

## 3. Gerar APK Android

É necessário um computador com Android Studio e Android SDK.

```bash
npm install
npx cap add android
npm run android:sync
npx cap open android
```

No Android Studio:
1. Aguarde a sincronização do Gradle.
2. Abra **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Ao terminar, use o aviso **Locate** para encontrar o arquivo APK.
4. Transfira o APK ao telefone Android e instale. O Android pode pedir autorização para instalar apps dessa origem.

Para atualizar o app após mudanças no código:

```bash
npm run android:sync
```

Depois gere um novo APK pelo Android Studio.

## Limitações desta primeira versão

- Ainda não há painel administrativo para moderar relatos e atualizar status.
- O formulário ainda não envia fotos.
- A localização real do relato ainda não é capturada; os marcadores atuais são ilustrativos.
- Os perfis de profissionais precisam ser cadastrados e verificados antes de serem exibidos como reais.
- O mapa está centralizado em uma localização demonstrativa; ajuste o centro para a cidade atendida antes de publicar.
- A autenticação por e-mail pode exigir confirmação conforme as configurações do Supabase.

Este código é uma base funcional em desenvolvimento, não um serviço já publicado ou validado em produção.
