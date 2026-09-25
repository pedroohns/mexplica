const CATEGORIAS = {

    'seguranca-usabilidade': {

        id:
            'seguranca-usabilidade',

        nome:
            'Segurança e Usabilidade',

        icone:
            '/icons/vermelho.png',

        classe:
            'red',

        cor:
            '#F87777'

    },


    'comunicacao-interacao': {

        id:
            'comunicacao-interacao',

        nome:
            'Comunicação e Interação',

        icone:
            '/icons/verde.png',

        classe:
            'green',

        cor:
            '#43A46F'

    },


    'sistemas-acessibilidade': {

        id:
            'sistemas-acessibilidade',

        nome:
            'Sistemas e Acessibilidade',

        icone:
            '/icons/azul.png',

        classe:
            'blue',

        cor:
            '#4B7DB5'

    }

};


function listarCategorias() {

    return Object
        .values(CATEGORIAS)
        .map(
            categoria => ({
                ...categoria
            })
        );

}


function getCategoria(id) {

    const categoria =
        CATEGORIAS[
            String(
                id || ''
            )
        ];


    return categoria

        ? {
            ...categoria
        }

        : null;

}


function categoriaValida(id) {

    return Boolean(

        CATEGORIAS[
            String(
                id || ''
            )
        ]

    );

}


module.exports = {

    CATEGORIAS,

    listarCategorias,

    getCategoria,

    categoriaValida

};