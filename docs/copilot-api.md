# Copilot ↔ Portal MedEn — Documentação de Integração

> **Base URL do portal:** `https://portal-dr-guilherme.vercel.app`  
> **Autenticação:** todas as rotas exigem o header `x-copilot-secret: <COPILOT_SECRET>`  
> **Env var no portal:** `COPILOT_SECRET` (default de fallback: `copilot2026guilherme`)

---

## Visão geral do fluxo

```
COPILOT ──── lê dados ────► GET /api/copilot/*   (consultas, pacientes, labs, etc.)
COPILOT ──── notifica ───► POST /api/copilot      (eventos: consulta agendada, etc.)
PORTAL  ──── envia msg ──► POST <COPILOT_OUTBOUND_URL>  (automações disparam mensagens)
```

---

## 1. Autenticação

Todas as requisições (entrada e saída) devem incluir:

```
x-copilot-secret: <COPILOT_SECRET>
```

---

## 2. Leitura de dados — Portal → Copilot

O copilot pode consultar o estado atual do portal a qualquer momento.

---

### `GET /api/copilot/pacientes`

Lista todos os pacientes ativos.

**Resposta:**
```json
{
  "total": 42,
  "pacientes": [
    {
      "id": "uuid",
      "nome": "João Silva",
      "email": "joao@email.com",
      "telefone": "11999999999",
      "cpf": "000.000.000-00",
      "lgpd_aceita": true,
      "cadastrado_em": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### `GET /api/copilot/agenda?data=YYYY-MM-DD`

Consultas de um dia específico (padrão: hoje no horário de Brasília).

**Query params:**
- `data` — `YYYY-MM-DD` (opcional)

**Resposta:**
```json
{
  "data": "2025-06-10",
  "total": 5,
  "consultas": [
    {
      "id": "uuid",
      "hora": "09:00",
      "paciente": "João Silva",
      "telefone": "11999999999",
      "tipo": "retorno",
      "local": "consultorio",
      "status": "agendada",
      "observacoes": null
    }
  ]
}
```

---

### `GET /api/copilot/retornos?periodo=semana`

Consultas agendadas ou confirmadas num período futuro.

**Query params:**
- `periodo` — `hoje` | `semana` (padrão) | `mes`

**Resposta:**
```json
{
  "periodo": "semana",
  "total": 12,
  "retornos": [
    {
      "id": "uuid",
      "data_hora": "10/06/2025 09:00",
      "paciente": "Maria Santos",
      "telefone": "11988888888",
      "tipo": "retorno",
      "local": "consultorio",
      "status": "agendada"
    }
  ]
}
```

---

### `GET /api/copilot/inadimplentes`

Faturas emitidas que ainda não foram baixadas (consideradas pendentes de pagamento).

**Resposta:**
```json
{
  "total": 3,
  "inadimplentes": [
    {
      "invoice_id": "uuid",
      "paciente": "Carlos Oliveira",
      "telefone": "11977777777",
      "email": "carlos@email.com",
      "valor": 350.00,
      "vencimento": "2025-05-01"
    }
  ]
}
```

---

### `GET /api/copilot/analytics?periodo=30d`

Dashboard analítico da clínica.

**Query params:**
- `periodo` — `30d` | `90d` | `6m` | `1a` | `tudo` (padrão)

**Resposta:**
```json
{
  "periodo": "30d",
  "gerado_em": "2025-06-10T12:00:00Z",
  "pacientes": {
    "total": 150,
    "por_status": { "ativo": 140, "inativo": 8, "obito": 2 },
    "por_sexo": { "F": 95, "M": 55 },
    "faixas_etarias": { "<18": 2, "18-30": 10, "31-45": 30, "46-60": 55, "61-75": 40, ">75": 13 }
  },
  "consultas": {
    "total": 48,
    "nao_canceladas": 44,
    "por_tipo": { "retorno": 30, "nova_consulta": 14 },
    "por_local": { "consultorio": 40, "telemedicina": 4 },
    "por_status": { "realizada": 42, "agendada": 2 },
    "evolucao_mensal": [
      { "mes": "2025-05", "total": 22 },
      { "mes": "2025-06", "total": 22 }
    ],
    "sinais_vitais_medios": {
      "pressao_arterial": { "pas": 138, "pad": 85, "n": 40 },
      "frequencia_cardiaca": { "fc": 72, "n": 38 }
    }
  },
  "diagnosticos": {
    "top_20": [
      { "nome": "Hipertensão Arterial", "total": 95 },
      { "nome": "Doença Renal Crônica", "total": 60 }
    ]
  },
  "laboratorial": {
    "pacientes_com_alerta_critico": 4,
    "pacientes_com_alerta_atencao": 12,
    "top_exames_alterados": [
      { "exame": "Creatinina", "pacientes_afetados": 8 },
      { "exame": "Potássio", "pacientes_afetados": 5 }
    ]
  }
}
```

---

### `GET /api/copilot/paciente/:id/prontuario`

Histórico clínico completo de um paciente.

**Resposta:**
```json
{
  "paciente": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999",
    "email": "joao@email.com",
    "data_nascimento": "1970-03-15",
    "sexo": "M",
    "diagnostico_principal": "Doença Renal Crônica G3a",
    "status": "ativo",
    "retorno_previsto": "2025-07-10"
  },
  "total_consultas": 8,
  "consultas": [
    {
      "id": "uuid",
      "data": "10/06/2025",
      "hora": "09:00",
      "tipo": "retorno",
      "local": "consultorio",
      "status": "realizada",
      "prontuario_finalizado": true,
      "sinais_vitais": { "pas": 140, "pad": 90, "fc": 72 },
      "diagnosticos": [
        { "nome": "Hipertensão Arterial", "evolucao": "controlada" }
      ],
      "evolucao": "Paciente refere melhora...",
      "exame_fisico": "PA 140/90...",
      "impressao": "Evolução favorável.",
      "conduta": "Manter medicação atual."
    }
  ]
}
```

---

### `GET /api/copilot/paciente/:id/laboratorial`

Resultados laboratoriais e alertas de um paciente.

**Resposta:**
```json
{
  "paciente": { "id": "uuid", "nome": "João Silva" },
  "datas_de_coleta": ["2025-03-22", "2025-06-10"],
  "total_resultados": 24,
  "alertas": {
    "criticos": 1,
    "atencao": 2,
    "lista": [
      {
        "exame": "Potássio",
        "severidade": "critical",
        "direcao": "high",
        "mensagem": "Potássio acima do limite crítico (> 6.0 mEq/L)",
        "valor_atual": "6.3 mEq/L",
        "data": "2025-06-10"
      }
    ]
  },
  "historico_por_exame": [
    {
      "exame": "Creatinina",
      "medicoes": [
        { "data": "2025-06-10", "valor": "1.8", "unidade": "mg/dL" },
        { "data": "2025-03-22", "valor": "1.6", "unidade": "mg/dL" }
      ]
    }
  ]
}
```

---

### `GET /api/copilot/paciente/:id/imagem`

Exames de imagem de um paciente.

**Resposta:**
```json
{
  "paciente": { "id": "uuid", "nome": "João Silva" },
  "total": 2,
  "exames": [
    {
      "id": "uuid",
      "tipo": "Ultrassom Renal",
      "data_realizado": "2025-05-15",
      "laudo_resumido": "Rins de tamanho normal, sem litíase...",
      "arquivo": "ultrassom-joao-2025-05.pdf",
      "url": "https://..."
    }
  ]
}
```

---

## 3. Eventos — Copilot → Portal

O copilot notifica o portal quando algo acontece no WhatsApp.

**Endpoint:** `POST /api/copilot`  
**Header:** `x-copilot-secret: <COPILOT_SECRET>`  
**Content-Type:** `application/json`

---

### Evento: `consulta_agendada`

Cria uma nova consulta vinculada ao paciente (busca por nome ou telefone).

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
    "observacoes": "Paciente solicitou via WhatsApp"
  }
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "consulta_id": "uuid",
  "paciente": "João Silva",
  "data_hora": "2025-06-15T12:00:00.000Z"
}
```

---

### Evento: `consulta_cancelada`

Cancela uma consulta pelo ID.

```json
{
  "evento": "consulta_cancelada",
  "consulta_id": "uuid"
}
```

---

### Evento: `consulta_remarcada`

Remarca uma consulta existente para nova data/hora.

```json
{
  "evento": "consulta_remarcada",
  "consulta_id": "uuid",
  "consulta": {
    "data_hora": "2025-06-20T10:00:00-03:00",
    "observacoes": "Remarcado pelo paciente via WhatsApp"
  }
}
```

---

## 4. Mensagens de saída — Portal → Copilot ⚡ NOVO

O portal dispara mensagens WhatsApp via copilot como reação às automações configuradas pelo médico (lembretes de consulta, pós-consulta, aniversário, etc.).

**Env var no portal:** `COPILOT_OUTBOUND_URL`  
**Endpoint esperado no copilot:** `POST /enviar-mensagem` (a implementar)

```http
POST <COPILOT_OUTBOUND_URL>
x-copilot-secret: <COPILOT_SECRET>
Content-Type: application/json

{
  "telefone": "11999999999",
  "mensagem": "Olá João! Lembrando da sua consulta amanhã às 09:00."
}
```

**Comportamento:** fire-and-forget — o portal não bloqueia na resposta. Falhas são logadas mas não impedem a execução da automação.

### Automações que disparam mensagens

| Tipo | Gatilho |
|---|---|
| `pre_consulta_lembrete` | Cron diário — pacientes com consulta em X horas |
| `pos_consulta` | Cron diário — consultas marcadas como realizadas nas últimas 2h |
| `inativo_sem_consulta` | Cron diário — pacientes sem consulta há N dias |
| `retorno_previsto` | Cron diário — pacientes com retorno previsto em N dias |
| `aniversario` | Cron diário — pacientes com aniversário hoje |

O cron roda todo dia às **07:00 horário de Brasília**.

---

## 5. Eventos novos sugeridos (a implementar)

Conforme o portal evoluiu, novos eventos fazem sentido. Sugestão de implementação futura:

### `lab_critico` — Resultado crítico salvo

Disparado quando um resultado laboratorial crítico (ex: K⁺ > 6.0) é registrado no prontuário.

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

### `prontuario_finalizado` — Consulta encerrada pelo médico

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

### `exame_resultado_disponivel` — Laudo de imagem ou lab enviado

```json
{
  "evento": "exame_resultado_disponivel",
  "paciente": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "exame": {
    "tipo": "laboratorial",
    "descricao": "Hemograma + Creatinina + Potássio",
    "data_coleta": "2025-06-10"
  }
}
```

---

## 6. Configuração de variáveis de ambiente

### No portal (Vercel → Settings → Environment Variables)

| Variável | Descrição | Exemplo |
|---|---|---|
| `COPILOT_SECRET` | Secret compartilhado para autenticar todas as chamadas | `minha-chave-secreta` |
| `COPILOT_OUTBOUND_URL` | URL do endpoint do copilot que recebe mensagens para envio | `https://copilot.exemplo.com/enviar-mensagem` |
| `MEMED_PARTNER_KEY` | Chave parceira Memed (para prescrições digitais) | fornecida pela Memed |
| `NEXT_PUBLIC_MEMED_API_KEY` | Chave pública Memed (carregada no browser) | fornecida pela Memed |

### No copilot (sistema externo)

| Variável | Valor |
|---|---|
| `PORTAL_BASE_URL` | `https://portal-dr-guilherme.vercel.app` |
| `PORTAL_COPILOT_SECRET` | mesmo valor do `COPILOT_SECRET` acima |

---

## 7. Tabela resumo de todos os endpoints

| Método | Endpoint | Quem chama | Finalidade |
|---|---|---|---|
| GET | `/api/copilot/pacientes` | Copilot | Lista todos os pacientes |
| GET | `/api/copilot/agenda` | Copilot | Agenda do dia |
| GET | `/api/copilot/retornos` | Copilot | Consultas agendadas futuras |
| GET | `/api/copilot/inadimplentes` | Copilot | Faturas pendentes |
| GET | `/api/copilot/analytics` | Copilot | Dashboard analítico |
| GET | `/api/copilot/paciente/:id/prontuario` | Copilot | Histórico clínico do paciente |
| GET | `/api/copilot/paciente/:id/laboratorial` | Copilot | Labs + alertas do paciente |
| GET | `/api/copilot/paciente/:id/imagem` | Copilot | Exames de imagem do paciente |
| POST | `/api/copilot` | Copilot | Eventos (agendar, cancelar, remarcar) |
| POST | `<COPILOT_OUTBOUND_URL>` | Portal | Enviar mensagem WhatsApp via copilot |
