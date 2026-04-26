# Portal Dr. Guilherme

Portal web de atendimento ao paciente — Next.js 14, Tailwind CSS, Supabase e TypeScript.

## Funcionalidades (v1)

**Área do Paciente (`/paciente`)**
- Visualizar documentos compartilhados (laudos, receitas, orientações)
- Receber e ler mensagens do consultório
- Enviar solicitações de contato/retorno
- Aceite LGPD obrigatório no primeiro acesso

**Área Médica (`/medico`)** — acesso restrito
- Listar todos os pacientes cadastrados
- Enviar documentos por paciente (upload para Supabase Storage)
- Enviar mensagens para pacientes
- Gerenciar solicitações de contato (pendente / em andamento / resolvido)
- Dashboard com resumo de atividades

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Estilo | Tailwind CSS |
| Auth + DB + Storage | Supabase |
| Linguagem | TypeScript |
| Ícones | Lucide React |

## Estrutura de pastas

```
portal-dr-guilherme/
├── app/
│   ├── actions/          # Server Actions (auth, docs, messages, etc.)
│   ├── auth/callback/    # Rota de callback OAuth/magic-link
│   ├── medico/           # Área médica (layout + page)
│   ├── paciente/         # Área do paciente (layout + page)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Página de login
├── components/
│   ├── auth/             # LoginForm
│   ├── layout/           # Header
│   ├── medico/           # Componentes da área médica
│   ├── paciente/         # Componentes da área do paciente
│   └── ui/               # Button, Input, Badge, Card, Modal
├── lib/
│   ├── supabase/         # Clientes browser e server
│   ├── types.ts          # Tipos TypeScript globais
│   └── utils.ts          # Utilitários (cn, formatDate…)
├── supabase/
│   └── schema.sql        # Schema completo + RLS + Storage
├── middleware.ts          # Proteção de rotas + redirecionamento por role
└── .env.local.example    # Variáveis de ambiente necessárias
```

## Setup

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com as credenciais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configure o Supabase

#### 3a. Crie o projeto
Acesse [supabase.com](https://supabase.com), crie um novo projeto e copie as credenciais para `.env.local`.

#### 3b. Execute o schema
No painel do Supabase, vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`. Isso criará:
- Tabelas (`profiles`, `documents`, `messages`, `contact_requests`)
- Políticas RLS
- Trigger para criar perfil automaticamente ao cadastrar usuário
- Bucket de storage `documents`

#### 3c. Configure o redirect URL (Auth)
Em **Authentication > URL Configuration**, adicione:
```
http://localhost:3000/auth/callback
```

### 4. Crie o usuário médico

No painel Supabase, vá em **Authentication > Users** e crie um usuário com o e-mail do médico. Em seguida, execute no SQL Editor:

```sql
update public.profiles
set role = 'medico', full_name = 'Dr. Guilherme'
where id = '<uuid-do-usuario>';
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

```bash
npm install -g vercel
vercel --prod
```

Adicione as variáveis de ambiente no painel da Vercel e configure o redirect URL no Supabase para o domínio de produção.

## Fluxo de autenticação

```
Login (/)
  ├── Paciente → /paciente  (middleware verifica role = 'paciente')
  └── Médico   → /medico    (middleware verifica role = 'medico')

Não autenticado → redireciona para /
Paciente tenta /medico → redireciona para /paciente
Médico tenta /paciente → redireciona para /medico
```

## Segurança

- **RLS (Row Level Security)** ativa em todas as tabelas — paciente só acessa seus próprios dados
- **Middleware de autenticação** verifica sessão e role em todas as rotas protegidas
- **Bucket Storage privado** — arquivos só acessíveis a usuários autenticados
- **LGPD** — aceite explícito obrigatório no primeiro acesso do paciente

## Roadmap (v2)

- [ ] Agendamento de consultas
- [ ] Notificações em tempo real (Supabase Realtime)
- [ ] Histórico de atendimentos
- [ ] Assinatura digital de documentos
- [ ] App mobile (React Native / Expo)
