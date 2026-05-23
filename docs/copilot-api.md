# Copilot ↔ Portal MedEn — Documentação de Integração

> **Base URL do portal:** `https://portal-dr-guilherme.vercel.app`  
> **Base URL do copilot:** `COPILOT_URL` (já configurada no Vercel do portal)  
> **Autenticação:** header `x-copilot-secret: <COPILOT_SECRET>` em todas as chamadas  

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase: uqhjjjkfrwavsambopon           │
│   schema: public  (profiles, consultas, lab_results, ...)   │
└────────────┬────────────────────────────┬───────────────────┘
             │ lê/escreve                 │ lê (portalDb.js)
             ▼                            ▼
   portal-dr-guilherme (Next.js)    dr-copilot (Node.js)
             │                            │
             │  POST /portal/evento  ────►│ notifica médico via WhatsApp
             │◄────────────────────────── │  POST /api/copilot
             │  recebe ações do WhatsApp   │
             │                            │
             │◄────────────────────────── │  POST /enviar-mensagem (NOVO)
                  mensagens automações
```

**Ponto-chave:** o copilot **lê o banco diretamente** via `portalDb.js` — não precisa chamar os endpoints GET do portal para dados. Os endpoints GET existem como fallback/alternativa via API.

---

## Variáveis de ambiente (Vercel do portal)

| Variável | Status | Descrição |
|---|---|---|
| `COPILOT_URL` | ✅ já configurada | Base URL do copilot (ex: `https://copilot.exemplo.com`) |
| `COPILOT_SECRET` | ✅ já configurada | Secret compartilhado |
| `ANTHROPIC_API_KEY` | ✅ já configurada | Claude Opus (IA clínica) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ já configurada | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ já configurada | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ já configurada | |
| `MEMED_PARTNER_KEY` | ⏳ aguardando | Chave parceira Memed (prescrições) |
| `NEXT_PUBLIC_MEMED_API_KEY` | ⏳ aguardando | Chave pública Memed |

---

## 1. Portal → Copilot: notificações de eventos

Quando algo relevante acontece no portal, ele notifica o copilot.

**Endpoint no copilot:** `POST ${COPILOT_URL}/portal/evento`  
**Header:** `x-copilot-secret: <COPILOT_SECRET>`

---

### Eventos já implementados no portal

#### `consulta_agendada`
Disparado quando uma consulta é criada pelo médico/secretaria.

```json
{
  "evento": "consulta_agendada",
  "paciente": {
    "nome": "João Silva",
    "telefone": "11999999999",
    "email": "joao@email.com"
  },
  "consulta": {
    "data": "2025-06-10",
    "tipo": "retorno"
  }
}
```

#### `consulta_remarcada`
```json
{
  "evento": "consulta_remarcada",
  "paciente": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "consulta": {
    "data": "2025-06-15",
    "tipo": "retorno"
  }
}
```

#### `exame_enviado`
```json
{
  "evento": "exame_enviado",
  "paciente": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "exame": {
    "tipo": "laboratorial",
    "descricao": "Hemograma + Creatinina"
  }
}
```

---

### Eventos novos sugeridos (implementar no portal)

#### `lab_critico` — resultado crítico salvo no prontuário

```json
{
  "evento": "lab_critico",
  "paciente": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "alerta": {
    "exame": "Potássio",
    "valor": "6.3 mEq/L",
    "referencia": "3.5–5.0 mEq/L",
    "severidade": "critical",
    "mensagem": "Potássio acima do limite crítico (> 6.0 mEq/L)",
    "data_coleta": "2025-06-10"
  }
}
```

#### `prontuario_finalizado` — consulta encerrada pelo médico

```json
{
  "evento": "prontuario_finalizado",
  "paciente": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "consulta": {
    "id": "uuid",
    "data": "10/06/2025",
    "tipo": "retorno",
    "retorno_previsto": "2025-09-10"
  }
}
```

---

## 2. Copilot → Portal: ações do WhatsApp

Quando o paciente agenda/cancela/remarca via WhatsApp, o copilot notifica o portal.

**Endpoint no portal:** `POST ${PORTAL_URL}/api/copilot`  
**Header:** `x-copilot-secret: <COPILOT_SECRET>`

---

### `consulta_agendada`

```json
{
  "evento": "consulta_agendada",
  "paciente": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "consulta": {
    "data_hora": "2025-06-15T09:00:00-03:00",
    "tipo": "retorno",
    "local": "consultorio",
    "duracao_min": 30,
    "observacoes": "Agendado via WhatsApp"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "consulta_id": "uuid",
  "paciente": "João Silva",
  "data_hora": "2025-06-15T12:00:00.000Z"
}
```

### `consulta_cancelada`

```json
{
  "evento": "consulta_cancelada",
  "consulta_id": "uuid"
}
```

### `consulta_remarcada`

```json
{
  "evento": "consulta_remarcada",
  "consulta_id": "uuid",
  "consulta": {
    "data_hora": "2025-06-20T10:00:00-03:00",
    "observacoes": "Remarcado pelo paciente"
  }
}
```

---

## 3. Portal → Copilot: envio de mensagens WhatsApp ⚡ NOVO

As automações do portal geram mensagens e as enviam via copilot.

**Endpoint no copilot:** `POST ${COPILOT_URL}/enviar-mensagem` ← **implementar**  
**Env var usada:** `COPILOT_URL` (já configurada)  
**Header:** `x-copilot-secret: <COPILOT_SECRET>`

```json
{
  "telefone": "11999999999",
  "mensagem": "Olá João! Lembrando da sua consulta amanhã às 09:00."
}
```

**Comportamento:** fire-and-forget — o portal não bloqueia na resposta.

### Automações que disparam mensagens

| Tipo | Gatilho | Cron |
|---|---|---|
| Lembrete pré-consulta | X horas antes da consulta | 07:00 diário |
| Mensagem pós-consulta | Consulta marcada como realizada | 07:00 diário |
| Régua de inativos | Sem consulta há N dias | 07:00 diário |
| Retorno previsto | Retorno previsto em N dias | 07:00 diário |
| Aniversário | Paciente faz aniversário hoje | 07:00 diário |

---

## 4. Endpoints GET do portal (alternativa à leitura direta do banco)

O copilot já lê o banco diretamente. Esses endpoints existem como API alternativa caso necessário.

| Endpoint | Descrição | Params |
|---|---|---|
| `GET /api/copilot/pacientes` | Lista todos os pacientes | — |
| `GET /api/copilot/agenda` | Consultas de um dia | `?data=YYYY-MM-DD` |
| `GET /api/copilot/retornos` | Consultas agendadas futuras | `?periodo=hoje\|semana\|mes` |
| `GET /api/copilot/inadimplentes` | Faturas pendentes | — |
| `GET /api/copilot/analytics` | Dashboard analítico | `?periodo=30d\|90d\|6m\|1a\|tudo` |
| `GET /api/copilot/paciente/:id/prontuario` | Histórico clínico | — |
| `GET /api/copilot/paciente/:id/laboratorial` | Labs + alertas | — |
| `GET /api/copilot/paciente/:id/imagem` | Exames de imagem | — |

Todos exigem `x-copilot-secret` no header.

---

## 5. Resumo do que falta implementar

| Item | Onde | Status |
|---|---|---|
| `POST /enviar-mensagem` | No copilot | ⏳ a implementar |
| Eventos `lab_critico`, `prontuario_finalizado` | No portal | ⏳ a implementar |
| `MEMED_PARTNER_KEY` + `NEXT_PUBLIC_MEMED_API_KEY` | Vercel do portal | ⏳ aguardando Memed |
| Migration 018 (campos crm/especialidade) | Supabase | ⏳ rodar no SQL Editor |
