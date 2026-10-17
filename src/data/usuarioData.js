const bcrypt =
    require(
        'bcryptjs'
    );

// todos os usuarios de demonstraçao
// utilizam a senha: 123456
const senhaTeste =
    bcrypt.hashSync(
        '123456',
        10
    );

const usuarios = [

    {
        id: 1,

        slug:
            'maria-oliveira',

        nome:
            'Maria',

        sobrenome:
            'Oliveira',

        email:
            'maria@mexplica.com',

        telefone:
            '24999990001',

        idade:
            67,

        genero:
            'feminino',

        tipo:
            'usuario',

        colaborador:
            false,

        nivel:
            null,

        pontos:
            0,

        bio:
            'Uso o MExplica para aprender com calma sobre celular, internet e aplicativos.',

        especialidades:
            [],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-05T14:00:00.000Z'
    },


    {
        id: 2,

        slug:
            'lucas-mendes',

        nome:
            'Lucas',

        sobrenome:
            'Mendes',

        email:
            'lucas@mexplica.com',

        telefone:
            '24999990002',

        idade:
            24,

        genero:
            'masculino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Diamante',

        pontos:
            1250,

        bio:
            'Publico tutoriais sobre segurança digital, smartphones e configurações do dia a dia.',

        especialidades: [
            'Segurança',
            'Smartphones'
        ],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-08-26T17:30:00.000Z'
    },


    {
        id: 3,

        slug:
            'ana-souza',

        nome:
            'Ana',

        sobrenome:
            'Souza',

        email:
            'ana@mexplica.com',

        telefone:
            '24999990003',

        idade:
            31,

        genero:
            'feminino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Platina',

        pontos:
            2840,

        bio:
            'Crio guias simples sobre acessibilidade, serviços digitais e comunicação.',

        especialidades: [
            'Acessibilidade',
            'Comunicação',
            'Serviços digitais'
        ],

        disponivelAtendimento:
            true,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-08-20T12:00:00.000Z'
    },


    {
        id: 4,

        slug:
            'carlos-lima',

        nome:
            'Carlos',

        sobrenome:
            'Lima',

        email:
            'carlos@mexplica.com',

        telefone:
            '24999990004',

        idade:
            27,

        genero:
            'masculino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Comum',

        pontos:
            980,

        bio:
            'Gosto de transformar configurações complicadas em passos simples.',

        especialidades: [
            'Smartphones',
            'Comunicação'
        ],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-02T11:00:00.000Z'
    },


    {
        id: 5,

        slug:
            'helena-ribeiro',

        nome:
            'Helena',

        sobrenome:
            'Ribeiro',

        email:
            'helena@mexplica.com',

        telefone:
            '24999990005',

        idade:
            58,

        genero:
            'feminino',

        tipo:
            'usuario',

        colaborador:
            false,

        nivel:
            null,

        pontos:
            0,

        bio:
            'Aprendendo a usar aplicativos e serviços online com mais segurança.',

        especialidades:
            [],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-09T09:15:00.000Z'
    },


    {
        id: 6,

        slug:
            'roberto-alves',

        nome:
            'Roberto',

        sobrenome:
            'Alves',

        email:
            'roberto@mexplica.com',

        telefone:
            '24999990006',

        idade:
            63,

        genero:
            'masculino',

        tipo:
            'usuario',

        colaborador:
            false,

        nivel:
            null,

        pontos:
            0,

        bio:
            'Uso os tutoriais para resolver dúvidas do computador e do telefone.',

        especialidades:
            [],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-11T10:40:00.000Z'
    },


    {
        id: 7,

        slug:
            'beatriz-costa',

        nome:
            'Beatriz',

        sobrenome:
            'Costa',

        email:
            'beatriz@mexplica.com',

        telefone:
            '24999990007',

        idade:
            29,

        genero:
            'feminino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Diamante',

        pontos:
            1680,

        bio:
            'Ajudo com redes sociais, mensagens, videochamadas e recursos de interação.',

        especialidades: [
            'WhatsApp',
            'Redes sociais',
            'Comunicação'
        ],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-08-30T16:20:00.000Z'
    },


    {
        id: 8,

        slug:
            'rafael-nunes',

        nome:
            'Rafael',

        sobrenome:
            'Nunes',

        email:
            'rafael@mexplica.com',

        telefone:
            '24999990008',

        idade:
            22,

        genero:
            'masculino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Comum',

        pontos:
            620,

        bio:
            'Publico tutoriais sobre Android, aplicativos e manutenção básica.',

        especialidades: [
            'Android',
            'Aplicativos'
        ],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-04T08:00:00.000Z'
    },


    {
        id: 9,

        slug:
            'juliana-martins',

        nome:
            'Juliana',

        sobrenome:
            'Martins',

        email:
            'juliana@mexplica.com',

        telefone:
            '24999990009',

        idade:
            35,

        genero:
            'feminino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Platina',

        pontos:
            3120,

        bio:
            'Escrevo sobre privacidade, golpes digitais e uso seguro de serviços online.',

        especialidades: [
            'Privacidade',
            'Segurança digital'
        ],

        disponivelAtendimento:
            true,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-08-18T13:30:00.000Z'
    },


    {
        id: 10,

        slug:
            'marcos-pereira',

        nome:
            'Marcos',

        sobrenome:
            'Pereira',

        email:
            'marcos@mexplica.com',

        telefone:
            '24999990010',

        idade:
            61,

        genero:
            'masculino',

        tipo:
            'usuario',

        colaborador:
            false,

        nivel:
            null,

        pontos:
            0,

        bio:
            'Quero usar a tecnologia com mais autonomia no dia a dia.',

        especialidades:
            [],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-13T15:00:00.000Z'
    },


    {
        id: 11,

        slug:
            'fernanda-moraes',

        nome:
            'Fernanda',

        sobrenome:
            'Moraes',

        email:
            'fernanda@mexplica.com',

        telefone:
            '24999990011',

        idade:
            26,

        genero:
            'feminino',

        tipo:
            'colaborador',

        colaborador:
            true,

        nivel:
            'Diamante',

        pontos:
            1430,

        bio:
            'Crio guias sobre acessibilidade, Windows e recursos de leitura.',

        especialidades: [
            'Windows',
            'Acessibilidade'
        ],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-08-28T18:10:00.000Z'
    },


    {
        id: 12,

        slug:
            'paulo-barbosa',

        nome:
            'Paulo',

        sobrenome:
            'Barbosa',

        email:
            'paulo@mexplica.com',

        telefone:
            '24999990012',

        idade:
            69,

        genero:
            'masculino',

        tipo:
            'usuario',

        colaborador:
            false,

        nivel:
            null,

        pontos:
            0,

        bio:
            'Gosto de aprender por exemplos simples e imagens.',

        especialidades:
            [],

        disponivelAtendimento:
            false,

        senhaHash:
            senhaTeste,

        criadoEm:
            '2026-09-14T11:25:00.000Z'
    }

];

module.exports =
    usuarios;