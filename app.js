const API_URL = 'https://script.google.com/macros/s/AKfycbzKVbuFQDiNu1ShDAMZNWj9B-CkeDhlaUsjZjTu0Wwalez2urW-fjNdJ1PsHSFUh-eBcA/exec';

let presentes = [];
let categoriaAtual = 'Todos';
let presenteSelecionado = null;

let convidado = {
    nome: '',
    contato: '',
};

const guestForm = document.querySelector('#guest-form');
const giftsSection = document.querySelector('#gifts-section');
const giftsContainer = document.querySelector('#gifts');
const categoriesContainer = document.querySelector('#categories');

const modal = document.querySelector('#modal');
const modalTitle = document.querySelector('#modal-title');
const modalDescription = document.querySelector('#modal-description');

const confirmButton = document.querySelector('#confirm-button');
const modalClose = document.querySelector('#modal-close');

const logoutButton = document.querySelector('#logout-button');


// ============================================================
// Inicialização
// ============================================================

guestForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    convidado.nome =
        document.querySelector('#nome').value.trim();

    convidado.contato =
        document.querySelector('#contato').value.trim();

    await entrar();
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('convidado');

    convidado = {
        nome: '',
        contato: '',
    };

    giftsSection.classList.add('hidden');
});

modalClose.addEventListener('click', fecharModal);


// ============================================================
// Entrar
// ============================================================

async function entrar() {

    try {

        const reserva = await buscarReserva(
            convidado.contato
        );

        localStorage.setItem(
            'convidado',
            JSON.stringify(convidado)
        );

        await carregarPresentes();

        document.querySelector('.guest-section')
            .classList.add('hidden');

        giftsSection.classList.remove('hidden');

        if (reserva.reservas.length > 0) {
            mostrarReserva(reserva.reservas[0]);
        }

    } catch (error) {

        mostrarErro(error.message);

    }

}


// ============================================================
// Carregar presentes
// ============================================================

async function carregarPresentes() {

    const response = await fetch(
        `${API_URL}?action=presentes`
    );

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error);
    }

    presentes = data.presentes;

    renderizarCategorias();
    renderizarPresentes();
}


// ============================================================
// Categorias
// ============================================================

function renderizarCategorias() {

    const categorias = [
        'Todos',
        ...new Set(
            presentes.map(presente => presente.categoria)
        )
    ];

    categoriesContainer.innerHTML = '';

    categorias.forEach(categoria => {

        const button = document.createElement('button');

        button.textContent = categoria;

        button.classList.add('category-button');

        if (categoria === categoriaAtual) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {

            categoriaAtual = categoria;

            renderizarCategorias();
            renderizarPresentes();

        });

        categoriesContainer.appendChild(button);

    });

}


// ============================================================
// Presentes
// ============================================================

function renderizarPresentes() {

    const filtrados =
        categoriaAtual === 'Todos'
            ? presentes
            : presentes.filter(
                presente =>
                    presente.categoria === categoriaAtual
            );

    giftsContainer.innerHTML = '';

    filtrados.forEach(presente => {

        const card = document.createElement('article');

        card.className = 'gift';

        const indisponivel =
            presente.unidades_disponiveis <= 0;

        card.innerHTML = `
            ${
                presente.url_imagem
                    ? `
                        <div class="gift-image">
                            <img
                                src="${escapeHtml(presente.url_imagem)}"
                                alt="${escapeHtml(presente.nome)}"
                                loading="lazy"
                            >
                        </div>
                    `
                    : ''
            }

            <div class="gift-content">

                <div class="gift-category">
                    ${escapeHtml(presente.categoria)}
                </div>

                <h3>
                    ${escapeHtml(presente.nome)}
                </h3>

                <div class="gift-price">
                    ${formatarValor(presente.valor)}
                </div>

                <div class="gift-available">
                    ${
                        indisponivel
                            ? 'Indisponível'
                            : `${presente.unidades_disponiveis} disponível(is)`
                    }
                </div>

                <button
                    ${indisponivel ? 'disabled' : ''}
                    data-id="${escapeHtml(presente.id)}"
                >
                    ${
                        indisponivel
                            ? 'Indisponível'
                            : 'Escolher presente'
                    }
                </button>

            </div>
        `;

        const button = card.querySelector('button');

        if (!indisponivel) {

            button.addEventListener('click', () => {
                abrirModal(presente);
            });

        }

        giftsContainer.appendChild(card);

    });

}


// ============================================================
// Modal
// ============================================================

function abrirModal(presente) {

    presenteSelecionado = presente;

    modalTitle.textContent = presente.nome;

    modalDescription.textContent =
        `Você deseja reservar este presente por ${formatarValor(presente.valor)}?`;

    modal.classList.remove('hidden');
}


function fecharModal() {

    presenteSelecionado = null;

    modal.classList.add('hidden');

}


// ============================================================
// Reserva
// ============================================================

confirmButton.addEventListener('click', async () => {

    if (!presenteSelecionado) {
        return;
    }

    confirmButton.disabled = true;
    confirmButton.textContent = 'Reservando...';

    try {

        const response = await fetch(API_URL, {

            method: 'POST',

            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },

            body: JSON.stringify({
                action: 'reservar',

                presente_id:
                    presenteSelecionado.id,

                nome:
                    convidado.nome,

                contato:
                    convidado.contato,

                tipo_contato:
                    detectarTipoContato(
                        convidado.contato
                    ),
            }),

        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        fecharModal();

        alert(
            'Presente reservado com sucesso!'
        );

        await carregarPresentes();

    } catch (error) {

        alert(error.message);

    } finally {

        confirmButton.disabled = false;
        confirmButton.textContent =
            'Confirmar presente';

    }

});


// ============================================================
// Verificar reserva existente
// ============================================================

async function buscarReserva(contato) {

    const response = await fetch(
        `${API_URL}?action=minha-reserva&contato=${encodeURIComponent(contato)}`
    );

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error);
    }

    return data;
}


function mostrarReserva(reserva) {

    alert(
        `Você já reservou o presente associado a esta reserva.`
    );

}


// ============================================================
// Utilidades
// ============================================================

function formatarValor(valor) {

    return new Intl.NumberFormat(
        'pt-BR',
        {
            style: 'currency',
            currency: 'BRL',
        }
    ).format(valor);

}


function detectarTipoContato(contato) {

    return contato.includes('@')
        ? 'email'
        : 'telefone';

}


function escapeHtml(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;

}


function mostrarErro(mensagem) {

    const element =
        document.querySelector('#guest-message');

    element.textContent = mensagem;

    element.style.color = 'red';

}
