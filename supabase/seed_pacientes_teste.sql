-- ============================================================
-- SEED DATA — Portal Dr. Guilherme
-- Execute no SQL Editor do Supabase (cole tudo de uma vez)
-- ATENÇÃO: substitua o MEDICO_ID pelo UUID real do Dr. Guilherme
-- ============================================================

-- ── 1. Auth users ─────────────────────────────────────────────
INSERT INTO auth.users (
  id, email, encrypted_password, aud, role,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('00000000-0000-0000-0000-000000000001','maria.silva@teste.br',   crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000002','joao.pereira@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000003','ana.ferreira@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000004','roberto.lima@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000005','claudia.costa@teste.br', crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000006','paulo.souza@teste.br',   crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000007','sandra.alves@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000008','marcos.oliveira@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000009','fernanda.rocha@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000010','gilberto.marques@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000011','luciana.santos@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000012','carlos.barbosa@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000013','priscila.leal@teste.br', crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000014','antonio.neto@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000015','beatriz.pimentel@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000016','renato.dias@teste.br',   crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000017','juliana.teixeira@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000018','eduardo.carvalho@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000019','carla.freitas@teste.br', crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000020','marcelo.ribeiro@teste.br',crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000021','vera.matos@teste.br',    crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
  ('00000000-0000-0000-0000-000000000022','felipe.silva@teste.br',  crypt('Teste@2025',gen_salt('bf')),'authenticated','authenticated',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Profiles ───────────────────────────────────────────────
-- (id, role, full_name, email, cpf, phone, lgpd_accepted, data_nascimento, sexo,
--  profissao, cep, endereco, cidade_estado, perfil_completo,
--  diagnostico, status_paciente, obs_secretaria, retorno_previsto)
INSERT INTO profiles (
  id, role, full_name, email, cpf, phone,
  lgpd_accepted, lgpd_accepted_at,
  data_nascimento, sexo, profissao,
  cep, endereco, cidade_estado,
  perfil_completo, diagnostico, status_paciente, obs_secretaria, retorno_previsto,
  created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001','paciente','Maria da Silva Santos','maria.silva@teste.br','11122233300','11987650001',true,now(),'1967-08-15','F','Professora','01310100','Rua Augusta 400 Apto 82','São Paulo, SP',true,'DRC estágio 3, HAS','ativo','Boa adesão ao tratamento','2026-08-10',now(),now()),
  ('00000000-0000-0000-0000-000000000002','paciente','João Carlos Pereira','joao.pereira@teste.br','22233344411','11976540002',true,now(),'1960-03-22','M','Aposentado','04552001','Av Paulista 1200 Apto 51','São Paulo, SP',true,'DRC estágio 4, DM2, HAS','ativo','Glicemia ainda descontrolada. HbA1c 10.8%','2026-07-05',now(),now()),
  ('00000000-0000-0000-0000-000000000003','paciente','Ana Lucia Ferreira','ana.ferreira@teste.br','33344455522','11965430003',true,now(),'1973-11-05','F','Enfermeira','05407001','Rua Oscar Freire 88','São Paulo, SP',true,'Síndrome nefrótica, Hipoalbuminemia','ativo','Em uso de corticóide. Monitorar albumina.','2026-09-20',now(),now()),
  ('00000000-0000-0000-0000-000000000004','paciente','Roberto Andrade Lima','roberto.lima@teste.br','44455566633','11954320004',true,now(),'1954-07-30','M','Agricultor','13010001','Rua Barão de Jaguara 520','Campinas, SP',true,'DRC estágio 5, Anemia renal','ativo','URGENTE: Cr 6.2. Discutir diálise.','2026-06-15',now(),now()),
  ('00000000-0000-0000-0000-000000000005','paciente','Claudia Mendes Costa','claudia.costa@teste.br','55566677744','11943210005',true,now(),'1980-04-12','F','Advogada','01415001','Rua Consolação 1100','São Paulo, SP',true,'LES, Nefrite lúpica','ativo','Atividade lúpica moderada. Anti-dsDNA elevado.','2026-07-22',now(),now()),
  ('00000000-0000-0000-0000-000000000006','paciente','Paulo Henrique Souza','paulo.souza@teste.br','66677788855','11932100006',true,now(),'1965-09-18','M','Engenheiro','04038001','Av Ibirapuera 2907','São Paulo, SP',true,'DRC estágio 3, Gota, HAS','ativo','Ácido úrico persistentemente elevado.','2026-08-30',now(),now()),
  ('00000000-0000-0000-0000-000000000007','paciente','Sandra Regina Alves','sandra.alves@teste.br','77788899966','11921090007',true,now(),'1977-02-28','F','Gerente','09726001','Rua Frei Caneca 200','São Bernardo, SP',true,'HAS estágio 2, Microalbuminúria','ativo','PA difícil controle. Aumento dose IECA.','2026-06-08',now(),now()),
  ('00000000-0000-0000-0000-000000000008','paciente','Marcos Antonio Oliveira','marcos.oliveira@teste.br','88899900077','11910080008',true,now(),'1970-06-14','M','Contador','06018001','Av Industrial 500','Osasco, SP',true,'DM2, Nefropatia diabética','ativo','Não compareceu em fev. Retorno vencido.','2026-02-20',now(),now()),
  ('00000000-0000-0000-0000-000000000009','paciente','Fernanda Cristina Rocha','fernanda.rocha@teste.br','99900011188','11909070009',true,now(),'1987-01-22','F','Fisioterapeuta','80010001','Rua XV de Novembro 800','Curitiba, PR',true,'Doença renal policística autossômica dominante','ativo','Acompanhamento semestral. TFG estável.','2026-11-10',now(),now()),
  ('00000000-0000-0000-0000-000000000010','paciente','Gilberto José Marques','gilberto.marques@teste.br','10011012299','11898060010',true,now(),'1957-10-05','M','Motorista','01301001','Rua da Consolação 10','São Paulo, SP',true,'DRC estágio 4, Anemia renal, Hiperparatireoidismo secundário','ativo','PTH 680 — iniciar cinacalcete.','2026-06-25',now(),now()),
  ('00000000-0000-0000-0000-000000000011','paciente','Luciana Aparecida Santos','luciana.santos@teste.br','11122013300','11887050011',true,now(),'1983-05-17','F','Professora','22010001','Rua Primeiro de Março 100','Rio de Janeiro, RJ',true,'Nefrite lúpica, Anemia hemolítica','ativo','Hemoglobina em queda. Rever dose eritropoetina.','2026-07-14',now(),now()),
  ('00000000-0000-0000-0000-000000000012','paciente','Carlos Eduardo Barbosa','carlos.barbosa@teste.br','12223034411','11876040012',true,now(),'1951-12-08','M','Aposentado','01001001','Praça da Sé 1','São Paulo, SP',true,'DRC estágio 5','ativo','Cr 7.1 e K+ 6.2. URGENTE — encaminhar para diálise.','2026-05-30',now(),now()),
  ('00000000-0000-0000-0000-000000000013','paciente','Priscila Nascimento Leal','priscila.leal@teste.br','13324045522','11865030013',true,now(),'1992-08-30','F','Designer','80250001','Av Sete de Setembro 600','Curitiba, PR',true,'Síndrome nefrótica primária','ativo','Sem consulta desde jan/26. Retorno vencido.','2026-03-10',now(),now()),
  ('00000000-0000-0000-0000-000000000014','paciente','Antonio Ferreira Neto','antonio.neto@teste.br','14425056633','11854020014',true,now(),'1963-04-25','M','Técnico','13025001','Rua Barão Geraldo 300','Campinas, SP',true,'HAS, DRC estágio 2','ativo','PA mal controlada. Reforçar adesão ao sal.','2026-09-01',now(),now()),
  ('00000000-0000-0000-0000-000000000015','paciente','Beatriz Cunha Pimentel','beatriz.pimentel@teste.br','15526067744','11843010015',true,now(),'1969-11-11','F','Médica','01415000','Rua da Consolação 2000','São Paulo, SP',true,'LES, Trombocitopenia','ativo','Plaquetas 80k. Retorno vencido desde mar/26.','2026-03-15',now(),now()),
  ('00000000-0000-0000-0000-000000000016','paciente','Renato Augusto Dias','renato.dias@teste.br','16627078855','11832000016',true,now(),'1976-07-03','M','Vendedor','02010001','Av Paulista 1000','São Paulo, SP',true,'Gota, Litíase renal','ativo','Falta com frequência. Uricemia 9.8.','2026-08-18',now(),now()),
  ('00000000-0000-0000-0000-000000000017','paciente','Juliana Moraes Teixeira','juliana.teixeira@teste.br','17728089966','11820990017',true,now(),'1981-03-19','F','Nutricionista','04101001','Rua Vergueiro 1500','São Paulo, SP',true,'HAS, Proteinúria','ativo','Sem consulta desde out/25. Retorno vencido.','2026-01-20',now(),now()),
  ('00000000-0000-0000-0000-000000000018','paciente','Eduardo Pinto Carvalho','eduardo.carvalho@teste.br','18829090077','11819980018',true,now(),'1959-09-27','M','Aposentado','05002001','Rua Teodoro Sampaio 800','São Paulo, SP',true,'DRC estágio 3, Dislipidemia','ativo','LDL 188 mg/dL. Aumentar estatina.','2026-09-12',now(),now()),
  ('00000000-0000-0000-0000-000000000019','paciente','Carla Oliveira Freitas','carla.freitas@teste.br','19920091188','11808970019',true,now(),'1996-06-14','F','Estudante','20040001','Rua Primeiro de Março 200','Rio de Janeiro, RJ',true,'Glomerulonefrite membranosa','ativo','Jovem com proteinúria 3g/dia. Adesão irregular.','2026-10-05',now(),now()),
  ('00000000-0000-0000-0000-000000000020','paciente','Marcelo Santos Ribeiro','marcelo.ribeiro@teste.br','20021092299','11797960020',true,now(),'1967-02-07','M','Motorista','08010001','Rua Catumbi 400','São Paulo, SP',true,'DM2, DRC estágio 3, HAS','ativo','Muitas faltas. PA 178/110 na última. Reforçar tratamento.','2026-07-30',now(),now()),
  ('00000000-0000-0000-0000-000000000021','paciente','Vera Lucia Matos','vera.matos@teste.br','21122093300','11786950021',true,now(),'1954-08-20','F','Aposentada','04116001','Rua Domingos de Morais 2000','São Paulo, SP',true,'DRC estágio 4, HAS, Acidose metabólica','ativo','HCO3 13. Iniciar citrato de sódio.','2026-06-20',now(),now()),
  ('00000000-0000-0000-0000-000000000022','paciente','Felipe Nascimento Silva','felipe.silva@teste.br','22223094411','11775940022',true,now(),'1990-12-15','M','Programador','01310100','Rua Augusta 200','São Paulo, SP',true,'Síndrome de Alport','ativo','Jovem. Retorno previsto abr/26 não ocorreu.','2026-04-01',now(),now())
ON CONFLICT (id) DO NOTHING;

-- ── 3. Consultas ──────────────────────────────────────────────
-- (id, patient_id, tipo, local, data_hora, duracao_min, status,
--  pas, pad, fc, diagnosticos, evolucao, prontuario_finalizado, created_by)
--
-- SUBSTITUA o UUID abaixo pelo ID real do Dr. Guilherme:
-- (encontre em: Authentication > Users > seu usuário)

INSERT INTO consultas (
  id, patient_id, tipo, local, data_hora, duracao_min, status,
  pas, pad, fc, diagnosticos, evolucao, conduta,
  prontuario_finalizado, prontuario_finalizado_at, created_by,
  created_at, updated_at
) VALUES
-- ── Maria (p01) — boa adesão, DRC3+HAS, PA elevada
('c0000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','primeira_consulta','consultorio','2024-04-10 09:00',75,'realizada',160,98,78,'[{"nome":"DRC estágio 3","evolucao":"Estável"},{"nome":"HAS","evolucao":"PA mal controlada"}]','Paciente com DRC g3 e HAS. TFG 42. Inicio de enalapril.','Enalapril 10mg/dia. Dieta hipossódica.',true,'2024-04-10 10:15:00',NULL,now(),now()),
('c0000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','retorno','consultorio','2024-09-15 10:00',30,'realizada',152,95,74,'[{"nome":"DRC estágio 3","evolucao":"Estável"},{"nome":"HAS","evolucao":"Melhora parcial"}]','Cr 1.7 estável. PA ainda acima do alvo.','Aumentar dose enalapril.',true,'2024-09-15 10:30:00',NULL,now(),now()),
('c0000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','retorno','consultorio','2025-03-20 14:00',30,'realizada',155,96,76,'[{"nome":"DRC estágio 3","evolucao":"Cr 1.8"},{"nome":"HAS","evolucao":"Persistente"}]','Piora discreta de creatinina. Manter manejo.','Solicitar microalbuminúria.',true,'2025-03-20 14:30:00',NULL,now(),now()),
('c0000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','retorno','consultorio','2025-10-08 09:30',30,'realizada',155,95,72,'[{"nome":"DRC estágio 3","evolucao":"Estável"}]','Paciente aderente. Aguardar exames.','Manter conduta.',true,'2025-10-08 10:00:00',NULL,now(),now()),
('c0000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','retorno','consultorio','2026-04-22 11:00',30,'realizada',158,97,75,'[{"nome":"DRC estágio 3","evolucao":"Cr 1.8"},{"nome":"HAS","evolucao":"PA 158/97"}]','Continua com PA elevada. Boa adesão medicamentosa.','Associar losartana.',true,'2026-04-22 11:30:00',NULL,now(),now()),
('c0000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','retorno','consultorio','2026-08-10 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── João (p02) — DRC4+DM2+HAS, PA muito elevada
('c0000002-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','primeira_consulta','consultorio','2024-02-14 08:00',75,'realizada',172,108,82,'[{"nome":"DRC estágio 4","evolucao":"TFG 22"},{"nome":"DM2","evolucao":"HbA1c 10.8%"},{"nome":"HAS","evolucao":"Crise hipertensiva"}]','TFG 22. DM descontrolado. PA em crise.','Ajuste insulina. Losartana + anlodipino.',true,'2024-02-14 09:15:00',NULL,now(),now()),
('c0000002-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','nova_consulta','consultorio','2024-07-22 09:00',45,'realizada',168,105,80,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.2"},{"nome":"DM2","evolucao":"HbA1c 9.4%"},{"nome":"HAS","evolucao":"Melhorou parcialmente"}]','Melhora parcial HbA1c. Função renal estável.','Intensificar acompanhamento nutricional.',true,'2024-07-22 09:45:00',NULL,now(),now()),
('c0000002-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','retorno','consultorio','2025-01-15 10:00',30,'realizada',165,102,78,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.5"},{"nome":"DM2","evolucao":"HbA1c 10.2%"}]','Piora de HbA1c. Cr subindo lentamente.','Adicionar inibidor SGLT2 se tolerado.',true,'2025-01-15 10:30:00',NULL,now(),now()),
('c0000002-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','retorno','consultorio','2025-07-08 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000002-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','retorno','consultorio','2026-02-18 09:00',30,'realizada',168,102,81,'[{"nome":"DRC estágio 4","evolucao":"Estável"},{"nome":"DM2","evolucao":"HbA1c 10.0%"}]','Difícil controle glicêmico.','Encaminhar endocrinologista.',true,'2026-02-18 09:30:00',NULL,now(),now()),
('c0000002-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','retorno','consultorio','2026-07-05 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Ana (p03) — Síndrome nefrótica, albumina baixa
('c0000003-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','primeira_consulta','consultorio','2024-06-05 09:00',75,'realizada',120,78,68,'[{"nome":"Síndrome nefrótica","evolucao":"Diagnóstico recente"},{"nome":"Hipoalbuminemia","evolucao":"Albumina 2.2"}]','SN com albumina 2.2. Edema ++. Iniciando prednisona.','Prednisona 1mg/kg/dia.',true,'2024-06-05 10:15:00',NULL,now(),now()),
('c0000003-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','retorno','consultorio','2024-11-20 14:00',30,'realizada',118,76,66,'[{"nome":"Síndrome nefrótica","evolucao":"Resposta parcial"},{"nome":"Hipoalbuminemia","evolucao":"Albumina 2.9"}]','Albumina subindo. Reduzindo prednisona.','Desmame gradual corticóide.',true,'2024-11-20 14:30:00',NULL,now(),now()),
('c0000003-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','retorno','consultorio','2025-05-14 10:00',30,'realizada',122,80,70,'[{"nome":"Síndrome nefrótica","evolucao":"Remissão parcial"},{"nome":"Hipoalbuminemia","evolucao":"Albumina 3.1"}]','Boa resposta ao corticóide. Manter desmame.','Solicitar biópsia se recidivar.',true,'2025-05-14 10:30:00',NULL,now(),now()),
('c0000003-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','retorno','consultorio','2025-11-10 09:00',30,'realizada',124,79,69,'[{"nome":"Síndrome nefrótica","evolucao":"Remissão"},{"nome":"Hipoalbuminemia","evolucao":"Albumina 3.4"}]','Remissão completa. Suspender corticóide.','Monitorar 3 meses.',true,'2025-11-10 09:30:00',NULL,now(),now()),
('c0000003-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','retorno','consultorio','2026-04-08 14:00',30,'realizada',120,78,67,'[{"nome":"Síndrome nefrótica","evolucao":"Remissão mantida"}]','Remissão mantida. TFG 72. Albumina 3.6.','Retorno em 5 meses.',true,'2026-04-08 14:30:00',NULL,now(),now()),
('c0000003-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003','retorno','consultorio','2026-09-20 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Roberto (p04) — DRC5, Cr CRÍTICA
('c0000004-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','primeira_consulta','consultorio','2024-01-18 08:00',75,'realizada',162,100,76,'[{"nome":"DRC estágio 5","evolucao":"TFG 12"},{"nome":"Anemia renal","evolucao":"Hb 8.4"}]','TFG 12. Pré-dialítico. Anemia moderada.','Eritropoetina 4000UI 3x/sem. Diálise iminente.',true,'2024-01-18 09:15:00',NULL,now(),now()),
('c0000004-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','nova_consulta','consultorio','2024-06-12 09:00',45,'realizada',158,98,78,'[{"nome":"DRC estágio 5","evolucao":"Cr 5.8, TFG 11"},{"nome":"Anemia renal","evolucao":"Hb 8.1"}]','Função renal piorando. Fístula AV confeccionada.','Aguardar maturação fístula. Diálise em breve.',true,'2024-06-12 09:45:00',NULL,now(),now()),
('c0000004-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','retorno','consultorio','2024-12-05 14:00',30,'realizada',155,96,74,'[{"nome":"DRC estágio 5","evolucao":"Cr 6.2"},{"nome":"Anemia renal","evolucao":"Hb 7.8"}]','Cr 6.2. Sintomas urêmicos leves.','Discutir início HD urgente.',true,'2024-12-05 14:30:00',NULL,now(),now()),
('c0000004-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','retorno','consultorio','2025-05-20 10:00',30,'realizada',152,94,72,'[{"nome":"DRC estágio 5","evolucao":"Cr 6.5, HD iniciada"}]','HD 3x/sem. Tolerando bem.','Manter eritropoetina. Controlar K+.',true,'2025-05-20 10:30:00',NULL,now(),now()),
('c0000004-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004','retorno','consultorio','2026-01-14 09:00',30,'realizada',148,92,70,'[{"nome":"DRC estágio 5","evolucao":"Em HD regular"}]','Paciente adaptado à HD. Acesso vascular funcionando.','Solicitar exames mensais.',true,'2026-01-14 09:30:00',NULL,now(),now()),
('c0000004-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004','retorno','consultorio','2026-06-15 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Claudia (p05) — LES+Nefrite lúpica, proteinúria alta
('c0000005-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','primeira_consulta','consultorio','2024-03-22 09:00',75,'realizada',130,84,72,'[{"nome":"LES","evolucao":"Atividade moderada"},{"nome":"Nefrite lúpica","evolucao":"Classe III"}]','Nefrite lúpica classe III confirmada em biópsia.','Micofenolato + hidroxicloroquina.',true,'2024-03-22 10:15:00',NULL,now(),now()),
('c0000005-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','retorno','consultorio','2024-09-10 14:00',30,'realizada',128,82,70,'[{"nome":"LES","evolucao":"Atividade reduzida"},{"nome":"Nefrite lúpica","evolucao":"Proteinúria 310mg"}]','Melhora do SLEDAI. Proteinúria ainda elevada.','Manter micofenolato.',true,'2024-09-10 14:30:00',NULL,now(),now()),
('c0000005-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005','retorno','consultorio','2025-03-05 10:00',30,'realizada',126,80,68,'[{"nome":"LES","evolucao":"Remissão parcial"},{"nome":"Nefrite lúpica","evolucao":"Proteinúria 180mg"}]','Boa resposta. Proteinúria caindo.','Tentar desmame prednisona.',true,'2025-03-05 10:30:00',NULL,now(),now()),
('c0000005-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','retorno','consultorio','2025-09-18 09:00',30,'realizada',124,80,66,'[{"nome":"LES","evolucao":"Estável"},{"nome":"Nefrite lúpica","evolucao":"Proteinúria 210mg"}]','Leve aumento proteinúria. Monitorar.','Repetir anti-dsDNA.',true,'2025-09-18 09:30:00',NULL,now(),now()),
('c0000005-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000005','retorno','consultorio','2026-04-15 14:00',30,'realizada',128,82,69,'[{"nome":"LES","evolucao":"Atividade moderada"},{"nome":"Nefrite lúpica","evolucao":"Proteinúria 290mg"}]','Aumento de atividade. Anti-dsDNA elevado.','Pulso metilprednisolona.',true,'2026-04-15 14:30:00',NULL,now(),now()),
('c0000005-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000005','retorno','consultorio','2026-07-22 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Paulo (p06) — DRC3+Gota+HAS
('c0000006-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','primeira_consulta','consultorio','2024-05-08 08:00',75,'realizada',148,94,80,'[{"nome":"DRC estágio 3","evolucao":"TFG 48"},{"nome":"Gota","evolucao":"Ácido úrico 9.8"},{"nome":"HAS","evolucao":"PA 148/94"}]','DRC3 com hiperuricemia importante. Gota recorrente.','Alopurinol 100mg. Reduzir diurético tiazídico.',true,'2024-05-08 09:15:00',NULL,now(),now()),
('c0000006-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','retorno','consultorio','2024-11-14 10:00',30,'realizada',145,91,78,'[{"nome":"DRC estágio 3","evolucao":"Cr 1.6"},{"nome":"Gota","evolucao":"Ácido úrico 8.2"},{"nome":"HAS","evolucao":"PA melhorou"}]','Ácido úrico ainda alto. Aumentar alopurinol.','Alopurinol 200mg.',true,'2024-11-14 10:30:00',NULL,now(),now()),
('c0000006-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','retorno','consultorio','2025-06-20 14:00',30,'realizada',143,90,76,'[{"nome":"DRC estágio 3","evolucao":"Estável"},{"nome":"Gota","evolucao":"Ácido úrico 7.6"}]','Ácido úrico melhorando. DRC estável.','Manter conduta.',true,'2025-06-20 14:30:00',NULL,now(),now()),
('c0000006-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000006','retorno','consultorio','2026-01-12 09:00',30,'realizada',141,89,74,'[{"nome":"DRC estágio 3","evolucao":"Cr 1.5"},{"nome":"Gota","evolucao":"Ácido úrico 7.1"}]','Boa resposta. PA bem controlada.','Retorno 8 meses.',true,'2026-01-12 09:30:00',NULL,now(),now()),
('c0000006-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006','retorno','consultorio','2026-08-30 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Sandra (p07) — HAS2 + Microalbuminúria, PA muito alta
('c0000007-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','primeira_consulta','consultorio','2024-07-03 09:00',75,'realizada',165,100,84,'[{"nome":"HAS estágio 2","evolucao":"PA 165/100"},{"nome":"Microalbuminúria","evolucao":"MAU 85mg/24h"}]','HAS estágio 2 com microalbuminúria.','Losartana 50mg. Dieta.',true,'2024-07-03 10:15:00',NULL,now(),now()),
('c0000007-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000007','retorno','consultorio','2025-01-22 14:00',30,'realizada',162,98,82,'[{"nome":"HAS estágio 2","evolucao":"PA persistente"},{"nome":"Microalbuminúria","evolucao":"MAU 62mg/24h"}]','MAU melhorando. PA ainda alta.','Losartana 100mg.',true,'2025-01-22 14:30:00',NULL,now(),now()),
('c0000007-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007','retorno','consultorio','2025-08-11 10:00',30,'realizada',158,96,80,'[{"nome":"HAS estágio 2","evolucao":"PA 158/96"},{"nome":"Microalbuminúria","evolucao":"MAU 48mg/24h"}]','Melhora gradual. Continuar tratamento.','Associar anlodipino.',true,'2025-08-11 10:30:00',NULL,now(),now()),
('c0000007-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007','retorno','consultorio','2026-03-05 09:00',30,'realizada',160,97,81,'[{"nome":"HAS estágio 2","evolucao":"Difícil controle"}]','PA ainda elevada. Boa adesão relatada.','Espironolactona 25mg.',true,'2026-03-05 09:30:00',NULL,now(),now()),
('c0000007-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000007','retorno','consultorio','2026-06-08 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Marcos (p08) — DM2+Nefropatia, retorno vencido
('c0000008-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000008','primeira_consulta','consultorio','2024-08-20 09:00',75,'realizada',138,88,76,'[{"nome":"DM2","evolucao":"HbA1c 8.9%"},{"nome":"Nefropatia diabética","evolucao":"MAU 180mg/24h"}]','Nefropatia diabética em fase incipiente.','Canagliflozin. Losartana.',true,'2024-08-20 10:15:00',NULL,now(),now()),
('c0000008-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000008','retorno','consultorio','2025-02-12 14:00',30,'realizada',135,86,74,'[{"nome":"DM2","evolucao":"HbA1c 8.1%"},{"nome":"Nefropatia diabética","evolucao":"MAU 120mg/24h"}]','Boa resposta. Proteinúria caindo.','Manter conduta.',true,'2025-02-12 14:30:00',NULL,now(),now()),
('c0000008-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000008','retorno','consultorio','2025-11-18 10:00',30,'realizada',137,87,75,'[{"nome":"DM2","evolucao":"HbA1c 7.8%"},{"nome":"Nefropatia diabética","evolucao":"MAU 95mg/24h"}]','Evolução favorável. Retorno marcado para fev/26.','Retorno em 3 meses.',true,'2025-11-18 10:30:00',NULL,now(),now()),
-- retorno_previsto 2026-02-20 está vencido, sem nova consulta agendada

-- ── Fernanda (p09) — DRPAD, adesão irregular
('c0000009-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','primeira_consulta','consultorio','2024-04-25 09:00',75,'realizada',128,82,72,'[{"nome":"Doença renal policística autossômica dominante","evolucao":"Diagnóstico genético"}]','DRPAD confirmada. TFG 68. Cistos volumosos.','Controle PA rigoroso. Avaliar tolvaptana.',true,'2024-04-25 10:15:00',NULL,now(),now()),
('c0000009-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000009','retorno','consultorio','2024-10-08 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000009-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000009','retorno','consultorio','2025-04-14 10:00',30,'realizada',130,84,70,'[{"nome":"Doença renal policística","evolucao":"TFG 62"}]','TFG caiu levemente. Paciente assintomática.','Solicitar RM anual.',true,'2025-04-14 10:30:00',NULL,now(),now()),
('c0000009-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000009','retorno','consultorio','2025-10-22 09:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000009-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000009','retorno','consultorio','2026-04-09 14:00',30,'realizada',132,84,71,'[{"nome":"Doença renal policística","evolucao":"TFG 58"}]','TFG 58. Progressão lenta. Boa evolução.','Retorno novembro/26.',true,'2026-04-09 14:30:00',NULL,now(),now()),
('c0000009-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000009','retorno','consultorio','2026-11-10 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Gilberto (p10) — DRC4+HiperPTH, PTH CRÍTICO
('c0000010-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','primeira_consulta','consultorio','2024-02-28 08:00',75,'realizada',150,94,74,'[{"nome":"DRC estágio 4","evolucao":"TFG 24"},{"nome":"Anemia renal","evolucao":"Hb 9.2"},{"nome":"Hiperparatireoidismo secundário","evolucao":"PTH 310"}]','DRC4 com HPT2 e anemia. Iniciar eritropoetina.','Eritropoetina + carbonato de cálcio + calcitriol.',true,'2024-02-28 09:15:00',NULL,now(),now()),
('c0000010-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','retorno','consultorio','2024-08-15 10:00',30,'realizada',148,92,72,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.8"},{"nome":"Hiperparatireoidismo secundário","evolucao":"PTH 420"}]','PTH aumentando. Ajustar calcitriol.','Aumentar calcitriol. Calcimimético.',true,'2024-08-15 10:30:00',NULL,now(),now()),
('c0000010-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','retorno','consultorio','2025-02-10 14:00',30,'realizada',146,91,70,'[{"nome":"DRC estágio 4","evolucao":"Cr 4.0"},{"nome":"Hiperparatireoidismo secundário","evolucao":"PTH 550"}]','PTH crítico. Considerar cinacalcete.','Iniciar cinacalcete 30mg/dia.',true,'2025-02-10 14:30:00',NULL,now(),now()),
('c0000010-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','retorno','consultorio','2025-08-22 09:00',30,'realizada',144,90,68,'[{"nome":"DRC estágio 4","evolucao":"TFG 20"},{"nome":"Hiperparatireoidismo secundário","evolucao":"PTH 680"}]','PTH 680 — CRÍTICO. Encaminhar paratiroidectomia.','Paratiroidectomia total. Manter cinacalcete.',true,'2025-08-22 09:30:00',NULL,now(),now()),
('c0000010-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','retorno','consultorio','2026-03-10 10:00',30,'realizada',142,89,66,'[{"nome":"DRC estágio 4","evolucao":"Cr 4.1"},{"nome":"Hiperparatireoidismo secundário","evolucao":"PTH 680 — aguarda cirurgia"}]','Aguarda cirurgia. Sintomas ósseos.','Urgenciar cirurgia.',true,'2026-03-10 10:30:00',NULL,now(),now()),
('c0000010-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000010','retorno','consultorio','2026-06-25 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Luciana (p11) — Nefrite lúpica + Anemia hemolítica
('c0000011-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','primeira_consulta','consultorio','2024-09-12 09:00',75,'realizada',118,76,76,'[{"nome":"Nefrite lúpica","evolucao":"Classe II"},{"nome":"Anemia hemolítica","evolucao":"Hb 9.5"}]','Nefrite lúpica + anemia hemolítica. Micofenolato.','Micofenolato 1g 2x. Prednisona 0.5mg/kg.',true,'2024-09-12 10:15:00',NULL,now(),now()),
('c0000011-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','retorno','consultorio','2025-03-18 14:00',30,'realizada',116,74,74,'[{"nome":"Nefrite lúpica","evolucao":"Estável"},{"nome":"Anemia hemolítica","evolucao":"Hb 8.2"}]','Hemoglobina caindo. Haptoglobina baixa.','Aumentar prednisona. Solicitar Coombs.',true,'2025-03-18 14:30:00',NULL,now(),now()),
('c0000011-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000011','retorno','consultorio','2025-09-25 10:00',30,'realizada',114,72,72,'[{"nome":"Nefrite lúpica","evolucao":"Remissão"},{"nome":"Anemia hemolítica","evolucao":"Hb 7.8"}]','Hb 7.8. Anemia piorando.','Eritropoetina. Avaliar transfusão.',true,'2025-09-25 10:30:00',NULL,now(),now()),
('c0000011-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011','retorno','consultorio','2026-04-02 09:00',30,'realizada',116,74,74,'[{"nome":"Nefrite lúpica","evolucao":"Estável"},{"nome":"Anemia hemolítica","evolucao":"Hb 8.6"}]','Hb melhorou com eritropoetina.','Manter dose. Retorno julho.',true,'2026-04-02 09:30:00',NULL,now(),now()),
('c0000011-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000011','retorno','consultorio','2026-07-14 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Carlos (p12) — DRC5, K+ CRÍTICO
('c0000012-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','nova_consulta','consultorio','2024-03-05 09:00',45,'realizada',158,98,72,'[{"nome":"DRC estágio 5","evolucao":"Cr 6.8, TFG 9"}]','DRC terminal. Cr 6.8. K+ 5.8. Inicio diálise urgente.','HD imediata. Internação.',true,'2024-03-05 10:00:00',NULL,now(),now()),
('c0000012-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','retorno','consultorio','2024-09-18 09:00',30,'realizada',154,96,70,'[{"nome":"DRC estágio 5","evolucao":"Em HD regular"}]','Em HD 3x/sem. Estável. K+ 6.2 → ajustar dieta.','Dieta hiperpotassêmica. Quelante K+.',true,'2024-09-18 09:30:00',NULL,now(),now()),
('c0000012-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000012','retorno','consultorio','2025-04-14 14:00',30,'realizada',152,94,68,'[{"nome":"DRC estágio 5","evolucao":"HD regular"},{"nome":"Anemia renal","evolucao":"Hb 10.2"}]','Melhor controle com HD. Hb subiu.','Manter eritropoetina semanal.',true,'2025-04-14 14:30:00',NULL,now(),now()),
('c0000012-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000012','retorno','consultorio','2025-11-20 10:00',30,'realizada',150,92,66,'[{"nome":"DRC estágio 5","evolucao":"Em HD"}]','Estável em hemodiálise.','Retorno junho/26.',true,'2025-11-20 10:30:00',NULL,now(),now()),
('c0000012-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000012','retorno','consultorio','2026-05-30 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Priscila (p13) — SN primária, retorno vencido
('c0000013-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000013','primeira_consulta','consultorio','2025-04-10 09:00',75,'realizada',118,74,68,'[{"nome":"Síndrome nefrótica primária","evolucao":"Proteinúria 4.8g/dia"}]','SN primária jovem. Biópsia indicada.','Biópsia renal. Prednisona empiricamente.',true,'2025-04-10 10:15:00',NULL,now(),now()),
('c0000013-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000013','retorno','consultorio','2025-07-22 14:00',30,'realizada',120,76,70,'[{"nome":"Síndrome nefrótica primária","evolucao":"Doença lesões mínimas"}]','Biópsia: doença de lesões mínimas. Boa resposta esperada.','Prednisona 1mg/kg.',true,'2025-07-22 14:30:00',NULL,now(),now()),
('c0000013-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013','retorno','consultorio','2025-10-15 10:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000013-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000013','retorno','consultorio','2026-01-08 09:00',30,'realizada',122,77,71,'[{"nome":"Síndrome nefrótica primária","evolucao":"Remissão parcial"}]','Proteinúria 0.8g/dia. Bom progresso.','Retorno março/26.',true,'2026-01-08 09:30:00',NULL,now(),now()),
-- retorno_previsto 2026-03-10 vencido, sem nova consulta

-- ── Antonio (p14) — HAS+DRC2, PA elevada
('c0000014-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000014','primeira_consulta','consultorio','2024-10-15 09:00',75,'realizada',150,90,80,'[{"nome":"HAS","evolucao":"Estágio 2"},{"nome":"DRC estágio 2","evolucao":"TFG 72"}]','HAS estágio 2 com DRC leve. Inicio IECA.','Enalapril 10mg. Dieta.',true,'2024-10-15 10:15:00',NULL,now(),now()),
('c0000014-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000014','retorno','consultorio','2025-04-28 14:00',30,'realizada',148,88,78,'[{"nome":"HAS","evolucao":"Controlando"},{"nome":"DRC estágio 2","evolucao":"TFG 70"}]','Boa resposta ao IECA.','Manter.',true,'2025-04-28 14:30:00',NULL,now(),now()),
('c0000014-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014','retorno','consultorio','2026-02-10 09:00',30,'realizada',148,88,78,'[{"nome":"HAS","evolucao":"Estável"},{"nome":"DRC estágio 2","evolucao":"TFG 68"}]','Estável. TFG levemente caiu.','Manter IECA. Retorno set.',true,'2026-02-10 09:30:00',NULL,now(),now()),
('c0000014-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000014','retorno','consultorio','2026-09-01 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Beatriz (p15) — LES+Trombocitopenia, retorno vencido
('c0000015-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000015','primeira_consulta','consultorio','2024-11-20 09:00',75,'realizada',122,78,70,'[{"nome":"LES","evolucao":"Ativo"},{"nome":"Trombocitopenia","evolucao":"Plaquetas 85k"}]','LES com trombocitopenia imune. Corticóide.','Prednisona 40mg. Hidroxicloroquina.',true,'2024-11-20 10:15:00',NULL,now(),now()),
('c0000015-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000015','retorno','consultorio','2025-05-08 14:00',30,'realizada',120,76,68,'[{"nome":"LES","evolucao":"Parcial remissão"},{"nome":"Trombocitopenia","evolucao":"Plaquetas 102k"}]','Plaquetas subiram. Desmame possível.','Reduzir prednisona 20mg.',true,'2025-05-08 14:30:00',NULL,now(),now()),
('c0000015-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000015','retorno','consultorio','2025-11-12 10:00',30,'realizada',118,74,66,'[{"nome":"LES","evolucao":"Remissão"},{"nome":"Trombocitopenia","evolucao":"Plaquetas 120k"}]','Excelente resposta. Plaquetas normalizando.','Retorno março/26.',true,'2025-11-12 10:30:00',NULL,now(),now()),
-- retorno_previsto 2026-03-15 vencido, sem nova consulta

-- ── Renato (p16) — Gota+Litíase, baixa adesão
('c0000016-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000016','primeira_consulta','consultorio','2024-06-18 09:00',75,'realizada',132,84,76,'[{"nome":"Gota","evolucao":"Hiperuricemia 9.8"},{"nome":"Litíase renal","evolucao":"Cálculo 4mm"}]','Gota com litíase. Alopurinol.','Alopurinol 300mg. Hidratação.',true,'2024-06-18 10:15:00',NULL,now(),now()),
('c0000016-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000016','retorno','consultorio','2024-11-05 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000016-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000016','retorno','consultorio','2025-03-25 10:00',30,'realizada',130,82,74,'[{"nome":"Gota","evolucao":"Urato 8.5"},{"nome":"Litíase renal","evolucao":"Novo cálculo 3mm"}]','Novo cálculo. Uricemia ainda alta.','Aumentar hidratação. Alopurinol 400mg.',true,'2025-03-25 10:30:00',NULL,now(),now()),
('c0000016-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000016','retorno','consultorio','2025-09-10 09:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000016-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000016','retorno','consultorio','2026-02-20 14:00',30,'realizada',128,82,72,'[{"nome":"Gota","evolucao":"Urato 8.9"}]','Uricemia alta novamente. Adesão ruim.','Reforçar importância do tratamento.',true,'2026-02-20 14:30:00',NULL,now(),now()),
('c0000016-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000016','retorno','consultorio','2026-08-18 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Juliana (p17) — HAS+Proteinúria, retorno muito vencido
('c0000017-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000017','primeira_consulta','consultorio','2024-05-22 09:00',75,'realizada',155,98,80,'[{"nome":"HAS","evolucao":"Estágio 2"},{"nome":"Proteinúria","evolucao":"1.2g/dia"}]','HAS com proteinúria de causa não esclarecida.','Losartana 100mg. Biópsia renal discutida.',true,'2024-05-22 10:15:00',NULL,now(),now()),
('c0000017-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000017','retorno','consultorio','2024-10-30 14:00',30,'realizada',150,95,78,'[{"nome":"HAS","evolucao":"Melhora"},{"nome":"Proteinúria","evolucao":"0.8g/dia"}]','Proteinúria caindo. PA melhorou.','Retorno 6 meses.',true,'2024-10-30 14:30:00',NULL,now(),now()),
-- Última consulta realizada outubro/24 → mais de 18 meses atrás. Sem consulta futura.

-- ── Eduardo (p18) — DRC3+Dislipidemia
('c0000018-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000018','primeira_consulta','consultorio','2024-07-16 09:00',75,'realizada',132,84,72,'[{"nome":"DRC estágio 3","evolucao":"TFG 52"},{"nome":"Dislipidemia","evolucao":"LDL 188"}]','DRC3 com dislipidemia severa.','Rosuvastatina 20mg. Dieta.',true,'2024-07-16 10:15:00',NULL,now(),now()),
('c0000018-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000018','retorno','consultorio','2025-01-14 14:00',30,'realizada',130,82,70,'[{"nome":"DRC estágio 3","evolucao":"Estável"},{"nome":"Dislipidemia","evolucao":"LDL 142"}]','LDL melhorou mas ainda acima do alvo.','Rosuvastatina 40mg.',true,'2025-01-14 14:30:00',NULL,now(),now()),
('c0000018-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000018','retorno','consultorio','2025-08-20 10:00',30,'realizada',128,80,68,'[{"nome":"DRC estágio 3","evolucao":"TFG 50"},{"nome":"Dislipidemia","evolucao":"LDL 118"}]','LDL melhorou. TFG estável.','Retorno set/26.',true,'2025-08-20 10:30:00',NULL,now(),now()),
('c0000018-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000018','retorno','consultorio','2026-09-12 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Carla (p19) — GN membranosa, adesão irregular
('c0000019-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000019','primeira_consulta','consultorio','2025-02-05 09:00',75,'realizada',118,74,68,'[{"nome":"Glomerulonefrite membranosa","evolucao":"PLA2R positivo, proteinúria 3.2g"}]','GN membranosa PLA2R+. Rituximabe indicado.','Rituximabe 1g IV. IECA.',true,'2025-02-05 10:15:00',NULL,now(),now()),
('c0000019-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000019','retorno','consultorio','2025-06-18 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000019-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000019','retorno','consultorio','2025-10-10 10:00',30,'realizada',120,76,70,'[{"nome":"Glomerulonefrite membranosa","evolucao":"Proteinúria 1.8g"}]','Proteinúria caindo após rituximabe.','Segunda dose rituximabe em jan/26.',true,'2025-10-10 10:30:00',NULL,now(),now()),
('c0000019-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000019','retorno','consultorio','2026-01-22 09:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000019-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000019','retorno','consultorio','2026-04-28 14:00',30,'realizada',118,75,68,'[{"nome":"Glomerulonefrite membranosa","evolucao":"Proteinúria 0.9g — remissão parcial"}]','Boa resposta. PLA2R negativizando.','Retorno outubro/26.',true,'2026-04-28 14:30:00',NULL,now(),now()),
('c0000019-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000019','retorno','consultorio','2026-10-05 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Marcelo (p20) — DM2+DRC3+HAS, pior aderência + PA altíssima
('c0000020-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000020','primeira_consulta','consultorio','2024-03-12 09:00',75,'realizada',178,112,88,'[{"nome":"DM2","evolucao":"HbA1c 11.2%"},{"nome":"DRC estágio 3","evolucao":"Cr 1.9"},{"nome":"HAS","evolucao":"PA 178/112"}]','Tríade DM+DRC+HAS gravemente descontrolada.','Ajuste intensivo. Múltiplos fármacos.',true,'2024-03-12 10:15:00',NULL,now(),now()),
('c0000020-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000020','retorno','consultorio','2024-07-18 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000020-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000020','retorno','consultorio','2024-11-05 10:00',30,'realizada',174,108,86,'[{"nome":"DM2","evolucao":"HbA1c 10.4%"},{"nome":"HAS","evolucao":"PA 174/108"}]','Pouca adesão relatada. PA muito elevada.','Adicionar anlodipino + hidralazina.',true,'2024-11-05 10:30:00',NULL,now(),now()),
('c0000020-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000020','retorno','consultorio','2025-03-20 09:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000020-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000020','retorno','consultorio','2025-08-14 14:00',30,'falta',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),
('c0000020-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000020','retorno','consultorio','2026-03-05 10:00',30,'realizada',178,110,90,'[{"nome":"DM2","evolucao":"HbA1c 10.8%"},{"nome":"DRC estágio 3","evolucao":"Cr 2.1"},{"nome":"HAS","evolucao":"PA 178/110"}]','Piorou em todos os parâmetros. Adesão muito baixa.','Internação discutida. Reforço educacional.',true,'2026-03-05 10:30:00',NULL,now(),now()),
('c0000020-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000020','retorno','consultorio','2026-07-30 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Vera (p21) — DRC4+HAS+Acidose, HCO3 CRÍTICO
('c0000021-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','primeira_consulta','consultorio','2024-04-03 08:00',75,'realizada',158,100,76,'[{"nome":"DRC estágio 4","evolucao":"TFG 22"},{"nome":"HAS","evolucao":"PA 158/100"},{"nome":"Acidose metabólica","evolucao":"HCO3 16"}]','DRC4 com acidose metabólica. Citrato iniciado.','Citrato de sódio + bicarbonato.',true,'2024-04-03 09:15:00',NULL,now(),now()),
('c0000021-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000021','retorno','consultorio','2024-10-08 10:00',30,'realizada',155,97,74,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.6"},{"nome":"Acidose metabólica","evolucao":"HCO3 14"}]','HCO3 piorou. Acidose grave.','Aumentar citrato. Reforçar dieta.',true,'2024-10-08 10:30:00',NULL,now(),now()),
('c0000021-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000021','retorno','consultorio','2025-04-15 14:00',30,'realizada',152,95,72,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.8"},{"nome":"Acidose metabólica","evolucao":"HCO3 13"}]','HCO3 13 — acidose severa. Risco urgente.','Iniciar bicarbonato IV ambulatorial.',true,'2025-04-15 14:30:00',NULL,now(),now()),
('c0000021-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000021','retorno','consultorio','2025-10-20 09:00',30,'realizada',150,93,70,'[{"nome":"DRC estágio 4","evolucao":"Estável"},{"nome":"Acidose metabólica","evolucao":"HCO3 18"}]','HCO3 melhorou com citrato IV.','Manter. Retorno jun/26.',true,'2025-10-20 09:30:00',NULL,now(),now()),
('c0000021-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000021','retorno','consultorio','2026-04-28 10:00',30,'realizada',150,93,70,'[{"nome":"DRC estágio 4","evolucao":"Cr 3.9"},{"nome":"Acidose metabólica","evolucao":"HCO3 13"}]','HCO3 caiu novamente.','Urgenciar nefrologia hospitalar.',true,'2026-04-28 10:30:00',NULL,now(),now()),
('c0000021-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000021','retorno','consultorio','2026-06-20 10:00',30,'agendada',NULL,NULL,NULL,NULL,NULL,NULL,false,NULL,NULL,now(),now()),

-- ── Felipe (p22) — Síndrome de Alport, jovem, retorno vencido
('c0000022-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000022','primeira_consulta','consultorio','2025-01-15 09:00',75,'realizada',118,74,66,'[{"nome":"Síndrome de Alport","evolucao":"Diagnóstico genético confirmado"}]','Alport X-linked. TFG 75. Hematúria persistente.','IECA preventivo. Acompanhamento audiológico.',true,'2025-01-15 10:15:00',NULL,now(),now()),
('c0000022-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000022','retorno','consultorio','2025-07-22 14:00',30,'realizada',120,76,68,'[{"nome":"Síndrome de Alport","evolucao":"TFG 70, hematúria mantida"}]','TFG leve queda. Manter IECA.','Repetir audiograma. Retorno abr/26.',true,'2025-07-22 14:30:00',NULL,now(),now())
-- retorno_previsto 2026-04-01 vencido, sem nova consulta
;

-- ── 4. Lab Results ─────────────────────────────────────────────
INSERT INTO lab_results (patient_id, consulta_id, exam_name, value, unit, collected_at, created_at) VALUES

-- p01 Maria — Cr em alta progressiva (warning sustentado)
('00000000-0000-0000-0000-000000000001',NULL,'Creatinina','1.5','mg/dL','2024-04-05',now()),
('00000000-0000-0000-0000-000000000001',NULL,'Creatinina','1.7','mg/dL','2024-09-10',now()),
('00000000-0000-0000-0000-000000000001',NULL,'Creatinina','1.8','mg/dL','2025-03-15',now()),
('00000000-0000-0000-0000-000000000001',NULL,'TFG','48','mL/min','2024-04-05',now()),
('00000000-0000-0000-0000-000000000001',NULL,'TFG','42','mL/min','2025-03-15',now()),
('00000000-0000-0000-0000-000000000001',NULL,'TFG','40','mL/min','2026-04-18',now()),
('00000000-0000-0000-0000-000000000001',NULL,'Potássio','4.2','mEq/L','2026-04-18',now()),
('00000000-0000-0000-0000-000000000001',NULL,'Hemoglobina','12.8','g/dL','2026-04-18',now()),

-- p02 João — HbA1c CRÍTICA, Cr alta sustentada
('00000000-0000-0000-0000-000000000002',NULL,'Hemoglobina Glicada','10.8','%','2024-02-10',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Hemoglobina Glicada','9.4','%','2024-07-18',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Hemoglobina Glicada','10.2','%','2025-01-10',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Hemoglobina Glicada','10.0','%','2026-02-14',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Creatinina','3.2','mg/dL','2024-07-18',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Creatinina','3.5','mg/dL','2025-01-10',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Creatinina','3.6','mg/dL','2026-02-14',now()),
('00000000-0000-0000-0000-000000000002',NULL,'TFG','22','mL/min','2026-02-14',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Potássio','5.2','mEq/L','2026-02-14',now()),
('00000000-0000-0000-0000-000000000002',NULL,'Colesterol LDL','138','mg/dL','2026-02-14',now()),

-- p03 Ana — Albumina baixa sustentada (warning)
('00000000-0000-0000-0000-000000000003',NULL,'Albumina','2.2','g/dL','2024-06-01',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Albumina','2.9','g/dL','2024-11-15',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Albumina','3.1','g/dL','2025-05-10',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Albumina','3.4','g/dL','2025-11-05',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Albumina','3.6','g/dL','2026-04-05',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Proteínas na Urina','4800','mg/24h','2024-06-01',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Proteínas na Urina','1200','mg/24h','2025-05-10',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Proteínas na Urina','320','mg/24h','2026-04-05',now()),
('00000000-0000-0000-0000-000000000003',NULL,'Creatinina','0.8','mg/dL','2026-04-05',now()),

-- p04 Roberto — Cr CRÍTICA + TFG CRÍTICO
('00000000-0000-0000-0000-000000000004',NULL,'Creatinina','4.8','mg/dL','2024-01-14',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Creatinina','5.8','mg/dL','2024-06-08',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Creatinina','6.2','mg/dL','2024-12-01',now()),
('00000000-0000-0000-0000-000000000004',NULL,'TFG','12','mL/min','2024-01-14',now()),
('00000000-0000-0000-0000-000000000004',NULL,'TFG','11','mL/min','2024-06-08',now()),
('00000000-0000-0000-0000-000000000004',NULL,'TFG','9','mL/min','2024-12-01',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Hemoglobina','8.4','g/dL','2024-01-14',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Hemoglobina','8.1','g/dL','2024-06-08',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Hemoglobina','7.8','g/dL','2024-12-01',now()),
('00000000-0000-0000-0000-000000000004',NULL,'Potássio','5.4','mEq/L','2026-01-10',now()),

-- p05 Claudia — Proteínas urina sustentado alto
('00000000-0000-0000-0000-000000000005',NULL,'Proteínas na Urina','310','mg/24h','2024-09-05',now()),
('00000000-0000-0000-0000-000000000005',NULL,'Proteínas na Urina','250','mg/24h','2025-03-01',now()),
('00000000-0000-0000-0000-000000000005',NULL,'Proteínas na Urina','210','mg/24h','2025-09-15',now()),
('00000000-0000-0000-0000-000000000005',NULL,'Proteínas na Urina','290','mg/24h','2026-04-10',now()),
('00000000-0000-0000-0000-000000000005',NULL,'Creatinina','0.9','mg/dL','2026-04-10',now()),
('00000000-0000-0000-0000-000000000005',NULL,'TFG','72','mL/min','2026-04-10',now()),
('00000000-0000-0000-0000-000000000005',NULL,'Albumina','3.4','g/dL','2026-04-10',now()),

-- p06 Paulo — Ácido úrico alto sustentado
('00000000-0000-0000-0000-000000000006',NULL,'Ácido Úrico','9.8','mg/dL','2024-05-04',now()),
('00000000-0000-0000-0000-000000000006',NULL,'Ácido Úrico','8.2','mg/dL','2024-11-10',now()),
('00000000-0000-0000-0000-000000000006',NULL,'Ácido Úrico','7.6','mg/dL','2025-06-15',now()),
('00000000-0000-0000-0000-000000000006',NULL,'Ácido Úrico','7.1','mg/dL','2026-01-08',now()),
('00000000-0000-0000-0000-000000000006',NULL,'Creatinina','1.5','mg/dL','2026-01-08',now()),
('00000000-0000-0000-0000-000000000006',NULL,'TFG','48','mL/min','2026-01-08',now()),

-- p07 Sandra — Microalbuminúria alta
('00000000-0000-0000-0000-000000000007',NULL,'Microalbuminúria','85','mg/24h','2024-07-01',now()),
('00000000-0000-0000-0000-000000000007',NULL,'Microalbuminúria','62','mg/24h','2025-01-18',now()),
('00000000-0000-0000-0000-000000000007',NULL,'Microalbuminúria','48','mg/24h','2025-08-07',now()),
('00000000-0000-0000-0000-000000000007',NULL,'Creatinina','0.9','mg/dL','2026-03-01',now()),
('00000000-0000-0000-0000-000000000007',NULL,'TFG','74','mL/min','2026-03-01',now()),

-- p08 Marcos — HbA1c alta sustentada, MAU alta
('00000000-0000-0000-0000-000000000008',NULL,'Hemoglobina Glicada','8.9','%','2024-08-15',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Hemoglobina Glicada','8.1','%','2025-02-08',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Hemoglobina Glicada','7.8','%','2025-11-14',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Microalbuminúria','180','mg/24h','2024-08-15',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Microalbuminúria','120','mg/24h','2025-02-08',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Microalbuminúria','95','mg/24h','2025-11-14',now()),
('00000000-0000-0000-0000-000000000008',NULL,'Creatinina','1.1','mg/dL','2025-11-14',now()),

-- p09 Fernanda — TFG caindo (sustentado)
('00000000-0000-0000-0000-000000000009',NULL,'TFG','68','mL/min','2024-04-20',now()),
('00000000-0000-0000-0000-000000000009',NULL,'TFG','62','mL/min','2025-04-10',now()),
('00000000-0000-0000-0000-000000000009',NULL,'TFG','58','mL/min','2026-04-05',now()),
('00000000-0000-0000-0000-000000000009',NULL,'Creatinina','1.2','mg/dL','2026-04-05',now()),
('00000000-0000-0000-0000-000000000009',NULL,'Potássio','4.1','mEq/L','2026-04-05',now()),

-- p10 Gilberto — PTH CRÍTICO, Cr alta
('00000000-0000-0000-0000-000000000010',NULL,'PTH','310','pg/mL','2024-02-24',now()),
('00000000-0000-0000-0000-000000000010',NULL,'PTH','420','pg/mL','2024-08-10',now()),
('00000000-0000-0000-0000-000000000010',NULL,'PTH','550','pg/mL','2025-02-05',now()),
('00000000-0000-0000-0000-000000000010',NULL,'PTH','680','pg/mL','2025-08-18',now()),
('00000000-0000-0000-0000-000000000010',NULL,'PTH','680','pg/mL','2026-03-06',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Creatinina','3.2','mg/dL','2024-02-24',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Creatinina','3.8','mg/dL','2024-08-10',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Creatinina','4.0','mg/dL','2025-02-05',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Creatinina','4.1','mg/dL','2026-03-06',now()),
('00000000-0000-0000-0000-000000000010',NULL,'TFG','24','mL/min','2024-02-24',now()),
('00000000-0000-0000-0000-000000000010',NULL,'TFG','20','mL/min','2026-03-06',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Hemoglobina','9.2','g/dL','2026-03-06',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Cálcio','8.2','mg/dL','2026-03-06',now()),
('00000000-0000-0000-0000-000000000010',NULL,'Fósforo','5.8','mg/dL','2026-03-06',now()),

-- p11 Luciana — Hb em queda sustentada (warning → approachign critical)
('00000000-0000-0000-0000-000000000011',NULL,'Hemoglobina','9.5','g/dL','2024-09-08',now()),
('00000000-0000-0000-0000-000000000011',NULL,'Hemoglobina','8.2','g/dL','2025-03-14',now()),
('00000000-0000-0000-0000-000000000011',NULL,'Hemoglobina','7.8','g/dL','2025-09-20',now()),
('00000000-0000-0000-0000-000000000011',NULL,'Hemoglobina','8.6','g/dL','2026-03-28',now()),
('00000000-0000-0000-0000-000000000011',NULL,'Creatinina','0.8','mg/dL','2026-03-28',now()),
('00000000-0000-0000-0000-000000000011',NULL,'TFG','78','mL/min','2026-03-28',now()),

-- p12 Carlos — Cr CRÍTICA + K+ CRÍTICO
('00000000-0000-0000-0000-000000000012',NULL,'Creatinina','6.8','mg/dL','2024-03-01',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Creatinina','7.1','mg/dL','2024-09-14',now()),
('00000000-0000-0000-0000-000000000012',NULL,'TFG','9','mL/min','2024-03-01',now()),
('00000000-0000-0000-0000-000000000012',NULL,'TFG','8','mL/min','2024-09-14',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Potássio','5.8','mEq/L','2024-03-01',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Potássio','6.2','mEq/L','2024-09-14',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Potássio','5.9','mEq/L','2025-04-10',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Hemoglobina','9.8','g/dL','2025-11-15',now()),
('00000000-0000-0000-0000-000000000012',NULL,'Fósforo','6.2','mg/dL','2025-04-10',now()),

-- p13 Priscila — Proteínas na urina alta
('00000000-0000-0000-0000-000000000013',NULL,'Proteínas na Urina','4800','mg/24h','2025-04-06',now()),
('00000000-0000-0000-0000-000000000013',NULL,'Proteínas na Urina','3200','mg/24h','2025-07-18',now()),
('00000000-0000-0000-0000-000000000013',NULL,'Proteínas na Urina','800','mg/24h','2026-01-04',now()),
('00000000-0000-0000-0000-000000000013',NULL,'Albumina','2.8','g/dL','2025-04-06',now()),
('00000000-0000-0000-0000-000000000013',NULL,'Albumina','3.2','g/dL','2026-01-04',now()),
('00000000-0000-0000-0000-000000000013',NULL,'Creatinina','0.7','mg/dL','2026-01-04',now()),

-- p14 Antonio — Cr e TFG normais, LDL levemente alto
('00000000-0000-0000-0000-000000000014',NULL,'Creatinina','1.0','mg/dL','2026-02-06',now()),
('00000000-0000-0000-0000-000000000014',NULL,'TFG','68','mL/min','2026-02-06',now()),
('00000000-0000-0000-0000-000000000014',NULL,'Colesterol LDL','124','mg/dL','2026-02-06',now()),

-- p15 Beatriz — LDL normal, Cr normal
('00000000-0000-0000-0000-000000000015',NULL,'Creatinina','0.8','mg/dL','2025-11-08',now()),
('00000000-0000-0000-0000-000000000015',NULL,'Hemoglobina','11.8','g/dL','2025-11-08',now()),

-- p16 Renato — Ácido Úrico muito alto sustentado
('00000000-0000-0000-0000-000000000016',NULL,'Ácido Úrico','9.8','mg/dL','2024-06-14',now()),
('00000000-0000-0000-0000-000000000016',NULL,'Ácido Úrico','8.5','mg/dL','2025-03-20',now()),
('00000000-0000-0000-0000-000000000016',NULL,'Ácido Úrico','8.9','mg/dL','2026-02-15',now()),
('00000000-0000-0000-0000-000000000016',NULL,'Creatinina','1.1','mg/dL','2026-02-15',now()),
('00000000-0000-0000-0000-000000000016',NULL,'Creatinina','1.2','mg/dL','2025-03-20',now()),
('00000000-0000-0000-0000-000000000016',NULL,'Creatinina','1.3','mg/dL','2024-06-14',now()),

-- p17 Juliana — Proteinúria alta, Cr normal
('00000000-0000-0000-0000-000000000017',NULL,'Proteínas na Urina','1200','mg/24h','2024-05-18',now()),
('00000000-0000-0000-0000-000000000017',NULL,'Proteínas na Urina','800','mg/24h','2024-10-26',now()),
('00000000-0000-0000-0000-000000000017',NULL,'Creatinina','0.9','mg/dL','2024-10-26',now()),
('00000000-0000-0000-0000-000000000017',NULL,'TFG','74','mL/min','2024-10-26',now()),

-- p18 Eduardo — LDL alto sustentado, Cr
('00000000-0000-0000-0000-000000000018',NULL,'Colesterol LDL','188','mg/dL','2024-07-12',now()),
('00000000-0000-0000-0000-000000000018',NULL,'Colesterol LDL','142','mg/dL','2025-01-10',now()),
('00000000-0000-0000-0000-000000000018',NULL,'Colesterol LDL','118','mg/dL','2025-08-16',now()),
('00000000-0000-0000-0000-000000000018',NULL,'Creatinina','1.4','mg/dL','2025-08-16',now()),
('00000000-0000-0000-0000-000000000018',NULL,'TFG','50','mL/min','2025-08-16',now()),
('00000000-0000-0000-0000-000000000018',NULL,'Triglicerídeos','210','mg/dL','2025-08-16',now()),

-- p19 Carla — Proteinúria em queda
('00000000-0000-0000-0000-000000000019',NULL,'Proteínas na Urina','3200','mg/24h','2025-02-01',now()),
('00000000-0000-0000-0000-000000000019',NULL,'Proteínas na Urina','1800','mg/24h','2025-10-06',now()),
('00000000-0000-0000-0000-000000000019',NULL,'Proteínas na Urina','900','mg/24h','2026-04-24',now()),
('00000000-0000-0000-0000-000000000019',NULL,'Albumina','3.2','g/dL','2026-04-24',now()),
('00000000-0000-0000-0000-000000000019',NULL,'Creatinina','0.8','mg/dL','2026-04-24',now()),

-- p20 Marcelo — HbA1c CRÍTICA, Cr subindo
('00000000-0000-0000-0000-000000000020',NULL,'Hemoglobina Glicada','11.2','%','2024-03-08',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Hemoglobina Glicada','10.4','%','2024-11-01',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Hemoglobina Glicada','10.8','%','2026-03-01',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Creatinina','1.9','mg/dL','2024-03-08',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Creatinina','2.0','mg/dL','2024-11-01',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Creatinina','2.1','mg/dL','2026-03-01',now()),
('00000000-0000-0000-0000-000000000020',NULL,'TFG','38','mL/min','2026-03-01',now()),
('00000000-0000-0000-0000-000000000020',NULL,'Potássio','5.0','mEq/L','2026-03-01',now()),

-- p21 Vera — Bicarbonato CRÍTICO
('00000000-0000-0000-0000-000000000021',NULL,'Bicarbonato','16','mEq/L','2024-04-01',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Bicarbonato','14','mEq/L','2024-10-05',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Bicarbonato','13','mEq/L','2025-04-12',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Bicarbonato','18','mEq/L','2025-10-16',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Bicarbonato','13','mEq/L','2026-04-24',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Creatinina','3.6','mg/dL','2024-04-01',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Creatinina','3.8','mg/dL','2025-04-12',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Creatinina','3.9','mg/dL','2026-04-24',now()),
('00000000-0000-0000-0000-000000000021',NULL,'TFG','22','mL/min','2026-04-24',now()),
('00000000-0000-0000-0000-000000000021',NULL,'Potássio','5.3','mEq/L','2026-04-24',now()),

-- p22 Felipe — TFG caindo lentamente
('00000000-0000-0000-0000-000000000022',NULL,'TFG','75','mL/min','2025-01-10',now()),
('00000000-0000-0000-0000-000000000022',NULL,'TFG','70','mL/min','2025-07-18',now()),
('00000000-0000-0000-0000-000000000022',NULL,'Creatinina','1.1','mg/dL','2025-01-10',now()),
('00000000-0000-0000-0000-000000000022',NULL,'Creatinina','1.2','mg/dL','2025-07-18',now()),
('00000000-0000-0000-0000-000000000022',NULL,'Hemoglobina','13.2','g/dL','2025-07-18',now())
;

-- Após inserir tudo, rode esta query para associar ao médico:
-- UPDATE consultas SET created_by = 'SEU-UUID-AQUI' WHERE created_by IS NULL;
