export const CHROME_PRIORITY_WARNING =
  'Priorize o uso do Google Chrome atualizado. Qualquer outro navegador pode apresentar instabilidades no carregamento dos elementos da interface gráfica do sistema.';

export const NON_GOOGLE_ACCOUNT_RULES = [
  {
    code: 'REGRA 01',
    title: 'Exclusividade de E-mail e Telefone Corporativo',
    description:
      'Cada conta corporativa não vinculada à Google deve possuir um endereço de e-mail e número de telefone únicos no banco de dados. Tentativas de duplicação são bloqueadas automaticamente.',
  },
  {
    code: 'REGRA 02',
    title: 'Maioridade Legal Obrigatória (18+ Anos)',
    description:
      'O cadastro e acesso ao sistema de Diagnóstico Organizacional é estritamente restrito a colaboradores e gestores com idade igual ou superior a 18 anos completos na data do registro.',
  },
  {
    code: 'REGRA 03',
    title: 'Custódia de Credenciais e Força Mínima de Senha',
    description:
      'Contas personalizadas pela empresa exigem senha forte (mínimo de 8 caracteres, letras maiúsculas, minúsculas, números e caractere especial) e cadastro obrigatório de dica de e-mail para recuperação auditada.',
  },
  {
    code: 'REGRA 04',
    title: 'Rastreabilidade por UID de Página WEB',
    description:
      'Toda conta não vinculada à Google recebe automaticamente um UID exclusivo de página WEB (ex: WEB-COL-XXXX) vinculado às respostas de entrevista, setor e empresa cadastrada.',
  },
  {
    code: 'REGRA 05',
    title: 'Governança pelo Setor de Administração',
    description:
      'Contas personalizadas estão sujeitas à auditoria do Setor de Administração (gerenciado via UID Google ou e-mail corporativo autorizado) e podem ter permissões revogadas em caso de desligamento ou violação de conformidade.',
  },
];

export const LGPD_TERMS_TEXT = `1. LEI GERAL DE PROTEÇÃO DE DADOS PESSOAIS (LGPD — LEI Nº 13.709/2018)
Os dados pessoais e corporativos coletados neste sistema (incluindo Nome e Sobrenome, E-mail corporativo, Telefone, Data de Nascimento/Idade, Cargo, Setor, Empresa e respostas do Formulário de Diagnóstico Organizacional) têm como finalidade exclusiva a gestão de clima organizacional, mapeamento de demandas operacionais, prevenção de conflitos e melhoria contínua das condições de trabalho.
Em conformidade com os arts. 7º, I e V, e 18 da Lei nº 13.709/2018, o titular tem direito à confirmação da existência de tratamento, acesso aos dados via seu UID exclusivo de página WEB, correção de dados incompletos ou desatualizados e rastreabilidade junto ao controlador e ao Setor de Administração.`;

export const MARCO_CIVIL_TEXT = `2. MARCO CIVIL DA INTERNET (LEI Nº 12.965/2014)
Em estrita observância aos arts. 3º, 7º, 10 e 15 da Lei nº 12.965/2014 (Marco Civil da Internet), o sistema garante a inviolabilidade e o sigilo do fluxo de comunicações e dos registros de acesso à aplicação corporativa. Os registros de data cadastrada, logs de submissão de entrevistas e credenciais de acesso são mantidos sob controles rígidos de segurança, acesso restrito ao titular e ao Setor de Administração autorizado, sendo vedado o fornecimento a terceiros não autorizados.`;

export const PRIVACY_POLICY_TEXT = `3. POLÍTICA DE PRIVACIDADE E SEGURANÇA DA INFORMAÇÃO CORPORATIVA
As respostas gravadas no banco de dados Firebase Firestore são protegidas por regras de controle de acesso baseadas em atributos (ABAC) e validação de esquema. O colaborador declara ciência de que:
• Seus dados cadastrais (e-mail e telefone) são validados contra duplicidade para garantir integridade cadastral;
• Cada colaborador possui um UID exclusivo de página WEB associado ao seu prontuário organizacional;
• O uso do navegador Google Chrome atualizado é fortemente priorizado para garantir a estabilidade de renderização gráfica, notificações push nativas e criptografia em trânsito.`;
